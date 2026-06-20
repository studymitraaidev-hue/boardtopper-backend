import supabase from '../config/supabase';

export interface StoredDoubtTopic {
  id: string;
  userId: string;
  subjectId: string;
  topic: string;
  count: number;
  lastAsked: Date;
}

interface DoubtTopicRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic: string;
  count: number;
  last_asked: string;
}

function toStoredDoubtTopic(row: DoubtTopicRow): StoredDoubtTopic {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    topic: row.topic,
    count: row.count,
    lastAsked: new Date(row.last_asked),
  };
}

// Records that a student asked a doubt about a specific CURATED chapter.
// Only call this with a chapter.name value, never raw student input -
// gibberish or off-topic questions must never reach this function.
export async function recordDoubtTopic(
  userId: string,
  subjectId: string,
  topic: string
): Promise<void> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) return;

  const { data: existing, error: selErr } = await supabase
    .from('doubt_topics')
    .select('id, count')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .eq('topic', cleanTopic)
    .maybeSingle();

  if (selErr) return;

  if (existing) {
    await supabase
      .from('doubt_topics')
      .update({
        count: (existing as { count: number }).count + 1,
        last_asked: new Date().toISOString(),
      })
      .eq('id', (existing as { id: string }).id);
  } else {
    await supabase.from('doubt_topics').insert({
      user_id: userId,
      subject_id: subjectId,
      topic: cleanTopic,
      count: 1,
      last_asked: new Date().toISOString(),
    });
  }
}

export async function getTopDoubtTopics(
  userId: string,
  limit = 5
): Promise<StoredDoubtTopic[]> {
  const { data, error } = await supabase
    .from('doubt_topics')
    .select('*')
    .eq('user_id', userId)
    .order('count', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => toStoredDoubtTopic(r as DoubtTopicRow));
}
