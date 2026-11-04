// Fix SPOILER_RX t9b (token regex-an toàn)
import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-t9b-qa.cjs', 'utf8');
const m = t.match(/const SPOILER_RX = [^;]+;/);
if (!m) throw new Error('không thấy SPOILER_RX');
t = t.replace(m[0], "const SPOILER_RX = { khong90: 'không chứa 90', beBang: '90 < 90' };");
writeFileSync('tasks/tmp-t9b-qa.cjs', t, 'utf8');
console.log('fixed:', t.includes('khong90'));
