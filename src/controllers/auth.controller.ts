import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { validateRegisterBody, validateLoginBody } from '../utils/validate';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken, revokeToken } from '../utils/jwt';
import {
  findByEmail,
  findById,
  findByResetToken,
  createUser,
  updateUser,
} from '../data/users.store';
import type { StoredUser } from '../data/users.store';
import {
  sendWelcomeEmail,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendResendVerificationEmail,
  sendAccountDeletionEmail,
} from '../services/email.service';
import type { AuthUser } from '../types/index';
import { logger } from '../utils/logger';
import supabase from '../config/supabase';
import {
  createRefreshToken,
  validateRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
  listUserSessions,
  deleteRefreshTokenById,
} from '../data/refresh_tokens.store';

// ─── Shape helpers ────────────────────────────────────────────────────────────

export function toAuthUser(user: StoredUser): AuthUser {
  return {
    id:            user.id,
    name:          user.name,
    email:         user.email,
    plan:          user.plan,
    board:         user.board,
    language:      user.language,
    targetPercent: user.targetPercent,
    weakSubjects:  user.weakSubjects,
    examDate:      user.examDate ?? null,
    emailVerified: user.emailVerified,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const input = validateRegisterBody(req.body);

    if (await findByEmail(input.email)) {
      ApiResponse.error(res, 'Email already registered', 409);
      return;
    }

    const passwordHash = await hashPassword(input.password);
    const user         = await createUser({ name: input.name, email: input.email, passwordHash });
    const accessToken  = signToken({ id: user.id, email: user.email, plan: user.plan });
    const deviceName   = ((req.headers['user-agent'] ?? 'Unknown Device') as string).slice(0, 150);
    const refreshToken = await createRefreshToken(user.id, deviceName);

    // Fire welcome email — never block response on email failure
    sendWelcomeEmail(user.email, user.name).catch((err: unknown) =>
      console.error('[Auth] Welcome email failed:', err),
    );

    // Generate verification token and send verification email
    const verifyToken = randomBytes(32).toString('hex');
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
    const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

    await updateUser(user.id, {
      emailVerifyToken: verifyToken,
    });

    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (err) {
      logger.warn('[email] Failed to send verification email on register', err);
    }

    ApiResponse.success(res, { token: accessToken, refreshToken, user: toAuthUser(user), isNew: true }, 201);
  },
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const input = validateLoginBody(req.body);

    const user = await findByEmail(input.email);
    if (!user) {
      ApiResponse.error(res, 'Invalid email or password', 401);
      return;
    }

    if (user.passwordHash === '') {
      ApiResponse.error(
        res,
        'This account was created with Google. Please sign in using the "Continue with Google" button.',
        401
      );
      return;
    }

    const match = await comparePassword(input.password, user.passwordHash);
    if (!match) {
      ApiResponse.error(res, 'Invalid email or password', 401);
      return;
    }
    if (!user.emailVerified) {
      ApiResponse.error(res, 'Please verify your email before logging in.', 403);
      return;
    }

    const accessToken  = signToken({ id: user.id, email: user.email, plan: user.plan });
    const deviceName   = ((req.headers['user-agent'] ?? 'Unknown Device') as string).slice(0, 150);
    const refreshToken = await createRefreshToken(user.id, deviceName);

    // Fire login notification email — never block response
    sendLoginNotificationEmail(user.email, user.name, new Date()).catch((err: unknown) =>
      console.error('[Auth] Login notification email failed:', err),
    );

    ApiResponse.success(res, { token: accessToken, refreshToken, user: toAuthUser(user) });
  },
);

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await revokeToken(authHeader.slice(7));
    }
    try {
      await deleteAllUserTokens(req.user!.id);
    } catch (err) {
      console.error('[Auth] Failed to delete refresh tokens on logout:', err);
    }

    // DAY 38: Postgres logged_out_at fallback — when Redis is not configured,
    // stamp the user record so the auth middleware can reject old tokens.
    const redisAvailable = !!process.env['REDIS_URL'];
    if (!redisAvailable) {
      try {
        await updateUser(req.user!.id, { loggedOutAt: new Date().toISOString() });
      } catch (err) {
        console.error('[Auth] Failed to write logged_out_at fallback:', err);
      }
    }

    ApiResponse.success(res, { message: 'Logged out successfully' });
  },
);

export const getMe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await findById(req.user!.id);
    if (!user) {
      ApiResponse.error(res, 'User not found', 404);
      return;
    }
    ApiResponse.success(res, { user: toAuthUser(user) });
  },
);

export const updateMe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const body   = req.body as Record<string, unknown>;

    if (body['board'] !== undefined && body['board'] !== 'maharashtra') {
      ApiResponse.error(
        res,
        `Invalid board "${String(body['board'])}". Only "maharashtra" is supported.`,
        400,
      );
      return;
    }

    const allowed: Partial<StoredUser> = {};

    if (typeof body['name'] === 'string' && body['name'].trim().length >= 2)
      allowed.name = body['name'].trim();

    if (body['board'] === 'maharashtra')
      allowed.board = 'maharashtra';

    if (
      body['language'] === 'english' ||
      body['language'] === 'marathi'  ||
      body['language'] === 'hindi'    ||
      body['language'] === 'semi'
    ) {
      allowed.language = body['language'];
    }

    if (
      typeof body['targetPercent'] === 'number' &&
      body['targetPercent'] >= 50 &&
      body['targetPercent'] <= 100
    ) {
      allowed.targetPercent = body['targetPercent'];
    }

    if (
      Array.isArray(body['weakSubjects']) &&
      body['weakSubjects'].every((s: unknown) => typeof s === 'string')
    ) {
      allowed.weakSubjects = body['weakSubjects'] as string[];
    }

    if (body['examDate'] !== undefined) {
      if (body['examDate'] === null) {
        allowed.examDate = null;
      } else if (
        typeof body['examDate'] === 'string' &&
        !isNaN(new Date(body['examDate']).getTime())
      ) {
        allowed.examDate = body['examDate'];
      }
    }

    const currentUser = await findById(userId);
    if (currentUser && !currentUser.onboardingComplete) {
      const willHaveBoard    = allowed.board         ?? currentUser.board;
      const willHaveLang     = allowed.language      ?? currentUser.language;
      const willHaveTarget   = allowed.targetPercent ?? currentUser.targetPercent;
      const willHaveExamDate = allowed.examDate !== undefined ? allowed.examDate : currentUser.examDate;

      if (willHaveBoard && willHaveLang && willHaveTarget !== undefined && willHaveExamDate) {
        allowed.onboardingComplete = true;
      }
    }

    const updated = await updateUser(userId, allowed);
    if (!updated) {
      ApiResponse.error(res, 'User not found', 404);
      return;
    }

    ApiResponse.success(res, { user: toAuthUser(updated) });
  },
);

// ─── Password reset ───────────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const email =
      typeof req.body['email'] === 'string'
        ? req.body['email'].toLowerCase().trim()
        : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ApiResponse.error(res, 'Valid email is required', 400);
      return;
    }

    const user = await findByEmail(email);
    if (!user) {
      ApiResponse.success(res, { message: 'If this email exists, a reset link has been sent.' });
      return;
    }

    const resetToken   = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await updateUser(user.id, { resetToken, resetTokenExpires: resetExpires });

    sendPasswordResetEmail(user.email, user.name, resetToken).catch((err: unknown) =>
      console.error('[Auth] Password reset email failed:', err),
    );

    ApiResponse.success(res, { message: 'If this email exists, a reset link has been sent.' });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body as { token?: unknown; password?: unknown };

    if (typeof token !== 'string' || token.length !== 64) {
      ApiResponse.error(res, 'Invalid or expired reset token', 400);
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      ApiResponse.error(res, 'Password must be at least 8 characters', 400);
      return;
    }

    const user = await findByResetToken(token);
    if (!user || !user.resetTokenExpires) {
      ApiResponse.error(res, 'Invalid or expired reset token', 400);
      return;
    }

    if (new Date(user.resetTokenExpires) < new Date()) {
      ApiResponse.error(res, 'Reset token has expired. Please request a new one.', 400);
      return;
    }

    const passwordHash = await hashPassword(password);

    await updateUser(user.id, {
      passwordHash,
      resetToken:        null,
      resetTokenExpires: null,
    });

    ApiResponse.success(res, { message: 'Password reset successful. You can now log in.' });
  },
);

// ─── Change password (authenticated) ─────────────────────────────────────────

export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: unknown;
      newPassword?:     unknown;
    };

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      ApiResponse.error(res, 'currentPassword and newPassword are required.', 400);
      return;
    }

    if (newPassword.length < 8) {
      ApiResponse.error(res, 'New password must be at least 8 characters.', 400);
      return;
    }

    if (currentPassword === newPassword) {
      ApiResponse.error(res, 'New password must be different from your current password.', 400);
      return;
    }

    const user = await findById(userId);
    if (!user) {
      ApiResponse.error(res, 'User not found.', 404);
      return;
    }

    if (user.passwordHash === '') {
      ApiResponse.error(res, 'This account uses Google sign-in. Password cannot be changed here.', 400);
      return;
    }

    const match = await comparePassword(currentPassword, user.passwordHash);
    if (!match) {
      ApiResponse.error(res, 'Current password is incorrect.', 401);
      return;
    }

    const hashedNew = await hashPassword(newPassword);

    const updated = await updateUser(userId, { passwordHash: hashedNew });
    if (!updated) {
      ApiResponse.error(res, 'Failed to update password.', 500);
      return;
    }

    ApiResponse.success(res, { message: 'Password updated successfully.' });
  },
);

// ─── Delete account (DPDP-compliant soft delete, authenticated) ───────────────

export const deleteAccount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const body   = req.body as Record<string, unknown>;

    const hasPassword      = typeof body['password'] === 'string';
    const hasConfirmGoogle = body['confirmGoogle'] === true;

    if (!hasPassword && !hasConfirmGoogle) {
      ApiResponse.error(res, 'Password confirmation is required to delete your account.', 400);
      return;
    }

    const user = await findById(userId);
    if (!user) {
      ApiResponse.error(res, 'User not found.', 404);
      return;
    }

    if (user.passwordHash === '') {
      if (!hasConfirmGoogle) {
        ApiResponse.error(res, 'Please confirm account deletion.', 400);
        return;
      }
    } else {
      if (!hasPassword || (body['password'] as string).length === 0) {
        ApiResponse.error(res, 'Password confirmation is required to delete your account.', 400);
        return;
      }
      const match = await comparePassword(body['password'] as string, user.passwordHash);
      if (!match) {
        ApiResponse.error(res, 'Password is incorrect.', 401);
        return;
      }
    }

    // Capture original email and name BEFORE anonymising
    const originalEmail = user.email;
    const originalName  = user.name;

    // DAY 39: 7-day cooling-off period
    const scheduledDeletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Anonymise user immediately and invalidate all tokens
    await updateUser(userId, {
      deletedAt:   new Date().toISOString(),
      email:       `pending_deletion_${userId}@deleted.boardtopper.ai`,
      name:        'Deleted User',
      loggedOutAt: new Date().toISOString(),
    });

    // Delete associated user data
    await supabase.from('notes').delete().eq('user_id', userId);
    await supabase.from('conversations').delete().eq('user_id', userId);
    await supabase.from('progress').delete().eq('user_id', userId);
    await supabase.from('schedule').delete().eq('user_id', userId);
    await supabase.from('user_notes').delete().eq('user_id', userId);
    await supabase.from('quiz_attempts').delete().eq('user_id', userId);

    // doubt_topics may not exist in all deployments — wrap in try/catch
    try {
      await supabase.from('doubt_topics').delete().eq('user_id', userId);
    } catch {
      // Table might not exist — non-fatal
    }

    // Anonymise (not delete) financial records as required by law
    await supabase
      .from('subscriptions')
      .update({ user_id: 'DELETED', status: 'cancelled' })
      .eq('user_id', userId);
    await supabase
      .from('payments')
      .update({ user_id: 'DELETED', email: 'deleted@deleted.com' })
      .eq('user_id', userId);

    // Revoke all refresh tokens
    await deleteAllUserTokens(userId).catch((err) =>
      console.error('[Auth] Failed to delete refresh tokens on account deletion:', err)
    );

    // Send deletion confirmation email (non-blocking)
    sendAccountDeletionEmail(originalEmail, originalName, scheduledDeletionDate).catch((err) =>
      console.error('[Auth] Deletion email failed:', err)
    );

    ApiResponse.success(res, {
      message: 'Account scheduled for deletion. You will receive a confirmation email.',
    });
  },
);

// ─── Email Verification ────────────────────────────────────────────────────────

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = (req.query['token'] as string | undefined)?.trim();

  if (!token || token.length < 10) {
    ApiResponse.error(res, 'Invalid verification token.', 400);
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email_verified, email_verify_token')
    .eq('email_verify_token', token)
    .maybeSingle();

  if (error || !data) {
    ApiResponse.error(res, 'Invalid or expired verification link.', 400);
    return;
  }

  if (data['email_verified'] === true) {
    ApiResponse.success(res, { message: 'Email already verified.' });
    return;
  }

  await supabase
    .from('users')
    .update({ email_verified: true, email_verify_token: null })
    .eq('id', data['id']);

  ApiResponse.success(res, { message: 'Email verified successfully.' });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const user = await findById(userId);
  if (!user) {
    ApiResponse.error(res, 'User not found.', 404);
    return;
  }

  if (user.emailVerified) {
    ApiResponse.error(res, 'Email is already verified.', 400);
    return;
  }

  const verifyToken = randomBytes(32).toString('hex');
  const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
  const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

  await updateUser(userId, { emailVerifyToken: verifyToken });

  try {
    await sendResendVerificationEmail(user.email, user.name, verifyUrl);
  } catch (err) {
    logger.warn('[email] Failed to send resend verification email', err);
  }

  ApiResponse.success(res, { message: 'Verification email sent.' });
});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body as { refreshToken?: unknown };

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    ApiResponse.error(res, 'Refresh token is required.', 400);
    return;
  }

  const userId = await validateRefreshToken(token.trim());

  if (!userId) {
    ApiResponse.error(res, 'Invalid or expired refresh token. Please log in again.', 401);
    return;
  }

  const user = await findById(userId);

  if (!user) {
    await deleteRefreshToken(token.trim());
    ApiResponse.error(res, 'User not found.', 401);
    return;
  }

  const newAccessToken = signToken({ id: user.id, email: user.email, plan: user.plan });

  ApiResponse.success(res, { token: newAccessToken });
});

// ─── Session Management (DAY 38) ─────────────────────────────────────────────

export const getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessions = await listUserSessions(req.user!.id);
  ApiResponse.success(res, sessions);
});

export const revokeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  if (!sessionId) {
    ApiResponse.error(res, 'Session ID is required', 400);
    return;
  }
  await deleteRefreshTokenById(sessionId, req.user!.id);
  ApiResponse.success(res, { message: 'Session revoked.' });
});

// ─── Data Export (DAY 39 — DPDP compliance) ──────────────────────────────────

export const dataExport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [
    userRow,
    notesData,
    conversationsData,
    progressData,
    quizData,
  ] = await Promise.allSettled([
    findById(userId),
    supabase.from('notes').select('*').eq('user_id', userId),
    supabase.from('conversations').select('*').eq('user_id', userId),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('quiz_attempts').select('*').eq('user_id', userId),
  ]);

  const exportPayload = {
    exportedAt:    new Date().toISOString(),
    user:          userRow.status === 'fulfilled' ? userRow.value : null,
    notes:         notesData.status === 'fulfilled' ? (notesData.value.data ?? []) : [],
    conversations: conversationsData.status === 'fulfilled' ? (conversationsData.value.data ?? []) : [],
    progress:      progressData.status === 'fulfilled' ? (progressData.value.data ?? []) : [],
    quizAttempts:  quizData.status === 'fulfilled' ? (quizData.value.data ?? []) : [],
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="boardtopper-data-export-${userId}.json"`);
  res.status(200).send(JSON.stringify(exportPayload, null, 2));
});
