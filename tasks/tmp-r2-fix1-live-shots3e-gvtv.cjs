// R2 fix1 shots3e-gvtv — CDP thô qua WebSocket global: Runtime.evaluate + Page.captureScreenshot cho GV + TV
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const SID = S.sessionId;

function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const sock = new WebSocket(ws);
    const id = 1;
    const timeout = setTimeout(() => { try { sock.close(); } catch {} reject(new Error('CDP timeout: ' + method)); }, 60000);
    sock.onopen = () => sock.send(JSON.stringify({ id, method, params }));
    sock.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        clearTimeout(timeout);
        sock.close();
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    sock.onerror = (e) => { clearTimeout(timeout); reject(new Error('WS error: ' + (e.message || 'unknown'))); };
  });
}

(async () => {
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const gvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv-control') && t.url.includes(SID));
  const tvT = targets.find((t) => t.type === 'page' && t.url.includes('mode=tv&') && t.url.includes(SID));
  if (!gvT || !tvT) throw new Error('Không thấy GV/TV target');

  const out = {};
  for (const [name, t] of [['gv', gvT], ['tv', tvT]]) {
    const r = await cdpCall(t.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: "(document.body.innerText || '').replace(/\\n{2,}/g, '\\n')",
      returnByValue: true,
    });
    out[name] = r.result.value;
    const shot = await cdpCall(t.webSocketDebuggerUrl, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`tasks/tmp-r2-fix1-live-s10exit3-${name}.png`, Buffer.from(shot.data, 'base64'));
    console.log(name, 'len:', out[name].length, '| saved png');
    await sleep(500);
  }
  const stage = (out.gv.match(/Chặng (\d+)\/12/) || [])[1] || null;
  console.log('GV stage:', stage);
  fs.writeFileSync('tasks/tmp-r2-fix1-live-gvtv-text.json', JSON.stringify({ savedAt: new Date().toISOString(), stage, gv: out.gv, tv: out.tv }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live-gvtv-text.json');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
