import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredSubject {
  id: string;
  name: string;
  emoji: string;
  board: 'maharashtra';
  class: number;
  totalChapters: number;
  color: string;
  light: string;
  text: string;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface SubjectRow {
  id: string;
  name: string;
  emoji: string;
  board: 'maharashtra';
  class: number;
  total_chapters: number;
  color: string;
  light: string;
  text: string;
}

function toStoredSubject(row: SubjectRow): StoredSubject {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    board: row.board,
    class: row.class,
    totalChapters: row.total_chapters,
    color: row.color,
    light: row.light,
    text: row.text,
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function getAllSubjects(): Promise<StoredSubject[]> {
  const { data, error } = await supabase.from('subjects').select('*');
  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch subjects');
  return (data as SubjectRow[]).map(toStoredSubject);
}

export async function getAllSubjectsByBoard(board: string): Promise<StoredSubject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('board', board);
  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch subjects');
  return (data as SubjectRow[]).map(toStoredSubject);
}

export async function getSubjectById(id: string): Promise<StoredSubject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return toStoredSubject(data as SubjectRow);
}
