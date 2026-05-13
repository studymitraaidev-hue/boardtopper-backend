import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { quizLimiter } from '../middleware/rateLimiter';
import { submitAttempt, listAttempts, averageScore, quizStats, recentAttempts } from '../controllers/quiz.controller';
import { generateQuiz } from '../controllers/quiz_generate.controller';

const router = Router();

router.post('/attempt',  authenticate, quizLimiter, submitAttempt);
router.get('/attempts',  authenticate, listAttempts);
router.get('/average',   authenticate, averageScore);
router.get('/stats',     authenticate, quizStats);
router.get('/recent',    authenticate, recentAttempts);
// GET /api/quiz/generate — AI-generated MCQs (cached 7 days)
router.get('/generate', authenticate, generateQuiz);

export default router;
