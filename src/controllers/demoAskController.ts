import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { askGemini } from '../services/gemini.service';
import { buildSystemPrompt } from '../services/prompt.service';
import { sanitiseInput } from '../utils/sanitise';

// Anonymous landing-page demo — no auth, no history, no persistence.
// Single-shot question/answer only.
export const askDoubtDemo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { question } = req.body as { question: unknown };

  if (typeof question !== 'string' || question.trim().length < 3) {
    ApiResponse.error(res, 'Please enter a valid question', 400);
    return;
  }

  const trimmedQuestion = question.trim();

  if (trimmedQuestion.length > 1000) {
    ApiResponse.error(res, 'Question is too long', 400);
    return;
  }

  const systemPrompt = buildSystemPrompt({
    subject: 'general',
    chapterName: 'general',
    questionType: 'theory',
    marks: 5,
  });

  const safeInput = `<student_question>${sanitiseInput(trimmedQuestion)}</student_question>`;

  try {
    const result = await askGemini({
      systemPrompt,
      userMessage: safeInput,
      history: [],
    });

    ApiResponse.success(res, { answer: result.text });
  } catch (err) {
    console.error('[demoAsk Gemini error]', err);
    ApiResponse.error(res, 'AI service temporarily unavailable. Try again.', 503);
  }
});
