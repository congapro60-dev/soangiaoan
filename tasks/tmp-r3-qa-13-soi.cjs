const l = JSON.parse(require('fs').readFileSync('tasks/tmp-r3-qa-c-log-part-exit3.json', 'utf8'));
const p = l.resultPanel.excerpt;
const i = p.indexOf('học sinh đã gửi');
console.log('QUANH "học sinh đã gửi":');
console.log(p.slice(Math.max(0, i - 280), i + 180));
console.log('has1HS:', l.resultPanel.has1HS, '| matches:', JSON.stringify(l.resultPanel.matches));
