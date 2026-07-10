import config from '../config/env';

export interface CerebrasRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

const CEREBRAS_MODELS = ['gpt-oss-120b', 'zai-glm-4.7', 'gemma-4-31b'];

export async function askCerebras(req: CerebrasRequest): Promise<{ text: string }> {
  const messages = [
    { role: 'system', content: req.systemPrompt },
    ...(req.history ?? []).map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: req.userMessage },
  ];

  let lastErr = '';

  for (const model of CEREBRAS_MODELS) {
    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.2 }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Cerebras ${model}]`, response.status, err);
        lastErr = `${model}: ${response.status}`;
        continue;
      }

      const data = (await response.json()) as { choices: { message: { content: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) { lastErr = `${model}: empty`; continue; }

      console.log(`[Cerebras] ✅ ${model}`);
      return { text };
    } catch (e: any) {
      lastErr = `${model}: ${e.message}`;
      console.error(`[Cerebras ${model}]`, e.message);
    }
  }

  throw new Error(`Cerebras exhausted: ${lastErr}`);
}
