/**
 * Kiểm nhanh một endpoint SSM bằng token đang có trong tab SSM của trình duyệt QA.
 * Dùng để phân biệt "token hết quyền (403)" với "SSM đổi tham số (422)".
 *
 * node scripts/ssm-probe.js "<path bắt đầu bằng v2/ hoặc v1/>"
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const path = process.argv[2] || 'v1/school-years';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!tab) {
  console.error('Không có tab ssm.edufit.vn trên cổng ' + PORT);
  process.exit(2);
}

const expression = [
  '(async () => {',
  "  const tok = localStorage.getItem('access_token');",
  "  if (!tok) return JSON.stringify({ error: 'không có access_token' });",
  `  const url = 'https://api-ssm.edufit.vn/api/' + ${JSON.stringify(path)};`,
  "  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } });",
  '  const text = await res.text();',
  '  return JSON.stringify({ status: res.status, head: text.slice(0, 300) });',
  '})()',
].join('\n');

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const out = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), 45000);
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
console.log(typeof out === 'string' ? out : JSON.stringify(out));
