import { Router } from 'express';
import { submitSelfChecks, getSelfCheckStats } from '../controllers/self_check.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, submitSelfChecks);
router.get('/stats', authenticate, getSelfCheckStats);

export default router;
