import { readFileSync, writeFileSync } from 'node:fs';
const p = 'firestore.rules';
let t = readFileSync(p, 'utf8');
const oldPath = 'match /public/publishedQuestions/{questionId}';
const newPath = 'match /publishedQuestions/{questionId}';
if (!t.includes(oldPath)) throw new Error('path not found');
t = t.split(oldPath).join(newPath);
t = t.split('// body + mã ẩn danh, không tên. Write chỉ qua Admin SDK.')
  .join('// body + mã ẩn danh, không tên. Write chỉ qua Admin SDK. (Subcollection ngang cấp public)');
writeFileSync(p, t, 'utf8');
console.log('rules fixed');
