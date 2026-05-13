import bcrypt from 'bcryptjs';
import { config } from '../config/env';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.BCRYPT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // Never expose bcrypt internals — treat any error as a mismatch
    return false;
  }
}
