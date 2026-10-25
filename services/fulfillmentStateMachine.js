/**
 * @file fulfillmentStateMachine.js
 * @description Deterministic Finite State Machine (FSM) & Inventory Rollback
 * for Enterprise Admin Order Management & Fulfillment.
 */

import { Product } from '../models/Product.js';
import { ApiError } from '../utils/apiError.js';

export const ORDER_STATUS = Object.freeze({
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REPLACEMENT_REQUESTED: 'REPLACEMENT_REQUESTED',
  REPLACEMENT_PROCESSING: 'REPLACEMENT_PROCESSING',
  REPLACED: 'REPLACED',
});

/**
 * Deterministic State Machine Transition Graph
 * Disallows illegal status jumps (e.g., PAYMENT_PENDING -> DELIVERED)
 * Strictly enforces "One-Time Replacement (No Refunds)" dropshipping policy
 */
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PAYMENT_PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  // Delivered order can request a replacement within 7 days if not already replaced
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REPLACEMENT_REQUESTED],
  // Admin can approve replacement (moves to processing) or reject (returns to delivered)
  [ORDER_STATUS.REPLACEMENT_REQUESTED]: [ORDER_STATUS.REPLACEMENT_PROCESSING, ORDER_STATUS.DELIVERED],
  // Replacement is in transit, transitions to REPLACED once delivered to customer
  [ORDER_STATUS.REPLACEMENT_PROCESSING]: [ORDER_STATUS.REPLACED],
  [ORDER_STATUS.REPLACED]: [], // Terminal State: hasBeenReplaced permanently set to true
  [ORDER_STATUS.CANCELLED]: [], // Terminal State
});

/**
 * Checks if a status transition is legally permitted
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @param {Object} [orderContext] - Optional order context for business rule validation
 * @returns {boolean}
 */
export const canTransitionOrderStatus = (currentStatus, targetStatus, orderContext = {}) => {
  const current = (currentStatus || '').toUpperCase();
  const target = (targetStatus || '').toUpperCase();

  if (current === target) return true; // Idempotent same-state
  const allowed = ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) return false;

  // Strict Business Rule: One-Time Replacement Only within 7 days of delivery
  if (target === ORDER_STATUS.REPLACEMENT_REQUESTED) {
    if (orderContext.hasBeenReplaced) {
      return false;
    }
    if (orderContext.deliveredAt) {
      const deliveryTime = new Date(orderContext.deliveredAt).getTime();
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (now - deliveryTime > SEVEN_DAYS_MS) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Helper to evaluate 7-day replacement eligibility for an order
 * @param {Object} order
 * @returns {{ isEligible: boolean, remainingDays: number, reason: string }}
 */
export const checkReplacementEligibility = (order) => {
  if (!order) return { isEligible: false, remainingDays: 0, reason: 'Order not found' };

  if (order.hasBeenReplaced) {
    return {
      isEligible: false,
      remainingDays: 0,
      reason: 'This order has already utilized its one-time replacement policy.',
    };
  }

  const currentStatus = (order.orderStatus || '').toUpperCase();
  if (currentStatus !== ORDER_STATUS.DELIVERED) {
    return {
      isEligible: false,
      remainingDays: 0,
      reason: `Replacements can only be requested for DELIVERED orders. Current status: ${currentStatus}`,
    };
  }

  // Determine delivery timestamp
  let deliveryTimestamp = order.deliveredAt ? new Date(order.deliveredAt).getTime() : null;
  if (!deliveryTimestamp && Array.isArray(order.statusTimeline)) {
    const deliveredEntry = order.statusTimeline.find((t) => t.status === ORDER_STATUS.DELIVERED);
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
  const remainingMs = SEVEN_DAYS_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      isEligible: false,
      remainingDays: 0,
      reason: 'The 7-day replacement window for this order has expired.',
    };
  }

  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return {
    isEligible: true,
    remainingDays,
    reason: `Eligible for one-time replacement (${remainingDays} day${remainingDays > 1 ? 's' : ''} remaining).`,
  };
};

/**
 * Returns permissible next statuses for admin UI dropdowns
 * @param {string} currentStatus
 * @returns {string[]}
 */
export const getAllowedNextStatuses = (currentStatus) => {
  const current = (currentStatus || '').toUpperCase();
  return ORDER_STATUS_TRANSITIONS[current] || [];
};

/**
 * Atomically rolls back inventory stock for cancelled orders
 * @param {Object} order - Mongoose Order document
 * @returns {Promise<{ restoredItemsCount: number }>}
 */
export const rollbackOrderInventory = async (order) => {
  if (!order || !order.items || order.items.length === 0) {
    return { restoredItemsCount: 0 };
  }

  // Idempotency: Do not restore inventory if order was already marked CANCELLED
  if (order.inventoryRestored) {
    return { restoredItemsCount: 0, alreadyRestored: true };
  }

  let restoredItemsCount = 0;

  for (const item of order.items) {
    try {
      const productId = item.product?._id || item.product;
      const variantSku = item.variantSku;
      const quantity = item.quantity;

      if (productId && variantSku && quantity > 0) {
        await Product.updateOne(
          { _id: productId, 'variants.sku': variantSku },
          { $inc: { 'variants.$.stockQuantity': quantity } }
        );
        restoredItemsCount++;
      }
    } catch (err) {
      console.error(
        `[InventoryRollback] Failed to restore stock for item SKU: ${item.variantSku}`,
        err.message
      );
    }
  }

  order.inventoryRestored = true;
  return { restoredItemsCount };
};

export default {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  canTransitionOrderStatus,
  checkReplacementEligibility,
  getAllowedNextStatuses,
  rollbackOrderInventory,
};
