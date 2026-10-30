// B8-A4 — QA B: S4 (chặng 5/12) PA1 (14,9 chỉ panel GV), CasioKeyGuide ẨN, HS gửi Đ/S + phản biện,
// gửi trống bị chặn, TV stats "Lựa chọn của lớp"
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r1-qa-session.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page, n) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}

async function clickBtn(page, label) {
  return page.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}

async function gvStage(gv) {
  return gv.evaluate(() => {
    const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/);
    return m ? Number(m[1]) : null;
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

  // Mở trang TV (mode=tv) nếu chưa có
  let tv = pages.find((p) => p.url().includes('mode=tv&') || p.url().endsWith('mode=tv'));
  if (!tv) {
    tv = await browser.newPage();
    await tv.setViewport({ width: 1280, height: 720 });
    await tv.goto(SESSION.links.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(8000);
  }
  for (let i = 0; i < 10; i++) {
    const ok = await tv.evaluate(() => (document.body.innerText || '').length > 100);
    if (ok) break;
    await sleep(2000);
  }
  console.log('TV page mở:', await tv.title());

  // GV tiến tới chặng 5/12 (S4 AI-error)
  let stage = await gvStage(gv);
  console.log('Stage đầu:', stage);
  while (stage !== null && stage < 5) {
    await clickBtn(gv, 'Sau →');
    await sleep(2200);
    stage = await gvStage(gv);
    console.log('→ stage', stage);
  }
  await sleep(3000);

  // === Dump 3 màn tại S4 ===
  const gvText = await dump(gv);
  const hsText = await dump(hs);
  const tvText = await dump(tv);
  console.log('== GV S4 (2600) ==\n' + gvText.slice(0, 2600));
  console.log('== HS S4 (2200) ==\n' + hsText.slice(0, 2200));
  console.log('== TV S4 (1600) ==\n' + tvText.slice(0, 1600));

  // === PA1 checks ===
  const spoilers = ['14,9', '149/10', '14.9', '149÷10'];
  const pa1 = {
    hs: spoilers.filter((s) => hsText.includes(s)),
    tv: spoilers.filter((s) => tvText.includes(s)),
    gvHas14_9: gvText.includes('14,9'),
    faulty37_25: { gv: gvText.includes('37,25'), hs: hsText.includes('37,25'), tv: tvText.includes('37,25') },
  };
  console.log('PA1 — spoiler trong HS/TV:', JSON.stringify(pa1));

  // === Casio check (HS + TV) ===
  const casio = await hs.evaluate(() => ({
    dom: Boolean(document.querySelector('.student-casio-guide')),
    text: (document.body.innerText || '').includes('Casio fx-580VN X'),
  }));
  const casioTv = await tv.evaluate(() => (document.body.innerText || '').includes('Casio fx-580VN X'));
  console.log('CasioKeyGuide HS:', JSON.stringify(casio), '| TV chứa Casio:', casioTv);

  await gv.screenshot({ path: 'tasks/tmp-r1-qa-b-gv-s4.png' });
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-b-hs-s4.png' });
  await tv.screenshot({ path: 'tasks/tmp-r1-qa-b-tv-s4.png' });
  console.log('SCREENSHOTS: b-gv-s4, b-hs-s4, b-tv-s4');

  // === HS submit flow ===
  const hsButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 60), dis: b.disabled, pressed: b.getAttribute('aria-pressed') })));
  console.log('HS buttons tại S4:', JSON.stringify(hsButtons.filter((b) => b.t && b.t.length < 60)));
  const taCount = await hs.evaluate(() => document.querySelectorAll('textarea').length);
  console.log('HS textarea count:', taCount);

  // 1) Gửi khi CHƯA chọn Đ/S (boolean bắt buộc chọn) — nếu có nút Gửi bị disabled vì !selectedValue
  const beforeSelect = await hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => /^Gửi (câu trả lời|nội dung viết|lựa chọn)$/.test((b.textContent || '').trim()));
    return btns.map((b) => ({ t: (b.textContent || '').trim(), dis: b.disabled }));
  });
  console.log('Nút Gửi trước khi chọn:', JSON.stringify(beforeSelect));

  // 2) Chọn Đ/S ("Chưa đúng" = phản đối 37,25)
  const chose = await clickBtn(hs, 'Chưa đúng');
  if (!chose) await clickBtn(hs, 'Đúng');
  await sleep(700);
  const pressed = await hs.evaluate(() => Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map((b) => (b.textContent || '').trim()));
  console.log('Đã chọn (aria-pressed):', JSON.stringify(pressed));

  // 3) Gửi text RỖNG — click nút Gửi nội dung viết khi textarea trống → phải bị chặn (không "Đang gửi…")
  const emptyResult = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi nội dung viết' && !b.disabled);
    if (btn) { btn.click(); return { clicked: true }; }
    return { clicked: false };
  });
  await sleep(2500);
  const statusAfterEmpty = await hs.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="status"], .student-status, aside'));
    return els.map((e) => (e.textContent || '').trim().slice(0, 100)).filter(Boolean);
  });
  console.log('Click Gửi (text rỗng):', JSON.stringify(emptyResult), '| status sau:', JSON.stringify(statusAfterEmpty));

  // 4) Viết phản biện rồi gửi
  await hs.evaluate(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'Sai vì chiều cao trung bình không thể vượt giá trị lớn nhất 20 cm; bạn An đã chia cho 4 dòng bảng thay vì 10 số liệu.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(500);
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi nội dung viết' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(3500);
  const statusAfterSend = await hs.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="status"], aside'));
    return els.map((e) => (e.textContent || '').trim().slice(0, 120)).filter(Boolean);
  });
  console.log('Status sau gửi:', JSON.stringify(statusAfterSend));
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-b-hs-s4-submitted.png' });
  console.log('SCREENSHOT: b-hs-s4-submitted');

  // 5) GV bật "Hiện kết quả lớp" → TV hiện stats "Lựa chọn của lớp"
  await clickBtn(gv, 'Hiện kết quả lớp');
  await sleep(4000);
  const tvStats = await dump(tv);
  console.log('TV chứa "Lựa chọn của lớp":', tvStats.includes('Lựa chọn của lớp'));
  console.log('== TV stats (1200) ==\n' + tvStats.slice(0, 1200));
  await tv.screenshot({ path: 'tasks/tmp-r1-qa-b-tv-stats.png' });
  console.log('SCREENSHOT: b-tv-stats');
  await clickBtn(gv, 'Ẩn kết quả lớp');
  await sleep(2000);
  console.log('Đã tắt stats (tránh khoá think window HS).');

  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
