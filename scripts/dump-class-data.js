/**
 * Dump dữ liệu thô 3 lớp (bài giao, bài nộp, danh sách HS) ra file JSON để tính điểm offline.
 *
 * Chạy TRONG tab app (qua CDP), tải file xuống thư mục tải của trình duyệt QA.
 * node scripts/dump-class-data.js
 */
const PORT = Number(process.env.QA_CDP_PORT || 9223);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const appTab = list.find((t) => t.type === 'page' && t.url.includes('giaoandewey'));
if (!appTab) {
  console.error('Không có tab app.');
  process.exit(2);
}

const expression = `(async () => {
  const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
  if (!key) return JSON.stringify({ error: 'chưa đăng nhập' });
  const idToken = JSON.parse(localStorage.getItem(key)).stsTokenManager.accessToken;
  const classes = [
    { name: '10Olinda', id: 'class-1787208462088', grade: 10 },
    { name: '11Columbus', id: 'class-1787188523562', grade: 11 },
    { name: '12LoTrinh1', id: 'class-1787208442826', grade: 12 }
  ];
  const call = async (action, classId) => {
    const res = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, idToken, classId }) });
    const json = await res.json();
    return Array.isArray(json) ? json : (json.assignments || json.submissions || json.students || []);
  };
  const dump = [];
  for (const cls of classes) {
    const assignments = await call('teacherAssignments', cls.id);
    const submissions = await call('teacherSubmissions', cls.id);
    const roster = await call('teacherRoster', cls.id);
    // teacherRoster chỉ có studentId + name; mã HS (cột "Mã HS" của SSM) nằm trong dữ liệu lớp.
    const cacheKey = Object.keys(localStorage).find(k => k.startsWith('smart_lesson_plan_data:') && !k.endsWith('anonymous'));
    let classStudents = [];
    try {
      const appData = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      const target = (appData.classes || []).find(c => c.id === cls.id);
      classStudents = target ? (target.students || []).map(s => ({ id: s.id, name: s.name, code: s.code })) : [];
    } catch (e) { classStudents = []; }
    dump.push({ class: cls, assignments, submissions, roster, classStudents });
  }
  const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), dump })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'class-dump.json';
  document.body.appendChild(a); a.click(); a.remove();
  return JSON.stringify({ sizes: dump.map(d => d.class.name + ':' + d.assignments.length + '/' + d.submissions.length + '/' + d.roster.length) });
})()`;

const sock = new WebSocket(appTab.webSocketDebuggerUrl);
const out = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ error: 'TIMEOUT' }), 300000);
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
