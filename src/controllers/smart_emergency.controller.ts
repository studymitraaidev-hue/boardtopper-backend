import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { findById } from '../data/users.store';
import { getChapterHeatmap } from '../data/emergency.store';
import { getWeakSubjectNames, getSubjectBreakdown } from '../data/quiz_attempts.store';
import { getUserProgress } from '../data/progress.store';
import { getSubjectById } from '../data/subjects.store';
import { getChapterById } from '../data/chapters.store';
import logger from '../utils/logger';

interface ChapterWeakness {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  score: number;
  attempts: number;
  lastAttempted: string | null;
}

interface TimeBlockSession {
  subject: string;
  chapter: string;
  duration: number;
  priority: 'critical' | 'high' | 'medium';
  action: 'practice' | 'revise' | 'mock';
}

function calculateUrgency(examDate: string | null): string {
  if (!examDate) return 'unknown';
  const mins = Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 60000));
  if (mins <= 240) return 'panic';
  if (mins <= 720) return 'high';
  if (mins <= 2880) return 'medium';
  return 'low';
}

function buildTimeBlock(hoursLeft: number, weakChapters: ChapterWeakness[]) {
  const sessions: TimeBlockSession[] = [];
  const maxSessions = Math.min(weakChapters.length, 6);
  const sessionHours = Math.max(0.5, hoursLeft / Math.max(maxSessions, 3));

  for (let i = 0; i < maxSessions; i++) {
    const ch = weakChapters[i];
    const priority = ch.score < 40 ? 'critical' : ch.score < 60 ? 'high' : 'medium';
    sessions.push({
      subject: ch.subjectName,
      chapter: ch.chapterName,
      duration: Math.round(sessionHours * 60),
      priority,
      action: priority === 'critical' ? 'practice' : 'revise',
    });
  }

  return { hoursLeft, totalSessions: sessions.length, sessions };
}

export const getSmartEmergency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    const user = await findById(userId);
    if (!user) { ApiResponse.error(res, 'User not found', 404); return; }

    const hoursLeft = Number(req.query['hoursLeft'] || 12);
    const subjectId = String(req.query['subjectId'] || '');

    try {
      const [weakSubjectNames, quizBreakdown, progress] = await Promise.all([
        getWeakSubjectNames(userId),
        getSubjectBreakdown(userId),
        getUserProgress(userId),
      ]);

      const chapterMap = new Map<string, { scores: number[]; attempts: number; lastAttempted: Date | null }>();
      for (const p of progress) {
        const existing = chapterMap.get(p.chapterId) ?? { scores: [], attempts: 0, lastAttempted: null };
        if (p.score !== null) existing.scores.push(p.score);
        existing.attempts += 1;
        if (!existing.lastAttempted || p.completedAt > existing.lastAttempted) {
          existing.lastAttempted = p.completedAt;
        }
        chapterMap.set(p.chapterId, existing);
      }

      const allChapters: ChapterWeakness[] = [];
      for (const [chapterId, data] of chapterMap) {
        const avgScore = data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 50;
        const chapter = await getChapterById(chapterId);
        const subject = chapter ? await getSubjectById(chapter.subjectId) : null;
        allChapters.push({
          chapterId, chapterName: chapter?.name ?? 'Unknown',
          subjectId: chapter?.subjectId ?? 'unknown', subjectName: subject?.name ?? 'Unknown',
          score: avgScore, attempts: data.attempts,
          lastAttempted: data.lastAttempted?.toISOString() ?? null,
        });
      }

      const sorted = allChapters.sort((a, b) => a.score - b.score);
      const hasData = allChapters.length > 0 || quizBreakdown.length > 0;
      const overallScore = allChapters.length > 0
        ? Math.round(allChapters.reduce((s, c) => s + c.score, 0) / allChapters.length)
        : (quizBreakdown.length > 0
          ? Math.round(quizBreakdown.reduce((s, q) => s + q.averageScore, 0) / quizBreakdown.length)
          : 0);

      const subjectAverages: Record<string, number> = {};
      for (const s of quizBreakdown) subjectAverages[s.subjectId] = s.averageScore;

      const weaknessReport = {
        hasData, overallScore,
        weakChapters: sorted.slice(0, 5),
        strongChapters: [...sorted].reverse().slice(0, 3),
        weakSubjects: weakSubjectNames,
        subjectAverages,
      };

      const heatmapSubjectId = subjectId || weaknessReport.weakChapters[0]?.subjectId || 'algebra';
      let heatmap = null;
      try { heatmap = await getChapterHeatmap(heatmapSubjectId); } catch (e) { logger.warn('[SmartEmergency] Heatmap failed:', e); }

      const timeBlock = buildTimeBlock(hoursLeft, weaknessReport.weakChapters);

      const checklist = weaknessReport.weakChapters.map((ch) => ({
        title: ch.chapterName,
        content: `${ch.subjectName} — Score: ${ch.score}% (${ch.attempts} attempts)`,
        tag: ch.score < 40 ? 'Critical' : ch.score < 60 ? 'Weak' : 'Improving',
        priority: ch.score < 40 ? 'high' as const : 'normal' as const,
      }));

      if (weaknessReport.weakChapters.length === 0 && weaknessReport.weakSubjects.length > 0) {
        for (const name of weaknessReport.weakSubjects.slice(0, 3)) {
          checklist.push({ title: name, content: 'Weak subject from quiz performance. Start practicing!', tag: 'Weak Subject', priority: 'high' as const });
        }
      }

      ApiResponse.success(res, {
        mode: 'smart', checklist, weaknessReport, heatmap, timeBlock,
        userContext: {
          name: user.name || 'Student', examDate: user.examDate || null,
          weakSubjects: weakSubjectNames, streakCount: user.streakCount || 0,
          urgencyLevel: calculateUrgency(user.examDate),
        },
      });
    } catch (err) {
      logger.error('[SmartEmergency] Failed:', err);
      ApiResponse.error(res, 'Failed to generate smart emergency plan', 500);
    }
  }
);
