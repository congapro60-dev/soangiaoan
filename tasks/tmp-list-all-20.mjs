import fs from 'fs';

const meta = JSON.parse(fs.readFileSync('tasks/tmp-plans-meta-10-11-80.json', 'utf8'));
meta.items.forEach((p, i) => console.log(`[${i}] ${p.id} | ${p.title} | grade: ${p.grade}`));
