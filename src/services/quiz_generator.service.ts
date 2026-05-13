import { GoogleGenAI } from '@google/genai';
import config from '../config/env';
import logger from '../utils/logger';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export interface RawQuestion {
  question: string;
  options: string[];      // exactly 4
  correct_index: number;  // 0-3
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

/**
 * Calls Gemini to generate MCQ questions for a Maharashtra SSC chapter.
 * Returns only valid questions (4 options, correct_index 0-3).
 * Throws on complete failure so caller can return 503.
 */
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 4096 },
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('Gemini returned non-array');
    }

    // Validate and filter each question
    const valid: RawQuestion[] = [];
    for (const item of parsed) {
      if (
        typeof (item as Record<string, unknown>)['question'] === 'string' &&
        Array.isArray((item as Record<string, unknown>)['options']) &&
        ((item as Record<string, unknown>)['options'] as unknown[]).length === 4 &&
        typeof (item as Record<string, unknown>)['correct_index'] === 'number' &&
        Number((item as Record<string, unknown>)['correct_index']) >= 0 &&
        Number((item as Record<string, unknown>)['correct_index']) <= 3
      ) {
        valid.push({
          question:      String((item as Record<string, unknown>)['question']),
          options:       ((item as Record<string, unknown>)['options'] as unknown[]).map(String),
          correct_index: Number((item as Record<string, unknown>)['correct_index']),
          difficulty:    (['easy','medium','hard'].includes(String((item as Record<string, unknown>)['difficulty'])))
                           ? (item as Record<string, unknown>)['difficulty'] as 'easy'|'medium'|'hard'
                           : 'medium',
          marks:         typeof (item as Record<string, unknown>)['marks'] === 'number'
                           ? Number((item as Record<string, unknown>)['marks'])
                           : 2,
        });
      }
    }

    logger.info(`[QuizGen] Generated ${valid.length}/${count} valid questions for ${chapterName}`);
    return valid;

  } catch (err) {
    logger.error(`[QuizGen] Gemini generation failed for ${chapterName}: ${String(err)}`);
    throw new Error('Quiz generation failed');
  }
}
