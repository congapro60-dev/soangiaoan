const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1000, height: 900 });
  // 1) Đăng nhập lớp qua /lop
  await hp.goto('https://giaoandewey.vercel.app/lop/R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(8000);
  const hasSel = await hp.evaluate(() => Boolean(document.querySelector('select')));
  console.log('/lop có select:', hasSel);
  if (hasSel) {
    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(600);
    await hp.evaluate(() => {
      const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().includes('PIN'));
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(600);
    await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Vào lớp|Đăng nhập|Xác nhận/.test((x.textContent || '').trim()) && !x.disabled); if (b) b.click(); });
    await sleep(8000);
  }
  // 2) Vào live session
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/sY4gRJSMS1h6v9eTy7A5?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const t = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('R1 THẺ DEEP:', t.includes('Nhóm em xong sớm') ? '✓ HIỆN' : '✗ không thấy');
  console.log('R1 Đề VD:', (t.split('\n').find((l) => /mức VD|vận dụng/.test(l)) || '').slice(0, 100));
  console.log('TEXT (300):', t.slice(0, 300).replace(/\n/g, ' | '));
  await hp.close(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
