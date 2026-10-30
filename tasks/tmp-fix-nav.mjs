import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-xoaytua2.cjs';
let t = readFileSync(p, 'utf8');
const oldS = "if (Number(cur) < target) { await gvClick('Sau →'); await sleep(4500); }";
const newS = "if (Number(cur) < target) { await gvClick('Sau →'); await sleep(4500); } else if (Number(cur) > target) { await gvClick('← Trước'); await sleep(4500); }";
if (!t.includes(oldS)) throw new Error('nav cond not found');
t = t.split(oldS).join(newS);
writeFileSync(p, t, 'utf8');
console.log('nav fixed');
