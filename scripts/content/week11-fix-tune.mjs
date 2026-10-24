// Tuần 11 HKI 2026 — rà + tinh chỉnh 24 gói (G10 r099–r108, G11 r103–r111, G12 r111–r118):
//   1) Sửa nhãn toán đã verify nghiệm: 30.47→30{,}47 + thành phần 'a' (r100 G10);
//      \frac12$., 尾 dấu câu (r103 G11); +0 thừa (r111 G12); hệ số 1 thừa 1x^2 (r113/r114), 1\sqrt2 (r117 G12).
//   2) Thêm chỉ dẫn nhập phân số tối giản cho task numeric_exact có KEY tuần hoàn (r105 G11).
//   3) Gắn SVG minh họa: task.imageUrl + diagramUrl của hint đầu tiên của task đó.
// Idempotent: bỏ qua trường đã có; chỉ rehash pkg bị đụng; validate mỗi pkg sau sửa.
// Chạy: node scripts/content/week11-fix-tune.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const IMG_DIR = '/content/hinh/';
const root = new URL('../../', import.meta.url);

const VECT_HB = 'r103-g10-tong-vecto-hinh-binh-hanh.svg';
const VECT_3D = 'r103-g10-tong-vecto-quy-tac-ba-diem.svg';
const CHUOI = 'r104-g10-chuoi-vecto-trung-diem.svg';
const HIEU_CB = 'r105-g10-hieu-vecto-ab-ac.svg';
const HIEU_BC = 'r105-g10-hieu-vecto-ac-ab.svg';
const HERON = 'r106-g10-heron-noi-tiep.svg';
const SIN_TRAM = 'r106-g10-dinh-li-sin-hai-tram.svg';
const MIEN = 'r107-g10-mien-nghiem-doi-giac.svg';
const TU_DIEN = 'r106-g11-tu-dien-sabc-trung-diem.svg';
const HOP = 'r106-g11-hinh-hop-2-mat-doi-dien.svg';
const HAI_MP = 'r106-g11-hai-mp-cat-theo-d.svg';
const THANG = 'r107-g11-thang-chu-a.svg';
const THALES = 'r107-g11-thales-3-mat-phang.svg';
const CHOP = 'r107-g11-chop-sabcd-thiet-dien.svg';
for (const name of [VECT_HB, VECT_3D, CHUOI, HIEU_CB, HIEU_BC, HERON, SIN_TRAM, MIEN, TU_DIEN, HOP, HAI_MP, THANG, THALES, CHOP]) {
  if (!existsSync(new URL(`public${IMG_DIR}${name}`, root))) throw new Error(`Missing SVG: ${name}`);
}

// Ản x chín chữ ký/text đã fix theo pkg id tuần 11 (nghiêm: chỉ pkg trong danh sách)
const textRules = {
  'r22-g10-discover-r100': [
    { re: /(\d+)\.47\b/g, to: (m, d) => `${d}{,}47`, expect: 21 },
    { re: / với a là /g, to: () => ' với $a$ là ', expect: 7 },
  ],
  'r22-g11-discover-r103': [
    { re: /\\frac12\$\.,/g, to: () => '\\frac12$,', expect: 7 },
  ],
  'r22-g12-discover-r111': [
    { re: /x\^3-27x\+0/g, to: () => 'x^3-27x', expect: 1 },
    { re: /x\^3-3x\+0/g, to: () => 'x^3-3x', expect: 1 },
  ],
  'r22-g12-discover-r113': [{ re: /1x\^2/g, to: () => 'x^2', expect: 13 }],
  'r22-g12-discover-r114': [{ re: /1x\^2/g, to: () => 'x^2', expect: 12 }],
  'r22-g12-discover-r117': [{ re: /1\\sqrt2/g, to: () => '\\sqrt2', expect: 18 }],
};

// Bản đồ SVG: pkg → task id → file (r106 G10 map theo objectiveIds)
const imageRules = {
  'r22-g10-discover-r103': {
    'task-1-1': VECT_HB, 'task-3-1': VECT_HB, 'task-4-1': VECT_HB, 'task-6-1': VECT_HB,
    'task-2-1': VECT_3D, 'task-3-2': VECT_3D, 'task-5-1': VECT_3D,
  },
  'r22-g10-discover-r104': {
    'task-1-1': CHUOI, 'task-2-1': CHUOI, 'task-3-1': CHUOI, 'task-3-2': CHUOI,
    'task-4-1': CHUOI, 'task-5-1': CHUOI, 'task-6-1': CHUOI,
  },
  'r22-g10-discover-r105': {
    'task-1-1': HIEU_CB, 'task-3-1': HIEU_CB, 'task-4-1': HIEU_CB, 'task-6-1': HIEU_CB,
    'task-2-1': HIEU_BC, 'task-3-2': HIEU_BC, 'task-5-1': HIEU_BC,
  },
  'r22-g10-discover-r106': { byObjective: { 'obj-1': HERON, 'obj-2': SIN_TRAM }, skipTaskIds: ['task-7-1'] },
  'r22-g10-discover-r107': { allExcept: ['task-7-1'], file: MIEN },
  'r22-g11-discover-r106': { 'task-3-1': TU_DIEN, 'task-3-2': HOP, 'task-2-1': HAI_MP, 'task-4-1': HAI_MP },
  'r22-g11-discover-r107': {
    'task-1-1': THANG, 'task-2-1': THALES, 'task-3-1': THALES, 'task-6-1': THALES, 'task-3-2': CHOP,
  },
};

const FRACTION_HINT = ' Nhập kết quả dưới dạng phân số tối giản, dùng dấu / (ví dụ: 12/5).';

function walkStrings(node, fn, skipKeys = new Set(['sourceRefs'])) {
  let count = 0;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (typeof node[i] === 'string') {
        const after = fn(node[i]);
        if (after !== node[i]) { node[i] = after; count += 1; }
      } else count += walkStrings(node[i], fn, skipKeys);
    }
    return count;
  }
  if (typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (skipKeys.has(key)) continue;
      if (typeof val === 'string') {
        const after = fn(val);
        if (after !== val) { node[key] = after; count += 1; }
      } else count += walkStrings(val, fn, skipKeys);
    }
  }
  return count;
}
let globalChanges = 0;

const summary = { textPatches: {}, images: {}, fractionPrompts: [], rehashed: [] };

for (const grade of [10, 11, 12]) {
  const file = new URL(`content/lessons/hki-2026-g${grade}.json`, root);
  const raw = readFileSync(file, 'utf8');
  const db = JSON.parse(raw);
  // Giữ nguyên serialization gốc từng file (indent phát hiện từ dòng "format")
  const indent = (raw.slice(0, 400).match(/\n(\s+)"format"/) || [null, '  '])[1];
  let fileDirty = false;
  for (const entry of db.entries) {
    const pkg = entry.pkg;
    if (!pkg || !String(pkg.id).startsWith(`r22-g${grade}-discover-`)) continue;
    let touched = false;
    const stat = { tasks: 0, hints: 0 };

    // 1) Text fixes
    const rules = textRules[pkg.id];
    if (rules) {
      let total = 0;
      for (const rule of rules) {
        let applied = 0;
        walkStrings(pkg, (s) => s.replace(rule.re, (...args) => { applied += 1; return rule.to(...args); }));
        total += applied;
      }
      if (total) {
        summary.textPatches[pkg.id] = total;
        touched = true;
      }
    }

    // 2) Ảnh SVG
    const imgRule = imageRules[pkg.id];
    if (imgRule) {
      for (const task of pkg.tasks || []) {
        const fileName = imgRule.byObjective
          ? (!imgRule.skipTaskIds?.includes(task.id) ? imgRule.byObjective[task.objectiveIds?.[0]] : undefined)
          : imgRule.allExcept
            ? (!imgRule.allExcept.includes(task.id) ? imgRule.file : undefined)
            : imgRule[task.id];
        if (!fileName || task.imageUrl) continue;
        task.imageUrl = IMG_DIR + fileName;
        stat.tasks += 1;
        touched = true;
        const hint = (pkg.hints || []).find((h) => h.taskId === task.id && !h.diagramUrl);
        if (hint) {
          hint.diagramUrl = IMG_DIR + fileName;
          stat.hints += 1;
        }
      }
    }
    if (stat.tasks || stat.hints) summary.images[pkg.id] = stat;

    // 3) Chỉ dẫn phân số cho numeric_exact có KEY tuần hoàn (key không phải thập phân hữu hạn 1 chữ số)
    if (pkg.id === 'r22-g11-discover-r105') {
      for (const task of pkg.tasks || []) {
        const key = task.evaluation && task.evaluation.answerKey;
        if (task.evaluation?.checkerId !== 'numeric_exact') continue;
        if (typeof key !== 'number' || !Number.isFinite(key) || Number.isInteger(key)) continue;
        const terminating = Number.isInteger(key * 10); // 8.2 → nhập thẳng được, khỏi yêu cầu phân số
        if (terminating && task.prompt.endsWith(FRACTION_HINT)) {
          task.prompt = task.prompt.slice(0, -FRACTION_HINT.length);
          touched = true;
          continue;
        }
        if (terminating || task.prompt.includes('phân số tối giản')) continue;
        task.prompt += FRACTION_HINT;
        summary.fractionPrompts.push(task.id);
        touched = true;
      }
    }

    if (!touched) continue;
    pkg.contentHash = hashPackage(pkg);
    const validation = validateLessonPackage(pkg);
    if (!validation.ok) {
      console.error(`VALIDATE FAIL ${pkg.id}:`, JSON.stringify(validation.errors));
      process.exit(1);
    }
    summary.rehashed.push(pkg.id);
    fileDirty = true;
  }
  if (fileDirty) writeFileSync(file, JSON.stringify(db, null, indent) + '\n');
}
const textTotal = Object.values(summary.textPatches).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ ...summary, textTotal }));
