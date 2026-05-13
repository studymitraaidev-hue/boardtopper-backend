import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';  // FIX: was '../middleware/auth' — file doesn't exist
import { aiLimiter } from '../middleware/rateLimiter';
import { checkLivePlan } from '../middleware/checkLivePlan';
import {
  askDoubt,
  askDoubtWithImage,
  uploadSingle,
  getConversationHistory,
  clearConversationHistory,
} from '../controllers/ai.controller';

const router = Router();

// All AI routes are protected — authenticate first, then rate-limit free users
// Order: authenticate → checkLivePlan (corrects JWT plan with live DB) → aiLimiter → handler
router.post('/ask', authenticate, checkLivePlan, aiLimiter, askDoubt);
router.post(
  '/doubt-image',
  authenticate,
  checkLivePlan,
  aiLimiter,
  uploadSingle,
  askDoubtWithImage
);
router.get('/history', authenticate, getConversationHistory);
router.delete('/history', authenticate, clearConversationHistory);

export default router;
