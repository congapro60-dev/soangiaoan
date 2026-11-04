// Trích giáo án "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" (g12) → tasks/giaoan-goc-12-11-78.md
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/tmp-giaoan-dump-12-11-78.json', 'utf8'));
const d = j.docs.find((x) => x.id === '80820147-a5df-42a1-8653-df385c3108f0');
if (!d) throw new Error('NOT_FOUND');
const header = '<!-- Nguồn: Firestore lessonPlans/80820147-a5df-42a1-8653-df385c3108f0 — "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" — bài tương tác adaptive-1792833009074 — tải 2026-10-28 (trích từ dump tasks/tmp-giaoan-dump-12-11-78.json) — số ký tự thân giáo án: ' + d.content.length + ' -->\n\n';
fs.writeFileSync(__dirname + '/giaoan-goc-12-11-78.md', header + d.content + '\n', 'utf8');
console.log('WROTE tasks/giaoan-goc-12-11-78.md total=' + (header.length + d.content.length));
