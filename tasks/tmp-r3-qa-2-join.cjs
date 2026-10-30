// R3 B8 sweep 1 — GV mở presenter + TV + HS join thật (Edge 9223) → Chạy → navTo(5)
// S4: AI-error trần/ký hiệu + think window + E: nháp marker + reload + relogin giữ nháp
// Log: tasks/tmp-r3-qa-c-log-part1.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-qa-session.json', 'utf8'));
const NAME = 'Đặng Tuệ Minh';
const PIN = '2750';
const MARKER = 'Nháp R3 — kiểm tra lưu 27/10';
const OUT = 'tasks/tmp-r3-qa-c-log-part1.json';
const LOG = { session: S.sessionId, join: {}, s5: {}, think: {}, draft: {} };

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      status: t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null,
    };
  });
}
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}
async function navTo(gv, target) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 14) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await sleep(2600);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(2500);
  return info;
}
async function hsLogin(hs) {
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
    }));
    if (!st.hasForm) return 'view';
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(4000);
  }
  return 'lost';
}
async function hsWaitBand(hs, band, token, tries) {
  for (let i = 0; i < (tries || 15); i++) {
    const t = await dump(hs);
    if (t.includes(band) && t.includes(token)) return true;
    await sleep(2000);
  }
  return false;
}

(async () => {
  // Preflight Edge 9223 (HS)
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

  // GV + TV trên Edge 9222
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  LOG.gvOpen = await gvInfo(gv);
  console.log('GV mở:', JSON.stringify(LOG.gvOpen));

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  LOG.tvLobby = (await dump(tv)).slice(0, 300);
  console.log('TV mở (300 ký tự đầu):', LOG.tvLobby.replace(/\n/g, ' | '));

  // HS join
  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.join.hs = await hsLogin(hs);
  console.log('HS join:', LOG.join.hs, '(view = không còn form Vào tiết học trực tiếp)');
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c1-joined.png' });

  // GV Chạy
  let started = false;
  for (let i = 0; i < 6; i++) { started = await gvClick(gv, 'Chạy'); if (started) break; await sleep(2000); }
  await sleep(3000);
  LOG.gvStarted = { started, ...(await gvInfo(gv)) };
  console.log('Chạy:', started, JSON.stringify(LOG.gvStarted));

  // navTo chặng 5 (S4)
  const info5 = await navTo(gv, 5);
  LOG.gvAt5 = info5;
  console.log('GV tại chặng 5:', JSON.stringify(info5));

  const hsReady = await hsWaitBand(hs, 'Chặng 11–14 phút', 'AI kết luận');
  LOG.s5.hsReady = hsReady;
  console.log('HS thấy band 11–14 + AI kết luận:', hsReady);

  // Snap 3 view
  await sleep(2000);
  const g5 = await dump(gv); const t5 = await dump(tv); const h5 = await dump(hs);
  LOG.s5.gv = g5; LOG.s5.tv = t5; LOG.s5.hs = h5;
  LOG.s5.check = {
    hsHasAI: h5.includes('AI kết luận'),
    hsHasEq: h5.includes('a ⊂ (α)'),
    hsNoTran: !h5.includes('trần'),
    hsNoPhanViDu: !h5.includes('Phản ví dụ'),
    tvHasAI: t5.includes('AI kết luận'),
    tvNoTran: !t5.includes('trần'),
    tvNoPhanViDu: !t5.includes('Phản ví dụ'),
    gvHasTran: g5.includes('trần') || g5.includes('Phản ví dụ'),
    gvHasGamma: g5.includes('(γ)'),
    casio: { gv: g5.includes('Casio'), tv: t5.includes('Casio'), hs: h5.includes('Casio') },
  };
  console.log('S4 CHECK:', JSON.stringify(LOG.s5.check));
  await gv.screenshot({ path: 'tasks/tmp-r3-qa-c1-s5-gv.png' });
  await tv.screenshot({ path: 'tasks/tmp-r3-qa-c1-s5-tv.png' });
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c1-s5-hs.png' });

  // Think window: đọc nút "Chờ Ns" trên HS 4 nhịp
  LOG.think.reads = [];
  for (let i = 0; i < 4; i++) {
    const r = await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Chờ \d+s$/.test((b.textContent || '').trim()));
      if (!btn) return null;
      return { text: (btn.textContent || '').trim(), disabled: btn.disabled };
    });
    LOG.think.reads.push(r);
    await sleep(1600);
  }
  const nums = LOG.think.reads.filter(Boolean).map((r) => Number(r.text.match(/\d+/)[0]));
  LOG.think.decreasing = nums.length >= 2 && nums[nums.length - 1] < nums[0];
  LOG.think.lockedWhileWaiting = LOG.think.reads.filter(Boolean).every((r) => r.disabled);
  console.log('THINK:', JSON.stringify({ reads: LOG.think.reads, decreasing: LOG.think.decreasing, locked: LOG.think.lockedWhileWaiting }));

  // E: nháp + reload
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
    if (btn) btn.click();
  });
  await sleep(2000);
  LOG.draft.typed = await hs.evaluate((m) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
    const el = els[0];
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, m);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, MARKER);
  await sleep(5000);
  const before = await dump(hs);
  LOG.draft.bandBefore = (before.match(/Chặng [\d–]+ phút/) || [null])[0];
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c1-draft-before.png' });

  await hs.reload({ waitUntil: 'domcontentloaded' });
  await sleep(12000);
  LOG.draft.relogged = await hsLogin(hs);
  const ready2 = await hsWaitBand(hs, 'Chặng 11–14 phút', 'AI kết luận');
  LOG.draft.hsReadyAfter = ready2;
  console.log('Sau reload: relogin =', LOG.draft.relogged, '| lại thấy band+AI:', ready2);

  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
    if (btn) btn.click();
  });
  await sleep(2500);
  const after = await dump(hs);
  LOG.draft.bandAfter = (after.match(/Chặng [\d–]+ phút/) || [null])[0];
  LOG.draft.aiErrorStill = after.includes('AI kết luận');
  LOG.draft.keptInField = await hs.evaluate((m) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
    return els.some((e) => (e.value || '').includes(m));
  }, MARKER);
  LOG.draft.nhapPanel = after.includes('Nháp đã lưu trên máy');
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c1-draft-after.png' });
  console.log('DRAFT:', JSON.stringify({ typed: LOG.draft.typed, keptInField: LOG.draft.keptInField, nhapPanel: LOG.draft.nhapPanel, bandAfter: LOG.draft.bandAfter }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });
