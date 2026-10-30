// Debug DOM trang login HS trong live
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 900 });
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/Kgc1PLytxI3iZYKrzKya?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  const info = await hp.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map((s) => ({
      id: s.id, name: s.name, aria: s.getAttribute('aria-label'), opts: s.options.length,
      first3: Array.from(s.options).slice(0, 3).map((o) => o.textContent.trim()),
    }));
    const inputs = Array.from(document.querySelectorAll('input')).map((i) => ({ type: i.type, ph: i.placeholder, aria: i.getAttribute('aria-label') }));
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim(), dis: b.disabled }));
    return { selects, inputs, buttons };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 2500));
  await hp.close(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
