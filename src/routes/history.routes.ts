import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const getSupabase = () => createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

router.post('/save', authenticate, async (req: any, res) => {
  try {
    const { question, answer, subject } = req.body;
    const userId = req.user?.id || req.user?.userId;
    console.log('[HISTORY SAVE] userId:', userId, 'body:', req.body);
    
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!question || !answer) return res.status(400).json({ error: 'Missing question or answer' });

    const { error } = await getSupabase().from('ai_chat_history').insert({ 
      user_id: userId, question, answer, subject: subject || 'general' 
    });
    
    if (error) {
      console.error('[HISTORY SAVE ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('[HISTORY SAVE CRASH]', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    console.log('[HISTORY GET] userId:', userId);
    
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const { data, error } = await getSupabase()
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[HISTORY GET ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (e: any) {
    console.error('[HISTORY GET CRASH]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
