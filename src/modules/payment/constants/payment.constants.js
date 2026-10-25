/**
 * @file payment.constants.js
 * @description Exhaustive enumerations, state transition matrices, and configuration
 * constants for the Enterprise Payment Orchestration Engine.
 */

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
});

export const REFUND_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
});

export const PAYMENT_GATEWAY = Object.freeze({
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE',
});

export const CURRENCY = Object.freeze({
  INR: 'INR',
  USD: 'USD',
});

/**
 * Deterministic State Machine Transition Rules
 * Prevents invalid or out-of-order state progressions (e.g., FAILED -> CAPTURED)
 */
export const ALLOWED_STATE_TRANSITIONS = Object.freeze({
  [PAYMENT_STATUS.CREATED]: [
    PAYMENT_STATUS.AUTHORIZED,
    PAYMENT_STATUS.CAPTURED,
    PAYMENT_STATUS.FAILED,
  ],
  [PAYMENT_STATUS.AUTHORIZED]: [
    PAYMENT_STATUS.CAPTURED,
    PAYMENT_STATUS.FAILED,
  ],
  [PAYMENT_STATUS.CAPTURED]: [
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.REFUNDED,
  ],
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [
    PAYMENT_STATUS.REFUNDED,
  ],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.REFUNDED]: [],
});

export default {
  PAYMENT_STATUS,
  REFUND_STATUS,
  PAYMENT_GATEWAY,
  CURRENCY,
  ALLOWED_STATE_TRANSITIONS,
};
