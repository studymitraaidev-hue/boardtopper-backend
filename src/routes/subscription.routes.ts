import { Router } from 'express';
import { runExpireCron } from '../controllers/subscription.controller';

const router = Router();

router.post('/expire-cron', runExpireCron);

export default router;
