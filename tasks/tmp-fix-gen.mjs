import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-gen-stage7.mjs', 'utf8');
// Generator đang diễn giải \n thành newline thật trong regex — chuyển dumpBlock sang String.raw
t = t.replace("const dumpBlock = `", "const dumpBlock = String.raw`");
writeFileSync('tasks/tmp-gen-stage7.mjs', t, 'utf8');
console.log('generator fixed:', t.includes('String.raw`'));
