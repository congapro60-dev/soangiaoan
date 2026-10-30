// B7 diag3 — đọc firebaseLocalStorageDb xem còn authUser không + mở tab mới chờ auth restore
const puppeteer = require('puppeteer');

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  // Chờ tối đa 30s cho app render
  let rendered = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    rendered = await page.evaluate(() => document.body && document.body.innerText.length > 200);
    if (rendered) break;
  }
  console.log('Rendered:', rendered);
  const auth = await page.evaluate(async () => {
    const out = { localStorageLen: localStorage.length, keys: Object.keys(localStorage).slice(0, 20) };
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('firebaseLocalStorageDb');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction('firebaseLocalStorage', 'readonly');
        const rq = tx.objectStore('firebaseLocalStorage').getAll();
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
      });
      out.idbKeys = rows.map(r => r.fbase_key);
      out.idbSample = rows.filter(r => String(r.fbase_key).includes('authUser')).map(r => {
        const v = r.value || {};
        return { key: r.fbase_key, email: v.email, uid: v.uid, stsAccess: Boolean(v.stsTokenManager) };
      });
    } catch (e) { out.idbErr = e.message; }
    return out;
  });
  console.log('AUTH STATE:', JSON.stringify(auth, null, 1));
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== TEXT (1200) ==\n' + text.slice(0, 1200));
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
