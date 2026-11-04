// Publish lần 2 + kiểm qua REST + HS reload đọc banner (kiểm listener lẫn persistence)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const SID = '4Qlzlj1NgUWi1eOlJFOQ';
  const link = 'https://giaoandewey.vercel.app/adaptive-live/' + SID + '?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
  const noCache = async (page) => {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  };
  const click = async (page, label) => page.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf(l) >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, label);

  // 1. HS login + gửi câu 2
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  await noCache(hp);
  await hp.goto(link, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(10000);
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
  await click(hp, 'Đặt câu hỏi ẩn danh');
  await sleep(1500);
  await hp.evaluate(() => {
    const ta = document.querySelector('.student-ask-input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, 'Em chưa rõ bước lập bảng tần số ghép nhóm ạ.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(600);
  await click(hp, 'Gửi câu hỏi');
  await sleep(7000);
  console.log('HS gửi câu 2:', (await text(hp)).indexOf('Đã nhận câu hỏi ẩn danh') >= 0 ? '✓' : '✗');

  // 2. GV công bố câu 2
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  await noCache(gv2);
  await gv2.goto(link.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(12000);
  await click(gv2, 'Câu hỏi ẩn danh');
  await sleep(2500);
  const pub = await click(gv2, 'Công bố');
  await sleep(8000);

  // 3. REST kiểm doc published (public read khi active)
  const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + SID + '/publishedQuestions');
  const json = await res.json();
  const docs = json.documents || [];
  console.log('GV công bố:', pub ? 'bấm ✓' : '✗', '| REST publishedQuestions:', res.status, '| số doc:', docs.length);
  if (docs.length) {
    const fields = docs[0].fields || {};
    console.log('trường doc:', Object.keys(fields).join(', '));
    console.log('có định danh?', JSON.stringify(fields).match(/participantUid|studentName|uid|device/i) ? '✗ CÓ' : '✓ KHÔNG (chỉ questionId/activityId/body/publishedAt)');
  }

  // 4. HS giữ nguyên trang (listener) — kiểm banner realtime
  await sleep(5000);
  const live = await text(hp);
  const liveIdx = live.indexOf('Câu hỏi đã công bố');
  console.log('HS listener thấy banner:', liveIdx >= 0 && live.indexOf('lập bảng tần số') >= 0 ? '✓ realtime' : '✗ không');

  // 5. HS reload — banner vẫn có (persistence)
  await hp.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
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
  const after = await text(hp);
  const idx = after.indexOf('Câu hỏi đã công bố');
  console.log('HS reload thấy banner:', idx >= 0 && after.indexOf('lập bảng tần số') >= 0 ? '✓ persistence' : '✗ không');
  if (idx >= 0) console.log('banner:', after.slice(idx, idx + 160).replace(/\n/g, ' | '));
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
