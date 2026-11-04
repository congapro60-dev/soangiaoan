// QA chế độ học lại: library → click bài → login nếu cần → diagnostic submit qua server
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  // 1) Mở library, tìm bài Khoảng biến thiên
  await page.goto(APP + '/adaptive-library', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').includes('Tìm tên bài'));
    if (inp) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(inp, 'Khoảng biến thiên'); inp.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await sleep(1500);
  const link = await page.evaluate(() => { const a = Array.from(document.querySelectorAll('a[href^="/adaptive-portal/library/"]'))[0]; return a ? a.getAttribute('href') : null; });
  console.log('LIB LINK:', link);
  // 2) Mở chế độ học lại
  await page.goto(APP + link, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  let t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const needLogin = /đăng nhập lớp/.test(t);
  console.log('CẦN LOGIN:', needLogin);
  if (needLogin) {
    // Đăng nhập lớp qua /lop: joinCode R6RCFC → chọn Tuệ Minh → PIN
    await page.goto(APP + '/lop/R6RCFC', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(8000);
    let lt = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
    console.log('/lop:', lt.slice(0, 200).replace(/\n/g, ' | '));
    // Điền PIN theo luồng trang (select HS + input PIN + nút)
    const done = await page.evaluate(() => {
      const sel = document.querySelector('select');
      if (sel) {
        const opt = Array.from(sel.options).find((o) => o.textContent.trim().includes('Tuệ Minh'));
        if (opt) { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().includes('PIN') || (e.type === 'password'));
      if (inp) { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(inp, '2750'); inp.dispatchEvent(new Event('input', { bubbles: true })); return { filled: true }; }
      return { filled: false };
    });
    console.log('FILL:', JSON.stringify(done));
    await sleep(800);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Đăng nhập|Vào lớp|Xác nhận/.test((x.textContent || '').trim()) && !x.disabled); if (b) b.click(); });
    await sleep(6000);
    // Vào lại bài
    await page.goto(APP + link, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(10000);
    t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  }
  console.log('PORTAL MODE:', /Chế độ học lại/.test(t) ? '✓ (notice học lại)' : '(không thấy notice)', '| Cổng:', /Cổng học sinh/i.test(t) ? '✓' : '✗', '| Thư viện link:', t.includes('Thư viện học lại') ? '✓' : '✗');
  console.log('BƯỚC 1 (identify):', /Nhập thông tin|Kết nối với lớp học|Học sinh/.test(t) ? '✓' : '?');
  console.log('EXCERPT:', t.slice(0, 500).replace(/\n/g, ' | '));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
