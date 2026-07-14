import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { buildPaperHandler, getPaperSubjects } from '../controllers/paper.controller';

const router = Router();

// GET /api/papers/subjects — list available subjects for paper building
router.get('/subjects', authenticate, getPaperSubjects);

// POST /api/papers/build — assemble a paper from PYQs + AI
router.post('/build', authenticate, buildPaperHandler);

export default router;
