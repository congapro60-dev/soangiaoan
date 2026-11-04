// B8-A3b — Chẩn đoán: countdown S1 freeze tại 5s? Test lại với HS page ở foreground + đọc thêm banner
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r1-qa-session.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readHSDeep(hs) {
  return hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    let wait = null; let open = false; let banner = null;
    const status = document.querySelector('[role="status"]');
    if (status) banner = (status.textContent || '').trim().slice(0, 80);
    for (const b of btns) {
      const m = (b.textContent || '').trim().match(/^Chờ (\d+)s$/);
      if (m) wait = Number(m[1]);
      const txt = (b.textContent || '').trim();
      if (/^Gửi (câu trả lời|lựa chọn|nội dung viết)$/.test(txt) && !b.disabled) open = true;
    }
    return { wait, open, banner, hidden: document.hidden, visibility: document.visibilityState };
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

  // Trạng thái hiện tại HS
  console.log('HS hiện tại:', JSON.stringify(await readHSDeep(hs)));

  // GV lùi về S1 (Chặng 2/12) để tái lập countdown — roundKey đổi → đồng hồ chạy lại
  const stageNow = await gv.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? Number(m[1]) : 0; });
  console.log('GV stage hiện tại:', stageNow);
  for (let i = stageNow; i > 2; i--) {
    await gv.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '← Trước' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(1500);
  }
  console.log('GV stage sau lùi:', await gv.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? m[1] : null; }));

  // Đưa HS lên foreground, đo lại countdown
  await hs.bringToFront();
  await sleep(1500);
  console.log('HS visibility trước đo:', JSON.stringify(await readHSDeep(hs)));

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const s = await readHSDeep(hs);
    s.t = Math.round((Date.now() - t0) / 100) / 10;
    samples.push(s);
    if (s.open) break;
    await sleep(400);
  }
  console.log('S1 retest (foreground):', JSON.stringify(samples));
  const last = samples[samples.length - 1];
  console.log('KẾT QUẢ: open=', last.open, '| banner cuối:', last.banner);
  if (last.open) {
    await hs.screenshot({ path: 'tasks/tmp-r1-qa-a3b-hs-open.png' });
    console.log('SCREENSHOT: tasks/tmp-r1-qa-a3b-hs-open.png');
  }
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
