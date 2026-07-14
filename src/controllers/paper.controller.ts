import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { buildPaper } from '../services/paper_builder.service';
import logger from '../utils/logger';

/**
 * POST /api/papers/build
 * Build a practice paper from real PYQs + AI fill-in
 * Body: { subjectId: string, chapterIds: string[], mode: 'quick' | 'final' }
 */
export const buildPaperHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      ApiResponse.error(res, 'Unauthorized', 401);
      return;
    }

    const { subjectId, chapterIds, mode } = req.body as {
      subjectId?: string;
      chapterIds?: string[];
      mode?: 'quick' | 'final';
    };

    // Validation
    if (!subjectId || !chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      ApiResponse.error(res, 'subjectId and chapterIds (array) are required', 400);
      return;
    }

    const validMode = mode === 'final' ? 'final' : 'quick';

    logger.info(`[PaperBuild] User ${userId} building ${validMode} paper for ${subjectId}, chapters: ${chapterIds.join(', ')}`);

    const paper = await buildPaper(subjectId, chapterIds, validMode);

    if (!paper) {
      ApiResponse.error(res, 'Failed to build paper — subject blueprint not found or insufficient data', 404);
      return;
    }

    ApiResponse.success(res, {
      paper,
      message: validMode === 'quick' 
        ? '⚡ Quick Raid paper assembled! Defeat this mini-boss to unlock the Final Boss.' 
        : '👑 Final Boss Exam ready! This is the real deal — full board paper format.',
    });
  }
);

/**
 * GET /api/papers/subjects
 * List subjects available for paper building (those with blueprints)
 */
export const getPaperSubjects = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subjects = [
      { id: 'algebra', name: 'Algebra', emoji: '📐', boss: 'Algebra Dragon', available: true },
      { id: 'geometry', name: 'Geometry', emoji: '📏', boss: 'Geometry Titan', available: true },
      { id: 'science1', name: 'Science Part 1', emoji: '⚗️', boss: 'Physics Phantom', available: true },
      { id: 'science2', name: 'Science Part 2', emoji: '🌿', boss: 'Bio Beast', available: true },
      { id: 'english', name: 'English', emoji: '📖', boss: 'Literature Leviathan', available: true },
      { id: 'history', name: 'History & Pol Sc', emoji: '🏛️', boss: 'History Hydra', available: false },
      { id: 'geography', name: 'Geography', emoji: '🌍', boss: 'Geo Golem', available: false },
    ];

    ApiResponse.success(res, { subjects });
  }
);
