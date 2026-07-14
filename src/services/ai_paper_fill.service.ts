import { StoredPYQ } from '../data/pyqs.store';
import logger from '../utils/logger';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  marks: number;
  type: 'mcq' | 'very_short' | 'short' | 'long';
  chapterId: string;
  subjectId: string;
  answerHint: string;
  source: 'ai';
  options?: string[];
}

// ─── AI Question Generator ─────────────────────────────────────────────────

export async function generateQuestions(
  subjectId: string,
  chapterIds: string[],
  type: 'mcq' | 'very_short' | 'short' | 'long',
  marksEach: number,
  count: number,
  existingPYQs: StoredPYQ[]
): Promise<AIGeneratedQuestion[]> {
  if (count <= 0) return [];

  logger.info(`[AIPaperFill] Generating ${count} ${type} questions (${marksEach} marks each) for ${subjectId}`);

  // Build context from existing PYQs to guide AI
  const contextQuestions = existingPYQs
    .slice(0, 3)
    .map(p => `- "${p.question}" (${p.marks} marks)`)
    .join('\n');

  const chapterContext = chapterIds.join(', ');

  // For now: generate deterministic placeholder questions based on subject + chapter
  // In production: call Gemini/Cloudflare AI with proper prompt
  const questions: AIGeneratedQuestion[] = [];

  const templates: Record<string, Record<string, string[]>> = {
    algebra: {
      mcq: [
        'Which of the following is the standard form of a quadratic equation?',
        'The discriminant of ax² + bx + c = 0 is:',
        'If the roots of x² - 5x + 6 = 0 are α and β, then α + β =',
        'The common difference of AP: 2, 5, 8, 11... is:',
        'Which term of AP 3, 8, 13, 18... is 78?',
      ],
      short: [
        'Solve the quadratic equation: x² - 7x + 12 = 0',
        'Find the 15th term of AP: 10, 6, 2, -2...',
        'If α and β are roots of x² + px + q = 0, find α² + β²',
      ],
      long: [
        'A train travels 360 km at uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the original speed.',
        'The sum of first n terms of an AP is 3n² + 5n. Find the AP and its 20th term.',
      ],
    },
    geometry: {
      mcq: [
        'In similar triangles, the ratio of corresponding sides is equal to:',
        'The Pythagorean theorem states that in a right triangle:',
        'The angle subtended by a diameter at any point on the circle is:',
      ],
      short: [
        'Prove that the line joining the midpoints of two sides of a triangle is parallel to the third side.',
        'In ΔABC, DE || BC. If AD = 2cm, DB = 3cm, AE = 1.5cm, find EC.',
      ],
      long: [
        'Prove that the tangent at any point of a circle is perpendicular to the radius through the point of contact.',
        'A tower stands vertically on the ground. From a point 30m away, the angle of elevation is 45°. Find the height of the tower.',
      ],
    },
    science1: {
      mcq: [
        'The SI unit of gravitational constant G is:',
        'Ohm\'s law states that:',
        'The chemical formula of water is:',
      ],
      short: [
        'State Newton\'s law of gravitation.',
        'What is the difference between displacement and distance?',
      ],
      long: [
        'Derive the expression for kinetic energy and potential energy of a body. Show that total mechanical energy is conserved.',
        'Explain the construction and working of an electric motor with a neat diagram.',
      ],
    },
    science2: {
      mcq: [
        'Mendel\'s law of segregation states that:',
        'The process of photosynthesis occurs in:',
        'Greenhouse effect is caused by excess of:',
      ],
      short: [
        'Explain the process of photosynthesis.',
        'What is the difference between aerobic and anaerobic respiration?',
      ],
      long: [
        'Describe the process of digestion in human beings with the help of a labelled diagram.',
        'Explain the structure and function of the human heart.',
      ],
    },
    english: {
      mcq: [
        'The correct form of the verb: "She ___ to school every day."',
        'Identify the figure of speech: "Her voice is music to my ears."',
        'The antonym of "brave" is:',
      ],
      short: [
        'Write a letter to your friend describing your recent visit to a historical place.',
        'Change the voice: "The cat killed the mouse."',
      ],
      long: [
        'Write an essay on "The Importance of Education in Modern Society" in about 150 words.',
        'Read the following passage and answer the questions that follow: [Passage about environmental conservation]',
      ],
    },
  };

  const subjectTemplates = templates[subjectId] || templates['algebra'];
  const typeTemplates = subjectTemplates[type] || subjectTemplates['short'] || [];
  
  for (let i = 0; i < count; i++) {
    const template = typeTemplates[i % typeTemplates.length];
    questions.push({
      id: `ai-${subjectId}-${type}-${i}`,
      question: `${template} [AI Generated - ${i + 1}]`,
      marks: marksEach,
      type,
      chapterId: chapterIds[i % chapterIds.length],
      subjectId,
      answerHint: 'Think about the key concepts from this chapter. Refer to your textbook for the exact formula.',
      source: 'ai',
      options: type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
    });
  }

  logger.info(`[AIPaperFill] Generated ${questions.length} questions`);
  return questions;
}
