import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { findById } from '../data/users.store';
import supabase from '../config/supabase';

interface EmergencyItem {
  title:   string;
  content: string;
  tag?:    string;
  priority?: 'high' | 'normal';
}

type EmergencyMode = 'notes' | 'doubts' | 'fallback' | 'empty';

interface EmergencyResponse {
  mode:          EmergencyMode;
  items:         EmergencyItem[];
  userContext: {
    examDate:      string | null;
    weakSubjects:  string[];
    streakCount:   number;
    targetPercent: number;
    name:          string;
  };
}

interface UserNoteRow    { title: string; content: string; updated_at: string; }
interface ConversationRow { text: string; subject: string | null; timestamp: string; }
interface ChapterRow     { name: string; topics: string[]; subject_id?: string; }

export const getEmergency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    // Fetch full user for context
    const user = await findById(userId);
    const weakSubjects   = user?.weakSubjects   ?? [];
    const examDate       = user?.examDate       ?? null;
    const streakCount    = user?.streakCount    ?? 0;
    const targetPercent  = user?.targetPercent  ?? 90;
    const name           = user?.name           ?? 'Topper';

    const userContext = { examDate, weakSubjects, streakCount, targetPercent, name };

    // Step 1: User notes - prioritise notes whose titles mention weak subjects
    const { data: noteRows, error: noteError } = await supabase
      .from('user_notes')
      .select('title, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (noteError) { ApiResponse.error(res, 'Failed to fetch notes', 500); return; }

    const notes = (noteRows ?? []) as UserNoteRow[];

    if (notes.length > 0) {
      // Sort: weak-subject notes first
      const sorted = [...notes].sort((a, b) => {
        const aWeak = weakSubjects.some(s => a.title.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.title.toLowerCase().includes(s.toLowerCase()));
        if (aWeak && !bWeak) return -1;
        if (!aWeak && bWeak) return 1;
        return 0;
      });

      const items: EmergencyItem[] = sorted.slice(0, 5).map(n => {
        const matchedSubject = weakSubjects.find(s => n.title.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (n.title ?? '').trim() || 'Untitled Note',
          content:  n.content ?? '',
          tag:      matchedSubject ? `Weak: ${matchedSubject}` : 'Note',
          priority: matchedSubject ? 'high' : 'normal',
        };
      });

      const result: EmergencyResponse = { mode: 'notes', items, userContext };
      ApiResponse.success(res, result);
      return;
    }

    // Step 2: Conversations - prioritise weak subject doubts
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('text, subject, timestamp')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (convError) { ApiResponse.error(res, 'Failed to fetch doubts', 500); return; }

    const convs = (convRows ?? []) as ConversationRow[];

    if (convs.length > 0) {
      const sorted = [...convs].sort((a, b) => {
        const aWeak = weakSubjects.some(s => (a.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => (b.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        if (aWeak && !bWeak) return -1;
        if (!aWeak && bWeak) return 1;
        return 0;
      });

      const items: EmergencyItem[] = sorted.slice(0, 5).map(c => {
        const rawText = (c.text ?? '').trim();
        const subject = (c.subject ?? '').trim();
        const prefix  = subject ? `[${subject}] ` : '';
        const isWeak  = weakSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (prefix + rawText).slice(0, 80).trim() || 'Recent Doubt',
          content:  rawText,
          tag:      subject || 'General',
          priority: isWeak ? 'high' : 'normal',
        };
      });

      const result: EmergencyResponse = { mode: 'doubts', items, userContext };
      ApiResponse.success(res, result);
      return;
    }

    // Step 3: Chapters - prioritise weak subjects
    let chapterQuery = supabase
      .from('chapters')
      .select('name, topics')
      .order('chapter_number', { ascending: true })
      .limit(20);

    const { data: chapterRows, error: chapterError } = await chapterQuery;

    if (chapterError) { ApiResponse.error(res, 'Failed to fetch syllabus', 500); return; }

    const chapters = (chapterRows ?? []) as ChapterRow[];

    if (chapters.length > 0) {
      // Sort weak subject chapters first
      const sorted = [...chapters].sort((a, b) => {
        const aWeak = weakSubjects.some(s => a.name.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.name.toLowerCase().includes(s.toLowerCase()));
        if (aWeak && !bWeak) return -1;
        if (!aWeak && bWeak) return 1;
        return 0;
      });

      const items: EmergencyItem[] = sorted.slice(0, 5).map(ch => {
        const isWeak = weakSubjects.some(s => ch.name.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (ch.name ?? '').trim() || 'Chapter',
          content:  Array.isArray(ch.topics) ? ch.topics.join(', ') : '',
          tag:      isWeak ? 'Weak Subject' : 'Syllabus',
          priority: isWeak ? 'high' : 'normal',
        };
      });

      const result: EmergencyResponse = { mode: 'fallback', items, userContext };
      ApiResponse.success(res, result);
      return;
    }

    const result: EmergencyResponse = { mode: 'empty', items: [], userContext };
    ApiResponse.success(res, result);
  }
);
