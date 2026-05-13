import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredChapter {
  id: string;
  subjectId: string;
  number: number;
  name: string;
  status: 'Ready' | 'Updated' | 'Generating' | 'Coming Soon';
  type: 'High Weightage' | 'Important' | 'Core' | 'Coming Soon';
  free: boolean;
  marks: number;
  topics: string[];
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface ChapterRow {
  id: string;
  subject_id: string;
  name: string;
  chapter_number: number;
  status: StoredChapter['status'];
  type: StoredChapter['type'];
  free: boolean;
  marks: number;
  topics: string[];
}

function toStoredChapter(row: ChapterRow): StoredChapter {
  return {
    id: row.id,
    subjectId: row.subject_id,
    number: row.chapter_number,
    name: row.name,
    status: row.status,
    type: row.type,
    free: row.free,
    marks: row.marks,
    topics: row.topics ?? [],
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function getChaptersBySubject(subjectId: string): Promise<StoredChapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('chapter_number', { ascending: true });

  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch chapters');
  return (data as ChapterRow[]).map(toStoredChapter);
}

export async function getChapterById(chapterId: string): Promise<StoredChapter | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .single();

  if (error || !data) return null;
  return toStoredChapter(data as ChapterRow);
}

export async function getFreeChapters(subjectId: string): Promise<StoredChapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('free', true);

  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch free chapters');
  return (data as ChapterRow[]).map(toStoredChapter);
}

export async function getChaptersBySubjectForUser(
  subjectId: string,
  plan: 'free' | 'pro'
): Promise<(StoredChapter & { locked: boolean })[]> {
  const chapters = await getChaptersBySubject(subjectId);
  return chapters.map((c) => ({
    ...c,
    locked: plan === 'free' && !c.free,
  }));
}
