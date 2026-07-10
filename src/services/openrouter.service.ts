import config from '../config/env';

export interface OpenRouterRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'openrouter/free',
];

const fetchWithTimeout = (url: string, opts: RequestInit, ms = 15000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

export async function askOpenRouter(req: OpenRouterRequest): Promise<{ text: string }> {
  const historyMessages = (req.history ?? []).map((m) => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.text,
  }));

  let lastErr = '';

  for (const model of FREE_MODELS) {
    try {
      const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
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
        const body = await response.text();
        console.error(`[OpenRouter ${model}]`, response.status, body);
        lastErr = `${model}: ${response.status}`;
        continue;
      }

      const data = (await response.json()) as { choices: { message: { content: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) { lastErr = `${model}: empty response`; continue; }

      console.log(`[OpenRouter] ✅ ${model}`);
      return { text };
    } catch (e: any) {
      lastErr = `${model}: ${e.message}`;
      console.error(`[OpenRouter ${model}]`, e.message);
    }
  }

  throw new Error(`OpenRouter exhausted: ${lastErr}`);
}
