// So sánh 2 URL portal + kiểm bundle index
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await gb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  for (const [label, url] of [
    ['ĐƯỜNG CŨ /adaptive-portal/:id', APP + '/adaptive-portal/adaptive-1792833009074'],
    ['ĐƯỜNG MỚI /library/:lessonId', APP + '/adaptive-portal/library/adaptive-1792833009074'],
  ]) {
    await page.goto(url + '?cb=' + Date.now(), { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(9000);
    const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
    console.log('== ' + label + ' ==');
    console.log('TITLE:', (t.split('\n').find((l) => /— Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 90));
    console.log('notice học lại:', t.includes('Chế độ học lại') ? '✓' : '✗');
  }
  // Kiểm bundle index hiện tại có chứa route library
  const html = await (await fetch(APP + '/?cb=' + Date.now())).text();
  const idx = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  console.log('INDEX:', idx);
  const js = await (await fetch(APP + '/' + idx)).text();
  console.log('route library/:lessonId trong bundle:', js.includes('library/:lessonId') || js.includes('/adaptive-library') ? '✓' : '✗');
  await page.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
