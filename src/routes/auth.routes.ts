import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification,
  refresh,
  getSessions,
  revokeSession,
  dataExport,
} from '../controllers/auth.controller';
import { googleOAuth } from '../controllers/oauth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Public routes — rate limited ─────────────────────────────────────────────
router.post('/register',       authLimiter, register);
router.post('/login',          authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password',  authLimiter, resetPassword);
router.post('/refresh',        refresh);

// POST /api/auth/oauth/google — Google OAuth session exchange
router.post('/oauth/google', authLimiter, googleOAuth);

// GET /api/auth/verify-email — PUBLIC: token is the credential
router.get('/verify-email', verifyEmail);

// ── Protected routes ─────────────────────────────────────────────────────────
router.post('/logout',                authenticate, logout);
router.get('/me',                     authenticate, getMe);
router.patch('/me',                   authenticate, updateMe);
router.patch('/me/password',          authenticate, changePassword);
router.delete('/me',                  authenticate, deleteAccount);
router.post('/resend-verification',   authenticate, resendVerification);

// DAY 38: Session management
router.get('/sessions',                   authenticate, getSessions);
router.delete('/sessions/:sessionId',     authenticate, revokeSession);

// DAY 39: DPDP data export
router.get('/me/data-export',             authenticate, dataExport);

export default router;
