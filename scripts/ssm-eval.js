/**
 * Chạy một biểu thức JS trên tab SSM của trình duyệt QA (Edge/Chrome bật debug).
 *
 * node scripts/ssm-eval.js "<biểu thức>"
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const expression = process.argv[2] || 'document.title';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!tab) {
  console.error('Không có tab ssm.edufit.vn. Các tab hiện có: ' + list.filter((t) => t.type === 'page').map((t) => t.url).join(' , '));
  process.exit(2);
}

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const out = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), 50000);
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true, userGesture: true } }));
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
console.log(typeof out === 'string' ? out : JSON.stringify(out));
