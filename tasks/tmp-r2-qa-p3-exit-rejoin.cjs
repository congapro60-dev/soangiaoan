// R2 part3c — phiên 2 (GV đang ở chặng 11): HS login ĐÚNG CÁCH (hasView = "VIỆC EM CẦN LÀM LÚC NÀY"),
// ép HS tiến theo broadcast (navTo 10 → 11), exit trọn vẹn, E-b rời/vào lại
const puppeteer = require('puppeteer');
const fs = require('fs');

const S2 = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session2.json', 'utf8'));
const OUT = 'tasks/tmp-r2-qa-c-log-part3.json';
const LOG = { session: S2.sessionId, join: null, exitSend: null, rejoin: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      plan: (t.match(/Kế hoạch [^·\n]+· tiết 40′/) || [])[0] || null,
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
// ĐÃ VÁ: form đăng nhập chứa "SMARTPLAN · HỌC SINH" nên hasView phải dùng marker của view đã login
async function hsLogin(hs) {
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => {
      const t = document.body.innerText || '';
      return {
        hasForm: t.includes('Chọn tên của em') && Boolean(document.querySelector('select')),
        hasView: t.includes('VIỆC EM CẦN LÀM LÚC NÀY') || /Đặng Tuệ Minh\s*·\s*11Columbus/.test(t),
      };
    });
    if (st.hasView) return true;
    if (st.hasForm) {
      const selOk = await hs.evaluate(() => {
        const sel = document.querySelector('select');
        if (!sel) return false;
        const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
        if (!opt) return false;
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }).catch(() => false);
      if (!selOk) { await sleep(1500); continue; }
      await sleep(500);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        if (!inp) return;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }).catch(() => {});
      await sleep(500);
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
        if (btn) btn.click();
      }).catch(() => {});
      await sleep(4000);
      continue;
    }
    await sleep(2000);
  }
  return (await dump(hs)).includes('VIỆC EM CẦN LÀM LÚC NÀY');
}
async function hsClick(hs, rx) {
  return hs.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const btn = Array.from(document.querySelectorAll('button')).find((b) => re.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 80); }
    return null;
  }, rx);
}
async function hsSetTextFirstVisible(hs, text) {
  return hs.evaluate((t) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN' && !e.disabled && !e.readOnly);
    if (!els.length) return { ok: false };
    const el = els[0];
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, tag: el.tagName, after: (el.value || '').slice(0, 120) };
  }, text);
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });

  // GV presenter (phiên 2 — đang chặng 11, running)
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S2.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV presenter:', JSON.stringify(await gvInfo(gv)));

  // TV display
  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S2.tvControl.replace('mode=tv-control', 'mode=tv'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  // HS join — login thật
  const context = await browser.createBrowserContext();
  const hs = await context.newPage();
  await hs.setViewport({ width: 390, height: 844, isMobile: true });
  await hs.goto(S2.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const joined = await hsLogin(hs);
  console.log('HS joined (thật):', joined);
  LOG.join = { hsJoined: joined };
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-joined.png' });

  // Ép HS tiến theo broadcast: navTo(10) rồi navTo(11) — HS nhận max(stage) nên sẽ leo lên 11
  const hsBand0 = ((await dump(hs)).match(/Chặng [\d–]+ phút/) || [null])[0];
  console.log('HS band sau login:', hsBand0);
  await navTo(gv, 10);
  const hsBand1 = ((await dump(hs)).match(/Chặng [\d–]+ phút/) || [null])[0];
  console.log('HS band sau navTo(10):', hsBand1);
  const info11 = await navTo(gv, 11);
  console.log('GV @11:', JSON.stringify(info11));
  await sleep(3000);
  const hsT0 = await dump(hs);
  const hsBand2 = (hsT0.match(/Chặng [\d–]+ phút/) || [null])[0];
  console.log('HS band @11:', hsBand2, '| thấy Chèn tự đánh giá:', /Chèn tự đánh giá/.test(hsT0));
  LOG.join.hsBand = { sauLogin: hsBand0, sauNav10: hsBand1, sauNav11: hsBand2 };

  // Exit trọn vẹn
  const ex = { gvAt11: info11, hsBand: hsBand2, clickedRow: null, clickedInsert: null, openedTuDienDat: null, typed: null, clickedSend: false, status: [], gvProgress: null, tvProgress: null };
  ex.clickedRow = await hsClick(hs, '^Đã làm được$');
  await sleep(1500);
  ex.clickedInsert = await hsClick(hs, 'Chèn tự đánh giá vào exit ticket');
  await sleep(2000);
  let hasTa = await hs.evaluate(() => Array.from(document.querySelectorAll('textarea')).some((e) => e.offsetParent !== null));
  if (!hasTa) {
    ex.openedTuDienDat = await hsClick(hs, '3 · Tự diễn đạt');
    await sleep(2000);
    hasTa = await hs.evaluate(() => Array.from(document.querySelectorAll('textarea')).some((e) => e.offsetParent !== null));
  }
  ex.textareaFound = hasTa;
  ex.typed = hasTa ? await hsSetTextFirstVisible(hs, 'Em tính được x̄ = (Σ mᵢ·cᵢ)/n = 2,15 giờ và M_e = 2,2 giờ từ nhóm chứa n/2 = 20 là nhóm [2;3); căn cứ: cf = 5; 17; 32; 40.') : { ok: false };
  console.log('Exit: row=' + ex.clickedRow + ' | insert=' + ex.clickedInsert + ' | mở3=' + ex.openedTuDienDat + ' | typed=' + JSON.stringify(ex.typed));
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-typed.png' });
  for (let i = 0; i < 14; i++) {
    ex.clickedSend = await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi/.test((b.textContent || '').trim()) && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (ex.clickedSend) break;
    await sleep(2500);
  }
  await sleep(4000);
  const hsT1 = await dump(hs);
  ex.status = (hsT1.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3);
  ex.hsAfter = hsT1.slice(0, 900);
  await sleep(3000);
  const gvT = await dump(gv);
  ex.gvProgress = (gvT.match(/Tiến độ gửi[\s\S]{0,60}?học sinh đã gửi/) || [null])[0];
  const tvT = await dump(tv);
  ex.tvProgress = (tvT.match(/Tiến độ gửi[\s\S]{0,60}?học sinh đã gửi/) || [null])[0];
  ex.tvHas1HS = /1\s*\n?\s*học sinh đã gửi/.test(tvT);
  LOG.exitSend = ex;
  console.log('EXIT SEND:', JSON.stringify({ status: ex.status, gvProgress: ex.gvProgress, tvProgress: ex.tvProgress, tvHas1HS: ex.tvHas1HS }));
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-sent.png' });
  await gv.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-gv.png' });
  await tv.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-tv.png' });

  // E-b: rời (about:blank) → vào lại
  await hs.goto('about:blank');
  await sleep(4000);
  await hs.goto(S2.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const relogged = await hsLogin(hs);
  await sleep(9000);
  const hsT2 = await dump(hs);
  LOG.rejoin = {
    relogged,
    band: (hsT2.match(/Chặng [\d–]+ phút/) || [null])[0],
    hasSentStatus: (hsT2.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3),
    nhapPanel: (hsT2.match(/Nháp[^\n]*/g) || []).slice(0, 3),
    excerpt: hsT2.slice(0, 1100),
  };
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-rejoin.png' });
  console.log('REJOIN:', JSON.stringify({ relogged, band: LOG.rejoin.band, hasSentStatus: LOG.rejoin.hasSentStatus, nhapPanel: LOG.rejoin.nhapPanel }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close();
  await tv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });
