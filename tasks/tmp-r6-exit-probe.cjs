// Probe exit ticket chặng 11 — bài 12-11-78: dump controls + textarea/input + buttons
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = require('./tmp-r6-qa-session.json');
(async () => {
  let hb;
  try { hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null }); }
  catch (e) { console.log('HS Edge chết'); process.exit(2); }
  const hs = await hb.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  // join nếu cần
  for (let i = 0; i < 6; i++) {
    const hasForm = await hs.evaluate(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(600);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(4000);
  }
  console.log('HS in lesson:', /ĐANG HỌC|Chặng \d+\/12/.test(await hs.evaluate(() => document.body.innerText)));
  const dump = await hs.evaluate(() => ({
    text: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1600),
    buttons: Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 50), dis: b.disabled })).filter((x) => x.t).slice(0, 25),
    inputs: Array.from(document.querySelectorAll('textarea, input')).map((e) => ({ tag: e.tagName, type: e.type || '', ph: e.placeholder || '', vis: e.offsetParent !== null })),
  }));
  console.log('TEXT:', dump.text.replace(/\n/g, ' | '));
  console.log('BUTTONS:', JSON.stringify(dump.buttons));
  console.log('INPUTS:', JSON.stringify(dump.inputs));
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
