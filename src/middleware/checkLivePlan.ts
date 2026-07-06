import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';

// ─── In-memory plan cache ─────────────────────────────────────────────────────
// Declared at module level so it persists across requests.
const planCache = new Map<string, { isPro: boolean; cachedAt: number }>();

// Reduced from 5 min to 1 min so upgrades are reflected within 60 seconds.
const CACHE_TTL = 60_000;

export function invalidatePlanCache(userId: string): void {
  planCache.delete(userId);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function checkLivePlan(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const userId = req.user.id;
  const cached = planCache.get(userId);

  // Cache hit — still fresh
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    req.user.plan = cached.isPro ? 'pro' : 'free';
    next();
    return;
  }

  // Cache miss — query the live subscriptions table
  try {
    // Use maybeSingle() instead of single() so 0 rows returns null (not an error).
    // Keep 'cancelled' in status list — cancelled users who still have time left
    // (ends_at in the future) have PAID for that time and should retain Pro access.
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Log the Supabase error so it appears in Render logs for debugging.
      console.error(`[checkLivePlan] Supabase error for user ${userId}:`, error.message, error.code);
      // On DB error, fall back to JWT plan value — never block all users on outage.
      next();
      return;
    }

    const isPro = data !== null;

    planCache.set(userId, { isPro, cachedAt: Date.now() });
    req.user.plan = isPro ? 'pro' : 'free';

    if (isPro) {
      console.info(`[checkLivePlan] user=${userId} confirmed Pro (active subscription)`);
    }
  } catch (err) {
    // Network / unexpected failure — log and fall through with JWT plan intact.
    console.error('[checkLivePlan] Unexpected error querying subscriptions:', err);
  }

  next();
}
