// R2 fix1 shots3 — HS vào bằng browser context RIÊNG (không dính phiên GV), snap S10 (chặng 11)
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const SID = S.sessionId;
const HS_URL = S.student;
const LOG = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-live.json', 'utf8'));

async function dump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}

(async () => {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const pages = await browser.pages();
  const gv = pages.find((p) => p.url().includes('mode=tv-control') && p.url().includes(SID));
  const tv = pages.find((p) => p.url().includes('mode=tv&') && p.url().includes(SID));
  const hsOld = pages.find((p) => p.url().includes('mode=student') && p.url().includes(SID));
  if (!gv || !tv) throw new Error('Mất tab GV hoặc TV — chạy lại shots2');
  if (hsOld) await hsOld.close().catch(() => {});

  const context = await browser.createBrowserContext();
  const hs = await context.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  let joined = 'lost';
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      hasTeacherBlock: (document.body.innerText || '').includes('phiên giáo viên'),
    }));
    if (!st.hasForm) { joined = 'view-or-other'; break; }
    if (st.hasTeacherBlock) console.log('Lần ' + i + ': vẫn bị chặn phiên GV?');
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
  }
  const hsText = await dump(hs);
  LOG.hsRejoinCtx = hsText.includes('HỌC SINH') && !hsText.includes('Vào tiết học trực tiếp') ? 'view' : 'lost';
  console.log('HS join (ctx riêng):', LOG.hsRejoinCtx);
  await sleep(4000);

  LOG.s10exit3 = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv) };
  await gv.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-gv.png' });
  await hs.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-hs.png' });
  await tv.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-tv.png' });

  const ciNew = '\u1D62', meNew = '\u2091';
  const checks = {};
  for (const scr of ['gv', 'tv', 'hs']) {
    const t = LOG.s10exit3[scr];
    checks[scr] = {
      cSub: t.includes('c' + ciNew),
      meSub: t.includes('M' + meNew),
      cUnderscore: /c_i/.test(t),
      MeUnderscore: /M_e/.test(t),
      lines: t.split('\n').filter((l) => /kết luận có căn cứ|c\u1D62|c_i/.test(l)).map((l) => l.slice(0, 200)).slice(0, 8),
    };
  }
  LOG.checksS10exit3 = checks;
  console.log('== CHECKS S10 (ctx) ==\n' + JSON.stringify(checks, null, 1));
  fs.writeFileSync('tasks/tmp-r2-fix1-live.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live.json');
  await browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
