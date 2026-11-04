const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => (p.url() || '').includes('giaoandewey-g3bwgdjev'));
  if (!page) {
    console.log('No page found');
    process.exit(1);
  }

  // Get current auth state
  const auth = await page.evaluate(() => {
    return {
      keys: Object.keys(localStorage),
      user: localStorage.getItem('smartplan_user') || localStorage.getItem('user'),
      firebase: Object.keys(localStorage).filter(k => k.startsWith('firebase:authUser'))
    };
  });
  console.log('AUTH ON g3bwgdjev:', auth);

  // If no user, copy auth from https://giaoandewey.vercel.app/
  const prodPage = pages.find((p) => p.url() === 'https://giaoandewey.vercel.app/');
  if (prodPage) {
    const prodStorage = await prodPage.evaluate(() => {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        dump[k] = localStorage.getItem(k);
      }
      return dump;
    });
    console.log('COPYING PROD STORAGE KEYS:', Object.keys(prodStorage));
    await page.evaluate((data) => {
      for (const k in data) {
        localStorage.setItem(k, data[k]);
      }
    }, prodStorage);
    console.log('Reloading page after storage copy...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
  }

  const checkBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')));
    return {
      btnText: btn?.textContent?.trim(),
      disabled: btn?.disabled
    };
  });
  console.log('CHECK BUTTON STATUS:', checkBtn);

  await browser.disconnect();
})();
