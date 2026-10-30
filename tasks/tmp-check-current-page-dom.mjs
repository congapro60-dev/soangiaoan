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

  const pageInfo = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const uploader = document.querySelector('.student-paper-photo') || document.querySelector('[aria-label="Chụp ảnh bài làm giấy"]');
        const zoomContainers = document.querySelectorAll('.math-diagram-container');
        const details = document.querySelector('details');
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        return {
          title: document.title,
          hasUploader: !!uploader,
          zoomContainerCount: zoomContainers.length,
          hasDetails: !!details,
          buttons: buttons.slice(0, 10),
          snippet: document.body.innerText.slice(0, 400)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('CURRENT PAGE DOM:', pageInfo?.result?.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    fs.writeFileSync('tasks/tmp-mobile-live-rendered.png', Buffer.from(shot.data, 'base64'));
    console.log('SAVED tasks/tmp-mobile-live-rendered.png');
  }

  ws.close();
}

run().catch(console.error);
