import { Router } from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductBySlugOrId,
} from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/:slug', getProductBySlugOrId);

export default router;
