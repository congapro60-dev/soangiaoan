const fs = require('fs');
const a = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log-part2a.json', 'utf8'));
console.log('part2a.draftTest:', JSON.stringify(a.draftTest).slice(0, 600));
const b = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log-part2b.json', 'utf8'));
console.log('part2b.draftTest full:', JSON.stringify(b.draftTest, null, 1).slice(0, 900));
