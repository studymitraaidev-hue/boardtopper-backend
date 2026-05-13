import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * DAY 2 SCOPE: board is always 'maharashtra'.
 */
export interface StoredUser {
  id:                string;
  name:              string;
  email:             string;
  passwordHash:      string;
  plan:              'free' | 'pro';
  board:             'maharashtra';
  language:          'english' | 'marathi' | 'hindi' | 'semi';
  targetPercent:     number;
  weakSubjects:      string[];
  examDate:          string | null;
  streakCount:       number;
  lastActiveDate:    string | null;
  resetToken:        string | null;
  resetTokenExpires: string | null;
  onboardingComplete: boolean;
  emailVerified:     boolean;
  emailVerifyToken:  string | null;
  createdAt:         Date;
  updatedAt:         Date;
  deletedAt:         string | null;
  // DAY 38: Postgres fallback for JWT revocation when Redis is unavailable
  loggedOutAt:       string | null;
}

export interface CreateUserInput {
  name:         string;
  email:        string;
  passwordHash: string;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface UserRow {
  id:                  string;
  name:                string;
  email:               string;
  password_hash:       string;
  plan:                'free' | 'pro';
  board:               'maharashtra';
  language:            'english' | 'marathi' | 'hindi' | 'semi';
  target_percent:      number;
  weak_subjects:       string[];
  exam_date:           string | null;
  streak_count:        number;
  last_active_date:    string | null;
  reset_token:         string | null;
  reset_token_expires: string | null;
  onboarding_complete: boolean;
  email_verified:      boolean;
  email_verify_token:  string | null;
  created_at:          string;
  updated_at:          string;
  deleted_at:          string | null;
  // DAY 38
  logged_out_at:       string | null;
}

function toStoredUser(row: UserRow): StoredUser {
  return {
    id:                row.id,
    name:              row.name,
    email:             row.email,
    passwordHash:      row.password_hash,
    plan:              row.plan,
    board:             row.board,
    language:          row.language          ?? 'english',
    targetPercent:     row.target_percent     ?? 90,
    weakSubjects:      row.weak_subjects      ?? [],
    examDate:          row.exam_date          ?? null,
    streakCount:       row.streak_count       ?? 0,
    lastActiveDate:    row.last_active_date   ?? null,
    resetToken:        row.reset_token        ?? null,
    resetTokenExpires: row.reset_token_expires ?? null,
    onboardingComplete: row.onboarding_complete ?? false,
    emailVerified:    row.email_verified    ?? false,
    emailVerifyToken: row.email_verify_token ?? null,
    createdAt:         new Date(row.created_at),
    updatedAt:         new Date(row.updated_at),
    deletedAt:         row.deleted_at ?? null,
    loggedOutAt:       row.logged_out_at ?? null,
  };
}

// ─── Store methods ────────────────────────────────────────────────────────────

export async function findByEmail(email: string): Promise<StoredUser | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();
  if (error || !data) return undefined;
  return toStoredUser(data as UserRow);
}

export async function findById(id: string): Promise<StoredUser | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return undefined;
  return toStoredUser(data as UserRow);
}

export async function findByResetToken(token: string): Promise<StoredUser | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token', token)
    .single();
  if (error || !data) return undefined;
  return toStoredUser(data as UserRow);
}

/**
 * createUser — always writes board = 'maharashtra'.
 */
export async function createUser(input: CreateUserInput): Promise<StoredUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      name:                input.name.trim(),
      email:               input.email.toLowerCase().trim(),
      password_hash:       input.passwordHash,
      plan:                'free',
      board:               'maharashtra',
      language:            'english',
      target_percent:      90,
      weak_subjects:       [],
      streak_count:        0,
      email_verified:      false,
      email_verify_token:  null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create user');
  return toStoredUser(data as UserRow);
}

/**
 * updateUser — maps TypeScript camelCase fields to snake_case DB columns.
 */
export async function updateUser(
  id:   string,
  data: Partial<StoredUser>,
): Promise<StoredUser | undefined> {
  const payload: Record<string, unknown> = {};

  if (data.name              !== undefined) payload['name']                = data.name;
  if (data.plan              !== undefined) payload['plan']                = data.plan;
  if (data.board             !== undefined) payload['board']               = data.board;
  if (data.language          !== undefined) payload['language']            = data.language;
  if (data.targetPercent     !== undefined) payload['target_percent']      = data.targetPercent;
  if (data.weakSubjects      !== undefined) payload['weak_subjects']       = data.weakSubjects;
  if (data.examDate          !== undefined) payload['exam_date']           = data.examDate;
  if (data.streakCount       !== undefined) payload['streak_count']        = data.streakCount;
  if (data.lastActiveDate    !== undefined) payload['last_active_date']    = data.lastActiveDate;
  if (data.passwordHash      !== undefined) payload['password_hash']       = data.passwordHash;
  if (data.resetToken        !== undefined) payload['reset_token']         = data.resetToken;
  if (data.resetTokenExpires !== undefined) payload['reset_token_expires'] = data.resetTokenExpires;
  if (data.onboardingComplete !== undefined) payload['onboarding_complete'] = data.onboardingComplete;
  if (data.emailVerified    !== undefined) payload['email_verified']     = data.emailVerified;
  if (data.emailVerifyToken !== undefined) payload['email_verify_token'] = data.emailVerifyToken;
  if (data.deletedAt         !== undefined) payload['deleted_at']          = data.deletedAt;
  if (data.email             !== undefined) payload['email']               = data.email;
  // DAY 38: Postgres logout fallback
  if (data.loggedOutAt       !== undefined) payload['logged_out_at']       = data.loggedOutAt;

  payload['updated_at'] = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !row) return undefined;
  return toStoredUser(row as UserRow);
}
