import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import supabase from '../config/supabase';
import { findById } from '../data/users.store';
import { createNotification } from '../data/notifications.store';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  totalNotes: number;
  recentNotes: { id: string; title: string; updated_at: string }[];
  recentActivity: { type: 'note' | 'doubt'; title: string; date: string }[];
  weakTopics: { topic: string }[];
}

// ─── GET /api/dashboard ───────────────────────────────────────────────────────

export const getDashboard = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // Single query for user_notes — derives totalNotes, recentNotes, recentActivity
    const { data: userNotesData, count: userNotesCount } = await supabase
      .from('user_notes')
      .select('id, title, updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    const allUserNotes = (userNotesData ?? []) as { id: string; title: string; updated_at: string }[];
    const totalNotes   = userNotesCount ?? 0;
    const recentNotes  = allUserNotes.slice(0, 3).map((n) => ({
      id:         n.id,
      title:      n.title,
      updated_at: n.updated_at,
    }));
    const recentActivity = allUserNotes.map((n) => ({
      type:  'note' as const,
      title: n.title,
      date:  n.updated_at,
    }));

    // Weak topics — direct await (single query, no need for Promise.allSettled)
    const doubtTopicsResult = await supabase
      .from('doubt_topics')
      .select('topic, subject_id, count')
      .eq('user_id', userId)
      .order('count', { ascending: false })
      .limit(5);

    const weakTopics = (!doubtTopicsResult.error && Array.isArray(doubtTopicsResult.data))
      ? (doubtTopicsResult.data as { topic: string; subject_id: string; count: number }[]).map((d) => ({
          topic: d.topic,
        }))
      : [];

    const payload: DashboardResponse = {
      totalNotes,
      recentNotes,
      recentActivity,
      weakTopics,
    };

    ApiResponse.success(res, payload);

    setImmediate(async () => {
      try {
        const user = await findById(userId);
        if (!user) return;

        // Exam reminder: notify when exam is exactly 7 days away
        if (user.examDate) {
          const examDate = new Date(user.examDate);
          const today    = new Date();
          today.setHours(0, 0, 0, 0);
          const daysUntil = Math.round((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntil === 7) {
            await createNotification(
              userId,
              'exam_reminder',
              '⏰ 7 days to your exam!',
              'Your exam is in 7 days. Switch to Emergency Mode for rapid revision of your weakest topics.'
            );
          }
        }

        // Streak at risk: if the user has a streak and has not been active today
        if ((user.streakCount ?? 0) > 0) {
          const today      = new Date().toISOString().slice(0, 10);
          const lastActive = user.lastActiveDate ?? '';
          if (lastActive !== today) {
            await createNotification(
              userId,
              'streak_at_risk',
              `🔥 Your ${user.streakCount}-day streak is at risk!`,
              'You haven\'t studied today yet. Complete any activity to keep your streak alive.'
            );
          }
        }
      } catch (err) {
        logger.warn('[notifications] Failed to generate auto-notifications', err);
      }
    });
  }
);

