import fs from 'fs';

const plans = JSON.parse(fs.readFileSync('tasks/tmp-loaded-all-plans.json', 'utf8'));
const g10W12 = plans.filter(p => {
  const t = (p.title || '').toLowerCase();
  return (p.grade == 10 || t.includes('10')) && (t.includes('vectơ') || t.includes('tổng và hiệu'));
});
console.log('G10 VECTO PLANS IN LIBRARY:');
console.log(JSON.stringify(g10W12, null, 2));
