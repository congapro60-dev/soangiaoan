// Reload phiên ypje (mới) — HS login + dump text đầy đủ + DOM slot
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1600 });
  const cdp = await hp.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/ypjeWpf8TPrTBIUx4LUN?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(12000);
  for (let i = 0; i < 10; i++) { if (await hp.evaluate(() => Boolean(document.querySelector('select')))) break; await sleep(2500); }
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => {
    const inp = document.querySelector('input[type="password"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
  await sleep(10000);
  const t = await text(hp);
  const idx = t.indexOf('Câu hỏi đã công bố');
  console.log('banner:', idx >= 0 ? '✓ ' + t.slice(idx, idx + 180).replace(/\n/g, ' | ') : '✗ không');
  const dom = await hp.evaluate(() => {
    const slot = document.querySelector('[data-slot="published-question"]');
    const sec = document.querySelector('.student-published-question');
    return { slot: Boolean(slot), sec: Boolean(sec), slotInner: slot ? slot.innerHTML.slice(0, 150) : '(none)' };
  });
  console.log('DOM:', JSON.stringify(dom));
  console.log('TEXT (700):', t.slice(0, 700).replace(/\n/g, ' | '));
  await hp.close(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
