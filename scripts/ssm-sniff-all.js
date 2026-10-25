/**
 * Bắt request mạng của tab SSM trong N giây (mọi request, không lọc).
 * Dùng khi cần biết nút "Tải Xuống File Mẫu" gọi endpoint nào.
 *
 * node scripts/ssm-sniff-all.js [số giây]
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const SECONDS = Number(process.argv[2] || 30);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!tab) {
  console.error('Không có tab ssm.edufit.vn');
  process.exit(2);
}

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const seen = [];

await new Promise((resolve) => {
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ id: 1, method: 'Network.enable', params: {} }));
    resolve();
  });
});

sock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method !== 'Network.requestWillBeSent') return;
  const req = msg.params.request;
  seen.push({ method: req.method, url: req.url });
});

await new Promise((r) => setTimeout(r, SECONDS * 1000));
sock.close();

const uniq = [...new Map(seen.map((s) => [s.method + ' ' + s.url, s])).values()].filter(
  (s) => /api-ssm|edufit/i.test(s.url) && !/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(s.url),
);
console.log(JSON.stringify({ n: uniq.length, calls: uniq.slice(-25) }, null, 1));
