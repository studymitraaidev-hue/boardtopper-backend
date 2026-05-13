import supabase from '../config/supabase';
import { getAverageScore } from './quiz_attempts.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredProgress {
  id: string;
  userId: string;
  subjectId: string;
  chapterId: string;
  completedAt: Date;
  score: number | null;
}

export interface ProgressStats {
  totalCompleted: number;
  streakCount: number;
  bySubject: Record<string, number>;
  recentActivity: StoredProgress[];
  mockScoreAvg: number | null;
  doubtsSolved: number;             // real count of user messages sent to AI
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface ProgressRow {
  id: string;
  user_id: string;
  subject_id: string;
  chapter_id: string;
  completed_at: string;
  score: number | null;
}

function toStoredProgress(row: ProgressRow): StoredProgress {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    chapterId: row.chapter_id,
    completedAt: new Date(row.completed_at),
    score: row.score ?? null,
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function markChapterComplete(
  userId: string,
  subjectId: string,
  chapterId: string,
  score?: number
): Promise<StoredProgress> {
  const { data, error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,
        subject_id: subjectId,
        chapter_id: chapterId,
        completed_at: new Date().toISOString(),
        score: score ?? null,
      },
      { onConflict: 'user_id,chapter_id' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save progress');
  return toStoredProgress(data as ProgressRow);
}

export async function getUserProgress(userId: string): Promise<StoredProgress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toStoredProgress(r as ProgressRow));
}

// Fetches only the 5 most recent progress records — used for the dashboard feed.
async function getRecentActivity(userId: string): Promise<StoredProgress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error) return [];
  return (data ?? []).map((r) => toStoredProgress(r as ProgressRow));
}

// Returns total chapters completed — uses COUNT so no rows are loaded.
async function getTotalCompleted(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}

async function getDoubtCount(userId: string): Promise<number> {
  // Count only 'user' role messages — each one is a doubt asked to the AI
  const { count, error } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user');

  if (error) return 0; // non-fatal — dashboard should still load
  return count ?? 0;
}

export async function getProgressStats(userId: string): Promise<ProgressStats> {
  // Run all independent queries in parallel
  const [all, mockScoreAvg, doubtsSolved, recentActivity, totalCompleted] =
    await Promise.all([
      getUserProgress(userId),       // needed for streak + bySubject calculation
      getAverageScore(userId),
      getDoubtCount(userId),
      getRecentActivity(userId),     // DB-limited to 5 — no JS slice
      getTotalCompleted(userId),     // DB COUNT — no rows loaded
    ]);

  const bySubject: Record<string, number> = {};
  for (const p of all) {
    bySubject[p.subjectId] = (bySubject[p.subjectId] ?? 0) + 1;
  }

  // Streak: count consecutive days with activity, backwards from today
  const todayStr   = new Date().toISOString().slice(0, 10);
  const activeDays = new Set(all.map((p) => p.completedAt.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const dayStr = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(dayStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalCompleted,
    streakCount: streak,
    bySubject,
    recentActivity,
    mockScoreAvg,
    doubtsSolved,
  };
}
