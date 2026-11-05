// Chạy thử ngẫu nhiên mọi gói bài qua engine: GV điều nhịp và HS tự đi.
// Chỉ đọc catalogue trong repo; không gọi mạng; chỉ ghi file khi có --json-out.
// Mặc định GV KHÔNG đóng sự kiện lớp để lộ lỗi; --force-gv-close chỉ để đối chiếu. Có vấn đề thì thoát mã 1.
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent } from '../lib/lesson/serialize.js';
import { hashPackage } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';

const CATALOGUES = ['content/hki-2026-catalogue.json', 'content/hkii-2026-catalogue.json'];
const TEACHER = { role: 'teacher', id: 'teacher-1' };
const SYSTEM = { role: 'system', id: 'system' };
const LEARNERS = [{ id: 's1', name: 'S1' }, { id: 's2', name: 'S2' }, { id: 's3', name: 'S3' }];
const WRONG_RATE = 0.25;
const SELF_EVENT_CAP = 4000;
const TEACHER_STEP_CAP = 400;
const BENIGN = new Set(['TASK_ALREADY_COMPLETED']);

function parseArgs(argv) {
  const out = { seed: 20261105, sample: 0, limit: 0, jsonOut: '', forceGvClose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--seed') out.seed = Number(argv[++i]);
    else if (flag === '--sample') out.sample = Number(argv[++i]);
    else if (flag === '--limit') out.limit = Number(argv[++i]);
    else if (flag === '--json-out') out.jsonOut = argv[++i];
    else if (flag === '--force-gv-close') out.forceGvClose = true;
    else throw new Error('unknown argument: ' + flag);
  }
  return out;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadCatalogue(file) {
  const cat = JSON.parse(readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
  const items = cat.lessons.map(meta => ({
    meta,
    catalogue: file,
    pkg: JSON.parse(zlib.gunzipSync(Buffer.from(meta.data, 'base64')).toString('utf8')),
  }));
  return { items, exams: cat.exams.length };
}

function correctAnswer(task) {
  const key = task.evaluation?.answerKey;
  return key === undefined ? 'Em tự trình bày lời giải.' : key;
}

function wrongAnswer(task) {
  const key = task.evaluation?.answerKey;
  if (typeof key === 'number') return key + 1;
  if (typeof key === 'boolean') return !key;
  if (Array.isArray(key)) return key.length ? [] : ['x'];
  return 'sai thu nghiem';
}

function send(ctx, state, actor, type, payload = {}, activityId = null) {
  const event = { eventId: 'e' + (++ctx.seq), type, round: state.round, revision: state.revision, payload };
  if (activityId) event.activityId = activityId;
  ctx.clock += 1000;
  return reduceLessonSession(state, event, { actor, now: ctx.clock });
}

function newState(pkg, sessionId, ctx) {
  return createLessonSession({ package: structuredClone(pkg), mode: 'preview', sessionId, hostId: TEACHER.id, learners: LEARNERS, now: ctx.clock });
}

function teacherRun(pkg, rnd, trace) {
  const ctx = { clock: 1000, seq: 0 };
  const refused = {};
  let groupSkipped = 0, accepted = 0, steps = 0, naturalEnd = false;
  let state = newState(pkg, 'qa-teacher', ctx);
  let out = send(ctx, state, TEACHER, 'START');
  if (!out.result.ok) return { error: 'START ' + out.result.code, refused };
  state = out.state;
  while (steps < TEACHER_STEP_CAP) {
    steps += 1;
    const idx = state.timeline.activityIndex;
    const act = state.package.activities[idx];
    if (!act) break;
    for (const learner of LEARNERS) {
      const view = serializeForStudent(state, learner.id);
      for (const shown of view.tasks || []) {
        const task = state.package.tasks.find(t => t.id === shown.id);
        if (task.participation === 'group') { groupSkipped += 1; continue; }
        const answer = rnd() < WRONG_RATE ? wrongAnswer(task) : correctAnswer(task);
        out = send(ctx, state, { role: 'student', id: learner.id }, 'SUBMIT', { taskId: task.id, answer }, act.id);
        state = out.state;
        if (out.result.ok) accepted += 1;
        else if (!BENIGN.has(out.result.code)) refused[out.result.code] = (refused[out.result.code] || 0) + 1;
        if (trace && trace.length < 80) trace.push({ run: 'teacher', idx, learner: learner.id, task: task.id, ok: out.result.ok, code: out.result.code || null });
      }
    }
    out = send(ctx, state, TEACHER, 'NEXT');
    state = out.state;
    if (!out.result.ok) {
      if (out.result.code !== 'SESSION_CONCLUDED') refused['NEXT:' + out.result.code] = (refused['NEXT:' + out.result.code] || 0) + 1;
      else naturalEnd = true;
      break;
    }
    if (state.timeline.activityIndex === idx) break;
  }
  // Chỉ kết thúc tự nhiên (NEXT trả SESSION_CONCLUDED) mới tính là hoàn thành.
  // Dừng giữa chừng thì CONCLUDE chỉ dọn phiên; không được tính là hoàn thành.
  let manualClose = false;
  if (!naturalEnd) manualClose = send(ctx, state, TEACHER, 'CONCLUDE').result.ok === true;
  return { concluded: naturalEnd, manualClose, accepted, groupSkipped, steps, refused };
}

// Lệnh bị chặn vì sự kiện lớp đang mở là HS phải chờ theo luật (sự kiện tự đóng theo giờ), không phải lỗi.
function countRefusal(refused, waitRefused, key, code) {
  const bucket = code === 'CLASS_EVENT_ACTIVE' ? waitRefused : refused;
  bucket[key] = (bucket[key] || 0) + 1;
}

function selfRun(pkg, rnd, trace) {
  const ctx = { clock: 1000, seq: 0 };
  const refused = {};
  let state = newState(pkg, 'qa-self', ctx);
  state.pacing = 'self';
  let out = send(ctx, state, TEACHER, 'START');
  if (!out.result.ok) return { error: 'START ' + out.result.code, refused };
  state = out.state;
  const attempts = {};
  const waitRefused = {};
  let events = 0, groupSkipped = 0, forcedCloses = 0;
  const finished = () => LEARNERS.filter(l => state.selfFinished?.[l.id] === true).length;
  while (finished() < LEARNERS.length && events < SELF_EVENT_CAP) {
    for (const learner of LEARNERS) {
      if (state.selfFinished?.[learner.id] === true) continue;
      const actor = { role: 'student', id: learner.id };
      const pending = (serializeForStudent(state, learner.id).tasks || []).map(t => t.id);
      for (const taskId of pending) {
        const view = serializeForStudent(state, learner.id);
        if (!view.currentActivity || !(view.tasks || []).some(t => t.id === taskId)) continue;
        const task = state.package.tasks.find(t => t.id === taskId);
        if (task.participation === 'group') { groupSkipped += 1; continue; }
        const key = learner.id + ':' + task.id;
        const first = !attempts[key];
        attempts[key] = (attempts[key] || 0) + 1;
        const answer = first && rnd() < WRONG_RATE ? wrongAnswer(task) : correctAnswer(task);
        out = send(ctx, state, actor, 'SUBMIT', { taskId: task.id, answer }, view.currentActivity.id);
        events += 1;
        state = out.state;
        if (!out.result.ok && !BENIGN.has(out.result.code)) countRefusal(refused, waitRefused, out.result.code, out.result.code);
        if (trace && trace.length < 80) trace.push({ run: 'self', learner: learner.id, task: task.id, ok: out.result.ok, code: out.result.code || null });
      }
      out = send(ctx, state, actor, 'ROLL', {});
      events += 1;
      state = out.state;
      if (!out.result.ok) countRefusal(refused, waitRefused, 'ROLL:' + out.result.code, out.result.code);
      if (args.forceGvClose && state.classEvent?.status === 'active') {
        // Chỉ khi bật --force-gv-close: GV đóng sự kiện lớp để HS đi tiếp. Đây là đường né lỗi để đối chiếu, không phải kiểm chứng.
        out = send(ctx, state, TEACHER, 'CLASS_EVENT_CLOSE', {});
        events += 1;
        state = out.state;
        forcedCloses += 1;
        if (!out.result.ok) refused['CLASS_CLOSE:' + out.result.code] = (refused['CLASS_CLOSE:' + out.result.code] || 0) + 1;
      }
    }
  }
  // Mọi em đã đi hết nhưng sự kiện lớp còn mở: để thời gian trôi (TICK) tới khi sự kiện tự đóng theo luật.
  while (finished() === LEARNERS.length && state.classEvent?.status === 'active' && events < SELF_EVENT_CAP) {
    out = send(ctx, state, SYSTEM, 'TICK', {}); // TICK chỉ hợp lệ với actor hệ thống (runtime.js: SYSTEM_COMMANDS)
    events += 1;
    state = out.state;
    if (!out.result.ok) { refused['TICK:' + out.result.code] = (refused['TICK:' + out.result.code] || 0) + 1; break; }
  }
  return { finished: finished(), learners: LEARNERS.length, events, capped: events >= SELF_EVENT_CAP, groupSkipped, forcedCloses, refused, waitRefused, openEventAtEnd: state.classEvent?.status === 'active' };
}

function addCounts(target, source) {
  for (const [code, n] of Object.entries(source || {})) target[code] = (target[code] || 0) + n;
  return target;
}

const args = parseArgs(process.argv.slice(2));
const rnd = mulberry32(args.seed);
let items = [], examCount = 0;
for (const file of CATALOGUES) {
  const cat = loadCatalogue(file);
  items = items.concat(cat.items);
  examCount += cat.exams;
}
if (args.limit) items = items.slice(0, args.limit);
const sampled = new Set();
while (args.sample && sampled.size < Math.min(args.sample, items.length)) sampled.add(Math.floor(rnd() * items.length));

const results = [];
for (let i = 0; i < items.length; i += 1) {
  const { meta, pkg, catalogue } = items[i];
  const rec = { id: meta.id, grade: meta.grade, status: meta.status, catalogue, activities: pkg.activities?.length ?? 0, tasks: pkg.tasks?.length ?? 0 };
  const trace = sampled.has(i) ? [] : null;
  try {
    rec.integrity = hashPackage(pkg) === pkg.contentHash ? 'ok' : 'mismatch';
    const v = validateLessonPackage(pkg, { mode: 'preview' });
    const errors = Array.isArray(v) ? v : (v?.errors ?? (v?.ok === false ? ['invalid'] : []));
    rec.validationErrors = errors.length;
    rec.validationSample = errors.slice(0, 2).map(e => String(e?.message ?? e).slice(0, 120));
    rec.teacher = teacherRun(pkg, rnd, trace);
    rec.self = selfRun(pkg, rnd, trace);
    if (trace) rec.trace = trace;
  } catch (err) {
    rec.crash = String(err?.message ?? err).slice(0, 240);
  }
  results.push(rec);
}

const summary = {
  packages: results.length,
  examsSkipped: examCount,
  integrityMismatch: results.filter(r => r.integrity === 'mismatch').map(r => r.id),
  validationErrorPackages: results.filter(r => r.validationErrors > 0).length,
  crashes: results.filter(r => r.crash).map(r => ({ id: r.id, msg: r.crash })),
  teacherNotConcluded: results.filter(r => r.teacher && !r.teacher.concluded && !r.teacher.error).map(r => r.id),
  teacherErrors: results.filter(r => r.teacher?.error).map(r => ({ id: r.id, msg: r.teacher.error })),
  teacherRefused: results.reduce((acc, r) => addCounts(acc, r.teacher?.refused), {}),
  teacherGroupSkipped: results.reduce((acc, r) => acc + (r.teacher?.groupSkipped || 0), 0),
  selfAllFinished: results.filter(r => r.self && r.self.finished === r.self.learners).length,
  selfNotFinished: results.filter(r => r.self && r.self.finished < r.self.learners).map(r => r.id),
  selfCapped: results.filter(r => r.self?.capped).length,
  selfRefused: results.reduce((acc, r) => addCounts(acc, r.self?.refused), {}),
  selfGroupSkipped: results.reduce((acc, r) => acc + (r.self?.groupSkipped || 0), 0),
  selfForcedCloses: results.reduce((acc, r) => acc + (r.self?.forcedCloses || 0), 0),
  selfWaitRefused: results.reduce((acc, r) => addCounts(acc, r.self?.waitRefused), {}),
  selfOpenEventAtEnd: results.filter(r => r.self?.openEventAtEnd).map(r => r.id),
};
const problems = summary.crashes.length + summary.integrityMismatch.length + summary.validationErrorPackages
  + summary.teacherNotConcluded.length + summary.teacherErrors.length + summary.selfNotFinished.length
  + summary.selfOpenEventAtEnd.length + summary.selfForcedCloses
  + Object.keys(summary.teacherRefused).length + Object.keys(summary.selfRefused).length;
const payload = { seed: args.seed, forceGvClose: args.forceGvClose, problems, summary, sampled: [...sampled].map(i => items[i].meta.id) };
process.exitCode = problems ? 1 : 0;
if (args.jsonOut) writeFileSync(args.jsonOut, JSON.stringify({ ...payload, lessons: results }, null, 1), 'utf8');
process.stdout.write(JSON.stringify(payload, null, 1) + '\n');
