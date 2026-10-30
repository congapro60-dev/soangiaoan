import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-xoaytua4.mjs', 'utf8');
if (!t.trim().startsWith('(async')) {
  t = '(async () => {\n' + t;
}
writeFileSync('tasks/tmp-qa-xoaytua4.mjs', t, 'utf8');
console.log('wrapped ok');
