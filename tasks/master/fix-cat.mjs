import fs from 'node:fs';

const SNAP = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const data = JSON.parse(fs.readFileSync(SNAP, 'utf8'));

const fixCat = {
  '10-12-89': 'Lỗi khái niệm',
  '10-12-91': 'Lỗi đại số',
  '11-12-83': 'Lỗi khái niệm',
  '11-12-84': 'Thiếu điều kiện',
  '11-12-85': 'Thiếu điều kiện',
  '11-12-87': 'Thiếu điều kiện',
};

for (const [k, cat] of Object.entries(fixCat)) {
  if (data.aiErrors[k]) {
    data.aiErrors[k].category = cat;
    console.log(`Đã sửa category cho ${k} thành "${cat}"`);
  }
}

fs.writeFileSync(SNAP, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Xong cập nhật category.');
