import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { getValidSubscription } from '../data/subscriptions.store';
import logger from '../utils/logger';

/**
 * requirePro — server-side guard for Pro-only routes.
 *
 * Must be applied AFTER the `authenticate` middleware so req.user is set.
 *
 * Double-checks against the subscriptions table — not only the JWT claim.
 * This ensures expired or cancelled subscriptions are blocked even if the
 * JWT was issued while the subscription was still active.
 *
 * Returns:
 *   401 — unauthenticated (no req.user)
 *   403 — authenticated but no active Pro subscription
 */
export function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  // Strict gate: must have a valid active subscription in DB
  getValidSubscription(req.user.id)
    .then((sub) => {
      if (!sub) {
        ApiResponse.error(res, 'Your Pro subscription has expired or been cancelled. Renew at boardtopper.ai/pricing.', 403);
        return;
      }
      next();
    })
    .catch((err) => {
      logger.error('[requirePro] DB error checking subscription:', err);
      ApiResponse.error(res, 'Unable to verify subscription. Please try again.', 503);
    });
}


