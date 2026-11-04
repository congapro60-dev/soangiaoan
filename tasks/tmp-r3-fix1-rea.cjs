// R3 fix1 re-QA — phiên mới sau republish: 12 dải phút Gate D 78 + smoke S4 + think + Sau disabled
// Log: tasks/tmp-r3-fix1-rea-log.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SESSION_FILE = process.argv[2] || 'tasks/tmp-r3-fix1-session.json';
const OUT = process.argv[3] || 'tasks/tmp-r3-fix1-rea-log.json';
const S = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
const LOG = { sessionFile: SESSION_FILE, session: S.sessionId, gvOpen: null, join: null, bands: [], s4: null, sau: null, think: null };
const THINK = [];

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
async function shot(page, path) {
  try { await page.screenshot({ path, timeout: 20000 }); return true; } catch (e) { return false; }
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

  // ===== Quét 11 chặng — ghi dải phút GV mỗi chặng =====
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
        hsHasAiKetLuan: hsT5.includes('AI kết luận') && hsT5.includes('a ⊂ (α)'),
        tvHasAiKetLuan: tvT5.includes('AI kết luận') && tvT5.includes('a ⊂ (α)'),
        hsNoProof: !hsT5.includes('Phản ví dụ gốc') && !hsT5.includes('trần'),
        tvNoProof: !tvT5.includes('Phản ví dụ gốc') && !tvT5.includes('trần'),
        hsHas4Nhan: ['Hiểu sai khái niệm', 'Sai biến đổi hoặc tính toán', 'Sai lập luận', 'Thiếu điều kiện'].every((x) => hsT5.includes(x)),
        hsExcerpt: hsT5.slice(0, 700),
      };
      await shot(hs, 'tasks/tmp-r3-fix1-s4-hs.png');
      await shot(tv, 'tasks/tmp-r3-fix1-s4-tv.png');
      await shot(gv, 'tasks/tmp-r3-fix1-s4-gv.png');
      console.log('S4:', JSON.stringify({ gvBand: LOG.s4.gvBand, hsAiKetLuan: LOG.s4.hsHasAiKetLuan, tvAiKetLuan: LOG.s4.tvHasAiKetLuan, hsNoProof: LOG.s4.hsNoProof, tvNoProof: LOG.s4.tvNoProof, hs4Nhan: LOG.s4.hsHas4Nhan }));
    }
  }

  // ===== Chặng 12 — Sau disabled =====
  const info12 = await navTo(gv, hs, 12);
  await sleep(2500);
  const sauBtn = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →');
    return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
  });
  const gvT12 = await dump(gv);
  const hsT12 = await hsState(hs);
  LOG.sau = { info: info12, sauBtn, gvBand: (gvT12.match(/Chặng [\d–]+ phút/) || [null])[0], plan: info12.plan, timer: (gvT12.match(/\n(\d{1,2}:\d{2})\n/) || [])[1] || null, hsBand: hsT12.band };
  await shot(gv, 'tasks/tmp-r3-fix1-sau-gv.png');
  console.log('Chặng 12:', JSON.stringify({ band: LOG.sau.gvBand, sauBtn, plan: LOG.sau.plan, timer: LOG.sau.timer }));

  // ===== Tổng hợp think =====
  const nums = THINK.map((r) => Number(r.text.match(/\d+/)[0]));
  LOG.think = {
    reads: THINK.length,
    samples: THINK.slice(0, 30),
    saw10: THINK.some((r) => r.text === 'Chờ 10s'),
    minSeen: nums.length ? Math.min(...nums) : null,
    decreasing: nums.every((n, i) => i === 0 || n <= nums[i - 1]),
    lockedAll: THINK.every((r) => r.disabled),
  };
  console.log('THINK:', JSON.stringify({ reads: LOG.think.reads, saw10: LOG.think.saw10, minSeen: LOG.think.minSeen, decreasing: LOG.think.decreasing, lockedAll: LOG.think.lockedAll }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect(); hsBrowser.disconnect();
})().catch((e) => {
  fs.writeFileSync(OUT.replace('.json', '-fail.json'), JSON.stringify({ LOG, error: e.message, stack: e.stack }, null, 1), 'utf8');
  console.error('FAIL:', e.message); process.exit(1);
});
