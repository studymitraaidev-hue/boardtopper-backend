import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseKey = process.env['SUPABASE_SECRET_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('[cron] FATAL: SUPABASE_URL or SUPABASE_SECRET_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run(): Promise<void> {
  const now = new Date().toISOString();
  console.log(JSON.stringify({ level: 'info', message: '[cron] expire-subscriptions started', runAt: now }));

  // Step 1: Expire overdue active subscriptions
  const { data: expiredSubs, error: expireError } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .in('status', ['active', 'pending'])
    .lt('ends_at', now)
    .select('user_id');

  if (expireError) {
    console.error(JSON.stringify({ level: 'error', message: '[cron] Failed to expire subscriptions', error: expireError.message }));
    process.exit(1);
  }

  const affectedUserIds = (expiredSubs ?? []).map((r: { user_id: string }) => r.user_id);

  // Step 2: Downgrade users with no other active subscription
  let downgradedCount = 0;

  if (affectedUserIds.length > 0) {
    const { data: stillActive } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('user_id', affectedUserIds)
      .eq('status', 'active')
      .gt('ends_at', now);

    const stillActiveIds = new Set((stillActive ?? []).map((r: { user_id: string }) => r.user_id));
    const toDowngrade    = affectedUserIds.filter((id: string) => !stillActiveIds.has(id));

    if (toDowngrade.length > 0) {
      const { error: downgradeError } = await supabase
        .from('users')
        .update({ plan: 'free' })
        .in('id', toDowngrade);

      if (downgradeError) {
        console.error(JSON.stringify({ level: 'error', message: '[cron] Failed to downgrade users', error: downgradeError.message }));
      } else {
        downgradedCount = toDowngrade.length;
      }
    }
  }

  // Step 3: Clean up expired generated_questions rows
  const { error: cleanupError } = await supabase
    .from('generated_questions')
    .delete()
    .lt('expires_at', now);

  if (cleanupError) {
    console.warn(JSON.stringify({ level: 'warn', message: '[cron] generated_questions cleanup failed', error: cleanupError.message }));
  }

  console.log(JSON.stringify({
    level:   'info',
    message: '[cron] expire-subscriptions completed',
    expiredSubscriptions: affectedUserIds.length,
    downgradedUsers:      downgradedCount,
    runAt:                now,
  }));
}

run().catch((err: unknown) => {
  console.error(JSON.stringify({ level: 'error', message: '[cron] Unhandled error', error: (err as Error).message }));
  process.exit(1);
});
