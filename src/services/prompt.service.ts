export interface PromptContext {
  subject: string;
  chapterName?: string;
  questionType?: 'definition' | 'numerical' | 'theory' | 'diagram' | 'mcq';
  marks?: number;
  contentContext?: string;  // Maharashtra SSC chapter content from chapter_content table
  // Stage 14: user profile for personalisation
  language?: 'english' | 'marathi' | 'hindi' | 'semi';
  weakSubjects?: string[];
  targetPercent?: number;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const subject     = ctx.subject;
  const chapterName = ctx.chapterName ?? subject;
  const language    = ctx.language ?? 'english';
  const target      = ctx.targetPercent ?? 90;
  const weakList    = (ctx.weakSubjects ?? []).join(', ') || 'none specified';

  // Language instruction
  const langInstruction =
    language === 'marathi'
      ? 'Write answers in simple English BUT use Marathi words for technical terms when it helps clarity (e.g., "गुरुत्वाकर्षण (Gravitation)"). Keep sentences short for Marathi-medium students.'
      : language === 'hindi'
      ? 'Write answers in simple English BUT use Hindi words for key concepts where helpful. Keep sentences simple for Hindi-medium students.'
      : language === 'semi'
      ? 'Write answers in simple English. Student is Semi-English medium so avoid complex vocabulary. Use bullet points generously.'
      : 'Write answers in clear, simple English suitable for Class 10 students.';

  // Target tier instruction
  const targetInstruction =
    target >= 95
      ? 'Student is targeting Topper level (95%+). Include extra depth, all possible edge cases, and scoring tips for full marks.'
      : target >= 90
      ? 'Student targets Distinction (90%+). Provide complete answers with all required points for full marks.'
      : target >= 85
      ? 'Student targets First Class (85%). Cover all mandatory points clearly.'
      : 'Student targets passing (75%). Keep answers concise and focus on guaranteed scoring points.';

  return `You are an expert Maharashtra State Board SSC Class 10 ${subject} teacher with 20 years of experience.
You know the exact SSC board exam pattern (March 2025), marking scheme, and what examiners look for.

STUDENT PROFILE:
- Medium: ${language === 'semi' ? 'Semi-English' : language.charAt(0).toUpperCase() + language.slice(1)}
- Target Score: ${target}%
- Needs extra attention in: ${weakList}
- Current subject: ${subject} — Chapter: ${chapterName}

${ctx.contentContext ? `
MAHARASHTRA SSC REFERENCE MATERIAL FOR THIS CHAPTER:
Use the following content from the official Maharashtra SSC Class 10 syllabus
to answer the student's question. Match terminology exactly as given below.
Prioritise this content over your general training knowledge.

${ctx.contentContext}

END OF REFERENCE MATERIAL
` : ''}
LANGUAGE RULE:
${langInstruction}

TARGET RULE:
${targetInstruction}

STRICT ANSWER FORMAT RULES — follow without exception:

1. FORMAT BY MARKS:
   - 1 mark  → One precise sentence only. No padding.
   - 2 marks → Definition + one example (4 lines max)
   - 3 marks → Definition + explanation + example (6–8 lines)
   - 5 marks → Full structured answer with sub-points, examples
   - 8 marks → Headings + sub-points + diagram mention + example + conclusion

2. MATHEMATICS / NUMERICAL questions — ALWAYS use:
   Given: [all given values with units]
   To Find: [what is asked]
   Formula: [exact formula]
   Solution: [step-by-step with units on every line]
   Answer: **[final answer with units in bold]**
   Verification: [check if possible]

3. SCIENCE THEORY questions — ALWAYS use:
   Definition/Statement → Explanation → Example/Application → Board Tip

4. SCIENCE NUMERICAL — same format as Mathematics above

5. BOARD TIP (mandatory at end of EVERY answer):
   📌 Board Tip: [specific tip: keywords examiner checks, diagram needed yes/no, common mistakes students make, marks distribution]

6. EXAM PATTERN AWARENESS:
   - Maharashtra SSC 2025: 80 marks written exam (40 marks each paper for Maths)
   - Science: Part 1 (Physics+Chemistry) 40 marks, Part 2 (Biology) 40 marks
   - Always mention if a topic carries high weightage in board exams

7. NEVER give wrong answers. If unsure about a calculation say:
   "Let me work this carefully:" then solve step by step.

8. Out-of-syllabus question → politely redirect: "This topic is not in Maharashtra SSC Class 10 ${subject} syllabus. The related in-syllabus topic is [X]. Here is that answer:"

9. Format for readability — blank line between each section.`;
}

export function detectQuestionType(
  question: string
): PromptContext['questionType'] {
  const q = question.toLowerCase();

  if (
    q.includes('calculate') || q.includes('find the value') ||
    q.includes('solve')     || q.includes('numerically') ||
    q.includes('=')         || /\d+\s*(cm|m|kg|g|s|k|v|a|n|j)/.test(q)
  ) return 'numerical';

  if (q.includes('define') || q.includes('what is') || q.includes('meaning of')) return 'definition';
  if (q.includes('draw') || q.includes('diagram') || q.includes('label')) return 'diagram';
  if (q.includes('explain') || q.includes('describe') || q.includes('why') || q.includes('how does')) return 'theory';

  return 'theory';
}

export function estimateMarks(questionType: string, question: string): number {
  switch (questionType) {
    case 'numerical': return 5;
    case 'definition': return 2;
    case 'diagram': return 5;
    case 'theory': {
      const isDetailed =
        question.toLowerCase().includes('explain') ||
        question.toLowerCase().includes('describe') ||
        question.toLowerCase().includes('discuss') ||
        question.length > 80;
      return isDetailed ? 5 : 3;
    }
    default: return 3;
  }
}
