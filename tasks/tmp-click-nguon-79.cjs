// Bấm "Tạo từ giáo án nguồn" rồi xem nội dung trang/modal sau khi mở
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
  const t = targets.find((x) => x.type === 'page' && x.url.startsWith('https://giaoandewey.vercel.app/adaptive-lessons'));
  if (!t) { console.log('NO_TAB'); process.exit(2); }
  const cdp = await connect(t.webSocketDebuggerUrl);
  const clickExpr = '(function(){const els=Array.from(document.querySelectorAll("button, a, [role=button]"));const el=els.find(x=>(x.textContent||"").trim()==="Tạo từ giáo án nguồn"&&x.getBoundingClientRect().width>0);if(!el)return{clicked:false};el.click();return{clicked:true};})()';
  const c1 = await cdp.send('Runtime.evaluate', { expression: clickExpr, returnByValue: true });
  console.log('CLICK ' + JSON.stringify(c1.result && c1.result.value));
  await sleep(4000);
  const dump = await cdp.send('Runtime.evaluate', { expression: '(function(){return {url: location.href, text: (document.body.innerText||"").replace(/\\s+/g," ").slice(0,900)}})()', returnByValue: true });
  cdp.close(); await sleep(400);
  console.log('PAGE ' + JSON.stringify(dump.result && dump.result.value));
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
