import {explorationCommand} from './exploration.js';
import {normalizeTeacherSetup} from './teacher-setup.js';
import { createLessonClassService } from './class-service.js';
import { createLessonDeviceService } from './device-service.js';
import {packLessonState,unpackLessonState} from './state-storage.js';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { hashPackage, canonicalize } from './schema.js';
import { createLessonSession, reduceLessonSession } from './runtime.js';
import { validateLessonPackage } from './validate.js';
import { validateSessionPlan } from './validate-session-plan.js';
import { createSessionPlan, hashSessionPlan } from './session-plan.js';
import { createDirector } from './director.js';
import { createGameAdapter, pilotGameDescriptor } from './game-adapter.js';
import { serializeForTeacher, serializeForStudent, serializeForPresenter, teacherGamePlan } from './serialize.js';
import { serializeLessonArena } from './arena-bridge.js';

export const MAX_PACKAGE_BYTES = 128 * 1024;
export const MAX_EVENT_BYTES = 32 * 1024;
export const MAX_STATE_BYTES = 1536 * 1024;
const JOIN_RETRIES = 30;
const EVENT_RETRIES = 30;
const queuesByDatabase = new WeakMap();
const REBASED_STUDENT_COMMANDS = new Set(['TUTOR_NEED','TUTOR_REQUEST','TUTOR_RESPOND','TUTOR_END','MODE_ACTION','CLASS_EVENT_BUZZ','CLASS_EVENT_ANSWER','CLASS_EVENT_PICK','INTEGRITY', 'VALUE_REFLECT', 'GROUP_PROPOSE', 'GROUP_VOTE', 'GROUP_CONTRIBUTE', 'GROUP_SUBMIT', 'CHOOSE_ROLE', 'REVISIT', 'REVISIT_SUBMIT', 'REVISIT_HINT', 'SAVE_DRAFT', 'SUBMIT', 'HINT', 'ROLL', 'SELECT_BRANCH', 'CHOOSE_MASCOT']);
const REBASED_TEACHER_COMMANDS = new Set(['GROUP_ASSESS','START', 'PAUSE', 'RESUME', 'NEXT', 'LOCK', 'UNLOCK']);
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SESSION_KEYS = Object.freeze({
  create: ['teacherSetup', 'classId', 'action', 'packageRowId', 'packageVersion', 'packageHash', 'planRowId', 'planHash', 'mode', 'title', 'requestId'],
  join: ['action', 'code', 'name', 'requestId'],
  event: ['action', 'id', 'event', 'actingLearnerId'],
  tick: ['action', 'id', 'round', 'revision', 'eventId'],
  'rotate-presenter': ['action', 'id', 'revision', 'requestId']
});

function exactKeys(body, keys) {
  return body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function validateSessionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') throw new Error('INVALID_BODY');
  const keys = body.action === 'join' ? [...SESSION_KEYS.join, 'classToken'] : SESSION_KEYS[body.action];
  if (!keys || (['create', 'join', 'event'].includes(body.action) ? Object.keys(body).some(key => !keys.includes(key)) : !exactKeys(body, keys))) throw new Error('INVALID_BODY');
  if (body.action === 'create' && (body.classId !== undefined && (typeof body.classId !== 'string' || body.classId.length > 128) || typeof body.packageRowId !== 'string' || !body.packageRowId || !['preview', 'live'].includes(body.mode) || typeof body.title !== 'string' || body.title.length > 120 || typeof body.requestId !== 'string' || !body.requestId || body.requestId.length > 80 || (body.planRowId !== undefined && (typeof body.planRowId !== 'string' || !body.planRowId)) || (body.planHash !== undefined && (typeof body.planHash !== 'string' || !body.planHash)) || (body.packageVersion !== undefined && typeof body.packageVersion !== 'string') || (body.packageHash !== undefined && typeof body.packageHash !== 'string'))) throw new Error('INVALID_BODY');
  if (body.action === 'join' && (body.classToken !== undefined && (typeof body.classToken !== 'string' || body.classToken.length > 200) || typeof body.code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(body.code) || typeof body.name !== 'string' || typeof body.requestId !== 'string' || !body.requestId || body.requestId.length > 80)) throw new Error('INVALID_BODY');
  if (body.action === 'event' && (body.actingLearnerId !== undefined && (typeof body.actingLearnerId !== 'string' || !body.actingLearnerId || body.actingLearnerId.length > 128) || typeof body.id !== 'string' || !body.id || !body.event || typeof body.event !== 'object' || Array.isArray(body.event) || Object.keys(body.event).some(key => !['eventId', 'type', 'activityId', 'round', 'revision', 'payload'].includes(key)) || typeof body.event.eventId !== 'string' || typeof body.event.type !== 'string' || !Number.isSafeInteger(body.event.round) || !Number.isSafeInteger(body.event.revision))) throw new Error('INVALID_BODY');
  if (body.action === 'tick' && (typeof body.id !== 'string' || !body.id || typeof body.eventId !== 'string' || !body.eventId || !Number.isSafeInteger(body.round) || !Number.isSafeInteger(body.revision))) throw new Error('INVALID_BODY');
  if (body.action === 'rotate-presenter' && (typeof body.id !== 'string' || !body.id || !Number.isSafeInteger(body.revision) || typeof body.requestId !== 'string' || !body.requestId || body.requestId.length > 80)) throw new Error('INVALID_BODY');
  return body;
}

export function normalizeLearnerName(value) {
  if (typeof value !== 'string') throw new Error('INVALID_NAME');
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40 || /^(__proto__|constructor|prototype)$/i.test(name)) throw new Error('INVALID_NAME');
  return name;
}

function bytes(value) { return new TextEncoder().encode(value).byteLength; }
function token() { return randomBytes(32).toString('base64url'); }
function sha(value) { return createHash('sha256').update(value).digest('hex'); }
function row(q) { return q.first(); }
function changes(result) { return Number(result?.meta?.changes ?? result?.changes ?? 0); }
function teacherDescriptorGamePlan(gamePlan, pkg) {
  if (!gamePlan || typeof gamePlan !== 'object') return null;
  const base = teacherGamePlan(gamePlan, pkg);
  if (!base) return null;
  const operational = {};
  if (gamePlan.adapter) operational.adapter = gamePlan.adapter;
  if (gamePlan.route) operational.route = JSON.parse(JSON.stringify(gamePlan.route));
  if (gamePlan.checkpoints) {
    const codes = new Map((pkg?.objectives || []).map((o) => [o.id, o.code]));
    operational.checkpoints = gamePlan.checkpoints.map((cp) => ({
      ...cp,
      objectiveCodes: (cp.objectiveCodes || cp.objectiveIds || []).map((id) => codes.get(id) || id).filter(Boolean)
    }));
  }
  if (gamePlan.roles) operational.roles = JSON.parse(JSON.stringify(gamePlan.roles));
  if (gamePlan.policy) operational.policy = JSON.parse(JSON.stringify(gamePlan.policy));
  if (gamePlan.execution) operational.execution = JSON.parse(JSON.stringify(gamePlan.execution));
  if (gamePlan.seed !== undefined) operational.seed = gamePlan.seed;
  if (gamePlan.deterministic !== undefined) operational.deterministic = gamePlan.deterministic;
  return {
    ...base,
    ...operational
  };
}

function projection(session, role, ownId = null, wall = null) {
  const state = JSON.parse(session.state);
  if (role === 'teacher') {
    const view = serializeForTeacher(state, wall);
    if (state.gamePlan) {
      view.gamePlan = teacherDescriptorGamePlan(state.gamePlan, state.package);
    }
    if (Number.isFinite(wall)) view.arena = serializeLessonArena(state, null, state.status === 'paused' ? state.clock.pausedAt : Math.max(wall, state.clock.lastNow), true);
    return view;
  }
  const view = role === 'presenter' ? serializeForPresenter(state, Number.isFinite(wall)?wall:state.clock?.lastNow) : serializeForStudent(state, ownId, Number.isFinite(wall)?wall:state.clock?.lastNow);
  if (Number.isFinite(wall)) view.arena = serializeLessonArena(state, role === 'presenter' ? null : ownId, state.status === 'paused' ? state.clock.pausedAt : Math.max(wall, state.clock.lastNow));
  return view;
}

function durableState(state) {
  const copy = JSON.parse(JSON.stringify(state));
  delete copy.package;
  delete copy.eventCache;
  // Passport answers hydrate from submissions; review copies stay readable by the previous Worker.
  for (const passport of Object.values(copy.passports || {})) for (const submission of passport.submissions || []) if (copy.submissions?.[submission.submissionId]) delete submission.answer;
  // Assessed records hydrate from canonical submissions; pending records stay fully readable on rollback.
  for(const [id,record] of Object.entries(copy.openAssessments || {}))if(record.status==='assessed'&&copy.submissions?.[id]){
    const sub=copy.submissions[id];
    for(const key of ['submissionId','learnerId','taskId','activityId','answer'])if(Object.hasOwn(record,key)&&JSON.stringify(record[key])===JSON.stringify(sub[key]))delete record[key];
    if(record.createdAt===sub.at)delete record.createdAt;
  }
  for (const [key,entry] of Object.entries(copy.rewardLedger || {})) if(entry.amount === 0)delete copy.rewardLedger[key];
  return packLessonState(copy);
}

function safeGamePlan(plan, pkg = null, adapterDescriptor = null) {
  if (!plan) return null;
  const base = teacherGamePlan(plan, pkg);
  if (!base) return null;
  if (!adapterDescriptor) return base;
  const activitySegments = new Map(
    (adapterDescriptor.route?.segments || []).map((seg) => [seg.activityId, seg])
  );
  const activityPlans = (base.activityPlans || []).map((act) => {
    const seg = activitySegments.get(act.id);
    return seg ? { ...act, mapSegment: { ...seg } } : act;
  });
  const codes = new Map((pkg?.objectives || []).map((o) => [o.id, o.code]));
  const checkpoints = (adapterDescriptor.checkpoints || base.checkpoints || []).map((cp) => ({
    ...cp,
    objectiveCodes: (cp.objectiveCodes || cp.objectiveIds || []).map((id) => codes.get(id) || id).filter(Boolean)
  }));
  return {
    ...base,
    activityPlans,
    adapter: adapterDescriptor.adapter,
    route: adapterDescriptor.route ? JSON.parse(JSON.stringify(adapterDescriptor.route)) : undefined,
    checkpoints,
    roles: adapterDescriptor.roles ? JSON.parse(JSON.stringify(adapterDescriptor.roles)) : undefined,
    policy: adapterDescriptor.policy ? JSON.parse(JSON.stringify(adapterDescriptor.policy)) : undefined,
    execution: adapterDescriptor.execution ? JSON.parse(JSON.stringify(adapterDescriptor.execution)) : undefined,
    seed: adapterDescriptor.seed !== undefined ? adapterDescriptor.seed : undefined,
    deterministic: adapterDescriptor.deterministic !== undefined ? adapterDescriptor.deterministic : undefined
  };
}

export function createLessonService({ db, now = () => Date.now() }) {
  const classes = createLessonClassService({ db, now });
  const devices = createLessonDeviceService({ db, now });
  const classMemberActive = async (session, learner) => {
    if (!session.class_id) return true;
    if (!learner.class_member_id) return false;
    return Boolean(await row(prepare('SELECT m.id FROM lesson_class_members m JOIN lesson_classes c ON c.id=m.class_id WHERE m.id=? AND c.id=? AND c.owner_account_id=? AND m.revoked_at IS NULL AND c.deleted_at IS NULL', learner.class_member_id, session.class_id, session.owner_account_id)));
  };
  const prepare = (sql, ...values) => db.prepare(sql).bind(...values);
  const getPackage = async (rowId) => row(prepare('SELECT * FROM lesson_packages WHERE row_id=?', rowId));
  const getPlan = async (rowId, planHash) => row(prepare('SELECT * FROM lesson_session_plans WHERE row_id=? AND plan_hash=?', rowId, planHash));
  const uploadedRefs = pkg => (pkg?.sourceRefs || []).filter(source => typeof source?.locator === 'string' && source.locator.startsWith('lesson-source:'));
  const parseUploadedRef = source => {
    const match = /^lesson-source:([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}):([A-Za-z0-9_.-]{1,64}):([0-9a-f]{64})$/.exec(source?.locator || '');
    if (!match || source.kind !== 'external' || source.id !== match[1] || !/^[0-9a-f]{64}$/.test(source.hash || '')) throw new Error('SOURCE_REVIEW_REQUIRED');
    return { id: match[1], revision: match[2], extractionHash: match[3], sha256: source.hash };
  };
  const verifyUploadedRefs = async (ownerAccountId, refs) => {
    const rows = [];
    for (const source of refs) {
      const expected = parseUploadedRef(source);
      const found = await row(prepare('SELECT id,sha256,parser_revision,extraction_hash,status FROM lesson_sources WHERE owner_account_id=? AND id=?', ownerAccountId, expected.id));
      if (!found || found.status !== 'ready' || found.sha256 !== expected.sha256 || found.parser_revision !== expected.revision || found.extraction_hash !== expected.extractionHash) throw new Error('SOURCE_REVIEW_REQUIRED');
      rows.push(found);
    }
    return rows;
  };
  const sourceGuard = (owner, rows, parent = null) => {
    const clauses = [], args = [];
    for (const found of rows) {
      clauses.push("EXISTS(SELECT 1 FROM lesson_sources WHERE id=? AND owner_account_id=? AND status='ready' AND sha256=? AND parser_revision=? AND extraction_hash=?)");
      args.push(found.id, owner, found.sha256, found.parser_revision, found.extraction_hash);
      if (parent) {
        clauses.push('EXISTS(SELECT 1 FROM lesson_package_sources WHERE package_row_id=? AND package_version=? AND package_hash=? AND source_id=? AND source_sha256=? AND extraction_revision=? AND extraction_hash=? AND owner_account_id=?)');
        args.push(parent.row_id, parent.version, parent.content_hash, found.id, found.sha256, found.parser_revision, found.extraction_hash, owner);
      }
    }
    return { sql: clauses.join(' AND ') || '1', args };
  };
  const sourceAssociations = (packageRow, ownerAccountId, refs, rows) => refs.map((source, index) => {
    const found = rows[index];
    return prepare(`INSERT INTO lesson_package_sources(package_row_id,package_version,package_hash,source_id,source_sha256,extraction_revision,extraction_hash,owner_account_id)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_packages WHERE row_id=? AND version=? AND content_hash=? AND owner_account_id=?)
      AND EXISTS(SELECT 1 FROM lesson_sources WHERE id=? AND owner_account_id=? AND status='ready' AND sha256=? AND parser_revision=? AND extraction_hash=?)`,
      packageRow.rowId, packageRow.version, packageRow.contentHash, found.id, found.sha256, found.parser_revision, found.extraction_hash, ownerAccountId,
      packageRow.rowId, packageRow.version, packageRow.contentHash, ownerAccountId, found.id, ownerAccountId, found.sha256, found.parser_revision, found.extraction_hash);
  });
  const verifyPackage = (record, mode = 'preview') => {
    if (!record) throw new Error('NOT_FOUND');
    const pkg = JSON.parse(record.data);
    if (hashPackage(pkg) !== record.content_hash || record.content_hash !== record.package_hash && record.package_hash !== undefined) throw new Error('PACKAGE_HASH_MISMATCH');
    if (mode === 'live' && !['approved', 'published'].includes(record.status)) throw new Error('ERR_PACKAGE_NOT_APPROVED');
    const validation = validateLessonPackage(pkg, { mode: mode === 'live' ? 'publish' : 'draft' });
    if (!validation.ok) throw new Error('INVALID_PACKAGE');
    return pkg;
  };
  const authRoom = async (session, accountId, action = 'read') => {
    const a = await row(prepare(`SELECT r.id,r.owner_account_id,r.deleted_at,m.role,m.revoked_at,sh.revoked_at AS system_revoked
      FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=?
      LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=?`, accountId, accountId, session.room_id));
    if (!a || a.deleted_at || a.owner_account_id !== session.owner_account_id || a.revoked_at || a.system_revoked) return null;
    if (a.owner_account_id !== accountId && !['owner', 'cohost'].includes(a.role)) return null;
    if (action === 'write' && a.owner_account_id !== accountId && a.role !== 'cohost') return null;
    return a;
  };
  const loadSession = async (id, mode = 'preview') => {
    const session = await row(prepare('SELECT s.*,p.data AS lesson_package_data,p.content_hash AS stored_package_hash,p.version AS package_version_verified,sp.data AS lesson_plan_data FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.version=s.package_version AND p.content_hash=s.package_hash LEFT JOIN lesson_session_plans sp ON sp.row_id=s.plan_row_id AND sp.plan_hash=s.plan_hash AND sp.package_row_id=s.package_row_id AND sp.package_version=s.package_version AND sp.package_hash=s.package_hash JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL WHERE s.id=?', id));
    if (!session) return null;
    if (typeof session.package_hash !== 'string' || session.package_hash !== session.stored_package_hash) throw new Error('PACKAGE_TUPLE_MISMATCH');
    const packageData = session.lesson_package_data;
    if (typeof packageData !== 'string') throw new Error('PACKAGE_TUPLE_MISMATCH');
    const pkg = verifyPackage({ data: packageData, content_hash: session.stored_package_hash, status: JSON.parse(packageData).status }, mode);
    const boundPackage = { ...pkg, rowId: session.package_row_id };
    if ((session.plan_row_id || session.plan_hash) && !session.lesson_plan_data) {
      throw new Error('PLAN_TUPLE_MISMATCH');
    }
    let safePlan = null;
    if (session.lesson_plan_data) {
      const plan = JSON.parse(session.lesson_plan_data);
      if (
        !plan.package ||
        typeof plan.package !== 'object' ||
        plan.package.id !== pkg.id ||
        plan.package.version !== session.package_version ||
        plan.package.contentHash !== session.package_hash ||
        (plan.package.rowId && plan.package.rowId !== session.package_row_id) ||
        (session.plan_hash && plan.contentHash !== session.plan_hash)
      ) {
        throw new Error('PLAN_TUPLE_MISMATCH');
      }
      if (hashSessionPlan(plan) !== plan.contentHash) {
        throw new Error('PLAN_HASH_MISMATCH');
      }
      if (plan.status === 'approved') {
        const planValidation = validateSessionPlan(plan, { package: boundPackage, mode: 'approved' });
        if (!planValidation.ok) throw new Error('INVALID_APPROVED_PLAN');
        const adapter = createGameAdapter({
          plan,
          package: boundPackage,
          seed: plan.director?.seed ?? session.id,
          sessionId: session.id
        });
        safePlan = safeGamePlan(plan, boundPackage, adapter);
      } else {
        const safeDescriptor = pilotGameDescriptor({
          draft: { status: plan.status, plan, reasonCodes: ['PLAN_NOT_APPROVED'] },
          package: boundPackage
        });
        safePlan = safeGamePlan(plan, boundPackage, safeDescriptor);
      }
    }
    const state = unpackLessonState(JSON.parse(session.state));
    for(const passport of Object.values(state.passports || {}))for(const submission of passport.submissions || [])if(!Object.hasOwn(submission,'answer') && state.submissions?.[submission.submissionId])submission.answer=state.submissions[submission.submissionId].answer;
    for(const [id,record] of Object.entries(state.openAssessments || {}))if(state.submissions?.[id]){
      const sub=state.submissions[id];
      for(const key of ['submissionId','learnerId','taskId','activityId','answer'])if(!Object.hasOwn(record,key))record[key]=sub[key];
      if(!Object.hasOwn(record,'createdAt'))record.createdAt=sub.at;
    }
    session.state = JSON.stringify({ ...state, package: pkg, gamePlan: safePlan, packageHash: session.package_hash, eventCache: {} });
    return session;
  };
  const learnerIdentity = async (session, learnerToken, actingLearnerId) => {
    const learner = await row(prepare('SELECT * FROM lesson_learners WHERE session_id=? AND token_hash=? AND present=1', session.id, sha(learnerToken || '')));
    if (learner) {
      if (actingLearnerId !== undefined || !(await classMemberActive(session, learner)) || !JSON.parse(session.state).roster?.[learner.learner_id]?.present) throw new Error('FORBIDDEN');
      return { learnerId: learner.learner_id, deviceId: null };
    }
    if (!session.class_id) throw new Error('FORBIDDEN');
    if(session.status==='concluded' && actingLearnerId===undefined) {
      const member=await classes.resolveMemberToken(learnerToken);if(member.classId!==session.class_id||member.ownerAccountId!==session.owner_account_id)throw Error('FORBIDDEN');
      const profile=await row(prepare('SELECT * FROM lesson_learners WHERE session_id=? AND class_member_id=? AND present=1',session.id,member.memberId));if(!profile||!JSON.parse(session.state).roster?.[profile.learner_id]?.present)throw Error('FORBIDDEN');return{learnerId:profile.learner_id,classMemberId:member.memberId,classCredential:true};
    }
    return devices.resolveActingLearner({ sessionId: session.id, deviceToken: learnerToken, learnerId: actingLearnerId });
  };
  // Events for one session all rewrite the same state blob. Running them one after another inside this server avoids every
  // request recomputing a state that another request is about to replace; the revision check still guards other servers.
  if (!queuesByDatabase.has(db)) queuesByDatabase.set(db,new Map());
  const sessionQueues = queuesByDatabase.get(db);
  function inTurn(key, work) {
    const run = (sessionQueues.get(key) || Promise.resolve()).then(work);
    const tail = run.catch(() => {});
    sessionQueues.set(key, tail);
    tail.then(() => { if (sessionQueues.get(key) === tail) sessionQueues.delete(key); });
    return run;
  }

  async function attemptJoin({ code, name, token: supplied, classToken }) {
  let normalized; const found = await row(prepare('SELECT s.id FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id WHERE r.code=? AND r.deleted_at IS NULL', code)); const session = found ? await loadSession(found.id) : null; if (!session) throw new Error('NOT_FOUND');
  let member = null;
  if (session.class_id) { member = await classes.resolveMemberToken(classToken); if (member.classId !== session.class_id || member.ownerAccountId !== session.owner_account_id) throw new Error('FORBIDDEN'); normalized = normalizeLearnerName(member.name); }
  else normalized = normalizeLearnerName(name);
  const raw = supplied || token(), tokenHash = sha(raw); const existing = await row(prepare('SELECT * FROM lesson_learners WHERE session_id=? AND token_hash=?', session.id, tokenHash));
  if (existing) {
    if (!(await classMemberActive(session, existing)) || member && existing.class_member_id !== member.memberId) throw new Error('FORBIDDEN');
    if (existing.name_key !== (member ? member.memberId : normalized.toLocaleLowerCase())) throw new Error('LEARNER_IDENTITY_MISMATCH');
    if (!existing.present || !JSON.parse(session.state).roster?.[existing.learner_id]?.present) throw new Error('FORBIDDEN');
    return { learnerId: existing.learner_id, token: supplied ? undefined : raw, projection: projection(session, 'student', existing.learner_id) };
  }
  const nameKey = member ? member.memberId : normalized.toLocaleLowerCase(); const learnerId = randomUUID(), nonce = randomUUID(), time = now();
  const nextState = JSON.parse(session.state);
  if (member) {
    const profile = await row(prepare('SELECT * FROM lesson_learners WHERE session_id=? AND class_member_id=?', session.id, member.memberId));
    if (profile) {
      if (!profile.present || !nextState.roster?.[profile.learner_id]?.present) throw new Error('FORBIDDEN');
      nextState.revision = session.revision + 1;
      const resumed = await db.batch([
        prepare('UPDATE lesson_sessions SET state=?,revision=revision+1,mutation_nonce=?,updated_at=? WHERE id=? AND revision=? AND status<>\'concluded\' AND EXISTS(SELECT 1 FROM lesson_class_members cm JOIN lesson_classes cc ON cc.id=cm.class_id JOIN lesson_class_login_sessions cs ON cs.member_id=cm.id WHERE cm.id=? AND cm.class_id=lesson_sessions.class_id AND cc.owner_account_id=lesson_sessions.owner_account_id AND cm.revoked_at IS NULL AND cc.deleted_at IS NULL AND cs.token_hash=? AND cs.expires_at>?) AND EXISTS(SELECT 1 FROM lesson_learners l WHERE l.id=? AND l.present=1 AND l.token_hash=?)', JSON.stringify(durableState(nextState)), nonce, time, session.id, session.revision, member.memberId, sha(classToken), time, profile.id, profile.token_hash),
        prepare('UPDATE lesson_learners SET token_hash=? WHERE id=? AND token_hash=? AND present=1 AND EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)', tokenHash, profile.id, profile.token_hash, session.id, nonce)
      ]);
      if (resumed.some(result => !changes(result))) throw new Error('JOIN_CONFLICT');
      return { learnerId: profile.learner_id, token: supplied ? undefined : raw, resumed: true, projection: projection(await loadSession(session.id), 'student', profile.learner_id) };
    }
  }
  const added = reduceLessonSession(nextState, { eventId: `join:${learnerId}`, type: 'ADD_LEARNER', round: nextState.round, revision: nextState.revision, payload: { learner: { id: learnerId, name: normalized, ...(member?.teamId ? { teamId: member.teamId } : {}) } } }, { actor: { role: 'teacher', id: session.owner_account_id }, now: time });
  if (!added.result.ok) throw new Error(added.result.code || 'JOIN_CONFLICT');
  delete added.state.eventCache; added.state.eventCache = {};
  const state = JSON.stringify(durableState(added.state)); if (bytes(state) > MAX_STATE_BYTES) throw new Error('STATE_TOO_LARGE');
  const memberGuard = member ? ' AND EXISTS(SELECT 1 FROM lesson_class_members cm JOIN lesson_classes cc ON cc.id=cm.class_id JOIN lesson_class_login_sessions cs ON cs.member_id=cm.id WHERE cm.id=? AND cm.class_id=lesson_sessions.class_id AND cc.owner_account_id=lesson_sessions.owner_account_id AND cc.deleted_at IS NULL AND cm.revoked_at IS NULL AND cs.token_hash=? AND cs.expires_at>?)' : '';
  const batch = await db.batch([
    prepare(`UPDATE lesson_sessions SET state=?,revision=revision+1,mutation_nonce=?,updated_at=? WHERE id=? AND revision=? AND status <> 'concluded' AND EXISTS(SELECT 1 FROM rooms WHERE id=lesson_sessions.room_id AND deleted_at IS NULL AND owner_account_id=lesson_sessions.owner_account_id)${memberGuard}`, state, nonce, time, session.id, session.revision, ...(member ? [member.memberId, sha(classToken), time] : [])),
    prepare(`INSERT INTO lesson_learners(id,session_id,learner_id,name,name_key,token_hash,present,created_at${member ? ',class_member_id' : ''}) SELECT ?,?,?,?,?,?,1,?${member ? ',?' : ''} WHERE EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)`, randomUUID(), session.id, learnerId, normalized, nameKey, tokenHash, time, ...(member ? [member.memberId] : []), session.id, nonce),
  ]);
  if (!changes(batch[0]) || !changes(batch[1])) throw new Error('JOIN_CONFLICT');
  const fresh = await loadSession(session.id); return { learnerId, token: supplied ? undefined : raw, projection: projection(fresh, 'student', learnerId) };
  }

  async function retryJoin(args) {
    // Joins serialize on the session revision; retry the lost races, and never show database text to pupils.
    for (let attempt = 0; ; attempt += 1) {
      try { return await attemptJoin(args); } catch (raw) {
        const error = /name_key/.test(raw.message) ? new Error('NAME_TAKEN') : /token_hash/.test(raw.message) ? new Error('JOIN_CONFLICT') : raw;
        if (error.message !== 'JOIN_CONFLICT' || attempt >= JOIN_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.random() * Math.min(400, 20 * 2 ** attempt)));
      }
    }
  }

  async function retryEvent(args) {
    for (let attempt = 0; ; attempt += 1) {
      try { return await attemptEvent(args); } catch (error) {
        if (error.message !== 'EVENT_RACE') throw error;
        if (attempt >= EVENT_RETRIES) throw new Error('EVENT_CONFLICT');
        await new Promise(resolve => setTimeout(resolve, Math.random() * Math.min(400, 20 * 2 ** attempt)));
      }
    }
  }

  async function attemptEvent({ sessionId, accountId, learnerToken, actingLearnerId, event }) {
    if (bytes(JSON.stringify(event)) > MAX_EVENT_BYTES) throw new Error('BODY_TOO_LARGE');
    const session = await loadSession(sessionId); if (!session) throw new Error('NOT_FOUND');
    let actor; let role; let ownId = null; let device = null; let classIdentity = null;
    if (learnerToken) {
      const identity = await learnerIdentity(session, learnerToken, actingLearnerId); device = identity.deviceId ? identity : null;classIdentity = identity.classCredential ? identity : null;
      actor = { role: 'student', id: identity.learnerId }; role = 'student'; ownId = identity.learnerId;
    }
    else if (accountId) { if (!(await authRoom(session, accountId, 'write'))) throw new Error('FORBIDDEN'); actor = { role: 'teacher', id: accountId, authorizedHostId: session.owner_account_id }; role = 'teacher'; }
    else throw new Error('FORBIDDEN');
    const actorKey = device ? `${actor.id}:device:${device.deviceId}` : actor.id;
    const fingerprint = sha(canonicalize({ event, sessionId, actor: actor.id, ...(device ? { deviceId: device.deviceId } : {}) })); const prior = await row(prepare('SELECT * FROM lesson_event_receipts WHERE session_id=? AND actor_key=? AND event_id=?', sessionId, actorKey, event?.eventId));
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('EVENT_ID_CONFLICT');
      if (learnerToken) await learnerIdentity(session, learnerToken, actingLearnerId);
      else if (!(await authRoom(session, accountId, 'write'))) throw new Error('FORBIDDEN');
      const replayTime = now();
      return { result: { ...JSON.parse(prior.result), replay: true }, view: projection(session, role, ownId, replayTime), serverNow: replayTime, revision: session.revision };
    }
    const current = JSON.parse(session.state);
    if(role==='teacher'&&event?.type==='CLASS_EVENT_OPEN'&&event.payload?.type==='duel'&&session.class_id)actor.duelDevicePairs=await devices.duelDevicePairs({accountId,sessionId});
    if (event?.type === 'TEACHER_RESPONSE') {
      if (role !== 'teacher') throw new Error('FORBIDDEN');
      await devices.authorizeBoardResponse({ accountId, sessionId, learnerId: event.payload?.learnerId, taskId: event.payload?.taskId, answer: event.payload?.answer });
    }
    // Commands about one pupil, or plain lesson flow, are bound to the activity and round they target, which the reducer still
    // enforces; the whole-session revision only matters for commands that read shared content, so they follow the latest state.
    const rebased = (role === 'student' ? REBASED_STUDENT_COMMANDS : REBASED_TEACHER_COMMANDS).has(event?.type);
    const applied = rebased ? { ...event, revision: current.revision } : event;
    const reduced = reduceLessonSession(current, applied, { actor, now: now() }); if (!reduced.result.ok) throw new Error(reduced.result.code || 'EVENT_REJECTED');
    delete reduced.state.eventCache; reduced.state.eventCache = {};
    const state = JSON.stringify(durableState(reduced.state)); if (bytes(state) > MAX_STATE_BYTES) throw new Error('STATE_TOO_LARGE'); const nonce = randomUUID(), time = now();
    const safeResult = { ...reduced.result, revision: session.revision + 1 };
    const authority = role === 'teacher'
      ? `EXISTS(SELECT 1 FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=? LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=lesson_sessions.room_id AND r.deleted_at IS NULL AND r.owner_account_id=lesson_sessions.owner_account_id AND (r.owner_account_id=? OR (m.role IN ('owner','cohost') AND m.revoked_at IS NULL)) AND sh.revoked_at IS NULL)`
      : classIdentity ? `EXISTS(SELECT 1 FROM lesson_class_login_sessions cs JOIN lesson_class_members cm ON cm.id=cs.member_id JOIN lesson_classes cc ON cc.id=cm.class_id JOIN lesson_learners l ON l.class_member_id=cm.id AND l.session_id=lesson_sessions.id WHERE cs.token_hash=? AND cs.expires_at>? AND cm.id=? AND cm.revoked_at IS NULL AND cc.deleted_at IS NULL AND cc.id=lesson_sessions.class_id AND cc.owner_account_id=lesson_sessions.owner_account_id AND l.learner_id=? AND l.present=1 AND lesson_sessions.status='concluded')` : device ? `EXISTS(SELECT 1 FROM lesson_devices d JOIN lesson_device_members dm ON dm.device_id=d.id AND dm.session_id=d.session_id JOIN lesson_learners l ON l.session_id=d.session_id AND l.learner_id=dm.learner_id AND l.class_member_id=dm.class_member_id JOIN lesson_class_members cm ON cm.id=l.class_member_id AND cm.class_id=lesson_sessions.class_id JOIN lesson_classes cc ON cc.id=cm.class_id JOIN rooms r ON r.id=lesson_sessions.room_id WHERE d.id=? AND d.token_hash=? AND d.session_id=lesson_sessions.id AND d.kind='B' AND d.revoked_at IS NULL AND d.expires_at>? AND dm.learner_id=? AND l.present=1 AND cm.revoked_at IS NULL AND cc.deleted_at IS NULL AND cc.owner_account_id=lesson_sessions.owner_account_id AND r.deleted_at IS NULL AND r.owner_account_id=lesson_sessions.owner_account_id AND EXISTS(SELECT 1 FROM rooms ir LEFT JOIN room_memberships im ON im.room_id=ir.id AND im.account_id=d.issued_by LEFT JOIN system_hosts ish ON ish.account_id=d.issued_by WHERE ir.id=r.id AND ish.revoked_at IS NULL AND (ir.owner_account_id=d.issued_by OR (im.role IN ('owner','cohost') AND im.revoked_at IS NULL))))`
      : `EXISTS(SELECT 1 FROM lesson_learners l JOIN rooms r ON r.id=lesson_sessions.room_id WHERE l.session_id=lesson_sessions.id AND l.learner_id=? AND l.token_hash=? AND l.present=1 AND r.deleted_at IS NULL${session.class_id ? ' AND EXISTS(SELECT 1 FROM lesson_class_members cm JOIN lesson_classes cc ON cc.id=cm.class_id WHERE cm.id=l.class_member_id AND cm.class_id=lesson_sessions.class_id AND cc.owner_account_id=lesson_sessions.owner_account_id AND cc.deleted_at IS NULL AND cm.revoked_at IS NULL)' : ''})`;
    const authorityValues = role === 'teacher' ? [accountId, accountId, accountId] : classIdentity ? [sha(learnerToken),time,classIdentity.classMemberId,actor.id] : device ? [device.deviceId, sha(learnerToken), time, actor.id] : [actor.id, sha(learnerToken || '')];
    const boardGuard = event.type === 'TEACHER_RESPONSE' ? ' AND EXISTS(SELECT 1 FROM lesson_learners l JOIN lesson_class_members cm ON cm.id=l.class_member_id AND cm.class_id=lesson_sessions.class_id JOIN lesson_classes cc ON cc.id=cm.class_id WHERE l.session_id=lesson_sessions.id AND l.learner_id=? AND l.present=1 AND cm.revoked_at IS NULL AND cc.deleted_at IS NULL AND cc.owner_account_id=lesson_sessions.owner_account_id)' : '';
    const statements = [
      prepare(`UPDATE lesson_sessions SET state=?,revision=?,status=?,mutation_nonce=?,updated_at=? WHERE id=? AND revision=? AND ${authority}${boardGuard}`, state, session.revision + 1, reduced.state.status, nonce, time, sessionId, session.revision, ...authorityValues, ...(boardGuard ? [event.payload.learnerId] : [])),
      prepare('INSERT INTO lesson_event_receipts(id,session_id,actor_key,event_id,fingerprint,result,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)', randomUUID(), sessionId, actorKey, event.eventId, fingerprint, JSON.stringify(safeResult), time, sessionId, nonce),
      prepare('INSERT INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)', randomUUID(), accountId || null, session.room_id, 'lesson-event', JSON.stringify({eventId: event.eventId, type: event.type}), time, sessionId, nonce),
    ];
    if (event.type === 'LEAVE_LEARNER' || event.type === 'ADD_LEARNER') {
      const targetId = event.type === 'LEAVE_LEARNER' ? event.payload.learnerId : event.payload.learner.id;
      statements.push(prepare('UPDATE lesson_learners SET present=? WHERE session_id=? AND learner_id=? AND EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)', Number(reduced.state.roster[targetId].present), sessionId, targetId, sessionId, nonce));
    }
    const batch = await db.batch(statements);
    if (!changes(batch[0]) || !changes(batch[1]) || !changes(batch[2])) {
      // Another event committed first when the stored revision has moved on; that is a lost race, not missing permission.
      const latest = await loadSession(sessionId);
      if (latest && latest.revision !== session.revision) throw new Error(rebased ? 'EVENT_RACE' : 'EVENT_CONFLICT');
      throw new Error(role === 'teacher' ? 'FORBIDDEN_OR_CONFLICT' : 'FORBIDDEN');
    }
    if (session.class_id && JSON.parse(session.state).mode !== 'preview' && ['approved', 'published'].includes(JSON.parse(session.lesson_package_data).status) && ['SUBMIT','ASSESS','REVISIT_SUBMIT','HINT','REVEAL','TEACHER_RESPONSE','CONCLUDE'].includes(event.type)) {
      const affectedId = role === 'student' ? ownId : event.type === 'ASSESS' ? reduced.state.submissions[event.payload.submissionId]?.learnerId : event.type === 'TEACHER_RESPONSE' ? event.payload.learnerId : null;
      const affectedMember = affectedId ? await row(prepare('SELECT class_member_id FROM lesson_learners WHERE session_id=? AND learner_id=?',sessionId,affectedId)) : null;
      try { await classes.syncSessionEvidence({ ownerAccountId: session.owner_account_id, sessionId, memberId: affectedMember?.class_member_id || null }); }
      catch (error) { if (error.message !== 'EVIDENCE_SNAPSHOT_CHANGED') throw error; safeResult.passportSyncPending = true; }
    }
    const fresh = await loadSession(sessionId); return { result: safeResult, view: projection(fresh, role, ownId, time), serverNow: time, revision: fresh.revision };
  }

  return {
    hashToken: sha,
    async savePackage({ ownerAccountId, package: input }) {
      if (!ownerAccountId || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_PACKAGE');
      const pkg = JSON.parse(JSON.stringify(input)); delete pkg.contentHash;
      if (!SEMVER.test(pkg.version || '') || typeof pkg.id !== 'string' || bytes(JSON.stringify(pkg)) > MAX_PACKAGE_BYTES) throw new Error('INVALID_PACKAGE');
      if (!['draft', 'needs_review'].includes(pkg.status || 'draft')) throw new Error('INVALID_PACKAGE_STATUS');
      pkg.contentHash = hashPackage(pkg);
      const validation = validateLessonPackage(pkg, { mode: 'draft' });
      if (!validation.ok) throw Object.assign(new Error('INVALID_PACKAGE'), { validationErrors: validation.errors });
      if (pkg.id.startsWith('proposal-')) {
        const job = await row(prepare('SELECT result_json FROM lesson_generation_jobs WHERE owner_account_id=? AND id=?', ownerAccountId, pkg.id.slice('proposal-'.length)));
        if (!job?.result_json) throw new Error('SOURCE_REVIEW_REQUIRED');
        const generated = JSON.parse(job.result_json).package;
        const snapshot = ref => ({ id: ref.id, kind: ref.kind, locator: ref.locator, hash: ref.hash });
        if (canonicalize(pkg.sourceRefs.map(snapshot)) !== canonicalize(generated.sourceRefs.map(snapshot))) throw new Error('SOURCE_REVIEW_REQUIRED');
        for (const task of generated.tasks) {
          const edited = pkg.tasks.find(item => item.id === task.id);
          if (!edited || canonicalize(edited.sourceRefs) !== canonicalize(task.sourceRefs) || canonicalize(edited.metadata?.sourceCitation) !== canonicalize(task.metadata?.sourceCitation) || task.metadata?.numericReviewRequired && edited.metadata?.numericReviewRequired !== true) throw new Error('SOURCE_REVIEW_REQUIRED');
        }
      }
      const rowData = { rowId: randomUUID(), ownerAccountId, packageId: pkg.id, version: pkg.version, contentHash: pkg.contentHash, status: pkg.status || 'draft', data: JSON.stringify(pkg), createdAt: now() };
      const refs = uploadedRefs(pkg);
      const sourceRows = refs.length ? await verifyUploadedRefs(ownerAccountId, refs) : [];
      const guard = sourceGuard(ownerAccountId, sourceRows);
      const packageInsert = prepare(`INSERT INTO lesson_packages(row_id,owner_account_id,package_id,version,content_hash,status,data,parent_row_id,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard.sql}`, rowData.rowId, rowData.ownerAccountId, rowData.packageId, rowData.version, rowData.contentHash, rowData.status, rowData.data, null, rowData.createdAt, ...guard.args);
      const committed = refs.length ? await db.batch([packageInsert, ...sourceAssociations(rowData, ownerAccountId, refs, sourceRows)]) : null;
      const result = refs.length ? committed[0] : await packageInsert.run();
      if (!changes(result)) throw new Error(refs.length ? 'SOURCE_REVIEW_REQUIRED' : 'DUPLICATE_VERSION');
      if (refs.length && committed.slice(1).some(result => !changes(result))) throw new Error('SOURCE_REVIEW_REQUIRED');
      return { package: pkg, row: rowData };
    },
    async listPackages({ actorAccountId, isRoot = false }) {
      const result = await prepare(`SELECT row_id,owner_account_id,package_id,version,content_hash,status,parent_row_id,created_at FROM lesson_packages ${isRoot ? '' : 'WHERE owner_account_id=?'} ORDER BY created_at DESC`, ...(isRoot ? [] : [actorAccountId])).all();
      return result.results || [];
    },
    async getPackage({ actorAccountId, isRoot = false, id }) {
      const record = await getPackage(id);
      if (!record || (!isRoot && record.owner_account_id !== actorAccountId)) throw new Error('NOT_FOUND');
      return { ...record, package: verifyPackage(record) };
    },
    async getDirectorDraft({ actorAccountId, isRoot = false, id }) {
      const record = await getPackage(id);
      if (!record || (!isRoot && record.owner_account_id !== actorAccountId)) throw new Error('NOT_FOUND');
      const pkg = { ...verifyPackage(record), rowId: record.row_id };
      const draft = createDirector().pilotDraft({ package: pkg });
      const safeDescriptor = draft.plan ? pilotGameDescriptor({ draft, package: pkg }) : null;
      return {
        package: { rowId: record.row_id, id: record.package_id, version: record.version, contentHash: record.content_hash },
        status: draft.status,
        reasonCodes: draft.reasonCodes,
        alternatives: draft.alternatives,
        uncertainties: draft.uncertainties,
        confidence: draft.confidence,
        plan: draft.plan,
        gamePlan: draft.plan ? safeGamePlan(draft.plan, pkg, safeDescriptor) : null
      };
    },
    async approvePlan({ actorAccountId, packageRowId, packageVersion, packageHash, planHash, sourceReview }) {
      if (!Array.isArray(sourceReview)) throw new Error('SOURCE_REVIEW_REQUIRED');
      const record = await getPackage(packageRowId);
      if (!record || record.owner_account_id !== actorAccountId || record.version !== packageVersion || record.content_hash !== packageHash) throw new Error('APPROVAL_CONFLICT');
      const pkg = JSON.parse(record.data);
      if (record.status !== 'approved' || !Array.isArray(pkg.sourceRefs) || pkg.sourceRefs.some(source => source.verification !== 'verified')) throw new Error('SOURCE_REVIEW_REQUIRED');
      const expected = (pkg.sourceRefs || []).map(source => `${source.id}\u0000${source.locator}`).sort();
      const received = sourceReview.map(source => `${source?.id}\u0000${source?.locator}`).sort();
      if (expected.length !== received.length || expected.some((value, index) => value !== received[index])) throw new Error('SOURCE_ACK_MISMATCH');
      const boundPackage = { ...pkg, rowId: record.row_id };
      const draft = createDirector().pilotDraft({ package: boundPackage });
      if (!draft.plan || draft.plan.contentHash !== planHash) throw new Error('PLAN_HASH_MISMATCH');
      const plan = createSessionPlan({ package: boundPackage, theme: draft.plan.theme, map: draft.plan.map, rule: draft.plan.rule, participation: draft.plan.participation, devices: draft.plan.devices, status: 'approved', policies: draft.plan.policies, director: draft.plan.director });
      const validation = validateSessionPlan(plan, { package: boundPackage, mode: 'approved' });
      if (!validation.ok) throw new Error('INVALID_APPROVED_PLAN');
      const rowData = { rowId: randomUUID(), ownerAccountId: record.owner_account_id, packageRowId, packageVersion, packageHash, planHash: plan.contentHash, data: JSON.stringify(plan), sourceReview: JSON.stringify(sourceReview), approvedBy: actorAccountId, createdAt: now() };
      const result = await prepare('INSERT INTO lesson_session_plans(row_id,owner_account_id,package_row_id,package_version,package_hash,plan_hash,data,source_review,approved_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)', rowData.rowId, rowData.ownerAccountId, rowData.packageRowId, rowData.packageVersion, rowData.packageHash, rowData.planHash, rowData.data, rowData.sourceReview, rowData.approvedBy, rowData.createdAt).run();
      if (!changes(result)) throw new Error('APPROVAL_CONFLICT');
      return { plan, row: rowData };
    },
    async approvePackage({ actorAccountId, isRoot = false, id, parentHash, version, sourceReviewAck, notes }) {
      if (!SEMVER.test(version || '') || !Array.isArray(sourceReviewAck) || (notes && String(notes).length > 2000)) throw new Error('INVALID_APPROVAL');
      const parent = await getPackage(id); if (!parent || (!isRoot && parent.owner_account_id !== actorAccountId) || parent.content_hash !== parentHash) throw new Error('APPROVAL_CONFLICT');
      const pkg = verifyPackage(parent); const refs = Array.isArray(pkg.sourceRefs) ? pkg.sourceRefs : [];
      const uploaded = uploadedRefs(pkg);
      if (uploaded.length && actorAccountId !== parent.owner_account_id) throw new Error('SOURCE_REVIEW_REQUIRED');
      const sourceRows = uploaded.length ? await verifyUploadedRefs(parent.owner_account_id, uploaded) : [];
      const guard = sourceGuard(parent.owner_account_id, sourceRows, parent);
      if (uploaded.length && !await row(prepare(`SELECT 1 WHERE ${guard.sql}`, ...guard.args))) throw new Error('SOURCE_REVIEW_REQUIRED');
      const expected = refs.map(x => `${x.id}\u0000${x.locator}`).sort();
      const received = sourceReviewAck.map(x => `${x?.id}\u0000${x?.locator}`).sort();
      if (expected.length !== received.length || expected.some((x, i) => x !== received[i])) throw new Error('SOURCE_ACK_MISMATCH');
      const acknowledged = new Map(sourceReviewAck.map(x => [`${x?.id}\u0000${x?.locator}`, x]));
      for (const ref of refs) {
        if (pkg.tasks.some(task => task.metadata?.numericReviewRequired === true && task.sourceRefs.includes(ref.id)) && acknowledged.get(`${ref.id}\u0000${ref.locator}`)?.numericReviewConfirmed !== true) throw new Error('NUMERIC_REVIEW_REQUIRED');
      }
      const approved = { ...pkg, version, status: 'approved', sourceRefs: refs.map(ref => ({ ...ref, verification: acknowledged.has(`${ref.id}\u0000${ref.locator}`) ? 'verified' : ref.verification })) };
      delete approved.contentHash;
      approved.contentHash = hashPackage(approved);
      const publishValidation = validateLessonPackage(approved, { mode: 'publish' });
      if (!publishValidation.ok) throw new Error('INVALID_APPROVED_PACKAGE');
      const newRow = { rowId: randomUUID(), ownerAccountId: parent.owner_account_id, packageId: parent.package_id, version, contentHash: approved.contentHash, status: 'approved', data: JSON.stringify(approved), parentRowId: parent.row_id, createdAt: now() };
      const statements = [prepare(`INSERT INTO lesson_packages(row_id,owner_account_id,package_id,version,content_hash,status,data,parent_row_id,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_packages WHERE row_id=? AND content_hash=? AND owner_account_id=?) AND ${guard.sql}`, newRow.rowId, parent.owner_account_id, newRow.packageId, version, newRow.contentHash, 'approved', newRow.data, parent.row_id, newRow.createdAt, parent.row_id, parentHash, parent.owner_account_id, ...guard.args), prepare('INSERT INTO lesson_approvals(id,package_row_id,actor_account_id,reviewed_parent_hash,approved_hash,source_ack,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_packages WHERE row_id=?)', randomUUID(), newRow.rowId, actorAccountId, parentHash, newRow.contentHash, JSON.stringify(sourceReviewAck), newRow.createdAt, newRow.rowId)];
      if (uploaded.length) statements.push(...sourceAssociations(newRow, parent.owner_account_id, uploaded, sourceRows));
      const committed = await db.batch(statements);
      if (!changes(committed[0]) || !changes(committed[1]) || (uploaded.length && committed.slice(2).some(result => !changes(result)))) throw new Error(uploaded.length ? 'SOURCE_REVIEW_REQUIRED' : 'APPROVAL_CONFLICT');
      return { package: approved, row: newRow };
    },
    async createSession({ ownerAccountId, packageRowId, packageVersion, packageHash, planRowId, planHash, mode = 'preview', title = '', requestId, classId, teacherSetup }) {
      if (!ownerAccountId || typeof title !== 'string' || title.length > 120 || !requestId || requestId.length > 80) throw new Error('INVALID_REQUEST');
      if (classId) await classes.getClass({ ownerAccountId, classId });
      const requestFingerprint = sha(canonicalize({ packageRowId, packageVersion, packageHash, planRowId, planHash, mode, title, requestId, classId, ...(teacherSetup !== undefined ? {teacherSetup} : {}) }));
      const replay = await row(prepare('SELECT s.id,s.room_id,r.code,s.package_hash,s.revision,s.request_fingerprint FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id WHERE s.owner_account_id=? AND s.request_id=?', ownerAccountId, requestId));
      if (replay) {
        if (replay.request_fingerprint !== requestFingerprint) throw new Error('REQUEST_ID_CONFLICT');
        return { session: { id: replay.id, roomId: replay.room_id, code: replay.code, packageHash: replay.package_hash, revision: replay.revision }, replay: true };
      }
      const record = await getPackage(packageRowId); if (!record || record.owner_account_id !== ownerAccountId) throw new Error('FORBIDDEN');
      if (packageVersion && record.version !== packageVersion || packageHash && record.content_hash !== packageHash) throw new Error('PACKAGE_TUPLE_MISMATCH');
      let approvedPlan = null;
      if (planRowId || planHash || mode === 'live') {
        if (!planRowId || !planHash) throw new Error('PLAN_REQUIRED');
        const planRecord = await getPlan(planRowId, planHash);
        if (!planRecord || planRecord.package_row_id !== record.row_id || planRecord.package_version !== record.version || planRecord.package_hash !== record.content_hash || planRecord.owner_account_id !== record.owner_account_id || planRecord.owner_account_id !== ownerAccountId) throw new Error('PLAN_TUPLE_MISMATCH');
        approvedPlan = JSON.parse(planRecord.data);
        if (approvedPlan.status !== 'approved' || hashSessionPlan(approvedPlan) !== planRecord.plan_hash) throw new Error('PLAN_HASH_MISMATCH');
        const planValidation = validateSessionPlan(approvedPlan, { package: { ...JSON.parse(record.data), rowId: record.row_id }, mode: 'approved' });
        if (!planValidation.ok) throw new Error('INVALID_APPROVED_PLAN');
      }
      const pkg = verifyPackage(record, mode);
      const setup = teacherSetup === undefined ? null : normalizeTeacherSetup(teacherSetup, pkg);
      const roomId = randomUUID(), sessionId = randomUUID(), presenterToken = token(), nonce = randomUUID(), code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(), time = now();
      const state = createLessonSession({ package: pkg, mode, sessionId, hostId: ownerAccountId, now: time });
      if (setup) {
        state.teacherSetup = setup;
        state.modeParticipation = setup.participation;
        state.lessonIntegrations = [...setup.integrationIds];
        state.aiPolicy = setup.aiPolicy;
        state.revisitEnabled = setup.revisitEnabled;
        const error = explorationCommand(state,{type:'EXPLORATION_CONFIG',payload:{enabled:setup.explorationEnabled}},{role:'teacher',id:ownerAccountId},time);
        if(error)throw Error(error);
      }
      const classGuard = classId ? 'EXISTS(SELECT 1 FROM lesson_classes WHERE id=? AND owner_account_id=? AND deleted_at IS NULL)' : '1=1';
      const classValues = classId ? [classId, ownerAccountId] : [];
      const insertedRoom = 'EXISTS(SELECT 1 FROM rooms WHERE id=? AND owner_account_id=? AND deleted_at IS NULL)';
      const statements = [
        prepare(`INSERT INTO rooms(id,code,admin_hash,title,created,revision,mode,owner_account_id) SELECT ?,?,?,?,?,0,'lesson',? WHERE ${classGuard}`, roomId, code, sha(randomUUID()), title || pkg.id, time, ownerAccountId, ...classValues),
        prepare(`INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) SELECT ?,?,?,?,? WHERE ${insertedRoom}`, roomId, ownerAccountId, 'owner', time, ownerAccountId, roomId, ownerAccountId),
        prepare(`INSERT INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE ${insertedRoom}`, randomUUID(), ownerAccountId, roomId, 'create-lesson-session', JSON.stringify({requestId, sessionId}), time, roomId, ownerAccountId),
        prepare(`INSERT INTO lesson_sessions(id,room_id,package_row_id,package_version,package_hash,plan_row_id,plan_hash,owner_account_id,request_id,request_fingerprint,state,revision,status,mutation_nonce,presenter_token_hash,created_at,updated_at${classId ? ',class_id' : ''}) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?${classId ? ',?' : ''} WHERE ${insertedRoom}`, sessionId, roomId, record.row_id, record.version, record.content_hash, approvedPlan ? planRowId : null, approvedPlan ? planHash : null, ownerAccountId, requestId, requestFingerprint, JSON.stringify(durableState(state)), 0, 'waiting', nonce, sha(presenterToken), time, time, ...(classId ? [classId] : []), roomId, ownerAccountId)
      ];
      const out = await db.batch(statements); if (out.some(result => !changes(result))) throw new Error('FORBIDDEN');
      return { session: { id: sessionId, roomId, code, packageHash: record.content_hash, revision: 0 }, presenterToken };
    },
    async joinSession(args) {
      const found = typeof args?.code === 'string' ? await row(prepare('SELECT s.id FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id WHERE r.code=? AND r.deleted_at IS NULL', args.code)) : null;
      return inTurn(found?.id || 'join:' + args?.code, () => retryJoin(args));
    },
    event(args) {
      return inTurn(args.sessionId, () => retryEvent(args));
    },
    async getSession({ id, accountId, presenterToken, learnerToken, actingLearnerId, presenterViewer = false }) {
      const session = await loadSession(id); if (!session) throw new Error('NOT_FOUND'); let role = 'student', own = null;
      if (learnerToken) { own = (await learnerIdentity(session, learnerToken, actingLearnerId)).learnerId; }
      else if (accountId) { if (!(await authRoom(session, accountId))) throw new Error('FORBIDDEN'); role = presenterViewer ? 'presenter' : 'teacher'; }
      else if (presenterToken) { if (sha(presenterToken) !== session.presenter_token_hash) throw new Error('FORBIDDEN'); role = 'presenter'; }
      else { own = (await learnerIdentity(session, learnerToken, actingLearnerId)).learnerId; }
      const time = now();
      const view = projection(session, role, own, time);
      if (learnerToken) await learnerIdentity(session, learnerToken, actingLearnerId);
      return { view, serverNow: time, revision: session.revision };
    },
    async tick({ id, accountId, isRoot = false, round, revision, eventId }) {
      const session = await loadSession(id); if (!session) throw new Error('NOT_FOUND');
      if (!isRoot && !(await authRoom(session, accountId, 'write'))) throw new Error('FORBIDDEN');
      const actorKey = accountId, fingerprint = sha(canonicalize({ type: 'TICK', round, revision, id, actorKey }));
      const prior = await row(prepare('SELECT * FROM lesson_event_receipts WHERE session_id=? AND actor_key=? AND event_id=?', id, actorKey, eventId));
      if (prior) { if (prior.fingerprint !== fingerprint) throw new Error('EVENT_ID_CONFLICT'); return { result: JSON.parse(prior.result), replay: true }; }
      const reduced = reduceLessonSession(JSON.parse(session.state), { eventId, type: 'TICK', round, revision, payload: {} }, { actor: { role: 'system', id: 'system' }, now: now() });
      if (!reduced.result.ok) throw new Error(reduced.result.code || 'EVENT_REJECTED');
      const nonce = randomUUID(), time = now(), state = JSON.stringify(durableState(reduced.state));
      const rootGuard = isRoot ? '1=1' : `EXISTS(SELECT 1 FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=? LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=lesson_sessions.room_id AND r.deleted_at IS NULL AND r.owner_account_id=lesson_sessions.owner_account_id AND (r.owner_account_id=? OR (m.role IN ('owner','cohost') AND m.revoked_at IS NULL)) AND sh.revoked_at IS NULL)`;
      const values = isRoot ? [] : [accountId, accountId, accountId];
      const result = { ...reduced.result, revision: revision + 1 };
      const batch = await db.batch([prepare(`UPDATE lesson_sessions SET state=?,revision=?,status=?,mutation_nonce=?,updated_at=? WHERE id=? AND revision=? AND ${rootGuard}`, state, revision + 1, reduced.state.status, nonce, time, id, revision, ...values), prepare('INSERT INTO lesson_event_receipts(id,session_id,actor_key,event_id,fingerprint,result,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_sessions WHERE id=? AND mutation_nonce=?)', randomUUID(), id, actorKey, eventId, fingerprint, JSON.stringify(result), time, id, nonce)]);
      if (!changes(batch[0]) || !changes(batch[1])) throw new Error('FORBIDDEN_OR_CONFLICT');
      const fresh = await loadSession(id); return { result, view: projection(fresh, 'teacher', null, time), serverNow: time, revision: fresh.revision };
    },
    async rotatePresenter({ id, accountId, isRoot = false, revision }) {
      const session = await loadSession(id); if (!session) throw new Error('NOT_FOUND');
      if (!isRoot && (session.owner_account_id !== accountId || !(await authRoom(session, accountId, 'write')))) throw new Error('FORBIDDEN');
      const raw = token(), nonce = randomUUID(), current = JSON.parse(session.state), nextRevision = revision + 1;
      current.revision = nextRevision;
      const guard = isRoot ? 'EXISTS(SELECT 1 FROM rooms WHERE id=lesson_sessions.room_id AND deleted_at IS NULL AND owner_account_id=lesson_sessions.owner_account_id)' : `EXISTS(SELECT 1 FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=? LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=lesson_sessions.room_id AND r.deleted_at IS NULL AND r.owner_account_id=lesson_sessions.owner_account_id AND r.owner_account_id=? AND (m.role='owner' OR r.owner_account_id=?) AND m.revoked_at IS NULL AND sh.revoked_at IS NULL)`;
      const values = isRoot ? [] : [accountId, accountId, accountId, accountId];
      const result = await prepare(`UPDATE lesson_sessions SET presenter_token_hash=?,state=?,revision=?,mutation_nonce=?,updated_at=? WHERE id=? AND revision=? AND ${guard}`, sha(raw), JSON.stringify(durableState(current)), nextRevision, nonce, now(), id, revision, ...values).run();
      if (!changes(result)) throw new Error('REVISION_CONFLICT');
      return { presenterToken: raw, revision: revision + 1 };
    }
  };
}


