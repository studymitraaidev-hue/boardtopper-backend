import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { updateStreak } from '../utils/streak';
import logger from '../utils/logger';
import {
  getUserNotes,
  getUserNoteById,
  createUserNote,
  updateUserNote,
  deleteUserNote,
} from '../data/user_notes.store';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getString(body: Record<string, unknown>, key: string): string | undefined {
  const val = (body as Record<string, unknown>)[key];
  return typeof val === 'string' ? val.trim() : undefined;
}

// ── GET /api/user-notes ──────────────────────────────────────────────────────

export const listUserNotes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const notes = await getUserNotes(userId);
  ApiResponse.success(res, notes);
});

// ── POST /api/user-notes ─────────────────────────────────────────────────────

export const createUserNoteHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const body = req.body as Record<string, unknown>;

    const title   = getString(body, 'title');
    const content = getString(body, 'content') ?? '';

    if (!title) {
      ApiResponse.error(res, 'title is required', 400);
      return;
    }

    const note = await createUserNote(userId, title, content);

    try {
      await updateStreak(req.user!.id);
    } catch (err) {
      logger.warn('[streak] Failed to update streak after note generation');
    }

    ApiResponse.success(res, note, 201);
  }
);

// ── PUT /api/user-notes/:id ──────────────────────────────────────────────────

export const updateUserNoteHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const body   = req.body as Record<string, unknown>;

    // Confirm note exists and belongs to user
    const existing = await getUserNoteById(noteId, userId);
    if (!existing) {
      // Check whether the note exists at all (to distinguish 404 vs 403)
      // We already filter by user_id above; if null it may not exist or not be owned.
      // Either way return 404 — never leak other users' data.
      ApiResponse.error(res, 'Note not found', 404);
      return;
    }

    const fields: { title?: string; content?: string } = {};
    const title   = getString(body, 'title');
    const content = getString(body, 'content');

    if (title !== undefined) {
      if (title.length === 0) {
        ApiResponse.error(res, 'title cannot be empty', 400);
        return;
      }
      fields.title = title;
    }
    if (content !== undefined) fields.content = content;

    if (Object.keys(fields).length === 0) {
      ApiResponse.error(res, 'No fields to update', 400);
      return;
    }

    const updated = await updateUserNote(noteId, userId, fields);
    if (!updated) {
      ApiResponse.error(res, 'Note not found', 404);
      return;
    }

    ApiResponse.success(res, updated);
  }
);

// ── DELETE /api/user-notes/:id ───────────────────────────────────────────────

export const deleteUserNoteHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const noteId = req.params.id;

    const deleted = await deleteUserNote(noteId, userId);
    if (!deleted) {
      ApiResponse.error(res, 'Note not found', 404);
      return;
    }

    ApiResponse.success(res, { deleted: true });
  }
);
