// Mở tab mới → dashboard → bấm sidebar "Thư viện" (khi tab gốc đã đóng)
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
  let created = null;
  try { created = await (await fetch(CDP_HTTP + '/json/new?' + encodeURIComponent('https://giaoandewey.vercel.app/'), { method: 'PUT' })).json(); }
  catch (e) { created = await (await fetch(CDP_HTTP + '/json/new?' + encodeURIComponent('https://giaoandewey.vercel.app/'))).json(); }
  console.log('TAB ' + created.id.slice(0, 12));
  await sleep(12000);
  const cdp = await connect(created.webSocketDebuggerUrl);
  for (let i = 0; i < 5; i++) {
    const r = await cdp.send('Runtime.evaluate', { expression: '(function(){const t=(document.body.innerText||"");if(t.indexOf("Thư viện bài dạy")!==-1)return{ok:true};const el=Array.from(document.querySelectorAll("button, a")).find(x=>(x.textContent||"").trim()==="Thư viện"&&x.getBoundingClientRect().width>0);if(el){el.click();return{clicked:true}}return{wait:true}})()', returnByValue: true });
    const v = r.result && r.result.value;
    console.log('NAV ' + JSON.stringify(v));
    if (v && v.ok) break;
    await sleep(4000);
  }
  const chk = await cdp.send('Runtime.evaluate', { expression: '(function(){return {ok:(document.body.innerText||"").indexOf("Thư viện bài dạy")!==-1}})()', returnByValue: true });
  console.log('CHECK ' + JSON.stringify(chk.result && chk.result.value));
  cdp.close(); await sleep(500);
  process.exit(chk.result && chk.result.value && chk.result.value.ok ? 0 : 3);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
