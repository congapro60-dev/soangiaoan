// R3 probe — join HS từng bước trên phiên 3, bắt trạng thái sau khi bấm Vào lớp
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-qa-session3.json', 'utf8'));
const OUT = 'tasks/tmp-r3-qa-probe-join.json';
const LOG = { pages: [], steps: [] };

(async () => {
  const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 120000 });
  const pages = await browser.pages();
  for (const p of pages) {
    const u = p.url();
    LOG.pages.push(u.slice(0, 120));
    if (u.includes('adaptive-live')) { await p.close().catch(() => {}); }
  }
  console.log('Pages 9223 trước probe:', JSON.stringify(LOG.pages));

  const hs = await browser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  const t0 = await hs.evaluate(() => (document.body.innerText || '').slice(0, 200));
  LOG.steps.push({ step: 'mở trang', head: t0.replace(/\n/g, ' | ') });
  console.log('Mở trang:', t0.replace(/\n/g, ' | ').slice(0, 160));

  const selInfo = await hs.evaluate(() => {
    const sels = Array.from(document.querySelectorAll('select'));
    return sels.map((s) => ({ n: s.options.length, first: (s.options[0] || {}).textContent || null, visible: s.offsetParent !== null }));
  });
  LOG.steps.push({ step: 'selects', selInfo });
  console.log('Selects:', JSON.stringify(selInfo));

  const picked = await hs.evaluate(() => {
    const sels = Array.from(document.querySelectorAll('select')).filter((s) => s.offsetParent !== null);
    const sel = sels.find((s) => Array.from(s.options).some((o) => o.textContent.trim() === 'Đặng Tuệ Minh'));
    if (!sel) return { ok: false };
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: sel.value };
  });
  await sleep(800);
  LOG.steps.push({ step: 'chọn tên', picked });
  console.log('Chọn tên:', JSON.stringify(picked));

  const pinSet = await hs.evaluate(() => {
    const inp = document.querySelector('input[placeholder="PIN"]');
    if (!inp) return { ok: false };
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, value: inp.value };
  });
  await sleep(600);
  LOG.steps.push({ step: 'PIN', pinSet });
  console.log('PIN:', JSON.stringify(pinSet));

  const btnInfo = await hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null).map((b) => ({ t: (b.textContent || '').trim().slice(0, 30), disabled: b.disabled }));
    return btns;
  });
  LOG.steps.push({ step: 'buttons trước bấm', btnInfo });
  console.log('Buttons:', JSON.stringify(btnInfo));

  const clicked = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  LOG.steps.push({ step: 'click Vào lớp', clicked });
  console.log('Bấm Vào lớp:', clicked);

  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    const t = await hs.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 260));
    LOG.steps.push({ step: 'poll+' + (i + 1) + 's', head: t.replace(/\n/g, ' | ') });
    console.log('+' + (i + 1) + 's:', t.replace(/\n/g, ' | ').slice(0, 200));
  }
  await hs.screenshot({ path: 'tasks/tmp-r3-qa-probe-join.png' });
  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await hs.close().catch(() => {});
  browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8'); process.exit(1); });
