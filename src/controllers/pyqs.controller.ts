import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getPYQsByChapter, getPYQsBySubject } from '../data/pyqs.store';

/**
 * GET /api/chapters/:chapterId/pyqs
 *
 * Returns all PYQs for a specific chapter sorted by year desc.
 * Returns empty array (not 404) when no PYQs exist — this is expected
 * for chapters that have not been seeded yet.
 *
 * Auth: requires Bearer token.
 */
export const getChapterPYQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { chapterId } = req.params as { chapterId: string };

    if (!chapterId || chapterId.trim().length === 0) {
      ApiResponse.error(res, 'chapterId param is required', 400);
      return;
    }

    const pyqs = await getPYQsByChapter(chapterId.trim());

    ApiResponse.success(res, {
      pyqs,
      total: pyqs.length,
      chapterId: chapterId.trim(),
    });
  }
);

/**
 * GET /api/subjects/:subjectId/pyqs
 *
 * Returns PYQs across all chapters of a subject (max 50).
 * Used for subject-level PYQ browsing.
 *
 * Auth: requires Bearer token.
 */
export const getSubjectPYQs = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { subjectId } = req.params as { subjectId: string };

    if (!subjectId || subjectId.trim().length === 0) {
      ApiResponse.error(res, 'subjectId param is required', 400);
      return;
    }

    const pyqs = await getPYQsBySubject(subjectId.trim());

    ApiResponse.success(res, {
      pyqs,
      total: pyqs.length,
      subjectId: subjectId.trim(),
    });
  }
);
