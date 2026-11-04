// Nộp diagnostic library mode → kiểm studentAdaptiveLibrarySubmit scored:false
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const api = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom') && r.request().method() === 'POST') {
      let b = null; try { b = await r.json(); } catch {}
      const a = (r.request().postData() || '').match(/"action":"([^"]+)"/);
      api.push({ a: a && a[1], s: r.status(), res: JSON.stringify(b).slice(0, 420) });
    }
  });
  await page.goto('https://giaoandewey.vercel.app/adaptive-library/adaptive-1792833009074', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('input')).filter((e) => e.offsetParent !== null && !e.readOnly && (e.placeholder || '').toUpperCase().indexOf('PIN') === -1);
    const v = ['Lò Mai Phương Chi (QA)', '12LoTrinh1', 'PHUONGCHI-QA'];
    fields.slice(0, 3).forEach((el, i) => {
      const s = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set;
      s.call(el, v[i] || v[2]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await sleep(800);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Bắt đầu học/.test((x.textContent || '')) && !x.disabled); if (b) b.click(); });
  await sleep(6000);
  // Chọn radio đầu tiên của mỗi nhóm câu
  const picked = await page.evaluate(() => {
    const groups = {};
    document.querySelectorAll('input[type=radio]').forEach((r) => { (groups[r.name] = groups[r.name] || []).push(r); });
    let n = 0;
    for (const g of Object.values(groups)) { if (g[0] && !g[0].checked) { g[0].click(); n++; } }
    return { groups: Object.keys(groups).length, picked: n };
  });
  console.log('radios picked:', JSON.stringify(picked));
  await sleep(1000);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Nộp test/.test((x.textContent || '')) && !x.disabled); if (b) b.click(); });
  await sleep(15000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('SAU NỘP (350):', t.slice(0, 350).replace(/\n/g, ' | '));
  console.log('API:');
  api.forEach((c) => console.log(' ', c.a, c.s, '→', c.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
