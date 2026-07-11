import config from '../config/env';

export interface CerebrasRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

const CEREBRAS_MODELS = ['gpt-oss-120b', 'zai-glm-4.7'];

export async function askCerebras(req: CerebrasRequest): Promise<{ text: string }> {
  const historyMessages = (req.history ?? []).map((m) => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.text,
  }));

  let lastError: Error | null = null;

  for (const model of CEREBRAS_MODELS) {
    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: req.systemPrompt },
            ...historyMessages,
            { role: 'user', content: req.userMessage },
          ],
          max_tokens: 2048,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[Cerebras HTTP error] model=${model}`, response.status, errBody);
        lastError = new Error(`Cerebras ${model} unavailable`);
        continue;
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        lastError = new Error(`Cerebras ${model} empty response`);
        continue;
      }

      console.log(`[Cerebras] ✅ ${model}`);
      return { text };
    } catch (e: any) {
      console.error(`[Cerebras exception] model=${model}`, e.message);
      lastError = e;
      continue;
    }
  }

  throw lastError ?? new Error('Cerebras unavailable');
}
