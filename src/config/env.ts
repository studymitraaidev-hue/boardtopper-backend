import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env file when running locally.
// On Railway/production, env vars are injected directly into process.env — no .env file exists.
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function requireEnv(key: string, minLength = 1): string {
  const value = process.env[key];
  if (!value || value.trim().length < minLength) {
    console.error(
      `[Config] FATAL: Environment variable "${key}" is missing or too short (min ${minLength} chars).`
    );
    process.exit(1);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue = ''): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    console.warn(`[Config] WARNING: Optional variable "${key}" not set — using default.`);
    return defaultValue;
  }
  return value.trim();
}

const config = {
  // ── Server ──────────────────────────────────────────────
  PORT:     parseInt(process.env['PORT'] ?? '5000', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',

  // ── Auth ────────────────────────────────────────────────
  JWT_SECRET:     requireEnv('JWT_SECRET', 32),
  // Access token lifetime. Refresh token (30 days) compensates for the shorter window.
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '1d'),

  // ── Password hashing ─────────────────────────────────────
  BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10),

  // ── Database (Supabase) ──────────────────────────────────
  SUPABASE_URL:             requireEnv('SUPABASE_URL', 10),
  SUPABASE_PUBLISHABLE_KEY: requireEnv('SUPABASE_PUBLISHABLE_KEY', 10),
  SUPABASE_SECRET_KEY:      requireEnv('SUPABASE_SECRET_KEY', 10),

  // Service role key — used only for OAuth user verification server-side.
  // Never exposed to frontend. Get from Supabase Dashboard → Settings → API.
  SUPABASE_SERVICE_ROLE_KEY: optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),

  // ── AI ───────────────────────────────────────────────────
  GEMINI_API_KEY: requireEnv('GEMINI_API_KEY', 10),
  GROQ_API_KEY:   optionalEnv('GROQ_API_KEY', ''),
  OPENROUTER_API_KEY: optionalEnv('OPENROUTER_API_KEY', ''),

  // ── Redis (optional) ──────────────────────────────────────────────────────────
  // If not set, the app uses in-memory fallback for JWT revocation.
  // Set this to your Redis URL on Railway if you add a Redis add-on.
  REDIS_URL: optionalEnv('REDIS_URL', ''),

  // ── Admin (internal cron) ─────────────────────────────────────────────────
  // Used to authenticate the /api/admin/expire-subscriptions cron endpoint.
  // Set this to a random 32-char string in Railway environment variables.
  // Generate one: openssl rand -hex 16   (gives 32 hex characters)
  // IMPORTANT: minimum 32 characters required — shorter secrets are rejected.
  ADMIN_SECRET: optionalEnv('ADMIN_SECRET', ''),

  // ── Razorpay ─────────────────────────────────────────────
  // Optional at startup — payment endpoints return 503 when not configured.
  // Set these in Railway env vars when you're ready to accept payments.
  // RAZORPAY_KEY_ID must start with 'rzp_' — get from Razorpay Dashboard → Settings → API Keys
  RAZORPAY_KEY_ID:      optionalEnv('RAZORPAY_KEY_ID', ''),
  RAZORPAY_KEY_SECRET:  optionalEnv('RAZORPAY_KEY_SECRET', ''),
  // Webhook secret set in Razorpay Dashboard → Webhooks → Secret
  // Optional: if not set, webhook endpoint will return 400 (fail-safe)
  RAZORPAY_WEBHOOK_SECRET: optionalEnv('RAZORPAY_WEBHOOK_SECRET', ''),

  // ── Email (Resend) ────────────────────────────────────────
  // FIX: APP_URL and FROM_EMAIL were used in email.service.ts but not declared
  // in config — all reset-password links had "undefined" in the URL.
  RESEND_API_KEY: optionalEnv('RESEND_API_KEY', ''),
  FROM_EMAIL:     optionalEnv('FROM_EMAIL', 'noreply@boardtopper.ai'),
  APP_URL:        optionalEnv('APP_URL', 'http://localhost:5173'),

  // ── CORS ──────────────────────────────────────────────────
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // ── Razorpay (derived flag) ────────────────────────────────────────────────
  // True only when both keys are properly set. Payment routes check this flag
  // and return 503 instead of crashing when payments aren't configured yet.
  RAZORPAY_ENABLED: !!(
    (process.env['RAZORPAY_KEY_ID'] ?? '').startsWith('rzp_') &&
    (process.env['RAZORPAY_KEY_SECRET'] ?? '').length >= 20
  ),
};

// FIX: Warn loudly if running in production without critical optional vars set
if (config.NODE_ENV === 'production') {
  if (!process.env['CORS_ORIGIN']) {
    console.warn(
      '[Config] WARNING: CORS_ORIGIN is not set in production. ' +
        'Frontend requests will likely be CORS-blocked. ' +
        'Set CORS_ORIGIN to your frontend URL in Railway environment variables.'
    );
  }
  if (!process.env['APP_URL']) {
    console.warn(
      '[Config] WARNING: APP_URL is not set in production. ' +
        'Password reset email links will be broken. ' +
        'Set APP_URL to your frontend URL (e.g. https://boardtopper.app).'
    );
  }
  if (!process.env['RESEND_API_KEY']) {
    console.warn(
      '[Config] WARNING: RESEND_API_KEY is not set. All transactional emails will be skipped.'
    );
  }
  if (!config.RAZORPAY_ENABLED) {
    console.warn(
      '[Config] WARNING: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set or invalid. ' +
      'Payment endpoints will return 503. Set these when ready to accept payments.'
    );
  }
}

export { config };
export default config;
