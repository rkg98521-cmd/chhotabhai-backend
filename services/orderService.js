import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/apiError.js';

export class OrderService {
  static async createOrderFromCart(userId, shippingAddress, paymentMethod = 'PREPAID_ONLINE') {
    const rawMethod = (paymentMethod || '').trim().toUpperCase();

    if (rawMethod === 'COD' || rawMethod === 'CASH_ON_DELIVERY') {
      throw new ApiError(
        400,
        'Cash on Delivery (COD) is strictly disabled. ChhotaBhai is a 100% Prepaid platform (UPI / Cards / NetBanking).'
      );
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cannot place order. Your shopping cart is empty.');
    }

    // Verify inventory for all items & resolve specific variants
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product?._id || item.product);
      if (!product || !product.isActive) {
        throw new ApiError(404, `Product '${item.product?.title || 'item'}' is no longer available.`);
      }

      const variant =
        product.variants.find((v) => v.sku === item.variantSku) ||
        product.variants[product.defaultVariantIndex] ||
        product.variants[0];

      if (!variant || !variant.isAvailable) {
        throw new ApiError(400, `Selected variant for '${product.title}' is currently unavailable.`);
      }

      if (variant.stockQuantity < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for '${product.title}' (${variant.colorName}). In stock: ${variant.stockQuantity}, Requested: ${item.quantity}`
        );
      }

      const unitPrice = variant.sellingPrice;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        product: product._id,
        title: product.title,
        variantSku: variant.sku,
        colorName: variant.colorName,
        image: variant.images[0] || product.thumbnail,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        selectedDevice: item.selectedDevice || null,
      });
    }

    // Atomically decrement stock quantity for each specific variant
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, 'variants.sku': item.variantSku },
        { $inc: { 'variants.$.stockQuantity': -item.quantity } }
      );
    }

    // Shipping Fee calculation (Free shipping above ₹499)
    const shippingFee = subtotal >= 499 ? 0 : 49;

    // Coupon discount verification & calculation
    let discountAmount = 0;
    let couponApplied = { code: null, discount: 0 };

    if (cart.appliedCoupon?.code) {
      const coupon = await Coupon.findOne({
        code: cart.appliedCoupon.code.toUpperCase(),
        isActive: true,
      });

      if (coupon && coupon.isValidForOrder(subtotal).valid) {
        discountAmount = coupon.calculateDiscount(subtotal);
        couponApplied = {
          code: coupon.code,
          discount: discountAmount,
        };
        // Increment usage count on coupon
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    // Strictly enforce prepaid enum values
    const allowedPrepaid = ['PREPAID_ONLINE', 'RAZORPAY', 'UPI'];
    const normalizedMethod = allowedPrepaid.includes(rawMethod) ? rawMethod : 'PREPAID_ONLINE';

    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        landmark: shippingAddress.landmark || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode || shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
      },
      pricingSummary: {
        subtotal,
        discountAmount,
        shippingFee,
        taxAmount: 0,
        grandTotal,
      },
      couponApplied,
      paymentInfo: {
        method: normalizedMethod,
        status: 'PENDING',
        paidAt: null,
        transactionId: null,
      },
      orderStatus: 'PAYMENT_PENDING',
      statusTimeline: [
        {
          status: 'PAYMENT_PENDING',
          timestamp: new Date(),
          comment: 'Prepaid order session initiated, awaiting Razorpay confirmation',
        },
      ],
    });

    // Clear cart after order creation
    cart.items = [];
    cart.appliedCoupon = { code: null, discountAmount: 0 };
    await cart.save();

    return order;
  }

  static async createPrepaidSandboxOrder(userId, { shippingAddress, items, couponCode, paymentMethod }) {
    const rawMethod = (paymentMethod || '').trim().toUpperCase();
    if (rawMethod === 'COD' || rawMethod === 'CASH_ON_DELIVERY') {
      throw new ApiError(
        400,
        'Cash on Delivery (COD) is strictly disabled. ChhotaBhai is a 100% Prepaid platform (UPI / Cards / NetBanking).'
      );
    }

    if (!shippingAddress) {
      throw new ApiError(400, 'Shipping address details are required for checkout.');
    }

    let sourceItems = items;
    let cart = null;

    if (!sourceItems || sourceItems.length === 0) {
      cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (cart && cart.items.length > 0) {
        sourceItems = cart.items;
      }
    }

    if (!sourceItems || sourceItems.length === 0) {
      throw new ApiError(400, 'Cannot place order. Your shopping cart is empty.');
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of sourceItems) {
      const prodId = item.product?._id || item.product || item.productId || item._id;
      const product = await Product.findById(prodId);
      if (!product || !product.isActive) {
        throw new ApiError(404, `Product '${item.title || 'item'}' is no longer available.`);
      }

      const reqSku = item.variantSku || item.sku || item.variant?.sku;
      const variant =
        product.variants.find((v) => v.sku === reqSku) ||
        product.variants[product.defaultVariantIndex] ||
        product.variants[0];

      if (!variant || !variant.isAvailable) {
        throw new ApiError(400, `Selected variant for '${product.title}' is currently unavailable.`);
      }

      const requestedQty = Number(item.quantity) || 1;
      if (variant.stockQuantity < requestedQty) {
        throw new ApiError(
          400,
          `Insufficient stock for '${product.title}' (${variant.colorName}). In stock: ${variant.stockQuantity}, Requested: ${requestedQty}`
        );
      }

      const unitPrice = variant.sellingPrice;
      const totalPrice = unitPrice * requestedQty;
      subtotal += totalPrice;

      orderItems.push({
        product: product._id,
        title: product.title,
        variantSku: variant.sku,
        colorName: variant.colorName,
        image: variant.images?.[0] || product.thumbnail,
        quantity: requestedQty,
        unitPrice,
        totalPrice,
      });
    }

    // Decrement stock for each variant atomically
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, 'variants.sku': item.variantSku },
        { $inc: { 'variants.$.stockQuantity': -item.quantity } }
      );
    }

    // Shipping fee (Free shipping above ₹499)
    const shippingFee = subtotal >= 499 ? 0 : 49;

    // Coupon discount verification
    let discountAmount = 0;
    let couponApplied = { code: null, discount: 0 };
    const targetCode = couponCode || cart?.appliedCoupon?.code;

    if (targetCode) {
      const coupon = await Coupon.findOne({
        code: targetCode.trim().toUpperCase(),
        isActive: true,
      });

      if (coupon && coupon.isValidForOrder(subtotal).valid) {
        discountAmount = coupon.calculateDiscount(subtotal);
        couponApplied = {
          code: coupon.code,
          discount: discountAmount,
        };
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);
    const orderNumber = `CB-${Date.now().toString().slice(-6)}`;

    const order = await Order.create({
      orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        landmark: shippingAddress.landmark || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode || shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
      },
      pricingSummary: {
        subtotal,
        discountAmount,
        shippingFee,
        taxAmount: 0,
        grandTotal,
      },
      couponApplied,
      paymentInfo: {
        method: 'PREPAID_ONLINE',
        status: 'PAID',
        transactionId: `TXN_SIM_${Date.now()}`,
        paidAt: new Date(),
      },
      orderStatus: 'CONFIRMED',
      statusTimeline: [
        {
          status: 'CONFIRMED',
          timestamp: new Date(),
          comment: 'Prepaid order authorized and confirmed via sandbox payment simulator',
        },
      ],
    });

    // Clear cart in database
    await Cart.updateOne(
      { user: userId },
      { $set: { items: [], appliedCoupon: { code: null, discountAmount: 0 } } }
    );

    return order;
  }

  static async getOrderById(orderId, userId, userRole) {
    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (userRole !== 'admin' && userRole !== 'manager' && order.user._id.toString() !== userId.toString()) {
      throw new ApiError(403, 'Unauthorized to view this order');
    }

    return order;
  }

  static async getUserOrders(userId) {
    return await Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  static async updateOrderStatus(orderId, status, comment = '') {
    const upperStatus = status.toUpperCase();
    const validStatuses = [
      'PAYMENT_PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(upperStatus)) {
      throw new ApiError(400, `Invalid order status. Allowed: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    order.orderStatus = upperStatus;
    order.statusTimeline.push({
      status: upperStatus,
      timestamp: new Date(),
      comment: comment || `Order status updated to ${upperStatus}`,
    });

    await order.save();
    return order;
  }

}

export default OrderService;
