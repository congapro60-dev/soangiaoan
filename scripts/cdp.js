/**
 * Gọi DevTools Protocol qua WebSocket native của Node (không cần package `ws`).
 * Dùng cho QA trên Chrome thật đã bật `--remote-debugging-port=9222`.
 *
 * Cách dùng: node cdp.js "<biểu thức JS chạy trong trang>" [--tab <substring url>]
 * In ra giá trị trả về dưới dạng JSON.
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);

const argExpr = process.argv[2] || 'document.title';
const tabFilterIdx = process.argv.indexOf('--tab');
const tabFilter = tabFilterIdx > 0 ? process.argv[tabFilterIdx + 1] : 'giaoandewey';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes(tabFilter));
if (!tab) {
  console.error('NO-TAB matching ' + tabFilter + '; pages: ' + list.filter((t) => t.type === 'page').map((t) => t.url).join(' , '));
  process.exit(2);
}

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const result = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), 60000);
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: argExpr, awaitPromise: true, returnByValue: true, userGesture: true },
    }));
  });
  sock.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    clearTimeout(timer);
    resolve(msg.result);
  });
  sock.addEventListener('error', (e) => {
    clearTimeout(timer);
    resolve({ error: String(e.message || e) });
  });
});

sock.close();
if (result.error) {
  console.error(JSON.stringify(result.error));
  process.exit(1);
}
const value = result.result?.value;
console.log(typeof value === 'string' ? value : JSON.stringify(value ?? result));
