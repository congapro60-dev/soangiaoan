// QA công bố câu hỏi ẩn danh: GV mở panel → Công bố → HS thấy câu (không tên) → GV gỡ
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  const cdp = await gv2.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await gv2.goto('https://giaoandewey.vercel.app/adaptive-live/UixITQp4z7Yy8a0WpyjY?mode=tv-control&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(15000);
  const click = async (page, label) => page.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf(l) >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, label);
  // 1. mở panel
  const toggled = await click(gv2, 'Câu hỏi ẩn danh');
  await sleep(2500);
  // 2. Công bố
  const pub = await click(gv2, 'Công bố');
  await sleep(7000);
  const gvText = await text(gv2);
  console.log('GV mở panel:', toggled, '| Công bố:', pub, '| trạng thái "đã công bố":', gvText.indexOf('đã công bố') >= 0 ? '✓' : '✗');
  // 3. HS thấy câu công bố
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  const cdp2 = await hp.target().createCDPSession();
  await cdp2.send('Network.enable');
  await cdp2.send('Network.setCacheDisabled', { cacheDisabled: true });
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/UixITQp4z7Yy8a0WpyjY?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(12000);
  const hsText = await text(hp);
  const pubIdx = hsText.indexOf('Câu hỏi đã công bố');
  const published = pubIdx >= 0 && hsText.indexOf('nội suy trung vị') >= 0;
  const noName = published ? !hsText.slice(pubIdx, pubIdx + 220).includes('Đặng Tuệ Minh') : false;
  console.log('HS thấy câu công bố:', published ? (noName ? '✓ nội dung có, KHÔNG có tên' : '✗ LỘ TÊN') : '✗ không thấy');
  // 4. GV gỡ khỏi TV
  const unpublish = await click(gv2, 'Gỡ khỏi TV');
  await sleep(7000);
  const hsText2 = await text(hp);
  console.log('GV gỡ khỏi TV:', unpublish ? (hsText2.indexOf('Câu hỏi đã công bố') < 0 ? '✓ HS không còn thấy' : '✗ vẫn còn') : '✗');
  await gv2.screenshot({ path: 'tasks/tmp-qa-aq-gv.png', fullPage: true }).catch(() => {});
  await hp.screenshot({ path: 'tasks/tmp-qa-aq-hs.png', fullPage: true }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
