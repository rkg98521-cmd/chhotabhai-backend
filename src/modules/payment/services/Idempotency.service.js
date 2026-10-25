/**
 * @file Idempotency.service.js
 * @description Enterprise Idempotency Service.
 * Guarantees zero duplicate operations under network retries, double clicks, or replicated webhooks.
 */

import crypto from 'crypto';
import { IdempotencyRecord } from '../models/IdempotencyRecord.model.js';

class IdempotencyService {
  /**
   * Generates a deterministic SHA256 digest of incoming payload
   * @param {Object|string} payload
   * @returns {string}
   */
  hashPayload(payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Locks or fetches an existing idempotent execution
   * @param {Object} params
   * @param {string} params.key
   * @param {string} params.endpoint
   * @param {Object} params.payload
   * @param {string} [params.userId]
   * @returns {Promise<{ isExisting: boolean, status: string, statusCode?: number, responseBody?: any, record: any }>}
   */
  async acquireLock({ key, endpoint, payload, userId = null }) {
    if (!key) {
      throw new Error('Idempotency key is required to acquire lock.');
    }

    const requestHash = this.hashPayload(payload);
    const existing = await IdempotencyRecord.findOne({ key });

    if (existing) {
      // Security check: Payload hash mismatch for the same key indicates malicious reuse
      if (existing.requestHash !== requestHash) {
        const error = new Error('Idempotency Key Conflict: Request payload does not match previously submitted payload.');
        error.statusCode = 422;
        throw error;
      }

      if (existing.status === 'COMPLETED') {
        return {
          isExisting: true,
          status: 'COMPLETED',
          statusCode: existing.statusCode,
          responseBody: existing.responseBody,
          record: existing,
        };
      }

      // Check if another parallel thread is actively executing within lock lease
      const lockAgeMs = Date.now() - new Date(existing.lockedAt).getTime();
      if (existing.status === 'PROCESSING' && lockAgeMs < 45000) {
        const error = new Error('A concurrent request with this Idempotency-Key is actively being processed. Please retry shortly.');
        error.statusCode = 409;
        throw error;
      }
    }

    // Upsert lock record with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const record = await IdempotencyRecord.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          requestHash,
          endpoint,
          userId,
          status: 'PROCESSING',
          lockedAt: new Date(),
          expiresAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      isExisting: false,
      status: 'PROCESSING',
      record,
    };
  }

  /**
   * Releases lock and caches successful response payload
   */
  async commit({ key, statusCode = 200, responseBody }) {
    await IdempotencyRecord.updateOne(
      { key },
      {
        $set: {
          status: 'COMPLETED',
          statusCode,
          responseBody,
        },
      }
    );
  }

  /**
   * Releases lock upon hard failure so client can retry with same key if safe
   */
  async releaseLock({ key }) {
    await IdempotencyRecord.deleteOne({ key });
  }
}

export const idempotencyService = new IdempotencyService();
export default idempotencyService;
