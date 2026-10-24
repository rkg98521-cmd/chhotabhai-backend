import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  applyCoupon,
  removeCoupon,
} from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getCart);

router.post(
  '/add',
  [
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be an integer >= 1'),
    validateRequest,
  ],
  addToCart
);

// Backward compatibility alias for step 1
router.post(
  '/',
  [
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be an integer >= 1'),
    validateRequest,
  ],
  addToCart
);

router.put(
  '/update',
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative integer'),
    validateRequest,
  ],
  updateCartItem
);

// Backward compatibility alias
router.put(
  '/item/:itemId',
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative integer'),
    validateRequest,
  ],
  updateCartItem
);

router.delete('/remove/:sku', removeFromCart);
router.delete('/item/:itemId', removeFromCart);

router.post(
  '/apply-coupon',
  [
    body('code').optional().trim(),
    body('couponCode').optional().trim(),
    validateRequest,
  ],
  applyCoupon
);

// Backward compatibility alias
router.post(
  '/coupon',
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    validateRequest,
  ],
  applyCoupon
);

router.delete('/remove-coupon', removeCoupon);

export default router;
