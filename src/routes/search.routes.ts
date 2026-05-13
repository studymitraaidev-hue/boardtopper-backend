import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { searchAll } from '../controllers/search.controller';

const router = Router();

router.use(authenticate);
router.get('/', searchAll);

export default router;
