import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredScheduleItem {
  id: string;
  userId: string;
  time: string;
  task: string;
  subject: 'maths' | 'science' | 'history' | 'geography' | 'english';
  priority: 'high' | 'medium' | 'low';
  done: boolean;
}

// ─── Default template ─────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: Omit<StoredScheduleItem, 'id' | 'userId'>[] = [
  { time: '4:00 PM', task: 'Solve 10 Quadratic Equations', subject: 'maths',    priority: 'high',   done: false },
  { time: '5:00 PM', task: 'Read Gravitation Chapter',     subject: 'science',  priority: 'high',   done: false },
  { time: '6:00 PM', task: 'Revise History Chapter 1',     subject: 'history',  priority: 'medium', done: false },
  { time: '7:00 PM', task: 'English Reading Practice',     subject: 'english',  priority: 'low',    done: false },
  { time: '8:00 PM', task: 'Solve Previous Year Papers',   subject: 'maths',    priority: 'high',   done: false },
];

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface ScheduleRow {
  id: string;
  user_id: string;
  time: string;
  task: string;
  subject: StoredScheduleItem['subject'];
  priority: StoredScheduleItem['priority'];
  done: boolean;
}

function toStoredScheduleItem(row: ScheduleRow): StoredScheduleItem {
  return {
    id: row.id,
    userId: row.user_id,
    time: row.time,
    task: row.task,
    subject: row.subject,
    priority: row.priority,
    done: row.done,
  };
}

// ─── Store Methods ─────────────────────────────────────────────────────────────

export async function getScheduleForUser(userId: string): Promise<StoredScheduleItem[]> {
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true });

  if (error) throw new Error(error.message);

  // Auto-seed default schedule if user has none yet
  if (!data || data.length === 0) {
    return initUserSchedule(userId);
  }

  return (data as ScheduleRow[]).map(toStoredScheduleItem);
}

export async function initUserSchedule(userId: string): Promise<StoredScheduleItem[]> {
  const rows = DEFAULT_TEMPLATE.map((item) => ({
    user_id: userId,
    time: item.time,
    task: item.task,
    subject: item.subject,
    priority: item.priority,
    done: false,
  }));

  const { data, error } = await supabase
    .from('schedule')
    .insert(rows)
    .select();

  if (error || !data) throw new Error(error?.message ?? 'Failed to initialise schedule');
  return (data as ScheduleRow[]).map(toStoredScheduleItem);
}

export async function toggleScheduleItem(
  userId: string,
  itemId: string
): Promise<StoredScheduleItem | null> {
  // Fetch current done state
  const { data: existing, error: fetchError } = await supabase
    .from('schedule')
    .select('done')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) return null;

  const { data, error } = await supabase
    .from('schedule')
    .update({ done: !(existing as { done: boolean }).done })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) return null;
  return toStoredScheduleItem(data as ScheduleRow);
}

export async function addScheduleItem(
  userId: string,
  item: Omit<StoredScheduleItem, 'id' | 'userId'>
): Promise<StoredScheduleItem> {
  const { data, error } = await supabase
    .from('schedule')
    .insert({
      user_id: userId,
      time: item.time,
      task: item.task,
      subject: item.subject,
      priority: item.priority,
      done: item.done,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to add schedule item');
  return toStoredScheduleItem(data as ScheduleRow);
}

export async function deleteScheduleItem(userId: string, itemId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('schedule')
    .delete({ count: 'exact' })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
