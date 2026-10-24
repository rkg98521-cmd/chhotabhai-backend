import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/apiError.js';

export class CartService {
  /**
   * Pure pricing engine calculating verified server totals from raw items list and coupon
   */
  static async calculateCartPricing(items = [], couponCode = null) {
    let subtotal = 0;
    let totalMrp = 0;
    const validatedItems = [];

    for (const item of items) {
      // Find product containing the requested SKU
      let product = null;
      if (item.product?._id || item.product) {
        product = await Product.findById(item.product._id || item.product);
      } else if (item.variantSku) {
        product = await Product.findOne({ 'variants.sku': item.variantSku });
      }

      if (!product || !product.isActive) {
        continue;
      }

      // Locate specific variant by SKU
      const variant = product.variants.find((v) => v.sku === item.variantSku) ||
        product.variants[product.defaultVariantIndex] ||
        product.variants[0];

      if (!variant) {
        continue;
      }

      const requestedQty = Number(item.quantity) || 1;
      const isOutOfStock = variant.stockQuantity <= 0;
      const isInsufficientStock = variant.stockQuantity < requestedQty;
      const safeQuantity = Math.max(0, Math.min(requestedQty, variant.stockQuantity));

      const sellingPrice = variant.sellingPrice;
      const mrp = variant.mrp;
      const itemSubtotal = sellingPrice * safeQuantity;
      const itemMrpTotal = mrp * safeQuantity;

      subtotal += itemSubtotal;
      totalMrp += itemMrpTotal;

      validatedItems.push({
        product: {
          _id: product._id,
          title: product.title,
          slug: product.slug,
          brand: product.brand,
          category: product.category,
        },
        variantSku: variant.sku,
        colorName: variant.colorName,
        colorCode: variant.colorCode,
        image: variant.images?.[0] || product.thumbnail,
        unitPrice: sellingPrice,
        unitOriginalPrice: mrp,
        quantity: requestedQty,
        safeQuantity,
        totalItemPrice: itemSubtotal,
        isAvailable: variant.isAvailable && !isOutOfStock,
        isInsufficientStock,
        stockQuantity: variant.stockQuantity,
        selectedDevice: item.selectedDevice || null,
      });
    }

    const savings = Math.max(0, totalMrp - subtotal);

    // Free shipping if subtotal > 499, else flat ₹50
    const shippingFee = subtotal > 0 && subtotal > 499 ? 0 : subtotal > 0 ? 50 : 0;

    // Coupon validation & discount computation
    let couponDiscount = 0;
    let appliedCouponInfo = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true,
      });

      if (coupon) {
        const eligibility = coupon.isValidForOrder(subtotal);
        if (eligibility.valid) {
          couponDiscount = coupon.calculateDiscount(subtotal);
          appliedCouponInfo = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: couponDiscount,
          };
        }
      }
    }

    // 18% GST component (inclusive breakdown for enterprise compliance)
    const taxableAmount = Math.max(0, subtotal - couponDiscount);
    const taxAmount = Math.round((taxableAmount * 18) / 118);

    const grandTotal = Math.max(0, subtotal - couponDiscount + shippingFee);

    return {
      items: validatedItems,
      pricing: {
        subtotal,
        totalMrp,
        savings,
        couponDiscount,
        shippingFee,
        taxAmount,
        grandTotal,
      },
      appliedCoupon: appliedCouponInfo,
      totalItems: validatedItems.reduce((acc, it) => acc + it.safeQuantity, 0),
    };
  }

  /**
   * Synchronize & recalculate persistent User Cart
   */
  static async getCart(userId) {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const calculated = await this.calculateCartPricing(cart.items, cart.appliedCoupon?.code);

    // Clean up persistent items that no longer exist or were removed
    cart.items = calculated.items
      .filter((it) => it.safeQuantity > 0)
      .map((it) => ({
        product: it.product._id,
        variantSku: it.variantSku,
        quantity: it.safeQuantity,
        priceAtAddition: it.unitPrice,
        selectedDevice: it.selectedDevice || null,
      }));

    if (calculated.appliedCoupon) {
      cart.appliedCoupon = {
        code: calculated.appliedCoupon.code,
        discountAmount: calculated.appliedCoupon.discountAmount,
      };
    } else if (cart.appliedCoupon?.code) {
      // Coupon was invalid or subtotal dropped below min threshold
      cart.appliedCoupon = { code: null, discountAmount: 0 };
    }

    cart.shippingFee = calculated.pricing.shippingFee;
    await cart.save();

    return {
      _id: cart._id,
      user: cart.user,
      items: calculated.items,
      pricingSummary: calculated.pricing,
      appliedCoupon: calculated.appliedCoupon,
      totalItems: calculated.totalItems,
      // Backward compatibility view helpers for UI
      totalDiscountedPrice: calculated.pricing.subtotal,
      totalOriginalPrice: calculated.pricing.totalMrp,
      totalSavings: calculated.pricing.savings,
      finalPayableAmount: calculated.pricing.grandTotal,
      shippingFee: calculated.pricing.shippingFee,
    };
  }

  /**
   * Add Item to Cart by SKU or Product ID
   */
  static async addItem(userId, sku, quantity = 1, productId = null, selectedDevice = null) {
    let product;
    let targetVariant;

    if (sku) {
      product = await Product.findOne({ 'variants.sku': sku });
      if (product) {
        targetVariant = product.variants.find((v) => v.sku === sku);
      }
    }

    if (!product && productId) {
      product = await Product.findById(productId);
      if (product) {
        targetVariant = sku
          ? product.variants.find((v) => v.sku === sku)
          : product.variants[product.defaultVariantIndex] || product.variants[0];
      }
    }

    if (!product || !targetVariant || !product.isActive) {
      throw new ApiError(404, 'Product variant not found or inactive');
    }

    if (!targetVariant.isAvailable || targetVariant.stockQuantity <= 0) {
      throw new ApiError(400, `Variant ${targetVariant.sku} is currently out of stock`);
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.variantSku === targetVariant.sku &&
        (item.selectedDevice || null) === (selectedDevice || null)
    );

    const safeQty = Math.max(1, Number(quantity) || 1);

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + safeQty;
      if (newQty > targetVariant.stockQuantity) {
        throw new ApiError(
          400,
          `Cannot add more. Reached max available stock of ${targetVariant.stockQuantity}`
        );
      }
      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].priceAtAddition = targetVariant.sellingPrice;
    } else {
      if (safeQty > targetVariant.stockQuantity) {
        throw new ApiError(
          400,
          `Cannot add ${safeQty} items. Only ${targetVariant.stockQuantity} in stock`
        );
      }
      cart.items.push({
        product: product._id,
        variantSku: targetVariant.sku,
        quantity: safeQty,
        priceAtAddition: targetVariant.sellingPrice,
        selectedDevice: selectedDevice || null,
      });
    }

    await cart.save();
    return await this.getCart(userId);
  }

  /**
   * Update quantity of item in cart
   */
  static async updateItem(userId, sku, quantity) {
    const qty = Number(quantity);
    if (qty <= 0) {
      return await this.removeItem(userId, sku);
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    const itemIndex = cart.items.findIndex((it) => it.variantSku === sku || it._id.toString() === sku);
    if (itemIndex === -1) {
      throw new ApiError(404, 'Item not found in cart');
    }

    const item = cart.items[itemIndex];
    const product = await Product.findById(item.product);
    if (!product) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return await this.getCart(userId);
    }

    const variant = product.variants.find((v) => v.sku === item.variantSku) || product.variants[0];
    if (qty > variant.stockQuantity) {
      throw new ApiError(400, `Requested quantity exceeds available stock (${variant.stockQuantity})`);
    }

    cart.items[itemIndex].quantity = qty;
    await cart.save();

    return await this.getCart(userId);
  }

  /**
   * Remove item from cart by SKU or item ID
   */
  static async removeItem(userId, sku) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.items = cart.items.filter(
      (it) => it.variantSku !== sku && it._id.toString() !== sku
    );
    await cart.save();

    return await this.getCart(userId);
  }

  /**
   * Apply coupon code to cart
   */
  static async applyCoupon(userId, couponCode) {
    if (!couponCode) {
      throw new ApiError(400, 'Coupon code is required');
    }

    const coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw new ApiError(400, 'Invalid or expired promo code');
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty. Add items before applying coupon');
    }

    // Verify subtotal against coupon min order value
    const preCalculation = await this.calculateCartPricing(cart.items, null);
    const eligibility = coupon.isValidForOrder(preCalculation.pricing.subtotal);
    if (!eligibility.valid) {
      throw new ApiError(400, eligibility.message);
    }

    cart.appliedCoupon = {
      code: coupon.code,
      discountAmount: 0,
    };

    await cart.save();
    return await this.getCart(userId);
  }

  /**
   * Remove applied coupon
   */
  static async removeCoupon(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.appliedCoupon = { code: null, discountAmount: 0 };
    await cart.save();

    return await this.getCart(userId);
  }

  // Backward compatibility alias for step 1
  static async recalculateCart(userId) {
    return await this.getCart(userId);
  }
}

export default CartService;
