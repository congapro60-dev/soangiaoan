// R2 fix1 shots3d-gvtv — CHỈ GV + TV qua page-level WS trên 9222: dump + screenshot
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const SID = S.sessionId;

async function pageDump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}
async function connectPage(ws) {
  const b = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null, protocolTimeout: 120000 });
  const p = (await b.pages())[0];
  return { b, p };
}

(async () => {
  await sleep(2000);
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const gvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv-control') && t.url.includes(SID));
  const tvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv&') && t.url.includes(SID));
  if (!gvT || !tvT) throw new Error('Không thấy GV/TV target');

  const gvC = await connectPage(gvT.webSocketDebuggerUrl);
  const gvText = await pageDump(gvC.p);
  const stage = (gvText.match(/Chặng (\d+)\/12/) || [])[1] || null;
  await gvC.p.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-gv.png' });
  gvC.b.disconnect();
  console.log('GV stage:', stage);

  const tvC = await connectPage(tvT.webSocketDebuggerUrl);
  const tvText = await pageDump(tvC.p);
  await tvC.p.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-tv.png' });
  tvC.b.disconnect();

  fs.writeFileSync('tasks/tmp-r2-fix1-live-gvtv-text.json', JSON.stringify({ savedAt: new Date().toISOString(), stage, gv: gvText, tv: tvText }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live-gvtv-text.json');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
