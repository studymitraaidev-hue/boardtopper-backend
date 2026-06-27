import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// ── General API limiter ───────────────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Too many requests. Please try again later.' },
});

// ── Auth route limiter ────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Too many login attempts. Please try again later.' },
});

// ── AI route limiter ──────────────────────────────────────────────────────────
// Free users: 5 requests per hour. Pro: unlimited (skip=true).
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => req.user?.id ?? req.ip ?? 'anonymous',
  skip: (req: Request): boolean => req.user?.plan === 'pro',
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      data: null,
      error: 'Hourly doubt limit reached (5/hour on Free plan). Upgrade to Pro for unlimited doubts.',
    });
  },
});

// ── Quiz submission limiter ───────────────────────────────────────────────────
// 30 submissions per hour per user — prevents automated spam writes to quiz_attempts.
export const quizLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => req.user?.id ?? req.ip ?? 'anonymous',
  message: { data: null, error: 'Too many quiz submissions. Please try again later.' },
});

// ── Emergency Mode limiter ────────────────────────────────────────────────────
// 60 requests per hour — it's read-only but Pro-only, keep it generous.
export const emergencyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => req.user?.id ?? req.ip ?? 'anonymous',
  message: { data: null, error: 'Too many requests to Emergency Mode. Please slow down.' },
});

// 10 requests per hour — admin cron endpoint only.
// Prevents brute-force attempts on the X-Admin-Secret header.
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { data: null, error: 'Admin rate limit exceeded.' },
});
