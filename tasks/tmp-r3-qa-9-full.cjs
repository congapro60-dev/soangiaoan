// R3 B8 full sweep (phiên 3 uhPPt02TXSVwLXoAaCMV) — chặng 5→12 trọn vẹn 1 nhịp
// Join ổn định (view giữ ≥6s) → 5 AI-error → 6 route → 7 think → 8–9 spoiler → 10 Burj → 11 exit → 12 Sau
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-qa-session3.json', 'utf8'));
const OUT = 'tasks/tmp-r3-qa-c-log-part-full.json';
const LOG = { session: S.sessionId, join: null, s4: null, s5: null, routeChoice: null, s6: null, s7: null, s8: null, s9: null, s10: null, sau: null, think: null, tvButtons: null };
const THINK = [];
const SPOILER_RX = { s75: '7,5(?!\\d)', cm12: '12 cm' };
const BURJ = ['mômen', 'gãy đổ', 'mất cân bằng', 'chịu lực'];
const EXIT_TEXT = 'Em rút ra: muốn kết luận hai đường thẳng song song từ hai mặt phẳng song song, phải thêm điều kiện hai đường cùng thuộc một mặt phẳng thứ ba; khi đó áp dụng định lý Thales không gian.';

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      plan: (t.match(/Kế hoạch [\d–\-′']+ · tiết 40′/) || [])[0] || (t.match(/Kế hoạch[^\n]*/) || [])[0] || null,
      timer: (t.match(/\n(\d{1,2}:\d{2})\n/) || [])[1] || null,
      status: t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null,
      expired: t.includes('đã hết hạn'),
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
async function probeThink(hs) {
  const r = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Chờ \d+s$/.test((b.textContent || '').trim()));
    if (!btn) return null;
    return { text: (btn.textContent || '').trim(), disabled: btn.disabled };
  });
  THINK.push({ at: new Date().toISOString().slice(11, 19), ...(r || { text: null, disabled: null }) });
  return r;
}
async function navTo(gv, hs, target, deepThink) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 16 && !info.expired) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await sleep(1800);
    await probeThink(hs);
    await sleep(900);
    info = await gvInfo(gv);
    guard++;
  }
  if (deepThink) { for (let i = 0; i < 10; i++) { await probeThink(hs); await sleep(1000); } }
  else { await sleep(2000); }
  return info;
}
async function hsState(hs) {
  return hs.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      hasForm: t.includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      view: !t.includes('Vào tiết học trực tiếp') && t.includes('HỌC SINH'),
      inLesson: /ĐANG HỌC|Chặng \d+\/12|TẠM DỪNG/.test(t),
      band: (t.match(/Chặng [\d–]+ phút/) || [null])[0],
    };
  });
}
async function hsJoinStable(hs) {
  for (let round = 0; round < 6; round++) {
    // login nếu đang form
    for (let i = 0; i < 10; i++) {
      const st = await hsState(hs);
      if (!st.hasForm) break;
      await hs.evaluate(() => {
        const sel = document.querySelector('select');
        const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(800);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(600);
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
        if (btn) btn.click();
      });
      await sleep(4000);
    }
    // xác minh ổn định: view giữ 6s, form không quay lại
    let stable = true;
    for (let i = 0; i < 3; i++) {
      await sleep(2000);
      const st = await hsState(hs);
      if (st.hasForm || !st.view) { stable = false; break; }
    }
    if (stable) return 'view-stable';
  }
  return 'lost';
}
async function snap(gv, hs, tv, key, prefix) {
  LOG[key] = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv) };
  await gv.screenshot({ path: `tasks/${prefix}-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/${prefix}-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/${prefix}-${key}-tv.png` });
}
async function spoilerView(text) {
  const out = {};
  for (const [k, rx] of Object.entries(SPOILER_RX)) out[k] = new RegExp(rx).test(text);
  return out;
}
function burjCheck(g, t, h) {
  return {
    gv: Object.fromEntries(BURJ.map((w) => [w, g.includes(w)])),
    tv: Object.fromEntries(BURJ.map((w) => [w, t.includes(w)])),
    hs: Object.fromEntries(BURJ.map((w) => [w, h.includes(w)])),
    daoCheo: { gv: g.includes('đảo chéo'), tv: t.includes('đảo chéo'), hs: h.includes('đảo chéo') },
  };
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
    return { ok: true, tag: el.tagName };
  }, text);
}

(async () => {
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

  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  const gvOpen = await gvInfo(gv);
  console.log('GV mở:', JSON.stringify(gvOpen));
  if (gvOpen.expired) throw new Error('Phiên 3 đã hết hạn — cần tạo phiên 4');

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.join = await hsJoinStable(hs);
  console.log('HS join:', LOG.join);
  if (LOG.join !== 'view-stable') throw new Error('HS join không ổn định');

  // ===== Chặng 5 — S4 AI-error (lùi về từ 9) =====
  const info5 = await navTo(gv, hs, 5, true);
  await sleep(2000);
  await snap(gv, hs, tv, 's4', 'tmp-r3-qa-c2d');
  const h4 = LOG.s4.hs;
  LOG.s4.check = {
    hsBand: (h4.match(/Chặng [\d–]+ phút/) || [null])[0],
    hsHasAI: h4.includes('AI kết luận'),
    hsHasEq: h4.includes('a ⊂ (α)'),
    hsNoTran: !h4.includes('trần'),
    hsNoPhanViDu: !h4.includes('Phản ví dụ'),
    tvHasAI: LOG.s4.tv.includes('AI kết luận'),
    tvNoTran: !LOG.s4.tv.includes('trần'),
    tvNoPhanViDu: !LOG.s4.tv.includes('Phản ví dụ'),
    gvPublicOnly: !LOG.s4.gv.includes('trần') && !LOG.s4.gv.includes('Phản ví dụ'),
  };
  console.log('Chặng 5:', JSON.stringify(info5), '| S4 CHECK:', JSON.stringify(LOG.s4.check));

  // ===== Chặng 6 — S5 route M/S/C =====
  const info6 = await navTo(gv, hs, 6, false);
  await sleep(2000);
  const hsT6 = await dump(hs);
  await snap(gv, hs, tv, 's5', 'tmp-r3-qa-c2d');
  LOG.s5.hasDenLuotSau = hsT6.includes('đến lượt sau');
  LOG.s5.routeButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => /^(M|S|C)\b|Củng cố|Chuẩn|Thử thách/.test(t)).slice(0, 12));
  console.log('Chặng 6:', JSON.stringify(info6), '| route buttons:', JSON.stringify(LOG.s5.routeButtons), '| đến lượt sau:', LOG.s5.hasDenLuotSau);
  const clickedRoute = await hsClick(hs, '^S\\b|Chuẩn');
  await sleep(4000);
  LOG.routeChoice = { clicked: clickedRoute, after: (await dump(hs)).slice(0, 900) };
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c2d-route-s5.png' });
  console.log('Đã chọn tuyến:', clickedRoute);

  // ===== Chặng 7 — S6 Thales + think window =====
  const info7 = await navTo(gv, hs, 7, true);
  await sleep(2000);
  await snap(gv, hs, tv, 's6', 'tmp-r3-qa-c2d');
  LOG.s6.spoiler = { hs: await spoilerView(LOG.s6.hs), tv: await spoilerView(LOG.s6.tv), gv: await spoilerView(LOG.s6.gv) };
  LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
  console.log('Chặng 7:', JSON.stringify(info7), '| TV buttons:', JSON.stringify(LOG.tvButtons));

  // ===== Chặng 8 + 9 — S7/S8 đề PHT no-spoiler =====
  for (const [target, key] of [[8, 's7'], [9, 's8']]) {
    const info = await navTo(gv, hs, target, false);
    await sleep(2500);
    await snap(gv, hs, tv, key, 'tmp-r3-qa-c2d');
    LOG[key].spoiler = { hs: await spoilerView(LOG[key].hs), tv: await spoilerView(LOG[key].tv), gv: await spoilerView(LOG[key].gv) };
    LOG[key].burj = burjCheck(LOG[key].gv, LOG[key].tv, LOG[key].hs);
    console.log('Chặng ' + target + ':', JSON.stringify(info), '| spoiler hs:', JSON.stringify(LOG[key].spoiler.hs), '| tv:', JSON.stringify(LOG[key].spoiler.tv));
  }
  // ===== Chặng 10 — S9 ĐGTX + Burj =====
  const info10 = await navTo(gv, hs, 10, true);
  await sleep(2500);
  await snap(gv, hs, tv, 's9', 'tmp-r3-qa-c3');
  LOG.s9.burj = burjCheck(LOG.s9.gv, LOG.s9.tv, LOG.s9.hs);
  LOG.s9.spoiler = { hs: await spoilerView(LOG.s9.hs), tv: await spoilerView(LOG.s9.tv) };
  console.log('Chặng 10:', JSON.stringify(info10), '| BURJ:', JSON.stringify(LOG.s9.burj));

  // ===== Chặng 11 — S10 exit ticket (trống chặn + gửi trọn) =====
  const info11 = await navTo(gv, hs, 11, false);
  await sleep(3000);
  const ex = { hsBand: null, emptyClick: null, emptyStatus: null, clickedRow: null, clickedInsert: null, openedTuDienDat: null, typed: null, clickedSend: false, status: [], gvProgress: null, tvProgress: null, gvHas1HS: null, tvHas1HS: null };
  const hsT11 = await dump(hs);
  ex.hsBand = (hsT11.match(/Chặng [\d–]+ phút/) || [null])[0];
  // (1) Gửi khi trống — phải bị chặn
  const emptyBtn = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi/.test((b.textContent || '').trim()) && b.offsetParent !== null);
    return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
  });
  if (emptyBtn.exists && !emptyBtn.disabled) {
    await hsClick(hs, '^Gửi');
    await sleep(3000);
  }
  const hsAfterEmpty = await dump(hs);
  ex.emptyClick = emptyBtn;
  ex.emptyStatus = (hsAfterEmpty.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 2);
  ex.emptyBlocked = !emptyBtn.exists || emptyBtn.disabled || ex.emptyStatus.length === 0;
  console.log('Exit trống:', JSON.stringify({ btn: emptyBtn, status: ex.emptyStatus, blocked: ex.emptyBlocked }));
  // (2) Gửi trọn vẹn
  ex.clickedRow = await hsClick(hs, '^Đã làm được$');
  await sleep(1500);
  ex.clickedInsert = await hsClick(hs, 'Chèn tự đánh giá vào exit ticket');
  await sleep(2000);
  const hasTa = await hs.evaluate(() => Array.from(document.querySelectorAll('textarea')).some((e) => e.offsetParent !== null));
  if (!hasTa) {
    ex.openedTuDienDat = await hsClick(hs, '3 · Tự diễn đạt');
    await sleep(2000);
  }
  ex.typed = await hsSetTextFirstVisible(hs, EXIT_TEXT);
  console.log('Exit: row=' + ex.clickedRow + ' | insert=' + ex.clickedInsert + ' | typed=' + JSON.stringify(ex.typed));
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c3-exit-typed.png' });
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
  const hsT12 = await dump(hs);
  ex.status = (hsT12.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3);
  await sleep(3000);
  const gvT = await dump(gv);
  const tvT = await dump(tv);
  ex.gvProgress = (gvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.tvProgress = (tvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.gvHas1HS = /1\s*\n?\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,40}\b1\b/.test(gvT);
  ex.tvHas1HS = /1\s*\n?\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,40}\b1\b/.test(tvT);
  LOG.s10 = { info: info11, gv: gvT, tv: tvT, hs: hsT12, exit: ex };
  console.log('EXIT SEND:', JSON.stringify({ status: ex.status, gvProgress: ex.gvProgress, tvProgress: ex.tvProgress, gvHas1HS: ex.gvHas1HS, tvHas1HS: ex.tvHas1HS }));
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c3-exit-sent.png' });
  await gv.screenshot({ path: 'tasks/tmp-r3-qa-c3-exit-gv.png' });
  await tv.screenshot({ path: 'tasks/tmp-r3-qa-c3-exit-tv.png' });

  // ===== Chặng 12 — Sau: nút Sau → disabled =====
  const info12 = await navTo(gv, hs, 12, false);
  await sleep(2500);
  const sauBtn = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →');
    return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
  });
  const clickSauAttempt = await gvClick(gv, 'Sau →');
  await sleep(1500);
  const gvAfter = await gvInfo(gv);
  LOG.sau = { info: info12, sauBtn, clickSauAttempt, stageAfterClick: gvAfter.stage, gv: await dump(gv) };
  await gv.screenshot({ path: 'tasks/tmp-r3-qa-c3-sau-gv.png' });
  console.log('Chặng 12:', JSON.stringify(info12), '| sauBtn:', JSON.stringify(sauBtn), '| click attempt:', clickSauAttempt, '| stage sau click:', gvAfter.stage);

  const nums = THINK.filter((r) => r.text && /^Chờ \d+s$/.test(r.text)).map((r) => Number(r.text.match(/\d+/)[0]));
  LOG.think = {
    reads: THINK.filter((r) => r.text),
    decreasing: nums.length >= 2 && nums[nums.length - 1] < nums[0],
    lockedAll: THINK.filter((r) => r.text).every((r) => r.disabled === true),
  };
  console.log('THINK:', JSON.stringify({ reads: LOG.think.reads, decreasing: LOG.think.decreasing, lockedAll: LOG.think.lockedAll }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });


