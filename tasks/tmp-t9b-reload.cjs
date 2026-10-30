// R4 — reload-test nháp giữ + tự rejoin (bài 11-11-79, chặng 5 = 12–15 phút, AI-error "MN ∥ AB")
// Sửa 3 lỗi phương pháp của vòng cũ: (1) chờ HS ĐÚNG band chặng 5 + thấy 'Nam' trước khi gõ;
// (2) sau reload chờ lại ĐÚNG band + 'Nam' trước khi check; (3) ghi stage THẬT của GV, không hardcode.
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-t9b-session.json', 'utf8'));
const GV_URL = S.tvControl;
const HS_URL = S.student;
const MARKER = 'Nháp T9B — kiểm tra lưu 28/10';
const LOG = { sessionId: S.sessionId, marker: MARKER };

async function dump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    const stage = (t.match(/Chặng (\d+)\/12/) || [])[1] || null;
    const status = t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null;
    return { stage, status };
  });
}

(async () => {
  // Preflight Edge 9223 — mở lại nếu chết
  let hsBrowser = null;
  try {
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
    console.log('Edge 9223: sống');
  } catch (e) {
    console.log('Edge 9223 chết — mở lại');
    execSync('Start-Process "msedge.exe" -ArgumentList "--remote-debugging-port=9223","--user-data-dir=C:\\Users\\ADMIN\\AppData\\Local\\Temp\\opencode\\edge-hs-profile","--no-first-run","--window-size=1000,900"', { shell: 'powershell.exe' });
    await sleep(7000);
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  }

  // GV trên 9222
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const gvBrowser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gvBrowser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(GV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV mở:', JSON.stringify(await gvInfo(gv)));

  // HS join
  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  let joined = 'lost';
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
    }));
    if (!st.hasForm) { joined = 'view'; break; }
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(4000);
  }
  LOG.hsJoin = joined;
  console.log('HS join:', joined);

  // Chạy tiết
  let started = false;
  for (let i = 0; i < 6; i++) {
    started = await gvClick(gv, 'Chạy');
    if (started) break;
    await sleep(2000);
  }
  await sleep(3000);
  LOG.gvStarted = { started, ...(await gvInfo(gv)) };
  console.log('Chạy:', started, JSON.stringify(LOG.gvStarted));

  // Nav GV tới chặng 5
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== '5' && guard < 8) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < 5 ? 'Sau →' : '← Trước');
    await sleep(2800);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(2500);
  LOG.gvAtS4 = info;
  console.log('GV tại:', JSON.stringify(info));

  // Chờ HS thấy band chặng 5 + 'Nam'
  let hsReady = false;
  for (let i = 0; i < 15; i++) {
    const t = await dump(hs);
    if (t.includes('Chặng 16–19 phút') && t.includes('Internet')) { hsReady = true; break; }
    await sleep(2000);
  }
  LOG.hsReadyBefore = hsReady;
  console.log('HS sẵn sàng (band 16–19 + Nam):', hsReady);
  await hs.screenshot({ path: 'tasks/tmp-t9b-reload-before.png' });

  if (hsReady) {
    // Mở tab Tự diễn đạt và gõ nháp
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
      if (btn) btn.click();
    });
    await sleep(2000);
    LOG.typed = await hs.evaluate((m) => {
      const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
      const el = els[0];
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, m);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, MARKER);
    await sleep(5000);
    const before = await dump(hs);
    LOG.bandBefore = (before.match(/Chặng [\d–]+ phút/) || [null])[0];

    // Reload + chờ re-login
    await hs.reload({ waitUntil: 'domcontentloaded' });
    await sleep(12000);
    let relogged = 'lost';
    for (let i = 0; i < 10; i++) {
      const t = await dump(hs);
      if (!t.includes('Vào tiết học trực tiếp') && t.includes('HỌC SINH')) { relogged = 'view'; break; }
      if (t.includes('Vào tiết học trực tiếp')) {
        await hs.evaluate(() => {
          const sel = document.querySelector('select');
          if (!sel) return;
          const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          setter.call(sel, opt.value);
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await sleep(500);
        await hs.evaluate(() => {
          const inp = document.querySelector('input[placeholder="PIN"]');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inp, '2750');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(500);
        await hs.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
          if (btn) btn.click();
        });
        await sleep(4000);
      }
      await sleep(1500);
    }
    LOG.relogged = relogged;
    console.log('HS re-login:', relogged);

    // Chờ lại ĐÚNG band + Nam rồi mới check
    let ready2 = false;
    for (let i = 0; i < 15; i++) {
      const t = await dump(hs);
      if (t.includes('Chặng 16–19 phút') && t.includes('Internet')) { ready2 = true; break; }
      await sleep(2000);
    }
    LOG.hsReadyAfter = ready2;
    console.log('HS lại sẵn sàng sau reload:', ready2);

    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
      if (btn) btn.click();
    });
    await sleep(2500);
    const after = await dump(hs);
    LOG.bandAfter = (after.match(/Chặng [\d–]+ phút/) || [null])[0];
    LOG.aiErrorStill = after.includes('Internet');
    LOG.kept = after.includes('Nháp R4');
    LOG.keptInField = await hs.evaluate((m) => {
      const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
      return els.some((e) => (e.value || '').includes(m));
    }, MARKER);
    LOG.nhapPanel = after.includes('Nháp đã lưu trên máy');
    await hs.screenshot({ path: 'tasks/tmp-t9b-reload-after.png' });
    console.log('== KẾT QUẢ ==', JSON.stringify({ kept: LOG.kept, keptInField: LOG.keptInField, bandAfter: LOG.bandAfter, aiErrorStill: LOG.aiErrorStill, nhapPanel: LOG.nhapPanel }));
    // Đoạn text quanh marker nếu thấy
    const i = after.indexOf('Nháp R4');
    if (i >= 0) console.log('CTX:', after.slice(Math.max(0, i - 120), i + 160).replace(/\n/g, ' | '));
  }

  fs.writeFileSync('tasks/tmp-t9b-reload.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-t9b-reload.json');
  await gv.close().catch(() => {});
  await hs.close().catch(() => {});
  gvBrowser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
