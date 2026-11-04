import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-xoaytua4.mjs';
const lines = readFileSync(p, 'utf8').split('\n');
// Xóa hẳn phần regex hỏng trên dòng chứa "R1 THẺ DEEP" và "R2 NHÃN CHẬM"
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("R1 THẺ DEEP") || lines[i].includes("R2 NHÃN CHẬM")) {
    lines[i] = lines[i].split(".replace(/").join(".split('~~').join('~~').replace(/");
    lines[i] = lines[i].split("{2,}/g, '\n')").join("'')");
  }
}
// Xóa các dòng regex còn sót standalone (dòng chỉ chứa {2,}/g, '
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === "{2,}/g, '\n')) || '';" || lines[i].trim().startsWith("{2,}/g,")) {
    lines[i] = "";
  }
}
writeFileSync(p, lines.join('\n'), 'utf8');
console.log('cleaned');
