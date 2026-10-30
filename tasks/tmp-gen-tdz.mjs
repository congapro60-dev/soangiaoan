import { writeFileSync } from 'node:fs';
const lines = [
  "import puppeteer from 'puppeteer';",
  "import { setTimeout as sleep } from 'node:timers/promises';",
  "const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });",
  "const page = await gb.newPage();",
  "await page.setViewport({ width: 1000, height: 900 });",
  "const errors = [];",
  "page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err && err.stack || err).slice(0, 1200)));",
  "page.on('console', (msg) => { const s = msg.text(); if (/Cannot access|ReferenceError/i.test(s)) errors.push('CONSOLE: ' + s.slice(0, 800)); });",
  "const cdp = await page.target().createCDPSession();",
  "await cdp.send('Network.enable');",
  "await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });",
  "await page.goto('https://giaoandewey.vercel.app/adaptive-live/wPXEqrWTZUe1bKe5GAGG?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 90000 });",
  "await sleep(12000);",
  "const t = await page.evaluate(() => (document.body.innerText || '').replace(/\\n{2,}/g, '\\n'));",
  "console.log('TITLE:', (t.split('\\n').find((l) => /Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 70));",
  "console.log('ERRORS:');",
  "errors.forEach((e) => console.log(' ', e));",
  "await page.close();",
  "await gb.disconnect();",
  "process.exit(0);",
];
const body = lines.join('\n');
writeFileSync('tasks/tmp-qa-tdz-sm.mjs', '(async () => {\n' + body + '\n})().catch((e) => { console.error(\'FAIL:\', e.message); process.exit(1); });\n');
console.log('written');
