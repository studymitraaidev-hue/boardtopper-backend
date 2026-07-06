import { api } from '../utils/api';
import { Subject, ScheduleItem, RecentNote, ApiResponse } from '../types/index';

// â”€â”€â”€ Dashboard Intelligence (Day 5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DashboardData {
  totalNotes: number;
  recentNotes: { id: string; title: string; updated_at: string }[];
  recentActivity: { type: 'note' | 'doubt'; title: string; date: string }[];
  weakTopics: { topic: string }[];
}

const DASHBOARD_EMPTY: DashboardData = {
  totalNotes: 0,
  recentNotes: [],
  recentActivity: [],
  weakTopics: [],
};

export async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  try {
    const data = await api.get<DashboardData>('/api/dashboard');
    // Ensure arrays are always arrays (safety guard)
    return {
      data: {
        totalNotes:     typeof data.totalNotes === 'number' ? data.totalNotes : 0,
        recentNotes:    Array.isArray(data.recentNotes)    ? data.recentNotes    : [],
        recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        weakTopics:     Array.isArray(data.weakTopics)     ? data.weakTopics     : [],
      },
      error: null,
    };
  } catch (err) {
    return {
      data: DASHBOARD_EMPTY,
      error: err instanceof Error ? err.message : 'Failed to load dashboard.',
    };
  }
}

// â”€â”€â”€ Existing helpers (kept unchanged) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ProgressStats {
  totalCompleted: number;
  streakCount: number;
  bySubject: Record<string, number>;
  mockScoreAvg: number | null;
  doubtsSolved: number;
}

export interface QuizStats {
  averageScore:     number | null;
  bestScore:        number | null;
  totalAttempts:    number;
  subjectBreakdown: Array<{ subjectId: string; averageScore: number; attempts: number }>;
  weakestSubject:   string | null;
}

export interface QuizAttemptRecord {
  id:          string;
  subjectId:   string;
  score:       number;
  totalQ:      number;
  attemptedAt: string;
}

export async function submitQuizAttempt(payload: {
  subjectId: string;
  score: number;
  totalQ: number;
  timeTaken?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await api.post('/api/quiz/attempt', payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to submit attempt' };
  }
}

export async function getQuizStats(): Promise<ApiResponse<QuizStats>> {
  try {
    const data = await api.get<QuizStats>('/api/quiz/stats');
    return {
      data: {
        averageScore:     data.averageScore ?? null,
        bestScore:        data.bestScore    ?? null,
        totalAttempts:    data.totalAttempts ?? 0,
        subjectBreakdown: Array.isArray(data.subjectBreakdown) ? data.subjectBreakdown : [],
        weakestSubject:   data.weakestSubject ?? null,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { averageScore: null, bestScore: null, totalAttempts: 0, subjectBreakdown: [], weakestSubject: null },
      error: err instanceof Error ? err.message : 'Failed to load quiz stats.',
    };
  }
}

export async function getRecentQuizAttempts(limit = 10): Promise<ApiResponse<QuizAttemptRecord[]>> {
  try {
    const data = await api.get<QuizAttemptRecord[]>(`/api/quiz/recent?limit=${limit}`);
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load recent attempts.' };
  }
}

export async function getSubjects(): Promise<ApiResponse<Subject[]>> {
  try {
    const data = await api.get<Subject[]>('/api/subjects');
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load subjects.' };
  }
}

export async function getSchedule(): Promise<ApiResponse<ScheduleItem[]>> {
  try {
    const data = await api.get<ScheduleItem[]>('/api/schedule');
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load schedule.' };
  }
}

export async function getRecentNotes(): Promise<ApiResponse<RecentNote[]>> {
  try {
    const data = await api.get<RecentNote[]>('/api/notes');
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load recent notes.' };
  }
}

export async function getProgressStats(): Promise<ApiResponse<ProgressStats>> {
  try {
    const data = await api.get<ProgressStats>('/api/progress/stats');
    return { data, error: null };
  } catch (err) {
    return {
      data: { totalCompleted: 0, streakCount: 0, bySubject: {}, mockScoreAvg: null, doubtsSolved: 0 },
      error: err instanceof Error ? err.message : 'Failed to load progress.',
    };
  }
}


export async function completeChapter(payload: {
  subjectId: string;
  chapterId: string;
  score?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await api.post('/api/progress/chapter-done', payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to mark chapter complete' };
  }
}

export async function updateProfile(payload: {
  examDate?: string | null;
  weakSubjects?: string[];
  targetPercent?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await api.patch('/api/auth/me', payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update profile' };
  }
}


export interface QuickChapterItem {
  name:      string;
  subjectId: string;
  isWeak:    boolean;
}

export async function getQuickChapters(): Promise<QuickChapterItem[]> {
  try {
    const result = await api.get<{ chapters: QuickChapterItem[] }>('/api/emergency/quick-chapters');
    return Array.isArray(result?.chapters) ? result.chapters : [];
  } catch {
    return [];
  }
}
