// Sinh tài liệu Gate D + giáo án gốc và áp nội dung vào snapshot cho chuẩn V8.8 Master Teacher.
// Dùng: node tasks/master/run.mjs b1 b2 ...
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SNAP = {
  main: path.join(ROOT, 'src/data/liveLessonPackages/banToan-w5-w6.snapshot.json'),
  batch2: path.join(ROOT, 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json'),
};

const DEFAULT_TIMELINE = [
  ['P00', 0, 180], ['P03', 180, 300], ['P05', 300, 480], ['P08', 480, 960], ['P16', 960, 1140],
  ['P19', 1140, 1200], ['P20', 1200, 1620], ['P27', 1620, 1800], ['P30', 1800, 2100],
  ['P35', 2100, 2280], ['P38', 2280, 2400],
];
const TIMELINES = {
  default: DEFAULT_TIMELINE,
  gateD101288: DEFAULT_TIMELINE,
  gateD111282: [
    ['P00', 0, 180], ['P03', 180, 420], ['P07', 420, 540], ['P09', 540, 840], ['P14', 840, 1020],
    ['P17', 1020, 1080], ['P18', 1080, 1560], ['P26', 1560, 1740], ['P29', 1740, 2040],
    ['P34', 2040, 2220], ['P37', 2220, 2400],
  ],
  gateD121282: [
    ['P00', 0, 180], ['P03', 180, 420], ['P07', 420, 540], ['P09', 540, 900], ['P15', 900, 1080],
    ['P18', 1080, 1140], ['P19', 1140, 1560], ['P26', 1560, 1740], ['P29', 1740, 2040],
    ['P34', 2040, 2220], ['P37', 2220, 2400],
  ],
  gateD78: [
    ['P00', 0, 60], ['P01', 60, 180], ['P03', 180, 300], ['P05', 300, 600], ['P10', 600, 780],
    ['P13', 780, 840], ['P14', 840, 1260], ['P21', 1260, 1440], ['P24', 1440, 1740],
    ['P29', 1740, 2220], ['P37', 2220, 2400],
  ],
  gateD79: [
    ['P00', 0, 60], ['P01', 60, 300], ['P03', 300, 420], ['P05', 420, 720], ['P10', 720, 900],
    ['P13', 900, 960], ['P14', 960, 1440], ['P21', 1440, 1740], ['P24', 1740, 2100],
    ['P29', 2100, 2280], ['P37', 2280, 2400],
  ],
  gateD77: [
    ['P00', 0, 60], ['P01', 60, 360], ['P03', 360, 540], ['P05', 540, 780], ['P10', 780, 960],
    ['P13', 960, 1020], ['P14', 1020, 1320], ['P21', 1320, 1560], ['P24', 1560, 1980],
    ['P29', 1980, 2280], ['P37', 2280, 2400],
  ],
  gateD1278: [
    ['P00', 0, 60], ['P01', 60, 300], ['P03', 300, 480], ['P05', 480, 720], ['P10', 720, 900],
    ['P13', 900, 960], ['P14', 960, 1440], ['P21', 1440, 1740], ['P24', 1740, 2100],
    ['P29', 2100, 2340], ['P37', 2340, 2400],
  ],
  gateD1279: [
    ['P00', 0, 60], ['P01', 60, 300], ['P03', 300, 420], ['P05', 420, 720], ['P10', 720, 840],
    ['P13', 840, 900], ['P14', 900, 1380], ['P21', 1380, 1500], ['P24', 1500, 1920],
    ['P29', 1920, 2160], ['P37', 2160, 2400],
  ],
};

const timelineFor = (key) => TIMELINES[key || 'default'] || DEFAULT_TIMELINE;

// Tuần 5–6 chạy hợp đồng V7.2 (14 hoạt động P00–P39) thay vì 11 chặng Gate D.
const isV72Week = (lesson) => lesson.week === 5 || lesson.week === 6;
const V72_STAGE_TIME = {
  S0: '0–180s', S1: '180–300s', S2: '300–420s', S3: '420–780s', S4: '1080–1320s',
  S5: '1320–1500s', S6: '1620–2040s', S7: '1620–2040s', S8: '2040–2160s', S9: '2160–2340s', S10: '2340–2400s',
};
const V72_MAP = [
  ['P00', '0–180s', 'S0 opening', 'S0'],
  ['P02', '180–300s', 'S1 prediction', 'S1'],
  ['P04', '300–420s', 'S2 goals', 'S2'],
  ['P07', '420–660s', 'S3 explore', 'S3'],
  ['P09', '660–780s', 'S4 quick1', 'S3 (kiểm nhanh sau khám phá)'],
  ['P11', '780–960s', 'S5 generalize', 'S3 (khái quát hoá)'],
  ['P13', '960–1080s', 'S6 quick2', 'S3 (kiểm điều kiện)'],
  ['P15', '1080–1320s', 'S7 verify (AI Error)', 'S4'],
  ['P18', '1320–1500s', 'S8 anchor', 'S5'],
  ['P20', '1500–1620s', 'S9 example', 'S5 (ví dụ có hướng dẫn)'],
  ['P22', '1620–2040s', 'S10 practice', 'S6 + S7'],
  ['P34', '2040–2160s', 'S11 compare', 'S8'],
  ['P36', '2160–2340s', 'S12 exit', 'S9 + S10'],
  ['P39', '2340–2400s', 'S13 self-assessment', 'S10 (tự đánh giá)'],
];

const groupByLevel = (exercises, level) => exercises.filter((e) => e.level === level);

function synthesizeSegs(l) {
  const s = l.snapshot;
  const M = groupByLevel(s.exercises, 'NB');
  const S = groupByLevel(s.exercises, 'TH');
  const C = groupByLevel(s.exercises, 'VD');
  const routeMd = (label, list, hint) => {
    const items = list.map((e, i) => `${i + 1}. ${e.question}\n   - **Đáp án:** ${e.answer}`).join('\n');
    return `- **Luồng ${label} — hint: ${hint}**\n${items}`;
  };
  const dsMd = (l.postCheck?.ds || []).map((x) => `  - ${x.t} → **${x.v}**`).join('\n');

  return [
    {
      s: 'S0', t: 'BẮT ĐẦU KHI SẴN SÀNG',
      md: `- **V1 (màn chiếu):** "${l.title} · Toán ${l.grade} · Tuần ${l.week}" + mã phòng + PIN.\n- **Student:** nhập mã phòng, quan sát dữ liệu mở đầu của trục thực nghiệm bên dưới.\n- **GV nêu ngắn:** "${l.opening}"`,
    },
    {
      s: 'S1', t: `KHỞI ĐỘNG — ${l.s1.title}`,
      md: `- **Tình huống:** ${l.s1.context}
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *${l.s1.question}*
${l.s1.options.map((o, i) => `  - (${'ABC'[i]}) ${o}`).join('\n')}
  - **Correct: (${'ABC'[l.s1.correct]})** — ${l.s1.why}
- **Câu hỏi thảo luận tiếp:**
${(l.s1.discuss || []).map((d, i) => `  ${i + 1}. ${d}`).join('\n')}
- **TeacherCue (lớp yếu):** ${l.s1.cue}
- **LookFor:** ${l.s1.lookFor}`,
    },
    {
      s: 'S2', t: 'XÁC ĐỊNH MỤC TIÊU — M / S / C',
      md: `- **Must:** ${l.goals.must}
- **Should:** ${l.goals.should}
- **Could:** ${l.goals.could}
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "${l.focusQuestion}"`,
    },
    {
      s: 'S3', t: `CÔNG CỤ TOÁN HỌC — ${l.s3.title}`,
      md: `${l.s3.steps.map((x, i) => `- **Bước ${i + 1}:** ${x}`).join('\n')}
- **Câu hỏi dẫn (máy HS):**
${l.s3.ask.map((x, i) => `  ${i + 1}. ${x}`).join('\n')}
- **TeacherCue (lớp yếu):** ${l.s3.cue}
- **Chốt:** ${l.s3.close}`,
    },
    {
      s: 'S4', t: 'PHÁT HIỆN LỖI SAI AI (AI Error of the Week)',
      md: `- **Lời giải AI (chiếu màn hình):** "${l.aiError.wrongSolution}"
- **Nhiệm vụ HS:**
  1. Bắt lỗi: ${l.s4.bat}
  2. Bằng chứng: ${l.s4.chung}
  3. Sửa: ${l.s4.sua}
- **TeacherCue:** ${l.s4.cue}
- **LookFor:** ${l.s4.lookFor}`,
    },
    {
      s: 'S5', t: 'HƯỚNG DẪN PHÂN LUỒNG (M / S / C)',
      md: `- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "${l.s6.hints.M}"
  - **S:** "${l.s6.hints.S}"
  - **C:** "${l.s6.hints.C}"`,
    },
    {
      s: 'S6', t: 'NHIỆM VỤ CÓ LỰA CHỌN — 3 luồng đều có hint',
      md: `${routeMd('M (Must)', M, l.s6.hints.M)}

${routeMd('S (Should)', S, l.s6.hints.S)}

${routeMd('C (Could)', C, l.s6.hints.C)}

- **LookFor:** ${l.s6.lookFor}`,
    },
    {
      s: 'S7', t: 'POST-CHECK CÁ NHÂN & ĐÁNH GIÁ THƯỜNG XUYÊN',
      md: `- **ĐGTX (máy HS):** ${l.postCheck.q} → ${l.postCheck.a}
- **Câu hỏi bảng con (Đúng/Sai):**
${dsMd}
- **TeacherCue:** ${l.postCheck.cue}`,
    },
    {
      s: 'S8', t: 'KIỂM TRA NHANH (QUICK-CHECK)',
      md: `${s.quick.map((q, i) => `- **Câu ${i + 1}:** ${q.question} → ${q.solution}`).join('\n')}
- **Chốt nhanh:** ${l.s8Close}`,
    },
    {
      s: 'S9', t: `ỨNG DỤNG THỰC TẾ — ${l.s9.title}`,
      md: `${l.s9.bullets.map((b) => `- ${b}`).join('\n')}
- **TeacherCue:** ${l.s9.cue}`,
    },
    {
      s: 'S10', t: 'TỔNG KẾT & THẺ THOÁT HIỂM (EXIT TICKET)',
      md: `- **Exit Ticket (4 mục):**
  1. ${l.exit[0]}
  2. ${l.exit[1]}
  3. ${l.exit[2]}
  4. **Chốt ngữ cảnh:** ${l.exit[3]}
- **TeacherCue (lớp yếu):** ${l.exitCue}`,
    },
  ];
}

function buildGateD(lesson) {
  const tl = timelineFor(lesson.timelineKey);
  const v72 = isV72Week(lesson);
  const rows = lesson.timeMap.map(([goc, phut, chang]) => `| ${goc} | ${phut} | ${chang} |`).join('\n');
  const segs = lesson.seg.map((segment, index) => {
    const range = v72 ? (V72_STAGE_TIME[segment.s] || '') : `${tl[index][1]}–${tl[index][2]}s`;
    return `### ${segment.s} · ${range} · ${segment.t}\n${segment.md.trim()}\n`;
  }).join('\n');
  const v72Table = v72 ? `
> **Lưu ý khung giờ:** tuần ${lesson.week} chạy hợp đồng **V7.2 — 14 hoạt động (P00–P39)**, không phải 11 chặng Gate D. Bảng dưới ánh xạ từng hoạt động runtime sang chặng sư phạm của tài liệu này:

| Hoạt động runtime | Giây | Phase | Chặng sư phạm tương ứng |
|---|---|---|---|
${V72_MAP.map(([id, t, phase, stage]) => `| ${id} | ${t} | ${phase} | ${stage} |`).join('\n')}
` : '';

  return `# GATE D · Khối ${lesson.grade} — ${lesson.title} (Tuần ${lesson.week} · Tiết ${lesson.period}) · V8.8 Master Teacher

> Key \`${lesson.key}\` · timeline \`${v72 ? 'V7.2 (14 hoạt động)' : (lesson.timelineKey || 'default')}\` · soạn lại ${lesson.date || '2026-11-04'} · **Trạng thái: chuẩn V8.8 Master Teacher (nâng cấp hồi tố)**  
> Nguồn: giáo án chuẩn \`tasks/giaoan-goc-${lesson.key}.md\`.  
> Tiêu chuẩn: trục dữ liệu thực nghiệm xuyên suốt, câu hỏi tương tác có options, teacherCue định hướng lớp yếu, hint phân tầng M/S/C, AI Error nằm trong ngữ cảnh bài, Exit Ticket cô đọng.  
> Khuôn: ${v72 ? '14 hoạt động V7.2 (P00–P39) trên 2400 giây' : '11 chặng hoạt động 0–2400s + chặng thứ 12 "Sau" disabled'}.
${v72Table}
---

## 0. Ánh xạ giáo án gốc → các chặng

| Hoạt động gốc | Dải phút gốc | Chặng V8.8 (giây) |
|---|---|---|
${rows}
${v72 ? '' : '| Sau tiết học (disabled ngoài giờ) | — | S11 2400s+ |'}

---

## 1. Trục dữ liệu thực nghiệm xuyên suốt (Thematic Dataset)

${lesson.axis.trim()}

---

## 2. Storyboard các chặng hoạt động kèm TeacherCue & Student Interaction

${segs}
${v72 ? '### S13 · 2340–2400s · TỰ ĐÁNH GIÁ\n\n- HS chọn mức MUST / SHOULD / COULD theo bằng chứng thực tế; GV ghi nhận để điều nhịp tiết sau.' : '### S11 · 2400s+ · HẾT GIỜ (nút "Sau" disabled)'}

${(lesson.after || '- HS hoàn thành bài tập về nhà và chuẩn bị tiết kế tiếp theo PPCT.').trim()}
`;
}

function buildGiaoAn(lesson) {
  const s = lesson.snapshot;
  const seg = (id) => lesson.seg.find((x) => x.s === id)?.md.trim() || '';
  const exercises = s.exercises.map((e, i) => `${i + 1}. \`[${e.level}]\` ${e.question}\n   - **Đáp án:** ${e.answer}`).join('\n');
  const mistakes = s.mistakes.map((m) => `- ${m}`).join('\n');
  return `# KẾ HOẠCH DẠY HỌC — ${lesson.title} (Toán ${lesson.grade} · Tuần ${lesson.week} · Tiết ${lesson.period})

| Lớp | ${lesson.grade} | Tên bài học | ${lesson.title} | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | ${lesson.week} | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại ${lesson.date || '2026-11-04'} · khớp Gate D \`tasks/gate-d-${lesson.key}.md\`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** ${lesson.goals.must}
- **Should (Trọng tâm – Thông hiểu):** ${lesson.goals.should}
- **Could (Nâng cao – Vận dụng):** ${lesson.goals.could}

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

${lesson.axis.trim()}

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
${seg('S1')}

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
${seg('S2')}

### 3. Hoạt động 3 — Hình thành kiến thức
${seg('S3')}

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
${seg('S4')}

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
${seg('S5')}

${seg('S6')}

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
${seg('S7')}

${seg('S8')}

${seg('S9')}

${seg('S10')}

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

${exercises}

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

${mistakes}

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
`;
}

const lessons = [];
for (const name of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tasks/master', `${name}.mjs`)).href);
  lessons.push(...(mod.default || mod.lessons));
}

const snaps = {
  main: JSON.parse(fs.readFileSync(SNAP.main, 'utf8')),
  batch2: JSON.parse(fs.readFileSync(SNAP.batch2, 'utf8')),
};

const touched = { main: false, batch2: false };
const problems = [];

for (const lesson of lessons) {
  const s = lesson.snapshot;
  // chuẩn hoá: ví dụ dùng `solution` (một số bản nháp ghi `answer`)
  s.examples = s.examples.map((e) => ({ question: e.question, solution: e.solution ?? e.answer }));
  if (!lesson.seg) lesson.seg = synthesizeSegs(lesson);
  if (s.examples.length !== 2) problems.push(`${lesson.key}: examples=${s.examples.length}`);
  if (s.examples.some((e) => !e.question || !e.solution)) problems.push(`${lesson.key}: ví dụ thiếu question/solution`);
  if (s.exercises.length !== 6) problems.push(`${lesson.key}: exercises=${s.exercises.length}`);
  if (s.quick.length !== 2 && s.quick.length !== 3) problems.push(`${lesson.key}: quick=${s.quick.length}`);
  if (!s.formulas.length) problems.push(`${lesson.key}: formulas rỗng`);
  if (!s.mistakes.length) problems.push(`${lesson.key}: mistakes rỗng`);
  const levels = new Set(s.exercises.map((e) => e.level));
  for (const lv of ['NB', 'TH', 'VD']) if (!levels.has(lv)) problems.push(`${lesson.key}: thiếu mức ${lv}`);
  if (lesson.seg.length !== 11) problems.push(`${lesson.key}: seg=${lesson.seg.length} (cần 11)`);
  const hostEntry = Object.entries(snaps).find(([, snap]) => snap.lessonSpecs.some((x) => x.key === lesson.key));
  const existingAE = hostEntry ? (hostEntry[1].aiErrors[lesson.key] || {}) : {};
  const mergedAE = { ...existingAE, ...lesson.aiError };
  for (const f of ['category', 'wrongSolution', 'correction', 'proof', 'whyAiError', 'teacherPrompt', 'studentProduct', 'boardPrompt', 'libraryTitle']) {
    if (!mergedAE[f]) problems.push(`${lesson.key}: aiError thiếu ${f}`);
  }
  if (!/sửa/i.test(mergedAE.teacherPrompt)) problems.push(`${lesson.key}: teacherPrompt phải có chữ "sửa" (yêu cầu HS sửa lời giải)`);

  let host = null;
  for (const [name, snap] of Object.entries(snaps)) {
    const spec = snap.lessonSpecs.find((x) => x.key === lesson.key);
    if (!spec) continue;
    Object.assign(spec, {
      focus: s.focus, formulas: s.formulas, examples: s.examples, exercises: s.exercises,
      quick: s.quick, mistakes: s.mistakes, boardKnowledge: s.boardKnowledge,
    });
    if (lesson.setTimeline && lesson.timelineKey) spec.timelineKey = lesson.timelineKey;
    snap.aiErrors[lesson.key] = { ...(snap.aiErrors[lesson.key] || {}), key: lesson.key, ...lesson.aiError };
    host = name;
    touched[name] = true;
  }
  if (!host) { problems.push(`${lesson.key}: KHÔNG tìm thấy spec trong snapshot`); continue; }

  fs.writeFileSync(path.join(ROOT, `tasks/gate-d-${lesson.key}.md`), buildGateD(lesson), 'utf8');
  if (lesson.lessonType !== 'practice') {
    fs.writeFileSync(path.join(ROOT, `tasks/giaoan-goc-${lesson.key}.md`), buildGiaoAn(lesson), 'utf8');
  }
}

if (problems.length) {
  console.error('LỖI DỮ LIỆU:\n' + problems.join('\n'));
  process.exit(1);
}

for (const [name, file] of Object.entries(SNAP)) {
  if (!touched[name]) continue;
  fs.writeFileSync(file, JSON.stringify(snaps[name], null, 2) + '\n', 'utf8');
  console.log(`cập nhật ${path.basename(file)}`);
}
console.log(`OK: ${lessons.length} bài → ${lessons.map((l) => l.key).join(', ')}`);
