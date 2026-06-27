import config from '../config/env';

export interface OpenRouterRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

export async function askOpenRouter(req: OpenRouterRequest): Promise<{ text: string }> {
  try {
    const historyMessages = (req.history ?? []).map((m) => ({
      role:    m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
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
      console.error('[OpenRouter HTTP error]', response.status, errBody);
      throw new Error('OpenRouter unavailable');
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('OpenRouter unavailable');
    }

    return { text };
  } catch {
    throw new Error('OpenRouter unavailable');
  }
}
