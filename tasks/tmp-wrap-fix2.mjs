import { readFileSync, writeFileSync } from 'node:fs';
const t = readFileSync('tasks/tmp-qa-xoaytua4.mjs', 'utf8');
// Cấu trúc đúng: import trước, IIFE sau
const importPart = t.slice(0, t.indexOf('(async () => {'));
const bodyPart = t.slice(t.indexOf('(async () => {'));
const imports = importPart.trim();
const fixed = imports + '\n' + bodyPart;
writeFileSync('tasks/tmp-qa-xoaytua4.mjs', fixed, 'utf8');
console.log('structure fixed');
