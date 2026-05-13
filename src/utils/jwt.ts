import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  email: string;
  plan: 'free' | 'pro';
}

// ─── Token Blacklist ──────────────────────────────────────────────────────────
// Uses Redis when REDIS_URL is set (production) — survives restarts, works
// across multiple instances. Falls back to in-memory Map when Redis is not
// configured (local dev). The fallback is clearly logged at startup so it
// is never invisible.

interface Blacklist {
  revoke(token: string, expirySeconds: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}

// ── Redis implementation ──────────────────────────────────────────────────────
// Uses the optional Redis client from config/redis — never crashes when
// REDIS_URL is not set. If redisClient is null, the caller falls back to
// the in-memory implementation below.
async function buildRedisBlacklist(): Promise<Blacklist> {
  const { redisClient } = await import('../config/redis');

  if (!redisClient) {
    throw new Error('Redis client is not configured — REDIS_URL not set');
  }

  const client = redisClient;

  // Verify connectivity before committing to Redis backend
  await client.ping();
  console.log('[Auth] Token blacklist: Redis ✅');

  return {
    async revoke(token, expirySeconds) {
      // Use a short hash of the token as key to avoid storing full JWTs
      const key = `revoked:${Buffer.from(token).toString('base64').slice(0, 40)}`;
      await client.set(key, '1', 'EX', expirySeconds);
    },
    async isRevoked(token) {
      const key = `revoked:${Buffer.from(token).toString('base64').slice(0, 40)}`;
      const val = await client.get(key);
      return val === '1';
    },
  };
}

// ── In-memory fallback ────────────────────────────────────────────────────────
function buildMemoryBlacklist(): Blacklist {
  console.warn(
    '[Auth] Token blacklist: IN-MEMORY ⚠️  ' +
    'Revoked tokens will be forgotten on server restart. ' +
    'Set REDIS_URL in environment variables to enable persistent revocation.'
  );

  const store = new Map<string, number>();

  // Prune expired entries every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [k, exp] of store.entries()) {
      if (exp < now) store.delete(k);
    }
  }, 10 * 60 * 1000).unref(); // .unref() so this timer doesn't keep process alive

  return {
    async revoke(token, expirySeconds) {
      store.set(token, Date.now() + expirySeconds * 1000);
    },
    async isRevoked(token) {
      const exp = store.get(token);
      if (exp === undefined) return false;
      if (exp < Date.now()) { store.delete(token); return false; }
      return true;
    },
  };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// We initialise once and cache the instance. Both implementations satisfy the
// same interface so callers don't need to know which backend is active.
let _blacklist: Blacklist | null = null;

async function getBlacklist(): Promise<Blacklist> {
  if (_blacklist) return _blacklist;

  if (process.env['REDIS_URL']) {
    try {
      _blacklist = await buildRedisBlacklist();
      return _blacklist;
    } catch (err) {
      console.error('[Auth] Redis unavailable, falling back to in-memory:', (err as Error).message);
    }
  }

  _blacklist = buildMemoryBlacklist();
  return _blacklist;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function revokeToken(token: string): Promise<void> {
  try {
    const decoded    = jwt.decode(token) as { exp?: number } | null;
    const expiryUnix = decoded?.exp ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const ttlSeconds = Math.max(expiryUnix - Math.floor(Date.now() / 1000), 1);
    const bl         = await getBlacklist();
    await bl.revoke(token, ttlSeconds);
  } catch (err) {
    // Non-fatal — log but don't crash the logout flow
    console.error('[Auth] revokeToken failed:', (err as Error).message);
  }
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const bl = await getBlacklist();
    return await bl.isRevoked(token);
  } catch (err) {
    // If blacklist check fails, fail OPEN (allow request) — better than
    // locking out all users due to a Redis hiccup.
    console.error('[Auth] isTokenRevoked check failed:', (err as Error).message);
    return false;
  }
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & JwtPayload;

  if (
    typeof decoded.id    !== 'string' ||
    typeof decoded.email !== 'string' ||
    (decoded.plan !== 'free' && decoded.plan !== 'pro')
  ) {
    throw new Error('Malformed token payload');
  }

  return { id: decoded.id, email: decoded.email, plan: decoded.plan };
}
