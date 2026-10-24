import { Router } from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import orderRoutes from './orderRoutes.js';
import adminRoutes from './adminRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import { getActiveDevices } from '../controllers/deviceController.js';
import deviceRoutes from './deviceRoutes.js';
import bannerRoutes from './bannerRoutes.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'ChhotaBhai E-Commerce API v1 (Prepaid Only)',
  });
});

// Mounted Routes
router.use('/devices', deviceRoutes);
router.use('/banners', bannerRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);

export default router;


