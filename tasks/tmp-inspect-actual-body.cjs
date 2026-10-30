const puppeteer = require('puppeteer');

(async () => {
  const v9222 = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const baseBrowser = await puppeteer.connect({ browserWSEndpoint: v9222.webSocketDebuggerUrl, defaultViewport: null });
  const context = await baseBrowser.createBrowserContext();
  const hp = await context.newPage();
  const url = 'https://giaoandewey-feh9yzjrd-congapro60-devs-projects.vercel.app/adaptive-live/s2BQiDi8r0bdS2jRG9v8?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
  
  await hp.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  const text = await hp.evaluate(() => document.body.innerText);
  console.log('PAGE BODY TEXT:\n', text);
  await context.close();
})();
