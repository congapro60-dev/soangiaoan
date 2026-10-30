// R3 fix1 — re-verify S4 trên HS/TV: quay về chặng 5 trong phiên hiện hành, dump đầy đủ
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SESSION_FILE = 'tasks/tmp-r3-fix1-session.json';
const OUT = 'tasks/tmp-r3-fix1-s4-recheck.json';
const S = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }

(async () => {
  let hsBrowser = null;
  try {
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  } catch (e) {
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
  const st0 = await gv.evaluate(() => (document.body.innerText.match(/Chặng (\d+)\/12/) || [])[1] || null);
  console.log('GV stage hiện tại:', st0);

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 1400 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  const joined = await hs.evaluate(() => !(document.body.innerText || '').includes('Vào tiết học trực tiếp'));
  console.log('HS re-login:', joined);

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 900 });
  await tv.goto(S.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);

  // Lùi về chặng 5
  let guard = 0;
  let stage = Number(st0 || 12);
  while (stage > 5 && guard < 14) {
    await gv.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '← Trước' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(2500);
    stage = Number(await gv.evaluate(() => (document.body.innerText.match(/Chặng (\d+)\/12/) || [])[1] || stage)) || stage;
    guard++;
  }
  await sleep(4000);
  const stageNow = await gv.evaluate(() => (document.body.innerText.match(/Chặng (\d+)\/12/) || [])[1] || null);
  console.log('Sau khi lùi — GV stage:', stageNow);

  await sleep(2500);
  const hsT = await dump(hs);
  const tvT = await dump(tv);
  const res = {
    savedAt: new Date().toISOString(),
    gvStage: stageNow,
    gvBand: (await dump(gv)).match(/Kế hoạch[^\n]*/) || [null],
    hsBand: (hsT.match(/Chặng [\d–]+ phút/) || [null])[0],
    tvBand: (tvT.match(/Chặng [\d–]+ phút/) || [null])[0],
    hsHasAiKetLuan: hsT.includes('AI kết luận') && hsT.includes('a ⊂ (α)'),
    tvHasAiKetLuan: tvT.includes('AI kết luận') && tvT.includes('a ⊂ (α)'),
    hsNoProof: !hsT.includes('Phản ví dụ gốc') && !hsT.includes('trần'),
    tvNoProof: !tvT.includes('Phản ví dụ gốc') && !tvT.includes('trần'),
    hsHas4Nhan: ['Hiểu sai khái niệm', 'Sai biến đổi hoặc tính toán', 'Sai lập luận', 'Thiếu điều kiện'].every((x) => hsT.includes(x)),
    hsHasPhanDoi: hsT.includes('Em đồng ý hay phản đối'),
    hsAiBlock: (hsT.split('\n').filter((l) => /AI kết luận|a ⊂ \(α\)|đồng ý hay phản đối|Thiếu điều kiện|Hiểu sai khái niệm/.test(l)).slice(0, 12)).join('\n'),
    hsExcerpt: hsT.slice(0, 1400),
  };
  console.log('S4 RECHECK:', JSON.stringify({ ...res, hsExcerpt: undefined, gvBand: res.gvBand[0] }, null, 1));
  try { await hs.screenshot({ path: 'tasks/tmp-r3-fix1-s4-hs2.png', timeout: 20000 }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect(); hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT.replace('.json', '-fail.json'), JSON.stringify({ error: e.message }, null, 1), 'utf8'); process.exit(1); });
