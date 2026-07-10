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

function extractJSON(text: string): any[] | null {
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1]); } catch {} }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) { try { return JSON.parse(arrayMatch[0]); } catch {} }
  try { return JSON.parse(text); } catch {}
  return null;
}

function validateQuestions(data: any[]): RawQuestion[] {
  return data.filter((q: any) => 
    q.question && q.question.length > 10 &&
    Array.isArray(q.options) && q.options.length >= 2 &&
    typeof q.correct_index === 'number'
  ).map((q: any) => ({
    question: q.question,
    options: q.options.slice(0, 4).concat(Array(Math.max(0, 4 - q.options.length)).fill('')),
    correct_index: Math.min(3, Math.max(0, q.correct_index)),
    difficulty: ['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    marks: q.marks || 1,
  }));
}

// HIGH-QUALITY PROMPT - Under 1,500 tokens to fit Groq 6K limit
// Includes: board pattern, difficulty mix, conceptual variety, proper format
function buildQualityPrompt(subject: string, chapter: string, topics: string[], count: number): string {
  const topicList = topics.slice(0, 10).join(', ');
  
  return `You are an expert Maharashtra State Board SSC Class 10 ${subject} teacher with 20 years of experience.

Generate ${count} HIGH-QUALITY MCQ questions for:
Chapter: ${chapter}
Key Topics: ${topicList}

QUALITY REQUIREMENTS:
1. Match EXACT Maharashtra SSC board exam pattern (March 2025)
2. Each question must test CONCEPTUAL understanding, not just memorization
3. Include: definition-based, numerical, application, and diagram-related questions
4. Options must be PLAUSIBLE distractors (common student mistakes)
5. Use exact board exam terminology and marking scheme language

DIFFICULTY DISTRIBUTION:
- Easy (30%): Direct recall, basic definitions
- Medium (50%): Conceptual understanding, simple numerical
- Hard (20%): Application, multi-step reasoning, tricky concepts

FORMAT - Return ONLY valid JSON array:
[
  {
    "question": "What is the SI unit of electric current?",
    "options": ["Volt", "Ampere", "Ohm", "Watt"],
    "correct_index": 1,
    "difficulty": "easy",
    "marks": 1
  }
]

Generate ${count} questions now. Return ONLY the JSON array. No markdown, no explanation.`;
}

export async function generateMCQs(params: {
  subjectName: string;
  chapterName: string;
  topics: string[];
  count: number;
}): Promise<RawQuestion[]> {
  const { subjectName, chapterName, topics, count } = params;
  const prompt = buildQualityPrompt(subjectName, chapterName, topics, count);

  const providers = [
    { 
      name: 'Groq', 
      call: () => askGroq({ 
        systemPrompt: 'You are an expert Maharashtra SSC board exam question setter. Create high-quality MCQs matching exact board pattern. Return ONLY valid JSON array.',
        userMessage: prompt 
      }) 
    },
    { 
      name: 'OpenRouter', 
      call: () => askOpenRouter({ 
        systemPrompt: 'You are an expert Maharashtra SSC board exam question setter. Create high-quality MCQs matching exact board pattern. Return ONLY valid JSON array.',
        userMessage: prompt 
      }) 
    },
    { 
      name: 'Mistral', 
      call: () => askMistral({ 
        systemPrompt: 'You are an expert Maharashtra SSC board exam question setter. Create high-quality MCQs matching exact board pattern. Return ONLY valid JSON array.',
        userMessage: prompt 
      }) 
    },
  ];

  for (const provider of providers) {
    try {
      console.log(`[QuizGen] Trying ${provider.name}...`);
      const result = await provider.call();
      const json = extractJSON(result.text);
      if (!json) {
        console.warn(`[QuizGen] ${provider.name}: no valid JSON found`);
        continue;
      }
      const questions = validateQuestions(json);
      if (questions.length >= Math.max(1, count - 2)) {
        logger.info(`[QuizGen] ✅ ${questions.length} quality questions from ${provider.name}`);
        return questions.slice(0, count);
      }
      console.warn(`[QuizGen] ${provider.name}: only ${questions.length} valid questions`);
    } catch (err: any) {
      console.error(`[QuizGen] ❌ ${provider.name}: ${err.message}`);
    }
  }

  logger.error('[QuizGen] All providers failed');
  return Array.from({length: count}, (_, i) => ({
    question: `Q${i+1} for ${chapterName} (AI temporarily unavailable - please retry)`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_index: 0,
    difficulty: 'medium',
    marks: 1,
  }));
}
