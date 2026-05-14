const fs = require('fs');
let c = fs.readFileSync('src/services/quiz_generator.service.ts', 'utf8');
c = c.replace(
  "throw new Error('Quiz generation failed');",
  "try { const g = await askGroq({ systemPrompt: 'Return ONLY a JSON array.', userMessage: prompt }); const p = JSON.parse(g.text.replace(/```/g, '').trim()); if (Array.isArray(p)) return p.slice(0, count); throw new Error('x'); } catch(g2) { throw new Error('Quiz generation failed'); }"
);
fs.writeFileSync('src/services/quiz_generator.service.ts', c);
console.log('length: ' + c.length);
