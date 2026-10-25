/**
 * Bắt MỌI request mạng của tab SSM trong N giây, rồi in ra những URL đáng chú ý.
 *
 * Dùng khi cần biết SSM web thật sự gọi endpoint nào để đọc cây LO — hook `fetch` bị bỏ sót vì
 * web dùng XHR/Axios. Network domain của CDP bắt ở tầng thấp nên không sót.
 *
 * node scripts/ssm-sniff.js [số giây]
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
const urls = [];
let seq = 10;

await new Promise((resolve) => {
  sock.addEventListener('open', () => {
    sock.send(JSON.stringify({ id: 1, method: 'Network.enable', params: {} }));
    resolve();
  });
});

sock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Network.requestWillBeSent') {
    const url = msg.params?.request?.url || '';
    if (/api-ssm|edufit\.vn\/api|criteria|assessment|evaluation/i.test(url) && !/\.(js|css|png|jpg|svg|woff2?)(\?|$)/i.test(url)) {
      urls.push({ method: msg.params.request.method, url });
    }
  }
});

await new Promise((r) => setTimeout(r, SECONDS * 1000));
sock.close();

const uniq = [...new Map(urls.map((u) => [u.method + ' ' + u.url, u])).values()];
console.log(JSON.stringify({ n: uniq.length, calls: uniq.slice(-40) }, null, 1));
