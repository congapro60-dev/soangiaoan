// R2 B7-PA v5 — quét Bước 2 + Bước 4 + mở chi tiết cảnh báo chất lượng; dump fields từng bước
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function grabFields(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type]), input[type="number"]'))) {
      let label = '';
      let node = el.closest('div');
      for (let up = 0; up < 6 && node; up++) {
        const prev = node.previousElementSibling;
        if (prev && (prev.innerText || '').trim()) { label = (prev.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100); break; }
        node = node.parentElement;
      }
      out.push({ label, value: el.value || '' });
    }
    return out;
  });
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(9000);

  const result = {};

  // 1) Cảnh báo chất lượng — bấm mở
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, [role="button"], div, span'))
      .find((e) => /Cảnh báo chất lượng/.test(e.textContent || '') && (e.textContent || '').trim().length < 80 && e.offsetParent !== null);
    if (el) el.click();
  });
  await sleep(3000);
  result.warnings = await page.evaluate(() => {
    const t = document.body.innerText || '';
    const i = t.indexOf('Cảnh báo chất lượng');
    return i >= 0 ? t.slice(i, i + 2500).replace(/\n{2,}/g, '\n') : null;
  });

  // 2) Bước 2
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, [role="button"], a')).find((b) => /Bước 2/.test(b.textContent || ''));
    if (el) el.click();
  });
  await sleep(6000);
  result.b2 = await grabFields(page);

  // 3) Bước 4
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, [role="button"], a')).find((b) => /Bước 4/.test(b.textContent || ''));
    if (el) el.click();
  });
  await sleep(6000);
  result.b4 = await grabFields(page);
  result.b4Text = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));

  // 4) kiểm từ khóa trên toàn bộ nội dung thu được
  const all = JSON.stringify(result);
  result.keywordScan = {
    has215: /2,15/.test(all),
    has22: /2,2(?!\d)/.test(all),
    has587: /5,87/.test(all),
    nhanPHT: /đáp án PHT/i.test(all),
    internet395: /3,95/.test(all),
    y3_khongNhoHon: /không nhỏ hơn/.test(all),
    has152: /152/.test(all),
    k5: /k\s*=\s*5\b/.test(all),
    k_15227: /152,27/.test(all),
    con_73k365: /73k\s*=\s*365/.test(all),
    casio: /Casio/i.test(all),
    luong24: /24 triệu/.test(all),
    phieu3: /10;\s*15;\s*20;\s*x/.test(all),
    tuTinh: /tự tính/i.test(all),
  };

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step5e.json', JSON.stringify({ savedAt: new Date().toISOString(), ...result }, null, 1), 'utf8');
  console.log('== KEYWORD SCAN ==\n' + JSON.stringify(result.keywordScan, null, 1));
  console.log('== WARNINGS (1200) ==\n' + (result.warnings || '(none)').slice(0, 1200));
  console.log('SAVED: tasks/tmp-r2-qa-b7-step5e.json');
  try { await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step5e.png', timeout: 20000 }); } catch (e) { console.log('screenshot skip'); }
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
