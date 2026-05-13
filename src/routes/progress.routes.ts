import { Router } from 'express';
import { completeChapter, fetchStats } from '../controllers/progress.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All progress routes require authentication
router.post('/chapter-done', authenticate, completeChapter);
router.get('/stats',         authenticate, fetchStats);

export default router;
