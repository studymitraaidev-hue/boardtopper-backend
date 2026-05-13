import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
} from '../data/notifications.store';

export const listNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const notifications = await getNotificationsForUser(userId);
  ApiResponse.success(res, notifications);
});

export const getUnreadNotificationCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const count  = await getUnreadCount(userId);
  ApiResponse.success(res, { count });
});

export const markRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId         = req.user!.id;
  const notificationId = req.params['id'];

  if (!notificationId) {
    ApiResponse.error(res, 'Notification ID is required.', 400);
    return;
  }

  const ok = await markNotificationRead(userId, notificationId);
  if (!ok) {
    ApiResponse.error(res, 'Notification not found.', 404);
    return;
  }

  ApiResponse.success(res, { updated: true });
});
