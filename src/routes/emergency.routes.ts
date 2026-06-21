import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePro } from '../middleware/requirePro';
import { requireProOrTrial } from '../middleware/requireProOrTrial';
import { emergencyLimiter } from '../middleware/rateLimiter';
import { getEmergency, getLikelyQuestions } from '../controllers/emergency.controller';

const router = Router();

router.get('/', authenticate, requireProOrTrial, emergencyLimiter, getEmergency);
router.get('/likely-questions', authenticate, requirePro, getLikelyQuestions);

export default router;
