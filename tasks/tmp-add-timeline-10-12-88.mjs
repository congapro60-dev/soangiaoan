import fs from 'fs';

const adapterPath = 'src/lib/liveLesson/v4/lessonAdapter.ts';
const adapter = fs.readFileSync(adapterPath, 'utf8');

const newTimeline = `
  // gateD101288 — "Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt" (10-12-88):
  // Phân bổ 1-3-2-4-3-1-7-3-5-3 phút (P0–P40).
  gateD101288: [
    ['P00', 0, 180, 'S0', 'opening'],
    ['P03', 180, 300, 'S1', 'guidingQuestion'],
    ['P05', 300, 480, 'S2', 'goals'],
    ['P08', 480, 960, 'S3', 'knowledgeCycle'],
    ['P16', 960, 1140, 'S4', 'aiError'],
    ['P19', 1140, 1200, 'S5', 'grouping'],
    ['P20', 1200, 1620, 'S6', 'differentiatedPractice'],
    ['P27', 1620, 1800, 'S7', 'postCheck'],
    ['P30', 1800, 2100, 'S8', 'quickCheck'],
    ['P35', 2100, 2280, 'S9', 'summary'],
    ['P38', 2280, 2400, 'S10', 'exitTicket'],
  ],`;

// Insert before the closing brace of TIMELINE_BY_KEY
const insertPos = adapter.indexOf('};') - 1;
if (insertPos > 0) {
  const before = adapter.slice(0, insertPos);
  const after = adapter.slice(insertPos);
  fs.writeFileSync(adapterPath, before + newTimeline + '\n' + after, 'utf8');
  console.log('TIMELINE gateD101288 ADDED SUCCESSFULLY');
} else {
  console.error('COULD NOT FIND INSERT POSITION');
}
