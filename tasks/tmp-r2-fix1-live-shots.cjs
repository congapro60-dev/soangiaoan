// R2 fix1 — phiên live MỚI (sau republish): HS join, Chạy, chụp S2 panel mục tiêu + S10 exit ticket, kiểm cᵢ/Mₑ
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const GV_URL = SESSION.tvControl;
const TV_URL = GV_URL.replace('mode=tv-control', 'mode=tv');
const HS_URL = SESSION.student;
const LOG = { sessionId: SESSION.sessionId, urls: { gv: GV_URL, tv: TV_URL, hs: HS_URL } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
async function navTo(gv, target) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 8) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await sleep(2800);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(2500);
  return info;
}
async function snap(gv, hs, tv, key) {
  LOG[key] = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv) };
  await gv.screenshot({ path: `tasks/tmp-r2-fix1-live-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/tmp-r2-fix1-live-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/tmp-r2-fix1-live-${key}-tv.png` });
  console.log('SNAP', key, JSON.stringify(LOG[key].info));
}
async function hsJoin(hs) {
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
      continue;
    }
    await sleep(2000);
  }
  return (await dump(hs)).includes('HỌC SINH') ? 'view' : 'lost';
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(GV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV ban đầu:', JSON.stringify(await gvInfo(gv)));

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(TV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  const hs = await browser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.hsJoin = await hsJoin(hs);
  console.log('HS join:', LOG.hsJoin);

  // Chạy tiết
  let started = false;
  for (let i = 0; i < 6; i++) {
    started = await gvClick(gv, 'Chạy');
    if (started) break;
    await sleep(2000);
  }
  await sleep(3000);
  console.log('Đã Chạy:', started, JSON.stringify(await gvInfo(gv)));

  // Chặng 2 — S2 panel mục tiêu
  const info2 = await navTo(gv, 2);
  await snap(gv, hs, tv, 's2-goals');

  // Chặng 11 — S10 exit ticket
  const info11 = await navTo(gv, 11);
  await snap(gv, hs, tv, 's10-exit');

  // Checks ký hiệu trên từng màn
  const ciNew = '\u1D62', meNew = '\u2091';
  const checks = {};
  for (const key of ['s2-goals', 's10-exit']) {
    for (const scr of ['gv', 'tv', 'hs']) {
      const t = LOG[key][scr];
      checks[`${key}.${scr}`] = {
        cSub: t.includes('c' + ciNew),
        meSub: t.includes('M' + meNew),
        cUnderscore: /c_i/.test(t),
        MeUnderscore: /M_e/.test(t),
        ciUnderscoreLines: t.split('\n').filter((l) => /c_i|M_e/.test(l)).map((l) => l.slice(0, 160)).slice(0, 6),
      };
    }
  }
  LOG.checks = checks;
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  fs.writeFileSync('tasks/tmp-r2-fix1-live.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live.json');
  for (const p of [gv, tv, hs]) { await p.close().catch(() => {}); }
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
