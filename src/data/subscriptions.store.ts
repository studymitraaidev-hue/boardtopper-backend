import supabase from '../config/supabase';

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
  if (plan === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
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
    .in('status', ['active', 'cancelled'])
    .gt('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return toStoredSubscription(data as SubscriptionRow);
}
