import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { canonicalize } from './schema.js';

const fail = code => { throw new Error(code); };
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !['__proto__', 'prototype', 'constructor'].includes(value);
const sha = value => createHash('sha256').update(value).digest('hex');
function canonicalToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) && Buffer.from(value, 'base64url').toString('base64url') === value;
}
const publicDevice = row => ({ id: row.id, sessionId: row.session_id, kind: row.kind, createdAt: row.created_at, expiresAt: row.expires_at, revoked: row.revoked_at != null });

export function createLessonDeviceService({ db, now = () => Date.now() }) {
  const query = (sql, ...values) => db.prepare(sql).bind(...values);
  const one = (sql, ...values) => query(sql, ...values).first();
  const all = async (sql, ...values) => (await query(sql, ...values).all()).results || [];
  const authority = `EXISTS(SELECT 1 FROM rooms r LEFT JOIN room_memberships m ON m.room_id=r.id AND m.account_id=?
    LEFT JOIN system_hosts sh ON sh.account_id=? WHERE r.id=s.room_id AND r.owner_account_id=s.owner_account_id
    AND r.deleted_at IS NULL AND (r.owner_account_id=? OR (m.role IN ('owner','cohost') AND m.revoked_at IS NULL))
    AND sh.revoked_at IS NULL)`;
  async function authorizedSession(accountId, sessionId) {
    if (!identifier(accountId) || !identifier(sessionId)) fail('FORBIDDEN');
    const session = await one(`SELECT s.* FROM lesson_sessions s WHERE s.id=? AND ${authority}`, sessionId, accountId, accountId, accountId);
    if (!session) fail('FORBIDDEN');
    if (!session.class_id || session.status === 'concluded') fail('DEVICE_SESSION_UNAVAILABLE');
    return session;
  }
  const memberScope = `SELECT l.learner_id,l.name,l.class_member_id FROM lesson_learners l JOIN lesson_sessions s ON s.id=l.session_id
    JOIN lesson_class_members cm ON cm.id=l.class_member_id AND cm.class_id=s.class_id JOIN lesson_classes c ON c.id=cm.class_id
    WHERE l.session_id=? AND l.learner_id=? AND l.present=1 AND cm.revoked_at IS NULL AND c.deleted_at IS NULL`;
  async function member(session, learnerId) {
    if (!identifier(learnerId)) fail('INVALID_DEVICE_MEMBER');
    const row = await one(memberScope, session.id, learnerId);
    if (!row || JSON.parse(session.state).roster?.[learnerId]?.present !== true) fail('INVALID_DEVICE_MEMBER');
    return row;
  }
  async function deviceSession(sessionId, deviceToken) {
    if (!identifier(sessionId) || !canonicalToken(deviceToken)) fail('DEVICE_UNAVAILABLE');
    const row = await one(`SELECT d.*,s.state,s.class_id FROM lesson_devices d JOIN lesson_sessions s ON s.id=d.session_id
      JOIN rooms r ON r.id=s.room_id WHERE d.session_id=? AND d.token_hash=? AND d.revoked_at IS NULL AND d.expires_at>?
      AND s.status<>'concluded' AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id
      AND EXISTS(SELECT 1 FROM rooms ir LEFT JOIN room_memberships im ON im.room_id=ir.id AND im.account_id=d.issued_by
        LEFT JOIN system_hosts ish ON ish.account_id=d.issued_by WHERE ir.id=s.room_id AND ish.revoked_at IS NULL
        AND (ir.owner_account_id=d.issued_by OR (im.role IN ('owner','cohost') AND im.revoked_at IS NULL)))`, sessionId, sha(deviceToken), now());
    if (!row || !row.class_id) fail('DEVICE_UNAVAILABLE');
    return row;
  }
  async function deviceMembers(row) {
    const members = await all(`SELECT l.learner_id,l.name FROM lesson_device_members dm JOIN lesson_learners l ON l.session_id=dm.session_id AND l.learner_id=dm.learner_id
      JOIN lesson_class_members cm ON cm.id=dm.class_member_id AND cm.id=l.class_member_id AND cm.class_id=?
      JOIN lesson_classes c ON c.id=cm.class_id WHERE dm.device_id=? AND dm.session_id=? AND l.present=1
      AND cm.revoked_at IS NULL AND c.deleted_at IS NULL ORDER BY l.learner_id`, row.class_id, row.id, row.session_id);
    const roster = JSON.parse(row.state).roster || {};
    return members.filter(item => roster[item.learner_id]?.present === true).map(item => ({ learnerId: item.learner_id, name: item.name }));
  }
  async function issueDevice({ accountId, sessionId, kind, memberIds, requestId, ttlMs = 86400000 }) {
    const session = await authorizedSession(accountId, sessionId);
    if (!['B', 'C'].includes(kind) || !Array.isArray(memberIds) || !memberIds.length || memberIds.length > 200 ||
      memberIds.some(value => !identifier(value)) || new Set(memberIds).size !== memberIds.length || !identifier(requestId) ||
      !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 86400000) fail('INVALID_DEVICE_INPUT');
    const ids = [...memberIds].sort(), fingerprint = sha(canonicalize({ kind, memberIds: ids, ttlMs, accountId }));
    const prior = await one('SELECT * FROM lesson_devices WHERE session_id=? AND request_id=?', sessionId, requestId);
    if (prior) {
      if (prior.request_fingerprint !== fingerprint) fail('REQUEST_CONFLICT');
      return { device: publicDevice(prior), replay: true };
    }
    const members = [];
    for (const learnerId of ids) members.push(await member(session, learnerId));
    const token = randomBytes(32).toString('base64url'), deviceId = randomUUID(), time = now(), expires = time + ttlMs;
    const statements = [query(`INSERT INTO lesson_devices(id,session_id,issued_by,kind,token_hash,request_id,request_fingerprint,created_at,expires_at)
      SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_sessions s WHERE s.id=? AND s.status<>'concluded' AND ${authority})`,
      deviceId, sessionId, accountId, kind, sha(token), requestId, fingerprint, time, expires, sessionId, accountId, accountId, accountId)];
    for (const row of members) statements.push(query(`INSERT INTO lesson_device_members(device_id,session_id,learner_id,class_member_id)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_devices WHERE id=?)`, deviceId, sessionId, row.learner_id, row.class_member_id, deviceId));
    try {
      const result = await db.batch(statements);
      if (!Number(result[0]?.meta?.changes)) fail('FORBIDDEN');
    } catch (error) {
      if (/UNIQUE/.test(error.message)) {
        const existing = await one('SELECT * FROM lesson_devices WHERE session_id=? AND request_id=?', sessionId, requestId);
        if (existing && existing.request_fingerprint === fingerprint) return { device: publicDevice(existing), replay: true };
        fail('REQUEST_CONFLICT');
      }
      if (/INVALID_DEVICE_MEMBER/.test(error.message)) fail('INVALID_DEVICE_MEMBER');
      throw error;
    }
    return { device: { id: deviceId, sessionId, kind, createdAt: time, expiresAt: expires, revoked: false }, token, replay: false };
  }
  return {
    async duelDevicePairs({accountId,sessionId}) {
      const session=await authorizedSession(accountId,sessionId);
      const active=await all(`SELECT d.*,s.state,s.class_id FROM lesson_devices d JOIN lesson_sessions s ON s.id=d.session_id
        WHERE d.session_id=? AND d.kind='B' AND d.revoked_at IS NULL AND d.expires_at>?
        AND EXISTS(SELECT 1 FROM rooms ir LEFT JOIN room_memberships im ON im.room_id=ir.id AND im.account_id=d.issued_by
          LEFT JOIN system_hosts ish ON ish.account_id=d.issued_by WHERE ir.id=s.room_id AND ish.revoked_at IS NULL
          AND (ir.owner_account_id=d.issued_by OR (im.role IN ('owner','cohost') AND im.revoked_at IS NULL)))`,session.id,now());
      const pairs=[],counts=new Map();
      for(const device of active){
        const members=await deviceMembers(device);
        for(const member of members)counts.set(member.learnerId,(counts.get(member.learnerId)||0)+1);
        const total=await one('SELECT COUNT(*) AS n FROM lesson_device_members WHERE device_id=? AND session_id=?',device.id,session.id);
        if(total.n===2&&members.length===2)pairs.push(members.map(member=>member.learnerId));
      }
      return pairs.filter(pair=>pair.every(id=>counts.get(id)===1));
    },
    issueDevice,
    async listDevices({ accountId, sessionId }) {
      await authorizedSession(accountId, sessionId);
      const rows = await all('SELECT * FROM lesson_devices WHERE session_id=? ORDER BY created_at,id', sessionId);
      return { devices: rows.map(publicDevice) };
    },
    async revokeDevice({ accountId, sessionId, deviceId }) {
      await authorizedSession(accountId, sessionId);
      if (!identifier(deviceId)) fail('INVALID_DEVICE_INPUT');
      const result = await query(`UPDATE lesson_devices SET revoked_at=? WHERE id=? AND session_id=?
        AND EXISTS(SELECT 1 FROM lesson_sessions s WHERE s.id=? AND ${authority})`, now(), deviceId, sessionId, sessionId, accountId, accountId, accountId).run();
      if (!Number(result?.meta?.changes)) fail('FORBIDDEN');
      return { ok: true };
    },
    async listDeviceMembers({ sessionId, deviceToken }) {
      const row = await deviceSession(sessionId, deviceToken);
      return { device: publicDevice(row), members: await deviceMembers(row) };
    },
    async resolveActingLearner({ sessionId, deviceToken, learnerId }) {
      const row = await deviceSession(sessionId, deviceToken);
      if (row.kind !== 'B' || !identifier(learnerId) || !(await deviceMembers(row)).some(member => member.learnerId === learnerId)) fail('DEVICE_UNAVAILABLE');
      return { sessionId, learnerId, deviceId: row.id, kind: row.kind };
    },
    async authorizeBoardResponse({ accountId, sessionId, learnerId, taskId, answer }) {
      const session = await authorizedSession(accountId, sessionId); await member(session, learnerId);
      const state = JSON.parse(session.state);
      const record = await one('SELECT data,status FROM lesson_packages WHERE row_id=? AND content_hash=? AND owner_account_id=?', session.package_row_id, session.package_hash, session.owner_account_id);
      if (!record || (session.mode === 'live' && !['approved','published'].includes(record.status))) fail('INVALID_BOARD_RESPONSE');
      let pkg;
      try { pkg = JSON.parse(record.data); } catch { fail('INVALID_BOARD_RESPONSE'); }
      const activity = pkg.activities?.[state.timeline?.activityIndex];
      const task = pkg.tasks?.find(item => item.id === taskId);
      if (!activity || activity.id !== state.timeline.currentActivityId) fail('INVALID_BOARD_RESPONSE');
      if (!task || !activity.taskIds.includes(taskId) || task.participation === 'group' || typeof answer !== 'string' || !answer.trim() || answer.length > 8000) fail('INVALID_BOARD_RESPONSE');
      return { learnerId, taskId, answer, recordedBy: accountId, source: 'teacher_recorded_response' };
    }
  };
}
