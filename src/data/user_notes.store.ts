import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UserNoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

function toUserNote(row: UserNoteRow): UserNote {
  return {
    id:        row.id,
    userId:    row.user_id,
    title:     row.title,
    content:   row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function getUserNotes(userId: string): Promise<UserNote[]> {
  const { data, error } = await supabase
    .from('user_notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message ?? 'Failed to fetch notes');
  return (data as UserNoteRow[]).map(toUserNote);
}

export async function getUserNoteById(
  noteId: string,
  userId: string
): Promise<UserNote | null> {
  const { data, error } = await supabase
    .from('user_notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return toUserNote(data as UserNoteRow);
}

export async function createUserNote(
  userId: string,
  title: string,
  content: string
): Promise<UserNote> {
  const { data, error } = await supabase
    .from('user_notes')
    .insert({ user_id: userId, title, content })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create note');
  return toUserNote(data as UserNoteRow);
}

export async function updateUserNote(
  noteId: string,
  userId: string,
  fields: { title?: string; content?: string }
): Promise<UserNote | null> {
  const { data, error } = await supabase
    .from('user_notes')
    .update(fields)
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) return null;
  return toUserNote(data as UserNoteRow);
}

export async function deleteUserNote(
  noteId: string,
  userId: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from('user_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message ?? 'Failed to delete note');
  return (count ?? 0) > 0;
}
