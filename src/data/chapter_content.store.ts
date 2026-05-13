import supabase from '../config/supabase';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyConcept {
  term:       string;
  definition: string;
}

export interface Formula {
  name:        string;
  formula:     string;
  when_to_use: string;
}

export interface ChapterContent {
  id:               string;
  chapterId:        string;
  keyConcepts:      KeyConcept[];
  formulas:         Formula[];
  boardTips:        string;
  importantPoints:  string[];
  pyqPatterns:      string;
  marksBreakdown:   string;
  createdAt:        string;
  updatedAt:        string;
}

interface ChapterContentRow {
  id:               string;
  chapter_id:       string;
  key_concepts:     KeyConcept[];
  formulas:         Formula[];
  board_tips:       string;
  important_points: string[];
  pyq_patterns:     string;
  marks_breakdown:  string;
  created_at:       string;
  updated_at:       string;
}

function toChapterContent(row: ChapterContentRow): ChapterContent {
  return {
    id:              row.id,
    chapterId:       row.chapter_id,
    keyConcepts:     (row.key_concepts  ?? []) as KeyConcept[],
    formulas:        (row.formulas      ?? []) as Formula[],
    boardTips:       row.board_tips      ?? '',
    importantPoints: row.important_points ?? [],
    pyqPatterns:     row.pyq_patterns    ?? '',
    marksBreakdown:  row.marks_breakdown ?? '',
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// ─── Store methods ────────────────────────────────────────────────────────────

/**
 * Fetch chapter content by chapter UUID.
 * Returns undefined if no content has been seeded for this chapter yet.
 */
export async function getChapterContent(
  chapterId: string
): Promise<ChapterContent | undefined> {
  const { data, error } = await supabase
    .from('chapter_content')
    .select('*')
    .eq('chapter_id', chapterId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      // PGRST116 = no rows found — expected for unseeded chapters, not an error
      logger.warn(`[ChapterContent] fetch error for chapter ${chapterId}: ${error?.message}`);
    }
    return undefined;
  }

  return toChapterContent(data as ChapterContentRow);
}

/**
 * Build a compact context string from ChapterContent for use in AI prompts.
 * Keeps it under ~800 tokens to leave room for the student's question.
 */
export function buildContentContext(content: ChapterContent): string {
  const lines: string[] = [];

  if (content.keyConcepts.length > 0) {
    lines.push('KEY CONCEPTS:');
    content.keyConcepts.slice(0, 6).forEach((kc) => {
      lines.push(`• ${kc.term}: ${kc.definition}`);
    });
  }

  if (content.formulas.length > 0) {
    lines.push('\nFORMULAS:');
    content.formulas.forEach((f) => {
      lines.push(`• ${f.name}: ${f.formula}`);
      lines.push(`  When to use: ${f.when_to_use}`);
    });
  }

  if (content.importantPoints.length > 0) {
    lines.push('\nIMPORTANT BOARD POINTS:');
    content.importantPoints.slice(0, 6).forEach((pt) => {
      lines.push(`• ${pt}`);
    });
  }

  if (content.boardTips) {
    lines.push(`\nEXAMINER TIPS:\n${content.boardTips}`);
  }

  if (content.pyqPatterns) {
    lines.push(`\nPAST YEAR QUESTION PATTERN:\n${content.pyqPatterns}`);
  }

  return lines.join('\n');
}
