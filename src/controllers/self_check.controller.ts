import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import supabase from '../config/supabase';
import logger from '../utils/logger';

interface SelfCheckPayload {
  subjectId: string;
  checks: {
    questionId: string;
    marksAwarded: number;
    marksPossible: number;
  }[];
}

/**
 * POST /api/self-checks
 * Record student's honest self-marking after review
 */
export const submitSelfChecks = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      ApiResponse.error(res, 'Unauthorized', 401);
      return;
    }

    const { subjectId, checks } = req.body as SelfCheckPayload;

    if (!subjectId || !Array.isArray(checks) || checks.length === 0) {
      ApiResponse.error(res, 'subjectId and checks array are required', 400);
      return;
    }

    const rows = checks.map(c => ({
      user_id: userId,
      subject_id: subjectId,
      paper_question_id: c.questionId,
      marks_awarded: c.marksAwarded,
      marks_possible: c.marksPossible,
    }));

    const { error } = await supabase.from('answer_self_checks').insert(rows);

    if (error) {
      logger.error('[SelfCheck] Insert failed:', error.message);
      ApiResponse.error(res, 'Failed to save self-checks', 500);
      return;
    }

    logger.info(`[SelfCheck] User ${userId} submitted ${checks.length} self-checks for ${subjectId}`);
    ApiResponse.success(res, { message: 'Self-checks recorded' });
  }
);

/**
 * GET /api/self-checks/stats
 * Get aggregated self-check stats for the user
 */
export const getSelfCheckStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      ApiResponse.error(res, 'Unauthorized', 401);
      return;
    }

    const { data, error } = await supabase
      .from('answer_self_checks')
      .select('subject_id, marks_awarded, marks_possible')
      .eq('user_id', userId);

    if (error) {
      logger.error('[SelfCheck] Stats fetch failed:', error.message);
      ApiResponse.error(res, 'Failed to fetch stats', 500);
      return;
    }

    const stats: Record<string, { totalAwarded: number; totalPossible: number; count: number }> = {};
    (data || []).forEach((row: any) => {
      const sid = row.subject_id;
      if (!stats[sid]) stats[sid] = { totalAwarded: 0, totalPossible: 0, count: 0 };
      stats[sid].totalAwarded += row.marks_awarded;
      stats[sid].totalPossible += row.marks_possible;
      stats[sid].count += 1;
    });

    ApiResponse.success(res, { stats });
  }
);
