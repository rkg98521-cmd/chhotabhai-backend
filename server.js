import path from 'path';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import v1Routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { mongoSanitize } from './middlewares/sanitizeMiddleware.js';

// Load environment configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// 1. Compression middleware (gzip all responses for lightning-fast transfer)
app.use(compression());

// 2. Production Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
        connectSrc: ["'self'", 'https:', 'http:'],
      },
    },
  })
);

// 3. Strict CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://chhotabhai-frontend.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile tools) or any localhost port in dev
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        allowedOrigins.length === 0
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not allowed by strict CORS policy.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Idempotency-Key',
      'idempotency-key',
      'X-Idempotency-Key',
      'x-idempotency-key',
      'Origin',
    ],
    exposedHeaders: ['Idempotency-Key', 'idempotency-key'],
  })
);

// 4. Request Logging Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Request Body Parsers (with raw body buffer capture for HMAC webhook verification)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. NoSQL Injection Sanitization
app.use(mongoSanitize);

// 7. Enterprise Rate Limiting Protection
// Global API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

// Strict rate limiter for sensitive endpoints: auth & checkout
const sensitiveApiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 25 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    success: false,
    message: 'Too many requests. Please try again after 10 minutes.',
  },
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/v1/auth', sensitiveApiLimiter);
app.use('/api/v1/orders/checkout', sensitiveApiLimiter);
app.use('/api/v1/payment', sensitiveApiLimiter);

// API Routes
app.use('/api/v1', v1Routes);

// Static file serving for Production monolithic deployment
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  // Support both repository root directory and nested backend folder directory runs
  const distPath = fs.existsSync(path.resolve(__dirname, 'frontend', 'dist'))
    ? path.resolve(__dirname, 'frontend', 'dist')
    : path.resolve(__dirname, '../frontend', 'dist');

  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('API is running...'));
}

// Error Handling Middlewares for API
app.use(notFound);
app.use(errorHandler);

// Server Listener
const server = app.listen(PORT, async () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

  // Start Autonomous Payment Reconciliation Background Worker
  try {
    const { startPaymentReconciliationCron } = await import('./src/modules/payment/index.js');
    startPaymentReconciliationCron();
  } catch (cronErr) {
    console.error('[PaymentCron] Failed to initialize reconciliation worker:', cronErr.message);
  }
});

// Process event handlers for unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Process Error] Unhandled Rejection: ${err.message}`);
});

export default app;
