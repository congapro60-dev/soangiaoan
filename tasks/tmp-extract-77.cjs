// Trích giáo án "Nguyên hàm — Tiết 2" (g12) từ dump → tasks/giaoan-goc-12-11-77.md
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/tmp-giaoan-dump-12-11-77.json', 'utf8'));
const d = j.docs.find((x) => x.id === '1761870e-01b4-47d3-9565-68f6500c805c');
if (!d) throw new Error('NOT_FOUND');
const header = '<!-- Nguồn: Firestore lessonPlans/1761870e-01b4-47d3-9565-68f6500c805c — "Nguyên hàm — Tiết 2" — bài tương tác adaptive-1792832396461 — tải 2026-10-28 (trích từ dump tasks/tmp-giaoan-dump-12-11-77.json) — số ký tự thân giáo án: ' + d.content.length + ' -->\n\n';
fs.writeFileSync(__dirname + '/giaoan-goc-12-11-77.md', header + d.content + '\n', 'utf8');
console.log('WROTE tasks/giaoan-goc-12-11-77.md total=' + (header.length + d.content.length));
