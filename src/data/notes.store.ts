import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredNoteSection {
  heading: string;
  content: string;
}

export interface StoredPYQ {
  q: string;
  marks: number;
}

export interface StoredNote {
  id: string;
  chapterId: string;
  subjectId: string;
  title: string;
  sections: StoredNoteSection[];
  boardTip: string;
  pyqs: StoredPYQ[];
  type: 'notes' | 'test' | 'sheet';
  date: string;
}

export interface RecentNoteRecord {
  id: string;
  title: string;
  date: string;
  type: 'notes' | 'test' | 'sheet';
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface NoteRow {
  id: string;
  chapter_id: string;
  subject_id: string;
  title: string;
  sections: StoredNoteSection[];
  board_tip: string | null;
  pyqs: StoredPYQ[];
  type: 'notes' | 'test' | 'sheet';
  created_at: string;
}

function toStoredNote(row: NoteRow): StoredNote {
  return {
    id:        row.id,
    chapterId: row.chapter_id,
    subjectId: row.subject_id,
    title:     row.title,
    sections:  row.sections ?? [],
    boardTip:  row.board_tip ?? '',
    pyqs:      row.pyqs ?? [],
    type:      row.type,
    date:      row.created_at,
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

// FIX: Added userId parameter — was missing, causing data leak across all users
export async function getAllNotes(userId: string): Promise<StoredNote[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch notes');
  return (data as NoteRow[]).map(toStoredNote);
}

export async function getNoteByChapter(chapterId: string, userId: string): Promise<StoredNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('chapter_id', chapterId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return toStoredNote(data as NoteRow);
}

export async function getNoteById(noteId: string, userId: string): Promise<StoredNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return toStoredNote(data as NoteRow);
}

// FIX: Added userId parameter — was missing, causing data leak across all users
export async function getRecentNotes(userId: string, limit = 10): Promise<RecentNoteRecord[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, created_at, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) throw new Error(error?.message ?? 'Failed to fetch recent notes');

  return (data as { id: string; title: string; created_at: string; type: StoredNote['type'] }[]).map(
    (row) => ({
      id:    row.id,
      title: row.title,
      date:  row.created_at,
      type:  row.type,
    })
  );
}

// DAY 37: Persist AI-generated notes to the notes table
export async function saveNote(input: {
  userId:    string;
  chapterId: string;
  subjectId: string;
  title:     string;
  sections:  StoredNoteSection[];
  boardTip:  string;
  pyqs:      StoredPYQ[];
  type:      'notes' | 'test' | 'sheet';
}): Promise<StoredNote> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id:    input.userId,
      chapter_id: input.chapterId,
      subject_id: input.subjectId,
      title:      input.title,
      sections:   input.sections,
      board_tip:  input.boardTip,
      pyqs:       input.pyqs,
      type:       input.type,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save note');
  return toStoredNote(data as NoteRow);
}
