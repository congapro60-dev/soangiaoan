// R2 fix1 nối tiếp v2 — mở lại GV/TV/HS cho phiên LVNfJtHRTRE5eu1cO51m, navTo chặng 11 (S10), snap + checks
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const GV_URL = S.tvControl;
const TV_URL = GV_URL.replace('mode=tv-control', 'mode=tv');
const HS_URL = S.student;
const LOG = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-live.json', 'utf8'));

async function dump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
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
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(GV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  let cur = await gvInfo(gv);
  console.log('GV mở lại:', JSON.stringify(cur));

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(TV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  const hs = await browser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  // HS login lại nếu cần
  for (let i = 0; i < 10; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      hasView: (document.body.innerText || '').includes('HỌC SINH'),
    }));
    if (st.hasView) break;
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
  LOG.hsRejoin = (await dump(hs)).includes('HỌC SINH') ? 'view' : 'lost';
  console.log('HS rejoin:', LOG.hsRejoin);

  // navTo chặng 11
  let guard = 0;
  while (cur.stage !== '11' && guard < 6) {
    const n = Number(cur.stage || 1);
    await gv.evaluate((forward) => {
      const label = forward ? 'Sau →' : '← Trước';
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === label && !b.disabled);
      if (btn) btn.click();
    }, n < 11);
    await sleep(2800);
    cur = await gvInfo(gv);
    guard++;
  }
  await sleep(2500);
  console.log('Stage:', JSON.stringify(cur));

  LOG.s10exit2 = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: cur };
  await gv.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit2-gv.png' });
  await hs.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit2-hs.png' });
  await tv.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit2-tv.png' });

  const ciNew = '\u1D62', meNew = '\u2091';
  const checks = {};
  for (const scr of ['gv', 'tv', 'hs']) {
    const t = LOG.s10exit2[scr];
    checks[scr] = {
      cSub: t.includes('c' + ciNew),
      meSub: t.includes('M' + meNew),
      cUnderscore: /c_i/.test(t),
      MeUnderscore: /M_e/.test(t),
      lines: t.split('\n').filter((l) => /kết luận có căn cứ|c\u1D62|c_i/.test(l)).map((l) => l.slice(0, 200)).slice(0, 8),
    };
  }
  LOG.checksS10exit2 = checks;
  console.log('== CHECKS S10 ==\n' + JSON.stringify(checks, null, 1));
  fs.writeFileSync('tasks/tmp-r2-fix1-live.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live.json');
  await browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
