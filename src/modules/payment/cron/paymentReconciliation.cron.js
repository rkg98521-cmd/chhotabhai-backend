/**
 * @file paymentReconciliation.cron.js
 * @description Automated Reconciliation Cron Worker.
 * Scans for transactions stuck in unresolved states >30 mins, queries gateway APIs,
 * and heals database discrepancies automatically.
 */

import cron from 'node-cron';
import { PaymentIntent } from '../models/PaymentIntent.model.js';
import { paymentRouter } from '../services/PaymentRouter.service.js';
import { paymentOrchestrator } from '../services/PaymentOrchestrator.service.js';
import { PAYMENT_STATUS } from '../constants/payment.constants.js';
import { paymentLogger } from '../utils/paymentLogger.js';

/**
 * Executes a single reconciliation pass across all stuck transactions
 */
export const runReconciliationJob = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  paymentLogger.info('RECONCILIATION_CRON_STARTED', {
    cutoffThreshold: thirtyMinutesAgo.toISOString(),
  });

  try {
    // 1. Fetch intents stuck in non-terminal states between 30 mins and 48 hours
    const stuckIntents = await PaymentIntent.find({
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.AUTHORIZED] },
      createdAt: { $lte: thirtyMinutesAgo, $gte: fortyEightHoursAgo },
    })
      .limit(100)
      .lean();

    if (stuckIntents.length === 0) {
      paymentLogger.info('RECONCILIATION_CRON_FINISHED', { reconciledCount: 0, message: 'All transactions clean.' });
      return { total: 0, captured: 0, failed: 0 };
    }

    paymentLogger.info('RECONCILIATION_CANDIDATES_FOUND', { count: stuckIntents.length });

    let capturedCount = 0;
    let failedCount = 0;

    for (const intent of stuckIntents) {
      try {
        const adapter = paymentRouter.getAdapter(intent.gateway);
        
        // 2. Real-time Gateway Audit Query
        const gatewayStatus = await adapter.fetchTransactionStatus(intent.gatewayOrderId);

        if (gatewayStatus.status === PAYMENT_STATUS.CAPTURED) {
          // Reconcile and capture
          await paymentOrchestrator.finalizeCapture({
            gatewayOrderId: intent.gatewayOrderId,
            gatewayPaymentId: gatewayStatus.gatewayPaymentId,
            triggerSource: 'RECONCILIATION_CRON',
          });
          capturedCount++;
          paymentLogger.info('RECONCILIATION_AUTO_CAPTURED', {
            intentId: intent.intentId,
            gatewayOrderId: intent.gatewayOrderId,
          });
        } else if (gatewayStatus.status === PAYMENT_STATUS.FAILED) {
          await paymentOrchestrator.recordFailure({
            gatewayOrderId: intent.gatewayOrderId,
            errorCode: 'RECONCILIATION_DETECTED_FAILURE',
            errorMessage: 'Gateway marked transaction as failed upon audit.',
          });
          failedCount++;
        } else {
          // If transaction is older than 2 hours and still in CREATED/UNPAID on gateway, mark expired
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          if (new Date(intent.createdAt) < twoHoursAgo) {
            await paymentOrchestrator.recordFailure({
              gatewayOrderId: intent.gatewayOrderId,
              errorCode: 'CHECKOUT_SESSION_EXPIRED',
              errorMessage: 'Payment session expired without customer completion (>2 hours).',
            });
            failedCount++;
          }
        }
      } catch (intentErr) {
        paymentLogger.error('RECONCILIATION_INTENT_ERROR', intentErr, {
          intentId: intent.intentId,
          gatewayOrderId: intent.gatewayOrderId,
        });
      }
    }

    const summary = {
      total: stuckIntents.length,
      captured: capturedCount,
      failed: failedCount,
    };

    paymentLogger.info('RECONCILIATION_CRON_SUMMARY', summary);
    return summary;
  } catch (error) {
    paymentLogger.error('RECONCILIATION_CRON_FAILED', error);
    throw error;
  }
};

/**
 * Initializes and starts the background reconciliation cron schedule
 * Schedule: Runs every 15 minutes ('* /15 * * * *')
 */
export const startPaymentReconciliationCron = (cronExpression = '*/15 * * * *') => {
  paymentLogger.info('RECONCILIATION_CRON_INITIALIZED', { schedule: cronExpression });

  const job = cron.schedule(cronExpression, async () => {
    try {
      await runReconciliationJob();
    } catch (err) {
      console.error('[PaymentReconciliationCron] Job execution error:', err.message);
    }
  });

  return job;
};

export default {
  startPaymentReconciliationCron,
  runReconciliationJob,
};
