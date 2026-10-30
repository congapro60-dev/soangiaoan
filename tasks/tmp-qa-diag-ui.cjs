// UI diagnostic trong library mode: dump buttons/radios
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
      api.push({ a: a && a[1], s: r.status(), res: JSON.stringify(b).slice(0, 320) });
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
  const ui = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 45), dis: b.disabled })).filter((x) => x.t);
    const radios = document.querySelectorAll('input[type=radio]').length;
    const options = Array.from(document.querySelectorAll('label, [class*="option"]')).map((o) => (o.innerText || '').trim().slice(0, 40)).filter((s) => /^[A-D]/.test(s)).slice(0, 8);
    return { btns: btns.slice(0, 25), radios, options };
  });
  console.log('UI:', JSON.stringify(ui, null, 1).slice(0, 1800));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
