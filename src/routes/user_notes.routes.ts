import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listUserNotes,
  createUserNoteHandler,
  updateUserNoteHandler,
  deleteUserNoteHandler,
} from '../controllers/user_notes.controller';

const router = Router();

// All routes require authentication
router.get('/',    authenticate, listUserNotes);
router.post('/',   authenticate, createUserNoteHandler);
router.put('/:id', authenticate, updateUserNoteHandler);
router.delete('/:id', authenticate, deleteUserNoteHandler);

export default router;
