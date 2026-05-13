import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from './env';

export const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SECRET_KEY
);

export default supabase;
