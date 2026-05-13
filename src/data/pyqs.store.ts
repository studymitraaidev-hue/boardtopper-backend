import supabase from '../config/supabase';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredPYQ {
  id:            string;
  chapterId:     string;
  subjectId:     string;
  year:          number;
  marks:         number;
  question:      string;
  answerHint:    string;
  appearedCount: number;
  createdAt:     string;
}

interface PYQRow {
  id:             string;
  chapter_id:     string;
  subject_id:     string;
  year:           number;
  marks:          number;
  question:       string;
  answer_hint:    string;
  appeared_count: number;
  created_at:     string;
}

function toPYQ(row: PYQRow): StoredPYQ {
  return {
    id:            row.id,
    chapterId:     row.chapter_id,
    subjectId:     row.subject_id,
    year:          row.year,
    marks:         row.marks,
    question:      row.question,
    answerHint:    row.answer_hint,
    appearedCount: row.appeared_count,
    createdAt:     row.created_at,
  };
}

/**
 * Fetch all PYQs for a chapter, sorted by year descending then marks descending.
 * Returns empty array (not error) if no PYQs exist for the chapter yet.
 */
export async function getPYQsByChapter(chapterId: string): Promise<StoredPYQ[]> {
  const { data, error } = await supabase
    .from('pyqs')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('year', { ascending: false })
    .order('marks', { ascending: false });

  if (error) {
    logger.warn(`[PYQs] fetch error for chapter ${chapterId}: ${error.message}`);
    return [];
  }

  return (data ?? []).map((r: unknown) => toPYQ(r as PYQRow));
}

/**
 * Fetch PYQs by subject — across all chapters.
 * Useful for subject-level PYQ browsing.
 * Limited to 50 most recent.
 */
export async function getPYQsBySubject(subjectId: string): Promise<StoredPYQ[]> {
  const { data, error } = await supabase
    .from('pyqs')
    .select('*')
    .eq('subject_id', subjectId)
    .order('year', { ascending: false })
    .order('appeared_count', { ascending: false })
    .limit(50);

  if (error) {
    logger.warn(`[PYQs] subject fetch error for ${subjectId}: ${error.message}`);
    return [];
  }

  return (data ?? []).map((r: unknown) => toPYQ(r as PYQRow));
}
