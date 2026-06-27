export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateEmail(email: string): ValidationResult {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return { valid: false, error: 'Email is required.' };
  if (!re.test(email)) return { valid: false, error: 'Enter a valid email address.' };
  return { valid: true, error: null };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required.' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Include at least one uppercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Include at least one number.' };
  return { valid: true, error: null };
}

export function validateName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, error: 'Full name is required.' };
  if (name.trim().length < 2) return { valid: false, error: 'Name must be at least 2 characters.' };
  return { valid: true, error: null };
}
