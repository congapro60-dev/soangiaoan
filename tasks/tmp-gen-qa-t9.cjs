// Sinh bộ QA Task 9 cho 2 bài batch1: 10-11-79 (g10) + 11-11-75 (g11)
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

const CFG = {
  t9a: {
    key: '10-11-79', row: "'Số gần đúng và sai số'", classId: 'class-1787208462088', joinCode: '7W288E',
    student: 'Trần Thùy Anh', pin: '2143',
    aiCheck: "hsT5.includes('AI') && hsT5.includes('Fansipan')",
    aiCheckTv: "tvT5.includes('AI') && tvT5.includes('Fansipan')",
    noProof: "!hsT5.includes('hàng đơn vị') && !hsT5.includes('Quy tắc')",
    noProofTv: "!tvT5.includes('hàng đơn vị') && !tvT5.includes('Quy tắc')",
    spoiler: "{ sgn: 'hàng đơn vị', quyTac: 'Quy tắc: hàng quy tròn' }",
    exit: 'Em rút ra: hàng quy tròn là hàng liền trước hàng của chữ số khác 0 đầu tiên của d; số gần đúng phản ánh độ chính xác của phép đo.',
  },
  t9b: {
    key: '11-11-75', row: "'Mẫu số liệu ghép nhóm'", classId: 'class-1787188523562', joinCode: 'R6RCFC',
    student: 'Đặng Tuệ Minh', pin: '2750',
    aiCheck: "hsT5.includes('AI') && hsT5.includes('Internet')",
    aiCheckTv: "tvT5.includes('AI') && tvT5.includes('Internet')",
    noProof: "!hsT5.includes('[90; 120)') && !hsT5.includes('nửa khoảng')",
    noProofTv: "!tvT5.includes('[90; 120)') && !tvT5.includes('nửa khoảng')",
    spoiler: "{ mut: '[90; 120)', nua: 'nửa khoảng' }",
    exit: 'Em rút ra: dấu < ở mút phải của nhóm [60; 90) nghĩa là 90 không thuộc nhóm này; khi số liệu trùng mốc phải xét nhóm kế tiếp.',
  },
};

for (const tag of ['t9a', 't9b']) {
  const c = CFG[tag];
  // 1) Session — đổi ROW_RX (theo title) + CLASS_ID + joinCode check + out
  R('tasks/tmp-r7-qa-session.cjs', [
    ["'Lớp 12 · Tuần 11 · Tiết 79'", c.row],
    ["'class-1787188523562'", "'" + c.classId + "'"],
    ['tmp-r7-qa-session.json', 'tmp-' + tag + '-session.json'],
  ], 'tasks/tmp-' + tag + '-session.cjs');
  {
    let t = fs.readFileSync('tasks/tmp-' + tag + '-session.cjs', 'utf8').replace(/joinCode=R6RCFC/g, 'joinCode=' + c.joinCode);
    fs.writeFileSync('tasks/tmp-' + tag + '-session.cjs', t, 'utf8');
  }
  // 2) QA — session file + HS/PIN + S4 + no-proof + spoiler + exit text
  R('tasks/tmp-r7-qa.cjs', [
    ["process.argv[2] || 'tasks/tmp-r7-qa-session.json'", "process.argv[2] || 'tasks/tmp-" + tag + "-session.json'"],
    ["process.argv[3] || 'tasks/tmp-r7-qa-log.json'", "process.argv[3] || 'tasks/tmp-" + tag + "-qa-log.json'"],
  ], 'tasks/tmp-' + tag + '-qa.cjs');
  {
    let t = fs.readFileSync('tasks/tmp-' + tag + '-qa.cjs', 'utf8').replace(/tasks\/tmp-r7-qa-/g, 'tasks/tmp-' + tag + '-qa-');
    const reps = [
      ["o.textContent.trim() === 'Đặng Tuệ Minh'", "o.textContent.trim() === '" + c.student + "'"],
      ["'2750'", "'" + c.pin + "'"],
      ["hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('176,7'),", "hsHasAiKetLuan: " + c.aiCheck + ','],
      ["tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('176,7'),", "tvHasAiKetLuan: " + c.aiCheckTv + ','],
      ["hsNoProof: !hsT5.includes('530/3') && !hsT5.includes('1247,22') && !hsT5.includes('STO'),", "hsNoProof: " + c.noProof + ','],
      ["tvNoProof: !tvT5.includes('530/3') && !tvT5.includes('1247,22') && !tvT5.includes('STO'),", "tvNoProof: " + c.noProofTv + ','],
      ["const SPOILER_RX = { dchung: '13,75', tong: '20982' };", 'const SPOILER_RX = ' + c.spoiler + ';'],
    ];
    for (const [a, b] of reps) {
      if (!t.includes(a)) throw new Error(tag + ' qa: KHÔNG thấy ' + a.slice(0, 60));
      t = t.split(a).join(b);
    }
    t = t.replace(/const EXIT_TEXT = '[^']+';/, "const EXIT_TEXT = '" + c.exit + "';");
    fs.writeFileSync('tasks/tmp-' + tag + '-qa.cjs', t, 'utf8');
    console.log('PATCHED ' + tag + '-qa');
  }
  // 3) Probe7
  R('tasks/tmp-r7-probe7.cjs', [['tasks/tmp-r7-qa-session.json', 'tasks/tmp-' + tag + '-session.json']], 'tasks/tmp-' + tag + '-probe7.cjs');
  {
    let t = fs.readFileSync('tasks/tmp-' + tag + '-probe7.cjs', 'utf8').replace(/tasks\/tmp-r7-/g, 'tasks/tmp-' + tag + '-');
    t = t.split("o.textContent.trim() === 'Đặng Tuệ Minh'").join("o.textContent.trim() === '" + c.student + "'");
    t = t.split("'2750'").join("'" + c.pin + "'");
    fs.writeFileSync('tasks/tmp-' + tag + '-probe7.cjs', t, 'utf8');
  }
  // 4) Reload — band chặng 5 template = 16–19 phút; marker theo AI-error
  R('tasks/tmp-r7-reload.cjs', [
    ['tasks/tmp-r7-qa-session.json', 'tasks/tmp-' + tag + '-session.json'],
    ['tasks/tmp-r7-reload.json', 'tasks/tmp-' + tag + '-reload.json'],
    ["const MARKER = 'Nháp R7 79 — kiểm tra lưu 28/10';", "const MARKER = 'Nháp " + tag.toUpperCase() + " — kiểm tra lưu 28/10';"],
    ["t.includes('Chặng 12–14 phút') && t.includes('176,7')", "t.includes('Chặng 16–19 phút') && " + (tag === 't9a' ? "t.includes('Fansipan')" : "t.includes('Internet')")],
    ["after.includes('176,7')", "after.includes(" + (tag === 't9a' ? "'Fansipan'" : "'Internet'") + ")"],
    ['tasks/tmp-r7-reload-before.png', 'tasks/tmp-' + tag + '-reload-before.png'],
    ['tasks/tmp-r7-reload-after.png', 'tasks/tmp-' + tag + '-reload-after.png'],
    ["o.textContent.trim() === 'Đặng Tuệ Minh'", "o.textContent.trim() === '" + c.student + "'"],
    ["'2750'", "'" + c.pin + "'"],
  ], 'tasks/tmp-' + tag + '-reload.cjs');
}
console.log('GEN DONE');
