// R2 fix1 shots3c — GV/TV connect page-WS trên 9222; HS trên Edge RIÊNG 9223 (profile tạm); snap S10 chặng 11
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const SID = S.sessionId;
const HS_URL = S.student;
const LOG = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-live.json', 'utf8'));

async function pageDump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}
async function connectPage(ws) {
  const b = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null, protocolTimeout: 120000 });
  const p = (await b.pages())[0];
  return { b, p };
}

(async () => {
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const gvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv-control') && t.url.includes(SID));
  const tvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv&') && t.url.includes(SID));
  if (!gvT || !tvT) throw new Error('Không thấy GV/TV target');

  // GV
  const gvC = await connectPage(gvT.webSocketDebuggerUrl);
  const gvText = await pageDump(gvC.p);
  const stage = (gvText.match(/Chặng (\d+)\/12/) || [])[1] || null;
  console.log('GV stage:', stage);
  await gvC.p.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-gv.png' });
  gvC.b.disconnect();

  // TV
  const tvC = await connectPage(tvT.webSocketDebuggerUrl);
  const tvText = await pageDump(tvC.p);
  await tvC.p.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-tv.png' });
  tvC.b.disconnect();

  // HS — Edge riêng 9223
  const ver = await (await fetch('http://127.0.0.1:9223/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await browser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  let joined = 'lost';
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
    }));
    if (!st.hasForm) { joined = 'view'; break; }
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
  console.log('HS join (Edge 9223):', joined);
  await sleep(4000);
  const hsText = await pageDump(hs);
  await hs.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-hs.png' });

  LOG.s10exit3 = { gv: gvText, tv: tvText, hs: hsText, hsJoined: joined, gvStage: stage };
  const ciNew = '\u1D62', meNew = '\u2091';
  const checks = {};
  for (const scr of ['gv', 'tv', 'hs']) {
    const t = LOG.s10exit3[scr] || '';
    checks[scr] = {
      cSub: t.includes('c' + ciNew),
      meSub: t.includes('M' + meNew),
      cUnderscore: /c_i/.test(t),
      MeUnderscore: /M_e/.test(t),
      lines: t.split('\n').filter((l) => /kết luận có căn cứ|c\u1D62|c_i/.test(l)).map((l) => l.slice(0, 200)).slice(0, 8),
    };
  }
  LOG.checksS10exit3 = checks;
  console.log('== CHECKS S10 ==\n' + JSON.stringify(checks, null, 1));
  fs.writeFileSync('tasks/tmp-r2-fix1-live.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live.json');
  await browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
