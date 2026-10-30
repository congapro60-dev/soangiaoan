// B8-A4b — Hoàn thiện QA B: HS gửi loại lỗi + phản biện (thật), gửi trống bị chặn,
// GV mode=teacher chứa 14,9 (key chỉ-GV), TV stats đếm phản hồi, resume phiên
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r1-qa-session.json', 'utf8'));
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

  // === 0) GV panel đầy đủ ở mode=teacher (TeacherLiveView) — key chỉ-GV 14,9 ===
  const teacherUrl = SESSION.links.tvControl.replace('mode=tv-control', 'mode=teacher');
  const tp = await browser.newPage();
  await tp.setViewport({ width: 1440, height: 900 });
  await tp.goto(teacherUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const teacherText = await dump(tp);
  console.log('== GV mode=teacher (1800) ==\n' + teacherText.slice(0, 1800));
  const teacher = {
    has14_9: teacherText.includes('14,9'),
    has149_10: teacherText.includes('149/10') || teacherText.includes('149÷10'),
    has37_25: teacherText.includes('37,25'),
    hasCorrection: teacherText.includes('correction') || teacherText.includes('Đáp án') || teacherText.includes('Lỗi AI'),
  };
  console.log('GV teacher panel:', JSON.stringify(teacher));
  await tp.screenshot({ path: 'tasks/tmp-r1-qa-b-gv-teacher-panel.png' });
  console.log('SCREENSHOT: b-gv-teacher-panel');
  await tp.close();

  // === 1) HS gửi trống bị chặn: click "Gửi câu trả lời" khi textarea rỗng & chưa chọn loại lỗi ===
  const preStatus = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"], aside')).map((e) => (e.textContent || '').trim().slice(0, 80)));
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi câu trả lời' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(2500);
  const postEmpty = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"], aside')).map((e) => (e.textContent || '').trim().slice(0, 80)));
  console.log('GỬI TRỐNG: status trước:', JSON.stringify(preStatus), '→ sau:', JSON.stringify(postEmpty), '(không đổi = bị chặn im lặng)');

  // === 2) HS chọn loại lỗi "Hiểu sai khái niệm" + viết phản biện + gửi thật ===
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiểu sai khái niệm');
    if (btn) btn.click();
  });
  await sleep(600);
  const selected = await hs.evaluate(() => Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map((b) => (b.textContent || '').trim()).filter((t) => t.includes('khái niệm') || t.includes('Sai') || t.includes('Thiếu')));
  console.log('Loại lỗi đã chọn:', JSON.stringify(selected));
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
  await sleep(4000);
  const statusSent = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"], aside')).map((e) => (e.textContent || '').trim().slice(0, 120)));
  console.log('Status sau gửi thật:', JSON.stringify(statusSent));
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-b-hs-s4-sent.png' });
  console.log('SCREENSHOT: b-hs-s4-sent');

  // === 3) GV bật stats → TV đếm phản hồi ===
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiện kết quả lớp' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(4000);
  const tvStats = await dump(tv);
  const statsCheck = {
    hasChoiceLabel: tvStats.includes('Lựa chọn của lớp'),
    hasAiErrorLabel: tvStats.includes('Phân loại lỗi AI'),
    received: (tvStats.match(/(\d+)\s*học sinh đã gửi/) || [])[1] || null,
    khaiNiem1: /Khái niệm\s*\n\s*1/.test(tvStats),
  };
  console.log('TV stats:', JSON.stringify(statsCheck));
  await tv.screenshot({ path: 'tasks/tmp-r1-qa-b-tv-stats-2.png' });
  console.log('SCREENSHOT: b-tv-stats-2');
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Ẩn kết quả lớp' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(1500);

  // === 4) Resume phiên (bấm Chạy) ===
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Chạy' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(1500);
  const runState = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => ['Chạy', 'Tạm dừng'].includes((b.textContent || '').trim()));
    return btn ? btn.textContent.trim() : null;
  });
  console.log('Phiên sau resume — nút hiện tại:', runState, '(kỳ vọng "Tạm dừng" = đang chạy)');

  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
