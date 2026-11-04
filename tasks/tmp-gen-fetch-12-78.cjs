// Sinh script fetch giáo án 12-11-78 từ khuôn 12-11-77
const fs = require('fs');
let t = fs.readFileSync(__dirname + '/tmp-giaoan-fetch-12-11-77.cjs', 'utf8');
t = t.replace(/tmp-plans-meta-12-11-77\.json/g, 'tmp-plans-meta-12-11-78.json');
t = t.replace(/tmp-giaoan-dump-12-11-77\.json/g, 'tmp-giaoan-dump-12-11-78.json');
t = t.replace(/const kwList = \[[^\]]+\];/, "const kwList = ['khoảng biến thiên', 'tứ phân vị', 'độ lệch chuẩn', 'thống kê', 'tuần 11', '15 tiết', 'cập nhật 24/10'];");
t = t.replace('// Tải giáo án gốc "Nguyên hàm — Tiết 2" (g12, Tuần 11) từ Thư viện bài dạy', '// Tải giáo án gốc "Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 1" (g12, Tuần 11) từ Thư viện bài dạy');
fs.writeFileSync(__dirname + '/tmp-giaoan-fetch-12-11-78.cjs', t, 'utf8');
console.log('kw ok:', t.includes('độ lệch chuẩn'), '| meta:', t.includes('tmp-plans-meta-12-11-78.json'), '| dump:', t.includes('tmp-giaoan-dump-12-11-78.json'));
