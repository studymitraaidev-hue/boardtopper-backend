import supabase from '../config/supabase';

export interface GeneratedQuestion {
  id: string;
  chapterId: string;
  subjectId: string;
  question: string;
  options: string[];      // exactly 4 strings
  correctIndex: number;  // 0-3
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  createdAt: string;
  expiresAt: string;
}

interface DBRow {
  id: string;
  chapter_id: string;
  subject_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: string;
  marks: number;
  created_at: string;
  expires_at: string;
}

function toQuestion(row: DBRow): GeneratedQuestion {
  return {
    id:           row.id,
    chapterId:    row.chapter_id,
    subjectId:    row.subject_id,
    question:     row.question,
    options:      row.options as string[],
    correctIndex: row.correct_index,
    difficulty:  row.difficulty as 'easy' | 'medium' | 'hard',
    marks:        row.marks,
    createdAt:    row.created_at,
    expiresAt:    row.expires_at,
  };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fetch non-expired cached questions for a chapter (up to limit) */
export async function getCachedQuestions(
  chapterId: string,
  limit: number
): Promise<GeneratedQuestion[]> {
  const { data, error } = await supabase
    .from('generated_questions')
    .select('*')
    .eq('chapter_id', chapterId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit * 4);

  if (error || !data) return [];
  const all = (data as DBRow[]).map(toQuestion);
  return shuffleArray(all).slice(0, limit);
}

/** Delete expired questions for a chapter, then bulk insert new ones */
export async function saveGeneratedQuestions(
  questions: Omit<GeneratedQuestion, 'id' | 'createdAt' | 'expiresAt'>[]
): Promise<void> {
  if (questions.length === 0) return;

  // Reject dummy/fallback questions — never cache them
  questions = questions.filter(q =>
    !q.question.includes("temporarily unavailable") &&
    !q.question.startsWith("Practice question")
  );
  if (questions.length === 0) return;

  // Remove expired entries for this chapter first
  await supabase
    .from('generated_questions')
    .delete()
    .eq('chapter_id', questions[0].chapterId)
    .lt('expires_at', new Date().toISOString());

  // Set expiration to 24 hours from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  const rows = questions.map((q) => ({
    chapter_id:    q.chapterId,
    subject_id:    q.subjectId,
    question:      q.question,
    options:       q.options,
    correct_index: q.correctIndex,
    difficulty:    q.difficulty,
    marks:         q.marks,
    created_at:    createdAt,
    expires_at:    expiresAt,
  }));

  await supabase.from('generated_questions').insert(rows);
}

/** Fetch cached questions by subject (cross-chapter, for subject-level quiz) */
export async function getCachedQuestionsBySubject(
  subjectId: string,
  limit: number
): Promise<GeneratedQuestion[]> {
  const { data, error } = await supabase
    .from('generated_questions')
    .select('*')
    .eq('subject_id', subjectId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit * 4);

  if (error || !data) return [];
  const all = (data as DBRow[]).map(toQuestion);
  return shuffleArray(all).slice(0, limit);
}

/** Fetch cached questions by subject, ignoring expiry, with exclusion and true randomness */
export async function getCachedQuestionsBySubjectAny(
  subjectId: string,
  limit: number,
  excludeIds: string[] = []
): Promise<GeneratedQuestion[]> {
  const { data, error } = await supabase
    .from('generated_questions')
    .select('*')
    .eq('subject_id', subjectId)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .limit(200);

  if (error || !data || data.length === 0) return [];
  const all = (data as DBRow[]).map(toQuestion);
  return shuffleArray(all).slice(0, limit);
}
