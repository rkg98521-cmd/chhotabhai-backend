import { Coupon } from '../models/Coupon.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Admin: Get all coupons
export const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, coupons, 'All discount coupons retrieved.'));
});

// Admin: Create new coupon
export const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minOrderValue, maxDiscountAmount, expiryDate, usageLimit, isActive } = req.body;

  if (!code || !discountType || discountValue === undefined || !expiryDate) {
    throw new ApiError(400, 'Code, discountType (PERCENTAGE/FLAT), discountValue, and expiryDate are required.');
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await Coupon.findOne({ code: cleanCode });
  if (existing) {
    throw new ApiError(400, `Coupon with code '${cleanCode}' already exists.`);
  }

  const coupon = await Coupon.create({
    code: cleanCode,
    discountType: discountType.toUpperCase(),
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue) || 0,
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    expiryDate: new Date(expiryDate),
    usageLimit: usageLimit ? Number(usageLimit) : null,
    isActive: isActive !== false,
  });

  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created successfully.'));
});

// Admin: Update coupon
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found.');
  }

  const { code, discountType, discountValue, minOrderValue, maxDiscountAmount, expiryDate, usageLimit, isActive } = req.body;

  if (code) coupon.code = code.trim().toUpperCase();
  if (discountType) coupon.discountType = discountType.toUpperCase();
  if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
  if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue);
  if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
  if (expiryDate) coupon.expiryDate = new Date(expiryDate);
  if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
  if (typeof isActive === 'boolean') coupon.isActive = isActive;

  await coupon.save();
  res.status(200).json(new ApiResponse(200, coupon, 'Coupon updated successfully.'));
});

// Admin: Delete coupon
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found.');
  }

  await Coupon.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Coupon removed permanently.'));
});

export default {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
