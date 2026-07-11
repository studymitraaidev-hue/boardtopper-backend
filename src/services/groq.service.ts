import config from '../config/env';

export interface GroqRequest {
  systemPrompt: string;
  userMessage: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

// Circuit breaker
let failures = 0;
let lastFailure = 0;
const THRESHOLD = 3;
const COOLDOWN = 60000;

function isOpen(): boolean {
  if (failures >= THRESHOLD && Date.now() - lastFailure < COOLDOWN) return true;
  if (Date.now() - lastFailure >= COOLDOWN) failures = 0;
  return false;
}
function recordFail() { failures++; lastFailure = Date.now(); }
function recordOk() { failures = 0; }

const fetchWithTimeout = (url: string, opts: RequestInit, ms = 12000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

const GROQ_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];

export async function askGroq(req: GroqRequest): Promise<{ text: string }> {
  if (isOpen()) throw new Error('Groq circuit open');

  const historyMessages = (req.history ?? []).map((m) => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.text,
  }));

  let lastErr = '';

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.GROQ_API_KEY}`,
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
        const err = await response.text();
        console.error(`[Groq ${model}]`, response.status, err);
        if (response.status === 429) recordFail();
        lastErr = `${model}: ${response.status}`;
        continue;
      }

      const data = (await response.json()) as { choices: { message: { content: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) { lastErr = `${model}: empty`; continue; }

      recordOk();
      console.log(`[Groq] ✅ ${model}`);
      return { text };
    } catch (e: any) {
      lastErr = `${model}: ${e.message}`;
      console.error(`[Groq ${model}]`, e.message);
    }
  }

  throw new Error(`Groq exhausted: ${lastErr}`);
}
