/**
 * @file PaymentRouter.service.js
 * @description Dynamic Payment Router & Factory.
 * Resolves gateway adapters based on rules, currencies, or health metrics
 * without coupling callers to concrete gateway implementations.
 */

import { PAYMENT_GATEWAY, CURRENCY } from '../constants/payment.constants.js';
import { RazorpayAdapter } from '../adapters/RazorpayAdapter.js';
import { StripeAdapter } from '../adapters/StripeAdapter.js';

class PaymentRouterService {
  constructor() {
    this.adapters = new Map();
    this.defaultGateway = PAYMENT_GATEWAY.RAZORPAY;

    // Register active gateway adapters
    this.registerAdapter(new RazorpayAdapter());
    this.registerAdapter(new StripeAdapter());
  }

  /**
   * Registers a gateway adapter into the pool
   * @param {PaymentGatewayInterface} adapter
   */
  registerAdapter(adapter) {
    this.adapters.set(adapter.getGatewayName(), adapter);
  }

  /**
   * Explicitly retrieves an adapter by gateway enum key
   * @param {string} gatewayName
   * @returns {PaymentGatewayInterface}
   */
  getAdapter(gatewayName) {
    const adapter = this.adapters.get(gatewayName);
    if (!adapter) {
      throw new Error(`[PaymentRouter] Unsupported or unregistered payment gateway: "${gatewayName}".`);
    }
    return adapter;
  }

  /**
   * Smart Dynamic Router: Selects optimal gateway based on transaction parameters & business rules
   * @param {Object} context
   * @param {string} [context.preferredGateway] - User or merchant preference
   * @param {string} [context.currency] - Transaction currency
   * @param {number} [context.amount] - Transaction amount
   * @returns {PaymentGatewayInterface}
   */
  resolveGateway(context = {}) {
    const { preferredGateway, currency = CURRENCY.INR } = context;

    // Rule 1: Explicit preference if registered
    if (preferredGateway && this.adapters.has(preferredGateway)) {
      return this.adapters.get(preferredGateway);
    }

    // Rule 2: Currency-based routing
    if (currency.toUpperCase() === CURRENCY.INR) {
      return this.adapters.get(PAYMENT_GATEWAY.RAZORPAY);
    } else {
      return this.adapters.get(PAYMENT_GATEWAY.STRIPE);
    }
  }
}

export const paymentRouter = new PaymentRouterService();
export default paymentRouter;
