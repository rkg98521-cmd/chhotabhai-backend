import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { ProductService } from '../services/productService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    keyword,
    category,
    brand,
    device,
    badge,
    minPrice,
    maxPrice,
    sortBy,
    order,
    page = 1,
    limit = 12,
  } = req.query;

  const result = await ProductService.queryProducts({
    keyword: search || keyword || '',
    category,
    brand,
    device,
    badge,
    minPrice,
    maxPrice,
    sortBy: sortBy || 'createdAt',
    order: order || 'desc',
    page,
    limit,
  });

  res.status(200).json(new ApiResponse(200, result, 'Products retrieved successfully.'));
});

export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const featured = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .limit(8);

  const bestsellers = await Product.find({ isActive: true, badge: 'Bestseller' })
    .populate('category', 'name slug')
    .limit(8);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        featured,
        bestsellers,
      },
      'Featured collections retrieved.'
    )
  );
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
  res.status(200).json(new ApiResponse(200, categories, 'Categories retrieved successfully.'));
});

export const getProductBySlugOrId = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await ProductService.getProductBySlugOrId(slug);

  // Fetch verified customer reviews for this product
  const reviews = await Review.find({ product: product._id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(20);

  const productData = product.toObject({ virtuals: true });
  productData.reviews = reviews;

  res.status(200).json(
    new ApiResponse(200, productData, 'Product details retrieved successfully.')
  );
});

export default {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductBySlugOrId,
};
