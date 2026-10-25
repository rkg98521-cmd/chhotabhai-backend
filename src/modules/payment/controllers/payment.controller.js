/**
 * @file payment.controller.js
 * @description Client-facing Payment Controller.
 * Exposes endpoints for initiating intents, client verification, and refund requests.
 */

import { paymentOrchestrator } from '../services/PaymentOrchestrator.service.js';
import { PaymentIntent } from '../models/PaymentIntent.model.js';
import { paymentLogger } from '../utils/paymentLogger.js';

export const createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId, preferredGateway } = req.body;
    const userId = req.user._id;
    const idempotencyKey = req.idempotencyKey;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }

    const intent = await paymentOrchestrator.createIntent({
      orderId,
      userId,
      preferredGateway,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment intent created successfully.',
      data: intent,
    });
  } catch (error) {
    paymentLogger.error('CREATE_PAYMENT_INTENT_ERROR', error, { body: req.body });
    next(error);
  }
};

export const verifyClientPayment = async (req, res, next) => {
  try {
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

    if (!gatewayOrderId) {
      return res.status(400).json({ success: false, message: 'gatewayOrderId is required.' });
    }

    const result = await paymentOrchestrator.finalizeCapture({
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      triggerSource: 'CLIENT_REDIRECT',
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully.',
      data: result,
    });
  } catch (error) {
    paymentLogger.error('VERIFY_CLIENT_PAYMENT_ERROR', error, { body: req.body });
    next(error);
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const { intentId } = req.params;
    const intent = await PaymentIntent.findOne({ intentId }).select('-rawGatewayResponse -clientSecret');

    if (!intent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found.' });
    }

    return res.status(200).json({
      success: true,
      data: intent,
    });
  } catch (error) {
    next(error);
  }
};

export const initiateRefund = async (req, res, next) => {
  try {
    const { intentId, amount, reason } = req.body;
    const userId = req.user._id;

    const refund = await paymentOrchestrator.processRefund({
      paymentIntentId: intentId,
      amount,
      reason,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Refund initiated successfully.',
      data: refund,
    });
  } catch (error) {
    paymentLogger.error('REFUND_INITIATE_ERROR', error, { body: req.body });
    next(error);
  }
};

export default {
  createPaymentIntent,
  verifyClientPayment,
  getPaymentStatus,
  initiateRefund,
};
