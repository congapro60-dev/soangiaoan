// QA nộp diagnostic trong chế độ học lại — server chấm scored:false
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LESSON = 'https://giaoandewey.vercel.app/adaptive-library/adaptive-1792833009074';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const api = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom') && r.request().method() === 'POST') {
      let b = null; try { b = await r.json(); } catch {}
      const a = (r.request().postData() || '').match(/"action":"([^"]+)"/);
      api.push({ a: a && a[1], s: r.status(), res: JSON.stringify(b).slice(0, 260) });
    }
  });
  const dump = () => page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const clickFirst = (rx) => page.evaluate((p) => { const re = new RegExp(p); const b = Array.from(document.querySelectorAll('button')).find((x) => re.test((x.textContent || '').trim()) && !x.disabled && x.offsetParent !== null); if (b) { b.click(); return (b.textContent || '').trim().slice(0, 50); } return null; }, rx);

  await page.goto(LESSON, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  // Bước 1 — điền thông tin
  const filled = await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('input')).filter((e) => e.offsetParent !== null && !e.readOnly && (e.placeholder || '').toUpperCase().indexOf('PIN') === -1 && (e.type || 'text') !== 'password');
    const values = ['Lò Mai Phương Chi (QA học lại)', '12LoTrinh1', 'PHUONGCHI-QA'];
    fields.slice(0, 3).forEach((el, i) => {
      const set = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set;
      set.call(el, values[i] || values[2]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return fields.length;
  });
  console.log('identify điền:', filled);
  await sleep(800);
  console.log('btn:', await clickFirst('Tiếp theo|Bước tiếp|Bắt đầu|Vào bài'));
  await sleep(6000);
  let t = await dump();
  console.log('STAGE:', t.includes('Test đầu giờ') || t.includes('kiểm tra đầu vào') || t.includes('BƯỚC 2') ? 'diagnostic ✓' : '?');
  // Chọn đáp án câu 1-2 (bấm option đầu tiên của từng câu)
  for (let q = 0; q < 6; q++) {
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => /^[A-D][.\s]/.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled);
      if (!btns.length) return null;
      btns[0].click();
      return (btns[0].textContent || '').trim().slice(0, 30);
    });
    if (clicked === null) break;
    await sleep(700);
    // nộp/nếu nút nộp hiện
    const submit = await clickFirst('Nộp|Hoàn thành|Gửi bài');
    if (submit) { console.log('Đã bấm nộp ở câu', q + 1); break; }
  }
  await sleep(12000);
  t = await dump();
  console.log('SAU NỘP (400):', t.slice(0, 400).replace(/\n/g, ' | '));
  console.log('API:');
  api.forEach((c) => console.log(' ', c.a, c.s, '→', c.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
