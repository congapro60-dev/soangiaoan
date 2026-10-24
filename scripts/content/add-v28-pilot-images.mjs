// V28 Phase A3 — chèn ảnh SVG pilot (r013/r028/r108) vào task.imageUrl và hint.diagramUrl
// của content/lessons/hki-2026-g11.json, rồi recompute pkg.contentHash.
// Idempotent: bỏ qua nếu trường ảnh đã tồn tại. Chạy: node scripts/content/add-v28-pilot-images.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { hashPackage } from '../../lib/lesson/schema.js';

const IMG_DIR = '/content/hinh/';

const taskImages = {
  'thptqg-r013-mc': 'r013-goc-120.svg',
  'thptqg-r013-tf': 'r013-duong-tron-don-vi.svg',
  'thptqg-r013-sa': 'r013-goc-100.svg',
  'thptqg-r028-mc': 'r028-tu-dien-abc.svg',
  'thptqg-r028-tf': 'r028-chop-sabc.svg',
  'thptqg-r028-sa': 'r028-chop-day-vuong.svg',
  'thptqg-r108-mc': 'r108-tam-giac-thales.svg',
  'thptqg-r108-tf': 'r108-hai-mat-phang.svg',
  'thptqg-r108-sa': 'r108-tam-giac-tiso.svg',
};

const hintImages = {
  'hint-thptqg-r013-mc': 'r013-goc-120.svg',
  'hint-thptqg-r013-tf': 'r013-duong-tron-don-vi.svg',
  'hint-thptqg-r013-sa': 'r013-goc-100.svg',
  'hint-thptqg-r028-mc': 'r028-tu-dien-chieu-cao.svg', // biến thể có chân cao h từ A xuống (BCD)
  'hint-thptqg-r028-tf': 'r028-chop-sabc.svg',
  'hint-thptqg-r028-sa': 'r028-chop-day-vuong.svg',
  'hint-thptqg-r108-mc': 'r108-tam-giac-thales.svg',
  'hint-thptqg-r108-tf': 'r108-hai-mat-phang.svg',
  'hint-thptqg-r108-sa': 'r108-tam-giac-tiso.svg',
};

const root = new URL('../../', import.meta.url);
for (const name of Object.values(taskImages)) {
  if (!existsSync(new URL(`public${IMG_DIR}${name}`, root))) throw new Error(`Missing SVG: ${name}`);
}

const file = new URL('content/lessons/hki-2026-g11.json', root);
const db = JSON.parse(readFileSync(file, 'utf8'));
let tasksTouched = 0, hintsTouched = 0;
const pkgs = [];
for (const entry of db.entries) {
  const pkg = entry.pkg;
  if (!pkg) continue;
  let touched = false;
  for (const task of pkg.tasks || []) {
    const img = taskImages[task.id];
    if (img && !task.imageUrl) {
      task.imageUrl = IMG_DIR + img;
      touched = true;
      tasksTouched += 1;
    }
  }
  for (const hint of pkg.hints || []) {
    const img = hintImages[hint.id];
    if (img && !hint.diagramUrl) {
      hint.diagramUrl = IMG_DIR + img;
      touched = true;
      hintsTouched += 1;
    }
  }
  if (touched) {
    pkg.contentHash = hashPackage(pkg);
    pkgs.push(pkg.id);
  }
}
writeFileSync(file, JSON.stringify(db, null, 1) + '\r\n');
console.log(JSON.stringify({ tasksTouched, hintsTouched, pkgs }));
