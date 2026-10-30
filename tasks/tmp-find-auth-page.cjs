const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const url = p.url();
    if (url.includes('giaoandewey') || url.includes('vercel.app')) {
      const fb = await p.evaluate(() => {
        const k = Object.keys(localStorage).filter(x => x.startsWith('firebase:authUser'));
        return { keys: k, val: k.length > 0 ? localStorage.getItem(k[0])?.slice(0, 50) : null };
      });
      console.log(`[Page ${i}] ${url} ->`, fb);
    }
  }
  await browser.disconnect();
})();
