import supabase from '../config/supabase';

export interface GeneratedQuestion {
  id: string;
  chapterId: string;
  subjectId: string;
  question: string;
  options: string[];        // exactly 4 strings
  correctIndex: number;     // 0-3
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
    difficulty:   row.difficulty as 'easy' | 'medium' | 'hard',
    marks:        row.marks,
    createdAt:    row.created_at,
    expiresAt:    row.expires_at,
  };
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
    .limit(limit);

  if (error || !data) return [];
  return (data as DBRow[]).map(toQuestion);
}

/** Delete expired questions for a chapter, then bulk insert new ones */
export async function saveGeneratedQuestions(
  questions: Omit<GeneratedQuestion, 'id' | 'createdAt' | 'expiresAt'>[]
): Promise<void> {
  if (questions.length === 0) return;

  // Remove expired entries for this chapter first
  await supabase
    .from('generated_questions')
    .delete()
    .eq('chapter_id', questions[0].chapterId)
    .lt('expires_at', new Date().toISOString());

  const rows = questions.map((q) => ({
    chapter_id:    q.chapterId,
    subject_id:    q.subjectId,
    question:      q.question,
    options:       q.options,
    correct_index: q.correctIndex,
    difficulty:    q.difficulty,
    marks:         q.marks,
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
    .limit(limit);

  if (error || !data) return [];
  return (data as DBRow[]).map(toQuestion);
}
