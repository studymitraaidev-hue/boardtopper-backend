import supabase from '../config/supabase';

export interface StoredNotification {
  id:        string;
  userId:    string;
  type:      'streak_at_risk' | 'exam_reminder' | 'new_feature';
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: string;
}

interface NotificationRow {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  body:       string;
  read:       boolean;
  created_at: string;
}

function toStored(row: NotificationRow): StoredNotification {
  return {
    id:        row.id,
    userId:    row.user_id,
    type:      row.type as StoredNotification['type'],
    title:     row.title,
    body:      row.body,
    read:      row.read,
    createdAt: row.created_at,
  };
}

export async function getNotificationsForUser(userId: string): Promise<StoredNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, read, created_at')
    .eq('user_id', userId)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toStored(r as NotificationRow));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function createNotification(
  userId: string,
  type: StoredNotification['type'],
  title: string,
  body: string
): Promise<void> {
  // Deduplicate: do not create same type more than once per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return; // Already created today

  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    read: false,
  });
}
