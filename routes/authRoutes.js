import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, googleLogin, getMe, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
    body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    validateRequest,
  ],
  register
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email address is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  login
);

router.post('/google', googleLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);


export default router;
