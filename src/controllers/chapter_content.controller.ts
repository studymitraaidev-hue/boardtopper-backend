import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getChapterContent } from '../data/chapter_content.store';

/**
 * GET /api/chapters/:chapterId/content
 *
 * Returns the structured Maharashtra SSC content for a chapter.
 * Used by the AI controller and by the NotesGenerator frontend.
 * Returns 404 if chapter has no seeded content yet (expected for Day 12 —
 * only Maths chapters are seeded; Science/Social Science added in Day 13-14).
 *
 * Auth: requires Bearer token.
 */
export const getContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { chapterId } = req.params as { chapterId: string };

    if (!chapterId || chapterId.trim().length === 0) {
      ApiResponse.error(res, 'chapterId param is required', 400);
      return;
    }

    const content = await getChapterContent(chapterId.trim());

    if (!content) {
      ApiResponse.error(res, 'Content not available for this chapter yet', 404);
      return;
    }

    ApiResponse.success(res, { content });
  }
);
