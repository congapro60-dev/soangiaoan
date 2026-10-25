/**
 * Bắt request tải file mẫu trên tab SSM: mở menu ba chấm rồi bấm "Tải Xuống File Mẫu",
 * ghi lại URL nào được gọi (thường trả 202 + link CDN).
 *
 * node scripts/ssm-capture-template.js
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const tab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!tab) {
  console.error('Không có tab SSM');
  process.exit(2);
}

const sock = new WebSocket(tab.webSocketDebuggerUrl);
const seen = [];
let nextId = 1;
const pending = new Map();

const send = (method, params) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    sock.send(JSON.stringify({ id, method, params }));
  });

await new Promise((resolve) => sock.addEventListener('open', resolve));

sock.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Network.requestWillBeSent') {
    const req = msg.params.request;
    if (/api-ssm|edufit/i.test(req.url) && !/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(req.url)) {
      seen.push({ method: req.method, url: req.url });
    }
  }
});

await send('Network.enable', {});

// Hook fetch/XHR trong trang để bắt cả request do JS tự dựng
const hookExpr = `(() => {
  window.__cap = [];
  const orig = window.fetch;
  window.fetch = function(i, init) {
    const u = typeof i === 'string' ? i : (i && i.url) || '';
    window.__cap.push((init && init.method || 'GET') + ' ' + u.slice(0, 220));
    return orig.apply(this, arguments);
  };
  const oo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) { window.__cap.push(m + ' ' + String(u).slice(0, 220)); return oo.apply(this, arguments); };
  return 'ok';
})()`;
await send('Runtime.evaluate', { expression: hookExpr, returnByValue: true });

// Mở menu ba chấm
const openMenu = `(() => {
  const more = [...document.querySelectorAll('button')].find(b => !b.textContent.trim() && b.querySelector('svg'));
  if (!more) return 'no-more-btn';
  more.click();
  return 'clicked';
})()`;
await send('Runtime.evaluate', { expression: openMenu, returnByValue: true });
await new Promise((r) => setTimeout(r, 1500));

// Bấm item tải mẫu
const clickTemplate = `(() => {
  const nodes = [...document.querySelectorAll('*')].filter(n => n.children.length === 0 && /Tải Xuống File Mẫu/.test(n.textContent));
  if (!nodes.length) return 'no-item';
  let el = nodes[0];
  for (let i = 0; i < 4 && el.parentElement; i++) {
    el = el.parentElement;
    if (el.getAttribute && (el.getAttribute('role') === 'menuitem' || el.tagName === 'LI' || el.tagName === 'BUTTON')) break;
  }
  el.click();
  return 'clicked-item';
})()`;
const clicked = await send('Runtime.evaluate', { expression: clickTemplate, returnByValue: true });
await new Promise((r) => setTimeout(r, 7000));

const captured = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__cap || [])', returnByValue: true });
sock.close();

console.log(JSON.stringify({
  clicked: clicked?.result?.value,
  pageCapture: JSON.parse(captured?.result?.value || '[]').filter((u) => /export|template|xlsx|download|score/i.test(u)),
  network: seen.filter((s) => /export|template|xlsx|download|score/i.test(s.url)).slice(-10),
}, null, 1));
