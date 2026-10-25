/**
 * @file PaymentGateway.interface.js
 * @description Abstract Base Interface for Payment Gateway Adapters.
 * Enforces the Strategy Pattern across heterogeneous gateways (Razorpay, Stripe, Adyen, etc.).
 */

export class PaymentGatewayInterface {
  /**
   * Identifies the gateway adapter instance
   * @returns {string}
   */
  getGatewayName() {
    throw new Error('Method "getGatewayName()" must be implemented.');
  }

  /**
   * Initializes a gateway payment transaction / checkout order
   * @param {Object} params
   * @param {number} params.amountInSubunits (e.g., paise for INR, cents for USD)
   * @param {string} params.currency
   * @param {string} params.receipt
   * @param {Object} params.metadata
   * @returns {Promise<{ gatewayOrderId: string, clientSecret?: string, rawResponse: Object }>}
   */
  async createTransaction(params) {
    throw new Error('Method "createTransaction()" must be implemented.');
  }

  /**
   * Cryptographically verifies incoming raw webhook signatures
   * @param {Object} params
   * @param {Buffer|string} params.rawBody - Raw unparsed request body buffer
   * @param {string} params.signature - Gateway signature header
   * @param {string} params.secret - Gateway webhook signing secret
   * @returns {boolean}
   */
  verifyWebhookSignature(params) {
    throw new Error('Method "verifyWebhookSignature()" must be implemented.');
  }

  /**
   * Fetches real-time status of a transaction directly from the Gateway API
   * @param {string} identifier - Gateway Order ID or Payment ID
   * @returns {Promise<{ status: string, gatewayPaymentId?: string, amount: number, rawResponse: Object }>}
   */
  async fetchTransactionStatus(identifier) {
    throw new Error('Method "fetchTransactionStatus()" must be implemented.');
  }

  /**
   * Captures an authorized payment
   * @param {string} gatewayPaymentId
   * @param {number} amount
   * @param {string} currency
   * @returns {Promise<{ isCaptured: boolean, rawResponse: Object }>}
   */
  async capturePayment(gatewayPaymentId, amount, currency) {
    throw new Error('Method "capturePayment()" must be implemented.');
  }

  /**
   * Initiates a full or partial refund
   * @param {Object} params
   * @param {string} params.gatewayPaymentId
   * @param {number} params.amountInSubunits
   * @param {string} params.reason
   * @returns {Promise<{ gatewayRefundId: string, status: string, rawResponse: Object }>}
   */
  async initiateRefund(params) {
    throw new Error('Method "initiateRefund()" must be implemented.');
  }
}

export default PaymentGatewayInterface;
