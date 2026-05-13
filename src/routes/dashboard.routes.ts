import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard — authenticated, returns real user-specific data
router.get('/', authenticate, getDashboard);

export default router;
