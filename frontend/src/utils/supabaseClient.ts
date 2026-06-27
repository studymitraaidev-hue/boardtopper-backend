import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] as string;
const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set ' +
    'in your .env file for Google OAuth to work.'
  );
}

/**
 * Supabase JS client — used ONLY for OAuth flows (signInWithOAuth,
 * getSession after redirect). All other data access goes through
 * our Express backend, not Supabase directly.
 */
export const supabase = createClient(
  SUPABASE_URL  ?? '',
  SUPABASE_ANON_KEY ?? ''
);
