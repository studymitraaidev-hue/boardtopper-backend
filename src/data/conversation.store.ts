import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredMessage {
  id: string;
  userId: string;
  role: 'user' | 'model';
  text: string;
  subject?: string;
  chapterId?: string;
  timestamp: Date;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  user_id: string;
  role: 'user' | 'model';
  text: string;
  subject: string | null;
  chapter_id: string | null;
  timestamp: string;
}

function toStoredMessage(row: ConversationRow): StoredMessage {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    subject: row.subject ?? undefined,
    chapterId: row.chapter_id ?? undefined,
    timestamp: new Date(row.timestamp),
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function getHistory(userId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as ConversationRow[]).map(toStoredMessage);
}

export async function addMessage(
  userId: string,
  role: 'user' | 'model',
  text: string,
  subject?: string,
  chapterId?: string
): Promise<StoredMessage> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      role,
      text,
      subject: subject ?? null,
      chapter_id: chapterId ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save message');
  return toStoredMessage(data as ConversationRow);
}

export async function clearHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}
