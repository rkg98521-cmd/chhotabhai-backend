import { Order } from '../models/Order.js';
import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const checkout = asyncHandler(async (req, res) => {
  const { shippingAddress, items, couponCode, paymentMethod } = req.body;

  if (paymentMethod && (paymentMethod.toUpperCase() === 'COD' || paymentMethod.toUpperCase() === 'CASH_ON_DELIVERY')) {
    throw new ApiError(400, 'Cash on Delivery (COD) is strictly disabled. ChhotaBhai is a 100% prepaid platform (UPI / Cards / NetBanking).');
  }

  if (!shippingAddress) {
    throw new ApiError(400, 'Shipping address details are required for checkout.');
  }

  const order = await OrderService.createPrepaidSandboxOrder(req.user._id, {
    shippingAddress,
    items,
    couponCode,
    paymentMethod: paymentMethod || 'PREPAID_ONLINE',
  });

  res.status(201).json(new ApiResponse(201, order, 'Prepaid order placed successfully via sandbox authorization.'));
});


export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.getUserOrders(req.user._id);
  res.status(200).json(new ApiResponse(200, orders, 'User orders retrieved successfully.'));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id, req.user._id, req.user.role);
  res.status(200).json(new ApiResponse(200, order, 'Order details retrieved.'));
});

export const trackOrder = asyncHandler(async (req, res) => {
  const orderNumber = req.body?.orderNumber || req.query?.orderNumber || req.params?.id;
  const phone = req.body?.phone || req.query?.phone;

  if (!orderNumber || !orderNumber.trim()) {
    throw new ApiError(400, 'Please enter a valid Order Number (e.g. ORD-2026-XXXXX).');
  }

  const cleanOrder = orderNumber.trim();

  let query = {
    $or: [{ orderNumber: { $regex: new RegExp(`^${cleanOrder}$`, 'i') } }],
  };

  if (cleanOrder.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: cleanOrder });
  }

  const order = await Order.findOne(query).populate('user', 'name email phone');

  if (!order) {
    throw new ApiError(404, `Order "${cleanOrder}" not found. Please double-check your Order ID.`);
  }

  if (phone && phone.trim()) {
    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    const orderPhone = (order.shippingAddress?.phone || order.user?.phone || '').replace(/\D/g, '').slice(-10);

    if (cleanPhone && orderPhone && !orderPhone.includes(cleanPhone)) {
      throw new ApiError(403, 'Phone number does not match the delivery contact for this order.');
    }
  }

  res.status(200).json(new ApiResponse(200, order, 'Order tracking status retrieved.'));
});

// Backward compatibility alias for step 1
export const createOrder = checkout;

export default {
  checkout,
  getMyOrders,
  getOrderById,
  trackOrder,
  createOrder,
};

