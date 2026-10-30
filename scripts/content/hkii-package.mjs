import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { assembleLessonOutline } from '../../lib/lesson/generation-outline.js';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const ppct = JSON.parse(read('tasks/r23-hkii/ppct-hkii.json'));
const periods = new Map(ppct.grades.flatMap(grade => grade.lessons.map(period => [period.id, period])));
const sourcePeriodsById = new Map(ppct.grades.flatMap(grade => [...grade.hki_prerequisites.lessons, ...grade.lessons].map(period => [period.id, period])));
const units = JSON.parse(read('tasks/r22/unit-objectives.json')).units;
const sourceTexts = new Map(units.map(unit => [unit.sourceFile, read(unit.sourceFile).replace(/\r\n/g, '\n')]));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => { throw new Error(`INVALID_HKII_PACKAGE: ${message}`); };
for (const unit of units) {
  if (createHash('sha256').update(sourceTexts.get(unit.sourceFile)).digest('hex') !== unit.sourceSha256) fail(`changed source: ${unit.sourceFile}`);
}

// Separate term binding keeps concurrent HKI authors' inputs immutable.
export function assembleHkiiPackage({ period, outline, title, prerequisites = [], unitReferences = [], sourcePeriods = [], slotMinutes = 40, rubric } = {}) {
  if (!period || !isDeepStrictEqual(periods.get(period.id), period)) fail('period must be an exact in-scope HKII PPCT record');
  if (['assessment', 'unspecified'].includes(period.kind)) fail('assessment/unspecified periods require separate handling');
  if (!nonempty(title) || !Array.isArray(prerequisites) || !prerequisites.every(nonempty) || !Array.isArray(unitReferences) || !Array.isArray(sourcePeriods)) fail('invalid author metadata');
  const sources = new Map();
  for (const row of [period, ...sourcePeriods]) {
    if (!isDeepStrictEqual(sourcePeriodsById.get(row?.id), row) || row.grade !== period.grade || row.row > period.row) fail('invalid or future source period');
    if (row.id !== period.id && period.kind === 'elective' && row.week >= period.week) fail('cumulative games require previous-week sources');
    const sourceCell = row.kind === 'elective' && row.topic_basis.mode === 'subject_label' ? row.source.subject : row.source.content;
    const excerpt = String(sourceCell.cached ?? sourceCell.raw ?? '');
    if (!nonempty(excerpt)) fail('empty source period');
    sources.set(row.id, { excerpt, ref: {
      id: row.id, kind: 'external', locator: `${ppct.source.path}#${sourceCell.ref}`,
      label: `PPCT 2026-2027 Discover G${row.grade}: ${sourceCell.ref}`, hash: ppct.source.sha256, verification: 'teacher_review_required',
    } });
  }
  for (const reference of unitReferences) {
    const unit = units.find(item => item.grade === period.grade && item.sourceFile === reference?.sourceFile && item.sourceURL === reference?.sourceURL);
    const location = reference?.location;
    if (!unit || !/^r2[23]-[a-z0-9-]+$/.test(reference.id) || sources.has(reference.id) || !nonempty(reference.excerpt) || reference.hash !== undefined && reference.hash !== unit.sourceSha256) fail('invalid unit reference');
    if (!Number.isInteger(location?.lineStart) || !Number.isInteger(location?.lineEnd) || location.lineStart < 1 || location.lineEnd < location.lineStart || !sourceTexts.get(unit.sourceFile).split(/\r?\n/).slice(location.lineStart - 1, location.lineEnd).join('\n').includes(reference.excerpt)) fail('invalid unit line reference');
    sources.set(reference.id, { excerpt: reference.excerpt, ref: {
      id: reference.id, kind: 'external', locator: reference.sourceURL,
      label: `${unit.sourceTitle} (${reference.sourceFile}:${location.lineStart}-${location.lineEnd})`, hash: unit.sourceSha256, verification: 'teacher_review_required',
    } });
  }
  const authored = structuredClone(outline);
  if (['elective', 'review', 'assessment_feedback'].includes(period.kind) && !/ôn tập|hệ thống/iu.test(authored?.essentialQuestion || '')) authored.essentialQuestion = `Ôn tập: ${authored.essentialQuestion || title}`;
  if (!Array.isArray(authored?.objectives)) fail('outline objectives required');
  authored.objectives.forEach((objective, index) => {
    objective.code ??= `r23-${period.id}-lo${index + 1}`;
    if (!/^r23-[A-Za-z0-9-]+$/.test(objective.code)) fail('objective codes must be internal r23 identifiers');
  });
  const { package: pkg, citations, uncertainties } = assembleLessonOutline(authored, { slotMinutes, subject: 'math', grade: period.grade });
  for (const citation of citations) if (!sources.get(citation.segmentId)?.excerpt.includes(citation.quote)) fail(`unmatched citation: ${citation.entityId}`);
  pkg.id = `r23-${period.id}`;
  pkg.status = 'draft';
  pkg.prerequisites = [...prerequisites];
  pkg.sourceRefs = [...sources.values()].map(source => source.ref);
  for (const objective of pkg.objectives) {
    if (!objective.code.startsWith('r23-')) fail('source cannot inject official objective codes');
    const { segmentId, quote, origin } = citations.find(citation => citation.entityId === objective.id);
    objective.metadata = { ...objective.metadata, sourceCitation: { segmentId, quote, origin }, levelOrigin: 'author' };
  }
  for (const task of pkg.tasks) {
    const { segmentId, quote, origin } = citations.find(citation => citation.entityId === task.id);
    task.sourceRefs = [segmentId];
    task.metadata = { ...task.metadata, sourceCitation: { segmentId, quote, origin }, numericReviewRequired: origin !== 'source' };
    if (task.branch === 'support' && task.hintIds.length !== 4) fail(`support requires H1-H4: ${task.id}`);
  }
  if (rubric !== undefined) pkg.rubric = structuredClone(rubric);
  pkg.contentHash = hashPackage(pkg);
  const validation = validateLessonPackage(pkg, { mode: 'draft' });
  if (!validation.ok) fail(JSON.stringify(validation.errors));
  return { title, grade: period.grade, semester: 2, week: period.week, period: period.period, kind: period.kind, sourcePeriodId: period.id, pkg, citations,
    uncertainties: [...new Set([...uncertainties, 'TEACHER_SOURCE_REVIEW_REQUIRED', 'TEACHER_AUTHORED_CONTENT_REVIEW_REQUIRED'])] };
}
