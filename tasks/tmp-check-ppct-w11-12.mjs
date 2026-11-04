import fs from 'fs';

const g10ppct = JSON.parse(fs.readFileSync('src/data/ppct/tds-g10.json', 'utf8')).lessons;
const w11_12 = g10ppct.filter(l => l.week === 11 || l.week === 12);
console.table(w11_12.map(l => ({ id: l.id, periodNo: l.periodNo, week: l.week, subject: l.subject, title: l.title, detail: l.detail ? l.detail.split('\n')[0] : '' })));
