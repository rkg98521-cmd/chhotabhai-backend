import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/apiError.js';

export class ProductService {
  static async queryProducts({
    keyword = '',
    category = '',
    brand = '',
    device = '',
    badge = '',
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 12,
  }) {
    const filter = { isActive: true };

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { supportedDevices: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.category = category;
      } else {
        const catDoc = await Category.findOne({
          $or: [{ slug: category }, { name: { $regex: new RegExp(`^${category}$`, 'i') } }],
        });
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          // No category matched, return empty result filter
          filter.category = '000000000000000000000000';
        }
      }
    }

    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    if (device && device.trim()) {
      const cleanDev = device.trim().replace(/^(Apple|Samsung|OnePlus|Google|Xiaomi|Vivo|Realme)\s+/i, '');
      const searchTarget = cleanDev || device.trim();
      const deviceRegex = new RegExp(searchTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { supportedDevices: deviceRegex },
          { title: deviceRegex },
          { description: deviceRegex },
        ],
      });
    }

    if (badge && badge !== 'None') {
      filter.badge = badge;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter['variants.sellingPrice'] = {};
      if (minPrice !== undefined) filter['variants.sellingPrice'].$gte = Number(minPrice);
      if (maxPrice !== undefined) filter['variants.sellingPrice'].$lte = Number(maxPrice);
    }

    const sortOptions = {};
    if (sortBy === 'price' || sortBy === 'sellingPrice') {
      sortOptions['variants.0.sellingPrice'] = order === 'asc' ? 1 : -1;
    } else if (sortBy === 'ratings' || sortBy === 'rating') {
      sortOptions['ratings.averageRating'] = order === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    return {
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    };
  }

  static async getProductBySlugOrId(identifier) {
    let product;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(identifier).populate('category', 'name slug');
    } else {
      product = await Product.findOne({ slug: identifier }).populate('category', 'name slug');
    }

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    return product;
  }
}

export default ProductService;
