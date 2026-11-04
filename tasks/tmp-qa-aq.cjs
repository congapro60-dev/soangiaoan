// QA live COMM-AQ-01: phiên mới → HS login → giơ tay + gửi câu hỏi ẩn danh →
// GV thấy hàng đợi + panel câu hỏi → GV công bố → HS/TV thấy câu công bố → HS chọn pulse.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';

const connect = async (port) => puppeteer.connect({
  browserWSEndpoint: (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).webSocketDebuggerUrl,
  defaultViewport: null, protocolTimeout: 300000,
});
const noCache = async (page) => {
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
};
const text = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
const click = async (page, t, exact) => page.evaluate((tt, ex) => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => {
    const label = (x.textContent || '').trim();
    return (ex ? label === tt : label.indexOf(tt) >= 0) && !x.disabled;
  });
  if (b) { b.click(); return true; }
  return false;
}, t, Boolean(exact));

(async () => {
  const gv = await connect(9222);
  const hs = await connect(9223);

  // ---------- 1. Tạo phiên ----------
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 1000 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
    if (tab) tab.click();
  });
  await sleep(6000);
  let opened = false;
  for (let i = 0; i < 12; i++) {
    opened = await gvp.evaluate(() => {
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
    if (opened) break;
    await sleep(2500);
  }
  if (!opened) throw new Error('không mở được hàng 11-11-76');
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

  // GV mở tv-control (lobby — HS giơ tay được ngay, không cần chạy tiết)
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  await noCache(gv2);
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);

  // ---------- 2. HS login ----------
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
  const inLive = (await text(hp)).indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0;
  console.log('HS vào live:', inLive ? '✓' : '✗');

  // ---------- 3. HS giơ tay ----------
  const raised = await click(hp, 'Giơ tay', false);
  await sleep(4000);
  const hsText = await text(hp);
  const handState = hsText.indexOf('Đang giơ tay · Hạ tay') >= 0;
  console.log('HS giơ tay:', raised ? (handState ? '✓ nút chuyển "Đang giơ tay · Hạ tay"' : '✗ nút không đổi') : '✗ không bấm được');
  await sleep(3000);
  const gvText1 = await text(gv2);
  const gvHand = gvText1.indexOf('1 bạn đang giơ tay') >= 0 && gvText1.indexOf('Đặng Tuệ Minh') >= 0;
  console.log('GV thấy hàng đợi có tên:', gvHand ? '✓ "1 bạn đang giơ tay — Đặng Tuệ Minh"' : '✗ không thấy');

  // ---------- 4. HS hạ tay ----------
  const lowered = await click(hp, 'Hạ tay', false);
  await sleep(4000);
  const gvText2 = await text(gv2);
  console.log('HS hạ tay:', lowered ? (gvText2.indexOf('bạn đang giơ tay') < 0 ? '✓ GV không còn thấy' : '✗ GV vẫn thấy') : '✗');
  await sleep(1000);
  await click(hp, 'Giơ tay', false); // giơ lại để test panel
  await sleep(3000);

  // ---------- 5. HS gửi câu hỏi ẩn danh ----------
  const askOpen = await click(hp, 'Đặt câu hỏi ẩn danh', false);
  await sleep(1500);
  await hp.evaluate(() => {
    const ta = document.querySelector('#anon-question-input') || document.querySelector('.student-ask-input');
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, 'Thầy ơi, vì sao phải nội suy trung vị từ nhóm chứa n/2 ạ?');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(800);
  const sent = await click(hp, 'Gửi câu hỏi', false);
  await sleep(6000);
  const hsText2 = await text(hp);
  const acked = hsText2.indexOf('Đã nhận câu hỏi ẩn danh') >= 0;
  console.log('HS gửi câu hỏi ẩn danh:', askOpen && sent ? (acked ? '✓ có xác nhận "Đã nhận câu hỏi ẩn danh"' : '✗ không thấy xác nhận') : '✗ không gửi được');

  // ---------- 6. GV thấy câu hỏi + công bố ----------
  await sleep(3000);
  let gvText3 = await text(gv2);
  let gvQ = gvText3.indexOf('Câu hỏi ẩn danh (1)') >= 0 && gvText3.indexOf('nội suy trung vị') >= 0;
  console.log('GV thấy câu hỏi trong panel:', gvQ ? '✓' : '✗');
  if (!gvQ) {
    // thử bấm mở panel nếu đang thu gọn với nhãn khác
    gvText3 = await text(gv2);
    gvQ = gvText3.indexOf('nội suy trung vị') >= 0;
    console.log('  kiểm lại theo nội dung:', gvQ ? '✓' : '✗ | GV TEXT: ' + gvText3.slice(0, 300).replace(/\n/g, ' | '));
  }
  const pub = await click(gv2, 'Công bố', true);
  await sleep(6000);
  const gvText4 = await text(gv2);
  console.log('GV bấm Công bố:', pub ? '✓' : '✗');

  // ---------- 7. HS thấy câu đã công bố (không có tên) ----------
  await sleep(5000);
  const hsText3 = await text(hp);
  const published = hsText3.indexOf('Câu hỏi đã công bố') >= 0 && hsText3.indexOf('nội suy trung vị') >= 0;
  const noName = hsText3.indexOf('Câu hỏi đã công bố') >= 0
    ? !hsText3.slice(hsText3.indexOf('Câu hỏi đã công bố'), hsText3.indexOf('Câu hỏi đã công bố') + 200).includes('Đặng Tuệ Minh')
    : false;
  console.log('HS thấy câu đã công bố:', published ? (noName ? '✓ nội dung có, KHÔNG có tên' : '✗ lộ tên!') : '✗ không thấy');

  // ---------- 8. Pulse (cần vào chặng P20/P27 — GV nav) ----------
  const gvClick = async (label) => click(gv2, label, true);
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(4000);
  const stage = () => gv2.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? Number(m[1]) : 0; });
  let cur = await stage();
  for (let i = 0; i < 20 && cur < 7; i++) { await gvClick('Sau →'); await sleep(4000); cur = await stage(); }
  console.log('GV tới chặng:', cur);
  await sleep(8000);
  const hsText4 = await text(hp);
  const pulseShown = hsText4.indexOf('Em hiểu bài đến đâu?') >= 0;
  console.log('HS thấy Understanding Pulse:', pulseShown ? '✓' : '✗');
  if (pulseShown) {
    await click(hp, 'Em hiểu một phần, cần thêm ví dụ.', true);
    await sleep(4000);
    const hsText5 = await text(hp);
    console.log('HS chọn pulse:', hsText5.indexOf('Đặt câu hỏi ẩn danh') >= 0 ? '✓ (nút hỏi vẫn hoạt động trên pulse)' : '—');
  }

  await hp.screenshot({ path: 'tasks/tmp-qa-aq-hs.png', fullPage: true }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-qa-aq-gv.png', fullPage: true }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
