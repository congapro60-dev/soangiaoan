/**
 * Nạp session SSM (token + workspace) vào một tab app đang mở trên Chrome/Edge QA.
 * Đọc token từ biến môi trường để không ghi ra log hay file trong repo.
 *
 * Cách dùng:
 *   $env:SSM_TOK='...'; $env:SSM_WS='branch_23'; node scripts/seed-ssm-session.js
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const TOKEN = process.env.SSM_TOK || '';
const WORKSPACE = process.env.SSM_WS || 'branch_23';

if (!TOKEN) {
  console.error('Thiếu SSM_TOK.');
  process.exit(2);
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const appTab = list.find((t) => t.type === 'page' && t.url.includes('giaoandewey'));
if (!appTab) {
  console.error('Không thấy tab app giaoandewey.');
  process.exit(3);
}

const expression = `(() => {
  const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
  if (!key) return JSON.stringify({ error: 'app chưa đăng nhập Google' });
  const uid = JSON.parse(localStorage.getItem(key)).uid;
  localStorage.setItem('smartplan.ssmSession.' + uid, JSON.stringify({ token: ${JSON.stringify(TOKEN)}, workspace: ${JSON.stringify(WORKSPACE)}, savedAt: new Date().toISOString() }));
  const links = {
    'class-1787208462088': { id: 9697, name: '10Olinda' },
    'class-1787188523562': { id: 9681, name: '11Columbus' },
    'class-1787208442826': { id: 10264, name: '12 VN Toán 1' }
  };
  for (const [cid, link] of Object.entries(links)) {
    localStorage.setItem('ssmClassLink:' + uid + ':' + cid, JSON.stringify({ ...link, workspace: ${JSON.stringify(WORKSPACE)} }));
  }
  return JSON.stringify({ ok: true, uid: String(uid).slice(0, 6), links: Object.keys(links).length });
})()`;

const sock = new WebSocket(appTab.webSocketDebuggerUrl);
const result = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), 30000);
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
  sock.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    clearTimeout(timer);
    resolve(msg.result?.result?.value ?? msg.result);
  });
  sock.addEventListener('error', (e) => {
    clearTimeout(timer);
    resolve({ error: String(e.message || e) });
  });
});
sock.close();
console.log(typeof result === 'string' ? result : JSON.stringify(result));
