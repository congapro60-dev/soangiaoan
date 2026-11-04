// R2 B7 step 4c — mở preview, đợi render kỹ, dump TOÀN BỘ dialog + iframe content
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

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a'))
      .find((b) => /Xem trước bài học/.test((b.textContent || '')) && b.offsetParent !== null);
    if (btn) btn.click();
  });

  // Chờ nội dung preview: text trong dialog dài hơn 400 ký tự hoặc tối đa 40s
  let dlg = '';
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    dlg = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? (d.innerText || '') : '';
    });
    if (dlg.length > 400) break;
  }
  console.log('Dialog textLen:', dlg.length);

  // Nếu có iframe, lấy body bên trong
  const frames = page.frames();
  for (const f of frames) {
    try {
      const ft = await f.evaluate(() => (document.body ? document.body.innerText : ''));
      if (ft && ft.length > 100) console.log('== FRAME ' + f.url().slice(0, 100) + ' (len ' + ft.length + ') ==\n' + ft.slice(0, 3000));
    } catch { /* cross-origin */ }
  }

  const text = dlg.replace(/\n{2,}/g, '\n');
  const checks = {
    dialogLen: dlg.length,
    casioGuide: /Casio/i.test(text),
    k5_15227: /k\s*=\s*5(?!\d)/.test(text) && /152,27/.test(text),
    dich_khongNhoHon: /không nhỏ hơn/.test(text),
    dich_152: /152/.test(text),
    dich_nhoNhatK: /nhỏ nhất của k/.test(text),
    con_73k365: /73k\s*=\s*365/.test(text),
    pht215: /2,15/.test(text),
    pht22: /2,2(?!\d)/.test(text),
    internet395: /3,95/.test(text),
    nhanDapAnPHT: /đáp án PHT/i.test(text),
    // các chặng chính xuất hiện?
    s1_onnEN: /tần số tích lũy|tần số cộng dồn/.test(text),
    s4_nam: /bạn Nam|Nam/.test(text),
    s6_vinhDanh: /vinh danh/.test(text),
    s9_luong: /công ty A|lương/.test(text),
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  // đoạn quanh "không nhỏ hơn" nếu có
  const idx = text.indexOf('không nhỏ hơn');
  if (idx >= 0) console.log('== ĐOẠN PA-d ==\n' + text.slice(Math.max(0, idx - 400), idx + 500));

  await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step4c.png' });
  console.log('SCREENSHOT: tasks/tmp-r2-qa-b7-step4c.png');

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step4c.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, previewText: text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step4c.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
