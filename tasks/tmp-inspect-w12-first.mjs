import fs from 'fs';

function getWeek12Candidate() {
  const g10 = JSON.parse(fs.readFileSync('src/data/ppct/tds-g10.json', 'utf8')).lessons.filter(l => l.week === 12);
  const g11 = JSON.parse(fs.readFileSync('src/data/ppct/tds-g11.json', 'utf8')).lessons.filter(l => l.week === 12);
  const g12 = JSON.parse(fs.readFileSync('src/data/ppct/tds-g12.json', 'utf8')).lessons.filter(l => l.week === 12);

  return {
    g10_first: g10[0],
    g11_first: g11[0],
    g12_first: g12[0]
  };
}

console.log(JSON.stringify(getWeek12Candidate(), null, 2));
