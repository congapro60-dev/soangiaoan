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

  // Check current bundle script tags to find build hash
  const scripts = await send('Runtime.evaluate', {
    expression: 'Array.from(document.querySelectorAll("script[src]")).map(s => s.src)',
    returnByValue: true
  });
  console.log('LOADED SCRIPTS:', scripts?.result?.value);

  // Check if live lesson styles / touch targets exist
  const cssCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const testEl = document.createElement('button');
        testEl.className = 'live-btn';
        document.body.appendChild(testEl);
        const style = window.getComputedStyle(testEl);
        const h = style.minHeight;
        testEl.remove();
        return { liveBtnMinHeight: h, userAgent: navigator.userAgent };
      })()
    `,
    returnByValue: true
  });
  console.log('CSS TOUCH TARGET CHECK:', cssCheck?.result?.value);

  ws.close();
}

run().catch(console.error);
