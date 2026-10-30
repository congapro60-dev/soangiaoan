// R2 B7 step 4 — mở detail bài 11-11-76, bấm "Xem trước bài học (như học sinh thấy)", dump + checks
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
  await sleep(8000);

  // Bấm "Xem trước bài học (như học sinh thấy)"
  const popupPromise = new Promise((resolve) => browser.once('targetcreated', (t) => { t.page().then((p) => resolve(p)).catch(() => resolve(null)); }));
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a'))
      .find((b) => /Xem trước bài học/.test((b.textContent || '')) && b.offsetParent !== null);
    if (btn) { btn.click(); return (btn.textContent || '').trim(); }
    return null;
  });
  console.log('Clicked preview:', clicked);
  const opened = await Promise.race([popupPromise, sleep(6000).then(() => null)]);
  const prev = opened || page;
  if (opened) await opened.setViewport({ width: 1440, height: 900 });
  await sleep(10000);

  const text = await prev.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('== PREVIEW URL ==', prev.url());
  const checks = {
    url: prev.url(),
    textLen: text.length,
    casioGuide: /Casio/i.test(text),
    k5_15227: /k\s*=\s*5(?!\d)/.test(text) && /152,27/.test(text),
    dich_moi_khongNhoHon: /không nhỏ hơn/.test(text),
    dich_moi_152: /152/.test(text),
    dich_moi_nhoNhatK: /nhỏ nhất của k|nhỏ nhất của k\b|giá trị nhỏ nhất của k/.test(text),
    con_73k365: /73k\s*=\s*365/.test(text),
    pht215: /2,15/.test(text),
    pht22: /2,2(?!\d)/.test(text),
    internet395: /3,95/.test(text),
    nhanDapAnPHT: /đáp án PHT/i.test(text),
    nhanDapAnPHT_ganInternet: /Internet[\s\S]{0,400}đáp án PHT/i.test(text) || /đáp án PHT[\s\S]{0,400}Internet/i.test(text),
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  // Trích đoạn quanh "không nhỏ hơn" nếu có (PA-d)
  const idx = text.indexOf('không nhỏ hơn');
  if (idx >= 0) console.log('== ĐOẠN PA-d ==\n' + text.slice(Math.max(0, idx - 300), idx + 400));

  await prev.screenshot({ path: 'tasks/tmp-r2-qa-b7-step4-preview.png' });
  console.log('SCREENSHOT: tasks/tmp-r2-qa-b7-step4-preview.png');

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step4.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, previewText: text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step4.json');
  if (opened) await opened.close();
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
