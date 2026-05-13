import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { findByEmail, createUser, updateUser } from '../data/users.store';
import { signToken } from '../utils/jwt';
import { toAuthUser } from '../controllers/auth.controller';
import config from '../config/env';
import logger from '../utils/logger';
import { createRefreshToken } from '../data/refresh_tokens.store';

/**
 * POST /api/auth/oauth/google
 */
export const googleOAuth = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { access_token } = req.body as { access_token?: string };

    if (!access_token || typeof access_token !== 'string' ||
        access_token.trim().length === 0) {
      ApiResponse.error(res, 'access_token is required', 400);
      return;
    }

    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('[OAuth] SUPABASE_SERVICE_ROLE_KEY is not set');
      ApiResponse.error(res, 'OAuth is not configured on this server', 503);
      return;
    }

    const adminClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user: supaUser }, error: verifyError } =
      await adminClient.auth.getUser(access_token);

    if (verifyError || !supaUser) {
      logger.warn(`[OAuth] Token verification failed: ${verifyError?.message}`);
      ApiResponse.error(res, 'Invalid or expired OAuth token', 401);
      return;
    }

    const email = supaUser.email;
    const name  = (supaUser.user_metadata?.['full_name'] as string | undefined)
               || (supaUser.user_metadata?.['name']      as string | undefined)
               || email?.split('@')[0]
               || 'Student';

    if (!email) {
      ApiResponse.error(res, 'Google account has no email address', 400);
      return;
    }

    // ── Create or fetch user in our users table ────────────────────────────
    let appUser = await findByEmail(email);

    if (!appUser) {
      // First time — create the user record.
      appUser = await createUser({
        name,
        email,
        passwordHash: '',   // empty — OAuth users have no password
      });
      // Google has already verified the email — auto-verify new OAuth users
      await updateUser(appUser.id, { emailVerified: true, emailVerifyToken: null });
      // Refresh appUser to get updated emailVerified state
      const refreshed = await findByEmail(email);
      if (refreshed) appUser = refreshed;
    } else {
      // Existing OAuth user — ensure email is verified (Google already verified it)
      if (!appUser.emailVerified) {
        await updateUser(appUser.id, { emailVerified: true, emailVerifyToken: null });
        const refreshed = await findByEmail(email);
        if (refreshed) appUser = refreshed;
      }
    }

    if (!appUser) {
      logger.error(`[OAuth] Failed to create/fetch user for email: ${email}`);
      ApiResponse.error(res, 'Failed to create user account', 500);
      return;
    }

    // ── Issue our own app JWT ──────────────────────────────────────────────
    const accessToken = signToken({
      id:    appUser.id,
      email: appUser.email,
      plan:  appUser.plan,
    });

    let refreshToken: string | undefined;
    try {
      refreshToken = await createRefreshToken(appUser.id);
    } catch (err) {
      logger.error(`[OAuth] Failed to create refresh token: ${(err as Error).message}`);
    }

    const isNew = !appUser.onboardingComplete;

    logger.info(`[OAuth] Google login success for ${email} (new: ${isNew})`);

    ApiResponse.success(res, {
      token: accessToken,
      ...(refreshToken ? { refreshToken } : {}),
      user:  toAuthUser(appUser),
      isNew,
    }, 200);
  }
);
