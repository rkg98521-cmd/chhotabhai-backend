import { Router } from 'express';
import { body } from 'express-validator';
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

const router = Router();

// Public Discovery Route: GET /api/v1/banners (supports ?type=TICKER or ?type=HERO_BANNER)
router.get('/', getActiveBanners);

// Protected Admin Management Routes
router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/all', getAllBanners);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Banner / Ticker title is required'),
    validateRequest,
  ],
  createBanner
);

router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

export default router;
