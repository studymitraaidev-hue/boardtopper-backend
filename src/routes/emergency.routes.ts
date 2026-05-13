import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePro } from '../middleware/requirePro';
import { emergencyLimiter } from '../middleware/rateLimiter';
import { getEmergency } from '../controllers/emergency.controller';

const router = Router();

// GET /api/emergency
// Auth chain: authenticate → requirePro → emergencyLimiter → handler
// - authenticate:    attaches req.user (401 if no/invalid JWT)
// - requirePro:      returns 403 for free-plan users
// - emergencyLimiter: 60 req/hr per user (defined in rateLimiter.ts)
router.get('/', authenticate, requirePro, emergencyLimiter, getEmergency);

export default router;
