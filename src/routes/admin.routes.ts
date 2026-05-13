import { Router } from 'express';
import { expireSubscriptions } from '../controllers/admin.controller';
import { adminLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/admin/expire-subscriptions
// Called by Railway cron job nightly. Authenticated by X-Admin-Secret header.
router.post('/expire-subscriptions', adminLimiter, expireSubscriptions);

export default router;
