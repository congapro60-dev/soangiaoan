const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUDENT_LINK = 'https://giaoandewey-feh9yzjrd-congapro60-devs-projects.vercel.app/adaptive-live/s2BQiDi8r0bdS2jRG9v8?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';

(async () => {
  try {
    const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
    const baseBrowser = await puppeteer.connect({ browserWSEndpoint: v9222.webSocketDebuggerUrl, defaultViewport: null });
    const context = await baseBrowser.createBrowserContext();

    const hp = await context.newPage();
    await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    console.log('Navigating directly to deployment student link with cache disabled...');
    const cdp = await hp.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);

    // Select Tuệ Minh & enter PIN 2750
    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel?.options || []).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inp = document.querySelector('input[type=\"password\"]');
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp');
      if (b) b.click();
    });

    console.log('Clicked Vào lớp, waiting for live UI...');
    await sleep(6000);

    // Open details
    await hp.evaluate(() => {
      const d = document.querySelector('details');
      if (d) d.open = true;
    });
    await sleep(1000);

    const audit = await hp.evaluate(() => {
      const zoom = document.querySelector('.math-diagram-container');
      const zoomToolbar = document.querySelector('.math-diagram-toolbar');
      const zoomBtns = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
        label: b.getAttribute('aria-label') || b.innerText,
        rect: b.getBoundingClientRect()
      }));

      const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label=\"Chụp ảnh bài làm giấy\"]');
      const uploaderBtn = document.querySelector('.student-paper-photo-btn') || uploader?.querySelector('button');

      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      const fontSizes = inputs.map(el => ({ tag: el.tagName, fontSize: window.getComputedStyle(el).fontSize }));

      // Check min-height >= 44px on coarse pointer
      const testBtn = document.querySelector('.student-ask-btn');
      const testBtnHeight = testBtn ? window.getComputedStyle(testBtn).minHeight : null;

      return {
        url: window.location.href,
        hasZoom: !!zoom,
        hasZoomToolbar: !!zoomToolbar,
        zoomButtons: zoomBtns,
        hasUploader: !!uploader,
        uploaderText: uploaderBtn ? uploaderBtn.innerText : null,
        uploaderRect: uploaderBtn ? uploaderBtn.getBoundingClientRect() : null,
        inputFontSizes: fontSizes,
        studentAskBtnMinHeight: testBtnHeight
      };
    });

    console.log('AUDIT RESULT:\\n', JSON.stringify(audit, null, 2));

    await hp.screenshot({ path: 'tasks/tmp-mdp-live-mobile-verified.png', fullPage: false });
    console.log('SAVED tasks/tmp-mdp-live-mobile-verified.png');

    await context.close();
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
