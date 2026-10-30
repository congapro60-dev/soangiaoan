import fs from 'fs';

const meta = JSON.parse(fs.readFileSync('tasks/tmp-plans-meta-10-11-80.json', 'utf8'));
console.log('STATUS:', meta.status, 'TOTAL:', meta.total);
console.log('SAMPLE FIRST 15 TITLES:');
meta.items.slice(0, 15).forEach((p, i) => console.log(`[${i}] ${p.title} (grade: ${p.grade})`));
