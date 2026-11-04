const fs = require('fs');
const j2b = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log-part2b.json', 'utf8'));
console.log('part2b.draftTest:', JSON.stringify(j2b.draftTest).slice(0, 500));
const j = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log.json', 'utf8'));
const s = JSON.stringify(j);
const i = s.indexOf('"disabled"');
console.log('CTX disabled:', s.slice(Math.max(0, i - 300), i + 120));
