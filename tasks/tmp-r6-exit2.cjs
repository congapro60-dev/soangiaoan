// Probe exit retry — GV nav về 11, HS đã chọn tuyến (probe7), thử lại luồng gửi exit
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = require('./tmp-r6-qa-session.json');
const MARKER = 'Em rút ra: R là đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu; tính Q1, Q3 theo ba bước lập cf — dò mốc n/4, 3n/4 — nội suy có nhân h; so sánh độ phân tán số đông dùng ΔQ.';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const gvInfo = () => gv.evaluate(() => { const t = document.body.innerText || ''; return { stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null, expired: t.includes('đã hết hạn') }; });
  let info = await gvInfo();
  console.log('GV:', JSON.stringify(info));
  if (info.expired) { console.log('EXPIRED'); process.exit(2); }
  // nav về 11
  let guard = 0;
  while (info.stage !== '11' && guard < 14) {
    const cur = Number(info.stage || 1);
    await gv.evaluate((back) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === (back ? '← Trước' : 'Sau →') && !x.disabled); if (b) b.click(); }, cur > 11);
    await sleep(2200);
    info = await gvInfo();
    guard++;
  }
  console.log('GV tại:', info.stage);
  await sleep(1500);

  const hs = await hb.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  for (let i = 0; i < 6; i++) {
    const hasForm = await hs.evaluate(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(600);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(4000);
  }
  const dump = async () => hs.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  // chờ think hết
  for (let i = 0; i < 20; i++) { const has = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => /^Chờ \d+s$/.test((b.textContent || '').trim()))); if (!has) break; await sleep(1500); }
  let t = await dump();
  console.log('BAND:', (t.match(/Chặng [\d–]+ phút/) || [null])[0]);
  // luồng gửi
  const click = async (rx) => hs.evaluate((p) => { const re = new RegExp(p); const b = Array.from(document.querySelectorAll('button')).find((x) => re.test((x.textContent || '').trim()) && x.offsetParent !== null && !x.disabled); if (b) { b.click(); return (b.textContent || '').trim().slice(0, 60); } return null; }, rx);
  console.log('row1:', await click('Đã làm được'));
  await sleep(1500);
  console.log('insert:', await click('Chèn tự đánh giá vào exit ticket'));
  await sleep(2000);
  let ins = await hs.evaluate(() => Array.from(document.querySelectorAll('textarea, input')).filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN').map((e) => ({ tag: e.tagName, ph: e.placeholder || '' })));
  console.log('inputs sau insert:', JSON.stringify(ins));
  if (!ins.length) { console.log('open 3·Tự diễn đạt:', await click('3 · Tự diễn đạt')); await sleep(2000); ins = await hs.evaluate(() => Array.from(document.querySelectorAll('textarea, input')).filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN').map((e) => ({ tag: e.tagName, ph: e.placeholder || '' }))); console.log('inputs sau mở thẻ:', JSON.stringify(ins)); }
  // gõ
  const typed = await hs.evaluate((m) => {
    const el = Array.from(document.querySelectorAll('textarea, input')).find((e) => e.offsetParent !== null && e.placeholder !== 'PIN' && !e.disabled && !e.readOnly);
    if (!el) return { ok: false };
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, m);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, tag: el.tagName };
  }, MARKER);
  console.log('typed:', JSON.stringify(typed));
  await sleep(1500);
  let sent = false;
  for (let i = 0; i < 12; i++) {
    sent = await hs.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /^Gửi/.test((x.textContent || '').trim()) && !x.disabled); if (b) { b.click(); return true; } return false; });
    if (sent) break;
    await sleep(2500);
  }
  await sleep(4000);
  t = await dump();
  console.log('status HS:', JSON.stringify((t.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3)));
  // GV hiện kết quả
  for (let i = 0; i < 6; i++) { await gv.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Hiện kết quả lớp' && !x.disabled); if (b) b.click(); }); await sleep(2000); }
  await sleep(2000);
  const gvT = await gv.evaluate(() => document.body.innerText || '');
  console.log('GV progress:', JSON.stringify((gvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0]));
  await hb.disconnect(); await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
