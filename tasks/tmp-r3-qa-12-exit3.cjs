// R3 B8 exit2 — phiên hiện hành: chặng 6 route choice → 7 think dày → 11 exit gửi trọn → 12 Sau disabled
// Log: tasks/tmp-r3-qa-c-log-part-exit2.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SESSION_FILE = process.argv[2] || 'tasks/tmp-r3-qa-session4.json';
const OUT = process.argv[3] || 'tasks/tmp-r3-qa-c-log-part-exit3.json';
const S = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
const LOG = { sessionFile: SESSION_FILE, session: S.sessionId, join: null, gvOpen: null, routeChoice: null, s7: null, exit: null, sau: null, think: null };
const THINK = [];
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
  if (r) THINK.push({ at: new Date().toISOString().slice(11, 19), ...r });
  return r;
}
// poll dày ngay sau click GV: 600ms + 9 vòng × 700ms ≈ 7s/click, đủ bắt window 10s
async function thinkBurst(hs, rounds) {
  await sleep(600);
  for (let i = 0; i < (rounds || 9); i++) { await probeThink(hs); await sleep(700); }
}
async function navTo(gv, hs, target, burst) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 16 && !info.expired) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await thinkBurst(hs, 7);
    info = await gvInfo(gv);
    guard++;
  }
  if (burst) await thinkBurst(hs, 6);
  else await sleep(1500);
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
async function hsClick(hs, rx) {
  return hs.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const btn = Array.from(document.querySelectorAll('button')).find((b) => re.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 80); }
    return null;
  }, rx);
}
async function shot(page, path) {
  try { await page.screenshot({ path, timeout: 20000 }); return true; } catch (e) { return false; }
}
async function typeExit(hs, text) {
  return hs.evaluate((t) => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
    if (ta) {
      const proto = window.HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(ta, t);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, kind: 'textarea' };
    }
    const ce = Array.from(document.querySelectorAll('[contenteditable="true"], [contenteditable=true]')).find((e) => e.offsetParent !== null);
    if (ce) {
      ce.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, t);
      return { ok: true, kind: 'contenteditable' };
    }
    return { ok: false };
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
  console.log('GV mở:', JSON.stringify(LOG.gvOpen), '| sessionFile:', SESSION_FILE);
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

  // Đi thẳng tới chặng 11 (route/think đã ĐẠT trên part-exit2)
  const info11 = await navTo(gv, hs, 11, false);
  await sleep(2500);
  console.log('Chặng 11:', JSON.stringify(info11));

  // ===== Exit gửi trọn =====
  const ex = { hsBand: null, clickedRow: null, clickedInsert: null, openedTab: null, typed: null, clickedSend: false, status: [], gvProgress: null, tvProgress: null, gvHas1HS: null, tvHas1HS: null };
  const hsT11 = await dump(hs);
  ex.hsBand = (hsT11.match(/Chặng [\d–]+ phút/) || [null])[0];
  if (!hsT11.includes('Đã làm được')) { /* nút luôn bấm thử — đã chọn thì nút vắng, vô hại */ }
  ex.clickedRow = await hsClick(hs, '^Đã làm được$');
  await sleep(1500);
  ex.clickedInsert = await hsClick(hs, 'Chèn tự đánh giá vào exit ticket');
  await sleep(2000);
  // poll có field 8×1.5s; nếu trống → bấm tab Tự diễn đạt/Viết rồi gõ
  let hasField = false;
  for (let i = 0; i < 8 && !hasField; i++) {
    hasField = await hs.evaluate(() => (Array.from(document.querySelectorAll('textarea')).some((e) => e.offsetParent !== null && e.placeholder !== 'PIN') || Array.from(document.querySelectorAll('[contenteditable="true"]')).some((e) => e.offsetParent !== null)));
    if (!hasField) await sleep(1500);
  }
  if (!hasField) {
    ex.openedTab = await hsClick(hs, 'Tự diễn đạt|Viết');
    await sleep(2000);
  }
  const field = await typeExit(hs, EXIT_TEXT);
  ex.typed = field;
  console.log('Exit: row=' + ex.clickedRow + ' | insert=' + ex.clickedInsert + ' | tab=' + ex.openedTab + ' | typed=' + JSON.stringify(field));
  await shot(hs, 'tasks/tmp-r3-qa-c4-exit-typed.png');
  for (let i = 0; i < 14; i++) {
    ex.clickedSend = await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi/.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
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
  ex.gvProgress = (gvT.match(/Tiến độ gửi[^\n]*/) || [null])[0];
  ex.tvProgress = (tvT.match(/Tiến độ gửi[^\n]*/) || [null])[0];
  ex.gvHas1HS = /1\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,60}\b1\s*\/\s*1\b/.test(gvT);
  ex.tvHas1HS = /1\s*học sinh đã gửi|Tiến độ gửi[\s\S]{0,60}\b1\s*\/\s*1\b/.test(tvT);
  LOG.exit = { gv: gvT, tv: tvT, hs: hsT12, exit: ex };
  console.log('EXIT SEND:', JSON.stringify({ clicked: ex.clickedSend, status: ex.status, gvProgress: ex.gvProgress, tvProgress: ex.tvProgress, gvHas1HS: ex.gvHas1HS, tvHas1HS: ex.tvHas1HS }));
  await shot(hs, 'tasks/tmp-r3-qa-c5-exit-sent.png');
  await shot(gv, 'tasks/tmp-r3-qa-c5-exit-gv.png');
  await shot(tv, 'tasks/tmp-r3-qa-c5-exit-tv.png');

  // ===== Hiện kết quả lớp — xác nhận 1 HS đã gửi =====
  await sleep(1500);
  const clickedResult = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiện kết quả lớp' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  await sleep(3500);
  const panel = await dump(gv);
  LOG.resultPanel = {
    clicked: clickedResult,
    has1HS: /1\s*(học sinh|HS)|1\s*\/\s*1|Tuệ Minh/.test(panel),
    matches: (panel.match(/[^\n]*(học sinh đã gửi|1\/1|Tuệ Minh|đã gửi)[^\n]*/gi) || []).slice(0, 10),
    excerpt: panel.slice(0, 900),
  };
  await shot(gv, 'tasks/tmp-r3-qa-c5-ketqua-gv.png');
  console.log('KẾT QUẢ LỚP:', JSON.stringify({ clicked: clickedResult, has1HS: LOG.resultPanel.has1HS, matches: LOG.resultPanel.matches }));

  // ===== Chặng 12 — Sau: nút disabled =====
  const info12 = await navTo(gv, hs, 12, false);
  await sleep(2500);
  const sauBtn = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →');
    return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
  });
  const clickSauAttempt = await gvClick(gv, 'Sau →');
  await sleep(1500);
  const gvAfter = await gvInfo(gv);
  const gvAfterText = await dump(gv);
  LOG.sau = { info: info12, sauBtn, clickSauAttempt, stageAfterClick: gvAfter.stage, plan: gvAfter.plan, timer: gvAfter.timer, gv: gvAfterText };
  await shot(gv, 'tasks/tmp-r3-qa-c5-sau-gv.png');
  console.log('Chặng 12:', JSON.stringify(info12), '| sauBtn:', JSON.stringify(sauBtn), '| click attempt:', clickSauAttempt, '| stage sau click:', gvAfter.stage, '| plan:', gvAfter.plan, '| timer:', gvAfter.timer);

  const nums = THINK.map((r) => Number(r.text.match(/\d+/)[0]));
  LOG.think = {
    reads: THINK,
    count: THINK.length,
    decreasing: nums.length >= 2 && nums[nums.length - 1] < nums[0],
    lockedAll: THINK.every((r) => r.disabled === true),
  };
  console.log('THINK:', JSON.stringify({ count: LOG.think.count, nums, decreasing: LOG.think.decreasing, lockedAll: LOG.think.lockedAll }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });

