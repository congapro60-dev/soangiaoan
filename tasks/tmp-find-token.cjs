// Tìm phiên GV: localStorage keys + indexedDB.databases()
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1200, height: 800 });
  await gv.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  const info = await gv.evaluate(async () => {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/firebase|auth/i.test(k)) ls[k] = (localStorage.getItem(k) || '').slice(0, 120);
    }
    let dbs = [];
    try { dbs = await indexedDB.databases(); } catch (e) { dbs = [{ name: 'ERR', error: String(e) }]; }
    return { lsKeys: Object.keys(ls), lsSample: ls, dbs: dbs.map((d) => d.name) };
  });
  console.log('LS KEYS:', info.lsKeys.join(', ') || '(trống)');
  console.log('LS SAMPLE:', JSON.stringify(info.lsSample).slice(0, 400));
  console.log('IDB DATABASES:', info.dbs.join(', ') || '(trống)');
  await gv.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
