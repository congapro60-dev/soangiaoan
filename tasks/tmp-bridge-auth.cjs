const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const prodPage = await browser.newPage();
  await prodPage.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  // Lấy toàn bộ cookies và localStorage
  const cookies = await prodPage.cookies();
  const storage = await prodPage.evaluate(() => {
    const s = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      s[k] = localStorage.getItem(k);
    }
    return s;
  });

  console.log('COOKIES COUNT:', cookies.length);
  console.log('STORAGE KEYS:', Object.keys(storage));

  // Chuyển sang preview deployment
  const targetUrl = 'https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app/adaptive-lessons';
  const previewPage = await browser.newPage();
  await previewPage.goto('https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app', { waitUntil: 'networkidle2', timeout: 45000 });
  
  // Set cookies
  const previewCookies = cookies.map(c => ({
    ...c,
    domain: 'giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app'
  }));
  await previewPage.setCookie(...previewCookies);

  // Set localStorage
  await previewPage.evaluate((s) => {
    for (const k in s) {
      localStorage.setItem(k, s[k]);
    }
  }, storage);

  await previewPage.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  const text = await previewPage.evaluate(() => document.body.innerText.slice(0, 600));
  console.log('PREVIEW PAGE WITH AUTH:\n', text);

  const btnStatus = await previewPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')));
    return {
      text: btn?.textContent?.trim(),
      disabled: btn?.disabled
    };
  });
  console.log('BUTTON STATUS:', btnStatus);

  await prodPage.close();
  await previewPage.close();
  await browser.disconnect();
})();
