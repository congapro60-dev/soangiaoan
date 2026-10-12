// Exam rooms ("Phòng kiểm tra"): the teacher publishes an exam, pupils join with a code and answer, every answer is
// saved on the server the moment it changes, and the teacher watches, marks essays and exports the marks.
//
// Rules that matter for an exam:
//  - Answer keys and solutions reach pupils only after closure when review is enabled.
//  - Every answer is its own row (an upsert), so two requests can never overwrite each other's answers.
//  - The clock is the server's: the room has one start time and one end time; answers are refused a little after it.
//  - A pupil who closes the page can come back with the same device (token) or, if the teacher releases the name,
//    from another device.
import { cleanAnswer, scoreAttempt, isAnswered } from './scoring.js';
import { normalizeExamInput, normalizeName, nameKey, checkImage, LIMITS } from './validate.js';
import { readExamCodes, buildView, viewQuestion, toCanonicalAnswer, toDisplayAnswer } from './shuffle.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ANSWER_BYTES = 6000;
const STATUSES = ['draft', 'open', 'running', 'closed'];
const REVIEW_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_GUARD = "a.token_hash IS NOT NULL AND a.review_pin_hash IS NOT NULL AND a.submitted_at IS NOT NULL AND e.status='closed' AND COALESCE(json_extract(e.settings_json,'$.review'),'after_close')!='none'";
const INTEGRITY_GUARD = "(COALESCE(json_extract(e.settings_json,'$.integrityPolicyVersion'),0)!=1 OR (json_extract(a.view_json,'$.integrity.version')=1 AND json_type(a.view_json,'$.integrity.confirmedAt')='integer' AND json_extract(a.view_json,'$.integrity.confirmedAt')>=0 AND json_type(a.view_json,'$.integrity.usedAI') IN ('true','false')))";
const personalEnd = (exam, attempt) => exam.ends_at === null ? null : exam.ends_at + (attempt.extra_minutes || 0) * 60000;
const graceMs = (exam) => (parse(exam.settings_json, {}).graceSeconds || 0) * 1000;
const integrityRecord = (view) => view?.integrity?.version === 1 && Number.isSafeInteger(view.integrity.confirmedAt) && view.integrity.confirmedAt >= 0 && typeof view.integrity.usedAI === 'boolean' ? view.integrity : null;
const integrityState = (settings, view) => ({ required: settings.integrityPolicyVersion === 1, confirmed: Boolean(integrityRecord(view)), ...(integrityRecord(view) ? { usedAI: view.integrity.usedAI, confirmedAt: view.integrity.confirmedAt } : {}) });

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
  const codesOf = (row) => readExamCodes(parse(row.questions_json, []));
  const questionsOf = (row) => codesOf(row).flatMap((entry) => entry.questions);
  const selectedCode = (row, attempt) => codesOf(row).find((entry) => entry.code === attempt.exam_code) || (!attempt.shuffle_seed ? codesOf(row)[0] : null);
  const contentOf = (clean) => clean.codes ? { codes: clean.codes } : clean.questions;
  const ownExam = async (owner, id) => {
    if (!owner) fail('AUTH_REQUIRED');
    const row = await one('SELECT * FROM exams WHERE id=? AND owner_account_id=?', id, owner);
    if (!row) fail('NOT_FOUND');
    return row;
  };

  const present = (row, imageIds = null, solutions = {}) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    durationMin: row.duration_min,
    settings: { ...parse(row.settings_json, {}), review: parse(row.settings_json, {}).review === 'none' ? 'none' : 'after_close' },
    startedAt: row.started_at,
    endsAt: row.ends_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    codes: codesOf(row).map((entry) => ({ ...entry, questions: entry.questions.map((qs) => ({ ...qs, ...(imageIds ? { hasImage: imageIds.has(qs.id) } : {}), solutionImages: solutions[qs.id] || [] })) })),
    questions: (codesOf(row)[0]?.questions || []).map((qs) => ({ ...qs, ...(imageIds ? { hasImage: imageIds.has(qs.id) } : {}), solutionImages: solutions[qs.id] || [] })),
  });

  async function imageSet(examId) {
    return new Set((await all("SELECT DISTINCT qid FROM exam_assets WHERE exam_id=? AND kind='question'", examId)).map((r) => r.qid));
  }

  async function solutionImages(examId) {
    const byQuestion = {};
    for (const asset of await all("SELECT id,qid,bytes FROM exam_assets WHERE exam_id=? AND kind='solution' ORDER BY created_at,rowid", examId)) {
      (byQuestion[asset.qid] ||= []).push({ id: asset.id, bytes: asset.bytes });
    }
    return byQuestion;
  }

  async function fullExam(row) {
    const full = present(row, await imageSet(row.id), await solutionImages(row.id));
    const assets = await all("SELECT id,qid,kind,bytes FROM exam_assets WHERE exam_id=? AND kind!='photo' AND kind!='solution' ORDER BY created_at,rowid", row.id);
    for (const code of full.codes) for (const question of code.questions) {
      question.questionImages = assets.filter((a) => a.qid === question.id && a.kind === 'question').map((a) => ({ id: a.id, bytes: a.bytes }));
      for (const [kind, field] of [['option', 'choiceImages'], ['statement', 'statementImages']]) {
        const images = assets.filter((a) => a.qid === question.id && a.kind.startsWith(kind + ':'));
        if (images.length) question[field] = Object.fromEntries(images.map((a) => [a.kind.split(':')[1], a.id]));
      }
    }
    full.questions = full.codes[0]?.questions || [];
    return full;
  }

  async function attemptView(row, attempt, persist = true) {
    const selected = selectedCode(row, attempt);
    if (!selected) return null;
    if (attempt.view_json) return parse(attempt.view_json, buildView(selected.questions, {}, ''));
    const questions = (await fullExam(row)).codes.find((entry) => entry.code === selected.code).questions;
    const view = buildView(questions, attempt.shuffle_seed ? parse(row.settings_json, {}) : {}, attempt.shuffle_seed || '');
    if (attempt.shuffle_seed && persist) {
      await run('UPDATE exam_attempts SET view_json=? WHERE id=? AND view_json IS NULL', JSON.stringify(view), attempt.id);
      return parse((await one('SELECT view_json FROM exam_attempts WHERE id=?', attempt.id)).view_json, view);
    }
    return view;
  }

  // --------------------------------------------------------------------------------------------------- the teacher
  async function createExam({ ownerAccountId, requestId, input }) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId || '')) fail('INVALID_REQUEST_ID');
    const clean = normalizeExamInput({ ...input, settings: { ...input?.settings, integrityPolicyVersion: 1 } });
    const again = await one('SELECT * FROM exams WHERE owner_account_id=? AND request_id=?', ownerAccountId, requestId);
    if (again) return { exam: present(again, await imageSet(again.id), await solutionImages(again.id)) };
    const id = crypto.randomUUID();
    const t = now();
    for (let tries = 0; tries < 8; tries++) {
      const code = newCode();
      try {
        await run(
          'INSERT INTO exams(id,owner_account_id,code,title,status,duration_min,settings_json,questions_json,request_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          id, ownerAccountId, code, clean.title, 'draft', clean.durationMin, JSON.stringify(clean.settings), JSON.stringify(contentOf(clean)), requestId, t, t,
        );
        return { exam: present(await examRow(id), new Set()) };
      } catch (error) {
        if (!/UNIQUE|constraint/i.test(String(error?.message))) throw error;
        const raced = await one('SELECT * FROM exams WHERE owner_account_id=? AND request_id=?', ownerAccountId, requestId);
        if (raced) return { exam: present(raced, await imageSet(raced.id), await solutionImages(raced.id)) };
      }
    }
    return fail('CODE_UNAVAILABLE');
  }

  async function updateExam({ ownerAccountId, examId, input }) {
    const row = await ownExam(ownerAccountId, examId);
    const current = parse(row.questions_json, []);
    const supplied = input.codes !== undefined ? { codes: input.codes } : input.questions !== undefined ? { questions: input.questions } : Array.isArray(current) ? { questions: current } : current;
    const clean = normalizeExamInput({ title: input.title ?? row.title, durationMin: input.durationMin ?? row.duration_min, settings: { ...parse(row.settings_json, {}), ...(input.settings || {}), integrityPolicyVersion: parse(row.settings_json, {}).integrityPolicyVersion === 1 ? 1 : 0 }, ...supplied });
    const nextContent = contentOf(clean);
    const oldClean = normalizeExamInput({ title: row.title, durationMin: row.duration_min, settings: parse(row.settings_json, {}), ...(Array.isArray(current) ? { questions: current } : current) });
    const structure = (question) => Object.fromEntries(Object.entries(question).filter(([field]) => !['key', 'points', 'rubric', 'solution', 'solutionImages', 'questionImages', 'choiceImages', 'statementImages', 'hasImage'].includes(field)));
    const oldQuestions = readExamCodes(contentOf(oldClean)).flatMap((entry) => entry.questions);
    const newQuestions = readExamCodes(nextContent).flatMap((entry) => entry.questions);
    const changed = JSON.stringify(oldQuestions.map(structure)) !== JSON.stringify(newQuestions.map(structure));
    const locked = row.status === 'running' || row.status === 'closed' || Boolean(await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId));
    if (locked && changed) fail('QUESTIONS_LOCKED');
    const update = q(
      "UPDATE exams SET title=?,duration_min=?,settings_json=?,questions_json=?,updated_at=? WHERE id=? AND questions_json=? AND (?=0 OR (status IN ('draft','open') AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=?)))",
      clean.title, clean.durationMin, JSON.stringify(clean.settings), JSON.stringify(nextContent), now(), examId, row.questions_json, changed ? 1 : 0, examId,
    );
    const convertingLegacy = Array.isArray(current) && clean.codes;
    let out;
    if (convertingLegacy) {
      const remaps = current.map((question, index) => q('UPDATE exam_assets SET qid=? WHERE exam_id=? AND qid=? AND EXISTS (SELECT 1 FROM exams WHERE id=? AND questions_json=?)', clean.codes[0].code + '_q' + (index + 1), examId, question.id, examId, JSON.stringify(nextContent)));
      [out] = await db.batch([update, ...remaps]);
    } else out = await update.run();
    if (!out.meta?.changes) fail(changed ? 'QUESTIONS_LOCKED' : 'BAD_STATE');
    return getExam({ ownerAccountId, examId });
  }

  async function duplicateCode({ ownerAccountId, examId, sourceCode, newCode }) {
    const row = await ownExam(ownerAccountId, examId);
    const codes = codesOf(row);
    const legacy = codes.length === 1 && codes[0].code === null;
    const source = legacy && (!sourceCode || sourceCode === '101') ? codes[0] : codes.find((entry) => entry.code === sourceCode);
    if (!source) fail('NOT_FOUND');
    if (!/^\d{3}$/.test(newCode || '') || codes.length >= 8 || codes.some((entry) => entry.code === newCode) || (legacy && newCode === '101')) fail('INVALID_EXAM');
    if (row.status === 'running' || row.status === 'closed' || await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId)) fail('QUESTIONS_LOCKED');
    const normalized = normalizeExamInput({ title: row.title, durationMin: row.duration_min, settings: { ...parse(row.settings_json, {}), integrityPolicyVersion: parse(row.settings_json, {}).integrityPolicyVersion === 1 ? 1 : 0 }, codes: [...codes.map((entry) => ({ ...entry, code: entry.code || '101' })), { ...source, code: newCode }] });
    const next = JSON.stringify(contentOf(normalized));
    const sourceAssets = await all("SELECT * FROM exam_assets WHERE exam_id=? AND attempt_id IS NULL", examId);
    const statements = [q("UPDATE exams SET questions_json=?,updated_at=? WHERE id=? AND questions_json=? AND status IN ('draft','open') AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=?)", next, now(), examId, row.questions_json, examId)];
    for (let index = 0; index < source.questions.length; index++) {
      const originalQid = source.questions[index].id;
      const targetQid = newCode + '_q' + (index + 1);
      for (const asset of sourceAssets.filter((asset) => asset.qid === originalQid)) statements.push(q('INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) SELECT ?,?,NULL,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM exams WHERE id=? AND questions_json=?)', crypto.randomUUID(), examId, targetQid, asset.kind, asset.mime, asset.data, asset.bytes, now(), examId, next));
      if (legacy) statements.push(q('UPDATE exam_assets SET qid=? WHERE exam_id=? AND qid=? AND EXISTS (SELECT 1 FROM exams WHERE id=? AND questions_json=?)', '101_q' + (index + 1), examId, originalQid, examId, next));
    }
    const out = await db.batch(statements);
    if (!out[0]?.meta?.changes) fail('QUESTIONS_LOCKED');
    return getExam({ ownerAccountId, examId });
  }

  async function listExams(ownerAccountId) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    const rows = await all(
      'SELECT e.*, (SELECT COUNT(*) FROM exam_attempts a WHERE a.exam_id=e.id) AS attempts FROM exams e WHERE e.owner_account_id=? ORDER BY e.created_at DESC LIMIT 50',
      ownerAccountId,
    );
    return { exams: rows.map((r) => ({ id: r.id, code: r.code, title: r.title, status: r.status, durationMin: r.duration_min, attempts: r.attempts, createdAt: r.created_at, startedAt: r.started_at, endsAt: r.ends_at, questionCount: codesOf(r)[0]?.questions.length || 0, codeCount: codesOf(r).length })) };
  }

  async function saveQuestionImage({ ownerAccountId, examId, qid, mime, data, assetId }) {
    const row = await ownExam(ownerAccountId, examId);
    if (!questionsOf(row).some((x) => x.id === qid)) fail('NOT_FOUND');
    const { bytes } = checkImage(mime, data, LIMITS.imageBase64);
    if (assetId !== undefined && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(assetId)) fail('INVALID_BODY');
    if (row.status === 'running' || row.status === 'closed' || await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId)) fail('QUESTIONS_LOCKED');
    const t = now();
    const id = assetId || crypto.randomUUID();
    const unlocked = "NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=?) AND EXISTS (SELECT 1 FROM exams WHERE id=? AND status IN ('draft','open'))";
    await db.batch([
      ...(!assetId ? [q(`DELETE FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question' AND ${unlocked}`, examId, qid, examId, examId)] : []),
      q(`INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) SELECT ?,?,NULL,?,'question',?,?,?,? WHERE ${unlocked} ON CONFLICT(id) DO NOTHING`, id, examId, qid, mime, data, bytes, t, examId, examId),
    ]);
    if (!await one("SELECT id FROM exam_assets WHERE id=? AND exam_id=? AND qid=? AND kind='question'", id, examId, qid)) fail('QUESTIONS_LOCKED');
    return { ok: true, id };
  }

  async function removeQuestionImage({ ownerAccountId, examId, qid }) {
    const row = await ownExam(ownerAccountId, examId);
    if (row.status === 'running' || row.status === 'closed' || await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId)) fail('QUESTIONS_LOCKED');
    await run("DELETE FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question' AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=?)", examId, qid, examId);
    return { ok: true };
  }

  async function saveItemImage({ ownerAccountId, examId, qid, itemKind, letter, mime, data, assetId }) {
    const row = await ownExam(ownerAccountId, examId);
    const question = questionsOf(row).find((question) => question.id === qid);
    const letters = itemKind === 'option' && question?.type === 'mc' ? question.options : itemKind === 'statement' && question?.type === 'tf' ? question.statements : [];
    if (!letters.includes(letter)) fail('NOT_FOUND');
    if (row.status === 'running' || row.status === 'closed' || await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? LIMIT 1', examId)) fail('QUESTIONS_LOCKED');
    if (assetId !== undefined && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(assetId)) fail('INVALID_BODY');
    const { bytes } = checkImage(mime, data, LIMITS.imageBase64);
    const kind = itemKind + ':' + letter;
    const id = assetId || crypto.randomUUID();
    await db.batch([
      q("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) SELECT ?,?,NULL,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=?) AND EXISTS (SELECT 1 FROM exams WHERE id=? AND status IN ('draft','open')) ON CONFLICT(id) DO NOTHING", id, examId, qid, kind, mime, data, bytes, now(), examId, examId),
      q('DELETE FROM exam_assets WHERE exam_id=? AND qid=? AND kind=? AND id!=? AND EXISTS (SELECT 1 FROM exam_assets WHERE id=? AND exam_id=? AND qid=? AND kind=?)', examId, qid, kind, id, id, examId, qid, kind),
    ]);
    if (!await one('SELECT id FROM exam_assets WHERE id=? AND exam_id=? AND qid=? AND kind=?', id, examId, qid, kind)) fail('NOT_FOUND');
    return { id };
  }

  async function saveSolutionImage({ ownerAccountId, examId, qid, mime, data, assetId }) {
    const row = await ownExam(ownerAccountId, examId);
    if (!questionsOf(row).some((x) => x.id === qid)) fail('NOT_FOUND');
    if (assetId !== undefined && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(assetId)) fail('INVALID_BODY');
    const { bytes } = checkImage(mime, data, LIMITS.imageBase64);
    const id = assetId ?? crypto.randomUUID();
    await run("INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) VALUES(?,?,NULL,?,'solution',?,?,?,?) ON CONFLICT(id) DO NOTHING", id, examId, qid, mime, data, bytes, now());
    if (!await one("SELECT id FROM exam_assets WHERE id=? AND exam_id=? AND qid=? AND kind='solution'", id, examId, qid)) fail('NOT_FOUND');
    return { id };
  }

  async function removeSolutionImage({ ownerAccountId, examId, assetId }) {
    await ownExam(ownerAccountId, examId);
    await run("DELETE FROM exam_assets WHERE id=? AND exam_id=? AND kind='solution'", assetId, examId);
    return { ok: true };
  }

  async function missingKeys(row) {
    return questionsOf(row).filter((x) => x.type !== 'essay' && (x.key === null || x.key === undefined)).map((x) => x.id);
  }

  async function getExam({ ownerAccountId, examId }) {
    let row = await ownExam(ownerAccountId, examId);
    row = await settleClock(row);
    const exam = await fullExam(row);
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
        examCode: a.exam_code,
        answered: byId.get(a.id) || 0,
        photos: photoBy.get(a.id) || 0,
        tabLeaves: a.tab_leaves,
        joinedAt: a.joined_at,
        lastSeenAt: a.last_seen_at,
        submittedAt: a.submitted_at,
        claimed: Boolean(a.token_hash),
        endsAt: personalEnd(row, a),
        extraMinutes: a.extra_minutes,
        textScale: a.text_scale,
        accommodationRevision: a.accommodation_revision,
      })),
    };
  }

  // Each pupil is sealed on their own clock; early finishers cannot review keys while others still work.
  async function settleClock(row) {
    if (row.status === 'running' && row.ends_at && now() > row.ends_at + graceMs(row)) {
      await closeRoom(row, row.ends_at, true);
      return examRow(row.id);
    }
    return row;
  }

  async function closeRoom(row, at, automatic = false) {
    const t = now();
    const out = await db.batch([
      automatic
        ? q("UPDATE exams SET status='closed',closed_at=?,updated_at=? WHERE id=? AND status='running' AND ? > ends_at+COALESCE(CAST(json_extract(settings_json,'$.graceSeconds') AS INTEGER),0)*1000+5000 AND NOT EXISTS (SELECT 1 FROM exam_attempts a WHERE a.exam_id=exams.id AND a.submitted_at IS NULL AND ? <= exams.ends_at+a.extra_minutes*60000+COALESCE(CAST(json_extract(exams.settings_json,'$.graceSeconds') AS INTEGER),0)*1000+5000)", t, t, row.id, t, t)
        : q("UPDATE exams SET status='closed',closed_at=?,updated_at=? WHERE id=? AND status='running'", t, t, row.id),
      automatic
        ? q("UPDATE exam_attempts SET submitted_at=(SELECT e.ends_at+exam_attempts.extra_minutes*60000 FROM exams e WHERE e.id=exam_attempts.exam_id) WHERE exam_id=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status IN ('running','closed') AND ? > e.ends_at+exam_attempts.extra_minutes*60000+COALESCE(CAST(json_extract(e.settings_json,'$.graceSeconds') AS INTEGER),0)*1000)", row.id, t)
        : q("UPDATE exam_attempts SET submitted_at=? WHERE exam_id=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status='closed')", Math.min(at, t), row.id),
    ]);
    if (!out[0]?.meta?.changes && !automatic) fail('BAD_STATE');
  }

  async function setAccommodation({ ownerAccountId, examId, attemptId, expectedRevision, extraMinutes, textScale }) {
    const row = await ownExam(ownerAccountId, examId);
    // ponytail: at most 60 extra minutes and five readable scales; widen these bounds with a reviewed school policy.
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !Number.isSafeInteger(extraMinutes) || extraMinutes < 0 || extraMinutes > 60 || ![1, 1.25, 1.5, 1.75, 2].includes(textScale)) fail('INVALID_BODY');
    const attempt = await one('SELECT * FROM exam_attempts WHERE id=? AND exam_id=?', attemptId, examId);
    if (!attempt) fail('NOT_FOUND');
    const t = now();
    if (row.status === 'closed' || attempt.submitted_at !== null || (row.status === 'running' && t > personalEnd(row, attempt) + graceMs(row))) fail('BAD_STATE');
    const out = await run("UPDATE exam_attempts SET extra_minutes=?,text_scale=?,accommodation_revision=accommodation_revision+1 WHERE id=? AND exam_id=? AND accommodation_revision=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.owner_account_id=? AND (e.status IN ('draft','open') OR (e.status='running' AND ? <= e.ends_at+exam_attempts.extra_minutes*60000+COALESCE(CAST(json_extract(e.settings_json,'$.graceSeconds') AS INTEGER),0)*1000)))", extraMinutes, textScale, attemptId, examId, expectedRevision, ownerAccountId, t);
    if (!out.meta?.changes) {
      const fresh = await one('SELECT a.*,e.status,e.ends_at,e.settings_json FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.exam_id=? AND e.owner_account_id=?', attemptId, examId, ownerAccountId);
      if (!fresh || fresh.status === 'closed' || fresh.submitted_at !== null || (fresh.status === 'running' && t > personalEnd(fresh, fresh) + graceMs(fresh))) fail('BAD_STATE');
      if (fresh.accommodation_revision !== expectedRevision + 1 || fresh.extra_minutes !== extraMinutes || fresh.text_scale !== textScale) fail('ACCOMMODATION_CHANGED');
    }
    return getExam({ ownerAccountId, examId });
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
      if (parse(row.settings_json, {}).assignment === 'manual' && codesOf(row)[0]?.code && await one('SELECT 1 AS x FROM exam_attempts WHERE exam_id=? AND exam_code IS NULL LIMIT 1', examId)) fail('BAD_STATE');
      if (!force && (await missingKeys(row)).length) fail('KEY_MISSING');
      const out = await run("UPDATE exams SET status='running',started_at=?,ends_at=?,updated_at=? WHERE id=? AND status IN ('draft','open') AND (?=0 OR NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id=? AND exam_code IS NULL))", t, t + row.duration_min * 60000, t, examId, parse(row.settings_json, {}).assignment === 'manual' && codesOf(row)[0]?.code ? 1 : 0, examId);
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
    const code = selectedCode(row, attempt);
    const full = await fullExam(row);
    const selected = full.codes.find((entry) => entry.code === code?.code);
    const view = parse(attempt.view_json, buildView(code?.questions || [], {}, ''));
    const answers = await all('SELECT qid,value_json,manual_score,manual_comment FROM exam_answers WHERE attempt_id=?', attemptId);
    const photos = await all("SELECT id,qid,bytes FROM exam_assets WHERE attempt_id=? AND kind='photo' ORDER BY created_at", attemptId);
    return {
      attempt: { id: attempt.id, name: attempt.name, mascot: attempt.mascot, examCode: attempt.exam_code, tabLeaves: attempt.tab_leaves, submittedAt: attempt.submitted_at, integrity: integrityState(parse(row.settings_json, {}), view) },
      exam: { ...full, questions: selected?.questions || [], examCode: attempt.exam_code },
      displayLabels: view.labels,
      answers: Object.fromEntries(answers.map((a) => [a.qid, parse(a.value_json, null)])),
      manual: Object.fromEntries(answers.filter((a) => a.manual_score !== null).map((a) => [a.qid, a.manual_score])),
      comments: Object.fromEntries(answers.filter((a) => a.manual_comment !== null).map((a) => [a.qid, a.manual_comment])),
      photos,
    };
  }

  async function grade({ ownerAccountId, examId, attemptId, qid, score, comment }) {
    const row = await ownExam(ownerAccountId, examId);
    const attempt = await one('SELECT * FROM exam_attempts WHERE id=? AND exam_id=?', attemptId, examId);
    if (!attempt) fail('NOT_FOUND');
    const question = selectedCode(row, attempt)?.questions.find((x) => x.id === qid);
    if (!question || question.type !== 'essay') fail('NOT_FOUND');
    const value = score === null || score === '' ? null : Math.max(0, Math.min(question.points, Number(score)));
    if (value !== null && !Number.isFinite(value)) fail('INVALID_SCORE');
    if (comment !== undefined && comment !== null && typeof comment !== 'string') fail('INVALID_BODY');
    const cleanComment = comment === undefined ? null : String(comment ?? '').normalize('NFC').replace(/\u0000/g, '').slice(0, LIMITS.comment);
    await run(
      "INSERT INTO exam_answers(attempt_id,qid,value_json,seq,manual_score,manual_comment,updated_at) VALUES(?,?,'null',0,?,?,?) ON CONFLICT(attempt_id,qid) DO UPDATE SET manual_score=excluded.manual_score,manual_comment=COALESCE(excluded.manual_comment,exam_answers.manual_comment)",
      attemptId, qid, value, cleanComment, now(),
    );
    return { ok: true, score: value };
  }

  async function releaseAttempt({ ownerAccountId, examId, attemptId }) {
    await ownExam(ownerAccountId, examId);
    await db.batch([
      q('DELETE FROM exam_review_sessions WHERE attempt_id=? AND EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.exam_id=? AND e.owner_account_id=?)', attemptId, attemptId, examId, ownerAccountId),
      q('UPDATE exam_attempts SET token_hash=NULL,review_pin_hash=NULL,review_fail_count=0,review_window_start=NULL WHERE id=? AND exam_id=? AND EXISTS (SELECT 1 FROM exams WHERE id=? AND owner_account_id=?)', attemptId, examId, examId, ownerAccountId),
    ]);
    return { ok: true };
  }

  async function deleteExam({ ownerAccountId, examId, confirmTitle, confirmAttempts }) {
    const row = await ownExam(ownerAccountId, examId);
    if (row.status === 'running' || typeof confirmTitle !== 'string' || !Number.isSafeInteger(confirmAttempts) || confirmAttempts < 0) fail('BAD_STATE');
    const random = crypto.getRandomValues(new Uint32Array(2));
    const marker = -(1 + (random[0] & 0x3ffffff) * 0x4000000 + (random[1] & 0x3ffffff));
    const guard = "EXISTS (SELECT 1 FROM exams WHERE id=? AND owner_account_id=? AND title=? AND status=? AND status!='running' AND updated_at=?)";
    const args = [examId, ownerAccountId, confirmTitle, row.status, marker];
    const out = await db.batch([
      q("UPDATE exams SET updated_at=? WHERE id=? AND owner_account_id=? AND title=? AND status=? AND status!='running' AND (SELECT COUNT(*) FROM exam_attempts WHERE exam_id=?)=?", marker, examId, ownerAccountId, confirmTitle, row.status, examId, confirmAttempts),
      q(`DELETE FROM exam_review_sessions WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id=?) AND ${guard}`, examId, ...args),
      q(`DELETE FROM exam_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id=?) AND ${guard}`, examId, ...args),
      q(`DELETE FROM exam_assets WHERE exam_id=? AND ${guard}`, examId, ...args),
      q(`DELETE FROM exam_attempts WHERE exam_id=? AND ${guard}`, examId, ...args),
      q(`DELETE FROM exams WHERE id=? AND ${guard}`, examId, ...args),
    ]);
    if (!out[0]?.meta?.changes || !out[5]?.meta?.changes) fail('BAD_STATE');
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
    const questions = questionsOf(row);
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
      const selected = selectedCode(row, a)?.questions || [];
      const score = scoreAttempt(selected, entry.answers, entry.manual);
      const essaysToMark = selected.filter((x) => x.type === 'essay' && entry.manual[x.id] === undefined && (isAnswered(x, entry.answers[x.id]) || photosBy.get(a.id + ':' + x.id))).length;
      return { id: a.id, name: a.name, mascot: a.mascot, examCode: a.exam_code, tabLeaves: a.tab_leaves, submittedAt: a.submitted_at, answered: score.answered, total: score.total, max: score.max, sections: score.sections, essaysToMark, perQuestion: Object.fromEntries(Object.entries(score.perQuestion).map(([id, s]) => [id, { p: s.points, c: s.correct }])) };
    });
    const stats = {};
    for (const qs of questions) {
      const st = { answered: 0, correct: 0, wrong: 0, blank: 0, avg: 0, choices: {}, statements: [] };
      let sum = 0;
      const codeAttempts = attempts.filter((a) => selectedCode(row, a)?.questions.some((q) => q.id === qs.id));
      for (const a of codeAttempts) {
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
      st.avg = codeAttempts.length ? Math.round((sum / codeAttempts.length) * 100) / 100 : 0;
      stats[qs.id] = st;
    }
    const statsByCode = Object.fromEntries(codesOf(row).map((code) => [code.code || '', Object.fromEntries(code.questions.map((q) => [q.id, stats[q.id]]))]));
    return { exam: await fullExam(row), rows, stats, statsByCode, serverNow: now() };
  }

  async function exportCsv({ ownerAccountId, examId }) {
    const data = await results({ ownerAccountId, examId });
    const questions = data.exam.codes.flatMap((code) => code.questions);
    const sections = [...new Set(questions.map((x) => x.section))];
    const cell = (v) => {
      const text = String(v ?? '');
      const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const head = ['STT', 'Họ và tên', 'Mã đề', 'Đã làm', 'Số lần rời tab', 'Đã nộp', ...sections.map((s) => 'Phần ' + (s || '-')), 'Tổng điểm', 'Tối đa', ...questions.map((x) => (data.exam.codes.length > 1 ? x.id.split('_')[0] + '·' : '') + (x.section ? x.section + '·' : '') + x.label)];
    const lines = [head.map(cell).join(',')];
    data.rows.forEach((r, i) => {
      const count = data.exam.codes.find((code) => code.code === r.examCode)?.questions.length || data.exam.questions.length;
      lines.push([i + 1, r.name, r.examCode || '', r.answered + '/' + count, r.tabLeaves, r.submittedAt ? 'x' : '', ...sections.map((s) => r.sections[s]?.points ?? 0), r.total, r.max, ...questions.map((x) => r.perQuestion[x.id]?.p ?? '')].map(cell).join(','));
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

  async function readAttempt(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) fail('AUTH_REQUIRED');
    const hash = await sha256(token);
    const original = await one('SELECT * FROM exam_attempts WHERE token_hash=?', hash);
    if (original) return original;
    const review = await one(`SELECT a.* FROM exam_review_sessions s JOIN exam_attempts a ON a.id=s.attempt_id JOIN exams e ON e.id=a.exam_id WHERE s.token_hash=? AND ${REVIEW_GUARD}`, hash);
    if (!review) fail('AUTH_REQUIRED');
    return { ...review, readOnly: true };
  }

  async function reviewJoin({ code, name, pin }) {
    if (typeof code !== 'string' || code.length > 20 || typeof name !== 'string' || typeof pin !== 'string' || pin.length > 80) fail('REVIEW_UNAVAILABLE');
    let key;
    try { key = nameKey(normalizeName(name)); } catch { fail('REVIEW_UNAVAILABLE'); }
    const room = await one('SELECT * FROM exams WHERE code=?', code.trim().toUpperCase());
    if (!room) fail('REVIEW_UNAVAILABLE');
    await settleClock(room);
    const attempt = await one(`SELECT a.id FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE e.id=? AND a.name_key=? AND ${REVIEW_GUARD}`, room.id, key);
    if (!attempt) fail('REVIEW_UNAVAILABLE');
    const t = now();
    const expired = '(review_window_start IS NULL OR review_window_start<=?)';
    const reservation = await one(`UPDATE exam_attempts SET review_fail_count=CASE WHEN ${expired} THEN 1 ELSE COALESCE(review_fail_count,0)+1 END,review_window_start=CASE WHEN ${expired} THEN ? ELSE review_window_start END WHERE id=? AND CASE WHEN ${expired} THEN 0 ELSE COALESCE(review_fail_count,0) END < 5 AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status='closed' AND COALESCE(json_extract(e.settings_json,'$.review'),'after_close')!='none') AND token_hash IS NOT NULL AND review_pin_hash IS NOT NULL AND submitted_at IS NOT NULL RETURNING review_window_start,review_pin_hash`, t - REVIEW_WINDOW_MS, t - REVIEW_WINDOW_MS, t, attempt.id, t - REVIEW_WINDOW_MS);
    if (!reservation || await sha256(pin) !== reservation.review_pin_hash) fail('REVIEW_UNAVAILABLE');
    const token = newToken();
    const sessionId = crypto.randomUUID();
    const guard = `EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.review_pin_hash=? AND a.review_window_start=? AND ${REVIEW_GUARD})`;
    const args = [attempt.id, reservation.review_pin_hash, reservation.review_window_start];
    const out = await db.batch([
      q(`UPDATE exam_attempts SET review_fail_count=review_fail_count-1 WHERE id=? AND review_fail_count>0 AND ${guard}`, attempt.id, ...args),
      q(`INSERT INTO exam_review_sessions(id,attempt_id,token_hash,created_at) SELECT ?,?,?,? WHERE ${guard}`, sessionId, attempt.id, await sha256(token), t, ...args),
      q('DELETE FROM exam_review_sessions WHERE attempt_id=? AND id!=? AND EXISTS (SELECT 1 FROM exam_review_sessions WHERE id=?) AND id NOT IN (SELECT id FROM exam_review_sessions WHERE attempt_id=? AND id!=? ORDER BY created_at DESC,rowid DESC LIMIT 9)', attempt.id, sessionId, sessionId, attempt.id, sessionId),
    ]);
    if (!out[1]?.meta?.changes) fail('REVIEW_UNAVAILABLE');
    return { token, readOnly: true };
  }

  async function join({ code, name, token, mascot }) {
    if (token && typeof token === 'string' && await one('SELECT id FROM exam_review_sessions WHERE token_hash=?', await sha256(token))) fail('AUTH_REQUIRED');
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
    if (exam.status === 'running' && t > exam.ends_at + graceMs(exam)) fail('EXAM_ENDED');
    if (exam.status === 'running' && parse(exam.settings_json, {}).allowLateJoin === false) fail('EXAM_LOCKED');
    const entries = codesOf(exam);
    const settings = parse(exam.settings_json, {});
    if (exam.status === 'running' && settings.assignment === 'manual' && entries[0]?.code) fail('EXAM_LOCKED');
    const fresh = newToken();
    const id = crypto.randomUUID();
    const seed = newToken();
    const assignments = entries.map((entry) => entry.code);
    const assigned = !assignments[0] || settings.assignment === 'manual' ? 'NULL' : settings.assignment === 'random' ? '?' : `CASE (SELECT COUNT(*) FROM exam_attempts WHERE exam_id=?) % ${assignments.length} ${assignments.map((_, i) => 'WHEN ' + i + ' THEN ?').join(' ')} END`;
    const assignmentArgs = !assignments[0] || settings.assignment === 'manual' ? [] : settings.assignment === 'random' ? [assignments[crypto.getRandomValues(new Uint32Array(1))[0] % assignments.length]] : [exam.id, ...assignments];
    try {
      await run(`INSERT INTO exam_attempts(id,exam_id,name,name_key,token_hash,mascot,joined_at,last_seen_at,exam_code,shuffle_seed) SELECT ?,?,?,?,?,?,?,?,${assigned},? WHERE EXISTS (SELECT 1 FROM exams WHERE id=? AND questions_json=? AND settings_json=? AND (status='open' OR (status='running' AND COALESCE(json_extract(settings_json,'$.allowLateJoin'),1)!=0 AND ? <= ends_at+COALESCE(CAST(json_extract(settings_json,'$.graceSeconds') AS INTEGER),0)*1000 AND ?=0)))`, id, exam.id, clean, key, await sha256(fresh), faceId, t, t, ...assignmentArgs, seed, exam.id, exam.questions_json, exam.settings_json, t, settings.assignment === 'manual' && assignments[0] ? 1 : 0);
    } catch (error) {
      if (/UNIQUE|constraint/i.test(String(error?.message))) fail('NAME_TAKEN');
      throw error;
    }
    const attempt = await one('SELECT * FROM exam_attempts WHERE id=?', id);
    if (!attempt) fail((await examRow(exam.id)).status === 'closed' ? 'EXAM_CLOSED' : 'EXAM_LOCKED');
    await attemptView(exam, attempt);
    return { token: fresh, attemptId: id, resumed: false };
  }

  async function assignCode({ ownerAccountId, examId, attemptId, examCode }) {
    const row = await ownExam(ownerAccountId, examId);
    if (!codesOf(row).some((entry) => entry.code === examCode)) fail('NOT_FOUND');
    if (row.status === 'running' || row.status === 'closed') fail('BAD_STATE');
    const attempt = await one('SELECT * FROM exam_attempts WHERE id=? AND exam_id=?', attemptId, examId);
    if (!attempt) fail('NOT_FOUND');
    if (attempt.exam_code !== null && attempt.exam_code !== examCode) fail('BAD_STATE');
    const out = await run("UPDATE exam_attempts SET exam_code=?,view_json=NULL WHERE id=? AND exam_id=? AND exam_code IS NULL AND NOT EXISTS (SELECT 1 FROM exam_answers WHERE attempt_id=?) AND EXISTS (SELECT 1 FROM exams WHERE id=? AND status IN ('draft','open'))", examCode, attemptId, examId, attemptId, examId);
    const fresh = await one('SELECT * FROM exam_attempts WHERE id=?', attemptId);
    if (!out.meta?.changes && (fresh.exam_code !== examCode || await one('SELECT 1 AS x FROM exam_answers WHERE attempt_id=? LIMIT 1', attemptId))) fail('BAD_STATE');
    await attemptView(row, fresh);
    return { ok: true, examCode };
  }

  async function preview({ ownerAccountId, examId, examCode, seed = 'preview' }) {
    const row = await ownExam(ownerAccountId, examId);
    if (typeof seed !== 'string' || seed.length > 100) fail('INVALID_BODY');
    const full = await fullExam(row);
    const code = full.codes.find((entry) => entry.code === (examCode ?? null)) || (examCode === '101' && full.codes[0]?.code === null ? full.codes[0] : null);
    if (!code) fail('NOT_FOUND');
    const view = buildView(code.questions, parse(row.settings_json, {}), seed);
    return { exam: { title: row.title }, examCode: code.code, questions: view.order.map((id) => viewQuestion(code.questions.find((q) => q.id === id), view)), answers: {} };
  }

  const publicQuestion = (qs, hasImage) => ({
    id: qs.id,
    section: qs.section,
    label: qs.label,
    type: qs.type,
    points: qs.points,
    options: qs.options,
    statements: qs.statements,
    ...(qs.choiceText ? { choiceText: qs.choiceText } : {}),
    ...(qs.statementText ? { statementText: qs.statementText } : {}),
    ...(qs.choiceImages ? { choiceImages: qs.choiceImages } : {}),
    ...(qs.statementImages ? { statementImages: qs.statementImages } : {}),
    ...(qs.questionImages?.length ? { questionImages: qs.questionImages } : {}),
    ...(qs.imageMode ? { imageMode: qs.imageMode } : {}),
    hasImage,
    ...(hasImage && qs.imageMode !== 'figure' ? {} : { text: qs.text }),
  });

  async function getState({ token }) {
    const attempt = await readAttempt(token);
    let exam = await examRow(attempt.exam_id);
    if (!exam) fail('AUTH_REQUIRED');
    exam = await settleClock(exam);
    const fresh = await one('SELECT * FROM exam_attempts WHERE id=?', attempt.id);
    if (!fresh) fail('AUTH_REQUIRED');
    const t = now();
    if (!attempt.readOnly) await run('UPDATE exam_attempts SET last_seen_at=? WHERE id=? AND token_hash=?', t, attempt.id, attempt.token_hash);
    const settings = parse(exam.settings_json, {});
    const selected = selectedCode(exam, fresh);
    const questions = selected?.questions || [];
    const view = await attemptView(exam, fresh, !attempt.readOnly);
    const base = {
      ...(attempt.readOnly ? { readOnly: true } : {}),
      serverNow: t,
      integrity: integrityState(settings, view),
      exam: { title: exam.title, code: exam.code, status: exam.status, durationMin: exam.duration_min, startedAt: exam.started_at, endsAt: personalEnd(exam, fresh), graceSeconds: settings.graceSeconds, review: settings.review === 'none' ? 'none' : 'after_close', ...(settings.showCode ? { examCode: fresh.exam_code } : {}), questionCount: questions.length, sections: [...new Set(questions.map((x) => x.section))].map((s) => ({ section: s, count: questions.filter((x) => x.section === s).length })) },
      attempt: { id: fresh.id, name: fresh.name, mascot: fresh.mascot, submittedAt: fresh.submitted_at, textScale: fresh.text_scale, extraMinutes: fresh.extra_minutes },
    };
    if (!selected) return { ...base, assignmentPending: true, questions: [], answers: {}, photos: {} };
    if (exam.status === 'open' || exam.status === 'draft') return { ...base, questions: [], answers: {}, photos: {} };
    if (exam.status === 'running' && !fresh.submitted_at && base.integrity.required && !base.integrity.confirmed) return { ...base, questions: [], answers: {}, photos: {} };
    const answers = await all('SELECT qid,value_json,manual_score,manual_comment FROM exam_answers WHERE attempt_id=?', attempt.id);
    const photos = await all("SELECT id,qid FROM exam_assets WHERE attempt_id=? AND kind='photo' ORDER BY created_at", attempt.id);
    const photoMap = {};
    for (const p of photos) (photoMap[p.qid] ||= []).push(p.id);
    const canonicalAnswers = Object.fromEntries(answers.filter((a) => a.value_json !== 'null' && questions.some((q) => q.id === a.qid)).map((a) => [a.qid, parse(a.value_json, null)]));
    const displayAnswers = Object.fromEntries(questions.filter((q) => q.id in canonicalAnswers).map((q) => [q.id, toDisplayAnswer(q, canonicalAnswers[q.id], view)]));
    const out = { ...base, answers: displayAnswers, photos: photoMap };
    if (fresh.submitted_at || exam.status === 'closed') {
      const manual = Object.fromEntries(answers.filter((a) => a.manual_score !== null).map((a) => [a.qid, a.manual_score]));
      const score = scoreAttempt(questions, canonicalAnswers, manual);
      const finished = {
        ...out, questions: [], finished: true,
        badges: fresh.submitted_at ? ['Hoàn thành', ...(fresh.submitted_at < personalEnd(exam, fresh) ? ['Đúng giờ'] : [])] : [],
        result: settings.showResult === 'score' ? { total: score.total, max: score.max, answered: score.answered, count: score.count, essaysPending: score.pendingEssays > 0 } : null,
      };
      if (!attempt.readOnly && fresh.submitted_at !== null && settings.review !== 'none') {
        const digest = await sha256('exam-review-pin-v1\0' + attempt.id + '\0' + token);
        const pin = Array.from({ length: 8 }, (_, index) => CODE_ALPHABET[parseInt(digest.slice(index * 2, index * 2 + 2), 16) & 31]).join('');
        const hash = await sha256(pin);
        await run("UPDATE exam_attempts SET review_pin_hash=? WHERE id=? AND token_hash=? AND submitted_at IS NOT NULL AND review_pin_hash IS NULL AND EXISTS (SELECT 1 FROM exams WHERE id=exam_attempts.exam_id AND COALESCE(json_extract(settings_json,'$.review'),'after_close')!='none')", hash, attempt.id, attempt.token_hash);
        if (await one("SELECT 1 AS ok FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.review_pin_hash=? AND a.submitted_at IS NOT NULL AND COALESCE(json_extract(e.settings_json,'$.review'),'after_close')!='none'", attempt.id, attempt.token_hash, hash)) finished.reviewPin = pin;
      }
      // Even section totals can expose individual answers. Only the closed review contains scored items.
      if (exam.status === 'closed' && settings.review !== 'none') {
        const reviewQuestions = (await fullExam(exam)).codes.find((entry) => entry.code === selected.code).questions;
        finished.review = {
          questions: view.order.map((id) => viewQuestion((reviewQuestions || []).find((q) => q.id === id), view, true)),
          answers: out.answers,
          manual,
          comments: Object.fromEntries(answers.filter((a) => a.manual_comment !== null).map((a) => [a.qid, a.manual_comment])),
          items: Object.fromEntries(questions.map((q) => {
            const item = score.perQuestion[q.id];
            return [q.id, item.detail ? { ...item, detail: { ...item.detail, marks: (view.statements[q.id] || q.statements).map((letter) => item.detail.marks[q.statements.indexOf(letter)]) } } : item];
          })),
        };
      }
      await readAttempt(token);
      return finished;
    }
    const full = (await fullExam(exam)).codes.find((entry) => entry.code === selected.code).questions;
    return { ...out, questions: view.order.map((id) => { const q = full.find((q) => q.id === id); return publicQuestion(viewQuestion(q, view), q.hasImage); }), finished: false };
  }

  async function activeAttempt(token, requiresIntegrity = true) {
    const attempt = await attemptByToken(token);
    const exam = await examRow(attempt.exam_id);
    const settings = parse(exam.settings_json, {});
    const t = now();
    if (exam.status !== 'running') fail(exam.status === 'closed' ? 'EXAM_ENDED' : 'EXAM_NOT_STARTED');
    if (t > personalEnd(exam, attempt) + graceMs(exam)) fail('EXAM_ENDED');
    if (attempt.submitted_at) fail('ALREADY_SUBMITTED');
    const selected = selectedCode(exam, attempt);
    if (!selected) fail('EXAM_LOCKED');
    const view = await attemptView(exam, attempt);
    if (requiresIntegrity && settings.integrityPolicyVersion === 1 && !integrityRecord(view)) fail('INTEGRITY_REQUIRED');
    return { attempt, exam, settings, questions: selected.questions, view, t };
  }

  async function acknowledgeIntegrity({ token, integrity }) {
    if (!integrity || typeof integrity !== 'object' || Array.isArray(integrity) || Object.keys(integrity).some(key => !['confirmed', 'usedAI'].includes(key)) || integrity.confirmed !== true || typeof integrity.usedAI !== 'boolean') fail('INVALID_BODY');
    const { attempt, settings, view, t } = await activeAttempt(token, false);
    if (settings.integrityPolicyVersion !== 1) return getState({ token });
    const existing = integrityRecord(view);
    if (existing) {
      if (existing.usedAI !== integrity.usedAI) fail('INTEGRITY_LOCKED');
      await writeState(attempt.id, t, attempt.token_hash);
      return getState({ token });
    }
    const recorded = { version: 1, confirmedAt: t, usedAI: integrity.usedAI };
    const out = await run("UPDATE exam_attempts SET view_json=json_set(view_json,'$.integrity',json(?)) WHERE id=? AND token_hash=? AND submitted_at IS NULL AND view_json=? AND EXISTS (SELECT 1 FROM exams e WHERE e.id=exam_attempts.exam_id AND e.status='running' AND json_extract(e.settings_json,'$.integrityPolicyVersion')=1 AND ? <= e.ends_at + exam_attempts.extra_minutes*60000 + CAST(json_extract(e.settings_json,'$.graceSeconds') AS INTEGER)*1000)", JSON.stringify(recorded), attempt.id, attempt.token_hash, attempt.view_json || JSON.stringify(view), t);
    if (!out.meta?.changes) {
      const fresh = await attemptByToken(token);
      const next = integrityRecord(parse(fresh.view_json, null));
      if (next && next.usedAI !== integrity.usedAI) fail('INTEGRITY_LOCKED');
      await writeState(attempt.id, now(), attempt.token_hash);
      if (!next) fail('BAD_STATE');
    }
    return getState({ token });
  }

  async function writeState(attemptId, t, tokenHash) {
    const row = await one('SELECT a.submitted_at,a.token_hash,a.view_json,a.extra_minutes,e.status,e.ends_at,e.settings_json FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=?', attemptId);
    if (row?.token_hash !== tokenHash) fail('AUTH_REQUIRED');
    if (!row || row.submitted_at || row.status === 'closed' || row.status !== 'running' || t > personalEnd(row, row) + graceMs(row)) fail(row?.submitted_at ? 'ALREADY_SUBMITTED' : 'EXAM_ENDED');
    if (parse(row.settings_json, {}).integrityPolicyVersion === 1 && !integrityRecord(parse(row.view_json, null))) fail('INTEGRITY_REQUIRED');
    return row;
  }

  const serverSeq = (requested, t) => Math.min(Math.floor(t / 1000), Math.max(0, Math.min(2_000_000_000, Math.round(Number(requested) || 0))));

  async function saveAnswer({ token, qid, value, seq }) {
    const { attempt, questions, view, t } = await activeAttempt(token);
    const question = questions.find((x) => x.id === qid);
    if (!question) fail('NOT_FOUND');
    if (question.type === 'essay' && JSON.stringify(value ?? null).length > MAX_ANSWER_BYTES) fail('ANSWER_TOO_LARGE');
    const clean = toCanonicalAnswer(question, value, view);
    const nextSeq = serverSeq(seq, t);
    const active = `EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + a.extra_minutes*60000 + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000 AND ${INTEGRITY_GUARD})`;
    const result = clean === null
      ? await run(`INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?, 'null',?,? WHERE ${active} ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json='null',seq=excluded.seq,updated_at=excluded.updated_at WHERE excluded.seq>exam_answers.seq OR (excluded.seq=exam_answers.seq AND excluded.value_json=exam_answers.value_json)`, attempt.id, qid, nextSeq, t, attempt.id, attempt.token_hash, t)
      : await run(`INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?,?,?,? WHERE ${active} ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json=excluded.value_json,seq=excluded.seq,updated_at=excluded.updated_at WHERE excluded.seq>exam_answers.seq OR (excluded.seq=exam_answers.seq AND excluded.value_json=exam_answers.value_json)`, attempt.id, qid, JSON.stringify(clean), nextSeq, t, attempt.id, attempt.token_hash, t);
    await writeState(attempt.id, t, attempt.token_hash);
    await run('UPDATE exam_attempts SET last_seen_at=? WHERE id=? AND submitted_at IS NULL', t, attempt.id);
    return { ok: true, savedAt: t, stale: !result.meta?.changes };
  }

  async function submit({ token, answers }) {
    const { attempt, questions, view, t } = await activeAttempt(token);
    const statements = [];
    if (answers && typeof answers === 'object') {
      for (const question of questions) {
        if (!(question.id in answers)) continue;
        const clean = toCanonicalAnswer(question, answers[question.id], view);
        statements.push(q(
          `INSERT INTO exam_answers(attempt_id,qid,value_json,seq,updated_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + a.extra_minutes*60000 + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000 AND ${INTEGRITY_GUARD}) ON CONFLICT(attempt_id,qid) DO UPDATE SET value_json=excluded.value_json,seq=excluded.seq,updated_at=excluded.updated_at`,
          attempt.id, question.id, JSON.stringify(clean), Math.floor(t / 1000), t, attempt.id, attempt.token_hash, t,
        ));
      }
    }
    statements.push(q(`UPDATE exam_attempts SET submitted_at=?,last_seen_at=? WHERE id=? AND token_hash=? AND submitted_at IS NULL AND EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=exam_attempts.id AND e.status='running' AND ? <= e.ends_at + a.extra_minutes*60000 + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000 AND ${INTEGRITY_GUARD})`, t, t, attempt.id, attempt.token_hash, t));
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
    const result = await run(`INSERT INTO exam_assets(id,exam_id,attempt_id,qid,kind,mime,data,bytes,created_at) SELECT ?,?,?,?,'photo',?,?,?,? WHERE EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + a.extra_minutes*60000 + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000 AND ${INTEGRITY_GUARD}) AND (SELECT COUNT(*) FROM exam_assets WHERE attempt_id=? AND kind='photo') < ?`, id, exam.id, attempt.id, qid, mime, data, bytes, t, attempt.id, attempt.token_hash, t, attempt.id, LIMITS.photosPerAttempt);
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
    const result = await run(`DELETE FROM exam_assets WHERE id=? AND attempt_id=? AND kind='photo' AND EXISTS (SELECT 1 FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=? AND a.token_hash=? AND a.submitted_at IS NULL AND e.status='running' AND ? <= e.ends_at + a.extra_minutes*60000 + CAST(json_extract(e.settings_json, '$.graceSeconds') AS INTEGER) * 1000 AND ${INTEGRITY_GUARD})`, id, attempt.id, attempt.id, attempt.token_hash, t);
    if (!result.meta?.changes) await writeState(attempt.id, t, attempt.token_hash);
    return { ok: true };
  }

  async function pupilAsset({ token, qid, photoId, solutionId, questionId, itemId }) {
    const attempt = await readAttempt(token);
    const row = await examRow(attempt.exam_id);
    if (!row) fail('AUTH_REQUIRED');
    const exam = await settleClock(row);
    const questions = selectedCode(exam, attempt)?.questions || [];
    const ownsQuestion = (id) => questions.some((question) => question.id === id);
    if (photoId) {
      const photo = await one("SELECT qid,mime,data FROM exam_assets WHERE id=? AND exam_id=? AND attempt_id=? AND kind='photo'", photoId, exam.id, attempt.id);
      if (!photo || !ownsQuestion(photo.qid)) fail('NOT_FOUND');
      await readAttempt(token);
      return photo;
    }
    const reviewOpen = exam.status === 'closed' && parse(exam.settings_json, {}).review !== 'none';
    if (solutionId) {
      if (!reviewOpen) fail('NOT_FOUND');
      const solution = await one("SELECT qid,mime,data FROM exam_assets WHERE id=? AND exam_id=? AND kind='solution'", solutionId, exam.id);
      if (!solution || !ownsQuestion(solution.qid)) fail('NOT_FOUND');
      await readAttempt(token);
      return solution;
    }
    if (!reviewOpen) {
      if (exam.status === 'closed') fail('NOT_FOUND');
      if (exam.status !== 'running') fail('EXAM_NOT_STARTED');
      const fresh = await one('SELECT * FROM exam_attempts WHERE id=?', attempt.id);
      if (fresh?.submitted_at) fail('ALREADY_SUBMITTED');
      if (now() > personalEnd(exam, fresh) + graceMs(exam)) fail('EXAM_ENDED');
      if (parse(exam.settings_json, {}).integrityPolicyVersion === 1 && !integrityRecord(parse(attempt.view_json, null))) fail('INTEGRITY_REQUIRED');
    }
    if (questionId || itemId) {
      const asset = await one('SELECT qid,kind,mime,data FROM exam_assets WHERE id=? AND exam_id=?', questionId || itemId, exam.id);
      if (!asset || !ownsQuestion(asset.qid) || (questionId ? asset.kind !== 'question' : !/^(?:option:[A-F]|statement:[a-f])$/.test(asset.kind))) fail('NOT_FOUND');
      await readAttempt(token);
      return asset;
    }
    if (!ownsQuestion(qid)) fail('NOT_FOUND');
    const image = await one("SELECT mime,data FROM exam_assets WHERE exam_id=? AND qid=? AND kind='question'", exam.id, qid);
    if (!image) fail('NOT_FOUND');
    await readAttempt(token);
    return image;
  }

  return {
    createExam, updateExam, duplicateCode, listExams, saveQuestionImage, removeQuestionImage, saveItemImage, saveSolutionImage, removeSolutionImage, getExam, control, setAccommodation, getAttempt, grade, releaseAttempt, reopenAttempt, teacherAsset, results, exportCsv, assignCode, preview,
    join, reviewJoin, deleteExam, getState, acknowledgeIntegrity, saveAnswer, submit, tabLeave, chooseMascot, savePhoto, deletePhoto, pupilAsset,
    STATUSES,
  };
}
