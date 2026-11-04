// Trích giáo án Tiết 3 từ dump → tasks/giaoan-goc-11-11-79.md (kèm header nguồn)
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(__dirname + '/tmp-giaoan-dump-11-11-79.json', 'utf8'));
const d = j.docs.find((x) => x.id === 'c8453c88-fbb8-4e6d-b84c-5a323abcc394');
if (!d) throw new Error('NOT_FOUND');
const header = '<!-- Nguồn: Firestore lessonPlans/c8453c88-fbb8-4e6d-b84c-5a323abcc394 — "Hai mặt phẳng song song — Tiết 3" — bài tương tác adaptive-1792828475281 — tải 2026-10-27 (trích từ dump tasks/tmp-giaoan-dump-11-11-79.json) — số ký tự thân giáo án: ' + d.content.length + ' -->\n\n';
fs.writeFileSync(__dirname + '/giaoan-goc-11-11-79.md', header + d.content + '\n', 'utf8');
console.log('WROTE tasks/giaoan-goc-11-11-79.md total=' + (header.length + d.content.length));
