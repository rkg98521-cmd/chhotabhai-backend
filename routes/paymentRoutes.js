import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../controllers/paymentController.js';

const router = Router();

// Protected Payment routes
router.post('/razorpay-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyRazorpayPayment);

export default router;
