import config from '../config/env';
import { askGroq } from './groq.service';
import { askOpenRouter } from './openrouter.service';
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

export async function askGemini(req: GeminiRequest): Promise<GeminiResponse> {
  // 1. Try Gemini
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    const contents = req.history
      ? req.history.map((h) => `${h.role === 'model' ? 'A' : 'Q'}: ${h.text}`).join('\n') + `\nQ: ${req.userMessage}`
      : req.userMessage;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents,
    });
    if (result.text) return { text: result.text };
  } catch (e: any) {
    console.error('[Gemini primary]', e.status || e.message);
  }

  // 2. Try Mistral
  try {
    const { text } = await askMistral({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    });
    return { text };
  } catch (e: any) {
    console.error('[Gemini->Mistral]', e.message);
  }

  // 3. Try OpenRouter
  try {
    const { text } = await askOpenRouter({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    });
    return { text };
  } catch (e: any) {
    console.error('[Gemini->OpenRouter]', e.message);
  }

  // 4. Try Groq (last — smallest daily token budget)
  try {
    const { text } = await askGroq({
      systemPrompt: req.systemPrompt,
      userMessage: req.userMessage,
      history: req.history,
    });
    return { text };
  } catch (e: any) {
    console.error('[Gemini->Groq]', e.message);
  }

  throw new Error('All AI providers failed. Please try again in a moment.');
}
