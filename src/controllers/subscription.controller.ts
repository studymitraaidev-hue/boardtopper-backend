import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { expireExpiredSubscriptions } from '../data/subscriptions.store';
import logger from '../utils/logger';

/**
 * POST /api/subscriptions/expire-cron
 * Cron endpoint to expire subscriptions past their end date.
 * Should be called daily by a cron job (e.g. Render cron, GitHub Actions, etc.)
 * Protected by a simple cron secret to prevent abuse.
 */
export const runExpireCron = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cronSecret = req.headers['x-cron-secret'];
    const expected = process.env.CRON_SECRET;

    if (expected && cronSecret !== expected) {
      ApiResponse.error(res, 'Unauthorized', 401);
      return;
    }

    try {
      const result = await expireExpiredSubscriptions();
      ApiResponse.success(res, {
        message: `Expired ${result.expiredCount} subscriptions, downgraded ${result.downgradedCount} users`,
        ...result,
      });
    } catch (err) {
      logger.error('[ExpireCron] Failed:', err);
      ApiResponse.error(res, 'Failed to run expiry cron', 500);
    }
  }
);
