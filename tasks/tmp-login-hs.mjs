import puppeteer from 'puppeteer';
import { setTimeout as sleep } from 'node:timers/promises';
const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
const hp = await hs.newPage();
await hp.setViewport({ width: 1000, height: 900 });
await hp.goto('https://giaoandewey.vercel.app/adaptive-live/sY4gRJSMS1h6v9eTy7A5?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
await sleep(8000);
await hp.evaluate(() => {
  const sel = document.querySelector('select');
  const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(600);
await hp.evaluate(() => {
  const inp = document.querySelector('input[placeholder="PIN"]');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(400);
await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
await sleep(8000);
const t = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
console.log('TITLE:', (t.split('\n').find((l) => /Tiết|Khoảng/.test(l)) || '').slice(0, 60));
console.log('TEXT (400):', t.slice(0, 400).replace(/\n/g, ' | '));
await hp.close();
await hs.disconnect();
process.exit(0);
