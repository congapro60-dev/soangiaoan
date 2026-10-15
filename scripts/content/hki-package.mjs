import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { assembleLessonOutline } from '../../lib/lesson/generation-outline.js';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const ppct = JSON.parse(read('tasks/r22/ppct-hki.json'));
const periods = new Map(ppct.grades.flatMap(grade => grade.lessons.map(period => [period.id, period])));
const units = JSON.parse(read('tasks/r22/unit-objectives.json')).units;
const sourceTexts = new Map(units.map(unit => [unit.sourceFile, read(unit.sourceFile)]));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => { throw new Error(`INVALID_HKI_PACKAGE: ${message}`); };

// Build-only binding: authored questions stay drafts even when their source extraction is exact.
export function assembleHkiPackage({ period, outline, title, prerequisites = [], unitReferences = [], slotMinutes = 40, rubric } = {}) {
  if (!period || !isDeepStrictEqual(periods.get(period.id), period)) fail('period must be an exact HKI PPCT record');
  const kind = period.kind === 'unspecified' && period.effective_kind === 'elective' && period.ownerOverride?.kind === 'elective' && period.ownerOverride.confirmed_by === 'owner' ? 'elective' : period.kind;
  if (kind === 'assessment' || kind === 'unspecified') fail('assessment/unspecified periods require separate handling');
  if (!nonempty(title) || !Array.isArray(prerequisites) || !prerequisites.every(nonempty) || !Array.isArray(unitReferences)) fail('invalid author metadata');
  const ppctText = String(period.source.content.cached ?? period.source.content.raw ?? '');
  const sources = new Map([[period.id, { excerpt: ppctText, ref: {
    id: period.id, kind: 'external', locator: `${ppct.source.path}#${[period.source.week.ref, period.source.period.ref, period.source.content.ref].join(';')}`,
    label: `PPCT 2026-2027 Discover G${period.grade}: ${period.source.content.ref}`, hash: ppct.source.sha256, verification: 'teacher_review_required',
  } }]]);
  for (const reference of unitReferences) {
    const unit = units.find(item => item.grade === period.grade && item.sourceFile === reference?.sourceFile && item.sourceURL === reference?.sourceURL);
    if (!unit || !/^r22-[a-z0-9-]+$/.test(reference.id) || sources.has(reference.id) || !nonempty(reference.excerpt) || !sourceTexts.get(unit.sourceFile).includes(reference.excerpt) || reference.hash !== undefined && reference.hash !== unit.sourceSha256) fail('invalid unit reference');
    const location = reference.location;
    if (!Number.isInteger(location?.lineStart) || !Number.isInteger(location?.lineEnd) || location.lineStart < 1 || location.lineEnd < location.lineStart || !sourceTexts.get(unit.sourceFile).split(/\r?\n/).slice(location.lineStart - 1, location.lineEnd).join('\n').includes(reference.excerpt)) fail('invalid unit line reference');
    sources.set(reference.id, { excerpt: reference.excerpt, ref: {
      id: reference.id, kind: 'external', locator: reference.sourceURL,
      label: `${unit.sourceTitle} (${reference.sourceFile}:${location.lineStart}-${location.lineEnd})`, hash: unit.sourceSha256, verification: 'teacher_review_required',
    } });
  }
  const authored = structuredClone(outline);
  if (!Array.isArray(authored?.objectives)) fail('outline objectives are required');
  authored.objectives.forEach((objective, index) => {
    objective.code ??= `r22-${period.id}-lo${index + 1}`;
    if (!/^r22-[a-z0-9-]+$/.test(objective.code)) fail('objective codes must be internal r22 identifiers');
  });
  const { package: pkg, citations, uncertainties } = assembleLessonOutline(authored, { slotMinutes, subject: 'math', grade: period.grade });
  for (const citation of citations) {
    if (!sources.get(citation.segmentId)?.excerpt.includes(citation.quote)) fail(`citation does not match source: ${citation.entityId}`);
  }
  pkg.id = `r22-${period.id}`;
  pkg.status = 'draft';
  pkg.prerequisites = [...prerequisites];
  pkg.sourceRefs = [...sources.values()].map(source => source.ref);
  for (const objective of pkg.objectives) {
    if (!objective.code.startsWith('r22-')) fail('source cannot inject an official objective code');
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
  return { title, week: period.week, period: period.period, kind, sourcePeriodId: period.id, pkg, citations,
    uncertainties: [...new Set([...uncertainties, 'TEACHER_SOURCE_REVIEW_REQUIRED', 'TEACHER_AUTHORED_CONTENT_REVIEW_REQUIRED'])] };
}
