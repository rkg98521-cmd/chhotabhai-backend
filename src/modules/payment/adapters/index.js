/**
 * @file adapters/index.js
 * @description Central registry of available Payment Gateway Adapters.
 */

import { RazorpayAdapter } from './RazorpayAdapter.js';
import { StripeAdapter } from './StripeAdapter.js';

export { RazorpayAdapter, StripeAdapter };

export default {
  RazorpayAdapter,
  StripeAdapter,
};
