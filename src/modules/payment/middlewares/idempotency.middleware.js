/**
 * @file idempotency.middleware.js
 * @description Intercepts requests bearing an 'Idempotency-Key' header.
 * Prevents double-processing and guarantees idempotent replay.
 */

import { idempotencyService } from '../services/Idempotency.service.js';

export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return next();
  }

  try {
    const lock = await idempotencyService.acquireLock({
      key: idempotencyKey,
      endpoint: req.originalUrl || req.path,
      payload: req.body,
      userId: req.user?._id || null,
    });

    if (lock.isExisting && lock.status === 'COMPLETED') {
      res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
      return res.status(lock.statusCode || 200).json(lock.responseBody);
    }

    // Intercept standard res.json to capture and commit response body for future duplicate calls
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      idempotencyService
        .commit({
          key: idempotencyKey,
          statusCode: res.statusCode,
          responseBody: body,
        })
        .catch((err) => console.error('[IdempotencyMiddleware] Commit error:', err));

      return originalJson(body);
    };

    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export default idempotencyMiddleware;
