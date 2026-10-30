// R3 fix1 — S4 HS lần 3: vào chặng 5 theo hướng TỚI (4→5) rồi dump HS
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-fix1-session.json', 'utf8'));
const OUT = 'tasks/tmp-r3-fix1-s4-hs-final3.json';

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvStage(gv) { return gv.evaluate(() => (document.body.innerText.match(/Chặng (\d+)\/12/) || [])[1] || null); }
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}

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
  await sleep(8000);
  console.log('GV stage đầu:', await gvStage(gv));

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 2000 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  let inLesson = await hs.evaluate(() => /ĐANG HỌC|Chặng \d+\/12/.test(document.body.innerText || ''));
  for (let i = 0; i < 6 && !inLesson; i++) {
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      if (!sel) return;
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(800);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      if (!inp) return;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(600);
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(5000);
    inLesson = await hs.evaluate(() => /ĐANG HỌC|Chặng \d+\/12/.test(document.body.innerText || ''));
  }
  console.log('HS trong lớp:', inLesson);

  // Lùi về 4 nếu đang >4, rồi tiến vào 5
  let stage = Number(await gvStage(gv) || 5);
  let guard = 0;
  while (stage > 4 && guard < 14) { await gvClick(gv, '← Trước'); await sleep(2200); stage = Number(await gvStage(gv) || stage); guard++; }
  while (stage < 5 && guard < 20) { await gvClick(gv, 'Sau →'); await sleep(2500); stage = Number(await gvStage(gv) || stage); guard++; }
  console.log('GV stage sau điều hướng:', await gvStage(gv));
  await sleep(5000);

  const gvT = await dump(gv);
  const hsT = await dump(hs);
  const res = {
    savedAt: new Date().toISOString(),
    gvStage: await gvStage(gv),
    gvBand: (gvT.match(/Kế hoạch[^\n]*/) || [null])[0],
    gvArmed: gvT.includes('CÙNG THỰC HIỆN') && gvT.includes('Lời giải cần kiểm'),
    hsBand: (hsT.match(/Chặng [\d–]+ phút/) || [null])[0],
    hsHasAiKetLuan: hsT.includes('AI kết luận') && hsT.includes('a ⊂ (α)'),
    hsHasMirror: hsT.includes('MÀN HÌNH CHUNG (TRÊN TV)'),
    hsHas4Nhan: ['Hiểu sai khái niệm', 'Sai biến đổi hoặc tính toán', 'Sai lập luận', 'Thiếu điều kiện'].every((x) => hsT.includes(x)),
    hsHasPhanDoi: hsT.includes('Em đồng ý hay phản đối') || hsT.includes('a có luôn song song với b không'),
    hsNoProof: !hsT.includes('Phản ví dụ gốc') && !hsT.includes('trần'),
    hsAiBlock: hsT.split('\n').filter((l) => /AI kết luận|a ⊂ \(α\)|luôn song song|Thiếu điều kiện|Hiểu sai khái niệm|Sai lập luận|MÀN HÌNH CHUNG/.test(l)).slice(0, 14).join('\n'),
    gvExcerpt: gvT.slice(0, 800),
  };
  console.log('S4 HS FINAL3:', JSON.stringify({ ...res, gvExcerpt: undefined }, null, 1));
  try { await hs.screenshot({ path: 'tasks/tmp-r3-fix1-s4-hs5.png', timeout: 20000, fullPage: true }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect(); hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
