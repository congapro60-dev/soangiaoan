// QA preview local không minify — bắt stack TDZ đầy đủ
import { writeFileSync } from 'node:fs';
const lines = [
  "import puppeteer from 'puppeteer';",
  "import { setTimeout as sleep } from 'node:timers/promises';",
  "const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });",
  "const page = await gb.newPage();",
  "await page.setViewport({ width: 1000, height: 900 });",
  "const errors = [];",
  "page.on('console', (msg) => { const s = msg.text(); if (/error|Cannot access|ReferenceError/i.test(s)) errors.push(s.slice(0, 400)); });",
  "page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 500)));",
  "await page.goto('http://localhost:4173/adaptive-library/adaptive-1792833009074', { waitUntil: 'domcontentloaded', timeout: 90000 });",
  "await sleep(12000);",
  "const t = await page.evaluate(() => (document.body.innerText || '').replace(/\\n{2,}/g, '\\n'));",
  "console.log('TITLE:', (t.split('\\n').find((l) => /Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 80));",
  "console.log('ERRORS:');",
  "errors.forEach((e) => console.log(' ', e));",
  "await page.close();",
  "await gb.disconnect();",
  "process.exit(0);",
  "})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });",
];
// Bọc IIFE
const body = lines.join('\n');
const wrapped = '(async () => {\n' + body.slice(0, body.lastIndexOf('})().catch')) + '\n})().catch((e) => { console.error(\'FAIL:\', e.message); process.exit(1); });\n';
writeFileSync('tasks/tmp-qa-preview.cjs', wrapped, 'utf8');
console.log('written');
