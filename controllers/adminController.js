import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { generateTrackingUrl } from '../utils/trackingHelper.js';
import {
  canTransitionOrderStatus,
  getAllowedNextStatuses,
  rollbackOrderInventory,
} from '../services/fulfillmentStateMachine.js';
import { orderEventEmitter, ORDER_EVENTS } from '../src/modules/notification/index.js';


export const getAnalytics = asyncHandler(async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, paidOrders, outOfStockProducts, bestSellers] =
    await Promise.all([
      User.countDocuments({ role: { $in: ['customer', 'user'] } }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.find({ 'paymentInfo.status': 'PAID' }),
      // Products where any variant is out of stock
      Product.find({
        isActive: true,
        'variants.stockQuantity': { $lte: 5 },
      }).select('title variants brand'),
      Product.find({ isActive: true, badge: 'Bestseller' }).limit(5),
    ]);

  const totalRevenue = paidOrders.reduce((acc, order) => {
    return acc + (order.pricingSummary?.grandTotal || order.totalPrice || 0);
  }, 0);

  const outOfStockAlerts = outOfStockProducts.map((p) => ({
    productId: p._id,
    title: p.title,
    brand: p.brand,
    lowVariants: p.variants
      .filter((v) => v.stockQuantity <= 5)
      .map((v) => ({ sku: v.sku, color: v.colorName, stock: v.stockQuantity })),
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalUsers,
        outOfStockAlerts,
        bestSellers,
      },
      'Enterprise analytics retrieved.'
    )
  );
});

// Backward compatibility alias for step 1
export const getDashboardStats = getAnalytics;

export const createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    brand,
    variants,
    supportedDevices,
    specifications,
    badge,
    isFeatured,
    isCrazyDeal,
    isTopDeal,
    dealTag,
  } = req.body;

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    throw new ApiError(400, 'A product must include at least one SKU variant with MRP, sellingPrice, and stock');
  }

  const product = await Product.create({
    title,
    description,
    category,
    brand,
    variants,
    supportedDevices: supportedDevices || [],
    specifications: specifications || {},
    badge: badge || 'None',
    isFeatured: Boolean(isFeatured),
    isCrazyDeal: Boolean(isCrazyDeal),
    isTopDeal: Boolean(isTopDeal),
    dealTag: (dealTag || '').trim(),
  });

  res.status(201).json(new ApiResponse(201, product, 'Product created successfully.'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  res.status(200).json(new ApiResponse(200, product, 'Product updated successfully.'));
});

export const toggleCrazyDeal = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  product.isCrazyDeal = !product.isCrazyDeal;
  await product.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { productId: product._id, isCrazyDeal: product.isCrazyDeal },
      `Product ${product.isCrazyDeal ? 'added to' : 'removed from'} Crazy Deals.`
    )
  );
});

export const toggleTopDeal = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  product.isTopDeal = !product.isTopDeal;
  await product.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { productId: product._id, isTopDeal: product.isTopDeal },
      `Product ${product.isTopDeal ? 'added to' : 'removed from'} Top Deals.`
    )
  );
});

export const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  product.isFeatured = !product.isFeatured;
  await product.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { productId: product._id, isFeatured: product.isFeatured },
      `Product ${product.isFeatured ? 'marked as' : 'unmarked from'} Featured.`
    )
  );
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  // Soft delete / toggle active
  product.isActive = !product.isActive;
  await product.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { productId: product._id, isActive: product.isActive },
      `Product has been ${product.isActive ? 'reactivated' : 'deactivated (soft-deleted)'}.`
    )
  );
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate,
    endDate,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status && status.toUpperCase() !== 'ALL') {
    filter.orderStatus = status.toUpperCase();
  }

  if (paymentStatus && paymentStatus.toUpperCase() !== 'ALL') {
    filter['paymentInfo.status'] = paymentStatus.toUpperCase();
  }

  // Date range filtering
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Advanced search by order number, customer name, phone, or email
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    const searchRegex = new RegExp(cleanSearch, 'i');

    const matchingUsers = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
    }).select('_id');

    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { orderNumber: searchRegex },
      { 'shippingAddress.fullName': searchRegex },
      { 'shippingAddress.phone': searchRegex },
      { 'trackingDetails.trackingNumber': searchRegex },
      { user: { $in: userIds } },
    ];
  }

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  const [orders, totalOrders, statusCounts] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .populate('items.product', 'title thumbnail')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
  ]);

  const countsMap = {
    ALL: await Order.countDocuments(),
    PAYMENT_PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    REPLACEMENT_REQUESTED: 0,
    REPLACEMENT_PROCESSING: 0,
    REPLACED: 0,
  };

  statusCounts.forEach((sc) => {
    if (sc._id && countsMap[sc._id] !== undefined) {
      countsMap[sc._id] = sc.count;
    }
  });

  const totalPages = Math.ceil(totalOrders / limitNum) || 1;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          totalOrders,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        counts: countsMap,
      },
      'Orders retrieved successfully.'
    )
  );
});

export const getAdminOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('items.product', 'title thumbnail brand variants')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  const allowedNextStatuses = getAllowedNextStatuses(order.orderStatus);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        ...order,
        allowedNextStatuses,
      },
      'Order details retrieved successfully.'
    )
  );
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, courierCompany, trackingNumber, trackingUrl, comment } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  const currentStatus = order.orderStatus;
  const targetStatus = status ? status.toUpperCase() : currentStatus;

  // 1. Enforce State Machine validation
  if (status && targetStatus !== currentStatus) {
    const isPermissible = canTransitionOrderStatus(currentStatus, targetStatus, order);
    if (!isPermissible) {
      const allowed = getAllowedNextStatuses(currentStatus);
      throw new ApiError(
        400,
        `Invalid status jump: Cannot transition order from "${currentStatus}" to "${targetStatus}". Permissible next statuses: [${allowed.join(', ') || 'None (Terminal)'}].`
      );
    }

    // 2. Automated Inventory Rollback on CANCELLATION
    if (targetStatus === 'CANCELLED') {
      const rollbackResult = await rollbackOrderInventory(order);
      order.statusTimeline.push({
        status: 'CANCELLED',
        timestamp: new Date(),
        comment: `Order cancelled by Admin (${req.user?.name || 'Staff'}). Restored stock for ${rollbackResult.restoredItemsCount} item(s). ${comment || ''}`.trim(),
      });

      if (order.paymentInfo && order.paymentInfo.status !== 'REFUNDED') {
        order.paymentInfo.status = 'REFUNDED';
      }
    } else if (targetStatus === 'DELIVERED') {
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      order.statusTimeline.push({
        status: 'DELIVERED',
        timestamp: new Date(),
        comment: comment || `Order marked delivered by ${req.user?.name || 'Admin'}. 7-day one-time replacement window initiated.`,
      });
    } else if (targetStatus === 'REPLACEMENT_PROCESSING') {
      const cleanCourier = courierCompany ? courierCompany.trim() : (order.trackingDetails?.courierCompany || 'Delhivery');
      const cleanAwb = trackingNumber ? trackingNumber.trim() : '';
      const genUrl = trackingUrl ? trackingUrl.trim() : (cleanCourier && cleanAwb ? generateTrackingUrl(cleanCourier, cleanAwb) : '');

      order.replacementDetails = {
        ...(order.replacementDetails || {}),
        hasRequested: true,
        approvedAt: new Date(),
        courierCompany: cleanCourier,
        trackingNumber: cleanAwb,
        trackingUrl: genUrl,
        adminComment: comment || 'Replacement approved & new parcel dispatched',
      };

      if (cleanCourier && cleanAwb) {
        order.trackingDetails = {
          courierCompany: cleanCourier,
          trackingNumber: cleanAwb,
          trackingUrl: genUrl,
        };
      }

      order.statusTimeline.push({
        status: 'REPLACEMENT_PROCESSING',
        timestamp: new Date(),
        comment: comment || `Replacement approved. New replacement parcel dispatched via ${cleanCourier}${cleanAwb ? ` (AWB: ${cleanAwb})` : ''} by ${req.user?.name || 'Admin'}`,
      });
    } else if (targetStatus === 'REPLACED') {
      // Strictly enforce One-Time Rule: Permanently lock hasBeenReplaced
      order.hasBeenReplaced = true;
      order.replacementDetails = {
        ...(order.replacementDetails || {}),
        replacedAt: new Date(),
      };
      order.statusTimeline.push({
        status: 'REPLACED',
        timestamp: new Date(),
        comment: comment || `Replacement parcel delivered. One-time replacement finalized by ${req.user?.name || 'Admin'}. Further replacements, returns, or refunds are permanently locked.`,
      });
    } else {
      order.statusTimeline.push({
        status: targetStatus,
        timestamp: new Date(),
        comment: comment || `Status updated from ${currentStatus} to ${targetStatus} by ${req.user?.name || 'Admin'}`,
      });
    }

    order.orderStatus = targetStatus;
  }

  // 3. Update Shipping & Tracking Information
  if (courierCompany || trackingNumber || trackingUrl) {
    if (courierCompany) order.trackingDetails.courierCompany = courierCompany.trim();
    if (trackingNumber) order.trackingDetails.trackingNumber = trackingNumber.trim();
    if (trackingUrl) {
      order.trackingDetails.trackingUrl = trackingUrl.trim();
    } else if (order.trackingDetails.courierCompany && order.trackingDetails.trackingNumber) {
      order.trackingDetails.trackingUrl = generateTrackingUrl(
        order.trackingDetails.courierCompany,
        order.trackingDetails.trackingNumber
      );
    }
  }

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate('user', 'name email phone')
    .populate('items.product', 'title thumbnail')
    .lean();

  const allowedNextStatuses = getAllowedNextStatuses(updatedOrder.orderStatus);

  // Asynchronously trigger lifecycle email events (non-blocking)
  if (targetStatus === 'CANCELLED') {
    orderEventEmitter.emit(ORDER_EVENTS.ORDER_CANCELLED, {
      order: updatedOrder,
      customerEmail: updatedOrder.user?.email || updatedOrder.shippingAddress?.email,
      customerName: updatedOrder.user?.name || updatedOrder.shippingAddress?.fullName,
      reason: comment || 'Cancelled by Store Administration',
      refundAmount: updatedOrder.pricingSummary?.grandTotal || updatedOrder.totalPrice,
    });
  } else if (targetStatus === 'SHIPPED' || targetStatus === 'OUT_FOR_DELIVERY') {
    orderEventEmitter.emit(ORDER_EVENTS.ORDER_SHIPPED, {
      order: updatedOrder,
      customerEmail: updatedOrder.user?.email || updatedOrder.shippingAddress?.email,
      customerName: updatedOrder.user?.name || updatedOrder.shippingAddress?.fullName,
      trackingDetails: updatedOrder.trackingDetails,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { ...updatedOrder, allowedNextStatuses },
      'Order status & tracking updated successfully.'
    )
  );
});

export const fulfillOrder = asyncHandler(async (req, res) => {
  const { courierName, awbNumber, status } = req.body;

  if (!courierName || !courierName.trim()) {
    throw new ApiError(400, 'Courier partner name is required (e.g. Delhivery, Shadowfax, Xpressbees, Ekart, BlueDart, DTDC).');
  }

  if (!awbNumber || !awbNumber.trim()) {
    throw new ApiError(400, 'AWB / Tracking number is required.');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  const cleanCourier = courierName.trim();
  const cleanAwb = awbNumber.trim();
  const generatedUrl = generateTrackingUrl(cleanCourier, cleanAwb);
  const targetStatus = (status || 'SHIPPED').toUpperCase();

  order.trackingDetails = {
    courierCompany: cleanCourier,
    trackingNumber: cleanAwb,
    trackingUrl: generatedUrl,
  };

  order.orderStatus = targetStatus;
  order.statusTimeline.push({
    status: targetStatus,
    timestamp: new Date(),
    comment: `Parcel handed over to ${cleanCourier} (AWB: ${cleanAwb})`,
  });

  await order.save();

  const updatedOrder = await Order.findById(order._id).populate('user', 'name email phone');

  // Trigger non-blocking ORDER_SHIPPED email event
  orderEventEmitter.emit(ORDER_EVENTS.ORDER_SHIPPED, {
    order: updatedOrder,
    customerEmail: updatedOrder.user?.email || updatedOrder.shippingAddress?.email,
    customerName: updatedOrder.user?.name || updatedOrder.shippingAddress?.fullName,
    trackingDetails: updatedOrder.trackingDetails,
  });

  res.status(200).json(new ApiResponse(200, updatedOrder, 'Order fulfilled and live tracking assigned.'));
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(new ApiResponse(201, category, 'Category created successfully.'));
});

export default {
  getAnalytics,
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  fulfillOrder,
  createCategory,
};

