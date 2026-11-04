// Dùng lại trang HS đang mở (không login lại) + GV mở panel công bố + kiểm HS realtime
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const pagesHs = await hs.pages();
  const hp = pagesHs[pagesHs.length - 1];
  console.log('HS trang dùng lại:', (await text(hp)).slice(0, 80).replace(/\n/g, ' | '));
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  const cdp = await gv2.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await gv2.goto('https://giaoandewey.vercel.app/adaptive-live/4Qlzlj1NgUWi1eOlJFOQ?mode=tv-control&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(15000);
  const click = async (page, label) => page.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf(l) >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, label);
  // dump trạng thái panel trước
  const before = await gv2.evaluate(() => {
    const panel = document.querySelector('.tv-questions');
    return panel ? (panel.innerText || '').slice(0, 260).replace(/\n/g, ' | ') : '(không có panel)';
  });
  console.log('panel trước:', before);
  const toggled = await click(gv2, 'Câu hỏi ẩn danh');
  await sleep(3000);
  const pub = await click(gv2, 'Công bố');
  await sleep(8000);
  const after = await text(gv2);
  const pi = after.indexOf('Câu hỏi ẩn danh');
  console.log('toggle:', toggled, '| công bố:', pub, '| panel:', after.slice(pi, pi + 260).replace(/\n/g, ' | '));
  // HS realtime
  await sleep(5000);
  const hsText = await text(hp);
  const idx = hsText.indexOf('Câu hỏi đã công bố');
  console.log('HS thấy banner:', idx >= 0 ? hsText.slice(idx, idx + 200).replace(/\n/g, ' | ') : '✗ không');
  // REST xác nhận doc
  const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/4Qlzlj1NgUWi1eOlJFOQ/publishedQuestions');
  const json = await res.json();
  const docs = json.documents || [];
  console.log('REST publishedQuestions:', res.status, '| docs:', docs.length, docs.length ? '| fields: ' + Object.keys(docs[0].fields || {}).join(', ') : '');
  await gv2.close();
  await gv.disconnect(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
