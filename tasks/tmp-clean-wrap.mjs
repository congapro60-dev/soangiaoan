import { readFileSync, writeFileSync } from 'node:fs';
const t = readFileSync('tasks/tmp-qa-xoaytua4.mjs', 'utf8');
// Cấu trúc đúng: bỏ (async bọc dư, giữ import + IIFE cuối
const cleaned = t.split('(async () => {\n').filter((part, i) => i === 0).join('(async () => {\n');
writeFileSync('tasks/tmp-qa-xoaytua4.mjs', cleaned, 'utf8');
console.log('cleaned');
