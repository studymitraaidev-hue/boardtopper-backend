import { randomBytes } from 'crypto';
import supabase from '../config/supabase';

const REFRESH_TOKEN_TTL_DAYS = 30;

// DAY 38: Accept optional deviceName for session tracking
export async function createRefreshToken(userId: string, deviceName?: string): Promise<string> {
  const token = randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  const { error } = await supabase.from('refresh_tokens').insert({
    user_id:     userId,
    token,
    expires_at:  expiresAt.toISOString(),
    device_name: deviceName ?? 'Unknown Device',
    last_seen:   new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to create refresh token: ${error.message}`);
  return token;
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data['expires_at']) < new Date()) {
    await deleteRefreshToken(token);
    return null;
  }

  // DAY 38: Stamp last_seen on every successful validation
  await supabase
    .from('refresh_tokens')
    .update({ last_seen: new Date().toISOString() })
    .eq('token', token);

  return data['user_id'] as string;
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await supabase.from('refresh_tokens').delete().eq('token', token);
}

export async function deleteAllUserTokens(userId: string): Promise<void> {
  await supabase.from('refresh_tokens').delete().eq('user_id', userId);
}

// DAY 38: List all active sessions for a user
export async function listUserSessions(userId: string): Promise<Array<{
  id: string;
  deviceName: string;
  lastSeen: string;
  createdAt: string;
  expiresAt: string;
}>> {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, device_name, last_seen, created_at, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_seen', { ascending: false });

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    device_name: string | null;
    last_seen: string | null;
    created_at: string;
    expires_at: string;
  }>).map((row) => ({
    id:         row.id,
    deviceName: row.device_name ?? 'Unknown Device',
    lastSeen:   row.last_seen   ?? row.created_at,
    createdAt:  row.created_at,
    expiresAt:  row.expires_at,
  }));
}

// DAY 38: Revoke a specific session by ID, scoped to userId for security
export async function deleteRefreshTokenById(tokenId: string, userId: string): Promise<void> {
  await supabase
    .from('refresh_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', userId);
}
