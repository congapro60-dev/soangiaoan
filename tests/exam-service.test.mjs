import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

import { createExamService } from '../lib/exam/service.js';

const migration = readFileSync(new URL('../drizzle/0013_exam_rooms.sql', import.meta.url), 'utf8');

function makeDb(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL)');
  for (const part of migration.split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('teacher-1', 't1@test', 'Thầy', 1);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('teacher-2', 't2@test', 'Cô', 1);
  let tail = Promise.resolve();
  const prepare = (sql) => ({
    bind: (...values) => ({
      sql,
      values,
      first: async () => database.prepare(sql).get(...values) ?? null,
      all: async () => ({ results: database.prepare(sql).all(...values) }),
      run: async () => {
        beforeWrite(sql, database);
        return { meta: { changes: database.prepare(sql).run(...values).changes } };
      },
    }),
  });
  const batch = (statements) => {
    const result = tail.then(async () => {
      database.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        database.exec('COMMIT');
        return out;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    });
    tail = result.catch(() => {});
    return result;
  };
  return { db: { prepare, batch }, database };
}

const questions = [
  { section: 'I', label: 'Câu 1', type: 'mc', points: 0.25, options: ['A', 'B', 'C', 'D'], key: 'C', text: 'Chu kỳ?' },
  { section: 'I', label: 'Câu 2', type: 'mc', points: 0.25, options: ['A', 'B', 'C', 'D'], key: 'A', text: 'x' },
  { section: 'II', label: 'Câu 1', type: 'tf', points: 1, statements: ['a', 'b', 'c', 'd'], key: [true, true, true, false], text: 'ý' },
  { section: 'III', label: 'Câu 1', type: 'short', points: 0.5, key: { accept: ['1,5'] }, text: 's' },
  { section: 'III', label: 'Bài 1', type: 'essay', points: 1.5, text: 'Chứng minh' },
];
const input = { title: 'Giữa kỳ 1', durationMin: 45, settings: { showResult: 'score', graceSeconds: 30 }, questions };
const jpeg = 'A'.repeat(400);

function setup(startAt = 1_000_000, beforeWrite) {
  const { db, database } = makeDb(beforeWrite);
  const clock = { t: startAt };
  const service = createExamService({ db, now: () => clock.t });
  return { service, database, clock };
}

async function openExam(env, extra = {}) {
  const created = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'request-' + Math.random().toString(36).slice(2, 12), input: { ...input, ...extra } });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'open' });
  return created.exam;
}

test('creating an exam is idempotent per request and rejects nonsense', async () => {
  const env = setup();
  const a = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'same-request-1', input });
  const b = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'same-request-1', input });
  assert.equal(a.exam.id, b.exam.id);
  assert.match(a.exam.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(a.exam.status, 'draft');
  assert.deepEqual(a.exam.questions.map((x) => x.id), ['q1', 'q2', 'q3', 'q4', 'q5']);
  await assert.rejects(() => env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'bad-request-1', input: { ...input, title: '' } }), /INVALID_EXAM/);
  await assert.rejects(() => env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'bad-request-2', input: { ...input, durationMin: 1 } }), /INVALID_EXAM/);
  await assert.rejects(() => env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'bad-request-3', input: { ...input, questions: [] } }), /INVALID_EXAM/);
  await assert.rejects(() => env.service.createExam({ ownerAccountId: null, requestId: 'bad-request-4', input }), /AUTH_REQUIRED/);
});

test('only the owner sees an exam', async () => {
  const env = setup();
  const exam = await openExam(env);
  await assert.rejects(() => env.service.getExam({ ownerAccountId: 'teacher-2', examId: exam.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.control({ ownerAccountId: 'teacher-2', examId: exam.id, action: 'start', force: true }), /NOT_FOUND/);
  assert.equal((await env.service.listExams('teacher-2')).exams.length, 0);
  assert.equal((await env.service.listExams('teacher-1')).exams.length, 1);
});

test('pupils cannot join a draft; names are unique per device; the same device resumes; a released name can be taken again', async () => {
  const env = setup();
  const created = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'request-join-1', input });
  await assert.rejects(() => env.service.join({ code: created.exam.code, name: 'An' }), /EXAM_NOT_OPEN/);
  await assert.rejects(() => env.service.join({ code: 'ZZZZZZ', name: 'An' }), /ROOM_NOT_FOUND/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'open' });
  const first = await env.service.join({ code: created.exam.code.toLowerCase(), name: '  Nguyễn   An ', mascot: 3 });
  assert.equal(first.resumed, false);
  await assert.rejects(() => env.service.join({ code: created.exam.code, name: 'nguyễn an' }), /NAME_TAKEN/);
  const again = await env.service.join({ code: created.exam.code, name: 'Nguyễn An', token: first.token });
  assert.equal(again.attemptId, first.attemptId);
  await env.service.releaseAttempt({ ownerAccountId: 'teacher-1', examId: created.exam.id, attemptId: first.attemptId });
  const other = await env.service.join({ code: created.exam.code, name: 'Nguyễn An' });
  assert.equal(other.attemptId, first.attemptId);
  assert.notEqual(other.token, first.token);
  await assert.rejects(() => env.service.getState({ token: first.token }), /AUTH_REQUIRED/);
  assert.equal((await env.service.getState({ token: other.token })).attempt.name, 'Nguyễn An');
  await assert.rejects(() => env.service.join({ code: created.exam.code, name: '' }), /INVALID_NAME/);
});

test('the room starts only with an answer key, and the key never reaches a pupil', async () => {
  const env = setup();
  const created = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'request-key-1', input: { ...input, questions: questions.map((x) => ({ ...x, key: undefined })) } });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'open' });
  await assert.rejects(() => env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'start' }), /KEY_MISSING/);
  // the teacher types the keys, then starts
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: created.exam.id, input: { questions } });
  const pupil = await env.service.join({ code: created.exam.code, name: 'Bình' });
  let state = await env.service.getState({ token: pupil.token });
  assert.deepEqual(state.questions, [], 'no questions before the start');
  await env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'start' });
  state = await env.service.getState({ token: pupil.token });
  assert.equal(state.questions.length, 5);
  const wire = JSON.stringify(state);
  assert.ok(!/"key"/.test(wire), 'no answer key in what a pupil receives');
  assert.ok(!/accept/.test(wire));
  assert.equal(state.exam.endsAt - state.exam.startedAt, 45 * 60000);
});

test('every answer is saved at once; stale writes lose; clearing removes; wrong question is refused', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Chi' });
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 }), /EXAM_NOT_STARTED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'B', seq: 2 });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'D', seq: 1 }); // late arrival of an older write
  await env.service.saveAnswer({ token: pupil.token, qid: 'q3', value: [true, true, null, false], seq: 1 });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q4', value: '1,5', seq: 1 });
  let state = await env.service.getState({ token: pupil.token });
  assert.equal(state.answers.q1, 'B');
  assert.deepEqual(state.answers.q3, [true, true, null, false]);
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: null, seq: 3 });
  state = await env.service.getState({ token: pupil.token });
  assert.equal(state.answers.q1, undefined);
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q99', value: 'A', seq: 1 }), /NOT_FOUND/);
  await assert.rejects(() => env.service.saveAnswer({ token: 'x'.repeat(43), qid: 'q1', value: 'A', seq: 1 }), /AUTH_REQUIRED/);
});

test('answers are accepted until the end plus the grace, then refused; the room seals unsubmitted work by itself', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Dũng' });
  const started = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' })).exam;
  await env.service.saveAnswer({ token: pupil.token, qid: 'q2', value: 'A', seq: 1 });
  env.clock.t = started.endsAt + 20_000; // inside the 30 s grace
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 2 });
  env.clock.t = started.endsAt + 31_000;
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'D', seq: 3 }), /EXAM_ENDED/);
  env.clock.t = started.endsAt + 60_000;
  const state = await env.service.getState({ token: pupil.token });
  assert.equal(state.finished, true);
  assert.equal(state.exam.status, 'closed');
  assert.ok(state.attempt.submittedAt, 'unsubmitted work was sealed');
  assert.equal(state.result.total, 0.5);
});

test('a far-future client sequence cannot freeze later autosaves', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Seq' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const first = await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'A', seq: 2_000_000_000 });
  env.clock.t += 1000;
  const second = await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: Math.floor(env.clock.t / 1000) });
  assert.equal(second.stale, false);
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, 'C');
  assert.equal(first.stale, false);
  assert.equal((await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'B', seq: 1 })).stale, true);
});

test('an equal-sequence different answer is stale; a replay of the same answer is accepted', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Equal seq' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 2 });
  assert.equal((await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'A', seq: 2 })).stale, true);
  assert.equal((await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 2 })).stale, false);
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, 'C');
});

test('clearing an answer preserves its sequence so a delayed old answer cannot resurrect it', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Clear' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 2 });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: null, seq: 3 });
  assert.equal((await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'B', seq: 2 })).stale, true);
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, undefined);
});

test('submitted answer and photos stay sealed even when an earlier request passed its precheck', async () => {
  for (const action of ['answer', 'photo', 'delete-photo', 'submit']) {
    let armed = false;
    const env = setup(1_000_000, (sql, database) => {
      if (!armed || !/^(INSERT INTO exam_answers|INSERT INTO exam_assets|DELETE FROM exam_assets)/.test(sql)) return;
      armed = false;
      database.exec('UPDATE exam_attempts SET submitted_at=999999');
    });
    const exam = await openExam(env);
    const pupil = await env.service.join({ code: exam.code, name: 'Seal' });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
    const photo = await env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg });
    armed = true;
    const attempt = () => action === 'answer' ? env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 })
      : action === 'photo' ? env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg })
        : action === 'delete-photo' ? env.service.deletePhoto({ token: pupil.token, id: photo.id })
          : env.service.submit({ token: pupil.token, answers: { q1: 'C' } });
    await assert.rejects(attempt, /ALREADY_SUBMITTED/, action);
    assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_answers').get().n, 0);
    assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_assets').get().n, 1);
  }
});

test('room closure wins over an answer that already passed its precheck', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('INSERT INTO exam_answers')) return;
    armed = false;
    database.exec("UPDATE exams SET status='closed'");
  });
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Close race' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  armed = true;
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 }), /EXAM_ENDED/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_answers').get().n, 0);
});

test('releasing a pupil token also blocks an in-flight answer from that old device', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('INSERT INTO exam_answers')) return;
    armed = false;
    database.exec('UPDATE exam_attempts SET token_hash=NULL');
  });
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Released device' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  armed = true;
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 }), /AUTH_REQUIRED/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_answers').get().n, 0);
});

test('CSV neutralises formula-like pupil names and leading control characters', async () => {
  const env = setup();
  const exam = await openExam(env);
  for (const name of ['=1+1', '+1+1', '-1+1', '@SUM(1)', '\t=1', '\r=2']) {
    await env.service.join({ code: exam.code, name });
  }
  const csv = await env.service.exportCsv({ ownerAccountId: 'teacher-1', examId: exam.id });
  for (const name of ['=1+1', '+1+1', '-1+1', '@SUM(1)', '=1', '=2']) assert.ok(csv.includes('"\'' + name + '"'), name);
});

test('concurrent start is compare-and-set: only one start wins', async () => {
  const env = setup();
  const created = await env.service.createExam({ ownerAccountId: 'teacher-1', requestId: 'request-double-start', input });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'open' });
  const results = await Promise.allSettled([
    env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'start' }),
    env.service.control({ ownerAccountId: 'teacher-1', examId: created.exam.id, action: 'start' }),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(results.filter((x) => x.status === 'rejected').length, 1);
});

test('close and extend race: closure between read and write rejects extension', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('UPDATE exams SET ends_at=')) return;
    armed = false;
    database.exec("UPDATE exams SET status='closed'");
  });
  const exam = await openExam(env);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  armed = true;
  await assert.rejects(() => env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'extend', minutes: 5 }), /BAD_STATE/);
});

test('automatic closure observes a teacher extension that wins before the closing write', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith("UPDATE exams SET status='closed'")) return;
    armed = false;
    database.exec('UPDATE exams SET ends_at=ends_at+300000,duration_min=duration_min+5');
  });
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Extend winner' });
  const started = await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  env.clock.t = started.exam.endsAt + 36000;
  armed = true;
  const state = await env.service.getState({ token: pupil.token });
  assert.equal(state.exam.status, 'running');
  assert.equal(state.attempt.submittedAt, null);
  assert.equal(state.exam.endsAt, started.exam.endsAt + 300000);
});

test('a teacher cannot reopen an attempt when room closure wins before the reopening write', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('UPDATE exam_attempts SET submitted_at=NULL')) return;
    armed = false;
    database.exec("UPDATE exams SET status='closed'; UPDATE exam_attempts SET submitted_at=999999");
  });
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Reopen race' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupil.token, answers: {} });
  armed = true;
  await assert.rejects(() => env.service.reopenAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId }), /BAD_STATE/);
  assert.equal(env.database.prepare('SELECT submitted_at FROM exam_attempts').get().submitted_at, 999999);
});

test('a delayed final snapshot cannot change answers after another submit seals the attempt', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('INSERT INTO exam_answers')) return;
    armed = false;
    database.exec('UPDATE exam_attempts SET submitted_at=999999');
  });
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Final race' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'A', seq: 1 });
  armed = true;
  await assert.rejects(() => env.service.submit({ token: pupil.token, answers: { q1: 'C' } }), /ALREADY_SUBMITTED/);
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, 'A');
});

test('a final blank answer and teacher reopen do not retain an obsolete high sequence', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Reopen' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 });
  await env.service.submit({ token: pupil.token, answers: { q1: null } });
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, undefined);
  await env.service.reopenAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId });
  env.clock.t += 1000;
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'B', seq: Math.floor(env.clock.t / 1000) });
  assert.equal((await env.service.getState({ token: pupil.token })).answers.q1, 'B');
});

test('clearing a graded essay after reopen retains its manual mark without looping stale saves', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Marked essay' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupil.token, answers: { q5: { text: 'old text' } } });
  await env.service.grade({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, qid: 'q5', score: 1 });
  await env.service.reopenAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId });
  env.clock.t += 1000;
  assert.equal((await env.service.saveAnswer({ token: pupil.token, qid: 'q5', value: null, seq: Math.floor(env.clock.t / 1000) })).stale, false);
  const row = env.database.prepare('SELECT value_json,manual_score FROM exam_answers WHERE qid=\'q5\'').get();
  assert.equal(row.value_json, 'null');
  assert.equal(row.manual_score, 1);
});

test('malformed and non-canonical image base64 is rejected before storage', async () => {
  const env = setup();
  const exam = await openExam(env);
  await assert.rejects(() => env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: 'A'.repeat(399) }), /INVALID_IMAGE/);
  await assert.rejects(() => env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: 'A'.repeat(396) + '===' }), /INVALID_IMAGE/);
});

test('submitting takes the final snapshot, locks the pupil out, and shows a mark only when the teacher allows it', async () => {
  const env = setup();
  const exam = await openExam(env, { settings: { showResult: 'none' } });
  const pupil = await env.service.join({ code: exam.code, name: 'Giang' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const out = await env.service.submit({ token: pupil.token, answers: { q1: 'C', q2: 'B', q3: [true, true, true, false], q4: '3/2', q5: { text: 'bài làm' } } });
  assert.equal(out.finished, true);
  assert.equal(out.result, null);
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'A', seq: 9 }), /ALREADY_SUBMITTED/);
  const results = await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(results.rows[0].total, 0.25 + 1 + 0.5);
  assert.equal(results.rows[0].essaysToMark, 1);
  await env.service.grade({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, qid: 'q5', score: 1.25 });
  const marked = await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(marked.rows[0].total, 0.25 + 1 + 0.5 + 1.25);
  assert.equal(marked.rows[0].essaysToMark, 0);
  await assert.rejects(() => env.service.grade({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, qid: 'q1', score: 1 }), /NOT_FOUND/);
  await env.service.grade({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, qid: 'q5', score: 99 });
  assert.equal((await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id })).rows[0].total, 0.25 + 1 + 0.5 + 1.5, 'capped at the question points');
});

test('with results on, the pupil sees the mark and whether essays are still being marked', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Hà' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const out = await env.service.submit({ token: pupil.token, answers: { q1: 'C', q3: [true, true, true, true] } });
  assert.equal(out.result.total, 0.75);
  assert.equal(out.result.essaysPending, true);
  assert.equal(out.questions.length, 0, 'questions are not sent again after the end');
});

test('statistics per question and the CSV for the teacher', async () => {
  const env = setup();
  const exam = await openExam(env);
  const names = ['An', 'Bình', 'Chi'];
  const pupils = [];
  for (const name of names) pupils.push(await env.service.join({ code: exam.code, name }));
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupils[0].token, answers: { q1: 'C', q3: [true, true, true, false] } });
  await env.service.submit({ token: pupils[1].token, answers: { q1: 'B', q3: [true, true, true, true] } });
  await env.service.submit({ token: pupils[2].token, answers: { q1: 'C' } });
  const { stats } = await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(stats.q1.correct, 2);
  assert.equal(stats.q1.wrong, 1);
  assert.deepEqual(stats.q1.choices, { B: 1, C: 2 });
  assert.equal(stats.q3.blank, 1);
  assert.deepEqual(stats.q3.statements, [2, 2, 2, 1]);
  const csv = await env.service.exportCsv({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.ok(csv.startsWith('﻿'));
  assert.match(csv, /"Họ và tên"/);
  assert.equal(csv.split('\r\n').length, 4);
});

test('forty pupils saving at the same moment lose nothing', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupils = await Promise.all(Array.from({ length: 40 }, (_, i) => env.service.join({ code: exam.code, name: 'Học sinh ' + (i + 1) })));
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await Promise.all(pupils.flatMap((p, i) => [
    env.service.saveAnswer({ token: p.token, qid: 'q1', value: 'ABCD'[i % 4], seq: 1 }),
    env.service.saveAnswer({ token: p.token, qid: 'q2', value: 'A', seq: 1 }),
    env.service.saveAnswer({ token: p.token, qid: 'q3', value: [true, false, true, false], seq: 1 }),
  ]));
  const monitor = await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(monitor.attempts.length, 40);
  assert.ok(monitor.attempts.every((a) => a.answered === 3));
});

test('a pupil can leave the tab and it is counted; mascots lock when the exam starts', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Khoa', mascot: 1 });
  await env.service.chooseMascot({ token: pupil.token, mascot: 5 });
  assert.equal((await env.service.getState({ token: pupil.token })).attempt.mascot, 5);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await assert.rejects(() => env.service.chooseMascot({ token: pupil.token, mascot: 2 }), /MASCOT_LOCKED/);
  await env.service.tabLeave({ token: pupil.token });
  await env.service.tabLeave({ token: pupil.token });
  const monitor = await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(monitor.attempts[0].tabLeaves, 2);
});

test('question pictures and answer photos: stored, shown only when allowed, essays only', async () => {
  const env = setup();
  const exam = await openExam(env);
  await env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  await assert.rejects(() => env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'text/html', data: jpeg }), /INVALID_IMAGE/);
  await assert.rejects(() => env.service.saveQuestionImage({ ownerAccountId: 'teacher-2', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg }), /NOT_FOUND/);
  const pupil = await env.service.join({ code: exam.code, name: 'Lan' });
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, qid: 'q1' }), /EXAM_NOT_STARTED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const state = await env.service.getState({ token: pupil.token });
  assert.equal(state.questions[0].hasImage, true);
  assert.equal(state.questions[0].text, undefined, 'the extracted text is not sent when there is a picture');
  assert.equal(state.questions[1].hasImage, false);
  assert.equal((await env.service.pupilAsset({ token: pupil.token, qid: 'q1' })).mime, 'image/jpeg');
  await assert.rejects(() => env.service.savePhoto({ token: pupil.token, qid: 'q1', mime: 'image/jpeg', data: jpeg }), /NOT_FOUND/);
  const photo = await env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg });
  assert.equal((await env.service.getState({ token: pupil.token })).photos.q5[0], photo.id);
  assert.equal((await env.service.teacherAsset({ ownerAccountId: 'teacher-1', examId: exam.id, assetId: photo.id })).mime, 'image/jpeg');
  assert.equal((await env.service.pupilAsset({ token: pupil.token, photoId: photo.id })).data, jpeg);
  await env.service.deletePhoto({ token: pupil.token, id: photo.id });
  assert.equal((await env.service.getState({ token: pupil.token })).photos.q5, undefined);
  for (let i = 0; i < 12; i++) await env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg });
  await assert.rejects(() => env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg }), /TOO_MANY_PHOTOS/);
});

test('extending the time moves the end for everybody; closing seals the work', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Minh' });
  const started = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' })).exam;
  const extended = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'extend', minutes: 5 })).exam;
  assert.equal(extended.endsAt, started.endsAt + 5 * 60000);
  await env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'C', seq: 1 });
  const closed = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' })).exam;
  assert.equal(closed.status, 'closed');
  await assert.rejects(() => env.service.saveAnswer({ token: pupil.token, qid: 'q1', value: 'A', seq: 2 }), /EXAM_ENDED/);
  await assert.rejects(() => env.service.join({ code: exam.code, name: 'Muộn' }), /EXAM_CLOSED/);
  const results = await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.ok(results.rows[0].submittedAt);
});

test('keys can be corrected after the exam and the marks follow', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Nam' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupil.token, answers: { q1: 'B' } });
  assert.equal((await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id })).rows[0].total, 0);
  const fixed = questions.map((x, i) => (i === 0 ? { ...x, key: 'B' } : x));
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { questions: fixed } });
  assert.equal((await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id })).rows[0].total, 0.25);
  await assert.rejects(() => env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { questions: fixed.slice(1) } }), /QUESTIONS_LOCKED/);
});
