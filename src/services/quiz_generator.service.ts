import { askGemini } from './gemini.service';
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
2. Each question must have exactly 4 options (A, B, C, D)
3. Only ONE correct answer per question
4. Include a mix of easy, medium, and hard questions
5. Return ONLY a valid JSON array. No markdown, no explanation.

JSON format:
[
  {
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "difficulty": "medium",
    "marks": 1
  }
]`;

  try {
    const result = await askGemini({
      systemPrompt: 'You are an expert Maharashtra SSC board exam question setter. Return ONLY valid JSON array. No markdown.',
      userMessage: prompt,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as RawQuestion[];
      }
    }
    
    // Try parsing the whole response
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as RawQuestion[];
    }
    
    throw new Error('Invalid response format');
  } catch (err: any) {
    logger.error('[Quiz Generator] Failed:', err.message);
    throw new Error('Quiz generation failed. Please try again.');
  }
}
