/**
 * @file index.js
 * @description Notification Module Barrel Export
 */

export { emailService } from './services/EmailService.js';
export { orderEventEmitter, ORDER_EVENTS } from './events/OrderEventEmitter.js';
export { renderOrderConfirmedEmail } from './templates/orderConfirmed.template.js';
export { renderOrderShippedEmail } from './templates/orderShipped.template.js';
export { renderOrderCancelledEmail } from './templates/orderCancelled.template.js';
