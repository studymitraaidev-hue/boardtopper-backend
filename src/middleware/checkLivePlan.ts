import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';

// ─── In-memory plan cache ─────────────────────────────────────────────────────
// Declared at module level so it persists across requests.
const planCache = new Map<string, { isPro: boolean; cachedAt: number }>();

const CACHE_TTL = 300_000; // 5 minutes in milliseconds

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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .limit(1)
      .single();

    const isPro = !error && data !== null;

    planCache.set(userId, { isPro, cachedAt: Date.now() });
    req.user.plan = isPro ? 'pro' : 'free';
  } catch (err) {
    // DB failure — log and fall through with the original JWT plan value intact.
    // A database error must never block AI for all users.
    console.error('[checkLivePlan] Failed to query subscriptions:', err);
  }

  next();
}
