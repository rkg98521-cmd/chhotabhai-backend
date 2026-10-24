/**
 * NoSQL Injection Protection Middleware
 * Recursively removes any keys containing prohibited characters ('$' or '.') from request body, params, and query.
 */
export const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    // Strip keys with mongo operator prefixes ($gt, $ne, etc.) or dot notation
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }

  if (req.query && typeof req.query === 'object') {
    try {
      const sanitizedQuery = sanitizeData(req.query);
      for (const key of Object.keys(req.query)) {
        if (!Object.prototype.hasOwnProperty.call(sanitizedQuery, key)) {
          delete req.query[key];
        }
      }
    } catch (e) {
      // Handle cases where req.query is read-only
    }
  }

  next();
};

export default mongoSanitize;
