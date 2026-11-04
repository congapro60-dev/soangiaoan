// B8-A1 v2 — GV mở "Mở tiết trực tiếp" cho bài 10-11-80, chọn lớp (native setter), tạo phiên, lưu 3 URL
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const TITLE = 'Các số đặc trưng đo xu thế trung tâm — Tiết 2';
const CLASS_ID = 'class-1787208462088';
const OUT = 'tasks/tmp-r1-qa-session.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitAppReady(page) {
  for (let i = 0; i < 25; i++) {
    const ok = await page.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return t.includes('KHO BÀI HỌC') && t.includes('Tạo và xuất bản');
    });
    if (ok) return true;
    await sleep(2000);
  }
  return false;
}

async function openTabAndFindRow(page) {
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(3000);
  for (let i = 0; i < 15; i++) {
    const found = await page.evaluate((title) => {
      return Array.from(document.querySelectorAll('table tbody tr'))
        .some((r) => (r.innerText || '').includes(title));
    }, TITLE);
    if (found) return true;
    await sleep(2000);
  }
  return false;
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitAppReady(page);
  await sleep(3000);

  let rowFound = await openTabAndFindRow(page);
  if (!rowFound) {
    console.log('Danh sách rỗng → reload để query chạy lại sau khi auth restore');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitAppReady(page);
    await sleep(3000);
    rowFound = await openTabAndFindRow(page);
  }
  console.log('Tìm thấy hàng bài:', rowFound);
  if (!rowFound) throw new Error('Không thấy hàng bài sau reload');

  // Bấm "Mở tiết trực tiếp" trên hàng bài mới
  await page.evaluate((title) => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find((r) => (r.innerText || '').includes(title));
    const btn = tr && Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
    if (btn) btn.click();
  }, TITLE);

  // Chờ dialog + select lớp xuất hiện
  let hasDialog = false;
  for (let i = 0; i < 15; i++) {
    hasDialog = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"] select')));
    if (hasDialog) break;
    await sleep(2000);
  }
  console.log('Modal mở (dialog+select):', hasDialog);
  await page.screenshot({ path: 'tasks/tmp-r1-qa-a1-launcher.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a1-launcher.png');
  if (!hasDialog) throw new Error('Dialog không xuất hiện');

  // Chọn lớp TRONG dialog — native value setter để React nhận change
  let classChosen = null;
  for (let i = 0; i < 10; i++) {
    classChosen = await page.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return { error: 'no-select' };
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return { error: 'no-option', opts: Array.from(sel.options).map((o) => o.value + '=' + o.textContent.trim()) };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, cid);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: sel.value };
    }, CLASS_ID);
    if (classChosen && classChosen.ok) break;
    await sleep(2000);
  }
  console.log('Lớp chọn:', JSON.stringify(classChosen));
  await sleep(1000);

  // Bấm "Tạo phiên tiết trực tiếp" TRONG dialog — poll chờ enable
  let created = false;
  for (let i = 0; i < 10; i++) {
    created = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find((b) => (b.textContent || '').includes('Tạo phiên tiết trực tiếp') && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (created) break;
    await sleep(2000);
  }
  console.log('Bấm tạo phiên:', created);

  // Chờ "Đã tạo phiên chung: <id>"
  let sessionId = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    sessionId = await page.evaluate(() => {
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return m ? m[1] : null;
    });
    if (sessionId) break;
  }
  console.log('SESSION ID:', sessionId);

  // 3 URL từ dialog — phân loại theo mode
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]'))
      .map((a) => a.href)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  });
  const classified = {
    tvControl: links.find((u) => u.includes('mode=tv-control')) || null,
    tv: links.find((u) => u.includes('mode=tv')) || null,
    student: links.find((u) => u.includes('mode=student')) || null,
  };
  console.log('LINKS:', JSON.stringify(classified, null, 1));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-a1-created.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a1-created.png');

  fs.writeFileSync(OUT, JSON.stringify({ sessionId, links: classified, savedAt: new Date().toISOString() }, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);

  if (!sessionId || !classified.tvControl) { await page.close(); browser.disconnect(); return; }

  // GV navigate chính tab này vào Presenter
  await page.goto(classified.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const text = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('== PRESENTER (2200) ==\n' + text.slice(0, 2200));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-a1-presenter.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a1-presenter.png');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
