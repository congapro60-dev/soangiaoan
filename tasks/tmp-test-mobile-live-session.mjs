import WebSocket from 'ws';
import fs from 'fs';

async function run() {
  const wsUrl = 'ws://127.0.0.1:9222/devtools/page/D7FA3C2538E671B9E69378C73EA19C4A';
  const ws = new WebSocket(wsUrl);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === curId) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.on('open', r));

  // Emulate iPhone 14
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });

  // Navigate to live lesson session
  const targetUrl = 'https://giaoandewey.vercel.app/adaptive-live/3jpow388uY6B6aCx0EH7?mode=student&definitionKey=12-11-79&lessonId=adaptive-v4-12-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
  console.log('Navigating to live session...');
  await send('Page.navigate', { url: targetUrl });

  // Wait 6s for React render and data fetch
  await new Promise(r => setTimeout(r, 6000));

  const pageInfo = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label="Chụp ảnh bài làm giấy"]');
        const zoomContainers = document.querySelectorAll('.math-diagram-container');
        const zoomButtons = document.querySelectorAll('.math-diagram-container button');
        const summary = document.querySelector('summary');
        return {
          title: document.title,
          hasUploader: !!uploader,
          zoomContainerCount: zoomContainers.length,
          zoomButtonCount: zoomButtons.length,
          summaryText: summary ? summary.innerText : null,
          bodySnippet: document.body.innerText.slice(0, 300)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('LIVE PAGE DOM INFO:', pageInfo?.result?.value);

  // Take screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    fs.writeFileSync('tasks/tmp-mobile-live-session.png', Buffer.from(shot.data, 'base64'));
    console.log('SAVED tasks/tmp-mobile-live-session.png');
  }

  ws.close();
}

run().catch(console.error);
