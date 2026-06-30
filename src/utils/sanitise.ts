// Extracted from ai.controller.ts to be reusable across controllers
export function sanitiseInput(raw: string): string {
  let text = raw.trim().slice(0, 2000);

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /you\s+are\s+now\s+/gi,
    /new\s+system\s+prompt/gi,
    /override\s+(your\s+)?(instructions?|prompt|rules)/gi,
  ];

  for (const pattern of injectionPatterns) {
    text = text.replace(pattern, '[removed]');
  }

  return text;
}
