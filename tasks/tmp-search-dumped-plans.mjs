import fs from 'fs';

const metaFiles = fs.readdirSync('tasks').filter(f => f.startsWith('tmp-plans-meta-') || f.startsWith('tmp-giaoan-dump-'));
console.log('EXISTING META/DUMP FILES:', metaFiles);

for (const f of metaFiles) {
  try {
    const data = JSON.parse(fs.readFileSync('tasks/' + f, 'utf8'));
    const items = data.items || data.plans || (Array.isArray(data) ? data : []);
    const g10 = items.filter(p => {
      const t = (p.title || '').toLowerCase();
      return (t.includes('tứ phân vị') || t.includes('xu thế trung tâm') || t.includes('mốt')) && (p.grade === 10 || t.includes('lớp 10') || t.includes('10'));
    });
    if (g10.length > 0) {
      console.log(`IN FILE ${f}: FOUND ${g10.length} CANDIDATES:`);
      g10.forEach(x => console.log(`  - id: ${x.id} | title: ${x.title} | week: ${x.week}`));
    }
  } catch (e) {
    // ignore parse error
  }
}
