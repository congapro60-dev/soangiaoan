import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-xoaytua4.mjs', 'utf8');
// Cấu trúc đúng: import ở đầu file, IIFE sau
t = t.replace('(async () => {\nimport { createRequire }', 'import { createRequire }');
t = t.replace("(async () => {\nimport { setTimeout as sleep }", "import { setTimeout as sleep }");
// Thêm IIFE sau import require
t = t.replace("const puppeteer = require('puppeteer');", "const puppeteer = require('puppeteer');\n(async () => {");
writeFileSync('tasks/tmp-qa-xoaytua4.mjs', t, 'utf8');
console.log('restructured');
