/**
 * @file payment.routes.js
 * @description Decoupled Express router for Payment Orchestration.
 */

import { Router } from 'express';
import {
  createPaymentIntent,
  verifyClientPayment,
  getPaymentStatus,
  initiateRefund,
} from '../controllers/payment.controller.js';
import {
  handleRazorpayWebhook,
  handleStripeWebhook,
} from '../controllers/webhook.controller.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware.js';
import { protect, authorize } from '../../../../middlewares/authMiddleware.js';

const router = Router();

// ==========================================
// 1. PUBLIC WEBHOOK CONSUMER ENDPOINTS
// (Signature-verified via raw body HMAC)
// ==========================================
router.post('/webhook/razorpay', handleRazorpayWebhook);
router.post('/webhook/stripe', handleStripeWebhook);

// ==========================================
// 2. AUTHENTICATED CLIENT PAYMENT FLOW
// ==========================================
router.post('/intent', protect, idempotencyMiddleware, createPaymentIntent);
router.post('/verify', protect, verifyClientPayment);
router.get('/intent/:intentId', protect, getPaymentStatus);

// ==========================================
// 3. ADMIN / PRIVILEGED REFUND MANAGEMENT
// ==========================================
router.post('/refund', protect, authorize('admin', 'manager'), initiateRefund);

export default router;
