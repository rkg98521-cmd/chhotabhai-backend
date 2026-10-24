import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      trim: true,
      uppercase: true,
    },
    colorName: {
      type: String,
      trim: true,
      default: 'Standard',
    },
    colorCode: {
      type: String,
      trim: true,
      default: '#000000',
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Please provide a valid HEX color code'],
    },
    images: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    mrp: {
      type: Number,
      required: [true, 'MRP (Original Price) is required'],
      min: [0, 'MRP cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling Price (Discounted) is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for variant discount percentage
variantSchema.virtual('discountPercentage').get(function () {
  if (this.mrp && this.sellingPrice && this.mrp > this.sellingPrice) {
    return Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
  }
  return 0;
});

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category reference is required'],
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      index: true,
    },
    badge: {
      type: String,
      default: 'None',
      trim: true,
    },

    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    supportedDevices: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    variants: {
      type: [variantSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Product must have at least one variant',
      },
    },
    defaultVariantIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratings: {
      averageRating: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot exceed 5'],
      },
      totalReviews: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isCrazyDeal: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTopDeal: {
      type: Boolean,
      default: false,
      index: true,
    },
    dealTag: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate slug from title before saving
productSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Ensure defaultVariantIndex is within bounds
  if (this.variants && this.variants.length > 0) {
    if (this.defaultVariantIndex >= this.variants.length) {
      this.defaultVariantIndex = 0;
    }
  }

  next();
});

// Compound Indexes for fast catalog browsing and phone model matching
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ supportedDevices: 1, isActive: 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

// Full-Text Search Index
productSchema.index(
  {
    title: 'text',
    brand: 'text',
    supportedDevices: 'text',
    description: 'text',
  },
  {
    weights: {
      title: 10,
      supportedDevices: 8,
      brand: 5,
      description: 2,
    },
    name: 'ProductCatalogTextSearch',
  }
);

// Virtuals for seamless integration with controllers & UI
productSchema.virtual('name').get(function () {
  return this.title;
});

productSchema.virtual('defaultVariant').get(function () {
  if (!this.variants || this.variants.length === 0) return null;
  return this.variants[this.defaultVariantIndex] || this.variants[0];
});

productSchema.virtual('originalPrice').get(function () {
  return this.defaultVariant?.mrp || 0;
});

productSchema.virtual('discountedPrice').get(function () {
  return this.defaultVariant?.sellingPrice || 0;
});

productSchema.virtual('discountPercentage').get(function () {
  return this.defaultVariant?.discountPercentage || 0;
});

productSchema.virtual('countInStock').get(function () {
  if (!this.variants) return 0;
  return this.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
});

productSchema.virtual('thumbnail').get(function () {
  return this.defaultVariant?.images?.[0] || '';
});

productSchema.virtual('images').get(function () {
  return this.defaultVariant?.images || [];
});

productSchema.virtual('colors').get(function () {
  if (!this.variants) return [];
  return this.variants.map((v) => ({
    name: v.colorName,
    hexCode: v.colorCode,
  }));
});

productSchema.virtual('isBestSeller').get(function () {
  return this.badge === 'Bestseller';
});

export const Product = mongoose.model('Product', productSchema);
export default Product;
