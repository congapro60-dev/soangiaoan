// R3 fix1 — S4 HS: bấm "Sẵn sàng." (panel ngôn ngữ) rồi dump lại
const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-fix1-session.json', 'utf8'));
const OUT = 'tasks/tmp-r3-fix1-s4-hs-final2.json';

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

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 2000 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);

  // Đảm bảo đã trong lớp
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

  // Bấm "Sẵn sàng." nếu có
  const clickedReady = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Sẵn sàng/i.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim(); }
    return null;
  });
  console.log('Bấm Sẵn sàng:', clickedReady);
  await sleep(4000);

  const hsT = await dump(hs);
  const res = {
    savedAt: new Date().toISOString(),
    inLesson,
    clickedReady,
    hsBand: (hsT.match(/Chặng [\d–]+ phút/) || [null])[0],
    hsHasAiKetLuan: hsT.includes('AI kết luận') && hsT.includes('a ⊂ (α)'),
    hsNoProof: !hsT.includes('Phản ví dụ gốc') && !hsT.includes('trần'),
    hsHas4Nhan: ['Hiểu sai khái niệm', 'Sai biến đổi hoặc tính toán', 'Sai lập luận', 'Thiếu điều kiện'].every((x) => hsT.includes(x)),
    hsHasPhanDoi: hsT.includes('Em đồng ý hay phản đối'),
    hsAiBlock: hsT.split('\n').filter((l) => /AI kết luận|a ⊂ \(α\)|đồng ý hay phản đối|Thiếu điều kiện|Hiểu sai khái niệm|Sai lập luận|Lời giải cần kiểm/.test(l)).slice(0, 14).join('\n'),
    hsExcerpt: hsT.slice(0, 2200),
  };
  console.log('S4 HS FINAL2:', JSON.stringify({ ...res, hsExcerpt: undefined }, null, 1));
  console.log('AI block:\n' + (res.hsAiBlock || '(rỗng)'));
  try { await hs.screenshot({ path: 'tasks/tmp-r3-fix1-s4-hs4.png', timeout: 20000, fullPage: true }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await hs.close().catch(() => {});
  hsBrowser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
