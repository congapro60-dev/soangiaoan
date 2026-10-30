const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUDENT_LINK = 'https://giaoandewey.vercel.app/adaptive-live/s2BQiDi8r0bdS2jRG9v8?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';

(async () => {
  try {
    // Kết nối tới Edge học sinh riêng (port 9223) hoặc tạo incognito context trên 9222
    let browser;
    try {
      const v9223 = await (await fetch('http://127.0.0.1:9223/json/version')).json();
      browser = await puppeteer.connect({ browserWSEndpoint: v9223.webSocketDebuggerUrl, defaultViewport: null });
      console.log('Connected to Student Edge port 9223');
    } catch {
      const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
      const baseBrowser = await puppeteer.connect({ browserWSEndpoint: v9222.webSocketDebuggerUrl, defaultViewport: null });
      const context = await baseBrowser.createBrowserContext();
      browser = context;
      console.log('Created clean incognito context on port 9222');
    }

    const hp = await browser.newPage();
    await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    console.log('Navigating to student link...');
    await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(6000);

    for (let i = 0; i < 10; i++) {
      const hasSel = await hp.evaluate(() => Boolean(document.querySelector('select')));
      if (hasSel) break;
      await sleep(1500);
    }

    // Chọn tên Đặng Tuệ Minh và nhập PIN 2750
    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      if (!sel) return;
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1000);

    await hp.evaluate(() => {
      const inp = document.querySelector('input[type="password"]');
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1000);

    await hp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled);
      if (b) b.click();
    });
    console.log('Clicked Vào lớp, waiting for live classroom screen...');
    await sleep(8000);

    const audit = await hp.evaluate(() => {
      const details = document.querySelector('details');
      const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label="Chụp ảnh bài làm giấy"]');
      const zoomContainer = document.querySelector('.math-diagram-container');
      const zoomButtons = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
        label: b.getAttribute('aria-label') || b.innerText,
        rect: b.getBoundingClientRect()
      }));

      const btns = Array.from(document.querySelectorAll('button'));
      const smallBtns = btns.filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).map(b => ({ text: b.innerText, rect: b.getBoundingClientRect() }));

      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const fontSizes = inputs.map(el => ({ tag: el.tagName, fontSize: window.getComputedStyle(el).fontSize }));

      return {
        url: window.location.href,
        hasDetails: !!details,
        hasUploader: !!uploader,
        uploaderText: uploader ? uploader.innerText : null,
        hasZoomContainer: !!zoomContainer,
        zoomButtons,
        totalButtons: btns.length,
        smallButtons: smallBtns,
        inputFontSizes: fontSizes,
        snippet: document.body.innerText.slice(0, 400)
      };
    });

    console.log('AUDIT LIVE MOBILE SCREEN:\n', JSON.stringify(audit, null, 2));

    await hp.screenshot({ path: 'tasks/tmp-live-mobile-hs-view.png', fullPage: false });
    console.log('SAVED tasks/tmp-live-mobile-hs-view.png');

    // Mở chi tiết đề bài
    if (audit.hasDetails) {
      await hp.evaluate(() => {
        const d = document.querySelector('details');
        if (d) d.open = true;
      });
      await sleep(1500);

      const zoomAfterOpen = await hp.evaluate(() => {
        const z = document.querySelector('.math-diagram-container');
        const btns = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
          label: b.getAttribute('aria-label') || b.innerText,
          rect: b.getBoundingClientRect()
        }));
        return { hasZoom: !!z, zoomButtons: btns };
      });
      console.log('ZOOM AFTER OPEN DETAILS:\n', JSON.stringify(zoomAfterOpen, null, 2));
      await hp.screenshot({ path: 'tasks/tmp-live-mobile-details-open.png', fullPage: false });
      console.log('SAVED tasks/tmp-live-mobile-details-open.png');
    }

    await hp.close();
    console.log('DONE');
  } catch (e) {
    console.error('ERROR in clean context:', e);
  }
})();
