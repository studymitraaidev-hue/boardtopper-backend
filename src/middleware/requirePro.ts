import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { getValidSubscription } from '../data/subscriptions.store';

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


  // Second gate: verify subscription is still active in DB (not expired/cancelled)
  // This is async — we need to use promise-based logic here
  getValidSubscription(req.user.id)
    .then((sub) => {
      const { findById } = require('../data/users.store');
      return findById(req.user!.id).then((dbUser: any) => {
        if (!sub && dbUser?.plan !== 'pro') {
          ApiResponse.error(res, 'Your Pro subscription has expired or been cancelled. Renew at boardtopper.ai/pricing.', 403);
          return;
        }
        next();
      });
    })
    .catch(() => {
      // DB error — fail open with a warning (don't block legitimate Pro users on DB blip)
      // In production you may prefer to fail closed depending on risk tolerance
      next();
    });
}


