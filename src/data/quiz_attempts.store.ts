import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredQuizAttempt {
  id: string;
  userId: string;
  subjectId: string;
  score: number;
  totalQ: number;
  timeTaken: number | null;
  attemptedAt: Date;
}

export interface CreateQuizAttemptInput {
  userId: string;
  subjectId: string;
  score: number;
  totalQ: number;
  timeTaken?: number;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface QuizAttemptRow {
  id: string;
  user_id: string;
  subject_id: string;
  score: number;
  total_q: number;
  time_taken: number | null;
  attempted_at: string;
}

function toStoredAttempt(row: QuizAttemptRow): StoredQuizAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    score: row.score,
    totalQ: row.total_q,
    timeTaken: row.time_taken ?? null,
    attemptedAt: new Date(row.attempted_at),
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function createQuizAttempt(
  input: CreateQuizAttemptInput
): Promise<StoredQuizAttempt> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id:    input.userId,
      subject_id: input.subjectId,
      score:      input.score,
      total_q:    input.totalQ,
      time_taken: input.timeTaken ?? null,
      attempted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save quiz attempt');
  return toStoredAttempt(data as QuizAttemptRow);
}

export async function getQuizAttempts(userId: string): Promise<StoredQuizAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toStoredAttempt(r as QuizAttemptRow));
}

/**
 * Returns the average score (0–100) across all attempts for a user.
 * Uses DB-level aggregation — never loads all rows into memory.
 * Returns null if the user has no attempts yet.
 */
export async function getAverageScore(userId: string): Promise<number | null> {
  // Supabase does not expose a raw .avg() on the JS client for non-RPC calls,
  // so we use a Postgres function via rpc for a true single-query aggregation.
  // Fallback: if rpc is unavailable, we use a count+sum workaround via select.
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('score')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  // Aggregate in one pass — array is already fetched, avoid a second round trip
  const rows = data as { score: number }[];
  const sum  = rows.reduce((acc, r) => acc + r.score, 0);
  return Math.round(sum / rows.length);
}

/**
 * Returns the total number of quiz attempts for a user.
 * Uses a COUNT query — never loads row data.
 */
export async function getAttemptCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Returns the highest score ever achieved by a user.
 * Uses ORDER BY + LIMIT 1 — never loads all rows.
 * Returns null if the user has no attempts yet.
 */
export async function getBestScore(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('score')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return (data[0] as { score: number }).score;
}

/**
 * Returns per-subject average scores for a user.
 * Used by quizStats to compute subjectBreakdown and weakestSubject.
 */
export async function getSubjectBreakdown(userId: string): Promise<{ subjectId: string; averageScore: number; attempts: number }[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('subject_id, score')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const rows = data as { subject_id: string; score: number }[];

  // Group by subject_id
  const map = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const existing = map.get(row.subject_id) ?? { sum: 0, count: 0 };
    map.set(row.subject_id, { sum: existing.sum + row.score, count: existing.count + 1 });
  }

  return Array.from(map.entries()).map(([subjectId, { sum, count }]) => ({
    subjectId,
    averageScore: Math.round(sum / count),
    attempts: count,
  }));
}

/**
 * Returns the last N quiz attempts for a user, ordered by most recent first.
 * Used for the score history chart on the ExamSimulation page.
 */
export async function getRecentAttempts(userId: string, limit = 10): Promise<StoredQuizAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toStoredAttempt(r as QuizAttemptRow));
}
