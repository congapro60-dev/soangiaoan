import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-xoaytua4.mjs';
let t = readFileSync(p, 'utf8');
// Regex bị hỏng do escape — thay bằng split/join chuỗi thuần
t = t.split(".replace(/\\n{2,}/g, '\\n')").join(".split('\\n\\n').join('\\n')");
// Nếu vẫn còn regex hỏng dạng /…/ thiếu đóng — thay các dòng dump bằng split
t = t.split("(document.body.innerText || '').replace(/").join("(document.body.innerText || '').split('\\\\n\\\\n').join('\\\\n').replace(/");
writeFileSync(p, t, 'utf8');
console.log('done');
