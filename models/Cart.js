import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    variantSku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    priceAtAddition: {
      type: Number,
      required: [true, 'Price snapshot at addition is required'],
      min: [0, 'Price must be positive'],
    },
    selectedDevice: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    appliedCoupon: {
      code: { type: String, default: null, trim: true, uppercase: true },
      discountAmount: { type: Number, default: 0, min: 0 },
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for calculating total items count
cartSchema.virtual('totalItems').get(function () {
  if (!this.items) return 0;
  return this.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
});

// Virtual for subtotal snapshot
cartSchema.virtual('subtotal').get(function () {
  if (!this.items) return 0;
  return this.items.reduce((acc, item) => acc + (item.priceAtAddition || 0) * (item.quantity || 0), 0);
});

export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
