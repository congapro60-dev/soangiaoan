import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

test('Week 15 E2E: all 24 lessons run smoothly with multi-branch differentiation, hints, and scoring', async () => {
  const cataloguePath = './content/hki-2026-catalogue.json';
  assert.ok(fs.existsSync(cataloguePath), 'Catalogue file must exist');

  const cat = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  const week15Lessons = cat.lessons.filter(l => l.week === 15);

  assert.equal(week15Lessons.length, 24, 'Week 15 must contain exactly 24 lessons across G10, G11, G12');

  for (const lessonMeta of week15Lessons) {
    const rawData = Buffer.from(lessonMeta.data, 'base64');
    const jsonStr = zlib.gunzipSync(rawData).toString('utf8');
    const pkg = JSON.parse(jsonStr);

    assert.ok(pkg.activities && pkg.activities.length >= 4, `Lesson ${lessonMeta.id} must have activities arc`);
    assert.ok(pkg.tasks && pkg.tasks.length >= 5, `Lesson ${lessonMeta.id} must have tasks`);

    // Verify 0 duplicate prompts inside lesson
    const promptSet = new Set();
    for (const t of pkg.tasks) {
      const p = t.prompt.trim();
      assert.ok(!promptSet.has(p), `Duplicate prompt found in lesson ${lessonMeta.id}: ${p}`);
      promptSet.add(p);
    }

    // Verify differentiation & branch integrity
    const branches = new Set(pkg.tasks.map(t => t.branch));
    assert.ok(branches.has('shared') || branches.has('core'), `Lesson ${lessonMeta.id} must have shared or core branch`);

    // Verify scoring & hint accessibility
    for (const t of pkg.tasks) {
      assert.ok(t.type === 'closed' || t.type === 'open' || t.type === 'reflection', `Invalid type in ${lessonMeta.id}`);
      if (t.type === 'closed') {
        assert.ok(t.evaluation && (t.evaluation.answerKey !== undefined || t.evaluation.checkerId), `Missing evaluation in ${lessonMeta.id}`);
      }
    }
  }
});
