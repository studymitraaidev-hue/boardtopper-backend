import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  getAllNotes,
  getRecentNotes,
  getNoteByChapter,
  getNoteById,
  saveNote,
} from '../data/notes.store';
import { getChapterContent, buildContentContext } from '../data/chapter_content.store';
import { askGemini } from '../services/gemini.service';
import supabase from '../config/supabase';

// GET /api/notes
// Returns all notes for the authenticated user (summary list)
export const listNotes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const notes = await getAllNotes(userId);
  // Return lightweight list — strip full sections content
  const list = notes.map((n) => ({
    id:        n.id,
    chapterId: n.chapterId,
    subjectId: n.subjectId,
    title:     n.title,
    type:      n.type,
    date:      n.date,
  }));
  ApiResponse.success(res, list);
});

// GET /api/notes/recent
// Returns recently accessed notes for the authenticated user
export const listRecentNotes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const recent = await getRecentNotes(userId);
  ApiResponse.success(res, recent);
});

// GET /api/notes/chapter/:chapterId?subjectId=<uuid>
// Returns full note for a specific chapter — fetches from cache or generates via Gemini
export const getNoteForChapter = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId    = req.user!.id;
    const { chapterId } = req.params;
    const subjectId = (req.query['subjectId'] as string | undefined) ?? '';

    // ── Step 1: Cache check ──────────────────────────────────────────────────
    try {
      const cached = await getNoteByChapter(chapterId, userId);
      if (cached && cached.sections.length > 0) {
        ApiResponse.success(res, cached);
        return;
      }
    } catch {
      // DB error on cache check — continue to generation
    }

    // ── Step 2: Fetch chapter_content for context ────────────────────────────
    const chapterContent = await getChapterContent(chapterId);
    if (!chapterContent) {
      ApiResponse.error(res, 'Content not yet available for this chapter', 404);
      return;
    }

    // ── Step 3: Generate notes via Gemini ────────────────────────────────────
    try {
      const context = buildContentContext(chapterContent);

      const systemPrompt = `You are a Maharashtra SSC Class 10 board exam expert.
Generate structured revision notes for a student.
Respond ONLY with a valid JSON object. No markdown, no backticks.
Schema:
{
  "title": "string — chapter name + Board Revision Notes",
  "sections": [{ "heading": "string", "content": "string" }],
  "boardTip": "string — one critical examiner tip",
  "pyqs": [{ "q": "string", "marks": number }]
}
Generate at minimum 4 sections covering: key concepts, formulas,
must-know points, and exam strategy. Keep language simple for a 15-year-old.`;

      const userMessage = `Generate board revision notes for this chapter.\n\nChapter context:\n${context}`;

      const geminiResponse = await askGemini({ systemPrompt, userMessage });

      // Strip markdown fences if Gemini wraps the JSON despite instructions
      let raw = geminiResponse.text.trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      const parsed = JSON.parse(raw) as {
        title:    string;
        sections: Array<{ heading: string; content: string }>;
        boardTip: string;
        pyqs:     Array<{ q: string; marks: number }>;
      };

      // ── Step 4: Resolve subjectId then persist ─────────────────────────────
      let resolvedSubjectId = subjectId;
      if (!resolvedSubjectId) {
        try {
          const { data: chapterRow } = await supabase
            .from('chapters')
            .select('subject_id')
            .eq('id', chapterId)
            .single();
          resolvedSubjectId = (chapterRow as { subject_id: string } | null)?.subject_id ?? '';
        } catch {
          // Non-fatal — save with empty subjectId
        }
      }

      const saved = await saveNote({
        userId,
        chapterId,
        subjectId: resolvedSubjectId,
        title:     parsed.title,
        sections:  parsed.sections,
        boardTip:  parsed.boardTip ?? '',
        pyqs:      parsed.pyqs ?? [],
        type:      'notes',
      });

      // ── Step 5: Return saved note ──────────────────────────────────────────
      ApiResponse.success(res, saved);
    } catch (err) {
      console.error('[Notes] AI generation failed:', err);
      ApiResponse.error(res, 'Notes generation temporarily unavailable. Please try again in a moment.', 503);
    }
  }
);

// GET /api/notes/:id
// Returns a single note by ID (scoped to authenticated user)
export const getNoteByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const note = await getNoteById(req.params.id, userId);
    if (!note) {
      ApiResponse.error(res, 'Note not found', 404);
      return;
    }
    ApiResponse.success(res, note);
  }
);
