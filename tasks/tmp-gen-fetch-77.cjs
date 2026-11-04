// Sinh script fetch giáo án 12-11-77 từ khuôn 11-11-79
const fs = require('fs');
let t = fs.readFileSync(__dirname + '/tmp-giaoan-fetch-11-11-79.cjs', 'utf8');
t = t.replace('tasks/tmp-plans-meta-11-11-79.json', 'tasks/tmp-plans-meta-12-11-77.json');
t = t.replace('tasks/tmp-giaoan-dump-11-11-79.json', 'tasks/tmp-giaoan-dump-12-11-77.json');
t = t.replace(/const kwList = \[[^\]]+\];/, "const kwList = ['nguyên hàm của một hàm số', 'nguyên hàm', 'tích phân', 'tuần 11', '15 tiết', 'cập nhật 24/10'];");
t = t.replace('// Tải giáo án gốc "Hai mặt phẳng song song — Tiết 3" (g11, Tuần 11) từ Thư viện bài dạy', '// Tải giáo án gốc "Nguyên hàm — Tiết 2" (g12, Tuần 11) từ Thư viện bài dạy');
fs.writeFileSync(__dirname + '/tmp-giaoan-fetch-12-11-77.cjs', t, 'utf8');
console.log('OK kw:', t.includes('nguyên hàm của một hàm số'), '| meta:', t.includes('tmp-plans-meta-12-11-77'));
