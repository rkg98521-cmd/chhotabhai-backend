/**
 * @file PaymentIntent.model.js
 * @description Normalized, strictly typed Mongoose model for Payment Intents (Transactions).
 * Incorporates Optimistic Concurrency Control (OCC) and deterministic state tracking.
 */

import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_GATEWAY, CURRENCY, ALLOWED_STATE_TRANSITIONS } from '../constants/payment.constants.js';

const paymentIntentSchema = new mongoose.Schema(
  {
    intentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Associated Order reference is mandatory'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Initiating User reference is mandatory'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Minimum amount must be at least 1 subunit / currency unit'],
    },
    currency: {
      type: String,
      required: true,
      enum: Object.values(CURRENCY),
      default: CURRENCY.INR,
      uppercase: true,
    },
    gateway: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_GATEWAY),
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    gatewayOrderId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    gatewayPaymentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    gatewaySignature: {
      type: String,
      trim: true,
      select: false, // Security: never expose raw gateway signatures by default
    },
    clientSecret: {
      type: String,
      trim: true,
      select: false,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    attempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawGatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },
    capturedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optimistic Concurrency Control Version Key
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enables Mongoose native document versioning protection
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// High-performance compound indexes for reconciliation & ledger queries
paymentIntentSchema.index({ orderId: 1, status: 1 });
paymentIntentSchema.index({ gateway: 1, gatewayOrderId: 1 });
paymentIntentSchema.index({ status: 1, createdAt: 1 }); // Used by the 30-min reconciliation cron

/**
 * Validates whether a state transition is legally permissible
 */
paymentIntentSchema.methods.canTransitionTo = function (nextStatus) {
  const allowed = ALLOWED_STATE_TRANSITIONS[this.status] || [];
  return allowed.includes(nextStatus);
};

export const PaymentIntent = mongoose.model('PaymentIntent', paymentIntentSchema);
export default PaymentIntent;
