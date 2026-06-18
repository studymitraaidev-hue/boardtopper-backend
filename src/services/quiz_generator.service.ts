import { askGroq } from './groq.service';
import config from '../config/env';
import logger from '../utils/logger';

export interface RawQuestion {
  question: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

export async function generateMCQs(params: {
  subjectName: string;
  chapterName: string;
  topics: string[];
  count: number;
}): Promise<RawQuestion[]> {
  const { subjectName, chapterName, topics, count } = params;
  const topicList = topics.slice(0, 10).join(', ');

  const prompt = `You are a Maharashtra State Board SSC Class 10 exam question setter with 15 years of experience.

Generate exactly ${count} MCQ questions for:
Subject: ${subjectName}
Chapter: ${chapterName}
Key Topics: ${topicList}

STRICT RULES:
1. Questions must match Maharashtra SSC board exam pattern and difficulty
2. Each question must have EXACTLY 4 options (A, B, C, D style content in array)
3. correct_index is 0-based (0=first option, 1=second, 2=third, 3=fourth)
4. Mix difficulty: include 40% easy (1 mark), 40% medium (2 marks), 20% hard (4 marks)
5. DO NOT repeat the same concept twice
6. For Science/Maths: include numerical application questions
7. For History/Geography: include map-based or date-based questions
8. All questions must be solvable from Maharashtra SSC Class 10 textbook

RETURN ONLY this JSON array, no markdown, no explanation, no extra text:
[
  {
    "question": "Question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_index": 0,
    "difficulty": "easy",
    "marks": 1
  }
]`;

  const parseQuestions = (text: string, count: number): RawQuestion[] => {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('non-array');
    return (parsed as Record<string, unknown>[]).filter(item =>
      typeof item['question'] === 'string' &&
      Array.isArray(item['options']) &&
      (item['options'] as unknown[]).length === 4 &&
      typeof item['correct_index'] === 'number' &&
      Number(item['correct_index']) >= 0 &&
      Number(item['correct_index']) <= 3
    ).slice(0, count).map(item => ({
      question: String(item['question']),
      options: (item['options'] as unknown[]).map(String),
      correct_index: Number(item['correct_index']),
      difficulty: (['easy','medium','hard'].includes(String(item['difficulty'])))
        ? item['difficulty'] as 'easy'|'medium'|'hard' : 'medium',
      marks: typeof item['marks'] === 'number' ? Number(item['marks']) : 2,
    }));
  };

  // Try Groq first
  try {
    const g = await askGroq({ systemPrompt: 'Return ONLY a JSON array, no markdown.', userMessage: prompt });
    const valid = parseQuestions(g.text, count);
    logger.info(`[QuizGen] Groq generated ${valid.length}/${count} questions for ${chapterName}`);
    return valid;
  } catch (err) {
    logger.error(`[QuizGen] Groq failed for ${chapterName}: ${String(err)}`);
  }

  // Fallback to Gemini
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 4096 },
    });
    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const valid = parseQuestions(raw, count);
    logger.info(`[QuizGen] Gemini generated ${valid.length}/${count} questions for ${chapterName}`);
    return valid;
  } catch (err) {
    logger.error(`[QuizGen] Gemini also failed for ${chapterName}: ${String(err)}`);
    throw new Error('Quiz generation failed');
  }
}
