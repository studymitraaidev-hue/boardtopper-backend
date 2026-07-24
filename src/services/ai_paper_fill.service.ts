import axios from 'axios';
import { StoredPYQ } from '../data/pyqs.store';
import logger from '../utils/logger';
import { getCachedQuestionsBySubjectAny } from '../data/generated_questions.store';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  marks: number;
  type: 'mcq' | 'very_short' | 'short' | 'long';
  chapterId: string;
  subjectId: string;
  answerHint?: string;
  source: 'ai' | 'db_cache' | 'template';
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

// ─── Hugging Face Config ───────────────────────────────────────────────────

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_MODEL = 'meta-llama/Llama-3.2-3B-Instruct';
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

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

// ─── Hugging Face Caller ─────────────────────────────────────────────────────

async function askHuggingFace(messages: any[], maxTokens: number = 2000): Promise<string> {
  if (!HF_TOKEN) throw new Error('Hugging Face token not configured');

  const prompt = messages.map(m => m.content).join('\n\n');
  const res = await axios.post(
    HF_URL,
    {
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens, return_full_text: false, temperature: 0.7 }
    },
    {
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  // HF returns array of generated texts
  const generated = Array.isArray(res.data) ? res.data[0] : res.data;
  return generated?.generated_text || generated || '';
}

// ─── Retry with Fallbacks (OpenRouter → Hugging Face) ───────────────────────

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

  // Final fallback: Hugging Face
  try {
    const content = await askHuggingFace(messages, maxTokens);
    logger.info('[AIFill] Success with Hugging Face');
    return content;
  } catch (err) {
    logger.warn('[AIFill] Hugging Face failed');
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
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || response.match(/(\[[\s\S]*\])/);
  let jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
  // Sanitize invalid JSON escapes (AI often emits LaTeX-style backslashes like \frac, \( )
  jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

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
  if (count <= 0) return generateTemplateQuestions(subjectId, chapterIds, type, marksEach, count);

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
    logger.error('[AIFill] AI generation failed, trying DB cache fallback', err);
    
    // DB cache fallback (real questions with correct answers) — MCQ only
    if (type === 'mcq') {
      try {
        const cached = await getCachedQuestionsBySubjectAny(subjectId, count);
        if (cached.length > 0) {
          logger.info(`[AIFill] Filled ${cached.length} MCQs from DB cache`);
          return cached.map(q => ({
            id: q.id,
            subjectId: q.subjectId,
            chapterId: q.chapterId,
            question: q.question,
            type: 'mcq' as const,
            marks: marksEach,
            source: 'db_cache' as const,
            options: q.options,
            correctIndex: q.correctIndex,
            answerHint: 'Refer to your textbook for detailed explanation.',
          }));
        }
      } catch (cacheErr) {
        logger.error('[AIFill] DB cache fallback also failed', cacheErr);
      }
    }
    
    logger.warn('[AIFill] Using template fallback as last resort');
    return generateTemplateQuestions(subjectId, chapterIds, type, marksEach, count);
  }
}

export default { generateQuestions };

// ─── Template Fallback (guaranteed, lower quality) ─────────────────────────

const TEMPLATE_QUESTIONS: Record<string, Record<string, string[]>> = {
  algebra: {
    mcq: [
      'Which of the following is the standard form of a quadratic equation?',
      'The discriminant of ax² + bx + c = 0 is:',
      'If the roots of x² - 5x + 6 = 0 are α and β, then α + β =',
      'The common difference of AP: 2, 5, 8, 11... is:',
      'Which term of AP 3, 8, 13, 18... is 78?',
    ],
  },
  geometry: {
    mcq: [
      'In similar triangles, the ratio of corresponding sides is equal to:',
      'The Pythagorean theorem states that in a right triangle:',
      'The angle subtended by a diameter at any point on the circle is:',
    ],
  },
  science1: {
    mcq: [
      'The SI unit of gravitational constant G is:',
      "Ohm's law states that:",
      'The chemical formula of water is:',
    ],
  },
  science2: {
    mcq: [
      "Mendel's law of segregation states that:",
      'The process of photosynthesis occurs in:',
      'Greenhouse effect is caused by excess of:',
    ],
  },
  english: {
    mcq: [
      'The correct form of the verb: "She ___ to school every day."',
      'Identify the figure of speech: "Her voice is music to my ears."',
      'The antonym of "brave" is:',
    ],
  },
};

export function generateTemplateQuestions(
  subjectId: string,
  chapterIds: string[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  marksEach: number,
  count: number
): AIGeneratedQuestion[] {
  const subjectTemplates = TEMPLATE_QUESTIONS[subjectId] || TEMPLATE_QUESTIONS['algebra'];
  const typeTemplates = subjectTemplates[type] || subjectTemplates['mcq'] || [];
  const questions: AIGeneratedQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const template = typeTemplates[i % typeTemplates.length];
    questions.push({
      id: `template-${subjectId}-${type}-${i}`,
      question: `${template} [Template Fallback]`,
      marks: marksEach,
      type,
      chapterId: chapterIds[i % chapterIds.length],
      subjectId,
      answerHint: 'Refer to your textbook for the exact formula.',
      source: 'template',
      options: type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
      correctIndex: type === 'mcq' ? 0 : undefined,
    });
  }
  return questions;
}
