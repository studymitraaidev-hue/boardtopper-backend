import axios from 'axios';
import { StoredPYQ } from '../data/pyqs.store';
import logger from '../utils/logger';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  marks: number;
  type: 'mcq' | 'very_short' | 'short' | 'long';
  chapterId: string;
  subjectId: string;
  answerHint: string;
  source: 'ai';
  options?: string[];
  correctIndex?: number;
}

// ─── OpenRouter Config ─────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PRIMARY_MODEL = 'google/gemma-4-26b-a4b-it:free';
const FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openai/gpt-oss-20b:free',
];

// ─── DeepSeek Config ───────────────────────────────────────────────────────

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// ─── OpenRouter Caller ───────────────────────────────────────────────────────

async function askOpenRouter(model: string, messages: any[], maxTokens: number = 2000): Promise<string> {
  const res = await axios.post(
    OPENROUTER_URL,
    { model, messages, max_tokens: maxTokens },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://boardtopper.app',
        'X-Title': 'Boardtopper',
      },
      timeout: 30000,
    }
  );

  return res.data?.choices?.[0]?.message?.content || '';
}

// ─── DeepSeek Caller ───────────────────────────────────────────────────────

async function askDeepSeek(messages: any[], maxTokens: number = 2000): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error('DeepSeek key not configured');

  const res = await axios.post(
    DEEPSEEK_URL,
    {
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return res.data?.choices?.[0]?.message?.content || '';
}

// ─── Retry with Fallbacks (OpenRouter → DeepSeek) ───────────────────────────

async function askWithFallback(messages: any[], maxTokens: number = 2000): Promise<string> {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  for (const model of models) {
    try {
      const content = await askOpenRouter(model, messages, maxTokens);
      logger.info(`[AIFill] Success with ${model}`);
      return content;
    } catch (err) {
      logger.warn(`[AIFill] ${model} failed, trying next...`);
      continue;
    }
  }

  // Final fallback: DeepSeek
  try {
    const content = await askDeepSeek(messages, maxTokens);
    logger.info('[AIFill] Success with DeepSeek');
    return content;
  } catch (err) {
    logger.warn('[AIFill] DeepSeek failed');
  }

  throw new Error('All AI models failed');
}

// ─── Prompt Builder with Database Context ───────────────────────────────────

function buildPrompt(
  subjectId: string,
  chapterIds: string[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  marksEach: number,
  count: number,
  existingPYQs: StoredPYQ[],
  subjectName?: string,
  chapterNames?: string[]
): string {
  const contextQuestions = existingPYQs
    .slice(0, 3)
    .map(p => `- "${p.question}" (${p.marks} marks)`)
    .join('\n');

  const chapterContext = chapterNames?.join(', ') || chapterIds.join(', ');

  const base = `You are an expert Maharashtra SSC 10th board exam question setter with 20+ years of experience.

SUBJECT: ${subjectName || subjectId}
CHAPTERS: ${chapterContext}
QUESTION TYPE: ${type}
MARKS PER QUESTION: ${marksEach}
COUNT: ${count}

REAL PAST-YEAR QUESTIONS FROM DATABASE (for style reference):
${contextQuestions || 'No past questions available for this chapter.'}

RULES:
- Competency-based: Test application and analysis, not just recall
- Use real-world scenarios where possible
- Match Maharashtra board language and terminology
- For Financial Planning: Include EMI, compound interest, depreciation problems
- For Geometry: Reference diagrams (e.g., "In the given figure...")
- For Science: Include chemical equations, numerical problems, life process diagrams
- For History: Include cause-effect, timeline-based, map identification
- For Geography: Include map-based questions, climate graphs, resource distribution

OUTPUT STRICT JSON ARRAY.`;

  if (type === 'mcq') {
    return base + `\n\nGenerate ${count} MCQs. Each must have exactly 4 options (A, B, C, D) with exactly one correct answer.
Distractors must be plausible — common student errors or conceptually similar wrong answers.
Output: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0,"difficulty":"easy|medium|hard","explanation":"..."}]`;
  }

  if (type === 'short') {
    return base + `\n\nGenerate ${count} short answer questions (2-3 marks).
Point-wise answers preferred. Include definitions with examples.
Output: [{"question":"...","difficulty":"easy|medium|hard","keyPoints":["point1","point2","point3"]}]`;
  }

  if (type === 'long') {
    return base + `\n\nGenerate ${count} long answer questions (4-5 marks).
Include real-world context, case studies, or multi-step problems.
Structure: Introduction → Body → Conclusion.
Output: [{"question":"...","difficulty":"easy|medium|hard","keyPoints":["point1","point2","point3","point4","point5"]}]`;
  }

  return base + `\n\nGenerate ${count} questions. Output as JSON array.`;
}

// ─── Response Parser ───────────────────────────────────────────────────────

function parseAIResponse(
  response: string,
  subjectId: string,
  chapterIds: string[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  marksEach: number
): AIGeneratedQuestion[] {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || response.match(/(\[[\s\S]*\])/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

  const parsed = JSON.parse(jsonStr);
  const questions = Array.isArray(parsed) ? parsed : [parsed];

  return questions.map((q: any, i: number) => ({
    id: `ai-${subjectId}-${type}-${Date.now()}-${i}`,
    question: q.question,
    marks: marksEach,
    type,
    chapterId: chapterIds[i % chapterIds.length],
    subjectId,
    answerHint: q.explanation || q.keyPoints?.join('; ') || 'Think about key concepts from this chapter.',
    source: 'ai',
    options: q.options,
    correctIndex: q.correctIndex,
  }));
}

// ─── Main Export ───────────────────────────────────────────────────────────

export async function generateQuestions(
  subjectId: string,
  chapterIds: string[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  marksEach: number,
  count: number,
  existingPYQs: StoredPYQ[],
  subjectName?: string,
  chapterNames?: string[]
): Promise<AIGeneratedQuestion[]> {
  if (count <= 0) return [];

  logger.info(`[AIFill] Generating ${count} ${type} questions (${marksEach} marks each) for ${subjectId}`);

  try {
    const prompt = buildPrompt(subjectId, chapterIds, type, marksEach, count, existingPYQs, subjectName, chapterNames);
    const aiResponse = await askWithFallback([
      { role: 'system', content: 'You are an expert Maharashtra SSC 10th board exam question setter.' },
      { role: 'user', content: prompt }
    ], 2048);

    const parsed = parseAIResponse(aiResponse, subjectId, chapterIds, type, marksEach);
    logger.info(`[AIFill] Generated ${parsed.length} questions via AI`);
    return parsed;
  } catch (err) {
    logger.error('[AIFill] AI generation failed, returning empty', err);
    return [];
  }
}

export default { generateQuestions };
