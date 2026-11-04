// Trích giáo án gốc bài 78 (114cd695) từ dump → tasks/giaoan-goc-11-11-78.md (header nguồn như file 76).
const fs = require('fs');
const path = require('path');

const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmp-giaoan-dump-11-11-78.json'), 'utf8'));
const doc = dump.docs.find((d) => d.id === '114cd695-70d2-4a12-8e4b-d47983a425fa');
if (!doc) { console.error('DOC_NOT_FOUND'); process.exit(1); }

const header = '<!-- Nguồn: Firestore lessonPlans/114cd695-70d2-4a12-8e4b-d47983a425fa · '
  + doc.title + ' · bài tương tác adaptive-1792827844375 · tải 2026-10-27 '
  + '(trích từ dump tasks/tmp-giaoan-dump-11-11-78.json) · số ký tự thân giáo án: ' + doc.content.length + ' -->';

const out = header + '\n\n' + doc.content + '\n';
const dest = path.join(__dirname, 'giaoan-goc-11-11-78.md');
fs.writeFileSync(dest, out, 'utf8');
console.log('WROTE ' + dest + ' total=' + out.length + ' body=' + doc.content.length);
process.exitCode = 0;
