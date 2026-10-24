import { Router } from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Validate file type
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file format. Allowed types: JPG, PNG, WEBP.'), false);
  }
};

// Check if Cloudinary is configured with actual credentials
const isCloudinaryConfigured = () => {
  const secret = process.env.CLOUDINARY_API_SECRET;
  return (
    secret &&
    secret !== 'mock_cloudinary_secret_key_chhotabhai' &&
    secret !== 'your_cloudinary_api_secret_here'
  );
};

// Memory storage fallback for development / testing when real Cloudinary API keys are not supplied
const memoryStorage = multer.memoryStorage();

const primaryUpload = multer({
  storage: isCloudinaryConfigured() ? storage : memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter,
});

/**
 * @route   POST /api/v1/upload
 * @desc    Upload product images (single or multiple, max 5)
 * @access  Private/Admin
 */
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  (req, res, next) => {
    primaryUpload.array('images', 5)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File size too large. Maximum size is 5MB per file.'));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(400, 'Maximum 5 images allowed per upload batch.'));
          }
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      throw new ApiError(400, 'No images provided for upload. Please select at least one file.');
    }

    let urls = [];

    if (isCloudinaryConfigured()) {
      // Cloudinary returns secure_url or path in multer-storage-cloudinary
      urls = files.map((file) => file.path || file.secure_url || file.url);
    } else {
      // Development mock fallback: Generate secure data URIs or demo CDN URLs
      urls = files.map((file, idx) => {
        if (file.buffer) {
          const base64 = file.buffer.toString('base64');
          return `data:${file.mimetype};base64,${base64}`;
        }
        return file.path || `https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80#dev-${Date.now()}-${idx}`;
      });
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          urls,
          count: urls.length,
          storage: isCloudinaryConfigured() ? 'cloudinary' : 'local-dev-mock',
        },
        'Image(s) uploaded successfully.'
      )
    );
  })
);

export default router;
