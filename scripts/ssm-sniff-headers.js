/**
 * Bắt request + HEADER của tab SSM (CDP Network.requestWillBeSentExtraInfo).
 *
 * Cần biết SSM gửi header gì (ngoài Authorization) vì endpoint cây LO trả 403 khi gọi thẳng —
 * nhiều khả năng thiếu header định danh branch/program mà SSM web có.
 *
 * node scripts/ssm-sniff-headers.js [số giây]
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const SECONDS = Number(process.argv[2] || 30);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!tab) {
  console.error('Không có tab ssm.edufit.vn.');
  process.exit(2);
}

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const byId = new Map();
const interesting = [];

await new Promise((resolve) => {
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ id: 1, method: 'Network.enable', params: {} }));
    resolve();
  });
});

sock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Network.requestWillBeSent') {
    const { requestId, request } = msg.params;
    if (/api-ssm/.test(request.url) && !/\.(js|css|png|jpg|svg|woff2?)(\?|$)/i.test(request.url)) {
      byId.set(requestId, { url: request.url, method: request.method });
    }
  }
  if (msg.method === 'Network.requestWillBeSentExtraInfo') {
    const entry = byId.get(msg.params.requestId);
    if (!entry) return;
    const headers = msg.params.headers || {};
    const interestingHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      if (/^(authorization|accept|cookie|origin|x-|referer)/i.test(k)) {
        interestingHeaders[k] = /^(authorization|cookie)/i.test(k) ? `<${String(v).length} ký tự>` : v;
      }
    }
    interesting.push({ ...entry, headers: interestingHeaders });
  }
});

await new Promise((r) => setTimeout(r, SECONDS * 1000));
sock.close();

const uniq = [...new Map(interesting.map((i) => [i.method + ' ' + i.url, i])).values()];
console.log(JSON.stringify({ n: uniq.length, calls: uniq.slice(-12) }, null, 1));
