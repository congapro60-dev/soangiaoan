import fs from 'node:fs';

const file = process.argv[2];
let t = fs.readFileSync(file, 'utf8');
const before = t;

// 1) escaped apostrophes trong chuỗi -> prime
t = t.replace(/\\'/g, '′');
// 2) ký hiệu hình học: chữ cái + ' + (chữ/số/$) -> prime
t = t.replace(/([A-Za-z])'(?=[A-Za-z0-9$])/g, '$1′');
// 3) chữ cái + ' + khoảng trắng (d' , b' ...) -> prime, trừ khi là dấu đóng chuỗi
t = t.replace(/([A-Za-z])'(?=[ ])/g, '$1′');
// 4) chữ cái + ' + dấu đóng ngoặc/ngoặc vuông cuối câu hình học (hiếm)
t = t.replace(/([A-Za-z])'(?=[\\)\]])/g, '$1′');

fs.writeFileSync(file, t, 'utf8');
console.log(before === t ? 'no change' : 'fixed primes');
