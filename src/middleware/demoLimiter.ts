import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const demoLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response): void => {
    res.status(403).json({
      data: null,
      error: 'Free demo used. Sign up for 3 more free doubts every hour.',
    });
  },
});
