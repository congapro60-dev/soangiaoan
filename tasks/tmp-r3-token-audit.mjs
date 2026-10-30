// R3 B8 — audit token: mỗi token nằm ở trường nào của spec/aiError 11-11-78 (chọn token kiểm QA)
import { readFileSync } from 'node:fs';

const j = JSON.parse(readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8'));
const spec = j.lessonSpecs.find((s) => s.key === '11-11-78');
const err = j.aiErrors['11-11-78'];

const TOKENS = ['chéo nhau', 'đồng phẳng', 'trần', 'phản ví dụ', '(γ)', '7,5', '4/9', '12 cm', '1/3', 'mômen', 'gãy đổ', 'chịu lực', 'mất cân bằng', 'đảo chéo', 'Burj', 'Casio', 'đến lượt sau', 'Tiến độ gửi', 'AI kết luận', 'a ⊂ (α)'];

const hits = {};
function walk(obj, path) {
  if (typeof obj === 'string') {
    for (const t of TOKENS) {
      if (obj.toLowerCase().includes(t.toLowerCase())) {
        (hits[t] = hits[t] || []).push(path + ' → …' + obj.slice(Math.max(0, obj.toLowerCase().indexOf(t.toLowerCase()) - 30), obj.toLowerCase().indexOf(t.toLowerCase()) + t.length + 30).replace(/\n/g, ' ') + '…');
      }
    }
  } else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, path + '[' + i + ']'));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, path + '.' + k);
}
walk(spec, 'spec');
walk(err, 'aiError');

for (const t of TOKENS) {
  const list = hits[t] || [];
  console.log('== ' + t + ' == ' + (list.length ? '' : '(KHÔNG xuất hiện)'));
  const seen = new Set();
  for (const h of list) {
    const p = h.split(' → ')[0];
    if (seen.has(p)) continue;
    seen.add(p);
    console.log('   ' + h.slice(0, 220));
  }
}
