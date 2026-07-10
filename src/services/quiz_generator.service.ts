import { askGemini } from './gemini.service';
import logger from '../utils/logger';

export interface RawQuestion {
  question: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
5. Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.

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

  // Try up to 3 times with different providers via fallback
  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await askGemini({
        systemPrompt: 'You are an expert Maharashtra SSC board exam question setter. Return ONLY valid JSON array. No markdown, no code blocks, no extra text.',
        userMessage: prompt,
      });

      const text = result.text.trim();
      
      // Try multiple JSON extraction methods
      let parsed: any;
      
      // Method 1: Extract JSON array from code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1]); } catch { /* ignore */ }
      }
      
      // Method 2: Extract raw JSON array
      if (!parsed) {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
        }
      }
      
      // Method 3: Parse entire response
      if (!parsed) {
        try { parsed = JSON.parse(text); } catch { /* ignore */ }
      }

      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        // Validate each question has required fields
        const valid = parsed.every((q: any) => 
          q.question && 
          Array.isArray(q.options) && 
          q.options.length === 4 &&
          typeof q.correct_index === 'number' &&
          ['easy', 'medium', 'hard'].includes(q.difficulty)
        );
        
        if (valid) {
          logger.info(`[QuizGen] ✅ Generated ${parsed.length} questions on attempt ${attempt}`);
          return parsed as RawQuestion[];
        }
      }
      
      lastErr = `Attempt ${attempt}: Invalid format or validation failed`;
      logger.warn(`[QuizGen] ${lastErr}`);
      
    } catch (err: any) {
      lastErr = `Attempt ${attempt}: ${err.message}`;
      logger.error(`[QuizGen] ${lastErr}`);
    }
  }

  throw new Error(`Quiz generation failed after 3 attempts. ${lastErr}`);
}
