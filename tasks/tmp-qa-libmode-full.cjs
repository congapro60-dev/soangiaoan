// QA full chế độ học lại: login lớp → mở bài strip → diagnostic → server chấm (scored:false)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const LESSON = '/adaptive-library/adaptive-1792833009074';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const apiCalls = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom')) {
      let b = null; try { b = await r.json(); } catch {}
      const action = (r.request().postData() || '').match(/"action":"([^"]+)"/)?.[1];
      apiCalls.push({ action, status: r.status(), res: JSON.stringify(b).slice(0, 200) });
    }
  });
  const dump = () => page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const clickText = (rx) => page.evaluate((p) => { const re = new RegExp(p); const b = Array.from(document.querySelectorAll('button')).find((x) => re.test((x.textContent || '').trim()) && !x.disabled && x.offsetParent !== null); if (b) { b.click(); return (b.textContent || '').trim().slice(0, 40); } return null; }, rx);
  const fillFirst = (value, placeholderHint) => page.evaluate((v, hint) => {
    const el = Array.from(document.querySelectorAll('input, textarea')).find((e) => e.offsetParent !== null && (hint ? (e.placeholder || '').toLowerCase().includes(hint) : !e.readOnly));
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, value, placeholderHint || '');

  // 1) Login lớp
  await page.goto(APP + '/lop/R6RCFC', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (sel) {
      const opt = Array.from(sel.options).find((o) => o.textContent.trim().includes('Tuệ Minh'));
      if (opt) { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().includes('PIN'));
    if (inp) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(inp, '2750'); inp.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await sleep(800);
  console.log('login btn:', await clickText('Đăng nhập|Vào lớp|Xác nhận'));
  await sleep(6000);

  // 2) Mở bài học lại
  await page.goto(APP + LESSON, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  let t = await dump();
  console.log('PORTAL:', /Cổng học sinh/i.test(t) ? '✓' : '✗', '| notice học lại:', t.includes('Chế độ học lại') ? '✓' : '✗', '| TITLE bài:', (t.split('\n').find((l) => /Khoảng biến thiên/.test(l)) || '').slice(0, 60));
  // 3) BƯỚC 1 — identify: điền tên/lớp/mã nếu có ô
  const fillRes = await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('input')).filter((e) => e.offsetParent !== null && !e.readOnly && (e.placeholder || '').toUpperCase().indexOf('PIN') === -1);
    const values = ['Đặng Tuệ Minh', '11Columbus', 'TUEMINH-QA'];
    fields.slice(0, 3).forEach((el, i) => {
      const set = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set;
      set.call(el, values[i] || values[2]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return fields.length;
  });
  console.log('identify fields điền:', fillRes);
  await sleep(800);
  console.log('nút Bước tiếp:', await clickText('Tiếp theo|Bước tiếp|Bắt đầu'));
  await sleep(4000);
  t = await dump();
  console.log('STAGE sau bước 1:', t.includes('Test đầu giờ') || t.includes('kiểm tra đầu vào') || t.includes('BƯỚC 2') ? '→ diagnostic' : '(vẫn identify?)');
  console.log('API:'); apiCalls.forEach((c) => console.log(' ', c.action, c.status, '→', c.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
