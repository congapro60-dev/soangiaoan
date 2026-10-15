import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listAuthoredLessons, getAuthoredLesson } from '../lib/lesson/authored-content.js';
import { hashPackage } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';

test('HKI library covers every classroom period, keeps exam periods separate and returns exact drafts', async () => {
  const ppct=JSON.parse(readFileSync(new URL('../tasks/r22/ppct-hki.json',import.meta.url),'utf8'));
  const expected=ppct.grades.flatMap(grade=>grade.lessons.filter(period=>period.kind!=='assessment'));
  const catalogue=listAuthoredLessons().filter(row=>row.id.startsWith('r22-'));
  const authored=new Map([10,11,12].flatMap(grade=>JSON.parse(readFileSync(new URL(`../content/lessons/hki-2026-g${grade}.json`,import.meta.url),'utf8')).entries.map(entry=>[entry.pkg.id,entry.pkg.contentHash])));
  assert.equal(catalogue.length,403);
  assert.deepEqual(new Set(catalogue.map(row=>row.id)),new Set(expected.map(period=>'r22-'+period.id)));
  assert.equal(JSON.stringify(catalogue).includes('answerKey'),false);
  assert.ok(catalogue.every(row=>['formation','practice','review','elective','feedback','project','orientation'].includes(row.category)));
  for(const row of catalogue){
    const pkg=await getAuthoredLesson(row.id);
    assert.equal(pkg.status,'draft');
    assert.equal(pkg.contentHash,hashPackage(pkg),row.id);
    assert.equal(pkg.contentHash,authored.get(row.id),`Stale catalogue: ${row.id}`);
    assert.equal(validateLessonPackage(pkg).ok,true,row.id);
    assert.equal(pkg.budget.slotMinutes,40);
    assert.ok(pkg.sourceRefs.every(source=>source.verification==='teacher_review_required'));
    const original=pkg.tasks[0].prompt;
    pkg.tasks[0].prompt='mutated';
    assert.equal((await getAuthoredLesson(row.id)).tasks[0].prompt,original);
  }
  assert.equal(await getAuthoredLesson('__proto__'),null);
});
