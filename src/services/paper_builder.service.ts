import { StoredPYQ } from '../data/pyqs.store';
import { getPYQsByChapter } from '../data/pyqs.store';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { generateQuestions } from './ai_paper_fill.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaperBlueprint {
  id: string;
  subjectId: string;
  writtenMarks: number;
  internalMarks: number;
  durationMinutes: number;
  mcqMarksEach: number;
  veryShortMarksEach: number;
  shortMarksEach: number;
  longMarksEach: number;
  hasInternalChoice: boolean;
  negativeMarking: boolean;
  readingTimeMinutes: number;
  pacingTip: string;
  notes: string;
}

export interface PaperQuestion {
  id: string;
  question: string;
  marks: number;
  type: 'mcq' | 'very_short' | 'short' | 'long';
  chapterId: string;
  subjectId: string;
  answerHint: string;
  source: 'pyq' | 'ai';
  appearedYears?: number[];
  options?: string[]; // for MCQ
}

export interface BuiltPaper {
  subjectId: string;
  subjectName: string;
  mode: 'quick' | 'final';
  totalMarks: number;
  durationMinutes: number;
  readingTimeMinutes: number;
  pacingTip: string;
  sections: PaperSection[];
  questions: PaperQuestion[];
  bossHp: number; // gamification: starting HP
  bossName: string;
  bossEmoji: string;
}

export interface PaperSection {
  name: string;
  type: 'mcq' | 'very_short' | 'short' | 'long';
  marksEach: number;
  totalQuestions: number;
  totalMarks: number;
  questions: PaperQuestion[];
  instruction: string;
}

// ─── Boss Data ───────────────────────────────────────────────────────────────

const BOSS_DATA: Record<string, { name: string; emoji: string; title: string }> = {
  algebra:   { name: 'Algebra Dragon', emoji: '🐉', title: 'Master of Equations' },
  geometry:  { name: 'Geometry Titan', emoji: '⚔️', title: 'Guardian of Shapes' },
  science1:  { name: 'Physics Phantom', emoji: '⚡', title: 'Lord of Forces' },
  science2:  { name: 'Bio Beast', emoji: '🧬', title: 'Keeper of Life' },
  english:   { name: 'Literature Leviathan', emoji: '📜', title: 'Scribe of Words' },
  history:   { name: 'History Hydra', emoji: '🏛️', title: 'Watcher of Time' },
  geography: { name: 'Geo Golem', emoji: '🌍', title: 'Shaper of Earth' },
};

// ─── Blueprint Fetcher ─────────────────────────────────────────────────────────

async function getBlueprint(subjectId: string): Promise<PaperBlueprint | null> {
  const { data, error } = await supabase
    .from('paper_blueprints')
    .select('*')
    .eq('subject_id', subjectId)
    .single();

  if (error || !data) {
    logger.warn(`[PaperBuilder] No blueprint found for subject: ${subjectId}`);
    return null;
  }

  return {
    id: data.id,
    subjectId: data.subject_id,
    writtenMarks: data.written_marks,
    internalMarks: data.internal_marks,
    durationMinutes: data.duration_minutes,
    mcqMarksEach: data.mcq_marks_each,
    veryShortMarksEach: data.very_short_marks_each,
    shortMarksEach: data.short_marks_each,
    longMarksEach: data.long_marks_each,
    hasInternalChoice: data.has_internal_choice,
    negativeMarking: data.negative_marking,
    readingTimeMinutes: data.reading_time_minutes,
    pacingTip: data.pacing_tip || '',
    notes: data.notes || '',
  };
}

// ─── Subject Name Fetcher ──────────────────────────────────────────────────────

async function getSubjectName(subjectId: string): Promise<string> {
  const { data, error } = await supabase
    .from('subjects')
    .select('name')
    .eq('id', subjectId)
    .single();

  if (error || !data) return subjectId;
  return data.name;
}

// ─── Paper Builder ─────────────────────────────────────────────────────────────

export async function buildPaper(
  subjectId: string,
  chapterIds: string[],
  mode: 'quick' | 'final'
): Promise<BuiltPaper | null> {
  const blueprint = await getBlueprint(subjectId);
  if (!blueprint) {
    logger.error(`[PaperBuilder] Cannot build paper — no blueprint for ${subjectId}`);
    return null;
  }

  // Fetch all real PYQs for selected chapters
  const pyqPromises = chapterIds.map(chId => getPYQsByChapter(chId));
  const pyqResults = await Promise.all(pyqPromises);
  const allPYQs = pyqResults.flat();

  logger.info(`[PaperBuilder] Found ${allPYQs.length} real PYQs for ${subjectId} chapters: ${chapterIds.join(', ')}`);

  // Calculate target marks based on mode
  const targetMarks = mode === 'quick' 
    ? Math.min(25, Math.ceil(blueprint.writtenMarks * 0.3)) // ~30% of full paper
    : blueprint.writtenMarks;

  // Build sections based on blueprint
  const sections: PaperSection[] = [];
  const usedQuestions: PaperQuestion[] = [];

  // Determine question counts per section
  const mcqCount = mode === 'quick' ? 5 : Math.floor(targetMarks * 0.3 / blueprint.mcqMarksEach);
  const veryShortCount = mode === 'quick' ? 3 : Math.floor(targetMarks * 0.2 / blueprint.veryShortMarksEach);
  const shortCount = mode === 'quick' ? 3 : Math.floor(targetMarks * 0.3 / blueprint.shortMarksEach);
  const longCount = mode === 'quick' ? 1 : Math.floor(targetMarks * 0.2 / blueprint.longMarksEach);

  // Build MCQ section
  const mcqQuestions = await assembleQuestions(allPYQs, 'mcq', mcqCount, blueprint.mcqMarksEach, subjectId, chapterIds, allPYQs);
  if (mcqQuestions.length > 0) {
    sections.push({
      name: 'Section A — Objective Questions',
      type: 'mcq',
      marksEach: blueprint.mcqMarksEach,
      totalQuestions: mcqQuestions.length,
      totalMarks: mcqQuestions.length * blueprint.mcqMarksEach,
      questions: mcqQuestions,
      instruction: 'Choose the correct answer from the given options.',
    });
    usedQuestions.push(...mcqQuestions);
  }

  // Build Very Short section
  const vsQuestions = await assembleQuestions(allPYQs, 'very_short', veryShortCount, blueprint.veryShortMarksEach, subjectId, chapterIds, allPYQs);
  if (vsQuestions.length > 0) {
    sections.push({
      name: 'Section B — Very Short Answer',
      type: 'very_short',
      marksEach: blueprint.veryShortMarksEach,
      totalQuestions: vsQuestions.length,
      totalMarks: vsQuestions.length * blueprint.veryShortMarksEach,
      questions: vsQuestions,
      instruction: 'Answer in one sentence or a few words.',
    });
    usedQuestions.push(...vsQuestions);
  }

  // Build Short section
  const shortQuestions = await assembleQuestions(allPYQs, 'short', shortCount, blueprint.shortMarksEach, subjectId, chapterIds, allPYQs);
  if (shortQuestions.length > 0) {
    sections.push({
      name: 'Section C — Short Answer',
      type: 'short',
      marksEach: blueprint.shortMarksEach,
      totalQuestions: shortQuestions.length,
      totalMarks: shortQuestions.length * blueprint.shortMarksEach,
      questions: shortQuestions,
      instruction: 'Answer briefly in 2-3 sentences.',
    });
    usedQuestions.push(...shortQuestions);
  }

  // Build Long section
  const longQuestions = await assembleQuestions(allPYQs, 'long', longCount, blueprint.longMarksEach, subjectId, chapterIds, allPYQs);
  if (longQuestions.length > 0) {
    sections.push({
      name: 'Section D — Long Answer',
      type: 'long',
      marksEach: blueprint.longMarksEach,
      totalQuestions: longQuestions.length,
      totalMarks: longQuestions.length * blueprint.longMarksEach,
      questions: longQuestions,
      instruction: 'Answer in detail with examples and diagrams where applicable.',
    });
    usedQuestions.push(...longQuestions);
  }

  const totalMarks = sections.reduce((sum, s) => sum + s.totalMarks, 0);
  const boss = BOSS_DATA[subjectId] || { name: 'Unknown Boss', emoji: '❓', title: 'Mystery' };

  const subjectName = await getSubjectName(subjectId);

  return {
    subjectId,
    subjectName,
    mode,
    totalMarks,
    durationMinutes: mode === 'quick' ? 30 : blueprint.durationMinutes,
    readingTimeMinutes: blueprint.readingTimeMinutes,
    pacingTip: blueprint.pacingTip,
    sections,
    questions: usedQuestions,
    bossHp: 100, // Full HP, reduced by player progress
    bossName: boss.name,
    bossEmoji: boss.emoji,
  };
}

// ─── Question Assembler ────────────────────────────────────────────────────────

async function assembleQuestions(
  pyqs: StoredPYQ[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  targetCount: number,
  marksEach: number,
  subjectId: string,
  chapterIds: string[],
  allPYQs: StoredPYQ[]
): Promise<PaperQuestion[]> {
  // Filter PYQs by approximate marks match
  const matching = pyqs.filter(p => {
    // Map marks to question type
    if (type === 'mcq' && p.marks === marksEach) return true;
    if (type === 'very_short' && p.marks === marksEach) return true;
    if (type === 'short' && p.marks === marksEach) return true;
    if (type === 'long' && p.marks >= marksEach) return true;
    return false;
  });

  // Sort by appearedCount (higher = more likely to repeat) then randomize
  const sorted = matching.sort((a, b) => b.appearedCount - a.appearedCount);
  
  // Take top questions, fill with AI if needed
  const selected = sorted.slice(0, targetCount);
  
  const questions: PaperQuestion[] = selected.map(p => ({
    id: p.id,
    question: p.question,
    marks: p.marks,
    type,
    chapterId: p.chapterId,
    subjectId: p.subjectId,
    answerHint: p.answerHint,
    source: 'pyq',
    appearedYears: [p.year],
  }));

  // AI fill-in for gaps
  const gap = targetCount - questions.length;
  if (gap > 0) {
    logger.info(`[PaperBuilder] Filling ${gap} gaps with AI for ${type}`);
    const aiQuestions = await generateQuestions(
      subjectId,
      chapterIds.slice(0, 2), // Use first 2 chapters for context
      type,
      marksEach,
      gap,
      allPYQs
    );
    questions.push(...aiQuestions);
  }

  return questions;
}

export default { buildPaper };
