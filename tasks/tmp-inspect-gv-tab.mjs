import WebSocket from 'ws';

async function run() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/E9DBEE45FDA6454ACD6F06DAA2841917');
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
  console.log('WS connected');

  const info = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.innerText.trim());
        const bodySnippet = document.body.innerText.slice(0, 300);
        return {
          title: document.title,
          url: window.location.href,
          tabs,
          hasDialog: !!dialog,
          dialogText: dialog ? dialog.innerText.slice(0, 300) : null,
          bodySnippet
        };
      })()
    `,
    returnByValue: true
  });

  console.log('STATE OF TAB 0:', info?.result?.value);
  ws.close();
}

run().catch(console.error);
