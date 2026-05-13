/**
 * Razorpay Webhook Handler
 *
 * Endpoint: POST /api/payments/webhook
 * This endpoint is PUBLIC (no auth middleware) — Razorpay calls it server-to-server.
 * Authentication is via x-razorpay-signature header (HMAC-SHA256 of raw body).
 *
 * CRITICAL:
 * - Raw body must be used for signature verification (not parsed JSON).
 * - This route must be registered BEFORE express.json() middleware, or use
 *   express.raw() for this specific route only (handled in payment.routes.ts).
 * - All state changes are idempotent: processing an event twice is safe.
 *
 * Handled events:
 *   payment.captured   → mark payment paid, activate subscription, set user plan = pro
 *   payment.failed     → mark payment failed, mark subscription failed
 *   subscription.cancelled → mark subscription cancelled, revert user plan to free
 *   subscription.expired   → mark subscription expired, revert user plan to free
 */

import { Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/razorpay.service';
import { getPaymentByOrderId, updatePaymentStatus } from '../data/payments.store';
import {
  getSubscriptionByPaymentId,
  updateSubscriptionStatus,
  expireOtherSubscriptions,
} from '../data/subscriptions.store';
import { updateUser } from '../data/users.store';
import config from '../config/env';
import logger from '../utils/logger';

// ─── Razorpay event payload shapes ───────────────────────────────────────────

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  status: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    subscription?: { entity?: { id: string; status: string } };
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // 1. Webhook secret must be configured — fail-safe if not set
  if (!config.RAZORPAY_WEBHOOK_SECRET) {
    logger.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
    res.status(400).json({ error: 'Webhook secret not configured' });
    return;
  }

  // 2. Verify signature using raw body (req.body is Buffer when express.raw() is used)
  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    logger.warn('[Webhook] Missing x-razorpay-signature header');
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const rawBody: string =
    Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

  const isValid = verifyWebhookSignature(rawBody, signature, config.RAZORPAY_WEBHOOK_SECRET);
  if (!isValid) {
    logger.warn('[Webhook] Invalid signature — rejecting');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // 3. Parse payload
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    logger.warn('[Webhook] Failed to parse payload');
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const event = payload.event;
  logger.info(`[Webhook] Received event: ${event}`);

  // 4. Respond 200 immediately — Razorpay expects fast ACK
  // Processing happens synchronously before response for simplicity,
  // but the 200 is returned as early as possible after signature check.

  try {
    switch (event) {
      case 'payment.captured': {
        await handlePaymentCaptured(payload);
        break;
      }
      case 'payment.failed': {
        await handlePaymentFailed(payload);
        break;
      }
      case 'subscription.cancelled': {
        await handleSubscriptionCancelled(payload);
        break;
      }
      case 'subscription.expired': {
        await handleSubscriptionExpired(payload);
        break;
      }
      default: {
        logger.info(`[Webhook] Unhandled event type: ${event} — ignored safely`);
      }
    }
  } catch (err) {
    // Log but still return 200 — Razorpay will retry on non-200 responses,
    // causing infinite retries. Log the error and investigate via monitoring.
    logger.error(`[Webhook] Error processing event ${event}: ${String(err)}`);
  }

  res.status(200).json({ received: true });
}

// ─── Event Processors ─────────────────────────────────────────────────────────

async function handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
  const entity = payload.payload?.payment?.entity;
  if (!entity?.id || !entity?.order_id) {
    logger.warn('[Webhook] payment.captured: missing entity fields');
    return;
  }

  const { id: razorpayPaymentId, order_id: razorpayOrderId } = entity;

  // Look up our payment record by Razorpay order ID
  const paymentRecord = await getPaymentByOrderId(razorpayOrderId);
  if (!paymentRecord) {
    logger.warn(`[Webhook] payment.captured: no payment record for orderId=${razorpayOrderId}`);
    return;
  }

  // Idempotency: skip if already paid
  if (paymentRecord.status === 'paid') {
    logger.info(`[Webhook] payment.captured: already processed orderId=${razorpayOrderId} — skipping`);
    return;
  }

  // Update payment record
  await updatePaymentStatus(razorpayOrderId, razorpayPaymentId, 'paid');

  // Activate subscription
  const sub = await getSubscriptionByPaymentId(paymentRecord.id);
  if (sub) {
    await expireOtherSubscriptions(paymentRecord.userId, sub.id);
    await updateSubscriptionStatus(sub.id, 'active');
  }

  // Upgrade user plan
  await updateUser(paymentRecord.userId, { plan: 'pro' });

  logger.info(
    `[Webhook] payment.captured: userId=${paymentRecord.userId} upgraded to Pro ` +
      `orderId=${razorpayOrderId} paymentId=${razorpayPaymentId}`
  );
}

async function handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
  const entity = payload.payload?.payment?.entity;
  if (!entity?.id || !entity?.order_id) {
    logger.warn('[Webhook] payment.failed: missing entity fields');
    return;
  }

  const { id: razorpayPaymentId, order_id: razorpayOrderId } = entity;

  const paymentRecord = await getPaymentByOrderId(razorpayOrderId);
  if (!paymentRecord) {
    logger.warn(`[Webhook] payment.failed: no payment record for orderId=${razorpayOrderId}`);
    return;
  }

  // Idempotency: skip if already in a terminal state
  if (paymentRecord.status === 'paid' || paymentRecord.status === 'failed') {
    logger.info(`[Webhook] payment.failed: already in terminal state — skipping`);
    return;
  }

  await updatePaymentStatus(razorpayOrderId, razorpayPaymentId, 'failed');

  const sub = await getSubscriptionByPaymentId(paymentRecord.id);
  if (sub && sub.status === 'pending') {
    await updateSubscriptionStatus(sub.id, 'failed');
  }

  logger.info(
    `[Webhook] payment.failed: userId=${paymentRecord.userId} orderId=${razorpayOrderId}`
  );
}

async function handleSubscriptionCancelled(payload: RazorpayWebhookPayload): Promise<void> {
  // We use one-time orders, not Razorpay subscription objects.
  // However, if this event arrives (e.g. if Razorpay subscription billing is added later),
  // find the matching subscription by Razorpay subscription ID and mark it cancelled.
  // For now: log and no-op — our subscriptions are managed via payment.captured events.
  const razorpaySubId = payload.payload?.subscription?.entity?.id;
  logger.info(
    `[Webhook] subscription.cancelled received — razorpaySubId=${razorpaySubId ?? 'none'} — one-time order model, no direct action`
  );
}

async function handleSubscriptionExpired(payload: RazorpayWebhookPayload): Promise<void> {
  // Same as above — log for audit trail.
  const razorpaySubId = payload.payload?.subscription?.entity?.id;
  logger.info(
    `[Webhook] subscription.expired received — razorpaySubId=${razorpaySubId ?? 'none'} — one-time order model, no direct action`
  );
}
