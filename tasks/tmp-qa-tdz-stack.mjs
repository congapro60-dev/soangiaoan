// Đọc stack TDZ đầy đủ trên preview local (dist production) với phiên live thật
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
const page = await gb.newPage();
await page.setViewport({ width: 1000, height: 900 });
const errors = [];
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err && err.stack || err).slice(0, 800)));
page.on('console', (msg) => { const s = msg.text(); if (/Cannot access|ReferenceError|Error:/i.test(s)) errors.push('CONSOLE: ' + s.slice(0, 400)); });
// Phiên live đang chạy wPXE (11-11-76) — mở theo link student thật
await page.goto('https://giaoandewey.vercel.app/adaptive-live/wPXEqrWTZUe1bKe5GAGG?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC'.replace('giaoandewey.vercel.app', 'localhost:4174'), { waitUntil: 'domcontentloaded', timeout: 90000 });
await sleep(12000);
// GV nav về chặng 7 qua trang GV production (không cần — chỉ cần HS ở chặng nhóm)
const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
console.log('TITLE:', (t.split('\n').find((l) => /Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 70));
console.log('ERRORS:');
errors.forEach((e) => console.log(' ', e));
await page.close();
await gb.disconnect();
process.exit(0);
