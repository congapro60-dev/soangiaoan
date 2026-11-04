// R3 fix1 — thêm timelineKey vào spec 11-11-78 (giữ format stringify(2) như recipe hash)
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
const s = j.lessonSpecs.find((x) => x.key === '11-11-78');
if (!s) throw new Error('không thấy spec 11-11-78');
if (s.timelineKey) throw new Error('timelineKey đã tồn tại: ' + s.timelineKey);
// chèn theo thứ tự trường của interface (sau mistakes, trước các trường optional khác)
const ordered = {};
for (const [k, v] of Object.entries(s)) {
  ordered[k] = v;
  if (k === 'mistakes') ordered.timelineKey = 'gateD78';
}
if (!ordered.timelineKey) ordered.timelineKey = 'gateD78';
j.lessonSpecs = j.lessonSpecs.map((x) => (x.key === '11-11-78' ? ordered : x));
writeFileSync(P, JSON.stringify(j, null, 2) + '\n', 'utf8');
const check = JSON.parse(readFileSync(P, 'utf8'));
console.log('spec 78 có timelineKey:', check.lessonSpecs.find((x) => x.key === '11-11-78').timelineKey);
console.log('specs:', check.lessonSpecs.length, '| aiErrors:', Object.keys(check.aiErrors).length);
