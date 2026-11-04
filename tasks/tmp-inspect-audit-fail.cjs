const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => (p.url() || '').includes('giaoandewey-g3bwgdjev'));

  if (!page) {
    console.log('No preview page found');
    process.exit(1);
  }

  // Chạy trực tiếp qua console browser để xem báo cáo xuất bản của 10-12-88
  const report = await page.evaluate(async () => {
    // Tìm các hàm hoặc chạy trực tiếp sequentialPublish với key 10-12-88
    return {
      title: document.title,
      url: window.location.href
    };
  });
  console.log('PAGE INFO:', report);

  await browser.disconnect();
})();
