// Giao 10 bài tự học Tuần 11 cho 3 lớp qua action teacherAssignAdaptiveLesson
// idToken GV lấy từ IndexedDB firebaseLocalStorageDb của profile Edge GV (9222)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ASSIGN = [
  ['class-1787208462088', 'adaptive-1792827090625'], // g10 — Số gần đúng và sai số
  ['class-1787208462088', 'adaptive-1792826324771'], // g10 — Các số đặc trưng T1
  ['class-1787188523562', 'adaptive-1792831747929'], // g11 — Mẫu số liệu ghép nhóm
  ['class-1787188523562', 'adaptive-1792831154099'], // g11 — Các số đặc trưng T1
  ['class-1787188523562', 'adaptive-1792827844375'], // g11 — Hai mặt phẳng T2
  ['class-1787188523562', 'adaptive-1792828475281'], // g11 — Hai mặt phẳng T3
  ['class-1787208442826', 'adaptive-1792832396461'], // g12 — Nguyên hàm T2
  ['class-1787208442826', 'adaptive-1792833009074'], // g12 — Khoảng biến thiên T1
  ['class-1787208442826', 'adaptive-1792833650874'], // g12 — Mức độ phân tán T2
  ['class-1787208442826', 'adaptive-1792834706906'], // g12 — Phương sai và độ lệch chuẩn
];
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1200, height: 800 });
  await gv.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  // Lấy idToken GV từ localStorage (firebase:authUser — stsTokenManager.accessToken)
  const token = await gv.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('firebase:authUser:'));
    if (!key) return null;
    const user = JSON.parse(localStorage.getItem(key) || 'null');
    if (!user || !user.stsTokenManager || !user.stsTokenManager.accessToken) return null;
    return { uid: user.uid, token: user.stsTokenManager.accessToken };
  });
  if (!token) { console.log('KHÔNG LẤY ĐƯỢC idToken'); await gb.disconnect(); process.exit(2); }
  console.log('GV uid:', token.uid);
  // Giao từng bài
  for (const [classId, lessonId] of ASSIGN) {
    const r = await gv.evaluate(async (payload) => {
      const res = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    }, { action: 'teacherAssignAdaptiveLesson', idToken: token.token, classId, lessonId, isOpen: true });
    console.log(classId.slice(-6), '←', lessonId.slice(9, 30), '→', r.status, JSON.stringify(r.data).slice(0, 120));
    await sleep(1200);
  }
  await gv.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
