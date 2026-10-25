/**
 * @file PaymentOrchestrator.service.js
 * @description Core Orchestration Service.
 * Manages Payment Intent lifecycles, MongoDB ACID Transactions / Concurrency control,
 * and decoupling with the Order domain.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import { PaymentIntent } from '../models/PaymentIntent.model.js';
import { Refund } from '../models/Refund.model.js';
import { Order } from '../../../../models/Order.js';
import { paymentRouter } from './PaymentRouter.service.js';
import { PAYMENT_STATUS, REFUND_STATUS } from '../constants/payment.constants.js';
import { paymentLogger } from '../utils/paymentLogger.js';
import { orderEventEmitter, ORDER_EVENTS } from '../../notification/index.js';

class PaymentOrchestratorService {
  /**
   * Initializes a bulletproof Payment Intent for an existing Order
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} params.userId
   * @param {string} [params.preferredGateway]
   * @param {string} [params.idempotencyKey]
   */
  async createIntent({ orderId, userId, preferredGateway, idempotencyKey }) {
    paymentLogger.info('CREATE_INTENT_INITIATED', { orderId, userId, preferredGateway });

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order with ID "${orderId}" does not exist.`);
    }

    if (order.user.toString() !== userId.toString()) {
      throw new Error('Unauthorized: You do not own this order.');
    }

    const isAlreadyPaid =
      order.isPaid ||
      (order.paymentInfo?.status === 'PAID' && ['paid', 'confirmed', 'delivered'].includes(order.orderStatus?.toLowerCase()));

    if (isAlreadyPaid) {
      throw new Error(`Order #${order.orderNumber} is already paid.`);
    }

    const grandTotal =
      order.pricingSummary?.grandTotal ||
      order.pricing?.grandTotal ||
      order.totalPrice ||
      0;

    // Resolve gateway strategy dynamically
    const adapter = paymentRouter.resolveGateway({
      preferredGateway,
      currency: order.currency || 'INR',
      amount: grandTotal,
    });

    const amountInSubunits = Math.round(grandTotal * 100);
    const intentId = `pi_${crypto.randomUUID()}`;

    // Create checkout order on the resolved gateway
    const gatewayResult = await adapter.createTransaction({
      amountInSubunits,
      currency: order.currency || 'INR',
      receipt: `cb_${order.orderNumber}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        orderNumber: order.orderNumber,
      },
    });

    // Persist Payment Intent in database
    const intent = await PaymentIntent.create({
      intentId,
      orderId: order._id,
      userId,
      amount: grandTotal,
      currency: order.currency || 'INR',
      gateway: adapter.getGatewayName(),
      status: PAYMENT_STATUS.CREATED,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      clientSecret: gatewayResult.clientSecret || null,
      idempotencyKey: idempotencyKey || null,
      metadata: {
        orderNumber: order.orderNumber,
      },
      rawGatewayResponse: gatewayResult.rawResponse,
    });

    paymentLogger.info('CREATE_INTENT_SUCCESS', {
      intentId,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      gateway: adapter.getGatewayName(),
    });

    return {
      intentId: intent.intentId,
      gateway: intent.gateway,
      gatewayOrderId: gatewayResult.gatewayOrderId,
      amount: intent.amount,
      currency: intent.currency,
      clientSecret: intent.clientSecret,
    };
  }

  /**
   * Finalizes payment capture with Concurrency Control & ACID Session Protection.
   * Safe against simultaneous Webhook and Client-Side Verification collisions.
   * @param {Object} params
   * @param {string} params.gatewayOrderId
   * @param {string} params.gatewayPaymentId
   * @param {string} [params.gatewaySignature]
   * @param {string} [params.triggerSource='WEBHOOK'] - 'CLIENT' | 'WEBHOOK' | 'RECONCILIATION'
   */
  async finalizeCapture({ gatewayOrderId, gatewayPaymentId, gatewaySignature, triggerSource = 'WEBHOOK' }) {
    paymentLogger.info('FINALIZE_CAPTURE_REQUESTED', {
      gatewayOrderId,
      gatewayPaymentId,
      triggerSource,
    });

    const session = await mongoose.startSession();

    try {
      let finalizedResult = null;

      // Wrap state mutations inside an ACID transaction session if replica set is available
      const executeTransaction = async (sess) => {
        // 1. Fetch Payment Intent with atomic state-lock check
        const intent = await PaymentIntent.findOne({ gatewayOrderId }).session(sess);
        if (!intent) {
          throw new Error(`No PaymentIntent found for gateway order: "${gatewayOrderId}".`);
        }

        // Idempotency: If already CAPTURED, return early without re-mutating order or deducting inventory
        if (intent.status === PAYMENT_STATUS.CAPTURED) {
          paymentLogger.info('FINALIZE_CAPTURE_IDEMPOTENT_ALREADY_CAPTURED', {
            intentId: intent.intentId,
            triggerSource,
          });
          finalizedResult = {
            success: true,
            alreadyProcessed: true,
            intentId: intent.intentId,
            orderId: intent.orderId,
            status: intent.status,
          };
          return;
        }

        // Validate state machine rule
        if (!intent.canTransitionTo(PAYMENT_STATUS.CAPTURED)) {
          throw new Error(
            `Illegal state transition: Cannot transition PaymentIntent ${intent.intentId} from ${intent.status} to ${PAYMENT_STATUS.CAPTURED}.`
          );
        }

        // 2. Perform Atomic Update on PaymentIntent
        const updatedIntent = await PaymentIntent.findOneAndUpdate(
          {
            _id: intent._id,
            status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.AUTHORIZED] },
          },
          {
            $set: {
              status: PAYMENT_STATUS.CAPTURED,
              gatewayPaymentId: gatewayPaymentId || intent.gatewayPaymentId,
              gatewaySignature: gatewaySignature || null,
              capturedAt: new Date(),
            },
            $inc: { version: 1 },
          },
          { new: true, session: sess }
        );

        if (!updatedIntent) {
          // Another concurrent request won the race condition in the same millisecond
          paymentLogger.warn('FINALIZE_CAPTURE_RACE_CONDITION_AVOIDED', {
            intentId: intent.intentId,
            triggerSource,
          });
          finalizedResult = {
            success: true,
            alreadyProcessed: true,
            intentId: intent.intentId,
            orderId: intent.orderId,
            status: PAYMENT_STATUS.CAPTURED,
          };
          return;
        }

        // 3. Atomically synchronize Order state
        const order = await Order.findById(intent.orderId).session(sess);
        if (order) {
          const transactionId = gatewayPaymentId || gatewayOrderId;
          const method = intent.gateway === 'RAZORPAY' ? 'RAZORPAY' : 'PREPAID_ONLINE';

          // Set both paymentInfo and paymentDetails for backward compatibility
          order.paymentInfo = {
            method,
            status: 'PAID',
            transactionId,
            paidAt: new Date(),
          };
          order.paymentDetails = {
            method: method.toLowerCase(),
            status: 'paid',
            transactionId,
            paidAt: new Date(),
          };

          order.orderStatus = 'CONFIRMED';

          order.statusTimeline.push({
            status: 'CONFIRMED',
            timestamp: new Date(),
            comment: `Payment captured successfully via ${intent.gateway} (${triggerSource}).`,
          });

          await order.save({ session: sess });
        }

        finalizedResult = {
          success: true,
          alreadyProcessed: false,
          intentId: updatedIntent.intentId,
          orderId: intent.orderId,
          status: updatedIntent.status,
        };
      };

      // Attempt transaction with graceful fallback if MongoDB runs as standalone (no replica set in local dev)
      try {
        await session.withTransaction(async () => {
          await executeTransaction(session);
        });
      } catch (txError) {
        if (txError.message && txError.message.includes('Transaction numbers are only allowed on a replica set')) {
          paymentLogger.warn('MONGODB_STANDALONE_FALLBACK_OCC', { reason: 'No replica set detected, falling back to OCC.' });
          await executeTransaction(null);
        } else {
          throw txError;
        }
      }

      paymentLogger.info('FINALIZE_CAPTURE_COMPLETED', finalizedResult);

      // Trigger asynchronous non-blocking ORDER_CONFIRMED email on initial successful capture
      if (finalizedResult && !finalizedResult.alreadyProcessed && finalizedResult.orderId) {
        setImmediate(async () => {
          try {
            const orderDoc = await Order.findById(finalizedResult.orderId).populate('user', 'name email phone');
            if (orderDoc) {
              orderEventEmitter.emit(ORDER_EVENTS.ORDER_CONFIRMED, {
                order: orderDoc,
                customerEmail: orderDoc.user?.email || orderDoc.shippingAddress?.email,
                customerName: orderDoc.user?.name || orderDoc.shippingAddress?.fullName,
              });
            }
          } catch (emitErr) {
            paymentLogger.error('ORDER_CONFIRMED_NOTIFICATION_TRIGGER_FAILED', emitErr);
          }
        });
      }

      return finalizedResult;
    } catch (error) {
      paymentLogger.error('FINALIZE_CAPTURE_FAILED', error, { gatewayOrderId, gatewayPaymentId });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Records a payment failure
   */
  async recordFailure({ gatewayOrderId, errorCode, errorMessage }) {
    paymentLogger.warn('RECORD_FAILURE', { gatewayOrderId, errorCode, errorMessage });

    const intent = await PaymentIntent.findOneAndUpdate(
      { gatewayOrderId, status: { $ne: PAYMENT_STATUS.CAPTURED } },
      {
        $set: {
          status: PAYMENT_STATUS.FAILED,
          errorCode: errorCode || 'GATEWAY_DECLINED',
          errorMessage: errorMessage || 'Transaction failed or rejected by bank',
          failedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (intent) {
      await Order.findByIdAndUpdate(intent.orderId, {
        $set: {
          'paymentInfo.status': 'FAILED',
          'paymentDetails.status': 'failed',
        },
        $push: {
          statusTimeline: {
            status: 'PAYMENT_PENDING',
            timestamp: new Date(),
            comment: `Payment attempt failed: ${errorMessage || 'Declined'}`,
          },
        },
      });
    }

    return intent;
  }

  /**
   * Orchestrates a secure refund
   */
  async processRefund({ paymentIntentId, amount, reason, userId }) {
    paymentLogger.info('REFUND_INITIATED', { paymentIntentId, amount, reason });

    const intent = await PaymentIntent.findOne({ intentId: paymentIntentId });
    if (!intent) {
      throw new Error(`PaymentIntent "${paymentIntentId}" not found.`);
    }

    if (intent.status !== PAYMENT_STATUS.CAPTURED) {
      throw new Error(`Only CAPTURED transactions can be refunded. Current status: "${intent.status}".`);
    }

    const refundAmount = amount || intent.amount;
    if (refundAmount <= 0 || refundAmount > intent.amount - intent.refundedAmount) {
      throw new Error('Refund amount exceeds remaining non-refunded balance.');
    }

    const adapter = paymentRouter.getAdapter(intent.gateway);
    const amountInSubunits = Math.round(refundAmount * 100);

    const gatewayRefund = await adapter.initiateRefund({
      gatewayPaymentId: intent.gatewayPaymentId,
      amountInSubunits,
      reason,
      metadata: { intentId: intent.intentId, orderId: intent.orderId.toString() },
    });

    const refundId = `ref_${crypto.randomUUID()}`;
    const refundDoc = await Refund.create({
      refundId,
      paymentIntentId: intent._id,
      orderId: intent.orderId,
      userId: userId || intent.userId,
      amount: refundAmount,
      currency: intent.currency,
      status: gatewayRefund.status === 'PROCESSED' ? REFUND_STATUS.PROCESSED : REFUND_STATUS.PENDING,
      gatewayRefundId: gatewayRefund.gatewayRefundId,
      gateway: intent.gateway,
      reason,
      metadata: gatewayRefund.rawResponse,
      processedAt: gatewayRefund.status === 'PROCESSED' ? new Date() : null,
    });

    // Update payment intent refunded tally
    intent.refundedAmount += refundAmount;
    if (intent.refundedAmount >= intent.amount) {
      intent.status = PAYMENT_STATUS.REFUNDED;
    } else {
      intent.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    }
    await intent.save();

    return refundDoc;
  }
}

export const paymentOrchestrator = new PaymentOrchestratorService();
export default paymentOrchestrator;
