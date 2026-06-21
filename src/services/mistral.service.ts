import config from '../config/env';

export interface MistralRequest {
  systemPrompt: string;
  userMessage:  string;
  history?:     { role: 'user' | 'model'; text: string }[];
}

export async function askMistral(req: MistralRequest): Promise<{ text: string }> {
  const historyMessages = (req.history ?? []).map((m) => ({
    role:    m.role === 'model' ? 'assistant' : 'user',
    content: m.text,
  }));
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${config.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: req.systemPrompt },
        ...historyMessages,
        { role: 'user', content: req.userMessage },
      ],
      max_tokens:  2048,
      temperature: 0.2,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral error: ${response.status} ${err}`);
  }
  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Mistral');
  return { text };
}
