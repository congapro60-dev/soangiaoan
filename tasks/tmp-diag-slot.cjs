const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null });
  const pages = await hs.pages();
  const hp = pages[pages.length - 1];
  const t = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  const info = await hp.evaluate(() => {
    const slot = document.querySelector('[data-slot="published-question"]');
    const sec = document.querySelector('.student-published-question');
    return { slotExists: Boolean(slot), secExists: Boolean(sec), slotHtml: slot ? slot.innerHTML.slice(0, 200) : '(none)' };
  });
  console.log('TEXT (400):', t.slice(0, 400).replace(/\n/g, ' | '));
  console.log('DOM:', JSON.stringify(info));
  await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
