// Publish lại + bắt response API GV
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  const cdp = await gv2.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const apiCalls = [];
  gv2.on('response', async (res) => {
    if (res.url().includes('/api/classroom')) {
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch { body = '?'; }
      apiCalls.push(res.status() + ' ' + body);
    }
  });
  await gv2.goto('https://giaoandewey.vercel.app/adaptive-live/UixITQp4z7Yy8a0WpyjY?mode=tv-control&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(15000);
  const click = async (label) => gv2.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf(l) >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, label);
  await click('Câu hỏi ẩn danh');
  await sleep(2500);
  const pub = await click('Công bố');
  await sleep(8000);
  console.log('Công bố:', pub, '| API:', apiCalls.length ? apiCalls.join(' || ') : '(không gọi)');
  const t = await gv2.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  const i = t.indexOf('Câu hỏi ẩn danh');
  console.log('PANEL:', t.slice(i, i + 300).replace(/\n/g, ' | '));
  await gv2.close(); await gv.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
