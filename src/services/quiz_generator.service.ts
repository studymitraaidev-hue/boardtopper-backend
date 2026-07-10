import { askGroq } from './groq.service';
import { askOpenRouter } from './openrouter.service';
import { askMistral } from './mistral.service';
import logger from '../utils/logger';

export interface RawQuestion {
  question: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Try to extract JSON array from any text */
function extractJSON(text: string): any[] | null {
  // Method 1: Code block
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]); } catch { /* ignore */ }
  }
  
  // Method 2: Raw array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* ignore */ }
  }
  
  // Method 3: Full text
  try { return JSON.parse(text); } catch { /* ignore */ }
  
  return null;
}

/** Validate and clean questions */
function validateQuestions(data: any[]): RawQuestion[] {
  return data.filter((q: any) => {
    const hasQuestion = typeof q.question === 'string' && q.question.length > 10;
    const hasOptions = Array.isArray(q.options) && q.options.length >= 2;
    const hasCorrectIndex = typeof q.correct_index === 'number' && q.correct_index >= 0;
    return hasQuestion && hasOptions && hasCorrectIndex;
  }).map((q: any) => ({
    question: q.question,
    options: q.options.slice(0, 4).concat(Array(Math.max(0, 4 - q.options.length)).fill('')),
    correct_index: Math.min(3, Math.max(0, q.correct_index)),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    marks: typeof q.marks === 'number' ? q.marks : 1,
  }));
}

/** Call a provider with retry */
async function callProvider(
  name: string,
  fn: () => Promise<{ text: string }>,
  retries = 2
): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fn();
      console.log(`[QuizGen] ✅ ${name} success`);
      return result.text;
    } catch (err: any) {
      console.error(`[QuizGen] ❌ ${name} attempt ${i + 1}: ${err.message}`);
      if (i < retries) await sleep(2000 * (i + 1));
    }
  }
  return null;
}

export async function generateMCQs(params: {
  subjectName: string;
  chapterName: string;
  topics: string[];
  count: number;
}): Promise<RawQuestion[]> {
  const { subjectName, chapterName, topics, count } = params;
  const topicList = topics.slice(0, 10).join(', ');

  const systemPrompt = `You are an expert Maharashtra State Board SSC Class 10 exam question setter with 15 years of experience. You create high-quality MCQ questions that match the exact board exam pattern.`;

  const userPrompt = `Generate exactly ${count} MCQ questions for:
Subject: ${subjectName}
Chapter: ${chapterName}
Key Topics: ${topicList}

STRICT REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only ONE correct answer per question
3. Mix of easy (30%), medium (50%), hard (20%) difficulty
4. Questions must match Maharashtra SSC board exam style and terminology
5. Include conceptual, numerical, and application-based questions
6. Return ONLY a valid JSON array - no markdown, no explanation, no extra text

JSON FORMAT:
[
  {
    "question": "What is the value of x in 2x + 5 = 15?",
    "options": ["5", "10", "15", "20"],
    "correct_index": 0,
    "difficulty": "easy",
    "marks": 1
  }
]`;

  // Try providers in order: Groq → OpenRouter → Mistral
  const providers = [
    {
      name: 'Groq',
      call: () => askGroq({ systemPrompt, userMessage: userPrompt }),
    },
    {
      name: 'OpenRouter',
      call: () => askOpenRouter({ systemPrompt, userMessage: userPrompt }),
    },
    {
      name: 'Mistral',
      call: () => askMistral({ systemPrompt, userMessage: userPrompt }),
    },
  ];

  let lastErr = '';

  for (const provider of providers) {
    const text = await callProvider(provider.name, provider.call, 2);
    if (!text) {
      lastErr += `${provider.name}: failed; `;
      continue;
    }

    const json = extractJSON(text);
    if (!json) {
      lastErr += `${provider.name}: no JSON found; `;
      continue;
    }

    const questions = validateQuestions(json);
    if (questions.length >= Math.max(1, count - 2)) {
      logger.info(`[QuizGen] ✅ ${questions.length} questions from ${provider.name}`);
      return questions.slice(0, count);
    }

    lastErr += `${provider.name}: only ${questions.length} valid questions; `;
  }

  // All providers failed - return fallback so app doesn't crash
  logger.error(`[QuizGen] All providers failed: ${lastErr}`);
  return Array.from({ length: count }, (_, i) => ({
    question: `Practice question ${i + 1} for ${chapterName} (AI service temporarily unavailable - please retry)`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_index: 0,
    difficulty: 'medium',
    marks: 1,
  }));
}
