import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const compress = value => gzipSync(JSON.stringify(value)).toString('base64');
const ppct = JSON.parse(read('tasks/r23-hkii/ppct-hkii.json'));
const lessons = [], exams = [], coverage = [];
for (const grade of ppct.grades) {
  const authored = JSON.parse(read(`content/lessons/hkii-2026-g${grade.grade}.json`));
  const periods = new Map(grade.lessons.map(period => [period.id, period]));
  for (const entry of authored.entries) {
    const { pkg, title, sourcePeriodId } = entry;
    const source = periods.get(sourcePeriodId);
    assert.ok(source && source.kind !== 'assessment', sourcePeriodId);
    assert.equal(pkg.grade, grade.grade);
    assert.equal(pkg.id, `r23-${source.id}`);
    assert.equal(pkg.status, 'draft');
    assert.equal(pkg.contentHash, hashPackage(pkg), pkg.id);
    const validation = validateLessonPackage(pkg, { mode: 'draft' });
    assert.ok(validation.ok, `${pkg.id}: ${JSON.stringify(validation.errors)}`);
    assert.equal(pkg.budget.slotMinutes, 40);
    const category = source.kind === 'elective' ? 'elective' : source.kind === 'review' ? 'review' : source.kind === 'assessment_feedback' ? 'feedback' : /luyện tập|practice/i.test(source.detail) ? 'practice' : 'formation';
    lessons.push({ id: pkg.id, title, grade: grade.grade, semester: 2, week: source.week, period: source.period,
      kind: source.kind, category, mode: category === 'elective' ? 'game' : 'lesson', status: pkg.status,
      version: pkg.version, slotMinutes: pkg.budget.slotMinutes, data: compress(pkg) });
    coverage.push({ grade: grade.grade, sourcePeriodId, target: pkg.id, mode: category === 'elective' ? 'game' : 'lesson' });
  }
  for (const item of authored.exams) {
    assert.equal(item.sourcePeriodIds.length, 2, item.id);
    assert.ok(item.sourcePeriodIds.every(id => periods.get(id)?.kind === 'assessment'), item.id);
    const normalized = JSON.parse(read(item.files.normalizedExam || item.files.json));
    const exam = normalized.exam || normalized;
    assert.equal(exam.durationMin, 80, item.id);
    const questionText = read(item.files.questionText || item.files.text);
    const teacherSolutions = read(item.files.teacherSolutions);
    exams.push({ id: item.id, title: item.title, grade: grade.grade, semester: 2, week: item.week,
      minutes: item.minutes, sourcePeriodIds: item.sourcePeriodIds, status: 'draft', data: compress({ exam, questionText, teacherSolutions }) });
    coverage.push(...item.sourcePeriodIds.map(sourcePeriodId => ({ grade: grade.grade, sourcePeriodId, target: item.id, mode: 'exam' })));
  }
}
assert.equal(lessons.length, 404);
assert.equal(exams.length, 6);
assert.equal(lessons.filter(item => item.mode === 'game').length, 97);
assert.equal(new Set([...lessons, ...exams].map(item => item.id)).size, 410);
const expectedIds = ppct.grades.flatMap(grade => grade.lessons.map(period => period.id)).sort();
assert.deepEqual(coverage.map(item => item.sourcePeriodId).sort(), expectedIds);
const output = JSON.stringify({ lessons, exams }) + '\n';
writeFileSync(new URL('content/hkii-2026-catalogue.json', root), output);
writeFileSync(new URL('tasks/r23-hkii/coverage.json', root), JSON.stringify({ sourceSha256: ppct.source.sha256,
  periodRows: coverage.length, lessonPackages: lessons.length, electiveGames: 97, examFiles: exams.length,
  cutoffs: ppct.grades.map(grade => ({ grade: grade.grade, ...grade.cutoff })), coverage }, null, 2) + '\n');
console.log(JSON.stringify({ lessons: lessons.length, exams: exams.length, periods: coverage.length, electiveGames: 97, catalogueBytes: Buffer.byteLength(output) }));
