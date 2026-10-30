// Debug CDP v2: wake tab (activate) rồi mới evaluate — kiểm thuyết "Edge sleeping tab".
// Log ra FILE + stdout. Test 2 tab: Thư viện (adaptive-lessons) và builder (đối chứng).
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, 'tmp-cdp-debug.log');
const step = (s) => { const line = new Date().toISOString() + ' ' + s; fs.appendFileSync(LOG, line + '\n'); console.log(s); };

fs.writeFileSync(LOG, '');
const CDP_HTTP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function testTab(label, t) {
  step(label + ' ACTIVATE ' + t.id.slice(0, 12));
  try { await fetch(CDP_HTTP + '/json/activate/' + t.id); } catch (e) { step(label + ' activate FAIL ' + e.message); }
  await sleep(4000); // chờ renderer thức dậy

  await new Promise((resolve) => {
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let done = false;
    const finish = (code) => { if (!done) { done = true; try { ws.close(); } catch (_) {} resolve(); } };
    const killTo = setTimeout(() => { step(label + ' WS_OPEN_TIMEOUT'); finish(); }, 15000);
    ws.onopen = () => {
      clearTimeout(killTo);
      step(label + ' WS_OPEN — send Runtime.evaluate 1+1');
      const t2 = setTimeout(() => { step(label + ' EVAL_TIMEOUT'); finish(); }, 12000);
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === 1) { clearTimeout(t2); step(label + ' EVAL_RESULT ' + JSON.stringify(m.result && m.result.result)); finish(); }
      };
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } }));
    };
    ws.onerror = () => { step(label + ' WS_ERROR'); finish(); };
  });
}

(async () => {
  const res = await fetch(CDP_HTTP + '/json');
  const targets = await res.json();
  const lib = targets.find((t) => t.type === 'page' && (t.url || '').includes('giaoandewey.vercel.app/adaptive-lessons'));
  const builder = targets.find((t) => t.type === 'page' && (t.url || '').includes('/adaptive-builder/'));
  step('lib=' + (lib ? lib.id.slice(0, 12) : 'NONE') + ' builder=' + (builder ? builder.id.slice(0, 12) : 'NONE'));
  if (lib) await testTab('LIB', lib);
  if (builder) await testTab('BUILDER', builder);
  step('DONE');
  process.exit(0);
})().catch((e) => { step('FATAL ' + (e && e.message || e)); process.exit(1); });
