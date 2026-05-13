import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmergencyItem {
  title: string;
  content: string;
}

type EmergencyMode = 'notes' | 'doubts' | 'fallback' | 'empty';

interface EmergencyResponse {
  mode: EmergencyMode;
  items: EmergencyItem[];
}

// ─── DB row types — matched exactly to schema.sql ─────────────────────────────

interface UserNoteRow {
  title: string;
  content: string;
  updated_at: string;
}

interface ConversationRow {
  text: string;
  subject: string | null;
  timestamp: string;
}

interface ChapterRow {
  name: string;
  topics: string[];
}

// ─── Controller ───────────────────────────────────────────────────────────────

// GET /api/emergency
// Returns deterministic, user-specific Emergency Mode items.
//
// Priority chain (strict order — no skipping steps):
//   1. user_notes      → mode: "notes"    (ordered by updated_at DESC, limit 5)
//   2. conversations   → mode: "doubts"   (role='user', ordered by timestamp DESC, limit 5)
//   3. chapters        → mode: "fallback" (ordered by chapter_number ASC, limit 5)
//   4. nothing found   → mode: "empty",   items: []
//
// Auth: authenticate + requirePro middleware applied in route — userId guaranteed here.
export const getEmergency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    // Belt-and-suspenders: middleware already enforces this, but never crash
    if (!userId) {
      ApiResponse.error(res, 'Unauthorized', 401);
      return;
    }

    // ── Step 1: Latest user_notes for this user ──────────────────────────────
    // Columns: title (TEXT NOT NULL), content (TEXT NOT NULL DEFAULT ''),
    //          updated_at (TIMESTAMPTZ NOT NULL)
    const { data: noteRows, error: noteError } = await supabase
      .from('user_notes')
      .select('title, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (noteError) {
      ApiResponse.error(res, 'Failed to fetch notes', 500);
      return;
    }

    const notes = (noteRows ?? []) as UserNoteRow[];

    if (notes.length > 0) {
      const items: EmergencyItem[] = notes.map((n) => ({
        title:   (n.title ?? '').trim()  || 'Untitled Note',
        content: n.content ?? '',
      }));

      const result: EmergencyResponse = { mode: 'notes', items };
      ApiResponse.success(res, result);
      return;
    }

    // ── Step 2: Latest user-side conversation messages (doubts) ──────────────
    // Columns: role TEXT CHECK IN ('user','model'), text TEXT NOT NULL,
    //          subject TEXT (nullable), timestamp TIMESTAMPTZ NOT NULL
    // We only want role='user' rows — those are the student's actual questions.
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('text, subject, timestamp')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (convError) {
      ApiResponse.error(res, 'Failed to fetch doubts', 500);
      return;
    }

    const convs = (convRows ?? []) as ConversationRow[];

    if (convs.length > 0) {
      const items: EmergencyItem[] = convs.map((c) => {
        const rawText  = (c.text ?? '').trim();
        const subject  = (c.subject ?? '').trim();
        // Title: "[Subject] " prefix + first 80 chars of question text
        const prefix   = subject ? `[${subject}] ` : '';
        const title    = (prefix + rawText).slice(0, 80).trim() || 'Recent Doubt';
        return { title, content: rawText };
      });

      const result: EmergencyResponse = { mode: 'doubts', items };
      ApiResponse.success(res, result);
      return;
    }

    // ── Step 3: Syllabus chapters as last-resort fallback ────────────────────
    // Columns: name TEXT NOT NULL, topics TEXT[] NOT NULL DEFAULT '{}'
    // No user-filter — chapters are public syllabus data (no user_id column).
    // Ordered by chapter_number ASC so results are consistent across calls.
    const { data: chapterRows, error: chapterError } = await supabase
      .from('chapters')
      .select('name, topics')
      .order('chapter_number', { ascending: true })
      .limit(5);

    if (chapterError) {
      ApiResponse.error(res, 'Failed to fetch syllabus', 500);
      return;
    }

    const chapters = (chapterRows ?? []) as ChapterRow[];

    if (chapters.length > 0) {
      const items: EmergencyItem[] = chapters.map((ch) => ({
        title:   (ch.name ?? '').trim() || 'Chapter',
        // topics is TEXT[] — join as readable comma-separated string
        content: Array.isArray(ch.topics) ? ch.topics.join(', ') : '',
      }));

      const result: EmergencyResponse = { mode: 'fallback', items };
      ApiResponse.success(res, result);
      return;
    }

    // ── Step 4: Truly nothing available ──────────────────────────────────────
    const result: EmergencyResponse = { mode: 'empty', items: [] };
    ApiResponse.success(res, result);
  }
);
