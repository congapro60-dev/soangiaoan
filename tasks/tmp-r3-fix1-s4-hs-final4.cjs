// R3 fix1 — S4 HS lần 4: phiên MỚI, HS join từ chặng 1, tiến tới 5 như part-full
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-fix1-session2.json', 'utf8'));
const OUT = 'tasks/tmp-r3-fix1-s4-hs-final4.json';

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvStage(gv) { return gv.evaluate(() => (document.body.innerText.match(/Chặng (\d+)\/12/) || [])[1] || null); }
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}
async function hsState(hs) {
  return hs.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      hasForm: t.includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      view: !t.includes('Vào tiết học trực tiếp') && t.includes('HỌC SINH'),
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
    if (stable) return true;
  }
  return false;
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
  const joined = await hsJoinStable(hs);
  console.log('HS join ổn định:', joined);
  if (!joined) throw new Error('HS join fail');

  // Chạy tiết nếu đang chờ
  const st0 = await gv.evaluate(() => document.body.innerText || '');
  if (st0.includes('CHỜ VÀO TIẾT')) {
    for (let i = 0; i < 6; i++) { if (await gvClick(gv, 'Chạy')) break; await sleep(2000); }
    await sleep(3000);
  }

  // Tiến 1→5 với nghỉ giữa các chặng (HS có mặt liên tục)
  let stage = Number(await gvStage(gv) || 1);
  let guard = 0;
  while (stage < 5 && guard < 20) {
    await gvClick(gv, 'Sau →');
    await sleep(6000);
    stage = Number(await gvStage(gv) || stage);
    guard++;
  }
  console.log('GV stage:', await gvStage(gv));
  await sleep(6000);

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
    hsAiBlock: hsT.split('\n').filter((l) => /AI kết luận|a ⊂ \(α\)|luôn song song|Thiếu điều kiện|Hiểu sai khái niệm|Sai lập luận|MÀN HÌNH CHUNG|PHẢN HỒI NHANH/.test(l)).slice(0, 14).join('\n'),
    hsExcerpt: hsT.slice(0, 2000),
  };
  console.log('S4 HS FINAL4:', JSON.stringify({ ...res, hsExcerpt: undefined }, null, 1));
  console.log('AI block:\n' + (res.hsAiBlock || '(rỗng)'));
  try { await hs.screenshot({ path: 'tasks/tmp-r3-fix1-s4-hs6.png', timeout: 20000, fullPage: true }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect(); hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
