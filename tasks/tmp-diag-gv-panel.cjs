// Diagnose GV panel: dump nút + text khu presenterControls trên tv-control
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  const cdp = await gv2.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await gv2.goto('https://giaoandewey.vercel.app/adaptive-live/UixITQp4z7Yy8a0WpyjY?mode=tv-control&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(15000);
  const info = await gv2.evaluate(() => ({
    handRaise: (document.body.innerText || '').indexOf('giơ tay') >= 0,
    questions: (document.body.innerText || '').indexOf('Câu hỏi ẩn danh') >= 0,
    text: (document.body.innerText || '').split('\n\n').join('\n').slice(0, 600),
  }));
  console.log(JSON.stringify(info, null, 1).slice(0, 900));
  const errors = [];
  gv2.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await sleep(2000);
  console.log('errors:', errors.join(' || ') || '(không)');
  await gv2.close(); await gv.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
