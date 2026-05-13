import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSchedule, toggleItem, addItem, deleteItem } from '../controllers/schedule.controller';

const router = Router();

// All schedule routes require authentication
router.use(authenticate);

// GET  /api/schedule
router.get('/', getSchedule);

// POST /api/schedule
router.post('/', addItem);

// PATCH /api/schedule/:id/toggle
router.patch('/:id/toggle', toggleItem);

// DELETE /api/schedule/:id
router.delete('/:id', deleteItem);

export default router;
