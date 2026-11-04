// B8-A4c — Tắt stats (nhãn đúng "Ẩn kết quả"), HS gửi loại lỗi + phản biện THẬT, TV stats đếm 1
const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const gv = pages.find((p) => p.url().includes('mode=tv-control'));
  const hs = pages.find((p) => p.url().includes('mode=student'));
  const tv = pages.find((p) => p.url().includes('mode=tv&'));
  if (!gv || !hs || !tv) throw new Error('Thiếu trang GV/HS/TV');

  // === 1) Tắt stats — nhãn đúng là "Ẩn kết quả" ===
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Ẩn kết quả' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(3000);
  const gvBtn = await gv.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => ['Hiện kết quả lớp', 'Ẩn kết quả'].includes((x.textContent || '').trim()));
    return b ? b.textContent.trim() : null;
  });
  const hsLock = await hs.evaluate(() => (document.body.innerText || '').includes('Đã công bố — không sửa được nữa'));
  console.log('GV nút stats:', gvBtn, '(kỳ vọng "Hiện kết quả lớp" = đã tắt) | HS còn khoá:', hsLock);

  // === 2) Gửi trống bị chặn (chưa chọn loại lỗi, textarea rỗng) ===
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi câu trả lời' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(2500);
  const st1 = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"], aside')).map((e) => (e.textContent || '').trim().slice(0, 60)));
  console.log('Gửi trống → status:', JSON.stringify(st1), '(không có "Đang gửi…" = bị chặn)');

  // === 3) Gửi thật: chọn "Hiểu sai khái niệm" + phản biện ===
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiểu sai khái niệm');
    if (btn) btn.click();
  });
  await sleep(600);
  const sel = await hs.evaluate(() => Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map((b) => (b.textContent || '').trim()).filter((t) => /khái niệm|Sai|Thiếu|Hiểu/.test(t)));
  console.log('Loại lỗi đã chọn:', JSON.stringify(sel));
  await hs.evaluate(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'Sai vì x̄ của 10 số liệu phải chia cho 10 chứ không phải 4 dòng bảng; x̄ không thể vượt giá trị lớn nhất 20 cm.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(500);
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi câu trả lời' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(4500);
  const st2 = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"], aside')).map((e) => (e.textContent || '').trim().slice(0, 120)));
  console.log('Sau gửi thật → status:', JSON.stringify(st2));
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-b-hs-s4-sent2.png' });
  console.log('SCREENSHOT: b-hs-s4-sent2');

  // === 4) GV bật stats → TV đếm ===
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiện kết quả lớp' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(4500);
  const tvStats = await dump(tv);
  console.log('TV stats: received=', (tvStats.match(/(\d+)\s*\n\s*học sinh đã gửi/) || tvStats.match(/(\d+)\s*học sinh đã gửi/) || [])[1], '| Khái niệm=1:', /Khái niệm\s*\n\s*1/.test(tvStats));
  console.log('== TV stats (900) ==\n' + tvStats.slice(tvStats.indexOf('Theo phản hồi'), tvStats.indexOf('Theo phản hồi') + 900));
  await tv.screenshot({ path: 'tasks/tmp-r1-qa-b-tv-stats-3.png' });
  console.log('SCREENSHOT: b-tv-stats-3');

  // Tắt stats lần nữa (để HS không bị khoá cho các chặng sau)
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Ẩn kết quả' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(2000);
  const hsLock2 = await hs.evaluate(() => (document.body.innerText || '').includes('Đã công bố — không sửa được nữa'));
  console.log('Sau khi tắt stats — HS còn khoá:', hsLock2, '(kỳ vọng false)');
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
