/**
 * @file IdempotencyRecord.model.js
 * @description Dedicated storage for Idempotency Keys to safeguard against duplicate
 * payment charges, duplicate webhooks, and network retries.
 */

import mongoose from 'mongoose';

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
    // Automatic cleanup via MongoDB TTL Index (24-hour lifetime)
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
export default IdempotencyRecord;
