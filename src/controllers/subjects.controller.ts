import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getAllSubjectsByBoard, getSubjectById } from '../data/subjects.store';
import { getChaptersBySubjectForUser } from '../data/chapters.store';
import { findById } from '../data/users.store';

// GET /api/subjects
// Returns subjects filtered by the authenticated user's board.
// Falls back to 'maharashtra' if board cannot be resolved.
export const listSubjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let board = 'maharashtra';
  if (req.user?.id) {
    const user = await findById(req.user.id);
    if (user?.board) board = user.board;
  }
  const subjects = await getAllSubjectsByBoard(board);
  ApiResponse.success(res, subjects);
});

// GET /api/subjects/:id
export const getSubject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subject = await getSubjectById(req.params.id);
  if (!subject) {
    ApiResponse.error(res, 'Subject not found', 404);
    return;
  }
  ApiResponse.success(res, subject);
});

// GET /api/subjects/:id/chapters
export const listChapters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subject = await getSubjectById(req.params.id);
  if (!subject) {
    ApiResponse.error(res, 'Subject not found', 404);
    return;
  }

  // Determine plan from authenticated user (set by auth middleware)
  // If no auth header, default to 'free' so public access still works
  const plan: 'free' | 'pro' = req.user?.plan ?? 'free';

  const chapters = await getChaptersBySubjectForUser(req.params.id, plan);
  ApiResponse.success(res, chapters);
});
