import fs from 'node:fs';

const SNAP = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const data = JSON.parse(fs.readFileSync(SNAP, 'utf8'));

const renameMap = {
  '10-12-89': 'Luyện tập các số đặc trưng đo xu thế trung tâm',
  '11-12-83': 'Luyện tập các số đặc trưng đo xu thế trung tâm',
  '11-12-85': 'Quy tắc tính giới hạn và CSN lùi vô hạn',
  '11-12-86': 'Hình lăng trụ và hình hộp',
  '11-12-87': 'Luyện tập hai mặt phẳng song song',
};

for (const spec of data.lessonSpecs) {
  if (renameMap[spec.key]) {
    spec.title = renameMap[spec.key];
    console.log(`Đã đổi title của ${spec.key} thành "${spec.title}"`);
  }
}

fs.writeFileSync(SNAP, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Xong cập nhật snapshot title.');
