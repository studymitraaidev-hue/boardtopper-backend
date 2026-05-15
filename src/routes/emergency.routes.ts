import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePro } from '../middleware/requirePro';
import { emergencyLimiter } from '../middleware/rateLimiter';
import { getEmergency, getLikelyQuestions } from '../controllers/emergency.controller';

const router = Router();

router.get('/', authenticate, requirePro, emergencyLimiter, getEmergency);
router.get('/likely-questions', authenticate, requirePro, getLikelyQuestions);

export default router;
