/*
  RAZORPAY TEST CARDS:
  Card: 4111 1111 1111 1111
  CVV:  any 3 digits
  Date: any future date
  OTP:  success

  Test UPI: success@razorpay

  Flow:
  1. POST /api/payments/create-order (Bearer token) — body: { plan: 'monthly' | 'yearly' }
  2. Use returned orderId in Razorpay test checkout
  3. POST /api/payments/verify with 3 returned values
  4. New token returned — store in localStorage
*/

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { signToken } from '../utils/jwt';
import { findById, updateUser } from '../data/users.store';
import {
  createOrder as createRazorpayOrder,
  verifyPaymentSignature,
} from '../services/razorpay.service';
import {
  createPaymentRecord,
  updatePaymentStatus,
  getPaymentsByUser,
  getPaymentByOrderId,
} from '../data/payments.store';
import {
  createSubscription,
  getValidSubscription,
  getActiveSubscription,
  updateSubscriptionStatus,
  expireOtherSubscriptions,
  getSubscriptionByPaymentId,
} from '../data/subscriptions.store';
import { sendCancellationEmail } from '../services/email.service';
import config from '../config/env';
import logger from '../utils/logger';

// ─── Plan amount map (paise) ──────────────────────────────────────────────────
const PLAN_AMOUNTS: Record<'monthly' | 'yearly', number> = {
  monthly: 9900,   // ₹99
  yearly:  79900,  // ₹799
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/payments/create-order
 * Protected — requires valid Bearer token.
 * Body: { plan: 'monthly' | 'yearly' }
 *
 * Creates a Razorpay order, a payment record, and a pending subscription record.
 * Amount is always server-determined — never trusted from frontend.
 */
export const createOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Guard: return 503 if Razorpay is not configured yet
    if (!config.RAZORPAY_ENABLED) {
      ApiResponse.error(res, 'Payments are not configured yet. Please contact support.', 503);
      return;
    }

    const userId = req.user!.id;

    // 1. Reject if user already has an active Pro subscription
    const existing = await getValidSubscription(userId);
    if (existing) {
      ApiResponse.error(res, 'You already have an active Pro subscription', 400);
      return;
    }

    const user = await findById(userId);
    if (!user) {
      ApiResponse.error(res, 'User not found', 404);
      return;
    }

    // 2. Determine plan from request body — default to monthly if not provided
    const requestedPlan = req.body?.plan;
    const plan: 'monthly' | 'yearly' =
      requestedPlan === 'yearly' ? 'yearly' : 'monthly';
    const amount = PLAN_AMOUNTS[plan];

    // 3. Create Razorpay order — amount is server-determined, never from frontend
    const order = await createRazorpayOrder(
      amount,
      `rcpt_${userId.slice(0,8)}_${Date.now()}`
    );

    // 4. Persist payment record (status: 'created') with plan info
    const paymentRecord = await createPaymentRecord({
      userId,
      razorpayOrderId: order.id,
      amount,
      plan,
    });

    // 5. Create a pending subscription record linked to this payment
    await createSubscription({
      userId,
      plan,
      paymentId: paymentRecord.id,
    });

    // 6. Return orderId + publishable keyId to frontend
    // NOTE: RAZORPAY_KEY_SECRET is NEVER sent to frontend — only publishable KEY_ID
    ApiResponse.success(res, {
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    config.RAZORPAY_KEY_ID,
      plan,
    });
  }
);

/**
 * POST /api/payments/verify
 * Protected — requires valid Bearer token.
 *
 * Verifies Razorpay HMAC signature, checks order ownership, prevents replay,
 * upgrades user to Pro, activates subscription, returns new JWT.
 */
export const verifyPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!config.RAZORPAY_ENABLED) {
      ApiResponse.error(res, 'Payments are not configured yet. Please contact support.', 503);
      return;
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body as {
        razorpayOrderId?: string;
        razorpayPaymentId?: string;
        razorpaySignature?: string;
      };

    // 1. Validate all 3 fields present
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      ApiResponse.error(
        res,
        'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required',
        400
      );
      return;
    }

    // 2. Verify orderId belongs to this authenticated user (prevents cross-user attacks)
    const paymentRecord = await getPaymentByOrderId(razorpayOrderId);
    if (!paymentRecord || paymentRecord.userId !== req.user!.id) {
      logger.warn(
        `[Payment] Order ownership check FAILED — userId=${req.user!.id} ` +
          `claimed orderId=${razorpayOrderId}`
      );
      ApiResponse.error(res, 'Payment verification failed', 400);
      return;
    }

    // 3. Replay attack prevention — reject already-paid orders
    if (paymentRecord.status === 'paid') {
      logger.warn(
        `[Payment] Replay attempt detected — userId=${req.user!.id} ` +
          `orderId=${razorpayOrderId} already paid`
      );
      ApiResponse.error(res, 'Payment already processed', 400);
      return;
    }

    // 4. Verify HMAC-SHA256 signature — mandatory security gate, never skip
    const valid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!valid) {
      logger.warn(
        `[Payment] Signature verification FAILED — userId=${req.user!.id} ` +
          `orderId=${razorpayOrderId} paymentId=${razorpayPaymentId}`
      );
      // Mark subscription as failed
      const sub = await getSubscriptionByPaymentId(paymentRecord.id).catch(() => undefined);
      if (sub) {
        await updateSubscriptionStatus(sub.id, 'failed').catch(() => {});
      }
      await updatePaymentStatus(razorpayOrderId, razorpayPaymentId, 'failed').catch(() => {});
      ApiResponse.error(res, 'Payment verification failed', 400);
      return;
    }

    try {
      // 5. Signature verified — update payment record to 'paid'
      await updatePaymentStatus(razorpayOrderId, razorpayPaymentId, 'paid');

      // 6. Activate subscription — expire any other active/pending subs first
      const sub = await getSubscriptionByPaymentId(paymentRecord.id);
      if (sub) {
        await expireOtherSubscriptions(req.user!.id, sub.id);
        await updateSubscriptionStatus(sub.id, 'active');
      }

      // 7. Upgrade user plan to 'pro' in Supabase
      await updateUser(req.user!.id, { plan: 'pro' });

      // 8. Issue new JWT with updated plan — frontend swaps token, Pro unlocked instantly
      const newToken = signToken({
        id:    req.user!.id,
        email: req.user!.email,
        plan:  'pro',
      });

      logger.info(
        `[Payment] SUCCESS — userId=${req.user!.id} upgraded to Pro ` +
          `plan=${paymentRecord.plan} orderId=${razorpayOrderId} paymentId=${razorpayPaymentId}`
      );

      ApiResponse.success(res, {
        token:   newToken,
        message: 'Upgrade successful! Welcome to Pro.',
        plan:    'pro',
      });
    } catch {
      // Mark payment and subscription as failed for investigation
      await updatePaymentStatus(razorpayOrderId, razorpayPaymentId, 'failed').catch(() => {});
      const sub = await getSubscriptionByPaymentId(paymentRecord.id).catch(() => undefined);
      if (sub) {
        await updateSubscriptionStatus(sub.id, 'failed').catch(() => {});
      }
      logger.error(
        `[Payment] Processing error — userId=${req.user!.id} orderId=${razorpayOrderId}`
      );
      ApiResponse.error(res, 'Payment processing failed', 500);
    }
  }
);

/**
 * GET /api/payments/history
 * Protected — requires valid Bearer token.
 */
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payments = await getPaymentsByUser(req.user!.id);
    ApiResponse.success(res, payments);
  }
);

/**
 * GET /api/payments/subscription-status
 * Protected — requires valid Bearer token.
 *
 * Returns authoritative subscription state from DB.
 * Frontend calls this after payment to confirm Pro access.
 * Never rely on client-side payment callback alone.
 */
export const getSubscriptionStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const user = await findById(userId);
    if (!user) {
      ApiResponse.error(res, 'User not found', 404);
      return;
    }

    const subscription = await getValidSubscription(userId);

    ApiResponse.success(res, {
      plan:         user.plan,
      isPro:        user.plan === 'pro' && !!subscription,
      subscription: subscription
        ? {
            id:      subscription.id,
            plan:    subscription.plan,
            status:  subscription.status,
            endsAt:  subscription.endsAt,
          }
        : null,
    });
  }
);

/**
 * POST /api/payments/cancel-subscription
 * Protected — requires valid Bearer token.
 *
 * Marks the active subscription as cancelled. Does NOT downgrade user.plan —
 * the /api/admin/expire-subscriptions cron handles that after ends_at passes.
 */
export const cancelSubscription = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // 1. Find the user's active subscription
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      ApiResponse.error(res, 'No active subscription found.', 404);
      return;
    }

    // 2. Guard: already cancelled
    if (subscription.status === 'cancelled') {
      ApiResponse.error(res, 'Your subscription is already cancelled.', 400);
      return;
    }

    // 3. Cancel the subscription — updateSubscriptionStatus sets cancelled_at automatically
    const updated = await updateSubscriptionStatus(subscription.id, 'cancelled');
    if (!updated) {
      ApiResponse.error(res, 'Failed to cancel subscription. Please try again.', 500);
      return;
    }

    // 4. Send cancellation email — fire and forget, failure must not undo the cancellation
    try {
      const user = await findById(userId);
      if (user) {
        await sendCancellationEmail(user.email, user.name, updated.endsAt, updated.plan);
      }
    } catch (emailErr) {
      logger.error(`[Payment] Cancellation email failed — userId=${userId}: ${String(emailErr)}`);
    }

    // 5. Respond — user keeps Pro access until ends_at; cron handles plan downgrade
    ApiResponse.success(res, {
      message: 'Subscription cancelled successfully. You will retain Pro access until your billing period ends.',
      endsAt:  updated.endsAt,
    });
  }
);

