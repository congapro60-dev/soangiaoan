// R2 B7 step 3 — lấy lessonId từ hàng g11 (Lớp 11 · Tiết 76), mở "Mở bài" dump chi tiết (PA-β / PA-d / guide)
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

  // Hàng g11: chứa "Lớp 11 · Tuần 11 · Tiết 76"
  const rowHtml = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => /Lớp 11 · Tuần 11 · Tiết 76/.test(r.innerText || ''));
    return tr ? tr.outerHTML.slice(0, 6000) : null;
  });
  console.log('== ROW G11 HTML (6000) ==\n' + (rowHtml || 'KHÔNG THẤY'));
  const idMatch = rowHtml && rowHtml.match(/adaptive-v4-11-11-76-[A-Za-z0-9]+/);
  console.log('LESSON ID:', idMatch ? idMatch[0] : null);

  // Bấm "Mở bài" trên hàng đó — mở tab mới nếu có
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
  // Checks PA-β / PA-d / guide trên trang chi tiết (view GV)
  const checks = {
    url: detail.url(),
    lessonId: idMatch ? idMatch[0] : null,
    pht1_auto215: /2,15/.test(text),
    pht1_goiTuTinh: /tự tính/i.test(text),
    internet_395: /3,95/.test(text),
    internet_coNhanPHT1: /đáp án PHT số 1[^.]*3,95|3,95[^.]*đáp án PHT số 1/i.test(text) || /Internet[^.\n]{0,80}đáp án PHT số 1/i.test(text),
    y3_dichMoi: /không nhỏ hơn[\s\S]{0,60}152/.test(text) && /nhỏ nhất của k/.test(text),
    con_73k365: text.includes('73k = 365'),
    k5_15227: /k = 5/.test(text) && /152,27/.test(text),
    me22: /2,2/.test(text),
    casioGuide: /Casio/i.test(text),
    textLen: text.length,
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));
  console.log('== DETAIL TEXT (5000) ==\n' + text.slice(0, 5000));
  await detail.screenshot({ path: 'tasks/tmp-r2-qa-b7-step3-detail.png', fullPage: false });
  console.log('SCREENSHOT: tasks/tmp-r2-qa-b7-step3-detail.png');

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step3.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, detailText: text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step3.json');
  if (opened) await opened.close();
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
