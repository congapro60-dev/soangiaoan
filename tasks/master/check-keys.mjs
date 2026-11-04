import fs from 'node:fs';

for (const f of ['b1', 'b2a', 'b2b']) {
  const t = fs.readFileSync(`tasks/master/${f}.mjs`, 'utf8');
  const parts = t.split(/key: '/).slice(1);
  for (const p of parts) {
    const key = p.slice(0, p.indexOf("'"));
    const exBlock = (p.split('examples:')[1] || '').split('exercises:')[0];
    const bad = (exBlock.match(/answer:/g) || []).length;
    if (bad) console.log(f, key, 'examples dùng answer:', bad);
  }
}
