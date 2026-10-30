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
  console.log('WS Connected');

  // Navigate to real app URL
  await send('Page.navigate', { url: 'https://giaoandewey.vercel.app/' });
  console.log('Navigated to https://giaoandewey.vercel.app/');

  // Wait 4s
  await new Promise(r => setTimeout(r, 4000));

  const doc = await send('Runtime.evaluate', {
    expression: 'document.title + " | URL: " + window.location.href'
  });
  console.log('PAGE TITLE:', doc?.result?.value);

  // Take screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    fs.writeFileSync('tasks/tmp-mobile-dewey-home.png', Buffer.from(shot.data, 'base64'));
    console.log('SAVED tasks/tmp-mobile-dewey-home.png');
  }

  ws.close();
}

run().catch(console.error);
