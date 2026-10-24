import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'chhotabhai-media',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_cloudinary_secret_key_chhotabhai',
  secure: true,
});

// Configure Cloudinary storage engine accepting jpg, png, webp
export const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chhotabhai/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
});

export { cloudinary };
export default cloudinary;
