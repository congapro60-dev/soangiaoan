const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUDENT_LINK = 'https://giaoandewey.vercel.app/adaptive-live/s2BQiDi8r0bdS2jRG9v8?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';

(async () => {
  try {
    const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
    const baseBrowser = await puppeteer.connect({ browserWSEndpoint: v9222.webSocketDebuggerUrl, defaultViewport: null });
    const context = await baseBrowser.createBrowserContext();

    const hp = await context.newPage();
    await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    // Enable cache bypass
    const cdp = await hp.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);

    // Login
    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel?.options || []).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inp = document.querySelector('input[type="password"]');
      if (inp) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp');
      if (b) b.click();
    });

    await sleep(6000);

    const inspection = await hp.evaluate(() => {
      const details = document.querySelector('details');
      const summary = details?.querySelector('summary')?.innerText;
      const detailsContent = details?.innerText;
      const zoom = details?.querySelector('.math-diagram-container');
      const allClassNames = Array.from(document.querySelectorAll('*')).map(el => el.className).filter(Boolean);
      return {
        hasDetails: !!details,
        summary,
        detailsContentSnippet: detailsContent?.slice(0, 300),
        hasZoomInsideDetails: !!zoom,
        diagramRelatedClasses: allClassNames.filter(c => typeof c === 'string' && (c.includes('math') || c.includes('diagram') || c.includes('zoom'))),
        hasUploaderClass: allClassNames.some(c => typeof c === 'string' && c.includes('student-paper-photo'))
      };
    });

    console.log('INSPECTION RESULT:\n', JSON.stringify(inspection, null, 2));

    await hp.close();
  } catch (e) {
    console.error(e);
  }
})();
