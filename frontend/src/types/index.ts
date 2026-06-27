import { LucideIcon } from 'lucide-react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  // DAY 2: Only 'maharashtra' board is supported.
  board: 'maharashtra';
  language: 'english' | 'marathi' | 'hindi' | 'semi';
  targetPercent: number;
  weakSubjects: string[];
  examDate: string | null;   // ISO date 'YYYY-MM-DD' or null
  avatar?: string;
  emailVerified: boolean;
}

export interface Subject {
  id: string;
  name: string;
  emoji?: string;
  progress?: number;
  color?: string;
  light?: string;
  text?: string;
  icon?: LucideIcon;
  chapters?: number;
}

export interface Chapter {
  id: string;
  name: string;
  status: 'Ready' | 'Updated' | 'Generating' | 'Coming Soon';
  type: 'High Weightage' | 'Important' | 'Core' | 'Coming Soon';
  free: boolean;
}

export interface ScheduleItem { id: string; time: string; task: string; done: boolean; }

export interface RecentNote { id: string; title: string; date: string; type: 'notes' | 'test' | 'sheet'; }

export interface NoteSection { heading: string; content: string; }

export interface ActiveNote {
  title: string;
  sections: NoteSection[];
  boardTip: string;
  pyqs: { q: string; marks: number }[];
}

export interface ApiResponse<T> { data: T; error: string | null; }
