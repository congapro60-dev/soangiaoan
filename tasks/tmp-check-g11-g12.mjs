import fs from 'fs';

const plans = JSON.parse(fs.readFileSync('tasks/tmp-loaded-all-plans.json', 'utf8'));
const g11Matches = plans.filter(p => {
  const t = (p.title || '').toLowerCase();
  return (p.grade == 11 || t.includes('11')) && (t.includes('trung tâm') || t.includes('xu thế') || t.includes('mẫu số liệu') || t.includes('tiết 2'));
});
console.log('G11 MATCHES:', g11Matches);

const g12Matches = plans.filter(p => {
  const t = (p.title || '').toLowerCase();
  return (p.grade == 12 || t.includes('12')) && (t.includes('nguyên hàm') || t.includes('phương sai') || t.includes('tiết 3'));
});
console.log('G12 MATCHES:', g12Matches);
