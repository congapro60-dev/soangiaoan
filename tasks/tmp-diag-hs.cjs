// Chẩn đoán nhanh: mở trang HS phiên vừa tạo, bắt pageerror + console error
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  const errors = [];
  hp.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
  hp.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 300)); });
  const cdp = await hp.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/lYyYSkHqCHPMZA0jISua?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(15000);
  const t = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  console.log('TEXT (300):', t.slice(0, 300).replace(/\n/g, ' | '));
  console.log('select:', await hp.evaluate(() => Boolean(document.querySelector('select'))));
  console.log('ERRORS:', errors.length ? errors.slice(0, 5).join(' || ') : '(không)');
  await hp.close(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
