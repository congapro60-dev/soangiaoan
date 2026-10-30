import fs from 'fs';

function scanWeek(file, weekNo) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lessons = data.lessons.filter(l => l.week === weekNo || (l.weeks && l.weeks.includes(weekNo)));
  return lessons.map(l => ({
    id: l.id,
    periodNo: l.periodNo,
    subject: l.subject,
    title: l.title,
    detail: l.detail ? l.detail.split('\n')[0] : ''
  }));
}

console.log('=== KHỐI 10 TUẦN 12 ===');
console.table(scanWeek('src/data/ppct/tds-g10.json', 12));

console.log('=== KHỐI 11 TUẦN 12 ===');
console.table(scanWeek('src/data/ppct/tds-g11.json', 12));

console.log('=== KHỐI 12 TUẦN 12 ===');
console.table(scanWeek('src/data/ppct/tds-g12.json', 12));
