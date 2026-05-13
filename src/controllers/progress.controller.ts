import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { markChapterComplete, getProgressStats } from '../data/progress.store';
import { updateStreak } from '../utils/streak';
import logger from '../utils/logger';

// POST /api/progress/chapter-done
export const completeChapter = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { subjectId, chapterId, score } = req.body as {
      subjectId?: unknown;
      chapterId?: unknown;
      score?: unknown;
    };

    if (typeof subjectId !== 'string' || !subjectId.trim()) {
      ApiResponse.error(res, 'subjectId is required', 400);
      return;
    }
    if (typeof chapterId !== 'string' || !chapterId.trim()) {
      ApiResponse.error(res, 'chapterId is required', 400);
      return;
    }
    const resolvedScore =
      typeof score === 'number' && score >= 0 && score <= 100
        ? score
        : undefined;

    const progress = await markChapterComplete(
      userId,
      subjectId.trim(),
      chapterId.trim(),
      resolvedScore
    );

    try {
      await updateStreak(userId);
    } catch (err) {
      logger.warn('[streak] Failed to update streak after chapter complete');
    }
    const stats = await getProgressStats(userId);
    ApiResponse.success(res, { progress, streakCount: stats.streakCount }, 201);
  }
);

// GET /api/progress/stats
export const fetchStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const stats = await getProgressStats(userId);
    ApiResponse.success(res, stats);
  }
);
