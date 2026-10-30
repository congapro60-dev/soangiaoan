const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const baseBrowser = await puppeteer.connect({ browserWSEndpoint: v9222.webSocketDebuggerUrl, defaultViewport: null });
  const context = await baseBrowser.createBrowserContext();
  const hp = await context.newPage();
  await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  const url = 'https://giaoandewey-feh9yzjrd-congapro60-devs-projects.vercel.app/adaptive-live/s2BQiDi8r0bdS2jRG9v8?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
  await hp.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for select element to appear
  await hp.waitForSelector('select', { timeout: 15000 });
  console.log('Select element found!');

  const optValue = await hp.evaluate(() => {
    const s = document.querySelector('select');
    const opt = Array.from(s.options).find(o => o.textContent.includes('Đặng Tuệ Minh'));
    return opt ? opt.value : null;
  });
  console.log('Tuệ Minh option value:', optValue);

  await hp.select('select', optValue);
  await hp.waitForSelector('input[type="password"]');
  await hp.type('input[type="password"]', '2750', { delay: 50 });

  await sleep(1000);
  const btnDisabled = await hp.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Vào lớp'));
    return b ? b.disabled : null;
  });
  console.log('Button disabled?', btnDisabled);

  // Click button
  await hp.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Vào lớp'));
    if (b) b.click();
  });

  console.log('Waiting for live classroom to mount...');
  await sleep(6000);

  // Mở details đề bài
  await hp.evaluate(() => {
    const d = document.querySelector('details');
    if (d) d.open = true;
  });
  await sleep(1500);

  const finalCheck = await hp.evaluate(() => {
    const zoom = document.querySelector('.math-diagram-container');
    const zoomToolbar = document.querySelector('.math-diagram-toolbar');
    const zoomBtns = Array.from(document.querySelectorAll('.math-diagram-container button')).map(b => ({
      label: b.getAttribute('aria-label') || b.innerText,
      rect: b.getBoundingClientRect()
    }));

    const uploader = document.querySelector('.student-paper-photo');
    const uploaderBtn = document.querySelector('.student-paper-photo-btn');
    const uploaderBtnStyle = uploaderBtn ? window.getComputedStyle(uploaderBtn) : null;

    const askBtn = document.querySelector('.student-ask-btn');
    const askBtnStyle = askBtn ? window.getComputedStyle(askBtn) : null;

    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const inputFontSizes = inputs.map(el => ({ tag: el.tagName, fontSize: window.getComputedStyle(el).fontSize }));

    return {
      hasZoom: !!zoom,
      hasZoomToolbar: !!zoomToolbar,
      zoomButtons: zoomBtns,
      hasUploader: !!uploader,
      uploaderText: uploaderBtn ? uploaderBtn.innerText : null,
      uploaderBtnMinHeight: uploaderBtnStyle ? uploaderBtnStyle.minHeight : null,
      studentAskBtnMinHeight: askBtnStyle ? askBtnStyle.minHeight : null,
      inputFontSizes
    };
  });

  console.log('====================================');
  console.log('VERIFIED ASS-MDP-01 LIVE MOBILE AUDIT:');
  console.log(JSON.stringify(finalCheck, null, 2));
  console.log('====================================');

  await hp.screenshot({ path: 'tasks/tmp-mdp-live-mobile-verified.png', fullPage: false });
  console.log('SAVED tasks/tmp-mdp-live-mobile-verified.png');

  await context.close();
})();
