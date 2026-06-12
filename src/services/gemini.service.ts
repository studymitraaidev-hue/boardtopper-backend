
import config from '../config/env';
import { askGroq } from './groq.service';



export interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  // FIX: history is now actually used when building the contents array
  history?: { role: 'user' | 'model'; text: string }[];
  imageBase64?:   string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
}

export async function askGemini(req: GeminiRequest): Promise<GeminiResponse> {
  try {
    // FIX: Build multi-turn contents array from history + current message.
    // Previously, history was accepted in the interface but silently discarded Ã¢â‚¬â€
    // every question was answered without any conversation context.
    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (req.imageBase64 && req.imageMimeType) {
      userParts.push({
        inlineData: {
          mimeType: req.imageMimeType,
          data:     req.imageBase64,
        },
      });
    }

    userParts.push({ text: req.userMessage });

    const contents = [
      ...(req.history ?? []).map((m) => ({
        role:  m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: userParts },
    ];

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model:    'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: req.systemPrompt,
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error('Empty response from AI model');
    }

    return { text, tokensUsed: undefined };
  } catch (err: unknown) {
    if (err instanceof Error) {
    console.error('[Gemini original error]', err);
      const msg = err.message.toLowerCase();
      if (
        msg.includes('api key') ||
        msg.includes('unauthorized') ||
        msg.includes('permission')
      ) {
        throw new Error('AI service configuration error. Please contact support.');
      }
      if (
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('resource exhausted')
      ) {
        try {
          const groqResult = await askGroq({
            systemPrompt: req.systemPrompt,
            userMessage:  req.userMessage,
            history:      req.history,
          });
          return { text: groqResult.text, tokensUsed: undefined };
        } catch (groqErr) {
          console.error('[Groq fallback error]', groqErr);
        }
        throw new Error('AI service is currently busy. Please try again in a moment.');
      }
      if (msg.includes('empty response')) {
        throw new Error(
          'AI service returned an empty response. Please rephrase your question.'
        );
      }
    }

    try {
      const groqResult = await askGroq({
        systemPrompt: req.systemPrompt,
        userMessage:  req.userMessage,
        history:      req.history,
      });
      return { text: groqResult.text, tokensUsed: undefined };
    } catch {
      // Groq also failed Ã¢â‚¬â€ throw original error
    }

    throw new Error('AI service encountered an unexpected error. Please try again.');
  }
}