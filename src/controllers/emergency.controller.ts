import { Request, Response } from 'express';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { findById } from '../data/users.store';
import { askEmergencyAI } from '../services/emergency_ai.service';
import { getPYQsBySubject } from '../data/pyqs.store';
import supabase from '../config/supabase';

interface EmergencyItem {
  title:     string;
  content:   string;
  tag?:      string;
  priority?: 'high' | 'normal';
}
interface AiTip {
  subject: string;
  points:  string[];
}
type EmergencyMode = 'notes' | 'doubts' | 'fallback' | 'empty';
interface EmergencyResponse {
  mode:        EmergencyMode;
  items:       EmergencyItem[];
  aiTips:      AiTip[];
  userContext: {
    examDate:          string | null;
    weakSubjects:      string[];
    streakCount:       number;
    targetPercent:     number;
    name:              string;
    timeRemainingMinutes: number | null;
    urgencyLevel:      'unknown' | 'low' | 'medium' | 'high' | 'panic';
    prioritySubjects:  string[];
  };
  gameStats: {
    bossName:          string;
    bossHp:            number;
    bossMaxHp:         number;
    defeatedSections:  string[];
    playerXp:          number;
    playerLevel:       number;
    subjectStrength:   Record<string, number>;
  };
  likelyQuestions:     LikelyQuestion[];
}
export interface LikelyQuestion {
  question:      string;
  marks:         number;
  type:          'definition' | 'short_answer' | 'long_answer' | 'diagram' | 'numerical' | 'mcq';
  subject:       string;
  chapter:       string;
  likelihood:    'very_high' | 'high' | 'medium';
  answerHint:    string;
  appearedYears: number[];
  source:        'pyq' | 'ai';
}
export interface LikelyQuestionsResponse {
  questions:    LikelyQuestion[];
  weakSubjects: string[];
  generatedAt:  string;
}

interface UserNoteRow     { title: string; content: string; updated_at: string; }
interface ConversationRow { text: string; subject: string | null; timestamp: string; }
interface ChapterRow      { name: string; topics: string[]; }


// --- Game Stats Helper ---
function buildGameStats(
  examType: string,
  weakSubjects: string[],
  items: EmergencyItem[],
  targetPercent: number,
  streakCount: number
) {
  const bossNames: Record<string, string> = {
    board: 'SSC Board Exam',
    half_yearly: 'Half Yearly Exam',
    unit_test: 'Unit Test Boss',
  };
  const bossName = bossNames[examType] || 'Exam Boss';
  const totalSections = Math.max(items.length, 5);
  const defeated = items.filter(i => i.tag?.includes('done') || i.tag?.includes('revised')).map(i => i.title);
  const bossHp = Math.max(0, totalSections - defeated.length);
  const bossMaxHp = totalSections;
  const playerXp = (defeated.length * 100) + (streakCount * 50) + Math.floor(targetPercent);
  const playerLevel = Math.floor(playerXp / 300) + 1;
  
  const subjectStrength: Record<string, number> = {};
  const allSubjects = ['mathematics', 'science', 'english', 'marathi', 'hindi', 'history', 'geography'];
  allSubjects.forEach(sub => {
    const isWeak = weakSubjects.some(w => w.toLowerCase().includes(sub));
    subjectStrength[sub] = isWeak ? Math.floor(Math.random() * 30 + 20) : Math.floor(Math.random() * 30 + 60);
  });
  weakSubjects.forEach(ws => {
    subjectStrength[ws.toLowerCase()] = Math.floor(Math.random() * 25 + 15);
  });

  return {
    bossName,
    bossHp,
    bossMaxHp,
    defeatedSections: defeated,
    playerXp,
    playerLevel,
    subjectStrength,
  };
}

const ACADEMIC_SUBJECTS = [
  'mathematics','math','maths','science','physics','chemistry','biology',
  'social science','history','geography','civics','english',
  'marathi','hindi','sanskrit','algebra','geometry','trigonometry',
];

const SSC_SUBJECT_CANONICAL: Record<string, string> = {
  'math':          'Mathematics',
  'maths':         'Mathematics',
  'mathematics':   'Mathematics',
  'algebra':       'Mathematics',
  'geometry':      'Mathematics',
  'trigonometry':  'Mathematics',
  'science':       'Science',
  'physics':       'Science Part 1',
  'chemistry':     'Science Part 1',
  'biology':       'Science Part 2',
  'social science':'Social Science',
  'history':       'History',
  'geography':     'Geography',
  'civics':        'Civics',
  'english':       'English',
  'marathi':       'Marathi',
  'hindi':         'Hindi',
  'sanskrit':      'Sanskrit',
};

/**
 * Maharashtra SSC Board paper pattern 2019-2024.
 * Math and Science patterns are detailed and strict.
 * Other subjects are lightweight.
 */
const SSC_PAPER_PATTERN: Record<string, string> = {
  'Mathematics': `
Maharashtra SSC Mathematics Paper Pattern (Board 2019-2024):
- Total Marks: 80 (Written) + 20 (Internal) = 100
- Q1: (A) 4 MCQs x 1 mark = 4 marks. (B) 4 True/False or fill blanks x 1 mark = 4 marks
- Q2: (A) 2 Activity/Practical problems x 2 marks = 4 marks. (B) Solve any 4 of 5 subquestions x 2 marks = 8 marks
- Q3: Solve any 3 of 5 problems x 3 marks = 9 marks (Algebra: Linear equations, Quadratic, AP/GP)
- Q4: Solve any 3 of 4 problems x 4 marks = 12 marks (Geometry: Proofs, Constructions, Circles, Pythagoras)
- Q5: Solve any 1 of 2 problems x 5 marks = 5 marks (Statistics, Probability, Mensuration)
- Q6: Solve any 1 of 2 problems x 5 marks = 5 marks (Coordinate geometry, Trigonometry)
High frequency topics (appeared 4+ times 2019-2024):
1. Quadratic equations - finding roots, nature of roots (3-4 marks)
2. Arithmetic Progression - nth term, sum of n terms (3-4 marks)
3. Circle theorem - tangent properties, chord properties (4 marks)
4. Similar triangles - proof and application (4 marks)
5. Trigonometry - identities, heights and distances (4-5 marks)
6. Statistics - mean, median, mode, ogive (4-5 marks)
7. Linear equations in two variables (2-3 marks)
8. Pythagoras theorem - proof or application (3-4 marks)
`,
  'Science Part 1': `
Maharashtra SSC Science Part 1 (Physics + Chemistry) Paper Pattern (2019-2024):
- Total: 40 marks
- Q1: MCQ and fill in blanks x 1 mark each = 8 marks
- Q2: Short answer x 2 marks each = 8 marks (define, state, give reason)
- Q3: Short answer x 3 marks each = 9 marks (explain with diagram or derive formula)
- Q4: Long answer x 4 marks = 8 marks (numerical or detailed explanation)
- Q5: Activity based x 4 marks = 4 marks (draw circuit/diagram, label, explain)
Physics high frequency topics (appeared 3+ times):
1. Ohm's Law - numericals, V-I graph (2-3 marks)
2. Magnetic effect of electric current - Fleming's rules, motor vs generator (3 marks)
3. Refraction of light - Snell's law, lens formula numericals (3-4 marks)
4. Mirror and lens - ray diagrams, numerical (3-4 marks)
5. Electric circuit - series vs parallel, power numerical (3-4 marks)
Chemistry high frequency topics:
1. Chemical reactions and equations - balancing, types (2-3 marks)
2. Acids bases salts - pH, indicators, neutralisation (2-3 marks)
3. Metals and non-metals - reactivity series, extraction (3 marks)
4. Carbon compounds - IUPAC names, functional groups, isomers (3-4 marks)
5. Periodic table - trends, Dobereiner, Newlands, Mendeleev (2-3 marks)
`,
  'Science Part 2': `
Maharashtra SSC Science Part 2 (Biology) Paper Pattern (2019-2024):
- Total: 40 marks
- Q1: MCQ, match columns, fill blanks = 8 marks
- Q2: Short answer 2 marks (state, define, distinguish) = 8 marks
- Q3: Short answer 3 marks (explain process, draw and label) = 9 marks
- Q4: Long answer 4 marks (detailed with diagram) = 8 marks
- Q5: Activity / Experiment based = 4 marks
High frequency topics (appeared 3+ times 2019-2024):
1. Life processes - digestion, respiration, excretion (draw and label diagrams) (3-4 marks)
2. Control and coordination - nervous system, reflex arc, diagram (3-4 marks)
3. How do organisms reproduce - sexual vs asexual, diagrams (3-4 marks)
4. Heredity and evolution - Mendel's laws, dominant/recessive, pedigree (3-4 marks)
5. Our environment - food chain, food web, ecosystem (2-3 marks)
6. Natural resource management - water harvesting, conservation (2 marks)
`,
  'default': `
Maharashtra SSC Board exam. Focus on definitions (2 marks), short explanations (3 marks), long answers with examples (4-5 marks).
`,
};

function isAcademicSubject(subject: string | null): boolean {
  if (!subject || subject.trim() === '') return false;
  const lower = subject.toLowerCase().trim();
  return ACADEMIC_SUBJECTS.some(s => lower.includes(s));
}

function canonicalSubject(subject: string): string {
  const lower = subject.toLowerCase().trim();
  for (const [key, val] of Object.entries(SSC_SUBJECT_CANONICAL)) {
    if (lower.includes(key)) return val;
  }
  return subject;
}

function getPaperPattern(subject: string): string {
  const canonical = canonicalSubject(subject);
  if (SSC_PAPER_PATTERN[canonical]) return SSC_PAPER_PATTERN[canonical];
  // Partial match
  for (const [key, pattern] of Object.entries(SSC_PAPER_PATTERN)) {
    if (canonical.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(canonical.toLowerCase())) {
      return pattern;
    }
  }
  return SSC_PAPER_PATTERN['default'];
}

async function generateAiTips(weakSubjects: string[], board: string, language: string, examType = 'board', chapters = '', hoursLeft = 12): Promise<AiTip[]> {
  if (weakSubjects.length === 0) return [];
  const tips: AiTip[] = [];
  await Promise.all(weakSubjects.slice(0, 3).map(async (subject) => {
    try {
      const pattern = getPaperPattern(subject);
      const result = await askEmergencyAI({
        systemPrompt: `You are an expert Maharashtra SSC board exam coach for Class 10 students.
${pattern}
Exam context:
- Exam type: ${examType} (unit_test = only specific chapters, half_yearly = half syllabus, board = full syllabus)
- Chapters included in this exam: ${chapters || 'Full Syllabus'}
- Time remaining: ${hoursLeft} hours

Your job: Give exactly 3 short, high-impact revision tips tailored to the TIME LEFT and EXAM TYPE above.
- If hoursLeft <= 4: focus ONLY on formulas, definitions, and 1-mark facts. No long topics.
- If hoursLeft <= 12: focus on 2-3 mark questions and key diagrams only.
- If hoursLeft > 12: cover high-weightage long answer topics too.
- If chapters are specified, ONLY give tips for those chapters. Ignore rest of syllabus.
Rules:
- Each tip must be ONE sentence, specific, actionable
- Focus on highest-frequency exam topics listed above
- Mention exact marks value where possible (e.g. "Practice 3-mark questions on...")
- Language: ${language === 'marathi' ? 'Marathi' : language === 'hindi' ? 'Hindi' : 'Simple English'}
- Do NOT give generic advice like "study hard" or "revise all chapters"
- Respond ONLY as a JSON array of 3 strings. No markdown. No extra text.
Example: ["Revise Quadratic Formula for 3-mark questions","Practice tangent theorem proof for 4-mark geometry","Do 2019-2023 Statistics ogive questions"]`,
        userMessage: `Give 3 last-minute exam tips for ${canonicalSubject(subject)} Maharashtra SSC board exam tomorrow.`,
      });
      let points: string[] = [];
      try {
        const cleaned = result.text.trim().replace(/```json|```/g, '').trim();
        points = JSON.parse(cleaned);
        if (!Array.isArray(points)) points = [];
        points = points.slice(0, 3).map(p => String(p).trim()).filter(Boolean);
      } catch {
        points = result.text.split('\n').filter(l => l.trim().length > 10).slice(0, 3);
      }
      if (points.length > 0) tips.push({ subject: canonicalSubject(subject), points });
    } catch { /* skip silently */ }
  }));
  return tips;
}

async function generateLikelyQuestions(
  weakSubjects: string[],
  language:     string,
): Promise<LikelyQuestion[]> {
  if (weakSubjects.length === 0) return [];

  const allQuestions: LikelyQuestion[] = [];

  // Priority: Math and Science first
  const prioritized = [
    ...weakSubjects.filter(s => ['math','maths','mathematics','science','physics','chemistry','biology','algebra','geometry','trigonometry'].some(k => s.toLowerCase().includes(k))),
    ...weakSubjects.filter(s => !['math','maths','mathematics','science','physics','chemistry','biology','algebra','geometry','trigonometry'].some(k => s.toLowerCase().includes(k))),
  ];

  await Promise.all(prioritized.slice(0, 3).map(async (subject) => {
    const canonical = canonicalSubject(subject);
    const pattern   = getPaperPattern(subject);

    try {
      const result = await askEmergencyAI({
        systemPrompt: `You are an expert Maharashtra SSC board exam question predictor for Class 10.
${pattern}
Your task: Predict the 4 most likely exam questions for ${canonical} based on:
1. How many times a topic appeared in past papers (2019-2024)
2. The marks weightage in the paper pattern above
3. Topics that were NOT asked in 2023-2024 and are due to appear
4. High-mark topics that students commonly skip

STRICT RULES:
- Questions must match EXACT Maharashtra SSC board style (not CBSE, not ICSE)
- Each question must state the marks in brackets e.g. [3 marks]
- Questions must be exam-ready (student can write the answer directly)
- For Mathematics: include at least 2 numericals
- For Science: include at least 1 diagram-based question
- answerHint must be 1-2 lines giving the key formula, law, or approach
- likelihood: "very_high" = appeared 4+ times, "high" = appeared 2-3 times, "medium" = due to appear
- type must be one of: definition, short_answer, long_answer, diagram, numerical, mcq
- Language: ${language === 'marathi' ? 'Marathi' : 'English'}

Respond ONLY as a valid JSON array. No markdown. No explanation. No extra text.
Format:
[
  {
    "question": "exact exam question here [X marks]",
    "marks": number,
    "type": "numerical",
    "chapter": "exact chapter name",
    "likelihood": "very_high",
    "answerHint": "key formula or approach",
    "appearedYears": [2022, 2023]
  }
]`,
        userMessage: `Predict 4 most likely Maharashtra SSC board exam questions for ${canonical} that will appear in the upcoming exam.`,
      });

      try {
        const cleaned = result.text.trim().replace(/```json|```/g, '').trim();
        const parsed  = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(q => q.question && q.marks && q.chapter)
            .slice(0, 4)
            .map(q => ({
              question:      String(q.question).trim(),
              marks:         Number(q.marks) || 3,
              type:          q.type || 'short_answer',
              subject:       canonical,
              chapter:       String(q.chapter).trim(),
              likelihood:    q.likelihood || 'high',
              answerHint:    String(q.answerHint || '').trim(),
              appearedYears: Array.isArray(q.appearedYears) ? q.appearedYears : [],
              source:        'ai' as const,
            }));
          allQuestions.push(...valid);
        }
      } catch { /* skip */ }
    } catch { /* skip */ }
  }));

  // Sort: very_high first, then high, then medium
  const order = { very_high: 0, high: 1, medium: 2 };
  return allQuestions.sort((a, b) => (order[a.likelihood] ?? 2) - (order[b.likelihood] ?? 2));
}

// --- Controllers --------------------------------------------------------------

async function buildLikelyQuestionsSummary(weakSubjects: string[], language: string): Promise<LikelyQuestion[]> {
  if (weakSubjects.length === 0) return [];
  const pyqResults = await Promise.allSettled(
    weakSubjects.slice(0, 3).map(s => getPYQsBySubject(s))
  );
  const realPYQs: LikelyQuestion[] = pyqResults
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => b.appearedCount - a.appearedCount)
    .slice(0, 4)
    .map(pyq => ({
      question:      pyq.question,
      marks:         pyq.marks,
      type:          'short_answer' as const,
      subject:       canonicalSubject(pyq.subjectId),
      chapter:       pyq.chapterId,
      likelihood:    pyq.appearedCount >= 3 ? 'very_high' : pyq.appearedCount >= 2 ? 'high' : 'medium',
      answerHint:    pyq.answerHint,
      appearedYears: [pyq.year],
      source:        'pyq' as const,
    }));
  let aiQuestions: LikelyQuestion[] = [];
  try {
    aiQuestions = await generateLikelyQuestions(weakSubjects, language);
  } catch (e) {
    logger.warn('[EmergencyMode] Failed to generate AI likely questions for summary');
  }
  return [...realPYQs, ...aiQuestions].slice(0, 6);
}

export const getEmergency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    const user          = await findById(userId);
    const weakSubjects  = user?.weakSubjects  ?? [];
    const examDate      = user?.examDate      ?? null;
    const streakCount   = user?.streakCount   ?? 0;
    const targetPercent = user?.targetPercent ?? 90;
    const name          = user?.name          ?? 'Topper';
    const language      = user?.language      ?? 'english';

    const timeRemainingMinutes = examDate ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 60000)) : null;
    const urgencyLevel = timeRemainingMinutes === null ? 'unknown' : timeRemainingMinutes <= 240 ? 'panic' : timeRemainingMinutes <= 720 ? 'high' : timeRemainingMinutes <= 2880 ? 'medium' : 'low';
    const prioritySubjects = weakSubjects.slice(0, 3);
    const userContext = { examDate, weakSubjects, streakCount, targetPercent, name, timeRemainingMinutes, urgencyLevel, prioritySubjects };

    // Generate AI tips in parallel with DB queries
    const examType  = String(req.query['examType']  || 'board');
    const chapters  = String(req.query['chapters']  || '');
    const hoursLeft = Number(req.query['hoursLeft'] || 12);
    const aiTipsPromise = generateAiTips(weakSubjects, 'Maharashtra SSC', language, examType, chapters, hoursLeft);
    const likelyQuestionsPromise = buildLikelyQuestionsSummary(weakSubjects, language);

    // Step 1: Notes - weak subjects first
    const { data: noteRows, error: noteError } = await supabase
      .from('user_notes')
      .select('title, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (noteError) { ApiResponse.error(res, 'Failed to fetch notes', 500); return; }

    const notes = (noteRows ?? []) as UserNoteRow[];
    const chapterList = chapters ? chapters.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean) : [];

    if (notes.length > 0) {
      const sorted = [...notes].sort((a, b) => {
        const aChapter = chapterList.length > 0 && chapterList.some(c => a.title.toLowerCase().includes(c));
        const bChapter = chapterList.length > 0 && chapterList.some(c => b.title.toLowerCase().includes(c));
        if (aChapter && !bChapter) return -1;
        if (!aChapter && bChapter) return 1;
        const aWeak = weakSubjects.some(s => a.title.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.title.toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
      });
      const items: EmergencyItem[] = sorted.slice(0, 5).map(n => {
        const matched = weakSubjects.find(s => n.title.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (n.title ?? '').trim() || 'Untitled Note',
          content:  n.content ?? '',
          tag:      matched ? `Weak: ${matched}` : 'Note',
          priority: matched ? 'high' : 'normal',
        };
      });
      const aiTips = await aiTipsPromise;
      const gameStats = buildGameStats(examType, weakSubjects, items, targetPercent, streakCount);
    ApiResponse.success(res, { mode: 'notes', items, aiTips, userContext, gameStats, likelyQuestions: await likelyQuestionsPromise } as EmergencyResponse);
      return;
    }

    // Step 2: Academic doubts only
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('text, subject, timestamp')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (convError) { ApiResponse.error(res, 'Failed to fetch doubts', 500); return; }

    const academicConvs = ((convRows ?? []) as ConversationRow[]).filter(c => isAcademicSubject(c.subject));

    if (academicConvs.length > 0) {
      const sorted = [...academicConvs].sort((a, b) => {
        const aWeak = weakSubjects.some(s => (a.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => (b.subject ?? '').toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
      });
      const items: EmergencyItem[] = sorted.slice(0, 5).map(c => {
        const rawText = (c.text ?? '').trim();
        const subject = (c.subject ?? '').trim();
        const isWeak  = weakSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (`[${subject}] ` + rawText).slice(0, 80).trim() || 'Recent Doubt',
          content:  rawText,
          tag:      subject,
          priority: isWeak ? 'high' : 'normal',
        };
      });
      const aiTips = await aiTipsPromise;
      const gameStats = buildGameStats(examType, weakSubjects, items, targetPercent, streakCount);
    ApiResponse.success(res, { mode: 'doubts', items, aiTips, userContext, gameStats, likelyQuestions: await likelyQuestionsPromise } as EmergencyResponse);
      return;
    }

    // Step 3: Syllabus chapters
    const { data: chapterRows, error: chapterError } = await supabase
      .from('chapters')
      .select('name, topics')
      .order('chapter_number', { ascending: true })
      .limit(20);

    if (chapterError) { ApiResponse.error(res, 'Failed to fetch syllabus', 500); return; }

    const syllabus = (chapterRows ?? []) as ChapterRow[];

    if (syllabus.length > 0) {
      const sorted = [...syllabus].sort((a, b) => {
        const aChapter = chapterList.length > 0 && chapterList.some(c => a.name.toLowerCase().includes(c));
        const bChapter = chapterList.length > 0 && chapterList.some(c => b.name.toLowerCase().includes(c));
        if (aChapter && !bChapter) return -1;
        if (!aChapter && bChapter) return 1;
        const aWeak = weakSubjects.some(s => a.name.toLowerCase().includes(s.toLowerCase()));
        const bWeak = weakSubjects.some(s => b.name.toLowerCase().includes(s.toLowerCase()));
        return (aWeak ? 0 : 1) - (bWeak ? 0 : 1);
      });
      const items: EmergencyItem[] = sorted.slice(0, 5).map(ch => {
        const isWeak = weakSubjects.some(s => ch.name.toLowerCase().includes(s.toLowerCase()));
        return {
          title:    (ch.name ?? '').trim() || 'Chapter',
          content:  Array.isArray(ch.topics) ? ch.topics.join(', ') : '',
          tag:      isWeak ? 'Weak Subject' : 'Syllabus',
          priority: isWeak ? 'high' : 'normal',
        };
      });
      const aiTips = await aiTipsPromise;
      const gameStats = buildGameStats(examType, weakSubjects, items, targetPercent, streakCount);
    ApiResponse.success(res, { mode: 'fallback', items, aiTips, userContext, gameStats, likelyQuestions: await likelyQuestionsPromise } as EmergencyResponse);
      return;
    }

    const aiTips = await aiTipsPromise;
    const gameStats = buildGameStats(examType, weakSubjects, [], targetPercent, streakCount);
    ApiResponse.success(res, { mode: 'empty', items: [], aiTips, userContext, gameStats, likelyQuestions: await likelyQuestionsPromise } as EmergencyResponse);
  }
);

export const getLikelyQuestions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    const user         = await findById(userId);
    const weakSubjects = user?.weakSubjects ?? [];
    const language     = user?.language     ?? 'english';

    if (weakSubjects.length === 0) {
      ApiResponse.success(res, {
        questions:    [],
        weakSubjects: [],
        generatedAt:  new Date().toISOString(),
        message:      'Set your weak subjects in Settings to get personalised likely questions.',
      } as LikelyQuestionsResponse & { message: string });
      return;
    }

    // Layer 1: Real PYQs from DB ranked by appeared_count
    const pyqResults = await Promise.allSettled(
      weakSubjects.slice(0, 3).map(s => getPYQsBySubject(s))
    );

    const realPYQs: LikelyQuestion[] = pyqResults
      .flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .sort((a, b) => b.appearedCount - a.appearedCount)
      .slice(0, 6)
      .map(pyq => ({
        question:      pyq.question,
        marks:         pyq.marks,
        type:          'short_answer' as const,
        subject:       canonicalSubject(pyq.subjectId),
        chapter:       pyq.chapterId,
        likelihood:    pyq.appearedCount >= 3 ? 'very_high' : pyq.appearedCount >= 2 ? 'high' : 'medium',
        answerHint:    pyq.answerHint,
        appearedYears: [pyq.year],
        source:        'pyq' as const,
      }));

    // Layer 2: AI generated questions for remaining weak subjects
    const aiQuestions = await generateLikelyQuestions(weakSubjects, language);

    // Merge: real PYQs first, then AI
    const merged = [...realPYQs, ...aiQuestions].slice(0, 12);

    ApiResponse.success(res, {
      questions:    merged,
      weakSubjects: weakSubjects.map(canonicalSubject),
      generatedAt:  new Date().toISOString(),
    } as LikelyQuestionsResponse);
  }
);











// ─── Quick Chapters (real chapter names for wizard quick-pick chips) ───────────

interface QuickChapterItem {
  name:      string;
  subjectId: string;
  isWeak:    boolean;
}

const WEAK_SUBJECT_TO_CHAPTER_CODES: Record<string, string[]> = {
  'mathematics':    ['algebra', 'geometry'],
  'science':        ['science1', 'science2'],
  'social science':  ['history', 'geography'],
  'english':        ['english'],
};

function weakSubjectsToChapterCodes(weakSubjects: string[]): string[] {
  const codes = new Set<string>();
  for (const subject of weakSubjects) {
    const lower = subject.toLowerCase().trim();
    for (const [key, vals] of Object.entries(WEAK_SUBJECT_TO_CHAPTER_CODES)) {
      if (lower.includes(key)) vals.forEach(v => codes.add(v));
    }
  }
  return Array.from(codes);
}

export const getQuickChapters = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { ApiResponse.error(res, 'Unauthorized', 401); return; }

    const user         = await findById(userId);
    const weakSubjects  = user?.weakSubjects ?? [];
    const weakCodes     = weakSubjectsToChapterCodes(weakSubjects);

    const items: QuickChapterItem[] = [];

    // Step 1: chapters from the student's weak subjects, if any
    if (weakCodes.length > 0) {
      const { data: weakRows } = await supabase
        .from('chapters')
        .select('name, subject_id')
        .in('subject_id', weakCodes)
        .order('chapter_number', { ascending: true })
        .limit(6);
      (weakRows ?? []).forEach((r: { name: string; subject_id: string }) => {
        items.push({ name: r.name, subjectId: r.subject_id, isWeak: true });
      });
    }

    // Step 2: fill remaining slots (up to 8 total) with other chapters, no duplicates
    if (items.length < 8) {
      const { data: fillRows } = await supabase
        .from('chapters')
        .select('name, subject_id')
        .order('chapter_number', { ascending: true })
        .limit(20);
      const existingNames = new Set(items.map(i => i.name));
      for (const r of (fillRows ?? []) as { name: string; subject_id: string }[]) {
        if (items.length >= 8) break;
        if (existingNames.has(r.name)) continue;
        items.push({ name: r.name, subjectId: r.subject_id, isWeak: false });
        existingNames.add(r.name);
      }
    }

    ApiResponse.success(res, { chapters: items });
  }
);
