import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAnalytics,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleCrazyDeal,
  toggleTopDeal,
  toggleFeatured,
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  fulfillOrder,
  createCategory,
} from '../controllers/adminController.js';
import {
  getAllDevices,
  createDevice,
  toggleDeviceStatus,
  updateDevice,
  deleteDevice,
} from '../controllers/deviceController.js';
import {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController.js';
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

const router = Router();

// Protect all admin routes
router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/analytics', getAnalytics);
router.get('/dashboard', getAnalytics);

// Product Admin Operations
router.post(
  '/products',
  [
    body('title').trim().notEmpty().withMessage('Product title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isMongoId().withMessage('Valid Category ID is required'),
    body('brand').trim().notEmpty().withMessage('Brand is required'),
    body('variants').isArray({ min: 1 }).withMessage('At least one SKU variant is required'),
    body('variants.*.sku').trim().notEmpty().withMessage('Each variant must have a unique SKU'),
    body('variants.*.mrp').isNumeric().withMessage('MRP must be a number'),
    body('variants.*.sellingPrice').isNumeric().withMessage('Selling price must be a number'),
    body('variants.*.stockQuantity').isInt({ min: 0 }).withMessage('Stock must be non-negative'),
    validateRequest,
  ],
  createProduct
);

router.put('/products/:id', updateProduct);
router.patch('/products/:id/toggle-crazy-deal', toggleCrazyDeal);
router.patch('/products/:id/toggle-top-deal', toggleTopDeal);
router.patch('/products/:id/toggle-featured', toggleFeatured);
router.delete('/products/:id', deleteProduct);

// Category Admin Operations
router.post(
  '/categories',
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    validateRequest,
  ],
  createCategory
);

// Order Admin Operations
router.get('/orders', getAllOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/fulfill', fulfillOrder);
router.post('/orders/:id/fulfill', fulfillOrder);

// Device Model Compatibility Management
router.get('/devices', getAllDevices);
router.post('/devices', createDevice);
router.patch('/devices/:id/toggle', toggleDeviceStatus);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// Banner & Announcement Alerts Management
router.get('/banners', getAllBanners);
router.post(
  '/banners',
  [
    body('title').trim().notEmpty().withMessage('Banner / announcement title is required'),
    validateRequest,
  ],
  createBanner
);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Discount Coupon Management
router.get('/coupons', getAllCoupons);
router.post(
  '/coupons',
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('discountType').isIn(['PERCENTAGE', 'FLAT']).withMessage('discountType must be PERCENTAGE or FLAT'),
    body('discountValue').isNumeric().withMessage('discountValue must be a valid number'),
    body('expiryDate').notEmpty().withMessage('expiryDate is required'),
    validateRequest,
  ],
  createCoupon
);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

export default router;
