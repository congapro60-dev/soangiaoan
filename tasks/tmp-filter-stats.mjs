import fs from 'fs';

const plans = JSON.parse(fs.readFileSync('tasks/tmp-loaded-all-plans.json', 'utf8'));
const matches = plans.filter(p => {
  const t = (p.title || '').toLowerCase();
  return t.includes('trung tâm') || t.includes('xu thế') || t.includes('tứ phân vị') || t.includes('mốt');
});
console.log('MATCHES FOR STATS G10:', matches);
