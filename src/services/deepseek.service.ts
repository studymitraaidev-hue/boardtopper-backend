import axios from 'axios';
import logger from '../utils/logger';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function askDeepSeek(messages: any[], maxTokens: number = 2000): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('DeepSeek key not configured');

  const res = await axios.post(
    DEEPSEEK_URL,
    {
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return res.data.choices?.[0]?.message?.content || '';
}
