// R2 fix1 — lấy lessonId hàng g11 (Lớp 11 · Tiết 76), mở "Mở bài", kiểm focus là bản MỚI (cᵢ/Mₑ) hay CŨ (c_i/M_e)
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(7000);

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find(t => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);

  const rowHtml = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => /Lớp 11 · Tuần 11 · Tiết 76/.test(r.innerText || ''));
    return tr ? tr.outerHTML.slice(0, 6000) : null;
  });
  const idMatch = rowHtml && rowHtml.match(/adaptive-v4-11-11-76-[A-Za-z0-9]+/);
  console.log('LESSON ID:', idMatch ? idMatch[0] : null);

  const popupPromise = new Promise(resolve => browser.once('targetcreated', t => { t.page().then(p => resolve(p)).catch(() => resolve(null)); }));
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => /Lớp 11 · Tuần 11 · Tiết 76/.test(r.innerText || ''));
    const btn = tr && Array.from(tr.querySelectorAll('button, a')).find(b => (b.textContent || '').trim() === 'Mở bài');
    if (btn) btn.click();
  });
  const opened = await Promise.race([popupPromise, sleep(6000).then(() => null)]);
  const detail = opened || page;
  if (opened) await opened.setViewport({ width: 1440, height: 900 });
  await sleep(9000);
  console.log('== DETAIL URL ==', detail.url());

  const text = await detail.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const ciNew = '\u1D62';   // ᵢ
  const meNew = '\u2091';   // ₑ
  const checks = {
    url: detail.url(),
    lessonId: idMatch ? idMatch[0] : null,
    focus_moi_cSub: text.includes('đại diện c' + ciNew + ' và tần số tích lũy'),
    focus_cu_cUnderscore: text.includes('đại diện c_i'),
    co_meSub: text.includes('M' + meNew),
    co_MeUnderscore: /M_e/.test(text),
    timestamp_moi: /0?9:13:28/.test(text),
    textLen: text.length,
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));
  // In các dòng chứa focus / ký hiệu để đối chiếu
  const focusLines = text.split('\n').filter(l => /đại diện c|nội suy M/.test(l));
  console.log('== FOCUS LINES ==\n' + (focusLines.join('\n') || '(không thấy)'));
  await detail.screenshot({ path: 'tasks/tmp-r2-fix1-detail.png', fullPage: false });

  fs.writeFileSync('tasks/tmp-r2-fix1-detail.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, focusLines, detailText: text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-detail.json');
  if (opened) await opened.close();
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
