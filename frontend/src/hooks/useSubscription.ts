/**
 * useSubscription — Day 9
 *
 * Fetches the authoritative subscription state from the backend DB.
 * This is separate from the JWT `user.plan` field because the JWT is
 * only refreshed on login/payment — an expired or cancelled subscription
 * would still appear as 'pro' in the JWT until re-login.
 *
 * This hook provides the server-verified truth.
 *
 * Usage:
 *   const { isPro, loading, error, refresh } = useSubscription();
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchSubscriptionStatus, SubscriptionStatus } from '../services/paymentService';

export interface UseSubscriptionResult {
  /** True only when backend confirms an active subscription exists */
  isPro: boolean;
  /** Raw status data from backend, null if not yet fetched */
  data: SubscriptionStatus | null;
  /** True while the initial or refresh fetch is in progress */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Manually re-fetch subscription status (call after payment or on focus) */
  refresh: () => Promise<void>;
}

export function useSubscription(enabled = true): UseSubscriptionResult {
  const [data, setData]       = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError]     = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const status = await fetchSubscriptionStatus();
      setData(status);
    } catch (err) {
      // Non-fatal — keep showing the locked state on error (fail closed)
      const msg = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(msg);
      // On error, keep existing data (don't wipe it) — avoids flicker on
      // temporary network issues mid-session for already-confirmed Pro users
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchStatus();
    }
  }, [fetchStatus, enabled]);

  // isPro is true ONLY when backend confirms active status
  // Do NOT derive this from user.plan alone (JWT can be stale)
  const isPro = data?.isPro === true;

  return { isPro, data, loading, error, refresh: fetchStatus };
}
