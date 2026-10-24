import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount cap cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Coupon expiration date is required'],
      index: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null denotes unlimited total usage
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to validate eligibility against an order subtotal
couponSchema.methods.isValidForOrder = function (orderAmount = 0) {
  if (!this.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }

  if (this.expiryDate && new Date() > this.expiryDate) {
    return { valid: false, message: 'Coupon has expired' };
  }

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit has been reached' };
  }

  if (orderAmount < this.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value of ₹${this.minOrderValue} required to apply this coupon`,
    };
  }

  return { valid: true };
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function (orderAmount = 0) {
  let discount = 0;
  if (this.discountType === 'FLAT') {
    discount = this.discountValue;
  } else if (this.discountType === 'PERCENTAGE') {
    discount = Math.round((orderAmount * this.discountValue) / 100);
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  }

  return Math.min(discount, orderAmount);
};

export const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
