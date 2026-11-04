// Kiểm phiên Uix còn sống không
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const p = await gv.newPage();
  await p.setViewport({ width: 1440, height: 1000 });
  await p.goto('https://giaoandewey.vercel.app/adaptive-live/UixITQp4z7Yy8a0WpyjY?mode=tv-control&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(12000);
  console.log((await p.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'))).slice(0, 260).replace(/\n/g, ' | '));
  await p.close(); await gv.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
