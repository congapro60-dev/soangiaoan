import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';

// Bước 1: điền files map (giá trị cuối = sha256 từng file giáo án), giữ fingerprint = "".
const j0 = JSON.parse(readFileSync(P, 'utf8'));
const hashes = {};
for (const file of Object.keys(j0.source.files)) {
  hashes[file] = createHash('sha256').update(readFileSync(file)).digest('hex');
  j0.source.files[file] = hashes[file];
}
j0.source.fingerprint = '';
writeFileSync(P, JSON.stringify(j0, null, 2) + '\n', 'utf8');

// Bước 2: băm toàn bộ bytes file ở trạng thái fingerprint = "" (recipe thầy chốt).
const batchFp = createHash('sha256').update(readFileSync(P)).digest('hex');

// Bước 3: điền fingerprint bằng replace text (giữ nguyên bytes vừa băm, chỉ chèn chuỗi fp).
let t = readFileSync(P, 'utf8');
t = t.replace('"fingerprint": ""', `"fingerprint": "${batchFp}"`);
writeFileSync(P, t, 'utf8');

const out = JSON.parse(t);
console.log('files:');
for (const [f, h] of Object.entries(hashes)) console.log('  ', f, '=', h.slice(0, 16) + '…');
console.log('fingerprint  :', out.source.fingerprint);
console.log('hex64 ok     :', /^[a-f0-9]{64}$/.test(out.source.fingerprint) && Object.values(out.source.files).every((h) => /^[a-f0-9]{64}$/.test(h)));
console.log('specs:', out.lessonSpecs.length, 'aiErrors:', Object.keys(out.aiErrors).length);
