import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { findById } from '../data/users.store';
import { askGroq } from '../services/groq.service';
import supabase from '../config/supabase';

interface EmergencyItem {
  title:    string;
  content:  string;
  tag?:     string;
  priority?: 'high' | 'normal';
}

interface AiTip {
  subject: string;
  points:  string[];
}

type EmergencyMode = 'notes' | 'doubts' | 'fallback' | 'empty';

interface EmergencyResponse {
  mode:        EmergencyMode;
  items:       EmergencyItem[];
  aiTips:      AiTip[];
  userContext: {
    examDate:      string | null;
    weakSubjects:  string[];
    streakCount:   number;
    targetPercent: number;
    name:          string;
  };
}

interface UserNoteRow     { title: string; content: string; updated_at: string; }
interface ConversationRow { text: string; subject: string | null; timestamp: string; }
interface ChapterRow      { name: string; topics: string[]; }

const ACADEMIC_SUBJECTS = [
  'mathematics', 'math', 'maths',
  'science', 'physics', 'chemistry', 'biology',
  'social science', 'history', 'geography', 'civics',
  'english', 'marathi', 'hindi', 'sanskrit',
  'algebra', 'geometry', 'trigonometry',
];

function isAcademicSubject(subject: string | null): boolean {
  if (!subject || subject.trim() === '') return false;
  const lower = subject.toLowerCase().trim();
  return ACADEMIC_SUBJECTS.some(s => lower.includes(s));
}

async function generateAiTips(weakSubjects: string[], board: string, language: string): Promise<AiTip[]> {
  if (weakSubjects.length === 0) return [];

  const tips: AiTip[] = [];

  // Generate tips for up to 3 weak subjects in parallel
  const subjects = weakSubjects.slice(0, 3);

  await Promise.all(subjects.map(async (subject) => {
    try {
      const result = await askGroq({
        systemPrompt: `You are an expert ${board} board exam coach helping a student with last-minute revision. 
Give exactly 3 short, focused revision points for the subject. 
Each point must be one sentence, actionable, and specific to ${board} board exam patterns.
Language: ${language === 'marathi' ? 'Marathi' : language === 'hindi' ? 'Hindi' : 'English'}.
Respond ONLY as a JSON array of 3 strings. No markdown, no extra text. Example: ["Point 1","Point 2","Point 3"]`,
        userMessage: `Give me 3 last-minute revision tips for ${subject} for ${board} board exam.`,
      });

      let points: string[] = [];
      try {
        const cleaned = result.text.trim().replace(/```json|```/g, '').trim();
        points = JSON.parse(cleaned);
        if (!Array.isArray(points)) points = [];
        points = points.slice(0, 3).map(p => String(p).trim()).filter(Boolean);
      } catch {
        // Parse failed — extract lines as fallback
        points = result.text.split('\n').filter(l => l.trim().length > 10).slice(0, 3);
      }

      if (points.length > 0) {
        tips.push({ subject, points });
      }
    } catch {
      // AI failed for this subject — skip silently
    }
  }));

  return tips;
}

export const getEmergency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    const user = await findById(userId);
    const weakSubjects  = user?.weakSubjects  ?? [];
    const examDate      = user?.examDate      ?? null;
    const streakCount   = user?.streakCount   ?? 0;
    const targetPercent = user?.targetPercent ?? 90;
    const name          = user?.name          ?? 'Topper';
    const board         = user?.board         ?? 'maharashtra';
    const language      = user?.language      ?? 'english';

    const userContext = { examDate, weakSubjects, streakCount, targetPercent, name };

    // Generate AI tips in background (parallel with data fetch)
    const aiTipsPromise = generateAiTips(weakSubjects, board, language);

    // Step 1: User notes prioritised by weak subjects
    const { data: noteRows, error: noteError } = await supabase
      .from('user_notes')
      .select('title, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (noteError) { ApiResponse.error(res, 'Failed to fetch notes', 500); return; }

    const notes = (noteRows ?? []) as UserNoteRow[];

    if (notes.length > 0) {
      const sorted = [...notes].sort((a, b) => {
        const aWeak = weakSubjects.some(s => a.title.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.title.toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
      });

      const items: EmergencyItem[] = sorted.slice(0, 5).map(n => {
        const matched = weakSubjects.find(s => n.title.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (n.title ?? '').trim() || 'Untitled Note',
          content:  n.content ?? '',
          tag:      matched ? `Weak: ${matched}` : 'Note',
          priority: matched ? 'high' : 'normal',
        };
      });

      const aiTips = await aiTipsPromise;
      ApiResponse.success(res, { mode: 'notes', items, aiTips, userContext });
      return;
    }

    // Step 2: Academic doubts only — filter out off-topic conversations
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('text, subject, timestamp')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (convError) { ApiResponse.error(res, 'Failed to fetch doubts', 500); return; }

    const convs = (convRows ?? []) as ConversationRow[];

    // Filter to academic subjects only
    const academicConvs = convs.filter(c => isAcademicSubject(c.subject));

    if (academicConvs.length > 0) {
      const sorted = [...academicConvs].sort((a, b) => {
        const aWeak = weakSubjects.some(s => (a.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => (b.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
      });

      const items: EmergencyItem[] = sorted.slice(0, 5).map(c => {
        const rawText = (c.text ?? '').trim();
        const subject = (c.subject ?? '').trim();
        const isWeak  = weakSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (`[${subject}] ` + rawText).slice(0, 80).trim() || 'Recent Doubt',
          content:  rawText,
          tag:      subject,
          priority: isWeak ? 'high' : 'normal',
        };
      });

      const aiTips = await aiTipsPromise;
      ApiResponse.success(res, { mode: 'doubts', items, aiTips, userContext });
      return;
    }

    // Step 3: Syllabus chapters — weak subjects first
    const { data: chapterRows, error: chapterError } = await supabase
      .from('chapters')
      .select('name, topics')
      .order('chapter_number', { ascending: true })
      .limit(20);

    if (chapterError) { ApiResponse.error(res, 'Failed to fetch syllabus', 500); return; }

    const chapters = (chapterRows ?? []) as ChapterRow[];

    if (chapters.length > 0) {
      const sorted = [...chapters].sort((a, b) => {
        const aWeak = weakSubjects.some(s => a.name.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.name.toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
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

      const aiTips = await aiTipsPromise;
      ApiResponse.success(res, { mode: 'fallback', items, aiTips, userContext });
      return;
    }

    const aiTips = await aiTipsPromise;
    ApiResponse.success(res, { mode: 'empty', items: [], aiTips, userContext });
  }
);
