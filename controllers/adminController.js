import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { generateTrackingUrl } from '../utils/trackingHelper.js';

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
  const { status, date } = req.query;
  const filter = {};

  if (status) {
    filter.orderStatus = status.toUpperCase();
  }

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, orders, 'Orders retrieved successfully.'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, courierCompany, trackingNumber, trackingUrl, comment } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found.');
  }

  if (status) {
    await OrderService.updateOrderStatus(order._id, status, comment);
  }

  if (courierCompany || trackingNumber || trackingUrl) {
    if (courierCompany) order.trackingDetails.courierCompany = courierCompany.trim();
    if (trackingNumber) order.trackingDetails.trackingNumber = trackingNumber.trim();
    if (trackingUrl) {
      order.trackingDetails.trackingUrl = trackingUrl.trim();
    } else if (courierCompany && trackingNumber) {
      order.trackingDetails.trackingUrl = generateTrackingUrl(courierCompany, trackingNumber);
    }
    await order.save();
  }

  const updatedOrder = await Order.findById(order._id).populate('user', 'name email');

  res.status(200).json(new ApiResponse(200, updatedOrder, 'Order status & tracking updated.'));
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

