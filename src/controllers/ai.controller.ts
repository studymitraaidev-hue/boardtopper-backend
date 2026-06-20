import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';           // FIX: was '../middleware/asyncHandler' â€” file doesn't exist
import { ApiResponse } from '../utils/ApiResponse';             // FIX: was '../utils/apiResponse' â€” wrong case, file doesn't exist
import { updateStreak } from '../utils/streak';
import logger from '../utils/logger';
import { askGemini } from '../services/gemini.service';
import { buildSystemPrompt, detectQuestionType, estimateMarks } from '../services/prompt.service';
import { getHistory, addMessage, clearHistory } from '../data/conversation.store';
import { getChapterById } from '../data/chapters.store';
import { recordDoubtTopic } from '../data/doubt_topics.store';
import { getChapterContent, buildContentContext } from '../data/chapter_content.store';
import { findById } from '../data/users.store';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are supported.'));
    }
  },
});

export const uploadSingle = upload.single('image');

// â”€â”€â”€ Prompt injection sanitiser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function sanitiseInput(raw: string): string {
  let text = raw.trim().slice(0, 2000);

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /you\s+are\s+now\s+/gi,
    /new\s+system\s+prompt/gi,
    /override\s+(your\s+)?(instructions?|prompt|rules)/gi,
  ];

  for (const pattern of injectionPatterns) {
    text = text.replace(pattern, '[removed]');
  }

  return text;
}

export const askDoubt = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { question, subject, chapterId, marks } = req.body as {
    question: unknown;
    subject: unknown;
    chapterId: unknown;
    marks: unknown;
  };

  // Validate question
  if (question === undefined || question === null || typeof question !== 'string') {
    ApiResponse.error(res, 'Question is required', 400);  // FIX: removed return â€” asyncHandler expects Promise<void>
    return;
  }

  const trimmedQuestion = question.trim();

  if (trimmedQuestion.length === 0) {
    ApiResponse.error(res, 'Question is required', 400);
    return;
  }

  if (trimmedQuestion.length < 3) {
    ApiResponse.error(res, 'Question is too short', 400);
    return;
  }

  if (trimmedQuestion.length > 1000) {
    ApiResponse.error(res, 'Question is too long', 400);
    return;
  }

  const resolvedSubject =
    typeof subject === 'string' && subject.trim().length > 0
      ? subject.trim()
      : 'general';

  const resolvedChapterId =
    typeof chapterId === 'string' && chapterId.trim().length > 0
      ? chapterId.trim()
      : undefined;

  const resolvedMarks =
    typeof marks === 'number' && marks > 0 ? marks : undefined;

  // Resolve chapter name AND board-specific content for richer AI context
  let chapterName: string = resolvedSubject;
  let contentContext: string | undefined;

  if (resolvedChapterId) {
    try {
      const chapter = await getChapterById(resolvedChapterId);
      if (chapter?.name) {
        chapterName = chapter.name;
        recordDoubtTopic(req.user!.id, chapter.subjectId, chapter.name).catch(() => {});
      }

      // Fetch Maharashtra SSC board-specific content for this chapter
      // This is what makes the AI answer board-specifically instead of generically
      const chapterContent = await getChapterContent(resolvedChapterId);
      if (chapterContent) {
        contentContext = buildContentContext(chapterContent);
      }
    } catch {
      // Non-fatal â€” fall back to generic prompt
    }
  }

  // Detect question type and estimate marks
  const qType = detectQuestionType(trimmedQuestion);
  const estimatedMarks = resolvedMarks ?? estimateMarks(qType ?? 'theory', trimmedQuestion);

  // Fetch user profile for personalised prompt (language, weak subjects, target)
  let userProfile: { language?: 'english' | 'marathi' | 'hindi' | 'semi'; weakSubjects?: string[]; targetPercent?: number } = {};
  try {
    const fullUser = await findById(req.user!.id);
    if (fullUser) {
      userProfile = {
        language: fullUser.language,
        weakSubjects: fullUser.weakSubjects,
        targetPercent: fullUser.targetPercent,
      };
    }
  } catch { /* non-fatal â€” fall back to defaults */ }

  // Build personalised Maharashtra Board system prompt
  // contentContext injects real SSC textbook content when chapter is seeded
  const systemPrompt = buildSystemPrompt({
    subject: resolvedSubject,
    chapterName,
    questionType: qType,
    marks: estimatedMarks,
    contentContext,
    ...userProfile,
  });

  // Fetch conversation history (capped at 20 messages in store)
  const history = await getHistory(req.user!.id);  // FIX: added ! â€” req.user guaranteed by authenticate middleware

  // Sanitise user-supplied input before passing to Gemini or storing
  const safeInput = `<student_question>${sanitiseInput(trimmedQuestion)}</student_question>`;

  // Persist user message before calling AI
  await addMessage(
    req.user!.id,
    'user',
    trimmedQuestion,
    resolvedSubject,
    resolvedChapterId
  );

  // Call Gemini
  let result;
  try {
    result = await askGemini({
      systemPrompt,
      userMessage: safeInput,
      history: history.map((m) => ({ role: m.role, text: m.text })),
    });
  } catch (err) {
    console.error('[askGemini error]', err);
    ApiResponse.error(res, 'AI service temporarily unavailable. Try again.', 503);
    return;
  }

  // Persist AI response
  await addMessage(
    req.user!.id,
    'model',
    result.text,
    resolvedSubject,
    resolvedChapterId
  );

  try {
    await updateStreak(req.user!.id);
  } catch (err) {
    logger.warn('[streak] Failed to update streak after AI response');
  }

  ApiResponse.success(res, {
    answer: result.text,
    questionType: qType,
    estimatedMarks,
    subject: resolvedSubject,
    chapterId: resolvedChapterId ?? null,
  });
});

export const getConversationHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const messages = await getHistory(req.user!.id);   // FIX: added !
    ApiResponse.success(res, messages);
  }
);

export const clearConversationHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await clearHistory(req.user!.id);                  // FIX: added !
    ApiResponse.success(res, { message: 'History cleared' });
  }
);

export const askDoubtWithImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    ApiResponse.error(res, 'Image file is required.', 400);
    return;
  }

  const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
  if (!ALLOWED_MIMES.includes(file.mimetype as typeof ALLOWED_MIMES[number])) {
    ApiResponse.error(res, 'Only JPG, PNG, and WebP images are allowed.', 400);
    return;
  }

  const rawQuestion = (req.body['question'] as string | undefined) ?? '';
  const subject     = (req.body['subject']  as string | undefined)?.trim() ?? 'general';

  const safeQuestion = sanitiseInput(
    rawQuestion.trim() || 'What is shown in this image? Explain it clearly as a Maharashtra SSC Class 10 board exam question with a step-by-step answer.'
  );

  const imageBase64   = file.buffer.toString('base64');
  const imageMimeType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp';

  const user = await findById(userId);
  if (!user) {
    ApiResponse.error(res, 'User not found.', 404);
    return;
  }

  const systemPrompt = buildSystemPrompt({
    language:      user.language ?? 'english',
    targetPercent: user.targetPercent ?? 90,
    weakSubjects:  user.weakSubjects ?? [],
    subject,
    chapterName:   subject,
    questionType:  'theory',
    marks:         4,
    contentContext: undefined,
  });

  const userMessage = `<student_question>${safeQuestion}</student_question>`;

  const result = await askGemini({
    systemPrompt,
    userMessage,
    imageBase64,
    imageMimeType,
  });

  try {
    await updateStreak(userId);
  } catch (err) {
    logger.warn('[streak] Failed to update streak after image doubt', err);
  }

  ApiResponse.success(res, { answer: result.text, subject });
});


