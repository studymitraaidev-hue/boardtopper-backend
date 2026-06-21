import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { getValidSubscription } from '../data/subscriptions.store';
import { findById, updateUser } from '../data/users.store';

/**
 * requireProOrTrial — like requirePro, but lets non-Pro users through
 * exactly ONCE (their free Emergency Mode trial), then blocks them.
 *
 * Must be applied AFTER the `authenticate` middleware so req.user is set.
 */
export function requireProOrTrial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  getValidSubscription(req.user.id)
    .then((sub) => {
      return findById(req.user!.id).then(async (dbUser) => {
        if (!dbUser) {
          ApiResponse.error(res, 'User not found', 404);
          return;
        }

        const isPro = !!sub || dbUser.plan === 'pro';
        if (isPro) {
          next();
          return;
        }

        // Non-pro: allow exactly one free trial
        if (!dbUser.emergencyTrialUsed) {
          await updateUser(dbUser.id, { emergencyTrialUsed: true });
          next();
          return;
        }

        ApiResponse.error(
          res,
          'Your free Emergency Mode trial has been used. Upgrade to Topper Pro for unlimited access.',
          403
        );
      });
    })
    .catch(() => {
      // DB error — fail open, consistent with requirePro
      next();
    });
}
