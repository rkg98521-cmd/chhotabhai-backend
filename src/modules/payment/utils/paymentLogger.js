/**
 * @file paymentLogger.js
 * @description Secure structured audit logger for financial transactions.
 * Automatically redacts PCI-DSS sensitive attributes (card numbers, secrets, cvvs).
 */

const REDACT_KEYS = ['card', 'number', 'cvv', 'cvc', 'password', 'secret', 'keySecret', 'clientSecret'];

function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Buffer.isBuffer(obj)) return `[Buffer: ${obj.length} bytes]`;

  const clean = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.some((rk) => k.toLowerCase().includes(rk.toLowerCase()))) {
      clean[k] = '***REDACTED***';
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizeForLogging(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const paymentLogger = {
  info: (action, meta = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      context: 'PAYMENT_ORCHESTRATOR',
      action,
      data: sanitizeForLogging(meta),
    };
    console.log(JSON.stringify(logEntry));
  },

  warn: (action, meta = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      context: 'PAYMENT_ORCHESTRATOR',
      action,
      data: sanitizeForLogging(meta),
    };
    console.warn(JSON.stringify(logEntry));
  },

  error: (action, error, meta = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context: 'PAYMENT_ORCHESTRATOR',
      action,
      errorMessage: error?.message || error,
      stack: error?.stack,
      data: sanitizeForLogging(meta),
    };
    console.error(JSON.stringify(logEntry));
  },
};

export default paymentLogger;
