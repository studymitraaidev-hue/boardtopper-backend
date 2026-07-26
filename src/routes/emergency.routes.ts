import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePro } from '../middleware/requirePro';
import { requireProOrTrial } from '../middleware/requireProOrTrial';
import { emergencyLimiter } from '../middleware/rateLimiter';
import { getEmergency, getLikelyQuestions, getQuickChapters } from '../controllers/emergency.controller';
import { getSmartEmergency } from '../controllers/smart_emergency.controller';

const router = Router();

router.get('/', authenticate, requireProOrTrial, emergencyLimiter, getEmergency);
router.get('/likely-questions', authenticate, requirePro, getLikelyQuestions);
router.get('/quick-chapters', authenticate, getQuickChapters);

router.get('/smart', authenticate, getSmartEmergency);

export default router;
