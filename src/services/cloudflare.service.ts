import logger from '../utils/logger';

const CF_API_TOKEN = process.env.CF_API_TOKEN!;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-sd';

export async function askCloudflare({
  systemPrompt,
  userMessage,
}: {
  systemPrompt: string;
  userMessage: string;
}): Promise<{ text: string }> {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    throw new Error('Cloudflare credentials missing');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Cloudflare ${response.status}: ${errBody}`);
  }

  const data: any = await response.json();
  const text = data.result?.response || data.result?.content || data.result?.text || '';
  
  logger.info(`[Cloudflare] generated ${text.length} chars`);
  return { text };
}
