import { askGroq } from './groq.service';
import { askCloudflare } from './cloudflare.service';
import { askOpenRouter } from './openrouter.service';
import { askMistral } from './mistral.service';
import { askCerebras } from './cerebras.service';
import logger from '../utils/logger';

export interface RawQuestion {
  question: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

function extractJSON(text: string): any[] | null {
  if (!text || typeof text !== "string") return null;

  // Method 1: Extract from markdown code blocks
  const codeBlockMatch = text.match(/` +  + `(?:json)?\s*\n?([\s\S]*?)\n?` +  + `/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* ignore */ }
  }

  // Method 2: Find raw JSON array
  const arrayMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* ignore */ }
  }

  // Method 3: Find comma-separated JSON objects and wrap in array
  const objectMatch = text.match(/(\{[\s\S]*?\}\s*,?\s*)+/);
  if (objectMatch) {
    try {
      const wrapped = "[" + objectMatch[0].replace(/,\s*$/, "") + "]";
      return JSON.parse(wrapped);
    } catch { /* ignore */ }
  }

  // Method 4: Find any JSON array
  const looseMatch = text.match(/\[[\s\S]*?\]/);
  if (looseMatch) {
    try { return JSON.parse(looseMatch[0]); } catch { /* ignore */ }
  }

  // Method 5: Parse entire text
  try { return JSON.parse(text.trim()); } catch { /* ignore */ }

  return null;
}

function validateQuestions(data: any[]): RawQuestion[] {
  if (!Array.isArray(data)) return [];
  
  return data.filter((q: any) => 
    q && 
    typeof q.question === 'string' && 
    q.question.length > 5 &&
    Array.isArray(q.options) && 
    q.options.length >= 2 &&
    typeof q.correct_index === 'number'
  ).map((q: any) => ({
    question: q.question.trim(),
    options: q.options.slice(0, 4).concat(Array(Math.max(0, 4 - q.options.length)).fill('')),
    correct_index: Math.min(3, Math.max(0, q.correct_index)),
    difficulty: ['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    marks: typeof q.marks === 'number' ? q.marks : 1,
  }));
}

function buildQualityPrompt(subject: string, chapter: string, topics: string[], count: number): string {
  const topicList = topics.slice(0, 10).join(', ');
  
  return `You are an expert Maharashtra State Board SSC Class 10 ${subject} teacher with 20 years of experience.

Generate exactly 5 MCQ questions (minimum 5, maximum 10) for:
Chapter: ${chapter}
Topics: ${topicList}

RULES:
1. Each question has exactly 4 options (A, B, C, D)
2. Only ONE correct answer
3. Mix: easy 30%, medium 50%, hard 20%
4. Match Maharashtra SSC board exam style
5. Return ONLY valid JSON array - no markdown, no extra text

FORMAT:
[
  {"question":"What is...?","options":["A","B","C","D"],"correct_index":0,"difficulty":"easy","marks":1}
]

Generate exactly 5 questions now. Return ONLY the JSON array.`;
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
    { name: 'Cloudflare', call: () => askCloudflare({ systemPrompt: 'You create Maharashtra SSC board exam MCQs. Return ONLY valid JSON array.', userMessage: prompt }) },
    { name: 'Groq', call: () => askGroq({ systemPrompt: 'You create Maharashtra SSC board exam MCQs. Return ONLY valid JSON array.', userMessage: prompt }) },
    { name: 'Cerebras', call: () => askCerebras({ systemPrompt: 'You create Maharashtra SSC board exam MCQs. Return ONLY valid JSON array.', userMessage: prompt }) },
    { name: 'OpenRouter', call: () => askOpenRouter({ systemPrompt: 'You create Maharashtra SSC board exam MCQs. Return ONLY valid JSON array.', userMessage: prompt }) },
    { name: 'Mistral', call: () => askMistral({ systemPrompt: 'You create Maharashtra SSC board exam MCQs. Return ONLY valid JSON array.', userMessage: prompt }) },
  ];

  for (const provider of providers) {
    try {
      console.log(`[QuizGen] Trying ${provider.name}...`);
      const result = await provider.call();
      
      const json = extractJSON(result.text);
      if (!json) {
        console.warn(`[QuizGen] ${provider.name}: no JSON found in response`);
        console.warn(`[QuizGen] ${provider.name}: raw response:`, result.text.substring(0, 1000));
        continue;
      }

      const questions = validateQuestions(json);
      if (questions.length >= 1) {
        logger.info(`[QuizGen] ✅ ${questions.length} questions from ${provider.name}`);
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
