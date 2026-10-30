// R3 B8 resweep (phiên 2 T7Mp7UzQqTDCWs4Fys7A) — Chạy → chặng 5 sanity → 6 route → 7 think → 8–9 no-spoiler
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-qa-session2.json', 'utf8'));
const OUT = 'tasks/tmp-r3-qa-c-log-part2b.json';
const LOG = { session: S.sessionId, join: null, s4: null, s5: null, routeChoice: null, s6: null, s7: null, s8: null, think: null, tvButtons: null };
const THINK = [];
const SPOILER_RX = { s75: '7,5(?!\\d)', cm12: '12 cm', dfrac: 'dfrac' };
const BURJ = ['mômen', 'gãy đổ', 'mất cân bằng', 'chịu lực'];

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      plan: (t.match(/Kế hoạch [\d–\-′']+ · tiết 40′/) || [])[0] || (t.match(/Kế hoạch[^\n]*/) || [])[0] || null,
      timer: (t.match(/\n(\d{1,2}:\d{2})\n/) || [])[1] || null,
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
  while (info.stage !== String(target) && guard < 14) {
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
async function hsLogin(hs) {
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      hasView: (document.body.innerText || '').includes('HỌC SINH'),
    }));
    if (st.hasView) return 'view';
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
  return 'lost';
}
async function snap(gv, hs, tv, key, prefix) {
  LOG[key] = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv) };
  await gv.screenshot({ path: `tasks/${prefix}-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/${prefix}-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/${prefix}-${key}-tv.png` });
}
async function spoilerView(page, text) {
  const out = {};
  for (const [k, rx] of Object.entries(SPOILER_RX)) {
    out[k] = new RegExp(rx).test(text) || (await page.evaluate((p) => new RegExp(p).test(document.body.innerHTML), rx));
  }
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
  console.log('GV mở lại:', JSON.stringify(await gvInfo(gv)));

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.join = await hsLogin(hs);
  console.log('HS join (phiên 2):', LOG.join);

  // GV Chạy → chặng 5 (S4 AI-error sanity, band runtime 16–19)
  let started = false;
  for (let i = 0; i < 6; i++) { started = await gvClick(gv, 'Chạy'); if (started) break; await sleep(2000); }
  await sleep(3000);
  const info5 = await navTo(gv, hs, 5, true);
  await sleep(2000);
  await snap(gv, hs, tv, 's4', 'tmp-r3-qa-c2b');
  const hsBand5 = (LOG.s4.hs.match(/Chặng [\d–]+ phút/) || [null])[0];
  LOG.s4.check = {
    hsBand: hsBand5,
    hsHasAI: LOG.s4.hs.includes('AI kết luận'),
    hsHasEq: LOG.s4.hs.includes('a ⊂ (α)'),
    hsNoTran: !LOG.s4.hs.includes('trần'),
    hsNoPhanViDu: !LOG.s4.hs.includes('Phản ví dụ'),
    tvHasAI: LOG.s4.tv.includes('AI kết luận'),
    tvNoTran: !LOG.s4.tv.includes('trần'),
    gvPublicOnly: !LOG.s4.gv.includes('Phản ví dụ') && !LOG.s4.gv.includes('trần'),
  };
  console.log('Chặng 5:', JSON.stringify(info5), '| started:', started, '| S4 CHECK:', JSON.stringify(LOG.s4.check));

  // ===== Chặng 6 — S5 PHT giao nhiệm vụ + route M/S/C =====
  const info6 = await navTo(gv, hs, 6, false);
  await sleep(2000);
  const hsT6 = await dump(hs);
  await snap(gv, hs, tv, 's5', 'tmp-r3-qa-c2b');
  LOG.s5.hasDenLuotSau = hsT6.includes('đến lượt sau');
  LOG.s5.routeButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => /^(M|S|C)\b|Củng cố|Chuẩn|Thử thách/.test(t)).slice(0, 12));
  console.log('Chặng 6:', JSON.stringify(info6), '| route buttons:', JSON.stringify(LOG.s5.routeButtons), '| đến lượt sau:', LOG.s5.hasDenLuotSau);
  const clickedRoute = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^S\b|Chuẩn/.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 60); }
    return null;
  });
  await sleep(4000);
  LOG.routeChoice = { clicked: clickedRoute, after: (await dump(hs)).slice(0, 900) };
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-c2b-route-s5.png' });
  console.log('Đã chọn tuyến:', clickedRoute);

  // ===== Chặng 7 — S6 Thales + think window (deep poll) =====
  const info7 = await navTo(gv, hs, 7, true);
  await sleep(2000);
  await snap(gv, hs, tv, 's6', 'tmp-r3-qa-c2b');
  LOG.s6.spoiler = { hs: await spoilerView(hs, LOG.s6.hs), tv: await spoilerView(tv, LOG.s6.tv), gv: await spoilerView(gv, LOG.s6.gv) };
  LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
  console.log('Chặng 7:', JSON.stringify(info7), '| TV buttons:', JSON.stringify(LOG.tvButtons));

  // ===== Chặng 8 + 9 — S7/S8 đề PHT no-spoiler =====
  for (const [target, key] of [[8, 's7'], [9, 's8']]) {
    const info = await navTo(gv, hs, target, false);
    await sleep(2500);
    await snap(gv, hs, tv, key, 'tmp-r3-qa-c2b');
    LOG[key].spoiler = { hs: await spoilerView(hs, LOG[key].hs), tv: await spoilerView(tv, LOG[key].tv), gv: await spoilerView(gv, LOG[key].gv) };
    LOG[key].burj = burjCheck(LOG[key].gv, LOG[key].tv, LOG[key].hs);
    console.log('Chặng ' + target + ':', JSON.stringify(info), '| spoiler hs:', JSON.stringify(LOG[key].spoiler.hs), '| tv:', JSON.stringify(LOG[key].spoiler.tv));
  }

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
