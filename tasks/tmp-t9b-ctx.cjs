// T9b — ngữ cảnh "nửa khoảng" trên màn HS chặng 5
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = require('./tmp-t9b-session.json');
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const gvInfo = () => gv.evaluate(() => { const t = document.body.innerText || ''; return { stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null, expired: t.includes('đã hết hạn') }; });
  let info = await gvInfo();
  let guard = 0;
  while (info.stage !== '5' && guard < 14 && !info.expired) {
    const cur = Number(info.stage || 1);
    await gv.evaluate((back) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === (back ? '← Trước' : 'Sau →') && !x.disabled); if (b) b.click(); }, cur > 5);
    await sleep(2200);
    info = await gvInfo();
    guard++;
  }
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
  for (let i = 0; i < 20; i++) { const has = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => /^Chờ \d+s$/.test((b.textContent || '').trim()))); if (!has) break; await sleep(1500); }
  const t = await hs.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  let i = -1, n = 0;
  while ((i = t.indexOf('nửa khoảng', i + 1)) !== -1) {
    n++;
    console.log('CTX' + n + ': …' + t.slice(Math.max(0, i - 170), i + 130).replace(/\n/g, ' | ') + '…');
  }
  console.log('total nửa khoảng:', n);
  for (const tok of ['90; 120', '90;120', '[60; 90)', '[60;90)']) console.log(tok + ' => ' + t.includes(tok));
  await hb.disconnect(); await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
