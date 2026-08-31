import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceDir = process.env.BANTOA_SOURCE_DIR;
if (!sourceDir) {
  throw new Error('BANTOA_SOURCE_DIR is required; refusing to guess a source directory.');
}

const outputPath = process.env.BANTOA_OUTPUT
  ?? path.resolve('src/data/liveLessonPackages/banToan-w5-w6.snapshot.json');
const sourceFiles = [
  'banToanContent.ts',
  'g10Content.ts',
  'lessonEnhancements.ts',
  'aiErrorOfWeek.ts',
];

const sourceModule = await import(pathToFileURL(path.join(sourceDir, 'banToanContent.ts')).href);
const errorModule = await import(pathToFileURL(path.join(sourceDir, 'aiErrorOfWeek.ts')).href);
const specs = sourceModule.LESSON_SPECS;
const getAiErrorPlan = errorModule.getAiErrorPlan;

if (!Array.isArray(specs) || specs.length !== 48) {
  throw new Error(`Expected exactly 48 LessonSpec entries, received ${specs?.length ?? 'non-array'}.`);
}

const keys = new Set();
const aiErrors = {};
for (const spec of specs) {
  if (keys.has(spec.key)) throw new Error(`Duplicate LessonSpec key: ${spec.key}`);
  keys.add(spec.key);
  if (!Number.isInteger(spec.grade) || ![10, 11, 12].includes(spec.grade)) throw new Error(`Invalid grade for ${spec.key}.`);
  if (!Number.isInteger(spec.week) || ![5, 6].includes(spec.week)) throw new Error(`Invalid week for ${spec.key}.`);
  if (!spec.kind || !spec.title || !spec.focus) throw new Error(`Missing identity fields for ${spec.key}.`);
  if (spec.examples?.length !== 2 || spec.exercises?.length !== 6 || spec.quick?.length !== 2) {
    throw new Error(`Unexpected source cardinality for ${spec.key}.`);
  }
  const aiError = getAiErrorPlan(spec.key);
  if (!aiError?.wrongSolution || !aiError.correction || !aiError.proof) {
    throw new Error(`Missing complete AI error card for ${spec.key}.`);
  }
  aiErrors[spec.key] = aiError;
}

const sourceHashes = {};
for (const file of sourceFiles) {
  const contents = await readFile(path.join(sourceDir, file));
  sourceHashes[file] = createHash('sha256').update(contents).digest('hex');
}
const sourceFingerprint = createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');

const snapshot = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    directoryHint: 'giao an manus tao/_qa/ban_toan_rebuild',
    files: sourceHashes,
    fingerprint: sourceFingerprint,
  },
  lessonSpecs: specs,
  aiErrors,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputPath,
  count: specs.length,
  byGrade: Object.fromEntries([10, 11, 12].map((grade) => [grade, specs.filter((spec) => spec.grade === grade).length])),
  sourceHashes,
}, null, 2));
