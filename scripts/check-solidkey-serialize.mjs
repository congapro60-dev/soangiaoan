/**
 * Kiem solidKey co di toi client duoc khong.
 * Dung serializeForStudent (duong that su gui du lieu cho HS), khong dung
 * ham noi bo. Muc dich: bat truong hop serializer lam rot field.
 */
import { getAuthoredLesson } from '../lib/lesson/authored-content.js';
import { serializeForTeacher } from '../lib/lesson/serialize.js';

const cases = [
  { pkg: 'r22-g11-discover-r106', task: 'task-3-1', expect: 'tu-dien-sabc' },
  { pkg: 'r22-g11-discover-r106', task: 'task-3-2', expect: 'hop-chu-nhat' },
  { pkg: 'r22-g11-discover-r107', task: 'task-3-2', expect: 'chop-sabcd' },
];

let fail = 0;

for (const c of cases) {
  const pkg = await getAuthoredLesson(c.pkg);
  const task = pkg?.tasks?.find((t) => t.id === c.task);
  if (!task) {
    console.log('FAIL khong tim thay', c.pkg, c.task);
    fail++;
    continue;
  }
  const ok = task.solidKey === c.expect;
  console.log(`${c.pkg} ${c.task}: solidKey=${JSON.stringify(task.solidKey)} ${ok ? 'OK' : 'FAIL ky vong ' + c.expect}`);
  if (!ok) fail++;
}

// Kiem them: moi task co solidKey deu tro toi khoi CO THAT trong engine
const solidsSrc = await import('../lib/geometry/solid.ts');
const known = new Set(Object.keys(solidsSrc.solids));
console.log('\nKhoi co trong engine:', [...known].join(', '));

for (const c of cases) {
  const pkg = await getAuthoredLesson(c.pkg);
  const task = pkg.tasks.find((t) => t.id === c.task);
  if (task.solidKey && !known.has(task.solidKey)) {
    console.log('FAIL solidKey khong ton tai trong engine:', task.solidKey);
    fail++;
  }
}

console.log(fail === 0 ? '\nTAT CA PASS' : `\n${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
