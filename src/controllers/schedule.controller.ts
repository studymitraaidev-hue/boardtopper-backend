import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  getScheduleForUser,
  toggleScheduleItem,
  addScheduleItem,
  deleteScheduleItem,
  StoredScheduleItem,
} from '../data/schedule.store';

// GET /api/schedule
// Auto-creates default schedule if user has none yet
export const getSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }
  const items = await getScheduleForUser(req.user.id);
  ApiResponse.success(res, items);
});

// PATCH /api/schedule/:id/toggle
// Toggle done status of a schedule item
export const toggleItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }
  const updated = await toggleScheduleItem(req.user.id, req.params.id);
  if (!updated) {
    ApiResponse.error(res, 'Schedule item not found', 404);
    return;
  }
  ApiResponse.success(res, updated);
});

// POST /api/schedule
// Add a new schedule item
export const addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  const { time, task, subject, priority } = req.body as {
    time: string;
    task: string;
    subject: StoredScheduleItem['subject'];
    priority: StoredScheduleItem['priority'];
  };

  if (!time || !task || !subject || !priority) {
    ApiResponse.error(res, 'Missing required fields: time, task, subject, priority', 400);
    return;
  }

  const validSubjects: StoredScheduleItem['subject'][] = [
    'maths', 'science', 'history', 'geography', 'english',
  ];
  const validPriorities: StoredScheduleItem['priority'][] = ['high', 'medium', 'low'];

  if (!validSubjects.includes(subject)) {
    ApiResponse.error(res, `Invalid subject. Must be one of: ${validSubjects.join(', ')}`, 400);
    return;
  }
  if (!validPriorities.includes(priority)) {
    ApiResponse.error(res, `Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400);
    return;
  }

  const newItem = await addScheduleItem(req.user.id, {
    time,
    task,
    subject,
    priority,
    done: false,
  });

  ApiResponse.success(res, newItem, 201);
});

// DELETE /api/schedule/:id
// Remove a schedule item
export const deleteItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }
  const deleted = await deleteScheduleItem(req.user.id, req.params.id);
  if (!deleted) {
    ApiResponse.error(res, 'Schedule item not found', 404);
    return;
  }
  ApiResponse.success(res, { deleted: true });
});
