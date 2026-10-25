/**
 * @file OrderEventEmitter.js
 * @description Asynchronous Event-Driven notification orchestrator.
 * Listens for order lifecycle events without blocking the main Express API event loop.
 */

import { EventEmitter } from 'events';
import emailService from '../services/EmailService.js';
import { renderOrderConfirmedEmail } from '../templates/orderConfirmed.template.js';
import { renderOrderShippedEmail } from '../templates/orderShipped.template.js';
import { renderOrderCancelledEmail } from '../templates/orderCancelled.template.js';

export const ORDER_EVENTS = Object.freeze({
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
});

class OrderEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow up to 20 concurrent listeners without warnings
    this.setMaxListeners(20);
    this.registerEventHandlers();
  }

  /**
   * Registers lifecycle event listeners with asynchronous non-blocking dispatch.
   */
  registerEventHandlers() {
    // -------------------------------------------------------------
    // EVENT 1: ORDER_CONFIRMED
    // -------------------------------------------------------------
    this.on(ORDER_EVENTS.ORDER_CONFIRMED, (payload) => {
      // Defer execution onto subsequent event-loop tick so the caller gets HTTP response immediately
      setImmediate(async () => {
        try {
          const { order, customerEmail, customerName } = payload;
          if (!order) {
            console.error('⚠️  [OrderEventEmitter] ORDER_CONFIRMED payload missing order data.');
            return;
          }

          const recipientEmail =
            customerEmail ||
            order.user?.email ||
            order.shippingAddress?.email;

          if (!recipientEmail) {
            console.warn(
              `⚠️  [OrderEventEmitter] Skipping ORDER_CONFIRMED email: No email found for order ${order.orderNumber || order._id}`
            );
            return;
          }

          const recipientName =
            customerName ||
            order.user?.name ||
            order.shippingAddress?.fullName ||
            'Valued Customer';

          const grandTotal =
            order.pricingSummary?.grandTotal ||
            order.totalPrice ||
            order.items?.reduce((acc, i) => acc + (i.totalPrice || i.unitPrice * i.quantity), 0) ||
            0;

          const html = renderOrderConfirmedEmail({
            customerName: recipientName,
            orderNumber: order.orderNumber || String(order._id),
            items: order.items || [],
            grandTotal,
            orderDate: order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : undefined,
            shippingAddress: order.shippingAddress || {},
          });

          await emailService.sendEmail({
            to: recipientEmail,
            subject: `Order Confirmed! #${order.orderNumber || order._id} - ChhotaBhai`,
            html,
          });
        } catch (error) {
          console.error('❌ [OrderEventEmitter] Failed to handle ORDER_CONFIRMED:', error.message);
        }
      });
    });

    // -------------------------------------------------------------
    // EVENT 2: ORDER_SHIPPED
    // -------------------------------------------------------------
    this.on(ORDER_EVENTS.ORDER_SHIPPED, (payload) => {
      setImmediate(async () => {
        try {
          const { order, customerEmail, customerName, trackingDetails } = payload;
          if (!order) {
            console.error('⚠️  [OrderEventEmitter] ORDER_SHIPPED payload missing order data.');
            return;
          }

          const recipientEmail =
            customerEmail ||
            order.user?.email ||
            order.shippingAddress?.email;

          if (!recipientEmail) {
            console.warn(
              `⚠️  [OrderEventEmitter] Skipping ORDER_SHIPPED email: No email found for order ${order.orderNumber || order._id}`
            );
            return;
          }

          const recipientName =
            customerName ||
            order.user?.name ||
            order.shippingAddress?.fullName ||
            'Valued Customer';

          const courierCompany =
            trackingDetails?.courierCompany ||
            order.trackingDetails?.courierCompany ||
            'BlueDart Express';

          const trackingNumber =
            trackingDetails?.trackingNumber ||
            order.trackingDetails?.trackingNumber ||
            '';

          const trackingUrl =
            trackingDetails?.trackingUrl ||
            order.trackingDetails?.trackingUrl ||
            (trackingNumber
              ? `https://shipway.com/track/${encodeURIComponent(trackingNumber)}`
              : '');

          const grandTotal =
            order.pricingSummary?.grandTotal || order.totalPrice || 0;

          const html = renderOrderShippedEmail({
            customerName: recipientName,
            orderNumber: order.orderNumber || String(order._id),
            courierCompany,
            trackingNumber,
            trackingUrl,
            items: order.items || [],
            grandTotal,
          });

          await emailService.sendEmail({
            to: recipientEmail,
            subject: `Your order #${order.orderNumber || order._id} is on the way! 🚀`,
            html,
          });
        } catch (error) {
          console.error('❌ [OrderEventEmitter] Failed to handle ORDER_SHIPPED:', error.message);
        }
      });
    });

    // -------------------------------------------------------------
    // EVENT 3: ORDER_CANCELLED
    // -------------------------------------------------------------
    this.on(ORDER_EVENTS.ORDER_CANCELLED, (payload) => {
      setImmediate(async () => {
        try {
          const { order, customerEmail, customerName, reason, refundAmount } = payload;
          if (!order) {
            console.error('⚠️  [OrderEventEmitter] ORDER_CANCELLED payload missing order data.');
            return;
          }

          const recipientEmail =
            customerEmail ||
            order.user?.email ||
            order.shippingAddress?.email;

          if (!recipientEmail) {
            console.warn(
              `⚠️  [OrderEventEmitter] Skipping ORDER_CANCELLED email: No email found for order ${order.orderNumber || order._id}`
            );
            return;
          }

          const recipientName =
            customerName ||
            order.user?.name ||
            order.shippingAddress?.fullName ||
            'Valued Customer';

          const grandTotal =
            order.pricingSummary?.grandTotal || order.totalPrice || 0;

          const html = renderOrderCancelledEmail({
            customerName: recipientName,
            orderNumber: order.orderNumber || String(order._id),
            grandTotal,
            refundAmount: refundAmount || grandTotal,
            reason: reason || order.cancellationReason || 'Cancelled upon request',
            items: order.items || [],
          });

          await emailService.sendEmail({
            to: recipientEmail,
            subject: `Order #${order.orderNumber || order._id} Cancelled - Refund Initiated`,
            html,
          });
        } catch (error) {
          console.error('❌ [OrderEventEmitter] Failed to handle ORDER_CANCELLED:', error.message);
        }
      });
    });

    // Global error listener to prevent process termination
    this.on('error', (err) => {
      console.error('❌ [OrderEventEmitter] Unhandled EventEmitter error:', err);
    });
  }
}

// Export singleton instance
export const orderEventEmitter = new OrderEventEmitter();
export default orderEventEmitter;
