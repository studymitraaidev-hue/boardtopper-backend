import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, isTokenRevoked } from '../utils/jwt';
import { ApiResponse } from '../utils/ApiResponse';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  // Check blacklist first — async (Redis or memory)
  if (await isTokenRevoked(token)) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  // DAY 38: Postgres logged_out_at fallback — only when Redis is not configured.
  // If a user logged out without Redis available, their logged_out_at timestamp
  // is used to reject tokens issued before that time.
  if (!process.env['REDIS_URL']) {
    try {
      const decoded = jwt.decode(token) as { id?: string; iat?: number } | null;
      if (decoded?.id) {
        const { findById } = await import('../data/users.store');
        const user = await findById(decoded.id);
        if (user?.loggedOutAt) {
          const issuedAt     = decoded.iat ? decoded.iat * 1000 : 0;
          const loggedOutTime = new Date(user.loggedOutAt).getTime();
          if (issuedAt < loggedOutTime) {
            ApiResponse.error(res, 'Unauthorized', 401);
            return;
          }
        }
      }
    } catch {
      // Non-fatal — let the request continue
    }
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    ApiResponse.error(res, 'Unauthorized', 401);
  }
}

/**
 * Optional auth — populates req.user when a valid Bearer token is present,
 * but never rejects the request. Used on routes that have both public and
 * authenticated behaviours (e.g. GET /api/subjects filters by board when
 * the user is logged in, falls back to 'maharashtra' when not).
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      if (token && !(await isTokenRevoked(token))) {
        req.user = verifyToken(token);
      }
    } catch {
      // Invalid token — treat as unauthenticated; do not reject
    }
  }
  next();
}
