import fs from 'node:fs';
const REQ = ['category', 'wrongSolution', 'correction', 'proof', 'whyAiError', 'teacherPrompt', 'studentProduct', 'boardPrompt', 'libraryTitle'];
for (const f of ['banToan-w5-w6', 'banToan-w11-batch2']) {
  const s = JSON.parse(fs.readFileSync(`src/data/liveLessonPackages/${f}.snapshot.json`, 'utf8'));
  for (const k of Object.keys(s.aiErrors)) {
    const miss = REQ.filter((x) => !s.aiErrors[k][x]);
    if (miss.length) console.log(k, 'thiếu:', miss.join(','));
  }
}
console.log('KIỂM TRA XONG — nếu trên không in dòng nào thì đã đủ 9 trường');
