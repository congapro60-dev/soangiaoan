// Trích giáo án "Tiết 2: Luyện tập" (g12) từ dump → tasks/giaoan-goc-12-11-79.md
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/tmp-giaoan-dump-12-11-79.json', 'utf8'));
const d = j.docs.find((x) => x.id === '315100a6-dfab-40ef-9d03-aa13df0d5f78');
if (!d) throw new Error('NOT_FOUND');
const header = '<!-- Nguồn: Firestore lessonPlans/315100a6-dfab-40ef-9d03-aa13df0d5f78 — "Tiết 2: Luyện tập" — bài tương tác adaptive-1792833650874 — tải 2026-10-28 (trích từ dump tasks/tmp-giaoan-dump-12-11-79.json) — số ký tự thân giáo án: ' + d.content.length + ' -->\n\n';
fs.writeFileSync(__dirname + '/giaoan-goc-12-11-79.md', header + d.content + '\n', 'utf8');
console.log('WROTE tasks/giaoan-goc-12-11-79.md total=' + (header.length + d.content.length));
