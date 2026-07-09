import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

router.post('/save', authenticate, async (req: any, res) => {
  const { question, answer, subject } = req.body;
  const userId = req.user?.id || req.user?.userId;
  const { error } = await supabase.from('ai_chat_history').insert({ user_id: userId, question, answer, subject });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.get('/', authenticate, async (req: any, res) => {
  const userId = req.user?.id || req.user?.userId;
  const { data, error } = await supabase.from('ai_chat_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
