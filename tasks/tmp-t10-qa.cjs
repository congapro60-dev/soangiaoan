// R3 fix2 re-QA — phiên sau republish Production (fix2: binding theo PHASE)
// Kiểm: bands 12/12 Gate D 78 + S4 HS interactive (PHẢN HỒI NHANH + 4 nhãn + AI kết luận, KHÔNG lộ proof)
//  + route choice chặng 6 ("Chọn nhiệm vụ này") + think window + spoiler chặng 7–9
//  + exit chặng 11 (trống chặn → gửi trọn → GV "Hiện kết quả lớp" → "Tiến độ gửi · 1 HS") + chặng 12 Sau disabled
// Log: tasks/tmp-t10-qa-rea-log.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SESSION_FILE = process.argv[2] || 'tasks/tmp-t10-session.json';
const OUT = process.argv[3] || 'tasks/tmp-t10-qa-log.json';
const S = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
const LOG = { sessionFile: SESSION_FILE, session: S.sessionId, gvOpen: null, join: null, bands: [], s4: null, route: null, s6: null, s7: null, s8: null, exit: null, sau: null, think: null, tvButtons: null };
const THINK = [];
const SPOILER_RX = { am: '±3', can3: 'căn bậc hai số học' };
const EXIT_TEXT = 'Em rút ra: s là căn bậc hai số học nên không âm; khi chia mẫu n−1 là độ lệch chuẩn hiệu chỉnh sx khác σx; Casio chỉ là công cụ kiểm tra, lập bảng là gốc.';

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      band: (t.match(/Chặng [\d–]+ phút/) || [])[0] || null,
      plan: (t.match(/Kế hoạch[^\n]*/) || [])[0] || null,
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
  if (r) THINK.push({ at: new Date().toISOString().slice(11, 19), ...r });
  return r;
}
async function thinkBurst(hs, rounds) {
  await sleep(600);
  for (let i = 0; i < (rounds || 9); i++) { await probeThink(hs); await sleep(700); }
}
async function navTo(gv, hs, target) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 16 && !info.expired) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await thinkBurst(hs, 7);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(1500);
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
    for (let i = 0; i < 10; i++) {
      const st = await hsState(hs);
      if (!st.hasForm) break;
      await hs.evaluate(() => {
        const sel = document.querySelector('select');
        const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Lò Mai Phương Chi');
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(800);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '7859');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(600);
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
        if (btn) btn.click();
      });
      await sleep(4000);
    }
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
async function shot(page, path) {
  try { await page.screenshot({ path, timeout: 20000 }); return true; } catch (e) { return false; }
}
async function spoilerView(text) {
  const out = {};
  for (const [k, rx] of Object.entries(SPOILER_RX)) out[k] = new RegExp(rx).test(text);
  return out;
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
async function hsButtons(hs) {
  return hs.evaluate(() => Array.from(document.querySelectorAll('button'))
    .map((b) => (b.textContent || '').trim())
    .filter((t) => t && t.length < 60)
    .slice(0, 20));
}
(async () => {
  let hsBrowser = null;
  try {
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
    console.log('Edge 9223: sống');
  } catch (e) {
    console.log('Edge 9223 chết — mở lại');
    execSync('Start-Process "msedge.exe" -ArgumentList "--remote-debugging-port=9223","--user-data-dir=C:\\\\Users\\\\ADMIN\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\edge-hs-profile","--no-first-run","--window-size=1000,900"', { shell: 'powershell.exe' });
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
  LOG.gvOpen = await gvInfo(gv);
  console.log('GV mở:', JSON.stringify(LOG.gvOpen));
  if (LOG.gvOpen.expired) { console.log('EXPIRED-NEED-NEW-SESSION'); process.exit(2); }

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

  if (LOG.gvOpen.status === 'waiting') {
    for (let i = 0; i < 6; i++) { if (await gvClick(gv, 'Chạy')) break; await sleep(2000); }
    await sleep(3000);
  }
  // ===== Quét 11 chặng — dải phút GV/HS + kiểm đặt biệt tại 5/6/7/8/9 =====
  for (let target = 1; target <= 11; target++) {
    const info = await navTo(gv, hs, target);
    const hsT = await hsState(hs);
    LOG.bands.push({ stage: info.stage, gvBand: info.band, hsBand: hsT.band, plan: info.plan });
    console.log('Chặng ' + target + ':', JSON.stringify({ gv: info.band, hs: hsT.band }));

    if (target === 5) {
      await sleep(1500);
      const hsT5 = await dump(hs);
      const tvT5 = await dump(tv);
      const gvT5 = await dump(gv);
      LOG.s4 = {
        gvBand: (gvT5.match(/Chặng [\d–]+ phút/) || [null])[0],
        hsBand: (hsT5.match(/Chặng [\d–]+ phút/) || [null])[0],
        tvBand: (tvT5.match(/Chặng [\d–]+ phút/) || [null])[0],
        hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('±3'),
        tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('±3'),
        hsHasPhanHoiNhanh: hsT5.includes('PHẢN HỒI NHANH'),
        hsHas4Nhan: ['Hiểu sai khái niệm', 'Sai biến đổi hoặc tính toán', 'Sai lập luận', 'Thiếu điều kiện'].every((x) => hsT5.includes(x)),
        hsNoProof: !hsT5.includes('căn bậc hai số học') && !hsT5.includes('s = 3.'),
        tvNoProof: !tvT5.includes('căn bậc hai số học') && !tvT5.includes('s = 3.'),
        hsButtons: await hsButtons(hs),
        hsExcerpt: hsT5.slice(0, 900),
      };
      await shot(hs, 'tasks/tmp-t10-qa-s4-hs.png');
      await shot(tv, 'tasks/tmp-t10-qa-s4-tv.png');
      await shot(gv, 'tasks/tmp-t10-qa-s4-gv.png');
      console.log('S4:', JSON.stringify({ gvBand: LOG.s4.gvBand, hsAi: LOG.s4.hsHasAiKetLuan, hsPHN: LOG.s4.hsHasPhanHoiNhanh, hs4Nhan: LOG.s4.hsHas4Nhan, tvAi: LOG.s4.tvHasAiKetLuan, hsNoProof: LOG.s4.hsNoProof, tvNoProof: LOG.s4.tvNoProof }));
    }

    if (target === 6) {
      await sleep(1500);
      const hsT6 = await dump(hs);
      LOG.route = {
        gvBand: info.band,
        hsBand: hsT.band,
        hasDenLuotSau: hsT6.includes('đến lượt sau'),
        buttons: await hsButtons(hs),
      };
      console.log('Chặng 6 route buttons:', JSON.stringify(LOG.route.buttons), '| đến lượt sau:', LOG.route.hasDenLuotSau);
      await shot(hs, 'tasks/tmp-t10-qa-route-before.png');
      const clicked = await hsClick(hs, '^Chọn nhiệm vụ này$');
      await sleep(4000);
      LOG.route.clicked = clicked;
      LOG.route.after = (await dump(hs)).slice(0, 900);
      await shot(hs, 'tasks/tmp-t10-qa-route-after.png');
      console.log('Đã chọn tuyến:', clicked);
    }

    if (target === 7 || target === 8 || target === 9) {
      await sleep(1000);
      const key = 's' + target;
      LOG[key] = { hs: await dump(hs), tv: await dump(tv), gv: await dump(gv) };
      LOG[key].spoiler = { hs: await spoilerView(LOG[key].hs), tv: await spoilerView(LOG[key].tv), gv: await spoilerView(LOG[key].gv) };
      if (target === 7) LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
      LOG.s7.casioHS = { has: LOG.s7.hs.includes('Casio fx-580VN X'), sigma: LOG.s7.hs.includes('0,89443'), menu: LOG.s7.hs.includes('MENU'), freq: LOG.s7.hs.includes('Freq'), steps4: (LOG.s7.hs.match(/student-casio-step|Máy tính của em/g) || []).length > 0 };
      LOG.s7.casioTv = { has: LOG.s7.tv.includes('Casio fx-580VN X'), sigma: LOG.s7.tv.includes('0,89443') };
      LOG.s7.numbers = { x9: LOG.s7.hs.includes('9') || LOG.s7.gv.includes('9'), an08: LOG.s7.gv.includes('0,8'), binh28: LOG.s7.gv.includes('2,8'), sigmaFull: LOG.s7.hs.includes('0,89443') };
      await shot(hs, 'tasks/tmp-t10-qa-' + key + '-hs.png');
      console.log('Chặng ' + target + ' spoiler hs:', JSON.stringify(LOG[key].spoiler.hs), '| tv:', JSON.stringify(LOG[key].spoiler.tv));
    }
  }
  // ===== Chặng 11 — exit ticket (trống chặn + gửi trọn + Hiện kết quả lớp) =====
  await sleep(2000);
  const ex = { hsBand: null, emptyBtn: null, emptyStatus: null, emptyBlocked: null, clickedRow: null, clickedInsert: null, openedTuDienDat: null, typed: null, clickedSend: false, status: [], hienKetQua: null, gvProgress: null, tvProgress: null, gvHas1HS: null, tvHas1HS: null };
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
  ex.emptyBtn = emptyBtn;
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
  await shot(hs, 'tasks/tmp-t10-qa-exit-typed.png');
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
  await shot(hs, 'tasks/tmp-t10-qa-exit-sent.png');
  console.log('Exit gửi xong, status HS:', JSON.stringify(ex.status));
  // (3) GV mở "Hiện kết quả lớp" rồi mới đọc "Tiến độ gửi"
  for (let i = 0; i < 6; i++) { if (await gvClick(gv, 'Hiện kết quả lớp')) break; await sleep(2000); }
  ex.hienKetQua = true;
  await sleep(3500);
  const gvT = await dump(gv);
  const tvT = await dump(tv);
  ex.gvProgress = (gvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.tvProgress = (tvT.match(/Tiến độ gửi[^\n]*(?:\n[^\n]*){0,2}/) || [null])[0];
  ex.gvHas1HS = /Tiến độ gửi[\s\S]{0,60}\b1\b/.test(gvT);
  ex.tvHas1HS = /Tiến độ gửi[\s\S]{0,60}\b1\b/.test(tvT);
  LOG.exit = ex;
  await shot(gv, 'tasks/tmp-t10-qa-exit-gv.png');
  await shot(tv, 'tasks/tmp-t10-qa-exit-tv.png');
  console.log('EXIT SEND:', JSON.stringify({ status: ex.status, gvProgress: ex.gvProgress, tvProgress: ex.tvProgress, gvHas1HS: ex.gvHas1HS, tvHas1HS: ex.tvHas1HS }));
  // ===== Chặng 12 — Sau disabled =====
  const info12 = await navTo(gv, hs, 12);
  await sleep(2500);
  const sauBtn = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →');
    return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
  });
  const clickSauAttempt = await gvClick(gv, 'Sau →');
  await sleep(1500);
  const gvAfter = await gvInfo(gv);
  const hsT = await hsState(hs);
  LOG.sau = { info: info12, sauBtn, clickSauAttempt, stageAfterClick: gvAfter.stage, gvBand: (await dump(gv)).match(/Chặng [\d–]+ phút/)?.[0] || null, plan: info12.plan, hsBand: hsT.band };
  await shot(gv, 'tasks/tmp-t10-qa-sau-gv.png');
  console.log('Chặng 12:', JSON.stringify({ band: LOG.sau.gvBand, sauBtn, clickAttempt: clickSauAttempt, stageAfter: gvAfter.stage, plan: LOG.sau.plan }));

  // ===== Tổng hợp think — decreasing đo trong MỘT cửa sổ (reset khi thấy 'Chờ 10s') =====
  const valid = THINK.filter((r) => r.text && /^Chờ \d+s$/.test(r.text));
  const windows = [];
  let cur = [];
  for (const r of valid) {
    if (r.text === 'Chờ 10s') { if (cur.length) windows.push(cur); cur = [r]; }
    else cur.push(r);
  }
  if (cur.length) windows.push(cur);
  const nums = valid.map((r) => Number(r.text.match(/\d+/)[0]));
  LOG.think = {
    reads: THINK.length,
    validReads: valid.length,
    samples: THINK.slice(0, 30),
    saw10: THINK.some((r) => r.text === 'Chờ 10s'),
    minSeen: nums.length ? Math.min(...nums) : null,
    lockedAll: valid.length ? valid.every((r) => r.disabled) : null,
    windows: windows.map((w) => {
      const wn = w.map((r) => Number(r.text.match(/\d+/)[0]));
      return { reads: w.length, minSeen: Math.min(...wn), decreasing: wn.every((n, i) => i === 0 || n <= wn[i - 1]), lockedAll: w.every((r) => r.disabled) };
    }),
  };
  console.log('THINK:', JSON.stringify({ reads: LOG.think.reads, validReads: LOG.think.validReads, saw10: LOG.think.saw10, minSeen: LOG.think.minSeen, lockedAll: LOG.think.lockedAll, windows: LOG.think.windows.length }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => {
  fs.writeFileSync(OUT.replace('.json', '-fail.json'), JSON.stringify({ LOG, error: e.message, stack: e.stack }, null, 1), 'utf8');
  console.error('FAIL:', e.message);
  process.exit(1);
});
