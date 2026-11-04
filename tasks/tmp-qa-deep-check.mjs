import puppeteer from 'puppeteer';
import { setTimeout as sleep } from 'node:timers/promises';
const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
const hp = await hs.newPage();
await hp.setViewport({ width: 1000, height: 900 });
const api = [];
page_loop: {
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/sY4gRJSMS1h6v9eTy7A5?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(8000);
  // login
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
  // dump text để xem có thẻ DEEP không (chặng nhóm còn đang chạy trên GV)
  const t = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TEXT (600):', t.slice(0, 600).replace(/\n/g, ' | '));
  console.log('R1:', t.includes('Nhóm em xong sớm') ? '✓' : '✗');
  break page_loop;
}
await hp.close(); await hs.disconnect(); process.exit(0);
