/**
 * QA trọn vòng cho MỘT lớp: nạp session SSM vào app, mở workspace lớp, tải bài đánh giá
 * theo kỳ, bấm gợi ý, rồi in bảng điểm từng em × từng LO.
 *
 * Chạy trên Chrome đã bật `--remote-debugging-port=9222` và đã đăng nhập app + SSM.
 * Không in token. Không bấm đẩy — đẩy phải qua người duyệt.
 *
 * Cách dùng:
 *   node scripts/qa-lo-run.js --class 11Columbus --period IA1
 *   node scripts/qa-lo-run.js --class 10Olinda --period F1 --push
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const CLASS_NAME = argOf('class', '11Columbus');
const PERIOD = argOf('period', 'IA1');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const appTab = list.find((t) => t.type === 'page' && t.url.includes('giaoandewey'));
const ssmTab = list.find((t) => t.type === 'page' && t.url.includes('ssm.edufit.vn'));
if (!appTab) {
  console.error('Thiếu tab app giaoandewey trên Chrome QA.');
  process.exit(2);
}
if (!ssmTab) {
  console.error('Thiếu tab SSM. Mở https://ssm.edufit.vn và đăng nhập trước.');
  process.exit(2);
}

/** Chạy một biểu thức trong một tab cụ thể qua CDP, trả về giá trị. */
const evaluateIn = async (tab, expression, timeoutMs = 60000) => {
  const sock = new WebSocket(tab.webSocketDebuggerUrl);
  const outcome = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), timeoutMs);
    sock.addEventListener('open', () => {
      sock.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true, userGesture: true } }));
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
  if (outcome.error) throw new Error(outcome.error);
  const value = outcome.result?.value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

// 1) Lấy token SSM từ tab SSM rồi nhét vào app (không in ra).
const session = await evaluateIn(
  ssmTab,
  `JSON.stringify({ token: localStorage.getItem('access_token') || '', workspace: localStorage.getItem('workspace') || 'branch_23' })`,
);
if (!session?.token) {
  console.error('Tab SSM chưa đăng nhập (không thấy access_token).');
  process.exit(3);
}

const seeded = await evaluateIn(
  appTab,
  `(async () => {
    const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
    if (!key) return JSON.stringify({ error: 'app chưa đăng nhập' });
    const user = JSON.parse(localStorage.getItem(key));
    const uid = user.uid;
    localStorage.setItem('smartplan.ssmSession.' + uid, JSON.stringify({ token: ${JSON.stringify(session.token)}, workspace: ${JSON.stringify(session.workspace)}, savedAt: new Date().toISOString() }));
    const classes = JSON.parse(localStorage.getItem('smart_lesson_plan_data:' + uid) || '{}').classes || [];
    const target = classes.find(c => c.name === ${JSON.stringify(CLASS_NAME)});
    return JSON.stringify({ uid, classId: target ? target.id : null, nClasses: classes.length });
  })()`,
);
if (seeded?.error) {
  console.error('Không nạp được session: ' + seeded.error);
  process.exit(4);
}
if (!seeded.classId) {
  console.error(`Không thấy lớp ${CLASS_NAME} trong dữ liệu app.`);
  process.exit(5);
}

// 2) Nạp trang sạch để app đọc session mới.
await evaluateIn(appTab, `location.reload(); 'reload'`);
await sleep(9000);

// 3) Vào workspace lớp → tab SSM → chọn kỳ → tải bảng điểm → gợi ý.
const opened = await evaluateIn(
  appTab,
  `(async () => {
    const clickText = (text) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === text); if (b) { b.click(); return true; } return false; };
    clickText('Lớp học');
    await new Promise(r => setTimeout(r, 1200));
    const card = [...document.querySelectorAll('div,span,h3,h4')].find(x => x.children.length === 0 && x.textContent.trim() === ${JSON.stringify(CLASS_NAME)});
    if (!card) return JSON.stringify({ error: 'không thấy thẻ lớp' });
    let el = card;
    for (let i = 0; i < 6 && el.parentElement; i++) { el = el.parentElement; if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') break; }
    (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' ? el : card).click();
    await new Promise(r => setTimeout(r, 1500));
    const tabs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'SSM');
    if (tabs.length) tabs[tabs.length - 1].click();
    await new Promise(r => setTimeout(r, 1200));
    const per = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => /tháng 8/.test(o.text)));
    if (!per) return JSON.stringify({ error: 'không thấy ô chọn kỳ' });
    const opt = [...per.options].find(o => o.text.trim().startsWith(${JSON.stringify(PERIOD)}));
    if (!opt) return JSON.stringify({ error: 'không thấy kỳ ' + ${JSON.stringify(PERIOD)} });
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(per, opt.value);
    per.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const load = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Tải bảng điểm từ SSM');
    if (!load) return JSON.stringify({ error: 'không thấy nút tải bảng điểm' });
    load.click();
    return JSON.stringify({ ok: true, period: opt.text.trim() });
  })()`,
);
if (opened?.error) {
  console.error('Không mở được lớp/kỳ: ' + opened.error);
  process.exit(6);
}

await sleep(6000);

const suggested = await evaluateIn(
  appTab,
  `(async () => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Gợi ý điểm bằng AI');
    if (!b) return JSON.stringify({ error: 'không thấy nút gợi ý' });
    b.click();
    return JSON.stringify({ ok: true });
  })()`,
);
if (suggested?.error) {
  console.error(suggested.error);
  process.exit(7);
}
await sleep(10000);

// 4) Đọc grid: tên em × mã LO × mức điểm.
const grid = await evaluateIn(
  appTab,
  `(() => {
    const table = [...document.querySelectorAll('table')].find(t => t.rows.length >= 2 && t.querySelector('select'));
    if (!table) return JSON.stringify({ error: 'không thấy bảng điểm' });
    const headers = [...table.rows[0].cells].slice(1).map(c => { const m = c.innerText.match(/LO_[A-Za-z0-9_]+/); return m ? m[0] : c.innerText.trim().slice(0, 20); });
    const rows = [...table.rows].slice(1).map(tr => {
      const cells = [...tr.cells];
      const name = (cells[0].innerText || '').split('\\n')[0].trim();
      const marks = cells.slice(1).map(c => { const s = c.querySelector('select'); return s ? s.options[s.selectedIndex].text.trim() : '?'; });
      return { name, marks };
    });
    const note = (document.body.innerText.match(/Ghép được[^\\n]{0,160}/) || [''])[0];
    return JSON.stringify({ headers, rows, note });
  })()`,
);

if (grid?.error) {
  console.error(grid.error);
  process.exit(8);
}

console.log(JSON.stringify({ className: CLASS_NAME, period: opened.period, note: grid.note, headers: grid.headers, rows: grid.rows }, null, 1));
