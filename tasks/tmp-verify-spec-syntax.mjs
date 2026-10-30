import fs from 'fs';

// Verify JSON snapshot validity
const raw = fs.readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8');
const data = JSON.parse(raw);
console.log('SNAPSHOT JSON VALID. TOTAL LESSON SPECS:', data.lessonSpecs.length);

const spec = data.lessonSpecs.find(s => s.key === '10-12-88');
if (!spec) {
  console.error('SPEC 10-12-88 NOT FOUND');
  process.exit(1);
}
console.log('SPEC 10-12-88:', spec.title, '| Grade:', spec.grade, '| Week:', spec.week, '| Period:', spec.period, '| TimelineKey:', spec.timelineKey);
console.log('EXAMPLES COUNT:', spec.examples.length);
console.log('EXERCISES COUNT:', spec.exercises.length);
console.log('QUICK COUNT:', spec.quick.length);
console.log('MISTAKES COUNT:', spec.mistakes.length);
console.log('BOARD KNOWLEDGE LINES:', spec.boardKnowledge.length);

const aiErr = data.aiErrors['10-12-88'];
if (!aiErr) {
  console.error('AI ERROR 10-12-88 NOT FOUND');
  process.exit(1);
}
console.log('AI ERROR 10-12-88 CATEGORY:', aiErr.category, '| LIBRARY TITLE:', aiErr.libraryTitle);

// Verify adapter code contains gateD101288
const adapter = fs.readFileSync('src/lib/liveLesson/v4/lessonAdapter.ts', 'utf8');
if (!adapter.includes('gateD101288: [')) {
  console.error('TIMELINE gateD101288 NOT FOUND IN lessonAdapter.ts');
  process.exit(1);
}
console.log('TIMELINE gateD101288 FOUND IN lessonAdapter.ts');
console.log('ALL SYNTAX & DATA CHECKS PASSED!');
