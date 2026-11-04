import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-aq.cjs';
let t = readFileSync(p, 'utf8');
// bỏ noCache trên gvp (trang danh sách không cần; CDP session hay làm networkidle2 treo)
const oldGvp = `  const gvp = await gv.newPage();
  await noCache(gvp);
  await gvp.setViewport({ width: 1440, height: 1000 });`;
if (!t.includes(oldGvp)) throw new Error('gvp anchor missing');
t = t.split(oldGvp).join(`  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 1000 });`);
writeFileSync(p, t, 'utf8');
console.log('patched');
