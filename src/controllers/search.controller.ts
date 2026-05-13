import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import supabase from '../config/supabase';

export const searchAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const q = (req.query['q'] as string | undefined)?.trim() ?? '';

  if (q.length < 3) {
    ApiResponse.success(res, { chapters: [], notes: [] });
    return;
  }

  const pattern = `%${q}%`;

  const [chaptersResult, notesResult] = await Promise.all([
    supabase
      .from('chapters')
      .select('id, name, subject_id, chapter_number, type, status')
      .ilike('name', pattern)
      .limit(6),

    supabase
      .from('notes')
      .select('id, title, subject_id, chapter_id, type')
      .eq('user_id', userId)
      .ilike('title', pattern)
      .limit(6),
  ]);

  const chapters = (chaptersResult.data ?? []).map((c: {
    id: string; name: string; subject_id: string; chapter_number: number; type: string; status: string;
  }) => ({
    id:            c.id,
    name:          c.name,
    subjectId:     c.subject_id,
    chapterNumber: c.chapter_number,
    type:          c.type,
    status:        c.status,
  }));

  const notes = (notesResult.data ?? []).map((n: {
    id: string; title: string; subject_id: string; chapter_id: string; type: string;
  }) => ({
    id:        n.id,
    title:     n.title,
    subjectId: n.subject_id,
    chapterId: n.chapter_id,
    type:      n.type,
  }));

  ApiResponse.success(res, { chapters, notes });
});
