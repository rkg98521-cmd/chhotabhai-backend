/**
 * @file webhook.controller.js
 * @description Dedicated, security-hardened Webhook Controller.
 * Verifies raw body HMAC signatures and enforces event-level idempotency.
 */

import { paymentRouter } from '../services/PaymentRouter.service.js';
import { paymentOrchestrator } from '../services/PaymentOrchestrator.service.js';
import { idempotencyService } from '../services/Idempotency.service.js';
import { PAYMENT_GATEWAY } from '../constants/payment.constants.js';
import { paymentLogger } from '../utils/paymentLogger.js';

export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

  paymentLogger.info('WEBHOOK_RECEIVED', {
    gateway: PAYMENT_GATEWAY.RAZORPAY,
    hasSignature: Boolean(signature),
    hasRawBody: Boolean(req.rawBody),
  });

  const adapter = paymentRouter.getAdapter(PAYMENT_GATEWAY.RAZORPAY);

  // 1. Strict HMAC Signature Verification on RAW body buffer
  const isValid = adapter.verifyWebhookSignature({
    rawBody,
    signature,
    secret: process.env.RAZORPAY_WEBHOOK_SECRET,
  });

  if (!isValid) {
    paymentLogger.warn('WEBHOOK_INVALID_SIGNATURE', {
      gateway: PAYMENT_GATEWAY.RAZORPAY,
      ip: req.ip,
    });
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const payload = req.body;
  const eventName = payload.event;
  // Use gateway unique event id or compute a deterministic key
  const eventId = req.headers['x-razorpay-event-id'] || `rzp_evt_${payload.created_at || Date.now()}_${payload.event}`;

  // 2. Webhook Event-Level Idempotency Guard
  try {
    const lock = await idempotencyService.acquireLock({
      key: `webhook:${eventId}`,
      endpoint: '/api/v1/payments/webhook/razorpay',
      payload,
    });

    if (lock.isExisting && lock.status === 'COMPLETED') {
      paymentLogger.info('WEBHOOK_DUPLICATE_IGNORED', { eventId, eventName });
      return res.status(200).json({ status: 'ok', message: 'Event already processed.' });
    }
  } catch (idempErr) {
    if (idempErr.statusCode === 409) {
      // Event currently processing in parallel worker, acknowledge 200 to prevent gateway storm
      return res.status(200).json({ status: 'processing' });
    }
  }

  // 3. Process Events
  try {
    switch (eventName) {
      case 'order.paid':
      case 'payment.captured': {
        const paymentEntity = payload.payload?.payment?.entity;
        const gatewayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
        const gatewayPaymentId = paymentEntity?.id;

        if (gatewayOrderId) {
          await paymentOrchestrator.finalizeCapture({
            gatewayOrderId,
            gatewayPaymentId,
            gatewaySignature: signature,
            triggerSource: 'WEBHOOK',
          });
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payload?.payment?.entity;
        const gatewayOrderId = paymentEntity?.order_id;
        if (gatewayOrderId) {
          await paymentOrchestrator.recordFailure({
            gatewayOrderId,
            errorCode: paymentEntity?.error_code,
            errorMessage: paymentEntity?.error_description,
          });
        }
        break;
      }

      default:
        paymentLogger.info('WEBHOOK_UNHANDLED_EVENT', { eventName });
        break;
    }

    // Commit idempotent lock completion
    await idempotencyService.commit({
      key: `webhook:${eventId}`,
      statusCode: 200,
      responseBody: { status: 'success', event: eventName },
    });

    return res.status(200).json({ status: 'success', event: eventName });
  } catch (error) {
    paymentLogger.error('WEBHOOK_PROCESSING_ERROR', error, { eventName, eventId });
    // Release lock so gateway retry can attempt again
    await idempotencyService.releaseLock({ key: `webhook:${eventId}` });
    return res.status(500).json({ error: 'Webhook processing error.' });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const adapter = paymentRouter.getAdapter(PAYMENT_GATEWAY.STRIPE);

  const isValid = adapter.verifyWebhookSignature({
    rawBody,
    signature,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid Stripe signature.' });
  }

  const event = req.body;
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data?.object;
    await paymentOrchestrator.finalizeCapture({
      gatewayOrderId: paymentIntent.id,
      gatewayPaymentId: paymentIntent.charges?.data?.[0]?.id || paymentIntent.id,
      triggerSource: 'WEBHOOK_STRIPE',
    });
  }

  return res.status(200).json({ received: true });
};

export default {
  handleRazorpayWebhook,
  handleStripeWebhook,
};
