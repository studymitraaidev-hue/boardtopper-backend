import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import config from './env';

export const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SECRET_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

export default supabase;
