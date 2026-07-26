import supabase from '../config/supabase';
import logger from '../utils/logger';
import { getSubjectById } from './subjects.store';
import { getChapterById } from './chapters.store';
import { getUserProgress } from './progress.store';
import { getQuizAttempts, getSubjectBreakdown } from './quiz_attempts.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChapterWeakness {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  score: number;           // 0-100, lower = weaker
  attempts: number;        // how many times practiced
  lastAttempted: string | null; // ISO date
  trend: 'improving' | 'declining' | 'stable';
}

export interface WeaknessReport {
  overallScore: number;    // 0-100 average across all chapters
  weakChapters: ChapterWeakness[];  // sorted weakest first, top 5
  strongChapters: ChapterWeakness[]; // sorted strongest first, top 3
  subjectAverages: Record<string, number>;
}

export interface ChapterHeatmap {
  chapterId: string;
  chapterName: string;
  frequency: number;        // how many times appeared in PYQs
  totalMarks: number;     // cumulative marks from PYQs
  avgMarks: number;       // average marks per appearance
  lastAppeared: number;   // most recent year
  likelihood: 'very_high' | 'high' | 'medium' | 'low';
  trend: 'rising' | 'falling' | 'stable'; // marks trend over years
}

export interface HeatmapReport {
  subjectId: string;
  subjectName: string;
  chapters: ChapterHeatmap[];
  hotChapters: ChapterHeatmap[];      // top 5 by likelihood
  totalPYQs: number;
}

// ─── Weakness Detection ─────────────────────────────────────────────────────────

export async function getWeaknessReport(userId: string): Promise<WeaknessReport> {
  // Fetch all user progress + quiz attempts in parallel
  const [progress, quizBreakdown] = await Promise.all([
    getUserProgress(userId),
    getSubjectBreakdown(userId),
  ]);

  // Group progress by chapter to calculate per-chapter scores
  const chapterMap = new Map<string, {
    scores: number[];
    attempts: number;
    lastAttempted: Date | null;
  }>();

  for (const p of progress) {
    const key = p.chapterId;
    const existing = chapterMap.get(key) ?? { scores: [], attempts: 0, lastAttempted: null };
    if (p.score !== null) {
      existing.scores.push(p.score);
    }
    existing.attempts += 1;
    if (!existing.lastAttempted || p.completedAt > existing.lastAttempted) {
      existing.lastAttempted = p.completedAt;
    }
    chapterMap.set(key, existing);
  }

  // Build chapter weakness list
  const chapters: ChapterWeakness[] = [];
  for (const [chapterId, data] of chapterMap) {
    const avgScore = data.scores.length > 0
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : 50; // default neutral if no score recorded

    // Get names
    const chapter = await getChapterById(chapterId);
    const subject = chapter ? await getSubjectById(chapter.subjectId) : null;

    chapters.push({
      chapterId,
      chapterName: chapter?.name ?? 'Unknown Chapter',
      subjectId: chapter?.subjectId ?? 'unknown',
      subjectName: subject?.name ?? 'Unknown Subject',
      score: avgScore,
      attempts: data.attempts,
      lastAttempted: data.lastAttempted?.toISOString() ?? null,
      trend: 'stable', // TODO: calculate from score history
    });
  }

  // Sort by score (ascending = weakest first)
  const sorted = chapters.sort((a, b) => a.score - b.score);
  const weakChapters = sorted.slice(0, 5);
  const strongChapters = [...sorted].reverse().slice(0, 3);

  // Calculate overall score
  const overallScore = chapters.length > 0
    ? Math.round(chapters.reduce((sum, c) => sum + c.score, 0) / chapters.length)
    : 0;

  // Subject averages from quiz attempts
  const subjectAverages: Record<string, number> = {};
  for (const s of quizBreakdown) {
    subjectAverages[s.subjectId] = s.averageScore;
  }

  return {
    overallScore,
    weakChapters,
    strongChapters,
    subjectAverages,
  };
}

// ─── PYQ Heatmap ────────────────────────────────────────────────────────────────

export async function getChapterHeatmap(subjectId: string): Promise<HeatmapReport> {
  const { data, error } = await supabase
    .from('pyqs')
    .select('chapter_id, year, marks, appeared_count')
    .eq('subject_id', subjectId);

  if (error || !data) {
    logger.warn(`[Heatmap] fetch error for subject ${subjectId}: ${error?.message}`);
    return { subjectId, subjectName: '', chapters: [], hotChapters: [], totalPYQs: 0 };
  }

  // Group by chapter
  const chapterMap = new Map<string, {
    years: number[];
    marks: number[];
    appearedCount: number;
  }>();

  for (const row of data as any[]) {
    const cid = row.chapter_id;
    const existing = chapterMap.get(cid) ?? { years: [], marks: [], appearedCount: 0 };
    existing.years.push(row.year);
    existing.marks.push(row.marks);
    existing.appearedCount += row.appeared_count ?? 1;
    chapterMap.set(cid, existing);
  }

  const subject = await getSubjectById(subjectId);

  const chapters: ChapterHeatmap[] = [];
  for (const [chapterId, data] of chapterMap) {
    const chapter = await getChapterById(chapterId);
    const frequency = data.years.length;
    const totalMarks = data.marks.reduce((a: number, b: number) => a + b, 0);
    const avgMarks = Math.round(totalMarks / frequency);
    const lastAppeared = Math.max(...data.years);
    const firstAppeared = Math.min(...data.years);
    const yearSpan = lastAppeared - firstAppeared || 1;

    // Likelihood: appeared frequently AND recently
    const recency = (new Date().getFullYear() - lastAppeared);
    const likelihoodScore = (frequency * 10) + (avgMarks * 2) - (recency * 5);
    
    let likelihood: ChapterHeatmap['likelihood'];
    if (likelihoodScore > 80) likelihood = 'very_high';
    else if (likelihoodScore > 50) likelihood = 'high';
    else if (likelihoodScore > 20) likelihood = 'medium';
    else likelihood = 'low';

    // Trend: compare recent years vs older years
    const midPoint = firstAppeared + Math.floor(yearSpan / 2);
    const recentMarks = data.marks.filter((_: any, i: number) => data.years[i] >= midPoint);
    const oldMarks = data.marks.filter((_: any, i: number) => data.years[i] < midPoint);
    const recentAvg = recentMarks.length > 0 ? recentMarks.reduce((a: number, b: number) => a + b, 0) / recentMarks.length : 0;
    const oldAvg = oldMarks.length > 0 ? oldMarks.reduce((a: number, b: number) => a + b, 0) / oldMarks.length : 0;
    
    let trend: ChapterHeatmap['trend'];
    if (recentAvg > oldAvg * 1.2) trend = 'rising';
    else if (recentAvg < oldAvg * 0.8) trend = 'falling';
    else trend = 'stable';

    chapters.push({
      chapterId,
      chapterName: chapter?.name ?? 'Unknown',
      frequency,
      totalMarks,
      avgMarks,
      lastAppeared,
      likelihood,
      trend,
    });
  }

  // Sort by likelihood score descending
  const sorted = chapters.sort((a, b) => {
    const scoreA = (a.frequency * 10) + (a.avgMarks * 2);
    const scoreB = (b.frequency * 10) + (b.avgMarks * 2);
    return scoreB - scoreA;
  });

  return {
    subjectId,
    subjectName: subject?.name ?? 'Unknown',
    chapters: sorted,
    hotChapters: sorted.slice(0, 5),
    totalPYQs: data.length,
  };
}
