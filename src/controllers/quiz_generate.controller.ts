import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getChaptersBySubjectForUser } from '../data/chapters.store';
import { getSubjectById } from '../data/subjects.store';
import {
  getCachedQuestions,
  getCachedQuestionsBySubject,
  saveGeneratedQuestions,
} from '../data/generated_questions.store';
import { generateMCQs } from '../services/quiz_generator.service';
import logger from '../utils/logger';

/**
 * GET /api/quiz/generate
 *
 * Query params:
 *   subjectId  string  required — e.g. 'algebra', 'science1'
 *   chapterId  string  optional — UUID, specific chapter
 *   count      number  optional — 5 to 20, default 10
 *
 * Flow:
 *   1. Validate params
 *   2. Check cache first (generated_questions table, not expired)
 *   3. If enough cached → return immediately (no Gemini call)
 *   4. If insufficient cache → call Gemini → save to cache → return
 *
 * Auth: requires Bearer token (authenticate middleware applied in route)
 */
export const generateQuiz = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { subjectId, chapterId } = req.query as {
      subjectId?: string;
      chapterId?: string;
    };

    const rawCount = parseInt(String(req.query['count'] ?? '10'), 10);
    const count = isNaN(rawCount) || rawCount < 3
      ? 10
      : Math.min(rawCount, 20); // cap at 20

    // ── Validate subjectId ───────────────────────────────────────────────────
    if (!subjectId || typeof subjectId !== 'string' || subjectId.trim().length === 0) {
      ApiResponse.error(res, 'subjectId query param is required', 400);
      return;
    }

    const subject = await getSubjectById(subjectId.trim());
    if (!subject) {
      ApiResponse.error(res, `Subject "${subjectId}" not found`, 404);
      return;
    }

    const plan = req.user?.plan ?? 'free';

    // ── Try cache first ──────────────────────────────────────────────────────
    if (chapterId && typeof chapterId === 'string' && chapterId.trim().length > 0) {
      // Chapter-specific quiz
      const cached = await getCachedQuestions(chapterId.trim(), count);
      if (cached.length >= count) {
        logger.info(`[QuizGen] Cache HIT — chapter=${chapterId} count=${count}`);
        ApiResponse.success(res, {
          questions: cached.slice(0, count),
          source: 'cache',
          subjectId: subjectId.trim(),
          chapterId: chapterId.trim(),
        });
        return;
      }

      // Cache MISS — generate with Gemini
      logger.info(`[QuizGen] Cache MISS — chapter=${chapterId}, calling Gemini`);

      // Fetch chapter details for prompt context
      const chapters = await getChaptersBySubjectForUser(subjectId.trim(), plan);
      const chapter  = chapters.find((c) => c.id === chapterId.trim());

      if (!chapter) {
        ApiResponse.error(res, 'Chapter not found', 404);
        return;
      }

      try {
        const generated = await generateMCQs({
          subjectName:  subject.name,
          chapterName:  chapter.name,
          topics:       chapter.topics ?? [],
          count,
        });

        if (generated.length === 0) {
          ApiResponse.error(res, 'Could not generate questions. Try again.', 503);
          return;
        }

        // Save to cache (fire-and-forget — don't block response)
        saveGeneratedQuestions(
          generated.map((q) => ({
            chapterId: chapterId.trim(),
            subjectId: subjectId.trim(),
            question:      q.question,
            options:       q.options,
            correct_index: q.correct_index,
            difficulty:    q.difficulty,
            marks:         q.marks,
          }))
        ).catch((err) =>
          logger.warn(`[QuizGen] Failed to save cache: ${String(err)}`)
        );

        ApiResponse.success(res, {
          questions: generated,
          source: 'generated',
          subjectId: subjectId.trim(),
          chapterId: chapterId.trim(),
        });

      } catch {
        ApiResponse.error(res, 'Quiz generation temporarily unavailable. Try again.', 503);
      }

    } else {
      // Subject-level quiz (random chapters)
      const cached = await getCachedQuestionsBySubject(subjectId.trim(), count);
      if (cached.length >= count) {
        logger.info(`[QuizGen] Subject cache HIT — subject=${subjectId} count=${count}`);
        ApiResponse.success(res, {
          questions: cached.slice(0, count),
          source: 'cache',
          subjectId: subjectId.trim(),
          chapterId: null,
        });
        return;
      }

      // Get first available chapter for this subject and generate from it
      const chapters = await getChaptersBySubjectForUser(subjectId.trim(), plan);
      if (chapters.length === 0) {
        ApiResponse.error(res, 'No chapters found for this subject', 404);
        return;
      }

      // Pick a random chapter from the available ones
      const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];

      try {
        const generated = await generateMCQs({
          subjectName:  subject.name,
          chapterName:  randomChapter.name,
          topics:       randomChapter.topics ?? [],
          count,
        });

        if (generated.length === 0) {
          ApiResponse.error(res, 'Could not generate questions. Try again.', 503);
          return;
        }

        saveGeneratedQuestions(
          generated.map((q) => ({
            chapterId: randomChapter.id,
            subjectId: subjectId.trim(),
            question:      q.question,
            options:       q.options,
            correct_index: q.correct_index,
            difficulty:    q.difficulty,
            marks:         q.marks,
          }))
        ).catch((err) =>
          logger.warn(`[QuizGen] Failed to save cache: ${String(err)}`)
        );

        ApiResponse.success(res, {
          questions: generated,
          source: 'generated',
          subjectId: subjectId.trim(),
          chapterId: randomChapter.id,
        });

      } catch {
        ApiResponse.error(res, 'Quiz generation temporarily unavailable. Try again.', 503);
      }
    }
  }
);
