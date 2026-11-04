// Navigate một tab Edge 9222 sang /adaptive-lessons rồi ping
const CDP_HTTP = 'http://127.0.0.1:9222';
const TARGET = 'https://giaoandewey.vercel.app/adaptive-lessons';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve: rs, reject: rj } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) rj(new Error('CDP ' + JSON.stringify(m.error).slice(0, 200)));
        else rs(m.result);
      }
    };
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((rs, rj) => {
        const id = ++msgId;
        pending.set(id, { resolve: rs, reject: rj });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => { try { ws.close(); } catch (_) {} },
    });
    ws.onerror = () => reject(new Error('WS_ERROR'));
  });
}

(async () => {
  const res = await fetch(CDP_HTTP + '/json');
  const targets = await res.json();
  // Ưu tiên tab gốc giaoandewey (dashboard), tránh tab live HS
  const t = targets.find((x) => x.type === 'page' && x.url === 'https://giaoandewey.vercel.app/')
    || targets.find((x) => x.type === 'page' && x.url.startsWith('https://giaoandewey.vercel.app') && !x.url.includes('adaptive-live'));
  if (!t) { console.log('NO_TAB'); process.exit(2); }
  console.log('USE ' + t.id.slice(0, 12) + ' ' + t.url);
  const cdp = await connect(t.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: TARGET });
  await sleep(12000);
  const check = await cdp.send('Runtime.evaluate', { expression: '(function(){return {href: location.href, ok: (document.body.innerText||"").indexOf("Thư viện bài dạy") !== -1, sample: (document.body.innerText||"").replace(/\\s+/g," ").slice(0,200)}})()', returnByValue: true });
  cdp.close();
  await sleep(500);
  console.log('CHECK ' + JSON.stringify(check.result && check.result.value).slice(0, 400));
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
