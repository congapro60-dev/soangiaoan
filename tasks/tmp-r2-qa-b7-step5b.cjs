// R2 B7-PA v2 — vào Bước 3, dump cấu trúc, tìm + mở thẻ mảnh kiến thức, dump spec
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(9000);

  // Bấm nút step "3" (có số 3 + tên bước)
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"], a'));
    const el = btns.find((b) => /Bước 3/.test(b.textContent || '') || /^\s*3\s*\n?\s*Bước 3/.test(b.textContent || ''));
    if (el) { el.click(); return (el.textContent || '').trim().slice(0, 60); }
    // fallback: chữ "Các mảnh kiến thức"
    const el2 = btns.find((b) => /Các mảnh kiến thức/.test(b.textContent || ''));
    if (el2) { el2.click(); return (el2.textContent || '').trim().slice(0, 60); }
    return null;
  });
  console.log('Clicked:', clicked);
  await sleep(8000);

  const text1 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('== SAU KHI BẤM (2400) ==\n' + text1.slice(0, 2400));

  // danh sách nút để tìm thẻ mảnh
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button, [role="button"], a'))
    .map((b) => ({ t: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90) }))
    .filter((x) => x.t && x.t.length > 2).slice(0, 50));
  console.log('== BUTTONS ==\n' + JSON.stringify(btns, null, 1));

  // thử click vào phần tử chứa "mảnh" hoặc tiêu đề bài
  const mClicked = await page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('button, [role="button"], div[class*="cursor"], h3, h4, p'))
      .filter((e) => e.offsetParent !== null && /mảnh|Mảnh|kiến thức|Xu thế|trung tâm/i.test(e.textContent || '') && (e.textContent || '').trim().length > 8 && (e.textContent || '').trim().length < 200);
    if (cands.length) { cands[0].click(); return (cands[0].textContent || '').trim().slice(0, 120); }
    return null;
  });
  console.log('Clicked mảnh:', mClicked);
  await sleep(6000);

  const text2 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('== SAU KHI MỞ MẢNH (' + text2.length + ') ==\n' + text2.slice(0, 3000));

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step5b.json', JSON.stringify({
    savedAt: new Date().toISOString(), clickedStep: clicked, clickedManh: mClicked, textAfterStep: text1, textAfterManh: text2, buttons: btns,
  }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step5b.json');
  await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step5b.png' });
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
