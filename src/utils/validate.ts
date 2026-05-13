// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At least 8 chars, 1 uppercase letter, 1 digit
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(body: Record<string, unknown>, key: string): string {
  const val = body[key];
  if (typeof val !== 'string') throw new Error(`${key} must be a string`);
  return val.trim();
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateRegisterBody(body: unknown): RegisterInput {
  if (!isObject(body)) throw new Error('Request body must be a JSON object');

  const name = getString(body, 'name');
  const email = getString(body, 'email');
  const password = getString(body, 'password');

  if (name.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Please provide a valid email address');
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw new Error(
      'Password must be at least 8 characters and contain at least one uppercase letter and one number'
    );
  }

  return { name, email, password };
}

export function validateLoginBody(body: unknown): LoginInput {
  if (!isObject(body)) throw new Error('Request body must be a JSON object');

  const email = getString(body, 'email');
  const password = getString(body, 'password');

  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');

  return { email, password };
}
