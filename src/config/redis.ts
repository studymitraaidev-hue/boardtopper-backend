import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Optional Redis client.
 *
 * If REDIS_URL is set, we connect to Redis.
 * If REDIS_URL is not set (Railway free tier, local dev without Redis),
 * redisClient is null and all callers fall back to in-memory alternatives.
 *
 * This prevents ioredis from crashing the server on startup when Redis
 * is not available.
 */

let redisClient: Redis | null = null;

const REDIS_URL = process.env['REDIS_URL'] ?? '';

if (REDIS_URL.length > 0) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('[Redis] Connected successfully');
    });

    redisClient.on('error', (err: Error) => {
      logger.warn(`[Redis] Connection error (non-fatal): ${err.message}`);
      // Do NOT crash — Redis is optional. App continues with in-memory fallback.
    });

  } catch (err) {
    logger.warn(`[Redis] Failed to initialise (non-fatal): ${String(err)}`);
    redisClient = null;
  }
} else {
  logger.info('[Redis] REDIS_URL not set — using in-memory fallback. ' +
    'JWT revocation and distributed rate limiting are disabled.');
}

// jwt.ts already has its own in-memory fallback and uses dynamic require()
// with a try/catch — it does not import from this module directly.
// This module is the canonical Redis client for any future Redis consumers.

export { redisClient };
export default redisClient;
