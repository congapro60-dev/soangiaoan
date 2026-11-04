// Sinh bộ QA Task 10 (hồi quy bài 12 — 12-11-80) từ khuôn r7
const fs = require('fs');
const R = (f, map, out) => {
  let t = fs.readFileSync(f, 'utf8');
  for (const [a, b] of map) {
    if (!t.includes(a)) throw new Error(f + ': KHÔNG thấy ' + a.slice(0, 70));
    t = t.split(a).join(b);
  }
  fs.writeFileSync(out, t, 'utf8');
  console.log('WROTE ' + out);
};

R('tasks/tmp-r7-qa-session.cjs', [["'Lớp 12 · Tuần 11 · Tiết 79'", "'Phương sai'"], ["'class-1787188523562'", "'class-1787208442826'"], ['tmp-r7-qa-session.json', 'tmp-t10-session.json']], 'tasks/tmp-t10-session.cjs');
{
  let t = fs.readFileSync('tasks/tmp-t10-session.cjs', 'utf8').replace(/joinCode=R6RCFC/g, 'joinCode=AD4GKT');
  fs.writeFileSync('tasks/tmp-t10-session.cjs', t, 'utf8');
}

R('tasks/tmp-r7-qa.cjs', [
  ["process.argv[2] || 'tasks/tmp-r7-qa-session.json'", "process.argv[2] || 'tasks/tmp-t10-session.json'"],
  ["process.argv[3] || 'tasks/tmp-r7-qa-log.json'", "process.argv[3] || 'tasks/tmp-t10-qa-log.json'"],
], 'tasks/tmp-t10-qa.cjs');
{
  let t = fs.readFileSync('tasks/tmp-t10-qa.cjs', 'utf8').replace(/tasks\/tmp-r7-qa-/g, 'tasks/tmp-t10-qa-');
  const reps = [
    ["o.textContent.trim() === 'Đặng Tuệ Minh'", "o.textContent.trim() === 'Lò Mai Phương Chi'"],
    ["'2750'", "'7859'"],
    ["hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('176,7'),", "hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('±3'),"],
    ["tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('176,7'),", "tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('±3'),"],
    ["hsNoProof: !hsT5.includes('530/3') && !hsT5.includes('1247,22') && !hsT5.includes('STO'),", "hsNoProof: !hsT5.includes('căn bậc hai số học') && !hsT5.includes('s = 3.'),"],
    ["tvNoProof: !tvT5.includes('530/3') && !tvT5.includes('1247,22') && !tvT5.includes('STO'),", "tvNoProof: !tvT5.includes('căn bậc hai số học') && !tvT5.includes('s = 3.'),"],
    ["const SPOILER_RX = { dchung: '13,75', tong: '20982' };", "const SPOILER_RX = { am: '±3', can3: 'căn bậc hai số học' };"],
    ["const EXIT_TEXT = 'Em rút ra: dùng công thức rút gọn s² = trung bình bình phương trừ bình phương trung bình; không làm tròn x̄ ở bước trung gian (STO A); với y = ax + b thì độ phân tán nhân |a|, tịnh tiến không đổi.';", "const EXIT_TEXT = 'Em rút ra: s là căn bậc hai số học nên không âm; khi chia mẫu n−1 là độ lệch chuẩn hiệu chỉnh sx khác σx; Casio chỉ là công cụ kiểm tra, lập bảng là gốc.';"],
  ];
  for (const [a, b] of reps) {
    if (!t.includes(a)) throw new Error('t10 qa: KHÔNG thấy ' + a.slice(0, 60));
    t = t.split(a).join(b);
  }
  // Thêm check CasioKeyGuide vào LOG.s7 (sau khi dump s7)
  const anchor = "if (target === 7) LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));";
  if (!t.includes(anchor)) throw new Error('t10: không thấy anchor tvButtons');
  t = t.replace(anchor, anchor + `
      LOG.s7.casioHS = { has: LOG.s7.hs.includes('Casio fx-580VN X'), sigma: LOG.s7.hs.includes('0,89443'), menu: LOG.s7.hs.includes('MENU'), freq: LOG.s7.hs.includes('Freq'), steps4: (LOG.s7.hs.match(/student-casio-step|Máy tính của em/g) || []).length > 0 };
      LOG.s7.casioTv = { has: LOG.s7.tv.includes('Casio fx-580VN X'), sigma: LOG.s7.tv.includes('0,89443') };
      LOG.s7.numbers = { x9: LOG.s7.hs.includes('9') || LOG.s7.gv.includes('9'), an08: LOG.s7.gv.includes('0,8'), binh28: LOG.s7.gv.includes('2,8'), sigmaFull: LOG.s7.hs.includes('0,89443') };`);
  fs.writeFileSync('tasks/tmp-t10-qa.cjs', t, 'utf8');
  console.log('PATCHED t10-qa');
}

R('tasks/tmp-r7-probe7.cjs', [['tasks/tmp-r7-qa-session.json', 'tasks/tmp-t10-session.json']], 'tasks/tmp-t10-probe7.cjs');
{
  let t = fs.readFileSync('tasks/tmp-t10-probe7.cjs', 'utf8').replace(/tasks\/tmp-r7-/g, 'tasks/tmp-t10-');
  t = t.split("o.textContent.trim() === 'Đặng Tuệ Minh'").join("o.textContent.trim() === 'Lò Mai Phương Chi'");
  t = t.split("'2750'").join("'7859'");
  fs.writeFileSync('tasks/tmp-t10-probe7.cjs', t, 'utf8');
}

R('tasks/tmp-r7-reload.cjs', [
  ['tasks/tmp-r7-qa-session.json', 'tasks/tmp-t10-session.json'],
  ['tasks/tmp-r7-reload.json', 'tasks/tmp-t10-reload.json'],
  ["const MARKER = 'Nháp R7 79 — kiểm tra lưu 28/10';", "const MARKER = 'Nháp T10 12 — kiểm tra lưu 28/10';"],
  ["t.includes('Chặng 12–14 phút') && t.includes('176,7')", "t.includes('Chặng 16–19 phút') && t.includes('±3')"],
  ["after.includes('176,7')", "after.includes('±3')"],
  ['tasks/tmp-r7-reload-before.png', 'tasks/tmp-t10-reload-before.png'],
  ['tasks/tmp-r7-reload-after.png', 'tasks/tmp-t10-reload-after.png'],
  ["o.textContent.trim() === 'Đặng Tuệ Minh'", "o.textContent.trim() === 'Lò Mai Phương Chi'"],
  ["'2750'", "'7859'"],
], 'tasks/tmp-t10-reload.cjs');
