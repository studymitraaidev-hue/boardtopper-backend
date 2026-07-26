import supabase from '../config/supabase';
import { updateUser } from './users.store';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'failed' | 'pending';

export interface StoredSubscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date;
  paymentId: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string;
  payment_id: string | null;
  cancelled_at: string | null;
  created_at: string;
}

function toStoredSubscription(row: SubscriptionRow): StoredSubscription {
  return {
    id:          row.id,
    userId:      row.user_id,
    plan:        row.plan,
    status:      row.status,
    startsAt:    new Date(row.starts_at),
    endsAt:      new Date(row.ends_at),
    paymentId:   row.payment_id,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt:   new Date(row.created_at),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEndsAt(plan: 'monthly' | 'yearly'): Date {
  const d = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  if (plan === 'yearly') {
    d.setTime(d.getTime() + (365 * msPerDay));   // 365 days
  } else {
    d.setTime(d.getTime() + (30 * msPerDay));     // 30 days
  }
  return d;
}

// ─── Store Functions ──────────────────────────────────────────────────────────

/**
 * Create a new subscription record in 'pending' state.
 * Called when an order is created — before payment is confirmed.
 * paymentId here is the payments.id (UUID), not razorpay_payment_id.
 */
export async function createSubscription(data: {
  userId: string;
  plan: 'monthly' | 'yearly';
  paymentId: string;
}): Promise<StoredSubscription> {
  const endsAt = calcEndsAt(data.plan);

  const { data: row, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id:    data.userId,
      plan:       data.plan,
      status:     'pending',
      starts_at:  new Date().toISOString(),
      ends_at:    endsAt.toISOString(),
      payment_id: data.paymentId,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create subscription record');
  }

  return toStoredSubscription(row as SubscriptionRow);
}

/**
 * Get the most recent subscription for a user.
 */
export async function getActiveSubscription(
  userId: string
): Promise<StoredSubscription | undefined> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return toStoredSubscription(data as SubscriptionRow);
}

/**
 * Get subscription by the internal payments table UUID (not razorpay ID).
 */
export async function getSubscriptionByPaymentId(
  paymentId: string
): Promise<StoredSubscription | undefined> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return toStoredSubscription(data as SubscriptionRow);
}

/**
 * Update subscription status by its UUID.
 * Idempotent: if already in target state, no-op (returns existing row).
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<StoredSubscription | undefined> {
  const updatePayload: Record<string, unknown> = { status };
  if (status === 'cancelled') {
    updatePayload['cancelled_at'] = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error || !data) return undefined;
  return toStoredSubscription(data as SubscriptionRow);
}

/**
 * Mark all non-cancelled subscriptions for a user as expired.
 * Called before activating a new subscription to avoid duplicates.
 */
export async function expireOtherSubscriptions(
  userId: string,
  exceptId: string
): Promise<void> {
  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .neq('id', exceptId)
    .in('status', ['active', 'pending']);
}

/**
 * Check if a user has an active subscription by verifying:
 * 1. status = 'active'
 * 2. ends_at is in the future
 * Returns the subscription if active, undefined otherwise.
 */
export async function getValidSubscription(
  userId: string
): Promise<StoredSubscription | undefined> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return toStoredSubscription(data as SubscriptionRow);
}

/**
 * Cron job: find all subscriptions where ends_at < now and status = 'active',
 * mark them 'expired', and downgrade users to 'free' plan.
 * Should be called daily via a cron job or startup check.
 */
export async function expireExpiredSubscriptions(): Promise<{
  expiredCount: number;
  downgradedCount: number;
}> {
  const now = new Date().toISOString();

  // 1. Find all expired active subscriptions
  const { data: expiredRows, error } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('status', 'active')
    .lt('ends_at', now);

  if (error || !expiredRows || expiredRows.length === 0) {
    return { expiredCount: 0, downgradedCount: 0 };
  }

  const expiredIds = expiredRows.map((r: any) => r.id);
  const userIds = [...new Set(expiredRows.map((r: any) => r.user_id as string))];

  // 2. Mark subscriptions expired
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .in('id', expiredIds);

  if (updateError) {
    logger.error('[ExpireSubs] Failed to mark subscriptions expired:', updateError);
    return { expiredCount: 0, downgradedCount: 0 };
  }

  // 3. Downgrade users to 'free' — but only if they have no OTHER active subscription
  let downgradedCount = 0;
  for (const userId of userIds) {
    const { data: stillActive } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!stillActive) {
      await updateUser(userId, { plan: 'free' });
      downgradedCount++;
      logger.info(`[ExpireSubs] Downgraded user ${userId} to free plan`);
    }
  }

  logger.info(`[ExpireSubs] Expired ${expiredIds.length} subscriptions, downgraded ${downgradedCount} users`);
  return { expiredCount: expiredIds.length, downgradedCount };
}
