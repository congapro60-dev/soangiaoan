// Liệt kê các link/nav trong sidebar chứa "Thư viện" hoặc "giáo án"
const CDP_HTTP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0; const pending = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { resolve: rs, reject: rj } = pending.get(m.id); pending.delete(m.id); m.error ? rj(new Error(JSON.stringify(m.error))) : rs(m.result); } };
    ws.onopen = () => resolve({ send: (method, params = {}) => new Promise((rs, rj) => { const id = ++msgId; pending.set(id, { resolve: rs, reject: rj }); ws.send(JSON.stringify({ id, method, params })); }), close: () => { try { ws.close(); } catch (_) {} } });
    ws.onerror = () => reject(new Error('WS_ERROR'));
  });
}
(async () => {
  const res = await fetch(CDP_HTTP + '/json');
  const targets = await res.json();
  const t = targets.find((x) => x.type === 'page' && x.url === 'https://giaoandewey.vercel.app/');
  if (!t) { console.log('NO_TAB'); process.exit(2); }
  console.log('USE ' + t.url);
  const cdp = await connect(t.webSocketDebuggerUrl);
  const expr = '(' + function scan() {
    const vis = (x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const els = Array.from(document.querySelectorAll('a, button'));
    const hits = els.filter((x) => { const s = (x.textContent || '').trim(); return vis(x) && /thư viện/i.test(s); })
      .map((x) => ({ tag: x.tagName, txt: (x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), href: x.getAttribute('href') || '' }));
    return hits;
  }.toString() + ')()';
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
  cdp.close(); await sleep(400);
  console.log(JSON.stringify(r.result && r.result.value, null, 1));
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
