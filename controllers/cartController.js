import { CartService } from '../services/cartService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await CartService.getCart(req.user._id);
  res.status(200).json(new ApiResponse(200, cart, 'Shopping cart retrieved.'));
});

export const addToCart = asyncHandler(async (req, res) => {
  const { sku, variantSku, quantity, productId, selectedDevice } = req.body;
  const targetSku = sku || variantSku;

  const cart = await CartService.addItem(
    req.user._id,
    targetSku,
    quantity || 1,
    productId,
    selectedDevice
  );

  res.status(200).json(new ApiResponse(200, cart, 'Item added to cart.'));
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { sku, variantSku, itemId, quantity } = req.body;
  const targetIdentifier = sku || variantSku || itemId || req.params.itemId;

  const cart = await CartService.updateItem(req.user._id, targetIdentifier, quantity);
  res.status(200).json(new ApiResponse(200, cart, 'Cart updated.'));
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const sku = req.params.sku || req.params.itemId;
  const cart = await CartService.removeItem(req.user._id, sku);
  res.status(200).json(new ApiResponse(200, cart, 'Item removed from cart.'));
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, couponCode } = req.body;
  const cart = await CartService.applyCoupon(req.user._id, code || couponCode);
  res.status(200).json(new ApiResponse(200, cart, 'Coupon applied successfully.'));
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await CartService.removeCoupon(req.user._id);
  res.status(200).json(new ApiResponse(200, cart, 'Coupon removed successfully.'));
});

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  applyCoupon,
  removeCoupon,
};
