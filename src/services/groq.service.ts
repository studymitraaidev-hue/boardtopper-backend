import config from '../config/env';

export interface GroqRequest {
  systemPrompt: string;
  userMessage: string;
  // FIX: history added so Groq fallback also gets conversation context
  history?: { role: 'user' | 'model'; text: string }[];
}

export async function askGroq(req: GroqRequest): Promise<{ text: string }> {
  try {
    // FIX: Build multi-turn messages array from history + current message.
    // Groq uses OpenAI-compatible format: role is 'user' | 'assistant'
    const historyMessages = (req.history ?? []).map((m) => ({
      role:    m.role === 'model' ? 'assistant' : 'user',
      content: m.text,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${config.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: req.systemPrompt },
          ...historyMessages,
          { role: 'user', content: req.userMessage },
        ],
        // FIX: was 1024 â€” too short for Maharashtra board 5-mark answers (~500-800 words).
        // At ~4 chars/token, 1024 tokens â‰ˆ 400 words â€” answers were cut off mid-sentence.
        max_tokens:  2048,
        // FIX: lowered temperature for more consistent board-style answers
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[Groq HTTP error]', response.status, errBody);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Groq unavailable');
    }

    return { text };
  } catch {
    throw new Error('Groq unavailable');
  }
}