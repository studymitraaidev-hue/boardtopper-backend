import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getContent } from '../controllers/chapter_content.controller';
import { getChapterPYQs } from '../controllers/pyqs.controller';

const router = Router();

// GET /api/chapters/:chapterId/content
// Returns Maharashtra SSC board content for a specific chapter
router.get('/:chapterId/content', authenticate, getContent);

// GET /api/chapters/:chapterId/pyqs — PYQs for a chapter
router.get('/:chapterId/pyqs', authenticate, getChapterPYQs);

export default router;
