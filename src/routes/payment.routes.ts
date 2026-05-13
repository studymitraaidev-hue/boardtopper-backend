import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getSubscriptionStatus,
  cancelSubscription,
} from '../controllers/payment.controller';

const router = Router();

// NOTE: The webhook route (POST /api/payments/webhook) is registered directly
// in app.ts BEFORE express.json() so the raw body is preserved for HMAC
// signature verification. It is NOT registered here.

// ─── Authenticated payment routes ─────────────────────────────────────────────
router.use(authenticate);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/subscription-status', getSubscriptionStatus);
router.post('/cancel-subscription', cancelSubscription);

export default router;
