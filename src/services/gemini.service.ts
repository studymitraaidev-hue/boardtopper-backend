import config from '../config/env';
import { askCloudflare } from './cloudflare.service';
import { askCerebras } from './cerebras.service';
import { askGroq } from './groq.service';
import { askMistral } from './mistral.service';

export interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Provider timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function askGemini(req: GeminiRequest): Promise<GeminiResponse> {
  // 1. Try Cloudflare (fastest, most reliable)
  try {
    const { text } = await withTimeout(askCloudflare({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
    }), 10000);
    return { text };
  } catch (e: any) {
    console.error('[Cloudflare]', e.message);
  }

  // 2. Try Cerebras (highest daily volume: 1M tokens/day)
  try {
    const { text } = await withTimeout(askCerebras({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    }), 10000);
    return { text };
  } catch (e: any) {
    console.error('[Cerebras]', e.message);
  }

  // 3. Try Groq (fast but token-thin, 8K TPM)
  try {
    const { text } = await withTimeout(askGroq({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    }), 10000);
    return { text };
  } catch (e: any) {
    console.error('[Groq]', e.message);
  }

  // 4. Try Gemini (good quality, 5 RPM limit)
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    const contents = req.history
      ? req.history.map((h) => `${h.role === 'model' ? 'A' : 'Q'}: ${h.text}`).join('\n') + '\nQ: ${req.userMessage}'
      : req.userMessage;

    const result = await withTimeout(ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
    }), 10000);
    if (result.text) return { text: result.text };
  } catch (e: any) {
    console.error('[Gemini]', e.status || e.message);
  }

  // 5. Try Mistral (final fallback)
  try {
    const { text } = await withTimeout(askMistral({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    }), 10000);
    return { text };
  } catch (e: any) {
    console.error('[Mistral]', e.message);
  }

  throw new Error('All AI providers failed. Please try again in a moment.');
}
