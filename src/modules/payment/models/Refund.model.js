/**
 * @file Refund.model.js
 * @description Normalized Mongoose model for Payment Refunds with audit tracking.
 */

import mongoose from 'mongoose';
import { REFUND_STATUS, CURRENCY } from '../constants/payment.constants.js';

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    paymentIntentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentIntent',
      required: [true, 'Associated Payment Intent reference is mandatory'],
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
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [1, 'Refund amount must be positive'],
    },
    currency: {
      type: String,
      required: true,
      enum: Object.values(CURRENCY),
      default: CURRENCY.INR,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: 'Customer request / Order cancellation',
    },
    gatewayRefundId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    gateway: {
      type: String,
      required: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Refund = mongoose.model('PaymentRefund', refundSchema);
export default Refund;
