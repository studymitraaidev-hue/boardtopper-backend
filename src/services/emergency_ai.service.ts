import { askCerebras } from './cerebras.service';
import { askCloudflare } from './cloudflare.service';
import { withTimeout } from './gemini.service';

export interface EmergencyAIRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

export interface EmergencyAIResponse {
  text: string;
  provider: string;
}

export async function askEmergencyAI(req: EmergencyAIRequest): Promise<EmergencyAIResponse> {
  // 1. Try Cerebras (dedicated for emergency, 1M tokens/day)
  try {
    const { text } = await withTimeout(askCerebras({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    }), 15000);
    return { text, provider: 'cerebras' };
  } catch (e: any) {
    console.error('[EmergencyAI->Cerebras]', e.message);
  }

  // 2. Fallback to Cloudflare (fastest edge)
  try {
    const { text } = await withTimeout(askCloudflare({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
    }), 10000);
    return { text, provider: 'cloudflare' };
  } catch (e: any) {
    console.error('[EmergencyAI->Cloudflare]', e.message);
  }

  throw new Error('Emergency AI providers failed. Please try again.');
}
