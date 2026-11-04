import fs from 'fs';

const meta = JSON.parse(fs.readFileSync('tasks/tmp-plans-meta-10-11-80.json', 'utf8'));
const p13 = meta.items[13];
console.log('ITEM 13:', p13);

const dump = JSON.parse(fs.readFileSync('tasks/tmp-giaoan-dump-10-11-80.json', 'utf8'));
const full13 = dump.find ? dump.find(x => x.id === p13.id) : dump[p13.id] || dump.plans?.find(x => x.id === p13.id);
console.log('FULL 13 FOUND?', !!full13);
if (full13) {
  const content = full13.content || '';
  console.log('CONTENT LENGTH:', content.length);
  console.log('CONTAINS TIẾT 2 / TỨ PHÂN VỊ?', content.includes('Tiết 2') || content.includes('Tứ phân vị') || content.includes('tứ phân vị') || content.includes('Mốt'));
}
