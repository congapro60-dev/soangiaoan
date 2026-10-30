// QA COMM-AQ-01 đầy đủ trong 1 phiên: giơ tay ✓ → hỏi ẩn danh ✓ → GV panel DOM dump → công bố → HS thấy → gỡ
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));

(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });
  const noCache = async (page) => {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  };

  // 1. Tạo phiên
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 1000 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
    if (tab) tab.click();
  });
  await sleep(6000);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const norm = (r) => (r.innerText || '').replace(/\s+/g, ' ');
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => {
        const t = norm(r);
        return t.indexOf('Các số đặc trưng đo xu thế trung tâm — Tiết 2') >= 0 && t.indexOf('Lớp 11') >= 0;
      });
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2500);
  }
  await sleep(4000);
  for (let i = 0; i < 15; i++) {
    const ok = await gvp.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, CLASS_ID);
    if (ok) break;
    await sleep(2000);
  }
  await sleep(1500);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').indexOf('Tạo phiên tiết trực tiếp') >= 0 && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null, studentLink = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const found = await gvp.evaluate(() => {
      const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.indexOf('mode=student') >= 0);
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return { link: a ? a.href : null, id: m ? m[1] : null };
    });
    if (found.id && found.link) { sessionId = found.id; studentLink = found.link; break; }
  }
  if (!sessionId) throw new Error('không tạo được phiên');
  console.log('SESSION:', sessionId);
  await gvp.close();

  // 2. GV tv-control
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  await noCache(gv2);
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);

  // 3. HS login + giơ tay + hỏi
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  await noCache(hp);
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
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
  console.log('HS vào live:', (await text(hp)).indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0 ? '✓' : '✗');

  const click = async (page, label) => page.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf(l) >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, label);

  await click(hp, 'Giơ tay');
  await sleep(4000);
  console.log('HS giơ tay:', (await text(hp)).indexOf('Đang giơ tay · Hạ tay') >= 0 ? '✓' : '✗');
  await sleep(3000);
  const gvHand = await text(gv2);
  console.log('GV thấy giơ tay:', gvHand.indexOf('1 bạn đang giơ tay') >= 0 && gvHand.indexOf('Đặng Tuệ Minh') >= 0 ? '✓ có tên' : '✗');

  await click(hp, 'Đặt câu hỏi ẩn danh');
  await sleep(1500);
  await hp.evaluate(() => {
    const ta = document.querySelector('.student-ask-input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, 'Vì sao phải nội suy trung vị từ nhóm chứa n/2?');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(800);
  await click(hp, 'Gửi câu hỏi');
  await sleep(7000);
  console.log('HS nhận xác nhận:', (await text(hp)).indexOf('Đã nhận câu hỏi ẩn danh') >= 0 ? '✓' : '✗');
  await sleep(4000);

  // 4. GV mở panel + dump DOM panel
  await click(gv2, 'Câu hỏi ẩn danh');
  await sleep(3000);
  const panelDom = await gv2.evaluate(() => {
    const panel = document.querySelector('.tv-questions');
    if (!panel) return { exists: false };
    return {
      exists: true,
      buttons: Array.from(panel.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 24), dis: b.disabled })),
      body: (panel.innerText || '').slice(0, 300).replace(/\n/g, ' | '),
    };
  });
  console.log('PANEL GV:', JSON.stringify(panelDom));

  // 5. Công bố
  await click(gv2, 'Công bố');
  await sleep(8000);
  const gvAfter = await text(gv2);
  const pi = gvAfter.indexOf('Câu hỏi ẩn danh');
  console.log('GV sau công bố:', gvAfter.slice(pi, pi + 240).replace(/\n/g, ' | '));

  // 6. HS thấy câu công bố
  await sleep(5000);
  const hsAfter = await text(hp);
  const pubIdx = hsAfter.indexOf('Câu hỏi đã công bố');
  console.log('HS thấy câu công bố:', pubIdx >= 0 && hsAfter.indexOf('nội suy trung vị') >= 0
    ? (hsAfter.slice(pubIdx, pubIdx + 240).indexOf('Đặng Tuệ Minh') < 0 ? '✓ có nội dung, KHÔNG có tên' : '✗ LỘ TÊN')
    : '✗ không thấy | HS: ' + hsAfter.slice(0, 200).replace(/\n/g, ' | '));

  // 7. REST kiểm doc publishedQuestions (public read khi active)
  await sleep(3000);
  const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + sessionId + '/publishedQuestions');
  const json = await res.json();
  const docs = json.documents || [];
  console.log('REST publishedQuestions:', res.status, '| docs:', docs.length, docs.length ? '| fields: ' + Object.keys(docs[0].fields || {}).join(', ') : '');
  console.log('doc có định danh?', docs.length && JSON.stringify(docs[0].fields || {}).match(/participantUid|studentName|deviceId/i) ? '✗ CÓ' : '✓ KHÔNG');

  await hp.screenshot({ path: 'tasks/tmp-qa-aq-hs.png', fullPage: true }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-qa-aq-gv.png', fullPage: true }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
