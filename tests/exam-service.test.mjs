import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { dirname, resolve } from 'node:path';

import { createExamService } from '../lib/exam/service.js';
import { toDisplayAnswer } from '../lib/exam/shuffle.js';

const migration = readFileSync(new URL('../drizzle/0013_exam_rooms.sql', import.meta.url), 'utf8');

function makeDb(beforeWrite = () => {}, applyComments = true) {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL)');
  for (const part of migration.split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  const commentsMigration = new URL('../drizzle/0014_exam_manual_comments.sql', import.meta.url);
  if (applyComments && existsSync(commentsMigration)) database.exec(readFileSync(commentsMigration, 'utf8'));
  const shuffleMigration = new URL('../drizzle/0015_exam_attempt_views.sql', import.meta.url);
  if (applyComments && existsSync(shuffleMigration)) database.exec(readFileSync(shuffleMigration, 'utf8'));
  const reviewMigration = new URL('../drizzle/0016_exam_review_access.sql', import.meta.url);
  if (applyComments && existsSync(reviewMigration)) for (const part of readFileSync(reviewMigration, 'utf8').split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('teacher-1', 't1@test', 'Thầy', 1);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('teacher-2', 't2@test', 'Cô', 1);
  let tail = Promise.resolve();
  const prepare = (sql) => ({
    bind: (...values) => ({
      sql,
      values,
      first: async () => {
        if (/^(UPDATE|INSERT|DELETE)/.test(sql)) beforeWrite(sql, database);
        return database.prepare(sql).get(...values) ?? null;
      },
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

async function reviewFixture(beforeWrite, extra = {}) {
  const env = setup(1_000_000, beforeWrite);
  const exam = await openExam(env, extra);
  const joined = await env.service.join({ code: exam.code, name: 'Review pupil' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  return { ...env, exam, joined, login: { code: exam.code, name: 'Review pupil' } };
}

test('migration 0016 is append-only and preserves legacy attempts, views, answers and FK enforcement', () => {
  const { database } = makeDb(undefined, false);
  for (const filename of ['0014_exam_manual_comments.sql', '0015_exam_attempt_views.sql']) database.exec(readFileSync(new URL('../drizzle/' + filename, import.meta.url), 'utf8'));
  database.exec("INSERT INTO exams(id,owner_account_id,code,title,status,duration_min,settings_json,questions_json,created_at,updated_at) VALUES('old-exam','teacher-1','OLD123','Old','closed',45,'{}','[]',1,1)");
  database.exec("INSERT INTO exam_attempts(id,exam_id,name,name_key,token_hash,joined_at,last_seen_at,submitted_at,exam_code,view_json) VALUES('old-attempt','old-exam','An','an','old-hash',1,2,3,'101','{}')");
  database.exec("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,manual_score,manual_comment,updated_at) VALUES('old-attempt','101_q1','null',42,1.25,'Comment',123)");
  const before = database.prepare('SELECT * FROM exam_attempts').get();
  const answer = database.prepare('SELECT * FROM exam_answers').get();
  for (const part of readFileSync(new URL('../drizzle/0016_exam_review_access.sql', import.meta.url), 'utf8').split('--> statement-breakpoint')) if (part.trim()) database.exec(part);
  const after = database.prepare('SELECT * FROM exam_attempts').get();
  assert.equal(after.review_pin_hash, null);
  assert.equal(after.review_fail_count, 0);
  assert.equal(after.review_window_start, null);
  for (const field of ['review_pin_hash', 'review_fail_count', 'review_window_start']) delete after[field];
  assert.deepEqual(after, before);
  assert.deepEqual(database.prepare('SELECT * FROM exam_answers').get(), answer);
  assert.throws(() => database.exec("INSERT INTO exam_review_sessions VALUES('s','missing','hash',1)"), /FOREIGN KEY/);
  database.exec("INSERT INTO exam_review_sessions VALUES('s','old-attempt','hash',1)");
  assert.throws(() => database.exec("DELETE FROM exam_attempts WHERE id='old-attempt'"), /FOREIGN KEY/);
  assert.throws(() => database.exec("INSERT INTO exam_review_sessions VALUES('s2','old-attempt','hash',1)"), /UNIQUE/);
  const previous = JSON.parse(readFileSync(new URL('../drizzle/meta/0015_snapshot.json', import.meta.url), 'utf8'));
  const next = JSON.parse(readFileSync(new URL('../drizzle/meta/0016_snapshot.json', import.meta.url), 'utf8'));
  assert.equal(next.prevId, previous.id);
  delete next.tables.exam_review_sessions;
  for (const field of ['review_pin_hash', 'review_fail_count', 'review_window_start']) delete next.tables.exam_attempts.columns[field];
  assert.deepEqual(next.tables, previous.tables);
  assert.equal(JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')).entries.find(entry => entry.idx === 16).tag, '0016_exam_review_access');
});

test('manual and automatic closure lazily issue PIN to the original submitted legacy device only', async () => {
  for (const automatic of [false, true]) {
    const env = await reviewFixture();
    const started = env.database.prepare('SELECT ends_at FROM exams').get();
    assert.equal(env.database.prepare('SELECT review_pin_hash FROM exam_attempts').get().review_pin_hash, null);
    if (automatic) env.clock.t = started.ends_at + 36_000;
    else await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
    const state = await env.service.getState(env.joined);
    assert.equal(typeof state.reviewPin, 'string');
    assert.equal(state.exam.status, 'closed');
    const review = await env.service.reviewJoin({ ...env.login, pin: state.reviewPin });
    assert.equal((await env.service.getState(review)).reviewPin, undefined);
    assert.equal((await env.service.getState(env.joined)).reviewPin === state.reviewPin, true);
  }
});

test('missing PIN hash and review none never authenticate; malformed PIN stays generic', async () => {
  const env = await reviewFixture();
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: '!!!!!!!!' }), /REVIEW_UNAVAILABLE/);
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 0);
  env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')");
  assert.equal((await env.service.getState(env.joined)).reviewPin, undefined);
  for (const pin of [undefined, null, {}, 123, '', ' '.repeat(100)]) await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin }), /^Error: REVIEW_UNAVAILABLE$/);
});

test('PIN backfill rejects token revocation and policy change at its write boundary', async () => {
  for (const mutation of ['UPDATE exam_attempts SET token_hash=NULL', "UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')"]) {
    let armed = false;
    const env = await reviewFixture((sql, database) => {
      if (armed && sql.startsWith('UPDATE exam_attempts SET review_pin_hash=')) { armed = false; database.exec(mutation); }
    });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
    armed = true;
    if (mutation.includes('token_hash')) await assert.rejects(() => env.service.getState(env.joined), /AUTH_REQUIRED/);
    else assert.equal((await env.service.getState(env.joined)).reviewPin, undefined);
    assert.equal(env.database.prepare('SELECT review_pin_hash FROM exam_attempts').get().review_pin_hash, null);
  }
});

test('valid PIN refunds only its reserved window; old-window request cannot issue a session', async () => {
  let armed = false;
  const env = await reviewFixture((sql, database) => {
    if (armed && sql.startsWith('UPDATE exam_attempts SET review_fail_count=review_fail_count-1')) {
      armed = false;
      database.exec('UPDATE exam_attempts SET review_fail_count=4,review_window_start=review_window_start+900000');
    }
  });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  for (let index = 0; index < 3; index++) await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: '!!!!!!!!' }), /REVIEW_UNAVAILABLE/);
  await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 3);
  armed = true;
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: reviewPin }), /REVIEW_UNAVAILABLE/);
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 4);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 1);
});

test('concurrent valid review joins keep cap and never touch original participation fields', async () => {
  const env = await reviewFixture();
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  const before = env.database.prepare('SELECT token_hash,last_seen_at,tab_leaves,mascot,view_json FROM exam_attempts').get();
  for (let index = 0; index < 4; index++) await Promise.all(Array.from({ length: 5 }, () => env.service.reviewJoin({ ...env.login, pin: reviewPin })));
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 10);
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 0);
  const review = await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  env.clock.t += 1000;
  await env.service.getState(review);
  const after = env.database.prepare('SELECT token_hash,last_seen_at,tab_leaves,mascot,view_json FROM exam_attempts').get();
  assert.equal(JSON.stringify(after) === JSON.stringify(before), true);
  const stored = env.database.prepare('SELECT review_pin_hash FROM exam_attempts').get();
  assert.equal(stored.review_pin_hash === reviewPin, false);
  assert.equal(env.database.prepare('SELECT token_hash FROM exam_review_sessions ORDER BY rowid DESC LIMIT 1').get().token_hash === review.token, false);
});

test('delete batch rolls back timestamp and children on failure; concurrent requests delete once', async () => {
  let armed = false;
  const env = await reviewFixture((sql) => {
    if (armed && sql.startsWith('DELETE FROM exam_assets')) { armed = false; throw new Error('synthetic transaction failure'); }
  });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  const before = env.database.prepare('SELECT updated_at FROM exams').get().updated_at;
  const args = { ownerAccountId: 'teacher-1', examId: env.exam.id, confirmTitle: env.exam.title, confirmAttempts: 1 };
  armed = true;
  await assert.rejects(() => env.service.deleteExam(args), /synthetic transaction failure/);
  assert.equal(env.database.prepare('SELECT updated_at FROM exams').get().updated_at, before);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 1);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_attempts').get().n, 1);
  const outcomes = await Promise.allSettled([env.service.deleteExam(args), env.service.deleteExam(args)]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exams').get().n, 0);
});

test('delete refuses a new attempt or running transition immediately before authorization', async () => {
  for (const mutation of ["INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at) SELECT 'racing',id,'Racing','racing',1,1 FROM exams", "UPDATE exams SET status='running'"]) {
    let armed = false;
    const env = setup(1_000_000, (sql, database) => {
      if (armed && sql.startsWith('UPDATE exams SET updated_at=')) { armed = false; database.exec(mutation); }
    });
    const exam = await openExam(env);
    armed = true;
    await assert.rejects(() => env.service.deleteExam({ ownerAccountId: 'teacher-1', examId: exam.id, confirmTitle: exam.title, confirmAttempts: 0 }), /BAD_STATE/);
    assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exams').get().n, 1);
    assert.equal(env.database.prepare('SELECT updated_at FROM exams').get().updated_at, env.clock.t);
  }
});

test('review PIN stable and submitted-only, review closed-only, every write rejects review token', async () => {
  const env = await reviewFixture();
  const originalHash = env.database.prepare('SELECT token_hash FROM exam_attempts').get().token_hash;
  assert.equal((await env.service.getState(env.joined)).reviewPin, undefined);
  const submitted = await env.service.submit({ token: env.joined.token, answers: { q1: 'C' } });
  assert.ok(/^[A-HJ-NP-Z2-9]{8}$/.test(submitted.reviewPin));
  assert.equal((await env.service.getState(env.joined)).reviewPin === submitted.reviewPin, true);
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: submitted.reviewPin }), /^Error: REVIEW_UNAVAILABLE$/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const review = await env.service.reviewJoin({ ...env.login, pin: submitted.reviewPin });
  assert.equal(review.readOnly, true);
  const state = await env.service.getState(review);
  assert.equal(state.readOnly, true);
  assert.equal(state.reviewPin, undefined);
  assert.equal(state.review.answers.q1, 'C');
  assert.equal(env.database.prepare('SELECT token_hash FROM exam_attempts').get().token_hash === originalHash, true);
  const writes = [
    () => env.service.join({ ...env.login, token: review.token }),
    () => env.service.join({ code: 'UNKNOWN', name: 'Other', token: review.token }),
    () => env.service.saveAnswer({ token: review.token, qid: 'q1', value: 'A', seq: 2 }),
    () => env.service.submit(review), () => env.service.tabLeave(review),
    () => env.service.chooseMascot({ ...review, mascot: 1 }),
    () => env.service.savePhoto({ ...review, qid: 'q5', mime: 'image/jpeg', data: jpeg }),
    () => env.service.deletePhoto({ ...review, id: 'missing' }),
  ];
  for (const write of writes) await assert.rejects(write, /^Error: AUTH_REQUIRED$/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_attempts').get().n, 1);
});

test('review failures generic, concurrent reservations bounded at five, reset after fifteen minutes', async () => {
  const env = await reviewFixture();
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const state = await env.service.getState(env.joined);
  for (const payload of [{ code: 'UNKNOWN' }, { name: 'Unknown' }, { name: {} }, { pin: {} }]) {
    await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: state.reviewPin, ...payload }), /^Error: REVIEW_UNAVAILABLE$/);
  }
  const failures = await Promise.allSettled(Array.from({ length: 12 }, () => env.service.reviewJoin({ ...env.login, pin: '!!!!!!!!' })));
  assert.equal(failures.every((result) => result.status === 'rejected' && result.reason.message === 'REVIEW_UNAVAILABLE'), true);
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 5);
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: state.reviewPin }), /REVIEW_UNAVAILABLE/);
  env.clock.t += 15 * 60 * 1000;
  await env.service.reviewJoin({ ...env.login, pin: state.reviewPin });
  assert.equal(env.database.prepare('SELECT review_fail_count FROM exam_attempts').get().review_fail_count, 0);
});

test('review sessions persist, cap at ten, policy and release revoke access', async () => {
  const env = await reviewFixture();
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  const first = await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  assert.equal((await createExamService({ db: env.db, now: () => env.clock.t }).getState(first)).readOnly, true);
  for (let index = 0; index < 10; index++) await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 10);
  await assert.rejects(() => env.service.getState(first), /AUTH_REQUIRED/);
  const latest = await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')");
  await assert.rejects(() => env.service.getState(latest), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.pupilAsset({ ...latest, qid: 'q1' }), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: reviewPin }), /REVIEW_UNAVAILABLE/);
  assert.equal((await env.service.getState(env.joined)).reviewPin, undefined);
  env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','after_close')");
  await env.service.releaseAttempt({ ownerAccountId: 'teacher-1', examId: env.exam.id, attemptId: env.joined.attemptId });
  assert.equal(env.database.prepare('SELECT review_pin_hash FROM exam_attempts').get().review_pin_hash, null);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 0);
  await assert.rejects(() => env.service.getState(latest), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: reviewPin }), /REVIEW_UNAVAILABLE/);
});

test('session insertion rechecks policy and release', async () => {
  for (const mutation of ["UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')", 'UPDATE exam_attempts SET token_hash=NULL,review_pin_hash=NULL']) {
    let armed = false;
    const env = await reviewFixture((sql, database) => {
      if (armed && sql.startsWith('INSERT INTO exam_review_sessions')) { armed = false; database.exec(mutation); }
    });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
    const { reviewPin } = await env.service.getState(env.joined);
    armed = true;
    await assert.rejects(() => env.service.reviewJoin({ ...env.login, pin: reviewPin }), /REVIEW_UNAVAILABLE/);
    assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 0);
  }
});

test('owner delete rejects running, wrong owner, stale confirmations; deletes all children with FK on', async () => {
  const env = await reviewFixture();
  const base = { ownerAccountId: 'teacher-1', examId: env.exam.id, confirmTitle: env.exam.title, confirmAttempts: 1 };
  await assert.rejects(() => env.service.deleteExam(base), /BAD_STATE/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  const review = await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  const other = await openExam(env, { title: 'Other room' });
  const otherAttempt = await env.service.join({ code: other.code, name: 'Other pupil' });
  env.database.prepare("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) VALUES(?,?,'null',1,1)").run(otherAttempt.attemptId, 'q1');
  env.database.prepare("INSERT INTO exam_assets(id,exam_id,qid,kind,mime,data,bytes,created_at) VALUES('foreign-image',?,'q1','question','image/jpeg',?,300,1)").run(other.id, jpeg);
  env.database.prepare("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) VALUES('delete-photo',?,?,?,'photo','image/jpeg',?,300,?)").run(env.exam.id, env.joined.attemptId, 'q5', jpeg, env.clock.t);
  env.database.prepare("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) VALUES(?,?,'null',1,?)").run(env.joined.attemptId, 'q5', env.clock.t);
  for (const change of [{ ownerAccountId: 'teacher-2' }, { confirmTitle: 'stale' }, { confirmAttempts: 0 }, { confirmAttempts: '1' }, { confirmAttempts: -1 }]) {
    await assert.rejects(() => env.service.deleteExam({ ...base, ...change }), /BAD_STATE|NOT_FOUND/);
  }
  assert.deepEqual(await env.service.deleteExam(base), { ok: true });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_review_sessions').get().n, 0);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_answers').get().n, 1);
  assert.equal(env.database.prepare('SELECT attempt_id FROM exam_answers').get().attempt_id, otherAttempt.attemptId);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_assets').get().n, 1);
  assert.equal(env.database.prepare('SELECT id FROM exam_assets').get().id, 'foreign-image');
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_attempts').get().n, 1);
  assert.equal(env.database.prepare('SELECT id FROM exam_attempts').get().id, otherAttempt.attemptId);
  assert.equal(env.database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(env.database.prepare('PRAGMA foreign_key_check').all().length, 0);
  await assert.rejects(() => env.service.getState(review), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.getState(env.joined), /AUTH_REQUIRED/);
});

test('delete latch handles zero attempts and stale nonzero-to-zero/title races', async () => {
  for (const mutation of ['DELETE FROM exam_attempts', "UPDATE exams SET title='Changed'"]) {
    let armed = false;
    const env = await reviewFixture((sql, database) => {
      if (armed && sql.startsWith('UPDATE exams SET updated_at=')) { armed = false; database.exec(mutation); }
    });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
    armed = true;
    await assert.rejects(() => env.service.deleteExam({ ownerAccountId: 'teacher-1', examId: env.exam.id, confirmTitle: env.exam.title, confirmAttempts: 1 }), /BAD_STATE/);
    assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exams').get().n, 1);
  }
  const env = setup();
  const exam = await openExam(env);
  await assert.rejects(() => env.service.deleteExam({ ownerAccountId: 'teacher-1', examId: exam.id, confirmTitle: exam.title, confirmAttempts: 1 }), /BAD_STATE/);
  await env.service.deleteExam({ ownerAccountId: 'teacher-1', examId: exam.id, confirmTitle: exam.title, confirmAttempts: 0 });
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exams').get().n, 0);
});

function setup(startAt = 1_000_000, beforeWrite) {
  const { db, database } = makeDb(beforeWrite);
  const clock = { t: startAt };
  const service = createExamService({ db, now: () => clock.t });
  return { service, database, clock, db };
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

// ---- post-exam review: teacher data, sealed pupil projections and raw asset authorization ---------------------------

const reviewQuestions = questions.map((question, index) => ({ ...question, solution: 'Lời giải bí mật ' + (index + 1), ...(question.type === 'essay' ? { rubric: 'Thang điểm bí mật' } : {}) }));

function assertSealed(state) {
  assert.equal(state.review ?? null, null);
  assert.equal(state.result?.sections, undefined, 'section scores can reveal correctness in a one-question section');
  assert.ok(!/"(?:key|solution|rubric|solutionImages|correct|perQuestion|items)"/.test(JSON.stringify(state)), 'the whole pupil payload must remain sealed');
  assert.ok(!JSON.stringify(state).includes('bí mật'));
}

test('solution images append per question, owner can inspect metadata and remove only one selected asset', async () => {
  const env = setup();
  const exam = await openExam(env, { questions: reviewQuestions });
  const image1 = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  const image2 = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/png', data: jpeg });
  assert.notEqual(image1.id, image2.id);
  const teacher = await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.deepEqual(teacher.exam.questions[0].solutionImages, [{ id: image1.id, bytes: 300 }, { id: image2.id, bytes: 300 }]);
  assert.deepEqual(teacher.exam.questions[1].solutionImages, []);
  assert.equal(teacher.exam.questions[0].solution, reviewQuestions[0].solution);
  assert.ok(!JSON.stringify(teacher).includes(jpeg), 'teacher exam DTO contains metadata, not image blobs');
  await assert.rejects(() => env.service.saveSolutionImage({ ownerAccountId: 'teacher-2', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg }), /NOT_FOUND/);
  await assert.rejects(() => env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q99', mime: 'image/jpeg', data: jpeg }), /NOT_FOUND/);
  for (const [mime, data] of [['text/html', jpeg], ['image/jpeg', 'A'.repeat(700004)]]) {
    await assert.rejects(() => env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime, data }), /INVALID_IMAGE/);
  }
  await assert.rejects(() => env.service.removeSolutionImage({ ownerAccountId: 'teacher-2', examId: exam.id, assetId: image1.id }), /NOT_FOUND/);
  const otherExam = await openExam(env);
  await env.service.removeSolutionImage({ ownerAccountId: 'teacher-1', examId: otherExam.id, assetId: image1.id });
  assert.equal((await env.service.teacherAsset({ ownerAccountId: 'teacher-1', examId: exam.id, assetId: image1.id })).data, jpeg);
  await env.service.removeSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, assetId: image1.id });
  assert.deepEqual(await env.service.removeSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, assetId: image1.id }), { ok: true }, 'lost delete response can be retried');
  assert.deepEqual((await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id })).exam.questions[0].solutionImages, [{ id: image2.id, bytes: 300 }]);
});

test('solution uploads with stable IDs survive retries and cannot replace another question or asset kind', async () => {
  const env = setup();
  const exam = await openExam(env);
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg, assetId: crypto.randomUUID() };
  const first = await env.service.saveSolutionImage(args);
  assert.equal(first.id, args.assetId);
  assert.deepEqual(await env.service.saveSolutionImage(args), first);
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM exam_assets WHERE kind='solution'").get().n, 1);
  await assert.rejects(() => env.service.saveSolutionImage({ ...args, qid: 'q2' }), /NOT_FOUND/);
  const other = await openExam(env);
  await assert.rejects(() => env.service.saveSolutionImage({ ...args, examId: other.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.saveSolutionImage({ ...args, assetId: 'invalid' }), /INVALID_BODY/);
  await env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  const questionImage = env.database.prepare("SELECT id FROM exam_assets WHERE kind='question'").get();
  await assert.rejects(() => env.service.saveSolutionImage({ ...args, assetId: questionImage.id }), /NOT_FOUND/);
  await env.service.removeSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, assetId: questionImage.id });
  assert.equal(env.database.prepare("SELECT COUNT(*) AS n FROM exam_assets WHERE kind='question'").get().n, 1);
});

test('running pupil and early submit receive no solutions, keys or correctness; closed review exposes scored items', async () => {
  const env = setup();
  const exam = await openExam(env, { questions: reviewQuestions });
  const image = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  await env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  const pupil = await env.service.join({ code: exam.code, name: 'Review early' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  assertSealed(await env.service.getState({ token: pupil.token }));
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, solutionId: image.id }), /NOT_FOUND/);
  const early = await env.service.submit({ token: pupil.token, answers: { q1: 'C', q3: [true, true, true, true], q5: { text: 'Chứng minh của em' } } });
  assertSealed(early);
  assert.equal(early.result.total, 0.75);
  assert.deepEqual(early.badges, ['Hoàn thành', 'Đúng giờ']);
  assert.equal(early.exam.review, 'after_close');
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, solutionId: image.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, qid: 'q1' }), /ALREADY_SUBMITTED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  const closed = await env.service.getState({ token: pupil.token });
  assert.equal(closed.review.questions.length, 5);
  assert.equal(closed.review.questions[0].key, 'C');
  assert.equal(closed.review.questions[0].solution, reviewQuestions[0].solution);
  assert.equal(closed.review.questions[0].hasImage, true);
  assert.deepEqual(closed.review.questions[0].solutionImages, [{ id: image.id, bytes: 300 }]);
  assert.equal(closed.review.questions[4].rubric, 'Thang điểm bí mật');
  assert.deepEqual(closed.review.answers, early.answers);
  assert.deepEqual(closed.review.manual, {});
  assert.deepEqual(closed.review.comments, {});
  assert.equal(closed.review.items.q1.correct, true);
  assert.deepEqual(closed.review.items.q3.detail, { correct: 3, total: 4, marks: [true, true, true, false] });
  assert.equal(closed.review.items.q3.points, 0.5);
  assert.equal(closed.review.items.q5.pending, true);
  assert.equal((await env.service.pupilAsset({ token: pupil.token, solutionId: image.id })).data, jpeg);
  assert.equal((await env.service.pupilAsset({ token: pupil.token, qid: 'q1' })).data, jpeg);
  assert.ok(!JSON.stringify(closed).includes(jpeg));
});

test('review none remains sealed after closure regardless of total-score policy', async () => {
  for (const showResult of ['score', 'none']) {
    const env = setup();
    const exam = await openExam(env, { questions: reviewQuestions, settings: { review: 'none', showResult } });
    const image = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
    const pupil = await env.service.join({ code: exam.code, name: 'Hidden review' });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
    await env.service.submit({ token: pupil.token, answers: { q1: 'C' } });
    await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
    const state = await env.service.getState({ token: pupil.token });
    assert.equal(state.exam.review, 'none');
    assertSealed(state);
    assert.equal(state.result?.total ?? null, showResult === 'score' ? 0.25 : null);
    await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, solutionId: image.id }), /NOT_FOUND/);
  }
});

test('legacy review defaults open after close; asset requests settle expired clock and scope every asset', async () => {
  const env = setup();
  const exam = await openExam(env, { questions: reviewQuestions });
  env.database.prepare('UPDATE exams SET settings_json=? WHERE id=?').run(JSON.stringify(input.settings), exam.id);
  const image = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/jpeg', data: jpeg });
  const pupil = await env.service.join({ code: exam.code, name: 'Auto review' });
  const peer = await env.service.join({ code: exam.code, name: 'Other pupil' });
  const started = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' })).exam;
  const photo = await env.service.savePhoto({ token: pupil.token, qid: 'q5', mime: 'image/jpeg', data: jpeg });
  await assert.rejects(() => env.service.pupilAsset({ token: peer.token, photoId: photo.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, solutionId: photo.id }), /NOT_FOUND/);
  const otherExam = await openExam(env);
  const outsider = await env.service.join({ code: otherExam.code, name: 'Wrong room' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: otherExam.id, action: 'start' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: otherExam.id, action: 'close' });
  await assert.rejects(() => env.service.pupilAsset({ token: outsider.token, solutionId: image.id }), /NOT_FOUND/);
  env.clock.t = started.endsAt + 36_000;
  assert.equal((await env.service.pupilAsset({ token: pupil.token, solutionId: image.id })).data, jpeg);
  assert.equal(env.database.prepare('SELECT status FROM exams WHERE id=?').get(exam.id).status, 'closed');
  assert.equal((await env.service.pupilAsset({ token: pupil.token, photoId: photo.id })).data, jpeg);
  assert.equal((await env.service.getState({ token: pupil.token })).review.questions[0].solution, reviewQuestions[0].solution);
  assert.deepEqual((await env.service.getState({ token: pupil.token })).badges, ['Hoàn thành'], 'automatic sealing is not an on-time manual submission');
});

test('badges require server submission before the deadline, excluding equality and late grace', async () => {
  for (const offset of [-1, 0, 1]) {
    const env = setup();
    const exam = await openExam(env);
    const pupil = await env.service.join({ code: exam.code, name: 'Badge time' });
    const started = (await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' })).exam;
    env.clock.t = started.endsAt + offset;
    const state = await env.service.submit({ token: pupil.token, answers: {}, badges: ['Rà soát kỹ', 'Đúng giờ'] });
    assert.deepEqual(state.badges, offset < 0 ? ['Hoàn thành', 'Đúng giờ'] : ['Hoàn thành']);
  }
});

test('manual essay comments round-trip, remain private until close, preserve answers and score-only updates', async () => {
  const env = setup();
  const exam = await openExam(env, { questions: reviewQuestions });
  const pupil = await env.service.join({ code: exam.code, name: 'Essay comment' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupil.token, answers: { q5: { text: 'Lập luận' } } });
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, qid: 'q5' };
  await env.service.grade({ ...args, score: 1, comment: 'e\u0301\u0000' + 'c'.repeat(1200) });
  const teacher = await env.service.getAttempt(args);
  assert.equal(teacher.manual.q5, 1);
  assert.equal(teacher.comments.q5.length, 1000);
  assert.ok(teacher.comments.q5.startsWith('éc'));
  assert.deepEqual(teacher.answers.q5, { text: 'Lập luận' });
  assert.equal((await env.service.getState({ token: pupil.token })).comments, undefined);
  await env.service.grade({ ...args, score: 1.25 });
  assert.equal((await env.service.getAttempt(args)).comments.q5, teacher.comments.q5);
  await assert.rejects(() => env.service.grade({ ...args, ownerAccountId: 'teacher-2', score: 1, comment: 'overwrite' }), /NOT_FOUND/);
  await assert.rejects(() => env.service.grade({ ...args, score: 'NaN', comment: 'overwrite' }), /INVALID_SCORE/);
  await assert.rejects(() => env.service.grade({ ...args, score: 1, comment: { text: 'invalid' } }), /INVALID_BODY/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  const state = await env.service.getState({ token: pupil.token });
  assert.equal(state.review.manual.q5, 1.25);
  assert.equal(state.review.comments.q5, teacher.comments.q5);
  assert.equal(state.review.items.q5.points, 1.25);
  await env.service.grade({ ...args, score: null, comment: '' });
  const cleared = await env.service.getAttempt(args);
  assert.equal(cleared.manual.q5, undefined);
  assert.equal(cleared.comments.q5, '');
  assert.deepEqual(cleared.answers.q5, { text: 'Lập luận' });
});

test('migration 0014 only appends nullable manual_comment and preserves existing answers and scores', () => {
  const { database } = makeDb(undefined, false);
  database.exec("INSERT INTO exams(id,owner_account_id,code,title,status,duration_min,settings_json,questions_json,created_at,updated_at) VALUES('exam','teacher-1','ABC123','Old','closed',45,'{}','[]',1,1)");
  database.exec("INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at) VALUES('attempt','exam','An','an',1,1)");
  database.exec("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,manual_score,updated_at) VALUES('attempt','q1','{\"text\":\"old\"}',42,1.25,123)");
  const before = database.prepare('SELECT * FROM exam_answers').get();
  database.exec(readFileSync(new URL('../drizzle/0014_exam_manual_comments.sql', import.meta.url), 'utf8'));
  const after = database.prepare('SELECT * FROM exam_answers').get();
  assert.equal(after.manual_comment, null);
  delete after.manual_comment;
  assert.deepEqual(after, before);
  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  assert.equal(journal.entries.find((entry) => entry.idx === 14).tag, '0014_exam_manual_comments');
  const previous = JSON.parse(readFileSync(new URL('../drizzle/meta/0013_snapshot.json', import.meta.url), 'utf8'));
  const next = JSON.parse(readFileSync(new URL('../drizzle/meta/0014_snapshot.json', import.meta.url), 'utf8'));
  assert.equal(next.prevId, previous.id);
  assert.equal(next.tables.exam_answers.columns.manual_comment.notNull, false);
  delete next.tables.exam_answers.columns.manual_comment;
  assert.deepEqual(next.tables, previous.tables, 'other schema is unchanged');
});

async function examRoutes(env) {
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, atob, btoa, crypto: globalThis.crypto, console });
  const cache = new Map();
  const load = (path) => {
    if (cache.has(path)) return cache.get(path);
    let vmModule;
    if (path === resolve('lib/storage.js')) {
      vmModule = new SyntheticModule(['db', 'getEnv', 'stmt'], function () {
        this.setExport('db', () => env.db);
        this.setExport('getEnv', () => ({}));
        this.setExport('stmt', (sql, ...args) => env.db.prepare(sql).bind(...args));
      }, { context, identifier: path });
    } else if (path === resolve('lib/account-room-access.js')) {
      vmModule = new SyntheticModule(['resolveIdentity'], function () {
        this.setExport('resolveIdentity', request => ({ user: request.headers.get('x-test-user') ? { userId: request.headers.get('x-test-user'), email: 'test@test' } : null }));
      }, { context, identifier: path });
    } else if (path === resolve('lib/exam/service.js')) {
      vmModule = new SyntheticModule(['createExamService'], function () { this.setExport('createExamService', () => env.service); }, { context, identifier: path });
    } else if (path === resolve('lib/ai-settings.js')) {
      vmModule = new SyntheticModule(['loadStoredAI'], function () { this.setExport('loadStoredAI', async () => undefined); }, { context, identifier: path });
    } else if (path === resolve('lib/exam/variants.js')) {
      vmModule = new SyntheticModule(['variantCapabilities', 'variantSource', 'proposeExamVariants'], function () {
        this.setExport('variantCapabilities', () => env.variantCapabilities || { enabled: false, reason: 'AI_PROVIDER_NOT_CONFIGURED' });
        this.setExport('variantSource', async (source) => ({ ...source, sha256: JSON.stringify(source.questions), extractionHash: JSON.stringify(source.questions), parserRevision: 'exam-variants-v1' }));
        this.setExport('proposeExamVariants', async (args) => { env.proposalCalls ||= []; env.proposalCalls.push(args); if (!args.aiConsent) throw new Error('AI_CONSENT_REQUIRED'); return { questions: [] }; });
      }, { context, identifier: path });
    } else vmModule = new SourceTextModule(readFileSync(path, 'utf8'), { context, identifier: path });
    cache.set(path, vmModule);
    return vmModule;
  };
  const teacher = load(resolve('app/api/exams/route.js'));
  await teacher.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  await teacher.evaluate();
  const pupil = load(resolve('app/api/exam-play/route.js'));
  await pupil.link((specifier, parent) => load(resolve(dirname(parent.identifier), specifier)));
  await pupil.evaluate();
  return { teacher: teacher.namespace, pupil: pupil.namespace };
}

test('HTTP actions wire solution append/remove and comments; raw solution endpoint denies early access with 404', async () => {
  const env = setup();
  const exam = await openExam(env, { questions: reviewQuestions });
  const routes = await examRoutes(env);
  const post = (body, user = 'teacher-1') => routes.teacher.POST(new Request('https://exam.test/api/exams', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': user }, body: JSON.stringify({ id: exam.id, ...body }) }));
  const response = await post({ action: 'solution-image', qid: 'q5', mime: 'image/jpeg', data: jpeg });
  assert.equal(response.status, 200);
  const image = await response.json();
  const pupil = await env.service.join({ code: exam.code, name: 'HTTP review' });
  const asset = () => routes.pupil.GET(new Request('https://exam.test/api/exam-play?solution=' + image.id, { headers: { authorization: 'Bearer ' + pupil.token } }));
  assert.equal((await asset()).status, 404);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  await env.service.submit({ token: pupil.token, answers: {} });
  assert.equal((await asset()).status, 404);
  assert.equal((await post({ action: 'grade', attemptId: pupil.attemptId, qid: 'q5', score: 1, comment: 'Lập luận rõ.' })).status, 200);
  assert.equal((await env.service.getAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId })).comments.q5, 'Lập luận rõ.');
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  assert.equal((await asset()).status, 200);
  assert.equal((await post({ action: 'remove-solution-image', assetId: image.id }, 'teacher-2')).status, 404);
  assert.equal((await post({ action: 'remove-solution-image', assetId: image.id })).status, 200);
  assert.equal((await asset()).status, 404);
});

const codedQuestions = questions.map((q) => ({ ...q, ...(q.type === 'mc' ? { choiceText: { A: '1', B: '2', C: '3', D: '4' } } : {}), ...(q.type === 'tf' ? { statementText: { a: 'Một', b: 'Hai', c: 'Ba', d: 'Bốn' } } : {}), solution: 'Giải của mã đề' }));
const codesInput = { ...input, settings: { ...input.settings, shuffleQuestions: true, shuffleOptions: true }, codes: [{ code: '101', questions: codedQuestions }, { code: '102', questions: codedQuestions.map(q => q.type === 'mc' ? { ...q, key: 'D' } : q) }] };

test('alternate assignment is atomic across concurrent joins and frozen across token release, reload and settings edits', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  assert.equal(exam.codes.length, 2);
  const pupils = await Promise.all(Array.from({ length: 12 }, (_, i) => env.service.join({ code: exam.code, name: 'Mã ' + i })));
  const rows = env.database.prepare('SELECT * FROM exam_attempts ORDER BY rowid').all();
  assert.deepEqual(rows.map(r => r.exam_code), Array.from({ length: 12 }, (_, i) => i % 2 ? '102' : '101'));
  assert.ok(rows.every(r => r.shuffle_seed && r.view_json));
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const before = await env.service.getState({ token: pupils[0].token });
  assert.ok(before.questions.every(q => q.id.startsWith('101_')));
  assert.ok(!/"(?:key|solution|rubric|shuffle_seed|view_json|seed|examCode)"/.test(JSON.stringify(before)));
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { settings: { shuffleQuestions: false, shuffleOptions: false } } });
  assert.deepEqual((await env.service.getState({ token: pupils[0].token })).questions, before.questions);
  await env.service.releaseAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupils[0].attemptId });
  const resumed = await env.service.join({ code: exam.code, name: 'Mã 0' });
  assert.equal(resumed.attemptId, pupils[0].attemptId);
  assert.deepEqual((await env.service.getState({ token: resumed.token })).questions, before.questions);
});

test('displayed MC and TF map to canonical storage and canonical scores; review remaps keys and marks', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const pupil = await env.service.join({ code: exam.code, name: 'Mapping' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const attempt = env.database.prepare('SELECT * FROM exam_attempts WHERE id=?').get(pupil.attemptId);
  const view = JSON.parse(attempt.view_json);
  const canonical = exam.codes[0].questions;
  const mc = canonical[0], tf = canonical[2];
  await env.service.saveAnswer({ token: pupil.token, qid: mc.id, value: toDisplayAnswer(mc, 'C', view), seq: 1 });
  await env.service.saveAnswer({ token: pupil.token, qid: tf.id, value: toDisplayAnswer(tf, [true, true, null, false], view), seq: 1 });
  const stored = env.database.prepare('SELECT qid,value_json FROM exam_answers').all();
  assert.equal(JSON.parse(stored.find(r => r.qid === mc.id).value_json), 'C');
  assert.deepEqual(JSON.parse(stored.find(r => r.qid === tf.id).value_json), [true, true, null, false]);
  const early = await env.service.submit({ token: pupil.token, answers: { [mc.id]: toDisplayAnswer(mc, 'C', view), [tf.id]: toDisplayAnswer(tf, [true, true, null, false], view) } });
  assert.equal(early.result.total, 0.75);
  assertSealed(early);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  const state = await env.service.getState({ token: pupil.token });
  const reviewMc = state.review.questions.find(q => q.id === mc.id);
  assert.equal(reviewMc.key, toDisplayAnswer(mc, 'C', view));
  assert.deepEqual(state.review.items[tf.id].detail.marks, view.statements[tf.id].map(letter => [true, true, null, true][tf.statements.indexOf(letter)]));
  const teacher = await env.service.getAttempt({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId });
  assert.equal(teacher.attempt.examCode, '101');
  assert.equal(teacher.answers[mc.id], 'C');
  assert.equal(teacher.displayLabels[mc.id], reviewMc.label);
});

test('manual assignment waits safely, blocks start and late joins, and can only be made once by owner', async () => {
  const env = setup();
  const exam = await openExam(env, { ...codesInput, settings: { ...codesInput.settings, assignment: 'manual', showCode: true } });
  const pupil = await env.service.join({ code: exam.code, name: 'Manual' });
  const waiting = await env.service.getState({ token: pupil.token });
  assert.equal(waiting.assignmentPending, true);
  assert.deepEqual(waiting.questions, []);
  await assert.rejects(() => env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' }), /BAD_STATE/);
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, attemptId: pupil.attemptId, examCode: '102' };
  await assert.rejects(() => env.service.assignCode({ ...args, ownerAccountId: 'teacher-2' }), /NOT_FOUND/);
  await env.service.assignCode(args);
  await env.service.assignCode(args);
  await assert.rejects(() => env.service.assignCode({ ...args, examCode: '101' }), /BAD_STATE/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  assert.equal((await env.service.getState({ token: pupil.token })).exam.examCode, '102');
  await assert.rejects(() => env.service.join({ code: exam.code, name: 'Late manual' }), /EXAM_LOCKED/);
  await assert.rejects(() => env.service.assignCode(args), /BAD_STATE/);
});

test('code-specific scoring, statistics and CSV never mix keys or essay grades between codes', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const first = await env.service.join({ code: exam.code, name: 'First' });
  const second = await env.service.join({ code: exam.code, name: 'Second' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  for (const [pupil, index] of [[first, 0], [second, 1]]) {
    const view = JSON.parse(env.database.prepare('SELECT view_json FROM exam_attempts WHERE id=?').get(pupil.attemptId).view_json);
    const q = exam.codes[index].questions[0];
    await env.service.submit({ token: pupil.token, answers: { [q.id]: toDisplayAnswer(q, q.key, view) } });
  }
  const result = await env.service.results({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.deepEqual(result.rows.map(r => [r.examCode, r.total]), [['101', 0.25], ['102', 0.25]]);
  assert.equal(result.statsByCode['101']['101_q1'].correct, 1);
  assert.equal(result.statsByCode['102']['102_q1'].correct, 1);
  await assert.rejects(() => env.service.grade({ ownerAccountId: 'teacher-1', examId: exam.id, attemptId: first.attemptId, qid: '102_q5', score: 1 }), /NOT_FOUND/);
  const csv = await env.service.exportCsv({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.match(csv, /"Mã đề"/);
  assert.match(csv, /"101"/);
  assert.match(csv, /"102"/);
});

test('code membership gates question and solution raw assets, even when another pupil knows the asset ID', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const figureId = crypto.randomUUID();
  await env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: '101_q1', assetId: figureId, mime: 'image/png', data: jpeg });
  const solution = await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid: '101_q1', mime: 'image/png', data: jpeg });
  const first = await env.service.join({ code: exam.code, name: 'Image first' });
  const second = await env.service.join({ code: exam.code, name: 'Image second' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  assert.equal((await env.service.pupilAsset({ token: first.token, questionId: figureId })).data, jpeg);
  await assert.rejects(() => env.service.pupilAsset({ token: second.token, questionId: figureId }), /NOT_FOUND/);
  await assert.rejects(() => env.service.saveAnswer({ token: second.token, qid: '101_q1', value: 'C', seq: 1 }), /NOT_FOUND/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  await assert.rejects(() => env.service.pupilAsset({ token: second.token, solutionId: solution.id }), /NOT_FOUND/);
  assert.equal((await env.service.pupilAsset({ token: first.token, solutionId: solution.id })).data, jpeg);
});

test('frozen code content rejects structural edits but allows corrected keys; owner preview remains sanitized', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const preview = await env.service.preview({ ownerAccountId: 'teacher-1', examId: exam.id, examCode: '102', seed: 'sample' });
  assert.ok(preview.questions.every(q => q.id.startsWith('102_')));
  assert.ok(!/"(?:key|solution|rubric)"/.test(JSON.stringify(preview)));
  await assert.rejects(() => env.service.preview({ ownerAccountId: 'teacher-2', examId: exam.id, examCode: '102', seed: 'sample' }), /NOT_FOUND/);
  await env.service.join({ code: exam.code, name: 'Frozen' });
  const changed = structuredClone(exam.codes);
  changed[0].questions[0].text = 'Changed stem';
  await assert.rejects(() => env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { codes: changed } }), /QUESTIONS_LOCKED/);
  changed[0].questions[0].text = exam.codes[0].questions[0].text;
  changed[0].questions[0].key = 'A';
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { codes: changed } });
  assert.equal((await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id })).exam.codes[0].questions[0].key, 'A');
});

test('migration 0015 preserves legacy attempt and old answers; null stored view remains identity', async () => {
  const env = setup();
  const exam = await openExam(env);
  const pupil = await env.service.join({ code: exam.code, name: 'Legacy identity' });
  env.database.prepare('UPDATE exam_attempts SET exam_code=NULL,shuffle_seed=NULL,view_json=NULL WHERE id=?').run(pupil.attemptId);
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { settings: { shuffleQuestions: true, shuffleOptions: true } } });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  assert.deepEqual((await env.service.getState({ token: pupil.token })).questions.map(q => q.id), ['q1', 'q2', 'q3', 'q4', 'q5']);
  const old = makeDb(undefined, false).database;
  old.exec(readFileSync(new URL('../drizzle/0014_exam_manual_comments.sql', import.meta.url), 'utf8'));
  old.exec("INSERT INTO exams(id,owner_account_id,code,title,status,duration_min,settings_json,questions_json,created_at,updated_at) VALUES('exam','teacher-1','ABC123','Old','closed',45,'{}','[]',1,1)");
  old.exec("INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at) VALUES('attempt','exam','An','an',1,1)");
  const before = old.prepare('SELECT * FROM exam_attempts').get();
  old.exec(readFileSync(new URL('../drizzle/0015_exam_attempt_views.sql', import.meta.url), 'utf8'));
  const after = old.prepare('SELECT * FROM exam_attempts').get();
  for (const field of ['exam_code', 'shuffle_seed', 'view_json']) { assert.equal(after[field], null); delete after[field]; }
  assert.deepEqual(after, before);
});

test('multiple figures append idempotently, keep the figure stem; item images are scoped and frozen after join', async () => {
  const env = setup();
  const exam = await openExam(env, { ...codesInput, codes: codesInput.codes.map(code => ({ ...code, questions: code.questions.map(q => ({ ...q, imageMode: 'figure', ...(q.type === 'mc' ? { choiceText: {} } : {}) })) })) });
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, qid: '101_q1', mime: 'image/png', data: jpeg };
  const id = crypto.randomUUID();
  await env.service.saveQuestionImage({ ...args, assetId: id });
  await env.service.saveQuestionImage({ ...args, assetId: id });
  await env.service.saveQuestionImage({ ...args, assetId: crypto.randomUUID() });
  for (const letter of ['A', 'B', 'C', 'D']) await env.service.saveItemImage({ ...args, itemKind: 'option', letter, assetId: crypto.randomUUID() });
  const owner = await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id });
  assert.equal(owner.exam.codes[0].questions[0].questionImages.length, 2);
  assert.equal(Object.keys(owner.exam.codes[0].questions[0].choiceImages).length, 4);
  const pupil = await env.service.join({ code: exam.code, name: 'Figures' });
  await assert.rejects(() => env.service.saveQuestionImage(args), /QUESTIONS_LOCKED/);
  await assert.rejects(() => env.service.saveItemImage({ ...args, itemKind: 'option', letter: 'A' }), /QUESTIONS_LOCKED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const q = (await env.service.getState({ token: pupil.token })).questions.find(q => q.id === '101_q1');
  assert.equal(q.text, 'Chu kỳ?');
  assert.equal(q.imageMode, 'figure');
  assert.equal(q.questionImages.length, 2);
  assert.equal((await env.service.pupilAsset({ token: pupil.token, itemId: q.choiceImages.A })).data, jpeg);
  await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, itemId: id }), /NOT_FOUND/);
});

test('a join between structural update precheck and write freezes the original content', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('UPDATE exams SET title=')) return;
    armed = false;
    database.exec("INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at) SELECT 'raced',id,'Raced','raced',1,1 FROM exams LIMIT 1");
  });
  const exam = await openExam(env, codesInput);
  const changed = structuredClone(exam.codes);
  changed[0].questions[0].text = 'Do not publish changed stem';
  armed = true;
  await assert.rejects(() => env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { codes: changed } }), /QUESTIONS_LOCKED/);
  assert.equal((await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id })).exam.questions[0].text, 'Chu kỳ?');
});

test('duplicating an exam code atomically copies all owned asset kinds with new IDs and canonical qids', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const base = { ownerAccountId: 'teacher-1', examId: exam.id, qid: '101_q1', mime: 'image/png', data: jpeg };
  await env.service.saveQuestionImage({ ...base, assetId: crypto.randomUUID() });
  await env.service.saveItemImage({ ...base, itemKind: 'option', letter: 'A' });
  await env.service.saveSolutionImage(base);
  await env.service.duplicateCode({ ownerAccountId: 'teacher-1', examId: exam.id, sourceCode: '101', newCode: '103' });
  const full = (await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id })).exam;
  const copied = full.codes.find(code => code.code === '103').questions[0];
  assert.equal(copied.id, '103_q1');
  assert.equal(copied.questionImages.length, 1);
  assert.equal(copied.solutionImages.length, 1);
  assert.ok(copied.choiceImages.A);
  assert.notEqual(copied.questionImages[0].id, full.codes[0].questions[0].questionImages[0].id);
  await assert.rejects(() => env.service.duplicateCode({ ownerAccountId: 'teacher-2', examId: exam.id, sourceCode: '101', newCode: '104' }), /NOT_FOUND/);
  await env.service.join({ code: exam.code, name: 'Lock duplication' });
  await assert.rejects(() => env.service.duplicateCode({ ownerAccountId: 'teacher-1', examId: exam.id, sourceCode: '101', newCode: '104' }), /QUESTIONS_LOCKED/);
});

test('manual join cannot slip past start, and start cannot bypass an unassigned pupil inserted before its write', async () => {
  for (const race of ['join', 'start']) {
    let armed = false;
    const env = setup(1_000_000, (sql, database) => {
      if (!armed) return;
      if (race === 'join' && sql.startsWith('INSERT INTO exam_attempts')) { armed = false; database.exec("UPDATE exams SET status='running'"); }
      if (race === 'start' && sql.startsWith("UPDATE exams SET status='running'")) { armed = false; database.exec("INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at,shuffle_seed) SELECT 'manual-race',id,'Manual','manual',1,1,'seed' FROM exams LIMIT 1"); }
    });
    const exam = await openExam(env, { ...codesInput, settings: { ...codesInput.settings, assignment: 'manual' } });
    armed = true;
    await assert.rejects(() => race === 'join' ? env.service.join({ code: exam.code, name: 'Too late' }) : env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' }), /EXAM_LOCKED|BAD_STATE/);
  }
});

test('variant HTTP source is owner-scoped to the requested code and never trusts caller question bodies', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const route = (await examRoutes(env)).teacher;
  const request = (body, owner = 'teacher-1') => new Request('https://exam.test/api/exams', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': owner }, body: JSON.stringify({ id: exam.id, ...body }) });
  const capabilities = await route.GET(new Request('https://exam.test/api/exams?id=' + exam.id + '&capabilities=variants', { headers: { 'x-test-user': 'teacher-1' } }));
  assert.equal((await capabilities.json()).capabilities.enabled, false);
  assert.equal((await route.POST(request({ action: 'variant-source', examCode: '101', qids: ['101_q1'] }))).status, 503);
  env.variantCapabilities = { enabled: true, model: 'mock-model', providerHost: 'mock.test' };
  const args = { action: 'variant-source', examCode: '101', qids: ['101_q1'] };
  assert.equal((await route.POST(request(args, 'teacher-2'))).status, 404);
  assert.equal((await route.POST(request({ ...args, qids: ['102_q1'] }))).status, 404);
  const source = (await (await route.POST(request({ ...args, questions: [{ id: 'forged', key: 'A' }] }))).json()).source;
  assert.deepEqual(source.questions.map(q => q.id), ['101_q1']);
  assert.equal(source.questions[0].key, 'C');
  assert.equal((await route.POST(request({ action: 'variants', examCode: '101', qids: ['101_q1'], model: 'mock-model' }))).status, 400);
  const response = await route.POST(request({ action: 'variants', examCode: '101', qids: ['101_q1'], model: 'mock-model', aiConsent: { accepted: true } }));
  assert.equal(response.status, 200);
  assert.equal(env.proposalCalls.at(-1).source.sha256, source.sha256);
});

test('raw question and item IDs obey waiting, submitted and closed-none policies as legacy question images', async () => {
  const env = setup();
  const exam = await openExam(env, { ...codesInput, settings: { ...codesInput.settings, review: 'none' } });
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, qid: '101_q1', mime: 'image/png', data: jpeg };
  const figure = await env.service.saveQuestionImage({ ...args, assetId: crypto.randomUUID() });
  const item = await env.service.saveItemImage({ ...args, itemKind: 'option', letter: 'A' });
  const pupil = await env.service.join({ code: exam.code, name: 'Asset policy' });
  const reads = [{ questionId: figure.id }, { itemId: item.id }];
  for (const query of reads) await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, ...query }), /EXAM_NOT_STARTED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  for (const query of reads) assert.equal((await env.service.pupilAsset({ token: pupil.token, ...query })).data, jpeg);
  await env.service.submit({ token: pupil.token, answers: {} });
  for (const query of reads) await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, ...query }), /ALREADY_SUBMITTED/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  for (const query of reads) await assert.rejects(() => env.service.pupilAsset({ token: pupil.token, ...query }), /NOT_FOUND/);
});

test('legacy conversion to codes preserves question and solution assets with their new canonical qids', async () => {
  const env = setup();
  const exam = await openExam(env);
  const args = { ownerAccountId: 'teacher-1', examId: exam.id, qid: 'q1', mime: 'image/png', data: jpeg };
  const figure = await env.service.saveQuestionImage(args);
  const solution = await env.service.saveSolutionImage(args);
  await env.service.updateExam({ ownerAccountId: 'teacher-1', examId: exam.id, input: { codes: [{ code: '101', questions: exam.questions }, { code: '102', questions }] } });
  const full = (await env.service.getExam({ ownerAccountId: 'teacher-1', examId: exam.id })).exam;
  assert.equal(full.questions[0].questionImages[0].id, figure.id);
  assert.equal(full.questions[0].solutionImages[0].id, solution.id);
  assert.equal(env.database.prepare('SELECT qid FROM exam_assets WHERE id=?').get(figure.id).qid, '101_q1');
});

test('teacher preview and variant source accept the displayed legacy 101 alias without rewriting qids', async () => {
  const env = setup();
  const exam = await openExam(env);
  const preview = await env.service.preview({ ownerAccountId: 'teacher-1', examId: exam.id, examCode: '101', seed: 'preview' });
  assert.equal(preview.questions[0].id, 'q1');
  env.variantCapabilities = { enabled: true, model: 'mock', providerHost: 'mock.test' };
  const route = (await examRoutes(env)).teacher;
  const response = await route.POST(new Request('https://exam.test/api/exams', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': 'teacher-1' }, body: JSON.stringify({ action: 'variant-source', id: exam.id, examCode: '101', qids: ['q1'] }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).source.questions[0].id, 'q1');
});

test('a question replacement between joining precheck and insert cannot freeze a stale code or view', async () => {
  let armed = false;
  const env = setup(1_000_000, (sql, database) => {
    if (!armed || !sql.startsWith('INSERT INTO exam_attempts')) return;
    armed = false;
    database.exec("UPDATE exams SET questions_json=json_set(questions_json,'$.codes[0].code','103')");
  });
  const exam = await openExam(env, codesInput);
  armed = true;
  await assert.rejects(() => env.service.join({ code: exam.code, name: 'Stale code' }), /EXAM_LOCKED|BAD_STATE/);
  assert.equal(env.database.prepare('SELECT COUNT(*) AS n FROM exam_attempts').get().n, 0);
});

test('review bearer preserves frozen own code, answers and assets; foreign code and pupil assets remain inaccessible', async () => {
  const env = setup();
  const exam = await openExam(env, codesInput);
  const images = [];
  for (const code of exam.codes) {
    const qid = code.questions[0].id;
    await env.service.saveQuestionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid, mime: 'image/jpeg', data: jpeg });
    await env.service.saveItemImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid, itemKind: 'option', letter: 'A', mime: 'image/jpeg', data: jpeg });
    await env.service.saveSolutionImage({ ownerAccountId: 'teacher-1', examId: exam.id, qid, mime: 'image/jpeg', data: jpeg });
    images.push(env.database.prepare('SELECT id,qid,kind FROM exam_assets WHERE exam_id=? AND qid=?').all(exam.id, qid));
  }
  const own = await env.service.join({ code: exam.code, name: 'Own code review' });
  const other = await env.service.join({ code: exam.code, name: 'Other code review' });
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'start' });
  const ownQuestion = exam.codes[0].questions[0];
  const ownEssay = exam.codes[0].questions.find(question => question.type === 'essay');
  const otherEssay = exam.codes[1].questions.find(question => question.type === 'essay');
  const view = JSON.parse(env.database.prepare('SELECT view_json FROM exam_attempts WHERE id=?').get(own.attemptId).view_json);
  const ownPhoto = await env.service.savePhoto({ token: own.token, qid: ownEssay.id, mime: 'image/jpeg', data: jpeg });
  const otherPhoto = await env.service.savePhoto({ token: other.token, qid: otherEssay.id, mime: 'image/jpeg', data: jpeg });
  const submitted = await env.service.submit({ token: own.token, answers: { [ownQuestion.id]: toDisplayAnswer(ownQuestion, 'C', view) } });
  await assert.rejects(() => env.service.reviewJoin({ code: exam.code, name: 'Own code review', pin: submitted.reviewPin }), /REVIEW_UNAVAILABLE/);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: exam.id, action: 'close' });
  const review = await env.service.reviewJoin({ code: exam.code, name: 'Own code review', pin: submitted.reviewPin });
  const original = await env.service.getState(own);
  const state = await env.service.getState(review);
  assert.deepEqual(state.review, original.review);
  assert.equal(state.review.questions.every(question => question.id.startsWith('101_')), true);
  for (const asset of images[0]) {
    const field = asset.kind === 'question' ? 'questionId' : asset.kind === 'solution' ? 'solutionId' : 'itemId';
    assert.equal((await env.service.pupilAsset({ token: review.token, [field]: asset.id })).data === jpeg, true);
  }
  for (const asset of images[1]) {
    const field = asset.kind === 'question' ? 'questionId' : asset.kind === 'solution' ? 'solutionId' : 'itemId';
    await assert.rejects(() => env.service.pupilAsset({ token: review.token, [field]: asset.id }), /NOT_FOUND/);
  }
  assert.equal((await env.service.pupilAsset({ token: review.token, photoId: ownPhoto.id })).data === jpeg, true);
  await assert.rejects(() => env.service.pupilAsset({ token: review.token, photoId: otherPhoto.id }), /NOT_FOUND/);
  await assert.rejects(() => env.service.pupilAsset({ token: review.token, qid: exam.codes[1].questions[0].id }), /NOT_FOUND/);
});

test('review state and asset reads recheck policy after their initial authentication', async () => {
  const env = await reviewFixture();
  env.database.prepare("INSERT INTO exam_assets(id,exam_id,qid,kind,mime,data,bytes,created_at) VALUES('race-image',?,'q1','question','image/jpeg',?,300,1)").run(env.exam.id, jpeg);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  const { reviewPin } = await env.service.getState(env.joined);
  const review = await env.service.reviewJoin({ ...env.login, pin: reviewPin });
  for (const assetRead of [false, true]) {
    env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','after_close')");
    let armed = true;
    const wrapped = {
      ...env.db,
      prepare: (sql) => ({ bind: (...args) => {
        const statement = env.db.prepare(sql).bind(...args);
        const trigger = assetRead ? sql.startsWith('SELECT qid,kind,mime,data FROM exam_assets') : sql.startsWith('SELECT qid,value_json,manual_score,manual_comment FROM exam_answers');
        return {
          ...statement,
          first: async () => { const result = await statement.first(); if (armed && trigger) { armed = false; env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')"); } return result; },
          all: async () => { const result = await statement.all(); if (armed && trigger) { armed = false; env.database.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.review','none')"); } return result; },
        };
      } }),
    };
    const service = createExamService({ db: wrapped, now: () => env.clock.t });
    await assert.rejects(() => assetRead ? service.pupilAsset({ token: review.token, questionId: 'race-image' }) : service.getState(review), /AUTH_REQUIRED/);
    assert.equal(armed, false);
  }
});

test('HTTP review login is unauthenticated, errors are uniformly 403, review writes 401 and owner delete guarded', async () => {
  const env = await reviewFixture();
  const routes = await examRoutes(env);
  const postPupil = (body, token) => routes.pupil.POST(new Request('https://exam.test/api/exam-play', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }));
  const submitted = await env.service.submit({ token: env.joined.token, answers: {} });
  const login = { action: 'review-join', ...env.login, pin: submitted.reviewPin };
  assert.equal((await postPupil(login)).status, 403);
  await env.service.control({ ownerAccountId: 'teacher-1', examId: env.exam.id, action: 'close' });
  for (const changes of [{ code: 'UNKNOWN' }, { name: 'UNKNOWN' }, { pin: '!!!!!!!!' }, { pin: {} }]) {
    const result = await postPupil({ ...login, ...changes });
    assert.equal(result.status, 403);
    assert.deepEqual(await result.json(), { error: 'REVIEW_UNAVAILABLE' });
  }
  const response = await postPupil(login);
  assert.equal(response.status, 200);
  const review = await response.json();
  assert.deepEqual(Object.keys(review).sort(), ['readOnly', 'token']);
  for (const action of ['answer', 'submit', 'tab', 'mascot', 'photo', 'photo-delete', 'join']) {
    const result = await postPupil({ action, ...env.login }, review.token);
    assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), { error: 'AUTH_REQUIRED' });
  }
  const state = await routes.pupil.GET(new Request('https://exam.test/api/exam-play', { headers: { authorization: 'Bearer ' + review.token } }));
  assert.equal(state.status, 200);
  assert.equal((await state.json()).readOnly, true);
  const deletion = { action: 'delete', id: env.exam.id, confirmTitle: env.exam.title, confirmAttempts: 1 };
  const postTeacher = (body, user) => routes.teacher.POST(new Request('https://exam.test/api/exams', { method: 'POST', headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': user } : {}) }, body: JSON.stringify(body) }));
  assert.equal((await postTeacher(deletion)).status, 401);
  assert.equal((await postTeacher(deletion, 'teacher-2')).status, 404);
  assert.equal((await postTeacher({ ...deletion, confirmAttempts: 0 }, 'teacher-1')).status, 409);
  const deleted = await postTeacher(deletion, 'teacher-1');
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { ok: true });
});
