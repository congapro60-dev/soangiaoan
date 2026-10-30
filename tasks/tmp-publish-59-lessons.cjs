const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    // Tìm trang có storage đăng nhập
    let authStorage = null;
    for (const p of pages) {
      const s = await p.evaluate(() => {
        const k = Object.keys(localStorage).find(x => x.startsWith('firebase:authUser'));
        if (k) {
          const dump = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            dump[key] = localStorage.getItem(key);
          }
          return dump;
        }
        return null;
      });
      if (s) {
        authStorage = s;
        break;
      }
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const targetUrl = 'https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app/adaptive-lessons';
    await page.goto('https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app', { waitUntil: 'networkidle2', timeout: 45000 });
    
    if (authStorage) {
      await page.evaluate((s) => {
        for (const k in s) localStorage.setItem(k, s[k]);
      }, authStorage);
    }

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('CLICKING NÚT: "Tạo và xuất bản 59 bài"...');
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && !b.disabled);
      if (btn) {
        btn.click();
        return btn.textContent.trim();
      }
      return null;
    });

    console.log('CLICK RESULT:', clicked);
    if (!clicked) {
      console.log('Nút không sẵn sàng');
      await page.close();
      await browser.disconnect();
      return;
    }

    // Chờ xuất bản tuần tự
    let lastLog = '';
    for (let i = 0; i < 90; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const status = await page.evaluate(() => {
        const text = document.body.innerText;
        const m = text.match(/Đang xuất bản[^\n]*/);
        return m ? m[0] : null;
      });
      if (status && status !== lastLog) {
        console.log(`[${new Date().toLocaleTimeString()}] ${status}`);
        lastLog = status;
      }
      if (!status && i > 3) {
        console.log('Xuất bản hoàn tất!');
        break;
      }
    }

    // Chuyển sang tab Bài học tương tác kiểm tra
    console.log('Mở tab Bài học tương tác...');
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Bài học tương tác'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    const check = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        has101288: text.includes('10-12-88') || text.includes('Tứ phân vị'),
        snippet: text.slice(0, 800)
      };
    });

    console.log('CHECK LESSON IN INTERACTIVE TAB:', check);
    await page.screenshot({ path: 'tasks/tmp-w12-published-result.png' });
    console.log('SAVED tasks/tmp-w12-published-result.png');

    await page.close();
    await browser.disconnect();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
