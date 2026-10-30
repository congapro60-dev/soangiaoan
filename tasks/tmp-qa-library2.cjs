// QA cuối — search "Khoảng biến thiên" trong thư viện → mở portal
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await gb.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(APP + '/adaptive-library', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').includes('Tìm tên bài'));
    if (inp) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(inp, 'Khoảng biến thiên');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(1500);
  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="/adaptive-portal/"]')).map((a) => ({ t: (a.textContent || '').trim(), href: a.getAttribute('href') })));
  console.log('SAU SEARCH — link mở bài:', links.length);
  links.slice(0, 5).forEach((l) => console.log(' -', l.t.slice(0, 70), '→', l.href));
  const pick = links[0];
  if (pick) {
    await page.goto(APP + pick.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(8000);
    const t2 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
    console.log('PORTAL MỞ:', /Cổng học sinh/.test(t2) ? '✓ Cổng học sinh' : '(chưa vào portal)', '| Thư viện link:', t2.includes('Thư viện học lại') ? '✓' : '✗');
  }
  await page.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
