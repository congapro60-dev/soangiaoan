// B8-A3c — Đưa cửa sổ HS lên foreground qua CDP window bounds, xác nhận countdown chạy 10→0 rồi mở
const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readHS(hs) {
  return hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    let wait = null; let open = false;
    for (const b of btns) {
      const m = (b.textContent || '').trim().match(/^Chờ (\d+)s$/);
      if (m) wait = Number(m[1]);
      const txt = (b.textContent || '').trim();
      if (/^Gửi (câu trả lời|lựa chọn|nội dung viết)$/.test(txt) && !b.disabled) open = true;
    }
    return { wait, open, vis: document.visibilityState };
  });
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const gv = pages.find((p) => p.url().includes('mode=tv-control'));
  const hs = pages.find((p) => p.url().includes('mode=student'));
  if (!gv || !hs) throw new Error('Thiếu trang GV/HS');

  // Lấy windowId của trang HS rồi set windowState normal (un-minimize + raise)
  const hsSession = await hs.createCDPSession();
  const { targetId } = await hsSession.send('Target.getTargetInfo');
  const { windowId } = await hsSession.send('Browser.getWindowForTarget', { targetId });
  console.log('HS windowId:', windowId);
  await hsSession.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
  await sleep(500);
  await hsSession.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await sleep(1500);

  const vis = await readHS(hs);
  console.log('HS visibility sau raise:', JSON.stringify(vis));
  if (vis.vis !== 'visible') {
    // thử thêm lần nữa
    await hsSession.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
    await sleep(400);
    await hsSession.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await sleep(1500);
    console.log('HS visibility thử 2:', JSON.stringify(await readHS(hs)));
  }

  // GV quay lại S0 rồi tiến S1: roundKey mới → countdown 10s sạch
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '← Trước' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(1500);
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(1000);

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const s = await readHS(hs);
    s.t = Math.round((Date.now() - t0) / 100) / 10;
    samples.push(s);
    if (s.open) break;
    await sleep(350);
  }
  const waits = samples.filter((s) => s.wait !== null).map((s) => ({ t: s.t, n: s.wait }));
  const last = samples[samples.length - 1];
  console.log('Countdown (HS visible):', JSON.stringify(waits));
  console.log('KẾT QUẢ: open=', last.open, '| vis=', last.vis);
  const monotonic = waits.every((s, i) => i === 0 || s.n <= waits[i - 1].n);
  console.log('monotonic=', monotonic, '| mốc10=', waits.some((s) => s.n === 10), 'mốc6=', waits.some((s) => s.n === 6), 'mốc4=', waits.some((s) => s.n === 4), 'mốc2=', waits.some((s) => s.n === 2));
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-a3c-hs-open.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a3c-hs-open.png');
  await hsSession.detach().catch(() => {});
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
