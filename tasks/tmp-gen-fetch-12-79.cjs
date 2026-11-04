// Sinh script fetch giáo án 12-11-79 từ khuôn 12-11-78
const fs = require('fs');
let t = fs.readFileSync(__dirname + '/tmp-giaoan-fetch-12-11-78.cjs', 'utf8');
t = t.replace(/tmp-plans-meta-12-11-78\.json/g, 'tmp-plans-meta-12-11-79.json');
t = t.replace(/tmp-giaoan-dump-12-11-78\.json/g, 'tmp-giaoan-dump-12-11-79.json');
t = t.replace(/const kwList = \[[^\]]+\];/, "const kwList = ['luyện tập khoảng biến thiên', 'luyện tập: khoảng biến thiên', 'khoảng biến thiên', 'luyện tập', 'tuần 11', '15 tiết', 'cập nhật 24/10'];");
t = t.replace('// Tải giáo án gốc "Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 1" (g12, Tuần 11) từ Thư viện bài dạy', '// Tải giáo án gốc "Luyện tập: Khoảng biến thiên và khoảng tứ phân vị — Tiết 2" (g12, Tuần 11) từ Thư viện bài dạy');
fs.writeFileSync(__dirname + '/tmp-giaoan-fetch-12-11-79.cjs', t, 'utf8');
console.log('kw ok:', t.includes('luyện tập khoảng biến thiên'), '| meta:', t.includes('tmp-plans-meta-12-11-79.json'), '| dump:', t.includes('tmp-giaoan-dump-12-11-79.json'));
