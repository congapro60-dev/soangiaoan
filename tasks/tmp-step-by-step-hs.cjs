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
  await sleep(3000);

  // Check login form
  const loginState = await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const inp = document.querySelector('input[type="password"]');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Vào lớp'));
    return {
      hasSel: !!sel,
      optionsCount: sel?.options?.length,
      hasInp: !!inp,
      hasBtn: !!btn,
      btnDisabled: btn?.disabled
    };
  });
  console.log('LOGIN FORM STATE:', loginState);

  // Select Tuệ Minh
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find(o => o.textContent.includes('Đặng Tuệ Minh'));
    if (opt) {
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const inp = document.querySelector('input[type="password"]');
    if (inp) {
      inp.value = '2750';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(1000);

  // Click Vào lớp
  await hp.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Vào lớp'));
    if (btn) btn.click();
  });
  console.log('Clicked Vào lớp, waiting 8s for live state...');
  await sleep(8000);

  const screenState = await hp.evaluate(() => {
    return {
      textSnippet: document.body.innerText.slice(0, 300),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
      details: !!document.querySelector('details')
    };
  });
  console.log('SCREEN STATE AFTER LOGIN:', screenState);

  await context.close();
})();
