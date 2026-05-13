# BoardTopper AI — Deployment Guide

## Stack
- **Frontend** → Vercel (React + Vite)
- **Backend**  → Railway (Node.js + TypeScript)
- **Database** → Supabase (already hosted)

---

## 1. Deploy Backend to Railway

### Step 1 — Create Railway project
1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select your backend repo (or upload the `boardtopper-backend-FINAL` folder)

### Step 2 — Set environment variables in Railway dashboard
Go to: Project → Service → Variables tab. Add **every** variable below.

```
# Server
PORT=5000
NODE_ENV=production

# CORS — set to your Vercel URL after frontend deploy
# Example: https://boardtopper.vercel.app
CORS_ORIGIN=https://YOUR_VERCEL_URL_HERE

# Auth — generate with: openssl rand -base64 48
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_EXPIRES_IN=7d

# Password hashing
BCRYPT_ROUNDS=12

# Supabase — from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXX
SUPABASE_SECRET_KEY=sb_secret_XXXX

# Gemini AI — from https://aistudio.google.com/apikey
GEMINI_API_KEY=REPLACE_WITH_YOUR_KEY

# Groq (optional AI fallback) — from https://console.groq.com
GROQ_API_KEY=REPLACE_WITH_YOUR_KEY

# Email (Resend) — from https://resend.com (free: 3,000 emails/month)
RESEND_API_KEY=re_REPLACE_WITH_YOUR_KEY
FROM_EMAIL=BoardTopperAI <noreply@yourdomain.com>
APP_URL=https://YOUR_VERCEL_URL.vercel.app

# Razorpay — from https://dashboard.razorpay.com/app/keys
# Use rzp_test_... for testing, rzp_live_... for production
RAZORPAY_KEY_ID=rzp_test_XXXX
RAZORPAY_KEY_SECRET=XXXX
```

### Step 3 — Verify deploy
Railway auto-runs: `npm run build && npm start`

Check the deploy logs. You should see:
```
BoardTopper API running on port XXXX in production mode
```

Test the health check:
```
curl https://YOUR_RAILWAY_URL.railway.app/health
# Expected: {"data":{"status":"ok"},"error":null}
```

Copy your Railway URL — you need it for the frontend.

---

## 2. Deploy Frontend to Vercel

### Step 1 — Create Vercel project
1. Go to https://vercel.com → New Project → Import GitHub repo
2. Select your frontend repo (or upload `boardtopper-frontend-FINAL` folder)
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`

### Step 2 — Set environment variables in Vercel dashboard
Go to: Project → Settings → Environment Variables. Add:

```
VITE_API_URL=https://YOUR_RAILWAY_URL.railway.app
```

> ⚠️  The `VITE_` prefix is required — Vite only exposes env vars with this prefix to the browser.

### Step 3 — Deploy
Click Deploy. Vercel runs `npm run build` with your env vars baked in.

### Step 4 — Update CORS_ORIGIN on Railway
Once Vercel gives you your URL (e.g. `https://boardtopper.vercel.app`):
1. Go back to Railway → Variables
2. Update `CORS_ORIGIN=https://boardtopper.vercel.app`
3. Railway auto-redeploys

---

## 3. Final Checklist

- [ ] Railway deploy logs show no errors
- [ ] `/health` endpoint returns `{"data":{"status":"ok"}}`
- [ ] Vercel build succeeds (no TypeScript errors)
- [ ] Login works end-to-end (frontend → Railway → Supabase)
- [ ] `CORS_ORIGIN` on Railway matches your exact Vercel URL (no trailing slash)
- [ ] Supabase RLS policies allow your backend's service key to read/write

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `FATAL: Environment variable "X" is missing` | Railway var not set | Add it in Railway Variables tab |
| `CORS error` in browser | `CORS_ORIGIN` mismatch | Must exactly match Vercel URL |
| 404 on page refresh | `vercel.json` missing | Already fixed — it's in the repo |
| `API calls go to localhost` | `VITE_API_URL` not set in Vercel | Add it in Vercel → Settings → Env Vars |
| Emails not sending | `RESEND_API_KEY` missing | Add it in Railway Variables |
| Reset link broken | `APP_URL` wrong | Must match exact Vercel URL |
| Railway build fails | TypeScript errors | Run `npm run build` locally first to catch them |

## ⚠️ Known Architectural Limitations

### Token Blacklist (Logout Revocation)
The JWT token blacklist in `src/utils/jwt.ts` is **in-memory**.

**What this means:**
- ✅ Works correctly on a single server instance (Railway default)
- ❌ If the server restarts, blacklisted tokens (logged-out sessions) are forgotten — stolen tokens from before the restart would temporarily be valid again until they expire naturally
- ❌ Does NOT work across multiple server instances (horizontal scaling)

**Fix when scaling:**
Replace the in-memory `Map` in `jwt.ts` with a Redis `SET` with TTL:
```typescript
// Instead of: blacklist.set(token, expiry)
// Use:        await redis.set(`revoked:${token}`, '1', 'EXAT', expirySeconds)
```
Railway supports Redis as an add-on. Add `REDIS_URL` to env vars and install `ioredis`.

### JWT Expiry
Tokens expire after 30 days (`JWT_EXPIRES_IN=30d`). After server restart, a user
who logged out within those 30 days could theoretically reuse their token until it
expires. For a student app this risk is low, but upgrade to Redis before launch if
this is a concern.

## Subscription Expiry Cron Job (Day 11)

Set up the nightly subscription expiry job in Railway after deployment:

1. In Railway dashboard → your backend service → **Settings → Cron Jobs**
2. Add a new cron job:
   - **Schedule:** `0 0 * * *` (every day at midnight UTC)
   - **Command:**
     ```
     curl -s -X POST https://YOUR_BACKEND_URL/api/admin/expire-subscriptions \
       -H "X-Admin-Secret: YOUR_ADMIN_SECRET_VALUE"
     ```
3. Set `ADMIN_SECRET` environment variable in Railway to a 32-char random string.
   Generate one: `openssl rand -hex 16`

**What the job does:**
- Finds all subscriptions where `ends_at < NOW()` and status is still `active` or `pending`
- Sets their status to `expired`
- Downgrades the affected users' `plan` to `free` — but only if they have no *other* active subscription (protects users who renewed early)

The endpoint is idempotent — safe to call multiple times without side effects.

## Admin Cron Job (Railway)

The subscription expiry cron runs nightly. Two ways to invoke it:

### Option A — HTTP endpoint (simple, existing)
Configure a Railway cron job to send:
  POST https://your-backend.railway.app/api/admin/expire-subscriptions
  Header: X-Admin-Secret: <your 32+ char secret from env>
Set interval: 0 0 * * * (midnight daily UTC)
ADMIN_SECRET must be minimum 32 characters.

### Option B — Standalone script (recommended for production)
Run scripts/expire-subscriptions.ts directly as a Railway cron service:
  Command: npx ts-node scripts/expire-subscriptions.ts
  Interval: 0 0 * * *
Required env vars: SUPABASE_URL, SUPABASE_SECRET_KEY
No HTTP call needed — connects directly to Supabase.

The script outputs structured JSON logs that Railway can parse and alert on.
Check Railway logs after each run to confirm expiredSubscriptions and downgradedUsers counts.
