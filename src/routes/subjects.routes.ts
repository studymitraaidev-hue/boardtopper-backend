import { Router } from 'express';
import { listSubjects, getSubject, listChapters } from '../controllers/subjects.controller';
import { optionalAuthenticate, authenticate } from '../middleware/auth.middleware';
import { getSubjectPYQs } from '../controllers/pyqs.controller';

const router = Router();

// GET /api/subjects — optional auth: when token present, filters by user board
router.get('/', optionalAuthenticate, listSubjects);

// GET /api/subjects/:id
router.get('/:id', getSubject);

// GET /api/subjects/:id/chapters
router.get('/:id/chapters', listChapters);

// GET /api/subjects/:subjectId/pyqs — PYQs across all chapters of subject
router.get('/:subjectId/pyqs', authenticate, getSubjectPYQs);

export default router;
