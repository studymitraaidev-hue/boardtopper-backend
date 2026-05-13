import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listNotes,
  listRecentNotes,
  getNoteForChapter,
  getNoteByIdHandler,
} from '../controllers/notes.controller';

const router = Router();

// All notes routes require authentication
router.get('/',                  authenticate, listNotes);
router.get('/recent',            authenticate, listRecentNotes);
router.get('/chapter/:chapterId',authenticate, getNoteForChapter);
router.get('/:id',               authenticate, getNoteByIdHandler);

export default router;
