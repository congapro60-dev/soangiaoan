const puppeteer = require('puppeteer');
(async () => {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });
  const pages = await browser.pages();
  for (const p of pages) {
    let txt = '';
    try { txt = await p.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); } catch (e) { txt = '(eval lỗi: ' + e.message.slice(0, 60) + ')'; }
    const sid = (txt.match(/Đã tạo phiên chung:\s*(\S+)/) || [])[1] || null;
    const links = txt.includes('/adaptive-live/') ? 'CÓ link live' : 'không link live';
    console.log('URL:', p.url().slice(0, 90));
    console.log('  sessionId:', sid, '|', links, '| len:', txt.length);
    if (sid) {
      console.log('  TEXT QUANH:', txt.slice(Math.max(0, txt.indexOf('Đã tạo phiên chung') - 200), txt.indexOf('Đã tạo phiên chung') + 800).replace(/\n+/g, ' | '));
    }
  }
  await browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
