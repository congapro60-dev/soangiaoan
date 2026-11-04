import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SNAP_FILE = path.join(ROOT, 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json');
const CATALOG_FILE = path.join(ROOT, 'src/lib/liveLesson/v4/week11Batch2Catalog.ts');
const CATALOG_TEST_FILE = path.join(ROOT, 'src/lib/liveLesson/v4/week11Batch2Catalog.test.ts');
const PUBLICATION_FILE = path.join(ROOT, 'src/lib/liveLesson/v4/sequentialPublication.ts');
const W11_CATALOG_TEST_FILE = path.join(ROOT, 'src/lib/liveLesson/v4/week11Catalog.test.ts');
const UPGRADE_TEST_FILE = path.join(ROOT, 'src/lib/liveLesson/v4/interactiveUpgrade.test.ts');

export function loadPpctWeek(weekNum) {
  const lessons = [];
  for (const grade of [10, 11, 12]) {
    const ppct = JSON.parse(fs.readFileSync(path.join(ROOT, `src/data/ppct/tds-g${grade}.json`), 'utf8')).lessons;
    const weekLessons = ppct.filter((l) => l.week === weekNum);
    for (const l of weekLessons) {
      lessons.push({
        grade,
        week: weekNum,
        periodNo: l.periodNo,
        id: l.id,
        rawTitle: l.title,
        subject: l.subject,
        detail: l.detail || '',
      });
    }
  }
  return lessons;
}

console.log('PPCT loader sẵn sàng.');
