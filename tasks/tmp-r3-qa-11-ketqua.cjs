// R3 B8 exit2b — bấm "Hiện kết quả lớp" để xác nhận 1 HS đã gửi exit ticket
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-qa-session3.json', 'utf8'));
const OUT = 'tasks/tmp-r3-qa-c-log-part-exit2b.json';
const LOG = { gvOpen: null, clicked: null, panel: null, hs: null };

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }

(async () => {
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 120000 });
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  const t0 = await dump(gv);
  LOG.gvOpen = { stage: (t0.match(/Chặng (\d+)\/12/) || [])[1] || null, expired: t0.includes('đã hết hạn') };
  console.log('GV mở:', JSON.stringify(LOG.gvOpen));
  if (LOG.gvOpen.expired) { console.log('EXPIRED-NEED-NEW-SESSION'); process.exit(2); }

  LOG.clicked = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiện kết quả lớp' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  await sleep(3000);
  const panel = await dump(gv);
  LOG.panel = panel;
  LOG.has1HS = /1\s*(học sinh|HS)|1\s*\/\s*1|Tuệ Minh/.test(panel);
  LOG.matches = (panel.match(/[^\n]*(học sinh đã gửi|1\/1|Tuệ Minh|exit ticket)[^\n]*/gi) || []).slice(0, 10);
  await gv.screenshot({ path: 'tasks/tmp-r3-qa-c4-ketqua-gv.png', timeout: 20000 }).catch(() => {});
  console.log('Hiện kết quả lớp:', LOG.clicked, '| has1HS:', LOG.has1HS, '| matches:', JSON.stringify(LOG.matches));

  // HS vẫn thấy xác nhận đã gửi?
  const hsPages = await (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl;
  const hsBrowser = await puppeteer.connect({ browserWSEndpoint: hsPages, defaultViewport: null, protocolTimeout: 120000 });
  const pages = await hsBrowser.pages();
  const hs = pages.find((p) => p.url().includes('adaptive-live'));
  if (hs) {
    const th = await dump(hs);
    LOG.hs = { status: (th.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3) };
    console.log('HS status:', JSON.stringify(LOG.hs.status));
  }
  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });
