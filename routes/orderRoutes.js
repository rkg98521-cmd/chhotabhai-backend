import { Router } from 'express';
import { body } from 'express-validator';
import {
  checkout,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  requestReplacement,
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

const router = Router();

// Public Order Tracking (Accessible with Order Number + Phone)
router.post('/track', trackOrder);
router.get('/track/:id', trackOrder);
router.get('/public/:id', trackOrder);

router.use(protect);

const checkoutValidation = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Contact phone number is required'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode')
    .optional()
    .trim(),
  body('shippingAddress.postalCode')
    .optional()
    .trim(),
  body('paymentMethod')
    .optional()
    .toUpperCase()
    .isIn(['PREPAID_ONLINE', 'RAZORPAY', 'UPI'])
    .withMessage('Valid prepaid payment method required (PREPAID_ONLINE, RAZORPAY, UPI). COD is disabled.'),
  body('items').optional().isArray().withMessage('Items must be an array of order items'),
  body('couponCode').optional().isString(),
  validateRequest,
];

router.post('/checkout', checkoutValidation, checkout);
router.post('/', checkoutValidation, checkout);

router.get('/my-orders', getMyOrders);
router.get('/myorders', getMyOrders);
router.patch('/:id/cancel', cancelOrder);
router.post('/:id/cancel', cancelOrder);

// Replacement Flow (One-Time Replacement Only within 7 Days of Delivery)
router.post(
  '/:id/replace',
  [
    body('reason').trim().notEmpty().withMessage('Replacement reason is required (e.g. Defective, Damaged in transit, Wrong item).'),
    validateRequest,
  ],
  requestReplacement
);
router.patch(
  '/:id/replace',
  [
    body('reason').trim().notEmpty().withMessage('Replacement reason is required (e.g. Defective, Damaged in transit, Wrong item).'),
    validateRequest,
  ],
  requestReplacement
);

router.get('/:id', getOrderById);

export default router;
