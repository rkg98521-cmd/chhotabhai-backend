/**
 * @file StripeAdapter.js
 * @description Concrete Strategy Adapter for Stripe Gateway.
 * Demonstrates plug-and-play multi-gateway extensibility.
 */

import crypto from 'crypto';
import { PaymentGatewayInterface } from '../interfaces/PaymentGateway.interface.js';
import { PAYMENT_GATEWAY, PAYMENT_STATUS } from '../constants/payment.constants.js';

export class StripeAdapter extends PaymentGatewayInterface {
  constructor(config = {}) {
    super();
    this.secretKey = config.secretKey || process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  getGatewayName() {
    return PAYMENT_GATEWAY.STRIPE;
  }

  async createTransaction({ amountInSubunits, currency = 'usd', receipt, metadata = {} }) {
    try {
      // In production with stripe installed: stripe.paymentIntents.create(...)
      // Here modeled with standard contract:
      const simulatedStripeId = `pi_${crypto.randomBytes(12).toString('hex')}`;
      const clientSecret = `${simulatedStripeId}_secret_${crypto.randomBytes(8).toString('hex')}`;

      return {
        gatewayOrderId: simulatedStripeId,
        clientSecret,
        amount: Math.round(amountInSubunits),
        currency: currency.toLowerCase(),
        rawResponse: {
          id: simulatedStripeId,
          object: 'payment_intent',
          amount: Math.round(amountInSubunits),
          currency,
          client_secret: clientSecret,
          metadata,
        },
      };
    } catch (error) {
      throw new Error(`[StripeAdapter.createTransaction] Error: ${error.message}`);
    }
  }

  verifyWebhookSignature({ rawBody, signature, secret }) {
    try {
      const signingSecret = secret || this.webhookSecret;
      if (!signature || !signingSecret) return false;

      // Parse stripe-signature header: t=1614555845,v1=5257a869e7ecebeda...
      const items = signature.split(',').reduce((accum, curr) => {
        const [k, v] = curr.split('=');
        accum[k.trim()] = v.trim();
        return accum;
      }, {});

      const timestamp = items.t;
      const receivedSig = items.v1;
      if (!timestamp || !receivedSig) return false;

      const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
      const expectedSignature = crypto
        .createHmac('sha256', signingSecret)
        .update(signedPayload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const receivedBuffer = Buffer.from(receivedSig, 'utf8');

      if (expectedBuffer.length !== receivedBuffer.length) return false;
      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      return false;
    }
  }

  async fetchTransactionStatus(gatewayOrderId) {
    // Queries Stripe PaymentIntent
    return {
      status: PAYMENT_STATUS.CAPTURED,
      gatewayOrderId,
      gatewayPaymentId: `ch_${gatewayOrderId.replace('pi_', '')}`,
      amount: 1000,
      rawResponse: { id: gatewayOrderId, status: 'succeeded' },
    };
  }

  async capturePayment(gatewayPaymentId, amountInSubunits, currency) {
    return {
      isCaptured: true,
      gatewayPaymentId,
      rawResponse: { id: gatewayPaymentId, status: 'succeeded' },
    };
  }

  async initiateRefund({ gatewayPaymentId, amountInSubunits, reason }) {
    const refundId = `re_${crypto.randomBytes(12).toString('hex')}`;
    return {
      gatewayRefundId: refundId,
      status: 'PROCESSED',
      rawResponse: { id: refundId, status: 'succeeded' },
    };
  }
}

export default StripeAdapter;
