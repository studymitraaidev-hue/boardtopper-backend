import { findById, updateUser } from '../data/users.store';
import logger from './logger';

export async function updateStreak(userId: string): Promise<void> {
  const user = await findById(userId);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const lastActive = user.lastActiveDate;

  if (lastActive === today) {
    return;
  }

  let newStreak: number;

  if (lastActive === yesterdayStr) {
    newStreak = (user.streakCount ?? 0) + 1;
  } else {
    newStreak = 1;
  }

  await updateUser(userId, {
    streakCount:    newStreak,
    lastActiveDate: today,
  });
}
