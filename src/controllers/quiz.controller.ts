import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { updateStreak } from '../utils/streak';
import logger from '../utils/logger';
import {
  createQuizAttempt,
  getQuizAttempts,
  getAverageScore,
  getAttemptCount,
  getBestScore,
  getSubjectBreakdown,
  getRecentAttempts,
} from '../data/quiz_attempts.store';

// POST /api/quiz/attempt
export const submitAttempt = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const { subjectId, score, totalQ, timeTaken } = req.body as {
      subjectId?: unknown;
      score?: unknown;
      totalQ?: unknown;
      timeTaken?: unknown;
    };

    if (typeof subjectId !== 'string' || !subjectId.trim()) {
      ApiResponse.error(res, 'subjectId is required', 400);
      return;
    }
    // Bug 4 fix: enforce integer — reject floats at the API boundary
    if (
      typeof score !== 'number' ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 100
    ) {
      ApiResponse.error(res, 'score must be an integer between 0 and 100', 400);
      return;
    }
    if (
      typeof totalQ !== 'number' ||
      !Number.isInteger(totalQ) ||
      totalQ < 1
    ) {
      ApiResponse.error(res, 'totalQ must be a positive integer', 400);
      return;
    }

    const resolvedTimeTaken =
      typeof timeTaken === 'number' &&
      Number.isInteger(timeTaken) &&
      timeTaken >= 0
        ? timeTaken
        : undefined;

    const attempt = await createQuizAttempt({
      userId,
      subjectId: subjectId.trim(),
      score,
      totalQ,
      timeTaken: resolvedTimeTaken,
    });

    try {
      await updateStreak(userId);
    } catch (err) {
      logger.warn('[streak] Failed to update streak after quiz submission');
    }

    ApiResponse.success(res, attempt, 201);
  }
);

// GET /api/quiz/attempts
export const listAttempts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const attempts = await getQuizAttempts(userId);
    ApiResponse.success(res, attempts);
  }
);

// GET /api/quiz/average
export const averageScore = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const avg = await getAverageScore(userId);
    ApiResponse.success(res, { averageScore: avg });
  }
);

// GET /api/quiz/stats
// Returns avg, best score, total count, subject breakdown, and weakest subject.
// Used by ExamSimulation dashboard panel.
export const quizStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // Run all queries in parallel — independent of each other
    const [averageScoreVal, bestScoreVal, totalAttempts, subjectBreakdown] = await Promise.all([
      getAverageScore(userId),
      getBestScore(userId),
      getAttemptCount(userId),
      getSubjectBreakdown(userId),
    ]);

    // Determine weakest subject (lowest average among subjects with at least 2 attempts)
    const eligible = subjectBreakdown.filter((s) => s.attempts >= 2);
    const weakestSubject = eligible.length > 0
      ? eligible.reduce((min, s) => s.averageScore < min.averageScore ? s : min).subjectId
      : null;

    ApiResponse.success(res, {
      averageScore:     averageScoreVal,
      bestScore:        bestScoreVal,
      totalAttempts,
      subjectBreakdown,
      weakestSubject,
    });
  }
);

// GET /api/quiz/recent
// Returns the last 10 quiz attempts for the score history chart.
export const recentAttempts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId  = req.user!.id;
    const limitRaw = req.query['limit'];
    const limit   = typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(parseInt(limitRaw, 10), 50)
      : 10;

    const attempts = await getRecentAttempts(userId, limit);
    ApiResponse.success(res, attempts);
  }
);
