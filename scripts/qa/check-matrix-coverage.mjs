import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { TOPICS, mathQuestion } from '../../lib/campaign.js';
const rel = p => fileURLToPath(new URL(p, import.meta.url));
const s = fs.readFileSync(rel('../../lib/campaign.js'), 'utf8');
const mq = s.slice(s.indexOf('export function mathQuestion'), s.indexOf('export function racePublic'));
const fb = s.slice(s.indexOf('const GENERATOR_FALLBACK'), s.indexOf('export function mathQuestion'));
const cov = fs.readFileSync(rel('../../lib/curriculum-coverage.js'), 'utf8');
const missing = [];
for (const t of TOPICS) {
    const inFB = fb.includes(`${t.id}:`);
    const inCase = mq.includes(`case '${t.id}'`);
    const inExtra = cov.includes(`case '${t.id}'`);
    if (!inFB && !inCase && !inExtra) missing.push(t.id + ' (lớp ' + t.grade + ')');
}
console.log(missing.length ? 'THIẾU generator/fallback:\n' + missing.join('\n') : 'TẤT CẢ topics đều có generator hoặc fallback');
const fails = [];
for (const t of TOPICS) {
    try { const q = mathQuestion(t.id, 1, 12345); if (!q.question) fails.push(t.id); }
    catch (e) { fails.push(t.id + ' -> ' + e.message.slice(0, 40)); }
}
console.log(fails.length ? 'SINH CÂU FAIL:\n' + fails.join('\n') : 'SINH CÂU OK cho toàn bộ ' + TOPICS.length + ' topics');
