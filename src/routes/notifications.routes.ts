import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listNotifications,
  getUnreadNotificationCount,
  markRead,
} from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/',             listNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/:id/read',   markRead);

export default router;
