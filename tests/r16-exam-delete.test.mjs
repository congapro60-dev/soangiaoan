import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createExamService } from '../lib/exam/service.js';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function uiModule(name) {
  const source = readFileSync(new URL('../components/exam/' + name + '.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: (name) => name === 'react' ? React : name.endsWith('/MathText') ? { __esModule: true, default: ({ text }) => React.createElement('span', null, text) } : {}, console });
  return exports;
}

function teacherUi(room = null, tab = 'students') {
  const source = readFileSync(new URL('../components/exam/ExamTeacher.tsx', import.meta.url), 'utf8') + '\nexport { ExamRoom };';
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  let cursor = 0; const states = [], calls = [];
  const react = { ...React, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef: () => ({ current: 0 }), useEffect() {}, useCallback: (value) => value };
  const exports = {};
  vm.runInNewContext(js, { exports, window: { location: { origin: 'https://test.invalid' }, history: { replaceState() {} }, confirm() { throw new Error('native dialog must not run'); } }, require(name) {
    if (name === 'react') return react;
    if (name === './client') return { teacherPost: async (body) => { calls.push(JSON.parse(JSON.stringify(body))); return room; }, teacherGet: async () => room || { exams: [] }, messageFor: () => 'error' };
    if (name.endsWith('/scoring.js')) return { describeKey: () => 'A' };
    if (name.endsWith('/LessonMascotPicker')) return { mascotSpriteStyle: () => ({}) };
    if (name === './KeyEditor') return { keyReady: () => true };
    if (name === './VariantEditor') return { nextExamCode: () => '102' };
    return {};
  } });
  const tree = () => { cursor = 0; return room ? exports.ExamRoom({ id: room.exam.id, onBack() {} }) : exports.default({ user: { displayName: 'GV' } }); };
  tree();
  if (room) { states[0] = room; states[2] = tab; }
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; }
    return null;
  };
  return { states, calls, tree, find };
}

const findButton = (h, text) => h.find(h.tree(), (node) => node.type === 'button' && node.props.children === text);

function fixture(beforeWrite = () => {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec("CREATE TABLE site_trash(kind TEXT,object_id TEXT,owner_account_id TEXT,deleted_at INTEGER,data TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(kind,object_id))");
  sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE accounts(id TEXT PRIMARY KEY)');
  for (const name of ['0013_exam_rooms', '0014_exam_manual_comments', '0015_exam_attempt_views', '0016_exam_review_access', '0020_exam_accommodations']) {
    for (const part of readFileSync(new URL('../drizzle/' + name + '.sql', import.meta.url), 'utf8').split('--> statement-breakpoint')) if (part.trim()) sqlite.exec(part);
  }
  sqlite.exec("INSERT INTO accounts VALUES('owner'),('other')");
  const db = {
    prepare: (sql) => ({ bind: (...values) => ({
      first: async () => sqlite.prepare(sql).get(...values) || null,
      all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
      run: async () => { beforeWrite(sql, sqlite); return { meta: { changes: sqlite.prepare(sql).run(...values).changes } }; },
    }) }),
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const service = createExamService({ db, now: () => 10000 });
  const question = (label) => ({ label, type: 'mc', text: label, points: 1, key: 'A', options: ['A', 'B'] });
  const create = async () => (await service.createExam({ ownerAccountId: 'owner', requestId: crypto.randomUUID(), input: { title: 'Đề thử', durationMin: 45, codes: [{ code: '101', questions: ['Một', 'Hai', 'Ba'].map(question) }, { code: '102', questions: ['Khác'].map(question) }] } })).exam;
  const image = (examId, id, qid, kind = 'question', attemptId = null) => sqlite.prepare("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) VALUES(?,?,?,?,?,'image/jpeg','AAAA',3,1)").run(id, examId, attemptId, qid, kind);
  return { sqlite, service, create, image };
}

test('question/code removal moves all surviving images with their original question', async () => {
  const env = fixture(); const exam = await env.create();
  for (const [id, qid, kind] of [['one', '101_q1', 'question'], ['two', '101_q2', 'option:A'], ['three', '101_q3', 'solution'], ['other', '102_q1', 'question']]) env.image(exam.id, id, qid, kind);
  const base = { ownerAccountId: 'owner', examId: exam.id };
  base.expectedContentRevision = (await env.service.getExam(base)).exam.contentRevision;
  const after = await env.service.removeExamPart({ ...base, examCode: '101', qid: '101_q1', confirmLabel: 'Một' });
  assert.deepEqual(after.exam.codes[0].questions.map((q) => [q.id, q.label]), [['101_q1', 'Hai'], ['101_q2', 'Ba']]);
  assert.deepEqual(env.sqlite.prepare("SELECT id,qid FROM exam_assets WHERE NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='exam_asset' AND object_id=exam_assets.id) ORDER BY id").all().map((r) => [r.id, r.qid]), [['other', '102_q1'], ['three', '101_q2'], ['two', '101_q1']]);
  base.expectedContentRevision = after.exam.contentRevision;
  await env.service.removeExamPart({ ...base, examCode: '102', confirmLabel: '102' });
  assert.equal(env.sqlite.prepare("SELECT COUNT(*) n FROM site_trash WHERE kind='exam_asset' AND object_id='other'").get().n, 1);
  base.expectedContentRevision = (await env.service.getExam(base)).exam.contentRevision;
  await assert.rejects(() => env.service.removeExamPart({ ...base, examCode: '101', confirmLabel: '101' }), /INVALID_EXAM/);
  await assert.rejects(() => env.service.removeExamPart({ ...base, examCode: '101', qid: '', confirmLabel: '101' }), /INVALID_BODY/);
  await assert.rejects(() => env.service.removeExamPart({ ...base, ownerAccountId: 'other', examCode: '101', qid: '101_q1', confirmLabel: 'Hai' }), /NOT_FOUND/);
});

test('question deletion rejects stale content, new pupil and running transition atomically', async () => {
  for (const mutation of ["UPDATE exams SET status='running'", "UPDATE exams SET questions_json='[]'", "INSERT INTO exam_attempts(id,exam_id,name,name_key,joined_at,last_seen_at) SELECT 'late',id,'Late','late',1,1 FROM exams"]) {
    let armed = false;
    const env = fixture((sql, sqlite) => { if (armed && sql.startsWith('UPDATE exams SET questions_json=')) { armed = false; sqlite.exec(mutation); } });
    const exam = await env.create(); const expectedContentRevision = (await env.service.getExam({ ownerAccountId: 'owner', examId: exam.id })).exam.contentRevision; env.image(exam.id, 'keep', '101_q1'); armed = true;
    await assert.rejects(() => env.service.removeExamPart({ ownerAccountId: 'owner', examId: exam.id, examCode: '101', qid: '101_q1', confirmLabel: 'Một', expectedContentRevision }), /QUESTIONS_LOCKED/);
    assert.equal(env.sqlite.prepare("SELECT COUNT(*) n FROM exam_assets WHERE id='keep'").get().n, 1);
  }
});

test('option image removal scopes exact asset and refuses post-join changes', async () => {
  const env = fixture(); const exam = await env.create(); env.image(exam.id, 'item', '101_q1', 'option:A'); env.image(exam.id, 'other', '101_q2', 'option:A');
  const args = { ownerAccountId: 'owner', examId: exam.id, qid: '101_q1', itemKind: 'option', letter: 'A', assetId: 'item' };
  await assert.rejects(() => env.service.removeItemImage({ ...args, assetId: 'other' }), /NOT_FOUND/);
  await env.service.removeItemImage(args);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_assets').get().n, 2);
  await env.service.control({ ownerAccountId: 'owner', examId: exam.id, action: 'open' }); await env.service.join({ code: exam.code, name: 'Em An' });
  await assert.rejects(() => env.service.removeItemImage({ ...args, qid: '101_q2', assetId: 'other' }), /QUESTIONS_LOCKED/);
});

test('selected question image removal keeps sibling figures and catches a running race', async () => {
  let armed = false;
  const env = fixture((sql, sqlite) => { if (armed && sql.startsWith('INSERT INTO site_trash')) { armed = false; sqlite.exec("UPDATE exams SET status='running'"); } });
  const exam = await env.create(); env.image(exam.id, 'figure-1', '101_q1'); env.image(exam.id, 'figure-2', '101_q1'); env.image(exam.id, 'foreign-question', '101_q2');
  const base = { ownerAccountId: 'owner', examId: exam.id, qid: '101_q1' };
  await env.service.removeQuestionImage({ ...base, assetId: 'figure-1' });
  assert.deepEqual(env.sqlite.prepare("SELECT id FROM exam_assets WHERE NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='exam_asset' AND object_id=exam_assets.id) ORDER BY id").all().map((row) => row.id), ['figure-2', 'foreign-question']);
  armed = true; await assert.rejects(() => env.service.removeQuestionImage({ ...base, assetId: 'figure-2' }), /QUESTIONS_LOCKED/);
  assert.equal(env.sqlite.prepare("SELECT COUNT(*) n FROM exam_assets WHERE id='figure-2'").get().n, 1);
});

test('attempt removal confirms revision, cascades own data and keeps other pupils/results', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  await env.service.control({ ...base, action: 'open' });
  const pupil = await env.service.join({ code: exam.code, name: 'Em An' }); await env.service.join({ code: exam.code, name: 'Em Binh' });
  const row = (await env.service.getExam(base)).attempts.find((entry) => entry.id === pupil.attemptId);
  const args = { ...base, attemptId: row.id, confirmName: row.name, expectedLastSeenAt: row.lastSeenAt, expectedSubmittedAt: row.submittedAt, expectedContentRevision: row.contentRevision };
  await assert.rejects(() => env.service.removeAttempt({ ...args, ownerAccountId: 'other' }), /NOT_FOUND/);
  await assert.rejects(() => env.service.removeAttempt({ ...args, confirmName: 'Wrong' }), /BAD_STATE/);
  env.sqlite.prepare("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) VALUES(?,'101_q1','\"A\"',1,1)").run(row.id);
  env.image(exam.id, 'photo', '101_q1', 'photo', row.id);
  await assert.rejects(() => env.service.removeAttempt(args), /BAD_STATE/);
  const fresh = (await env.service.getExam(base)).attempts.find((entry) => entry.id === row.id);
  env.sqlite.prepare("INSERT INTO exam_review_sessions(id,attempt_id,token_hash,created_at) VALUES('review',?,'review-hash',1)").run(row.id);
  await env.service.removeAttempt({ ...args, expectedContentRevision: fresh.contentRevision });
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_answers').get().n, 1); assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_assets').get().n, 1); assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_review_sessions').get().n, 0);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_attempts').get().n, 2);
  assert.equal((await env.service.getExam(base)).attempts.length, 1);
  await assert.rejects(() => env.service.getState(pupil), /AUTH_REQUIRED/);
  assert.equal(env.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('attempt removal cannot race a new grade or status transition', async () => {
  for (const change of ["UPDATE exams SET status='running'", "UPDATE exam_answers SET manual_comment='changed'"]) {
    let armed = false;
    const env = fixture((sql, sqlite) => { if (armed && sql.startsWith('UPDATE exam_attempts SET last_seen_at=')) { armed = false; sqlite.exec(change); } });
    const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
    await env.service.control({ ...base, action: 'open' }); const pupil = await env.service.join({ code: exam.code, name: 'An' });
    env.sqlite.prepare("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) VALUES(?,'101_q1','null',1,1)").run(pupil.attemptId);
    const row = (await env.service.getExam(base)).attempts[0]; armed = true;
    await assert.rejects(() => env.service.removeAttempt({ ...base, attemptId: row.id, confirmName: row.name, expectedLastSeenAt: row.lastSeenAt, expectedSubmittedAt: row.submittedAt, expectedContentRevision: row.contentRevision }), /BAD_STATE/);
    assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_attempts').get().n, 1); assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_answers').get().n, 1);
  }
});

test('closed assessed attempt removal preserves another pupil and rolls back on storage failure', async () => {
  let armed = false;
  const env = fixture((sql) => { if (armed && sql.startsWith('INSERT INTO site_trash')) { armed = false; throw new Error('storage failure'); } });
  const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  await env.service.control({ ...base, action: 'open' });
  const pupil = await env.service.join({ code: exam.code, name: 'An' }); const other = await env.service.join({ code: exam.code, name: 'Binh' });
  await env.service.control({ ...base, action: 'start' });
  await env.service.acknowledgeIntegrity({ ...pupil, integrity: { confirmed: true, usedAI: false } });
  await env.service.acknowledgeIntegrity({ ...other, integrity: { confirmed: true, usedAI: false } });
  await env.service.submit({ ...pupil, answers: { '101_q1': 'A' } }); await env.service.submit({ ...other, answers: { '102_q1': 'A' } });
  await env.service.control({ ...base, action: 'close' });
  const row = (await env.service.getExam(base)).attempts.find((entry) => entry.id === pupil.attemptId);
  const args = { ...base, attemptId: row.id, confirmName: row.name, expectedLastSeenAt: row.lastSeenAt, expectedSubmittedAt: row.submittedAt, expectedContentRevision: row.contentRevision };
  armed = true; await assert.rejects(() => env.service.removeAttempt(args), /storage failure/);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_attempts').get().n, 2);
  assert.equal(env.sqlite.prepare('SELECT last_seen_at FROM exam_attempts WHERE id=?').get(row.id).last_seen_at, row.lastSeenAt);
  await env.service.removeAttempt(args);
  assert.equal((await env.service.getState(other)).result.total, 1);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_answers WHERE attempt_id=?').get(other.attemptId).n, 1);
});

test('code removal visible by exact code, disabled for last code or locked exam; drafts expose image removal', () => {
  const { CodeTabs } = uiModule('VariantEditor');
  const codes = [{ code: '101', questions: [] }, { code: '102', questions: [] }];
  const html = (extra) => renderToStaticMarkup(React.createElement(CodeTabs, { codes, selected: '102', onRemove() {}, onSelect() {}, onDuplicate() {}, onImport() {}, ...extra }));
  assert.match(html({}), />Xóa mã đề 102<\/button>/);
  assert.match(html({ locked: true }), /disabled=""[^>]*>Xóa mã đề 102<\/button>/);
  assert.match(html({ codes: [codes[0]], selected: '101' }), /disabled=""[^>]*>Xóa mã đề 101<\/button>/);
  const { QuestionItemsEditor, KeyEditor } = uiModule('KeyEditor');
  const q = { id: 'q1', type: 'mc', label: 'Câu 1', options: ['A', 'B'], choiceImages: { A: 'draft-id' }, itemUploads: [{ id: 'draft-id', letter: 'A', itemKind: 'option', mime: 'image/png', data: 'AAAA' }] };
  assert.match(renderToStaticMarkup(React.createElement(QuestionItemsEditor, { q, onChange() {} })), /Bỏ ảnh mới A/);
  assert.match(renderToStaticMarkup(React.createElement(KeyEditor, { q: { ...q, type: 'tf', statements: ['a', 'b'], key: [true, false] }, onChange() {} })), /Xóa đáp án đúng\/sai/);
});

test('room-list delete needs inline exact title; cancel sends nothing and confirm keeps count payload', async () => {
  const h = teacherUi(); h.states[2] = [{ id: 'exam', title: 'Đề thử', status: 'closed', attempts: 2, durationMin: 45, questionCount: 2, code: 'ABC234' }];
  findButton(h, 'Xóa phòng').props.onClick(); assert.equal(h.calls.length, 0);
  assert.equal(findButton(h, 'Xác nhận xóa').props.disabled, true);
  findButton(h, 'Hủy xóa').props.onClick(); assert.equal(h.calls.length, 0); assert.equal(findButton(h, 'Xác nhận xóa'), null);
  findButton(h, 'Xóa phòng').props.onClick();
  h.find(h.tree(), (node) => node.type === 'input' && node.props.autoComplete === 'off').props.onChange({ target: { value: 'Đề thử' } });
  assert.equal(findButton(h, 'Xác nhận xóa').props.disabled, false);
  await h.find(h.tree(), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(h.calls, [{ action: 'delete', id: 'exam', confirmTitle: 'Đề thử', confirmAttempts: 2 }]);
});

test('room, pupil and question delete use inline confirmation and preserve exact guarded request', async () => {
  for (const kind of ['room', 'pupil', 'question']) {
    const question = (id, label) => ({ id, label, type: 'mc', points: 1, options: ['A', 'B'], key: 'A' });
    const room = { serverNow: 10000, exam: { id: 'exam', title: 'Đề thử', status: 'closed', code: 'ABC234', durationMin: 45, settings: {}, contentRevision: 'exam-revision', questions: [question('q1', 'Một'), question('q2', 'Hai')] }, missingKeys: [], attempts: [{ id: 'pupil', name: 'An', submittedAt: 500, lastSeenAt: 1000, contentRevision: 'answer-revision', textScale: 1, extraMinutes: 0 }] };
    if (kind === 'question') { room.exam.status = 'draft'; room.attempts = []; }
    const h = teacherUi(room, kind === 'question' ? 'exam' : 'students');
    const label = kind === 'room' ? 'Xóa phòng' : kind === 'pupil' ? 'Xóa bài học sinh' : 'Xóa câu';
    const expected = kind === 'room' ? 'Đề thử' : kind === 'pupil' ? 'An' : 'Một';
    findButton(h, label).props.onClick(); assert.equal(h.calls.length, 0);
    findButton(h, 'Hủy xóa').props.onClick(); assert.equal(h.calls.length, 0);
    findButton(h, label).props.onClick();
    h.find(h.tree(), (node) => node.type === 'input' && node.props.autoComplete === 'off').props.onChange({ target: { value: expected } });
    await h.find(h.tree(), (node) => node.type === 'form' && node.props['aria-label'] === 'Xác nhận xóa trong phòng kiểm tra').props.onSubmit({ preventDefault() {} });
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].action, kind === 'room' ? 'delete' : kind === 'pupil' ? 'remove-attempt' : 'remove-question');
    if (kind === 'room') { assert.equal(h.calls[0].confirmTitle, room.exam.title); assert.equal(h.calls[0].confirmAttempts, 1); }
    if (kind === 'pupil') { assert.equal(h.calls[0].attemptId, 'pupil'); assert.equal(h.calls[0].expectedContentRevision, 'answer-revision'); }
    if (kind === 'question') { assert.equal(h.calls[0].qid, 'q1'); assert.equal(h.calls[0].expectedContentRevision, 'exam-revision'); }
  }
});

test('exam trash survives service reload, denies code/tokens, restores raw results and owner scope', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  await env.service.control({ ...base, action: 'open' }); const pupil = await env.service.join({ code: exam.code, name: 'An' });
  await env.service.deleteExam({ ...base, confirmTitle: exam.title, confirmAttempts: 1 });
  assert.equal((await env.service.listExams('owner')).exams.length, 0);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exams').get().n, 1);
  await assert.rejects(() => env.service.getExam(base), /NOT_FOUND/);
  await assert.rejects(() => env.service.join({ code: exam.code, name: 'Binh' }), /ROOM_NOT_FOUND/);
  await assert.rejects(() => env.service.getState(pupil), /AUTH_REQUIRED/);
  await assert.rejects(() => env.service.restoreTrash({ ownerAccountId: 'other', kind: 'exam', objectId: exam.id }), /NOT_FOUND/);
  await env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam', objectId: exam.id });
  assert.equal((await env.service.getExam(base)).attempts.length, 1);
  assert.equal((await env.service.getState(pupil)).exam.code, exam.code);
});

test('attempt restored with same answers/photos and new login, old token never revived', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  await env.service.control({ ...base, action: 'open' }); const pupil = await env.service.join({ code: exam.code, name: 'An' });
  env.sqlite.prepare("INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) VALUES(?,'101_q1','\"A\"',1,1)").run(pupil.attemptId);
  env.image(exam.id, 'photo', '101_q1', 'photo', pupil.attemptId);
  const row = (await env.service.getExam(base)).attempts[0];
  await env.service.removeAttempt({ ...base, attemptId: row.id, confirmName: row.name, expectedLastSeenAt: row.lastSeenAt, expectedSubmittedAt: row.submittedAt, expectedContentRevision: row.contentRevision });
  assert.equal((await env.service.results(base)).rows.length, 0);
  await env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam_attempt', objectId: row.id });
  assert.equal((await env.service.getAttempt({ ...base, attemptId: row.id })).answers['101_q1'], 'A');
  assert.equal((await env.service.getAttempt({ ...base, attemptId: row.id })).photos.length, 1);
  await assert.rejects(() => env.service.getState(pupil), /AUTH_REQUIRED/);
  const fresh = await env.service.join({ code: exam.code, name: 'An' }); assert.notEqual(fresh.token, pupil.token);
});

test('structural trash restores exact question identity/assets, rejects changed revision and wrong owner', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  env.image(exam.id, 'first', '101_q1'); env.image(exam.id, 'second', '101_q2', 'option:A');
  const original = (await env.service.getExam(base)).exam;
  await env.service.removeExamPart({ ...base, examCode: '101', qid: '101_q1', confirmLabel: 'Một', expectedContentRevision: original.contentRevision });
  const item = env.sqlite.prepare("SELECT object_id FROM site_trash WHERE kind='exam_structure'").get();
  await assert.rejects(() => env.service.restoreTrash({ ownerAccountId: 'other', kind: 'exam_structure', objectId: item.object_id }), /NOT_FOUND/);
  await env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam_structure', objectId: item.object_id });
  const restored = (await env.service.getExam(base)).exam;
  assert.equal(restored.contentRevision, original.contentRevision);
  assert.deepEqual(env.sqlite.prepare('SELECT id,qid FROM exam_assets ORDER BY id').all().map((row) => [row.id, row.qid]), [['first', '101_q1'], ['second', '101_q2']]);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM site_trash').get().n, 0);
  await env.service.removeExamPart({ ...base, examCode: '102', confirmLabel: '102', expectedContentRevision: original.contentRevision });
  const codeItem = env.sqlite.prepare("SELECT object_id FROM site_trash WHERE kind='exam_structure'").get();
  env.sqlite.exec("UPDATE exams SET settings_json=json_set(settings_json,'$.showCode',true)");
  await assert.rejects(() => env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam_structure', objectId: codeItem.object_id }), /BAD_STATE/);
});

test('question/item/solution assets trash retain bytes and restore same IDs', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id, qid: '101_q1' };
  for (const [id, kind] of [['figure', 'question'], ['item', 'option:A'], ['solution', 'solution']]) env.image(exam.id, id, base.qid, kind);
  await env.service.removeQuestionImage({ ...base, assetId: 'figure' });
  await env.service.removeItemImage({ ...base, assetId: 'item', itemKind: 'option', letter: 'A' });
  await env.service.removeSolutionImage({ ...base, assetId: 'solution' });
  for (const id of ['figure', 'item', 'solution']) {
    await assert.rejects(() => env.service.teacherAsset({ ...base, assetId: id }), /NOT_FOUND/);
    await env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam_asset', objectId: id });
    assert.equal((await env.service.teacherAsset({ ...base, assetId: id })).data, 'AAAA');
  }
});

test('pupil-deleted photo enters owner trash; restores bytes after close, no photo data in trash', async () => {
  const env = fixture(); const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
  const content = JSON.parse(env.sqlite.prepare('SELECT questions_json FROM exams WHERE id=?').get(exam.id).questions_json);
  content.codes[0].questions.push({ id: '101_q4', label: 'Tự luận', type: 'essay', points: 1, text: 'Giải thích' });
  env.sqlite.prepare('UPDATE exams SET questions_json=? WHERE id=?').run(JSON.stringify(content), exam.id);
  await env.service.control({ ...base, action: 'open' }); const pupil = await env.service.join({ code: exam.code, name: 'An' });
  await env.service.control({ ...base, action: 'start' }); await env.service.acknowledgeIntegrity({ ...pupil, integrity: { confirmed: true, usedAI: false } });
  const photo = await env.service.savePhoto({ ...pupil, qid: '101_q4', mime: 'image/jpeg', data: 'A'.repeat(400) });
  await env.service.deletePhoto({ ...pupil, id: photo.id });
  assert.equal((await env.service.getState(pupil)).photos['101_q4'], undefined);
  await assert.rejects(() => env.service.pupilAsset({ ...pupil, photoId: photo.id }), /NOT_FOUND/);
  const entry = env.sqlite.prepare("SELECT * FROM site_trash WHERE object_id=? AND kind='exam_asset'").get(photo.id);
  assert.equal(entry.owner_account_id, 'owner'); assert.doesNotMatch(entry.data, /AAAA/);
  await assert.rejects(() => env.service.restoreTrash({ ownerAccountId: 'other', kind: 'exam_asset', objectId: photo.id }), /NOT_FOUND/);
  await env.service.control({ ...base, action: 'close' });
  await env.service.restoreTrash({ ownerAccountId: 'owner', kind: 'exam_asset', objectId: photo.id });
  assert.equal((await env.service.pupilAsset({ ...pupil, photoId: photo.id })).data, 'A'.repeat(400));
});

test('draft deletion Undo restores only removed image/key and preserves other choices', () => {
  const source = readFileSync(new URL('../components/exam/KeyEditor.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  let cursor = 0; const state = [], exports = {};
  const react = { ...React, useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = value; }]; } };
  vm.runInNewContext(js, { exports, require: (name) => name === 'react' ? react : name.endsWith('/MathText') ? { __esModule: true, default: ({ text }) => React.createElement('span', null, text) } : {} });
  const image = { id: 'image', letter: 'A', itemKind: 'option', mime: 'image/png', data: 'AAAA' };
  let q = { id: 'q1', label: 'Câu 1', type: 'mc', options: ['A', 'B'], choiceText: { B: 'original' }, choiceImages: { A: image.id }, itemUploads: [image] };
  const render = (name) => { cursor = 0; return exports[name]({ q, onChange: (patch) => { q = { ...q, ...patch }; } }); };
  const button = (tree, text) => {
    if (!tree || typeof tree !== 'object') return null;
    if (tree.type === 'button' && tree.props.children === text) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const found = button(child, text); if (found) return found; }
    return null;
  };
  // Labels include split text and therefore locate the explicit item-upload handler directly.
  const walk = (node) => { if (!node || typeof node !== 'object') return null; if (node.type === 'button' && node.props.children?.[0] === 'Bỏ ảnh mới ') return node; for (const child of React.Children.toArray(node.props?.children)) { const found = walk(child); if (found) return found; } return null; };
  walk(render('QuestionItemsEditor')).props.onClick(); assert.equal(q.itemUploads.length, 0);
  q = { ...q, choiceText: { B: 'later edit' } };
  button(render('QuestionItemsEditor'), 'Hoàn tác bỏ ảnh mới').props.onClick();
  assert.equal(q.itemUploads[0].id, image.id); assert.equal(q.choiceText.B, 'later edit');
  state.length = 0; q = { ...q, type: 'tf', statements: ['a', 'b'], key: [true, false] };
  button(render('KeyEditor'), 'Xóa đáp án đúng/sai').props.onClick(); assert.equal(q.key, null);
  button(render('KeyEditor'), 'Hoàn tác xóa đáp án').props.onClick(); assert.deepEqual(q.key, [true, false]);
});

test('in-flight teacher grade/solution upload cannot write retained rows after trash deletion', async () => {
  for (const action of ['grade', 'solution']) {
    let armed = false;
    const env = fixture((sql, sqlite) => { if (armed && sql.startsWith(action === 'grade' ? 'INSERT INTO exam_answers' : 'INSERT INTO exam_assets')) { armed = false; sqlite.prepare("INSERT INTO site_trash VALUES('exam',?,'owner',1000,'{}')").run(exam.id); } });
    const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
    const content = JSON.parse(env.sqlite.prepare('SELECT questions_json FROM exams WHERE id=?').get(exam.id).questions_json);
    content.codes[0].questions[0] = { id: '101_q1', label: 'Tự luận', type: 'essay', points: 1, text: 'Giải thích' };
    env.sqlite.prepare('UPDATE exams SET questions_json=? WHERE id=?').run(JSON.stringify(content), exam.id);
    await env.service.control({ ...base, action: 'open' }); const pupil = await env.service.join({ code: exam.code, name: 'An' });
    armed = true;
    await assert.rejects(() => action === 'grade' ? env.service.grade({ ...base, attemptId: pupil.attemptId, qid: '101_q1', score: 1, comment: 'late' }) : env.service.saveSolutionImage({ ...base, qid: '101_q1', mime: 'image/jpeg', data: 'A'.repeat(400) }), /NOT_FOUND/);
    assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_answers').get().n, 0);
    assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM exam_assets').get().n, 0);
  }
});

test('restore refuses same-data trash ABA and retains newer deletion timestamp', async () => {
  for (const kind of ['exam', 'exam_asset', 'exam_attempt', 'exam_structure']) {
    let armed = false;
    let objectId;
    const env = fixture((sql, sqlite) => {
      const boundary = kind === 'exam_structure' ? sql.startsWith('UPDATE exams SET updated_at=') : sql.startsWith('DELETE FROM site_trash WHERE kind=?');
      if (armed && boundary) { armed = false; sqlite.prepare('UPDATE site_trash SET deleted_at=deleted_at+1000 WHERE kind=? AND object_id=?').run(kind, objectId); }
    });
    const exam = await env.create(); const base = { ownerAccountId: 'owner', examId: exam.id };
    if (kind === 'exam') { await env.service.deleteExam({ ...base, confirmTitle: exam.title, confirmAttempts: 0 }); objectId = exam.id; }
    if (kind === 'exam_asset') { env.image(exam.id, 'image', '101_q1'); await env.service.removeQuestionImage({ ...base, qid: '101_q1', assetId: 'image' }); objectId = 'image'; }
    if (kind === 'exam_attempt') {
      await env.service.control({ ...base, action: 'open' }); await env.service.join({ code: exam.code, name: 'An' });
      const attempt = (await env.service.getExam(base)).attempts[0]; objectId = attempt.id;
      await env.service.removeAttempt({ ...base, attemptId: objectId, confirmName: attempt.name, expectedLastSeenAt: attempt.lastSeenAt, expectedSubmittedAt: attempt.submittedAt, expectedContentRevision: attempt.contentRevision });
    }
    if (kind === 'exam_structure') {
      const revision = (await env.service.getExam(base)).exam.contentRevision;
      await env.service.removeExamPart({ ...base, examCode: '101', qid: '101_q1', confirmLabel: 'Một', expectedContentRevision: revision });
      objectId = env.sqlite.prepare("SELECT object_id FROM site_trash WHERE kind='exam_structure'").get().object_id;
    }
    const old = env.sqlite.prepare('SELECT * FROM site_trash WHERE kind=? AND object_id=?').get(kind, objectId);
    armed = true;
    await assert.rejects(() => env.service.restoreTrash({ ownerAccountId: 'owner', kind, objectId }), /BAD_STATE/);
    const newer = env.sqlite.prepare('SELECT * FROM site_trash WHERE kind=? AND object_id=?').get(kind, objectId);
    assert.equal(newer.deleted_at, old.deleted_at + 1000); assert.equal(newer.data, old.data);
    assert.equal(armed, false);
  }
});

test('import image deletion and Undo preserve edited math instead of replacing it with OCR text', () => {
  const source = readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const remove = /onClick=\{\(\) => \{ (setRemovedDraft\(\{ question: q, patch: \{ image:[\s\S]*?) \}\}>Bỏ ảnh câu hỏi/.exec(source)[1];
  let q = { id: '101_q1', image: 'image', hasImage: true, imageMode: 'question', text: 'GV đã sửa $u_n=2n+1$', rawText: 'OCR: un=2n+l' }, removedDraft;
  vm.runInNewContext(remove, { q, setRemovedDraft: value => { removedDraft = value; }, patch: (_id, patch) => { q = { ...q, ...patch }; } });
  assert.equal(q.text, 'GV đã sửa $u_n=2n+1$'); assert.equal(q.image, undefined);
  // Execute the same Undo merge used by the mounted import editor.
  const merge = /questions\[index\] = (\{ \.\.\.questions\[index\], \.\.\.removedDraft\.patch \});/.exec(source)[1];
  const restored = vm.runInNewContext('(' + merge + ')', { questions: [{ ...q, points: 2 }], index: 0, removedDraft });
  assert.equal(restored.text, 'GV đã sửa $u_n=2n+1$'); assert.equal(restored.image, 'image'); assert.equal(restored.points, 2);
});

test('variant Undo restores removed middle question in place and preserves later edits', () => {
  const source = readFileSync(new URL('../components/exam/VariantEditor.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  let cursor = 0; const states = [], exports = {};
  const react = { ...React, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useEffect() {} };
  vm.runInNewContext(js, { exports, require(name) { if (name === 'react') return react; if (name.endsWith('/variants.js')) return { variantBlockReason: () => '' }; return {}; } });
  const render = () => { cursor = 0; return exports.VariantAssistant({ examId: 'exam', examCode: '101', questions: [], onCreate() {} }); };
  render(); states[0] = { enabled: true }; states[4] = ['A', 'B', 'C'].map(sourceId => ({ sourceId, check: { status: 'review' }, question: { id: sourceId, label: sourceId, text: sourceId } }));
  const find = (node, predicate) => { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const result = find(child, predicate); if (result) return result; } return null; };
  const middle = find(render(), node => node.type === 'article' && node.key?.endsWith('B'));
  find(middle, node => node.type === 'button' && node.props.children === 'Loại câu này').props.onClick();
  states[4] = states[4].map(item => item.sourceId === 'C' ? { ...item, question: { ...item.question, text: 'C edited later' } } : item);
  find(render(), node => node.type === 'button' && node.props.children === 'Hoàn tác bỏ nháp biến thể').props.onClick();
  assert.deepEqual(Array.from(states[4], item => item.sourceId), ['A', 'B', 'C']); assert.equal(states[4][2].question.text, 'C edited later');
});
