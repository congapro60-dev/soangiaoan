import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

test('HKII E2E: all 404 lessons across G10, G11, G12 run smoothly with 0 duplicates, 0 missing solidKeys, and valid evaluation', async () => {
  const cataloguePath = './content/hkii-2026-catalogue.json';
  assert.ok(fs.existsSync(cataloguePath), 'HKII Catalogue file must exist');

  const cat = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  assert.equal(cat.lessons.length, 404, 'HKII must contain exactly 404 lessons');
  assert.equal(cat.exams.length, 6, 'HKII must contain exactly 6 exams');

  let totalTasks = 0;

  for (const lessonMeta of cat.lessons) {
    const rawData = Buffer.from(lessonMeta.data, 'base64');
    const jsonStr = zlib.gunzipSync(rawData).toString('utf8');
    const pkg = JSON.parse(jsonStr);

    assert.ok(pkg.activities && pkg.activities.length >= 4, `Lesson ${lessonMeta.id} must have activities arc`);
    assert.ok(pkg.tasks && pkg.tasks.length >= 5, `Lesson ${lessonMeta.id} must have tasks`);

    const promptSet = new Set();
    for (const t of pkg.tasks) {
      totalTasks++;
      const p = t.prompt.trim();
      assert.ok(!promptSet.has(p), `Duplicate prompt found in lesson ${lessonMeta.id}: ${p}`);
      promptSet.add(p);

      // Verify solidKey for 3D geometry
      const is3D = p.includes('tứ diện') || p.includes('hình chóp') || p.includes('lăng trụ') || p.includes('hình hộp');
      if (is3D) {
        assert.ok(t.solidKey, `Missing solidKey in lesson ${lessonMeta.id}: ${p}`);
      }

      // Verify evaluation
      assert.ok(t.type === 'closed' || t.type === 'open' || t.type === 'reflection', `Invalid type in ${lessonMeta.id}`);
      if (t.type === 'closed') {
        assert.ok(t.evaluation && (t.evaluation.answerKey !== undefined || t.evaluation.checkerId), `Missing evaluation in ${lessonMeta.id}`);
      }
    }

    const branches = new Set(pkg.tasks.map(t => t.branch));
    assert.ok(branches.has('shared') || branches.has('core'), `Lesson ${lessonMeta.id} must have shared or core branch`);
  }

  assert.equal(totalTasks, 5882, 'Total tasks across HKII must be 5882');
});
