// B8-A5 — Chứng minh gửi trống bị chặn: xoá textarea, click Gửi, TV count phải giữ nguyên
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tvCount(tv) {
  return tv.evaluate(() => {
    const m = (document.body.innerText || '').match(/(\d+)\s*\n?\s*học sinh đã gửi/);
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
  const tv = pages.find((p) => p.url().includes('mode=tv&'));
  if (!gv || !hs || !tv) throw new Error('Thiếu trang');

  // Bật stats để quan sát count
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Hiện kết quả lớp' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(4000);
  const before = await tvCount(tv);
  console.log('Count trước:', before);

  // Xoá sạch textarea rồi click Gửi
  const cleared = await hs.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  await sleep(400);
  const clicked = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Gửi câu trả lời' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  await sleep(4000);
  const after = await tvCount(tv);
  console.log('Textarea xoá:', cleared, '| Click Gửi:', clicked, '| Count sau click trống:', after, '(kỳ vọng', before, '— không tăng = bị chặn)');

  // Tắt stats trả trạng thái
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Ẩn kết quả' && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(1500);
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
