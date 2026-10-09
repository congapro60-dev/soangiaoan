// Exam rooms ("Phòng kiểm tra"): the teacher publishes an exam, pupils join with a code and answer, every answer is
// saved on the server the moment it changes, and the teacher watches, marks essays and exports the marks.
//
// Rules that matter for an exam:
//  - The answer key never leaves the server on a pupil's request.
//  - Every answer is its own row (an upsert), so two requests can never overwrite each other's answers.
//  - The clock is the server's: the room has one start time and one end time; answers are refused a little after it.
//  - A pupil who closes the page can come back with the same device (token) or, if the teacher releases the name,
//    from another device.
import { cleanAnswer, scoreAttempt, isAnswered } from './scoring.js';
import { normalizeExamInput, normalizeQuestions, normalizeName, nameKey, checkImage, LIMITS } from './validate.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ANSWER_BYTES = 6000;
const STATUSES = ['draft', 'open', 'running', 'closed'];

const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
const parse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};
const fail = (code) => {
  throw new Error(code);
};

export function createExamService({ db, now = () => Date.now() }) {
  const q = (sql, ...args) => db.prepare(sql).bind(...args);
  const one = (sql, ...args) => q(sql, ...args).first();
  const all = async (sql, ...args) => (await q(sql, ...args).all()).results || [];
  const run = (sql, ...args) => q(sql, ...args).run();

  const examRow = (id) => one('SELECT * FROM exams WHERE id=?', id);
  const ownExam = async (owner, id) => {
    if (!owner) fail('AUTH_REQUIRED');
    const row = await one('SELECT * FROM exams WHERE id=? AND owner_account_id=?', id, owner);
    if (!row) fail('NOT_FOUND');
    return row;
  };

  const present = (row, imageIds = null) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    durationMin: row.duration_min,
    settings: parse(row.settings_json, {}),
    startedAt: row.started_at,
    endsAt: row.ends_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    questions: parse(row.questions_json, []).map((qs) => (imageIds ? { ...qs, hasImage: imageIds.has(qs.id) } : qs)),
  });

  async function imageSet(examId) {
    return new Set((await all("SELECT DISTINCT qid FROM exam_assets WHERE exam_id=? AND kind='question'", examId)).map((r) => r.qid));
  }

  // --------------------------------------------------------------------------------------------------- the teacher
  async function createExam({ ownerAccountId, requestId, input }) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId || '')) fail('INVALID_REQUEST_ID');
    const clean = normalizeExamInput(input);
    const again = await one('SELECT * FROM exams WHERE owner_account_id=? AND request_id=?', ownerAccountId, requestId);
    if (again) return { exam: present(again, await imageSet(again.id)) };
    const id = crypto.randomUUID();
    const t = now();
    for (let tries = 0; tries < 8; tries++) {
      const code = newCode();
      try {
        await run(
          'INSERT INTO exams(id,owner_account_id,code,title,status,duration_min,settings_json,questions_json,request_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          id, ownerAccountId, code, clean.title, 'draft', clean.durationMin, JSON.stringify(clean.settings), JSON.stringify(clean.questions), requestId, t, t,
        );
        return { exam: present(await examRow(id), new Set()) };
      } catch (error) {
        if (!/UNIQUE|constraint/i.test(String(error?.message))) throw error;
        const raced = await one('SELECT * FROM exams WHERE owner_account_id=? AND request_id=?', ownerAccountId, requestId);
        if (raced) return { exam: present(raced, await imageSet(raced.id)) };
      }
    }
    return fail('CODE_UNAVAILABLE');
  }

  async function updateExam({ ownerAccountId, examId, input }) {
    const row = await ownExam(ownerAccountId, examId);
    const current = parse(row.questions_json, []);
    const next = {};
    if (input.title !== undefined || input.durationMin !== undefined || input.settings !== undefined) {
      const merged = normalizeExamInput({ title: input.title ?? row.title, durationMin: input.durationMin ?? row.duration_min, settings: { ...parse(row.settings_json, {}), ...(input.settings || {}) }, questions: current });
      next.title = merged.title;
      next.durationMin = merged.durationMin;
      next.settings = merged.settings;
    }
    let questions = current;
    if (input.questions !== undefined) {
      questions = normalizeQuestions(input.questions);
      // while pupils may already have answers, the questions' identity (id and type) is fixed; keys and points may change
      if (row.status === 'running' || row.status === 'closed' || (await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId))) {
        if (questions.length !== current.length || questions.some((n, i) => n.id !== current[i].id || n.type !== current[i].type)) fail('QUESTIONS_LOCKED');
      }
    }
    await run(
      'UPDATE exams SET title=?,duration_min=?,settings_json=?,questions_json=?,updated_at=? WHERE id=?',
      next.title ?? row.title, next.durationMin ?? row.duration_min, JSON.stringify(next.settings ?? parse(row.settings_json, {})), JSON.stringify(questions), now(), examId,
    );
    return getExam({ ownerAccountId, examId });
  }

  async function listExams(ownerAccountId) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    const rows = await all(
      'SELECT e.*, (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id=e.id) AS attempts FROM exams e WHERE e.owner_account_id=? ORDER BY e.created_at DESC LIMIT 50',
      ownerAccountId,
    );
    return { exams: rows.map((r) => ({ id: r.id, code: r.code, title: r.title, status: r.status, durationMin: r.duration_min, attempts: r.attempts, createdAt: r.created_at, startedAt: r.started_at, endsAt: r.ends_at, questionCount: parse(r.questions_json, []).length })) };
  }

  async function saveQuestionImage({ ownerAccountId, examId, qid, mime, data }) {
    const row = await ownExam(ownerAccountId, examId);
    if (!parse(row.questions_json, []).some((x) => x.id === qid)) fail('NOT_FOUND');
    const { bytes } = checkImage(mime, data, LIMITS.imageBase64);
    const t = now();
    await db.batch([
      q("DELETE FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question'", examId, qid),
      q("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) VALUES(?,?,NULL,?,'question',?,?,?,?)", crypto.randomUUID(), examId, qid, mime, data, bytes, t),
    ]);
    return { ok: true };
  }

  async function removeQuestionImage({ ownerAccountId, examId, qid }) {
    await ownExam(ownerAccountId, examId);
    await run("DELETE FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question'", examId, qid);
    return { ok: true };
  }

  async function missingKeys(row) {
    return parse(row.questions_json, []).filter((x) => x.type !== 'essay' && (x.key === null || x.key === undefined)).map((x) => x.id);
  }

  async function getExam({ ownerAccountId, examId }) {
    let row = await ownExam(ownerAccountId, examId);
    row = await settleClock(row);
    const exam = present(row, await imageSet(examId));
    const attempts = await all('SELECT * FROM exam_attempts WHERE exam_id=? ORDER BY joined_at', examId);
    const counts = await all("SELECT a.id AS id, COUNT(x.qid) AS n FROM exam_attempts a LEFT JOIN exam_answers x ON x.attempt_id=a.id AND x.value_json!='null' WHERE a.exam_id=? GROUP BY a.id", examId);
    const byId = new Map(counts.map((c) => [c.id, c.n]));
    const photos = await all("SELECT attempt_id, COUNT(*) AS n FROM exam_assets WHERE exam_id=? AND kind='photo' GROUP BY attempt_id", examId);
    const photoBy = new Map(photos.map((p) => [p.attempt_id, p.n]));
    const t = now();
    return {
      serverNow: t,
      exam,
      missingKeys: await missingKeys(row),
      attempts: attempts.map((a) => ({
        id: a.id,
        name: a.name,
        mascot: a.mascot,
        answered: byId.get(a.id) || 0,
        photos: photoBy.get(a.id) || 0,
        tabLeaves: a.tab_leaves,
        joinedAt: a.joined_at,
        lastSeenAt: a.last_seen_at,
        submittedAt: a.submitted_at,
        claimed: Boolean(a.token_hash),
      })),
    };
  }

  // The room closes by itself a little after the end time, so unsubmitted work is sealed even if nobody is watching.
  async function settleClock(row) {
    if (row.status === 'running' && row.ends_at && now() > row.ends_at + parse(row.settings_json, {}).graceSeconds * 1000 + 5000) {
      await closeRoom(row, row.ends_at, true);
      return examRow(row.id);
    }
    return row;
  }

  async function closeRoom(row, at, automatic = false) {
    const t = now();
    const out = await db.batch([
      automatic
        ? q("UPDATE exams SET status='closed',closed_at=?,updated_at=? WHERE id=? AND status='running' AND ends_at=? AND ? > ends_at + CAST(json_extract(settings_json, '$.graceSeconds') AS INTEGER) * 1000 + 5000", t, t, row.id, row.ends_at, t)
        : q("UPDATE exams SET status='closed',closed_at=?,updated_at=? WHERE id=? AND status='running'", t, t, row.id),
      q("UPDATE exam_attempts SET submitted_at=? WHERE exam_id=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status='closed')", Math.min(at, t), row.id),
    ]);
    if (!out[0]?.meta?.changes && !automatic) fail('BAD_STATE');
  }

  async function control({ ownerAccountId, examId, action, minutes, force }) {
    let row = await ownExam(ownerAccountId, examId);
    const t = now();
    if (action === 'open') {
      if (row.status !== 'draft') fail('BAD_STATE');
      const out = await run("UPDATE exams SET status='open',updated_at=? WHERE id=? AND status='draft'", t, examId);
      if (!out.meta?.changes) fail('BAD_STATE');
    } else if (action === 'start') {
      if (row.status !== 'draft' && row.status !== 'open') fail('BAD_STATE');
      if (!force && (await missingKeys(row)).length) fail('KEY_MISSING');
      const out = await run("UPDATE exams SET status='running',started_at=?,ends_at=?,updated_at=? WHERE id=? AND status IN ('draft','open')", t, t + row.duration_min * 60000, t, examId);
      if (!out.meta?.changes) fail('BAD_STATE');
    } else if (action === 'extend') {
      if (row.status !== 'running') fail('BAD_STATE');
      const add = Math.max(1, Math.min(60, Math.round(Number(minutes) || 5)));
      const out = await run('UPDATE exams SET ends_at=ends_at+?,duration_min=duration_min+?,updated_at=? WHERE id=? AND status=\'running\'', add * 60000, add, t, examId);
      if (!out.meta?.changes) fail('BAD_STATE');
    } else if (action === 'close') {
      if (row.status !== 'running') fail('BAD_STATE');
      await closeRoom(row, t);
    } else fail('INVALID_ACTION');
    row = await examRow(examId);
    return getExam({ ownerAccountId, examId });
  }

  async function getAttempt({ ownerAccountId, examId, attemptId }) {
    const row = await ownExam(ownerAccountId, examId);
    const attempt = await one('SELECT * FROM exam_attempts WHERE id=? AND exam_id=?', attemptId, examId);
    if (!attempt) fail('NOT_FOUND');
    const answers = await all('SELECT qid,value_json,manual_score FROM exam_answers WHERE attempt_id=?', attemptId);
    const photos = await all("SELECT id,qid,bytes FROM exam_assets WHERE attempt_id=? AND kind='photo' ORDER BY created_at", attemptId);
    return {
      attempt: { id: attempt.id, name: attempt.name, mascot: attempt.mascot, tabLeaves: attempt.tab_leaves, submittedAt: attempt.submitted_at },
      exam: present(row, await imageSet(examId)),
      answers: Object.fromEntries(answers.map((a) => [a.qid, parse(a.value_json, null)])),
      manual: Object.fromEntries(answers.filter((a) => a.manual_score !== null).map((a) => [a.qid, a.manual_score])),
      photos,
    };
  }

  async function grade({ ownerAccountId, examId, attemptId, qid, score }) {
    const row = await ownExam(ownerAccountId, examId);
    const question = parse(row.questions_json, []).find((x) => x.id === qid);
    if (!question || question.type !== 'essay') fail('NOT_FOUND');
    if (!(await one('SELECT 1 AS x FROM exam_attempts WHERE id=? AND exam_id=?', attemptId, examId))) fail('NOT_FOUND');
    const value = score === null || score === '' ? null : Math.max(0, Math.min(question.points, Number(score)));
    if (value !== null && !Number.isFinite(value)) fail('INVALID_SCORE');
    await run(
      "INSERT INTO exam_answers(attempt_id,qid,value_json,seq,manual_score,updated_at) VALUES(?,?,'null',0,?,?) ON CONFLICT(attempt_id,qid) DO UPDATE SET manual_score=excluded.manual_score",
      attemptId, qid, value, now(),
    );
    return { ok: true, score: value };
  }

  async function releaseAttempt({ ownerAccountId, examId, attemptId }) {
    await ownExam(ownerAccountId, examId);
    await run('UPDATE exam_attempts SET token_hash=NULL WHERE id=? AND exam_id=?', attemptId, examId);
    return { ok: true };
  }

  async function reopenAttempt({ ownerAccountId, examId, attemptId }) {
    const row = await ownExam(ownerAccountId, examId);
    if (row.status !== 'running') fail('BAD_STATE');
    const out = await run("UPDATE exam_attempts SET submitted_at=NULL WHERE id=? AND exam_id=? AND EXISTS (SELECT 1 FROM exams WHERE id=? AND status='running')", attemptId, examId, examId);
    if (!out.meta?.changes) fail('BAD_STATE');
    return { ok: true };
  }

  async function teacherAsset({ ownerAccountId, examId, assetId, qid }) {
    await ownExam(ownerAccountId, examId);
    const asset = assetId
      ? await one('SELECT mime,data FROM exam_assets WHERE id=? AND exam_id=?', assetId, examId)
      : await one("SELECT mime,data FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question'", examId, qid);
    if (!asset) fail('NOT_FOUND');
    return asset;
  }

  /** Marks of every pupil and statistics for every question. */
  async function results({ ownerAccountId, examId }) {
    let row = await ownExam(ownerAccountId, examId);
    row = await settleClock(row);
    const questions = parse(row.questions_json, []);
    const attempts = await all('SELECT * FROM exam_attempts WHERE exam_id=? ORDER BY name_key', examId);
    const answerRows = await all('SELECT x.* FROM exam_answers x JOIN exam_attempts a ON a.id=x.attempt_id WHERE a.exam_id=?', examId);
    const photoRows = await all("SELECT attempt_id,qid,COUNT(*) AS n FROM exam_assets WHERE exam_id=? AND kind='photo' GROUP BY attempt_id,qid", examId);
    const byAttempt = new Map();
    for (const r of answerRows) {
      if (!byAttempt.has(r.attempt_id)) byAttempt.set(r.attempt_id, { answers: {}, manual: {} });
      const entry = byAttempt.get(r.attempt_id);
      entry.answers[r.qid] = parse(r.value_json, null);
      if (r.manual_score !== null) entry.manual[r.qid] = r.manual_score;
    }
    const photosBy = new Map();
    for (const p of photoRows) photosBy.set(p.attempt_id + ':' + p.qid, p.n);
    const rows = attempts.map((a) => {
      const entry = byAttempt.get(a.id) || { answers: {}, manual: {} };
      const score = scoreAttempt(questions, entry.answers, entry.manual);
      const essaysToMark = questions.filter((x) => x.type === 'essay' && entry.manual[x.id] === undefined && (isAnswered(x, entry.answers[x.id]) || photosBy.get(a.id + ':' + x.id))).length;
      return { id: a.id, name: a.name, mascot: a.mascot, tabLeaves: a.tab_leaves, submittedAt: a.submitted_at, answered: score.answered, total: score.total, max: score.max, sections: score.sections, essaysToMark, perQuestion: Object.fromEntries(Object.entries(score.perQuestion).map(([id, s]) => [id, { p: s.points, c: s.correct }])) };
    });
    const stats = {};
    for (const qs of questions) {
      const st = { answered: 0, correct: 0, wrong: 0, blank: 0, avg: 0, choices: {}, statements: [] };
      let sum = 0;
      for (const a of attempts) {
        const entry = byAttempt.get(a.id) || { answers: {}, manual: {} };
        const raw = entry.answers[qs.id];
        const sc = scoreAttempt([qs], { [qs.id]: raw }, { [qs.id]: entry.manual[qs.id] }).perQuestion[qs.id];
        if (!isAnswered(qs, raw)) st.blank++;
        else st.answered++;
        if (sc.correct === true) st.correct++;
        else if (sc.correct === false) st.wrong++;
        sum += sc.points;
        const clean = cleanAnswer(qs, raw);
        if (qs.type === 'mc' && clean) st.choices[clean] = (st.choices[clean] || 0) + 1;
        if (qs.type === 'tf' && clean && Array.isArray(qs.key)) clean.forEach((v, i) => { st.statements[i] = (st.statements[i] || 0) + (v === qs.key[i] ? 1 : 0); });
      }
      st.avg = attempts.length ? Math.round((sum / attempts.length) * 100) / 100 : 0;
      stats[qs.id] = st;
    }
    return { exam: present(row, await imageSet(examId)), rows, stats, serverNow: now() };
  }

  async function exportCsv({ ownerAccountId, examId }) {
    const data = await results({ ownerAccountId, examId });
    const questions = data.exam.questions;
    const sections = [...new Set(questions.map((x) => x.section))];
    const cell = (v) => {
      const text = String(v ?? '');
      const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const head = ['STT', 'Họ và tên', 'Đã làm', 'Số lần rời tab', 'Đã nộp', ...sections.map((s) => 'Phần ' + (s || '-')), 'Tổng điểm', 'Tối đa', ...questions.map((x) => (x.section ? x.section + '·' : '') + x.label)];
    const lines = [head.map(cell).join(',')];
    data.rows.forEach((r, i) => {
      lines.push([i + 1, r.name, r.answered + '/' + questions.length, r.tabLeaves, r.submittedAt ? 'x' : '', ...sections.map((s) => r.sections[s]?.points ?? 0), r.total, r.max, ...questions.map((x) => r.perQuestion[x.id]?.p ?? 0)].map(cell).join(','));
    });
    return '﻿' + lines.join('\r\n');
  }

  // --------------------------------------------------------------------------------------------------- the pupil
  async function attemptByToken(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) fail('AUTH_REQUIRED');
    const attempt = await one('SELECT * FROM exam_attempts WHERE token_hash=?', await sha256(token));
    if (!attempt) fail('AUTH_REQUIRED');
    return attempt;
  }

  async function join({ code, name, token, mascot }) {
    const exam = await one('SELECT * FROM exams WHERE code=?', String(code || '').trim().toUpperCase());
    if (!exam) fail('ROOM_NOT_FOUND');
    if (exam.status === 'draft') fail('EXAM_NOT_OPEN');
    const clean = normalizeName(name);
    const key = nameKey(clean);
    const t = now();
    const faceId = Math.max(0, Math.min(7, Math.round(Number(mascot) || 0)));
    const existing = await one('SELECT * FROM exam_attempts WHERE exam_id=? AND name_key=?', exam.id, key);
    if (existing) {
      const mine = token && existing.token_hash && (await sha256(token)) === existing.token_hash;
      if (mine) {
        await run('UPDATE exam_attempts SET last_seen_at=? WHERE id=?', t, existing.id);
        return { token, attemptId: existing.id, resumed: true };
      }
      if (existing.token_hash) fail('NAME_TAKEN');
      const fresh = newToken();
      await run('UPDATE exam_attempts SET token_hash=?,last_seen_at=? WHERE id=?', await sha256(fresh), t, existing.id);
      return { token: fresh, attemptId: existing.id, resumed: true };
    }
    if (exam.status === 'closed') fail('EXAM_CLOSED');
    if (exam.status === 'running' && parse(exam.settings_json, {}).allowLateJoin === false) fail('EXAM_LOCKED');
    const fresh = newToken();
    const id = crypto.randomUUID();
    try {
      await run('INSERT INTO exam_attempts(id,exam_id,name,name_key,token_hash,mascot,joined_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?)', id, exam.id, clean, key, await sha256(fresh), faceId, t, t);
    } catch (error) {
      if (/UNIQUE|constraint/i.test(String(error?.message))) fail('NAME_TAKEN');
      throw error;
    }
    return { token: fresh, attemptId: id, resumed: false };
  }

  const publicQuestion = (qs, hasImage) => ({
    id: qs.id,
    section: qs.section,
    label: qs.label,
    type: qs.type,
    points: qs.points,
    options: qs.options,
    statements: qs.statements,
    hasImage,
    ...(hasImage ? {} : { text: qs.text }),
  });

  async function getState({ token }) {
    const attempt = await attemptByToken(token);
    let exam = await examRow(attempt.exam_id);
    exam = await settleClock(exam);
    const fresh = await one('SELECT * FROM exam_attempts WHERE id=?', attempt.id);
    const t = now();
    await run('UPDATE exam_attempts SET last_seen_at=? WHERE id=?', t, attempt.id);
    const settings = parse(exam.settings_json, {});
    const questions = parse(exam.questions_json, []);
    const base = {
      serverNow: t,
      exam: { title: exam.title, code: exam.code, status: exam.status, durationMin: exam.duration_min, startedAt: exam.started_at, endsAt: exam.ends_at, graceSeconds: settings.graceSeconds, questionCount: questions.length, sections: [...new Set(questions.map((x) => x.section))].map((s) => ({ section: s, count: questions.filter((x) => x.section === s).length })) },
      attempt: { id: fresh.id, name: fresh.name, mascot: fresh.mascot, submittedAt: fresh.submitted_at },
    };
    if (exam.status === 'open' || exam.status === 'draft') return { ...base, questions: [], answers: {}, photos: {} };
    const answers = await all('SELECT qid,value_json FROM exam_answers WHERE attempt_id=?', attempt.id);
    const photos = await all("SELECT id,qid FROM exam_assets WHERE attempt_id=? AND kind='photo' ORDER BY created_at", attempt.id);
    const photoMap = {};
    for (const p of photos) (photoMap[p.qid] ||= []).push(p.id);
    const out = { ...base, answers: Object.fromEntries(answers.filter((a) => a.value_json !== 'null').map((a) => [a.qid, parse(a.value_json, null)])), photos: photoMap };
    if (fresh.submitted_at || exam.status === 'closed') {
      // after the end the pupil sees a mark only if the teacher allowed it; the questions are no longer sent
      const entry = { answers: out.answers };
      const manual = Object.fromEntries((await all('SELECT qid,manual_score FROM exam_answers WHERE attempt_id=? AND manual_score IS NOT NULL', attempt.id)).map((r) => [r.qid, r.manual_score]));
      const score = scoreAttempt(questions, entry.answers, manual);
      const marked = questions.every((x) => x.type !== 'essay') || Object.keys(manual).length >= questions.filter((x) => x.type === 'essay').length;
      return { ...base, questions: [], answers: out.answers, photos: photoMap, finished: true, result: settings.showResult === 'score' ? { total: score.total, max: score.max, answered: score.answered, count: score.count, sections: score.sections, essaysPending: !marked } : null };
    }
    const withImage = await imageSet(exam.id);
    return { ...out, questions: questions.map((x) => publicQuestion(x, withImage.has(x.id))), finished: false };
  }

  async function activeAttempt(token) {
    const attempt = await attemptByToken(token);
    const exam = await examRow(attempt.exam_id);
    const settings = parse(exam.settings_json, {});
    const t = now();
    if (exam.status !== 'running') fail(exam.status === 'closed' ? 'EXAM_ENDED' : 'EXAM_NOT_STARTED');
    if (t > exam.ends_at + settings.graceSeconds * 1000) fail('EXAM_ENDED');
    if (attempt.submitted_at) fail('ALREADY_SUBMITTED');
    return { attempt, exam, settings, questions: parse(exam.questions_json, []), t };
  }

  async function writeState(attemptId, t, tokenHash) {
    const row = await one('SELECT a.submitted_at,a.token_hash,e.status,e.ends_at,e.settings_json FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=?', attemptId);
    if (row?.token_hash !== tokenHash) fail('AUTH_REQUIRED');
    if (!row || row.submitted_at || row.status === 'closed' || row.status !== 'running' || t > row.ends_at + parse(row.settings_json, {}).graceSeconds * 1000) fail(row?.submitted_at ? 'ALREADY_SUBMITTED' : 'EXAM_ENDED');
    return row;
  }

  const serverSeq = (requested, t) => Math.min(Math.floor(t / 1000), Math.max(0, Math.min(2_000_000_000, Math.round(Number(requested) || 0))));

  async function saveAnswer({ token, qid, value, seq }) {
    const { attempt, questions, t } = await activeAttempt(token);
    const question = questions.find((x) => x.id === qid);
    if (!question) fail('NOT_FOUND');
    if (question.type === 'essay' && JSON.stringify(value ?? null).length > MAX_ANSWER_BYTES) fail('ANSWER_TOO_LARGE');
    const clean = cleanAnswer(question, value);
    const nextSeq = serverSeq(seq, t);
    const active = 'EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status=\'running\' AND ? <= e.ends_at + CAST(json_extract(e.settings_json, \'$.graceSeconds\') AS INTEGER) * 1000)';
    const result = clean === null
      ? await run(`INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?, 'null',?,? WHERE ${active} ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json='null',seq=excluded.seq,updated_at=excluded.updated_at WHERE excluded.seq>exam_answers.seq OR (excluded.seq=exam_answers.seq AND excluded.value_json=exam_answers.value_json)`, attempt.id, qid, nextSeq, t, attempt.id, attempt.token_hash, t)
      : await run(`INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?,?,?,? WHERE ${active} ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json=excluded.value_json,seq=excluded.seq,updated_at=excluded.updated_at WHERE excluded.seq>exam_answers.seq OR (excluded.seq=exam_answers.seq AND excluded.value_json=exam_answers.value_json)`, attempt.id, qid, JSON.stringify(clean), nextSeq, t, attempt.id, attempt.token_hash, t);
    await writeState(attempt.id, t, attempt.token_hash);
    await run('UPDATE exam_attempts SET last_seen_at=? WHERE id=? AND submitted_at IS NULL', t, attempt.id);
    return { ok: true, savedAt: t, stale: !result.meta?.changes };
  }

  async function submit({ token, answers }) {
    const { attempt, questions, t } = await activeAttempt(token);
    const statements = [];
    if (answers && typeof answers === 'object') {
      for (const question of questions) {
        if (!(question.id in answers)) continue;
        const clean = cleanAnswer(question, answers[question.id]);
        statements.push(q(
          'INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status=\'running\' AND ? <= e.ends_at + CAST(json_extract(e.settings_json, \'$.graceSeconds\') AS INTEGER) * 1000) ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json=excluded.value_json,seq=excluded.seq,updated_at=excluded.updated_at',
          attempt.id, question.id, JSON.stringify(clean), Math.floor(t / 1000), t, attempt.id, attempt.token_hash, t,
        ));
      }
    }
    statements.push(q("UPDATE exam_attempts SET submitted_at=?,last_seen_at=? WHERE id=? AND token_hash=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status='running' AND ? <= e.ends_at + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000)", t, t, attempt.id, attempt.token_hash, t));
    const out = await db.batch(statements);
    if (!out.at(-1)?.meta?.changes) {
      await writeState(attempt.id, now(), attempt.token_hash);
      fail('EXAM_ENDED');
    }
    return getState({ token });
  }

  async function tabLeave({ token }) {
    const attempt = await attemptByToken(token);
    await run('UPDATE exam_attempts SET tab_leaves=tab_leaves+1,last_seen_at=? WHERE id=?', now(), attempt.id);
    return { ok: true };
  }

  async function chooseMascot({ token, mascot }) {
    const attempt = await attemptByToken(token);
    const exam = await examRow(attempt.exam_id);
    if (exam.status === 'running' || exam.status === 'closed') fail('MASCOT_LOCKED');
    await run('UPDATE exam_attempts SET mascot=? WHERE id=?', Math.max(0, Math.min(7, Math.round(Number(mascot) || 0))), attempt.id);
    return { ok: true };
  }

  async function savePhoto({ token, qid, mime, data }) {
    const { attempt, exam, questions, t } = await activeAttempt(token);
    const question = questions.find((x) => x.id === qid);
    if (!question || question.type !== 'essay') fail('NOT_FOUND');
    const { bytes } = checkImage(mime, data, LIMITS.photoBase64);
    const id = crypto.randomUUID();
    const result = await run("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) SELECT ?,?,?,?,'photo',?,?,?,? WHERE EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000) AND (SELECT COUNT(*) FROM exam_assets WHERE attempt_id=? AND kind='photo') < ?", id, exam.id, attempt.id, qid, mime, data, bytes, t, attempt.id, attempt.token_hash, t, attempt.id, LIMITS.photosPerAttempt);
    if (!result.meta?.changes) {
      const count = await one("SELECT COUNT(*) AS n FROM exam_assets WHERE attempt_id=? AND kind='photo'", attempt.id);
      if (count.n >= LIMITS.photosPerAttempt) fail('TOO_MANY_PHOTOS');
      await writeState(attempt.id, t, attempt.token_hash);
      fail('EXAM_ENDED');
    }
    return { id };
  }

  async function deletePhoto({ token, id }) {
    const { attempt, t } = await activeAttempt(token);
    const result = await run("DELETE FROM exam_assets WHERE id=? AND attempt_id=? AND kind='photo' AND EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000)", id, attempt.id, attempt.id, attempt.token_hash, t);
    if (!result.meta?.changes) await writeState(attempt.id, t, attempt.token_hash);
    return { ok: true };
  }

  async function pupilAsset({ token, qid, photoId }) {
    const attempt = await attemptByToken(token);
    const exam = await examRow(attempt.exam_id);
    if (photoId) {
      const photo = await one("SELECT mime,data FROM exam_assets WHERE id=? AND attempt_id=? AND kind='photo'", photoId, attempt.id);
      if (!photo) fail('NOT_FOUND');
      return photo;
    }
    if (exam.status !== 'running') fail('EXAM_NOT_STARTED');
    if (attempt.submitted_at) fail('ALREADY_SUBMITTED');
    const image = await one("SELECT mime,data FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question'", exam.id, qid);
    if (!image) fail('NOT_FOUND');
    return image;
  }

  return {
    createExam, updateExam, listExams, saveQuestionImage, removeQuestionImage, getExam, control, getAttempt, grade, releaseAttempt, reopenAttempt, teacherAsset, results, exportCsv,
    join, getState, saveAnswer, submit, tabLeave, chooseMascot, savePhoto, deletePhoto, pupilAsset,
    STATUSES,
  };
}
