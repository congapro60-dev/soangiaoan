// Soi các element chứa "Thư viện" / "giáo án" trên trang hiện tại
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
  const expr = '(' + function scan() {
    const vis = (x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"], [role="tablist"] *, nav *, aside *'));
    const hits = els.filter((x) => { const s = (x.textContent || '').trim(); return vis(x) && s.length < 80 && (/thư viện/i.test(s) || /giáo án nguồn/i.test(s) || /kho bài/i.test(s)); })
      .map((x) => ({ tag: x.tagName, cls: (x.className || '').toString().slice(0, 60), txt: (x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), href: x.getAttribute('href') || '' }));
    const uniq = []; const seen = new Set();
    for (const h of hits) { const k = h.tag + '|' + h.txt; if (!seen.has(k)) { seen.add(k); uniq.push(h); } }
    return { url: location.href, count: uniq.length, hits: uniq.slice(0, 40) };
  }.toString() + ')()';
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
  cdp.close(); await sleep(400);
  console.log(JSON.stringify(r, null, 1).slice(0, 4000));
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
