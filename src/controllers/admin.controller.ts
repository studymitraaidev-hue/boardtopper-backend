import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import supabase from '../config/supabase';
import config from '../config/env';
import logger from '../utils/logger';

/**
 * POST /api/admin/expire-subscriptions
 *
 * Internal cron endpoint — called nightly by Railway cron job.
 * Protected by X-Admin-Secret header (not JWT).
 *
 * Does two things:
 * 1. Sets subscriptions.status = 'expired' where ends_at < NOW() and
 *    status is still 'active' or 'pending'
 * 2. Downgrades users.plan = 'free' for all users whose subscriptions
 *    just expired
 *
 * Safe to call multiple times — idempotent.
 */
export const expireSubscriptions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // ── Auth: internal secret header check ──────────────────────────────────
    const secret = req.headers['x-admin-secret'] ?? '';
    if (secret !== config.ADMIN_SECRET || config.ADMIN_SECRET.length < 32) {
      ApiResponse.error(res, 'Unauthorised', 401);
      return;
    }

    const now = new Date().toISOString();
    logger.info(`[Admin] expire-subscriptions job started at ${now}`);

    // ── Step 1: Expire overdue active subscriptions ──────────────────────────
    const { data: expiredSubs, error: expireError } = await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .in('status', ['active', 'pending'])
      .lt('ends_at', now)
      .select('user_id');

    if (expireError) {
      logger.error(`[Admin] Failed to expire subscriptions: ${expireError.message}`);
      ApiResponse.error(res, 'Failed to expire subscriptions', 500);
      return;
    }

    const affectedUserIds = (expiredSubs ?? []).map(
      (row: { user_id: string }) => row.user_id
    );

    logger.info(`[Admin] Expired ${affectedUserIds.length} subscription(s)`);

    // ── Step 2: Downgrade affected users to free plan ────────────────────────
    let downgradedCount = 0;

    if (affectedUserIds.length > 0) {
      // Only downgrade users who have NO other active subscription
      // (edge case: user bought a new subscription before the old one expired)
      const { data: stillActive } = await supabase
        .from('subscriptions')
        .select('user_id')
        .in('user_id', affectedUserIds)
        .eq('status', 'active')
        .gt('ends_at', now);

      const stillActiveIds = new Set(
        (stillActive ?? []).map((r: { user_id: string }) => r.user_id)
      );

      const toDowngrade = affectedUserIds.filter((id: string) => !stillActiveIds.has(id));

      if (toDowngrade.length > 0) {
        const { error: downgradeError } = await supabase
          .from('users')
          .update({ plan: 'free' })
          .in('id', toDowngrade);

        if (downgradeError) {
          logger.error(`[Admin] Failed to downgrade users: ${downgradeError.message}`);
          // Still return partial success — subscriptions were expired
        } else {
          downgradedCount = toDowngrade.length;
          logger.info(`[Admin] Downgraded ${downgradedCount} user(s) to free plan`);
        }
      }
    }

    ApiResponse.success(res, {
      expiredSubscriptions: affectedUserIds.length,
      downgradedUsers: downgradedCount,
      runAt: now,
    });
  }
);
