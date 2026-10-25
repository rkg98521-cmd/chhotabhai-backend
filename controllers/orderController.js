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

export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  // Security check: Customer can only cancel their own order; Admins can cancel any
  const isOwner = order.user && order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Unauthorized. You can only cancel your own orders.');
  }

  // Restrict cancellation: Customer can ONLY cancel if status is CONFIRMED or PAYMENT_PENDING
  const normalizedStatus = (order.orderStatus || '').toUpperCase();
  const cancellableStatuses = ['CONFIRMED', 'PAYMENT_PENDING', 'PENDING'];
  if (!cancellableStatuses.includes(normalizedStatus)) {
    throw new ApiError(
      400,
      `Cannot cancel order #${order.orderNumber || order._id}. Order status is currently "${order.orderStatus}". Orders can only be cancelled while in CONFIRMED or PAYMENT_PENDING status.`
    );
  }

  // 1. Rollback stock atomically
  const { rollbackOrderInventory } = await import('../services/fulfillmentStateMachine.js');
  const rollbackResult = await rollbackOrderInventory(order);

  // 2. Transition state and record timeline
  const cancellationReason = reason || 'Cancelled by customer via My Orders';
  order.orderStatus = 'CANCELLED';
  order.statusTimeline.push({
    status: 'CANCELLED',
    timestamp: new Date(),
    comment: `Order cancelled by ${req.user.name || 'Customer'}. Restored stock for ${rollbackResult.restoredItemsCount} item(s). Reason: ${cancellationReason}`,
  });

  // 3. Mark payment as REFUNDED if already captured
  if (order.paymentInfo && order.paymentInfo.status === 'PAID') {
    order.paymentInfo.status = 'REFUNDED';
  }

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate('user', 'name email phone')
    .lean();

  // 4. Trigger asynchronous email notification (non-blocking)
  try {
    const { orderEventEmitter, ORDER_EVENTS } = await import('../src/modules/notification/index.js');
    orderEventEmitter.emit(ORDER_EVENTS.ORDER_CANCELLED, {
      order: updatedOrder,
      customerEmail: req.user.email || updatedOrder.shippingAddress?.email,
      customerName: req.user.name || updatedOrder.shippingAddress?.fullName,
      reason: cancellationReason,
      refundAmount: updatedOrder.pricingSummary?.grandTotal || updatedOrder.totalPrice || 0,
    });
  } catch (emailErr) {
    console.error('⚠️ [orderController] Failed to dispatch ORDER_CANCELLED email event:', emailErr.message);
  }

  res.status(200).json(
    new ApiResponse(200, updatedOrder, 'Order cancelled successfully. Any payment made will be refunded within 3-5 business days.')
  );
});

export const requestReplacement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, note } = req.body || {};

  if (!reason || !reason.trim()) {
    throw new ApiError(400, 'Replacement reason is required (e.g. Defective, Damaged in transit, Wrong item).');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  // Security check: Customer can only request replacement for their own order; Admins can act on behalf
  const isOwner = order.user && order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Unauthorized. You can only request a replacement for your own orders.');
  }

  // Strict Business Rule 1: One-Time Replacement Only (NO Returns or Refunds for delivered items)
  if (order.hasBeenReplaced) {
    throw new ApiError(
      400,
      `Order #${order.orderNumber || order._id} has already utilized its one-time replacement policy. As per our strict dropshipping policy, no additional replacements, returns, or refunds are permitted.`
    );
  }

  // Strict Business Rule 2: Order status must be DELIVERED
  const currentStatus = (order.orderStatus || '').toUpperCase();
  if (currentStatus !== 'DELIVERED') {
    throw new ApiError(
      400,
      `Replacements can only be requested for DELIVERED orders. Current order status is "${order.orderStatus}".`
    );
  }

  // Strict Business Rule 3: 7-Day Replacement Window from delivery
  let deliveryTimestamp = order.deliveredAt ? new Date(order.deliveredAt).getTime() : null;
  if (!deliveryTimestamp && Array.isArray(order.statusTimeline)) {
    const deliveredEntry = order.statusTimeline.find((t) => t.status === 'DELIVERED');
    if (deliveredEntry?.timestamp) {
      deliveryTimestamp = new Date(deliveredEntry.timestamp).getTime();
    }
  }
  if (!deliveryTimestamp && order.updatedAt) {
    deliveryTimestamp = new Date(order.updatedAt).getTime();
  }
  if (!deliveryTimestamp) {
    deliveryTimestamp = Date.now();
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - deliveryTimestamp;

  if (elapsedMs > SEVEN_DAYS_MS) {
    throw new ApiError(
      400,
      'The 7-day replacement window for this order has expired. As per our dropshipping policy, replacement requests are strictly accepted within 7 calendar days of delivery.'
    );
  }

  // Update order state to REPLACEMENT_REQUESTED
  const cleanReason = reason.trim();
  const cleanNote = (note || '').trim();

  order.orderStatus = 'REPLACEMENT_REQUESTED';
  order.replacementDetails = {
    hasRequested: true,
    requestedAt: new Date(),
    reason: cleanReason,
    customerNote: cleanNote,
    adminComment: '',
    approvedAt: null,
    replacedAt: null,
    courierCompany: '',
    trackingNumber: '',
    trackingUrl: '',
  };

  order.statusTimeline.push({
    status: 'REPLACEMENT_REQUESTED',
    timestamp: new Date(),
    comment: `Customer requested one-time replacement (No Refund policy). Reason: ${cleanReason}${cleanNote ? ` | Note: ${cleanNote}` : ''}`,
  });

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate('user', 'name email phone')
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      updatedOrder,
      'One-time replacement request submitted successfully. Our operations team will verify the request and dispatch a replacement package (No refund policy applicable).'
    )
  );
});

// Backward compatibility alias for step 1
export const createOrder = checkout;

export default {
  checkout,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  requestReplacement,
  createOrder,
};

