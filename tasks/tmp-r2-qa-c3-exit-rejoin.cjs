// R2 B8 part3 — PHIÊN MỚI: tạo session2, HS join, GV Chạy → navTo(11), exit ticket TRỌN VẸN
// (Đã làm được → Chèn tự đánh giá → 3 · Tự diễn đạt → gõ → Gửi), bắt "Tiến độ gửi · 1 HS",
// rồi E-b: HS rời (about:blank) → vào lại → kiểm phục hồi. Log: tmp-r2-qa-c-log-part3.json
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const ROW_RX = 'Lớp 11 · Tuần 11 · Tiết 76';
const NAME = 'Đặng Tuệ Minh';
const PIN = '2750';
const OUT = 'tasks/tmp-r2-qa-c-log-part3.json';
const LOG = { session: null, join: null, exitSend: null, rejoin: null };
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
async function hsLogin(hs) {
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      hasView: (document.body.innerText || '').includes('HỌC SINH'),
    }));
    if (st.hasView) return true;
    if (st.hasForm) {
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
      continue;
    }
    await sleep(2000);
  }
  return (await dump(hs)).includes('HỌC SINH');
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
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 600000 });

  // ===== 1) Tạo phiên mới =====
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 25; i++) {
    const ok = await gv.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return t.includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(t);
    });
    if (ok) break;
    await sleep(2000);
  }
  await gv.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(4000);
  let clicked = false;
  for (let i = 0; i < 10; i++) {
    clicked = await gv.evaluate((rx) => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => (r.innerText || '').includes(rx));
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    }, ROW_RX);
    if (clicked) break;
    await sleep(2000);
  }
  await sleep(3000);
  let classChosen = null;
  for (let i = 0; i < 12; i++) {
    classChosen = await gv.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return { error: 'no-select' };
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return { error: 'no-option', opts: Array.from(sel.options).map((o) => o.value + '=' + o.textContent.trim()) };
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: sel.value };
    }, CLASS_ID);
    if (classChosen && classChosen.ok) break;
    await sleep(2000);
  }
  console.log('Lớp chọn:', JSON.stringify(classChosen));
  if (!classChosen || !classChosen.ok) {
    const dlgText = await gv.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? (d.innerText || '').slice(0, 600) : '(không có dialog)';
    });
    console.log('Dialog text:', dlgText);
  }
  await sleep(1000);
  for (let i = 0; i < 10; i++) {
    const ok = await gv.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => (b.textContent || '').includes('Tạo phiên tiết trực tiếp') && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    sessionId = await gv.evaluate(() => {
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return m ? m[1] : null;
    });
    if (sessionId) break;
  }
  const links = await gv.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).map((a) => a.href).filter((v, i, a) => a.indexOf(v) === i));
  const s2 = {
    sessionId,
    tvControl: links.find((u) => u.includes('mode=tv-control')) || null,
    student: links.find((u) => u.includes('mode=student')) || null,
    savedAt: new Date().toISOString(),
  };
  LOG.session = s2;
  fs.writeFileSync('tasks/tmp-r2-qa-session2.json', JSON.stringify(s2, null, 1), 'utf8');
  console.log('SESSION 2:', sessionId, '| student link có joinCode:', /joinCode=R6RCFC/.test(s2.student || ''));
  if (!sessionId || !s2.tvControl || !s2.student) { fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); throw new Error('Không tạo được phiên mới'); }

  // GV vào Presenter
  await gv.goto(s2.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV presenter:', JSON.stringify(await gvInfo(gv)));

  // ===== 2) TV display (tab mới) =====
  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(s2.tvControl.replace('mode=tv-control', 'mode=tv'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  LOG.join = { tvText: (await dump(tv)).slice(0, 400) };

  // ===== 3) HS join (context riêng) =====
  const context = await browser.createBrowserContext();
  const hs = await context.newPage();
  await hs.setViewport({ width: 390, height: 844, isMobile: true });
  await hs.goto(s2.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const joined = await hsLogin(hs);
  console.log('HS joined:', joined);
  LOG.join.hsJoined = joined;
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-joined.png' });

  // ===== 4) GV Chạy → navTo(11) =====
  for (let i = 0; i < 5; i++) { if (await gvClick(gv, 'Chạy')) break; await sleep(2000); }
  await sleep(3000);
  const info11 = await navTo(gv, 11);
  console.log('GV @chặng 11:', JSON.stringify(info11));
  LOG.exitSend = { gvAt11: info11 };

  // ===== 5) Exit ticket trọn vẹn =====
  const ex = { hsBand: null, clickedRow: null, clickedInsert: null, openedTuDienDat: null, typed: null, clickedSend: false, status: [], gvProgress: null, tvProgress: null };
  await sleep(3000);
  const hsT0 = await dump(hs);
  ex.hsBand = (hsT0.match(/Chặng [\d–]+ phút/) || [null])[0];
  ex.clickedRow = await hsClick(hs, '^Đã làm được$');
  await sleep(1500);
  ex.clickedInsert = await hsClick(hs, 'Chèn tự đánh giá vào exit ticket');
  await sleep(2000);
  // mở "3 · Tự diễn đạt" nếu textarea chưa thấy
  const hasTa = await hs.evaluate(() => {
    const els = Array.from(document.querySelectorAll('textarea')).filter((e) => e.offsetParent !== null);
    return els.length > 0;
  });
  if (!hasTa) {
    ex.openedTuDienDat = await hsClick(hs, '3 · Tự diễn đạt');
    await sleep(2000);
  }
  ex.typed = await hsSetTextFirstVisible(hs, 'Em tính được x̄ = (Σ mᵢ·cᵢ)/n = 2,15 giờ và M_e = 2,2 giờ từ nhóm chứa n/2 = 20 là nhóm [2;3); căn cứ: cf = 5; 17; 32; 40.');
  console.log('Exit: row=' + ex.clickedRow + ' | insert=' + ex.clickedInsert + ' | typed=' + JSON.stringify(ex.typed));
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
  ex.gvProgress = (gvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.gvHas1HS = /1\s*\n?\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,40}1/.test(gvT);
  const tvT = await dump(tv);
  ex.tvProgress = (tvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.tvHas1HS = /1\s*\n?\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,40}1/.test(tvT);
  LOG.exitSend = { ...LOG.exitSend, ...ex };
  console.log('EXIT SEND:', JSON.stringify({ status: ex.status, gvProgress: ex.gvProgress, tvProgress: ex.tvProgress, gvHas1HS: ex.gvHas1HS, tvHas1HS: ex.tvHas1HS }));
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-sent.png' });
  await gv.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-gv.png' });
  await tv.screenshot({ path: 'tasks/tmp-r2-qa-p3-exit-tv.png' });

  // ===== 6) E-b: HS rời (about:blank) → vào lại =====
  await hs.goto('about:blank');
  await sleep(4000);
  await hs.goto(s2.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const relogged = await hsLogin(hs);
  await sleep(8000);
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
