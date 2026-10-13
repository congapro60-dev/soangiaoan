import { storyCue } from './story-cues.js';
import { practiceEvidencePackage } from './practice-variants.js';

// Class identity is separate from room identity. Names never authenticate or merge history.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_TTL = 30 * 24 * 60 * 60 * 1000;
const MASTERY_KINDS = new Set(['independent_recheck', 'individual_recheck', 'exit']);
const FORBIDDEN_KINDS = new Set(['group_product', 'map_position', 'race_position', 'group_score']);
const fail = code => { throw new Error(code); };
const changes = result => Number(result?.meta?.changes || 0);
const encoder = new TextEncoder();
const randomCode = length => [...crypto.getRandomValues(new Uint8Array(length))].map(value => ALPHABET[value & 31]).join('');
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function decodeBase64url(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));
    return bytes.length === length && base64url(bytes) === value ? bytes : null;
  } catch { return null; }
}
const sha = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
async function pinDigest(pin, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt }, key, 256));
}
async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return 'pbkdf2-sha256:100000:' + base64url(salt) + ':' + base64url(await pinDigest(pin, salt));
}
async function verifyPin(pin, stored) {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== '100000') return false;
  const salt = decodeBase64url(parts[2], 16), expected = decodeBase64url(parts[3], 32);
  if (!salt || !expected) return false;
  const actual = await pinDigest(pin, salt); let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ actual[i];
  return difference === 0;
}
function text(value, max, code) {
  if (typeof value !== 'string') fail(code);
  const clean = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > max || /[\u0000-\u001f\u007f]/.test(clean) || /^(__proto__|constructor|prototype)$/i.test(clean)) fail(code);
  return clean;
}
const requestId = value => /^[A-Za-z0-9_-]{8,80}$/.test(typeof value === 'string' ? value : '') ? value : fail('INVALID_REQUEST_ID');
const presentClass = row => ({ id: row.id, code: row.code, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at, ...(row.members !== undefined ? { memberCount: row.members, activeMemberCount: row.active_members } : {}) });
const presentMember = row => ({ id: row.id, code: row.member_code, name: row.name, teamId: row.team_id, revoked: row.revoked_at !== null, createdAt: row.created_at });
const presentTeam = row => ({ id: row.id, title: row.title });

export function createLessonClassService({ db, now = () => Date.now() }) {
  const q = (sql, ...values) => db.prepare(sql).bind(...values);
  const one = (sql, ...values) => q(sql, ...values).first();
  const all = async (sql, ...values) => (await q(sql, ...values).all()).results || [];
  const run = (sql, ...values) => q(sql, ...values).run();
  const ownClass = async (owner, id) => {
    if (typeof owner !== 'string' || !owner) fail('AUTH_REQUIRED');
    const row = await one('SELECT * FROM lesson_classes WHERE id=? AND owner_account_id=? AND deleted_at IS NULL', id, owner);
    if (!row) fail('NOT_FOUND'); return row;
  };
  const ownGuard = 'EXISTS(SELECT 1 FROM lesson_classes c WHERE c.id=? AND c.owner_account_id=? AND c.deleted_at IS NULL)';
  const ownMember = async (owner, classId, memberId) => {
    await ownClass(owner, classId);
    const member = await one('SELECT * FROM lesson_class_members WHERE id=? AND class_id=?', memberId, classId);
    if (!member) fail('NOT_FOUND'); return member;
  };
  const checkTeam = async (classId, teamId) => {
    if (teamId !== null && (typeof teamId !== 'string' || !await one('SELECT id FROM lesson_class_teams WHERE class_id=? AND id=?', classId, teamId))) fail('INVALID_TEAM');
    return teamId;
  };

  async function createClass({ ownerAccountId, title, requestId: rid }) {
    if (typeof ownerAccountId !== 'string' || !ownerAccountId) fail('AUTH_REQUIRED');
    title = text(title, 120, 'INVALID_TITLE'); requestId(rid);
    const existing = await one('SELECT * FROM lesson_classes WHERE owner_account_id=? AND request_id=?', ownerAccountId, rid);
    if (existing) { if (existing.title !== title || existing.deleted_at !== null) fail('REQUEST_CONFLICT'); return { class: presentClass(existing) }; }
    const id = crypto.randomUUID(), time = now();
    for (let tries = 0; tries < 8; tries++) {
      try {
        await run('INSERT INTO lesson_classes(id,owner_account_id,code,title,request_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', id, ownerAccountId, randomCode(6), title, rid, time, time);
        return { class: presentClass(await ownClass(ownerAccountId, id)) };
      } catch (error) {
        if (!/UNIQUE/i.test(String(error?.message))) throw error;
        const raced = await one('SELECT * FROM lesson_classes WHERE owner_account_id=? AND request_id=?', ownerAccountId, rid);
        if (raced) { if (raced.title !== title || raced.deleted_at !== null) fail('REQUEST_CONFLICT'); return { class: presentClass(raced) }; }
      }
    }
    fail('CODE_UNAVAILABLE');
  }
  async function listClasses(ownerAccountId) {
    if (typeof ownerAccountId !== 'string' || !ownerAccountId) fail('AUTH_REQUIRED');
    const rows = await all('SELECT c.*,(SELECT COUNT(*) FROM lesson_class_members m WHERE m.class_id=c.id) AS members,(SELECT COUNT(*) FROM lesson_class_members m WHERE m.class_id=c.id AND m.revoked_at IS NULL) AS active_members FROM lesson_classes c WHERE c.owner_account_id=? AND c.deleted_at IS NULL ORDER BY c.created_at DESC,c.rowid DESC LIMIT 100', ownerAccountId);
    return { classes: rows.map(presentClass) };
  }
  async function getClass({ ownerAccountId, classId }) {
    const classroom = await ownClass(ownerAccountId, classId);
    const members = await all("SELECT m.* FROM lesson_class_members m WHERE m.class_id=? AND NOT EXISTS(SELECT 1 FROM site_trash t WHERE t.kind='class-member' AND t.object_id=m.id) AND " + ownGuard + ' ORDER BY m.created_at,m.rowid', classId, classId, ownerAccountId);
    const teams = await all('SELECT t.* FROM lesson_class_teams t WHERE t.class_id=? AND ' + ownGuard + ' ORDER BY t.created_at,t.rowid', classId, classId, ownerAccountId);
    await ownClass(ownerAccountId, classId);
    return { class: presentClass({ ...classroom, members: members.length, active_members: members.filter(m => m.revoked_at === null).length }), members: members.map(presentMember), teams: teams.map(presentTeam) };
  }
  async function updateClass({ ownerAccountId, classId, title }) {
    await ownClass(ownerAccountId, classId); title = text(title, 120, 'INVALID_TITLE');
    const result = await run('UPDATE lesson_classes SET title=?,updated_at=? WHERE id=? AND owner_account_id=? AND deleted_at IS NULL', title, now(), classId, ownerAccountId);
    if (!changes(result)) fail('NOT_FOUND'); return getClass({ ownerAccountId, classId });
  }
  async function deleteClass({ ownerAccountId, classId, confirmTitle }) {
    const classroom = await ownClass(ownerAccountId, classId);
    if (confirmTitle !== classroom.title) fail('CONFIRM_REQUIRED');
    const time = now(), snapshot = JSON.stringify({ title: classroom.title, nonce: crypto.randomUUID() });
    const result = await db.batch([
      q("INSERT INTO site_trash(kind,object_id,owner_account_id,deleted_at,data) SELECT 'class',id,owner_account_id,?,? FROM lesson_classes WHERE id=? AND owner_account_id=? AND title=? AND deleted_at IS NULL ON CONFLICT(kind,object_id) DO UPDATE SET deleted_at=excluded.deleted_at,data=excluded.data", time, snapshot, classId, ownerAccountId, confirmTitle),
      q("UPDATE lesson_classes SET deleted_at=?,updated_at=? WHERE id=? AND owner_account_id=? AND title=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM site_trash WHERE kind='class' AND object_id=? AND owner_account_id=? AND data=?)", time, time, classId, ownerAccountId, confirmTitle, classId, ownerAccountId, snapshot),
      q("DELETE FROM site_trash WHERE kind='class' AND object_id=? AND owner_account_id=? AND data=? AND NOT EXISTS(SELECT 1 FROM lesson_classes WHERE id=? AND deleted_at=?)", classId, ownerAccountId, snapshot, classId, time)
    ]);
    if (!changes(result[1])) fail('NOT_FOUND'); return { ok: true };
  }
  async function createTeam({ ownerAccountId, classId, title, requestId: rid }) {
    await ownClass(ownerAccountId, classId); title = text(title, 40, 'INVALID_TITLE'); requestId(rid);
    if (await one("SELECT object_id FROM site_trash WHERE kind='class-team' AND json_extract(data,'$.team.class_id')=? AND json_extract(data,'$.team.request_id')=?", classId, rid)) fail('REQUEST_CONFLICT');
    const id = crypto.randomUUID();
    await run("INSERT INTO lesson_class_teams(id,class_id,title,request_id,created_at) SELECT ?,?,?,?,? WHERE " + ownGuard + " AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-team' AND json_extract(data,'$.team.class_id')=? AND json_extract(data,'$.team.request_id')=?) ON CONFLICT(class_id,request_id) DO NOTHING", id, classId, title, rid, now(), classId, ownerAccountId, classId, rid);
    const team = await one('SELECT * FROM lesson_class_teams WHERE class_id=? AND request_id=? AND ' + ownGuard, classId, rid, classId, ownerAccountId);
    if (!team) fail('NOT_FOUND'); if (team.title !== title) fail('REQUEST_CONFLICT'); return { team: presentTeam(team) };
  }
  async function deleteTeam({ ownerAccountId, classId, teamId, confirmTitle }) {
    await ownClass(ownerAccountId, classId);
    const team = await one('SELECT * FROM lesson_class_teams WHERE class_id=? AND id=?', classId, teamId);
    if (!team) fail('NOT_FOUND');
    if (confirmTitle !== team.title) fail('CONFIRM_REQUIRED');
    const teamGuard = 'EXISTS(SELECT 1 FROM lesson_class_teams WHERE id=? AND class_id=? AND title=?) AND ' + ownGuard;
    const time = now(), nonce = crypto.randomUUID();
    const out = await db.batch([
      q("INSERT INTO site_trash(kind,object_id,owner_account_id,deleted_at,data) SELECT 'class-team',id,?,?,json_object('title',title,'team',json_object('id',id,'class_id',class_id,'title',title,'request_id',request_id,'created_at',created_at),'members',json((SELECT json_group_array(json_object('id',id,'updatedAt',MAX(updated_at+1,?))) FROM lesson_class_members WHERE class_id=? AND team_id=?)),'nonce',?) FROM lesson_class_teams WHERE id=? AND class_id=? AND title=? AND " + ownGuard + ' ON CONFLICT(kind,object_id) DO UPDATE SET deleted_at=excluded.deleted_at,data=excluded.data', ownerAccountId, time, time, classId, teamId, nonce, teamId, classId, confirmTitle, classId, ownerAccountId),
      q('UPDATE lesson_class_members SET team_id=NULL,updated_at=MAX(updated_at+1,?) WHERE class_id=? AND team_id=? AND ' + teamGuard, time, classId, teamId, teamId, classId, confirmTitle, classId, ownerAccountId),
      q("DELETE FROM lesson_class_teams WHERE id=? AND class_id=? AND title=? AND EXISTS(SELECT 1 FROM site_trash WHERE kind='class-team' AND object_id=? AND owner_account_id=? AND json_extract(data,'$.nonce')=?) AND " + ownGuard, teamId, classId, confirmTitle, teamId, ownerAccountId, nonce, classId, ownerAccountId),
      q("DELETE FROM site_trash WHERE kind='class-team' AND object_id=? AND owner_account_id=? AND json_extract(data,'$.nonce')=? AND EXISTS(SELECT 1 FROM lesson_class_teams WHERE id=?)", teamId, ownerAccountId, nonce, teamId)
    ]);
    if (!changes(out[2])) fail('NOT_FOUND'); return { ok: true };
  }
  async function addMember({ ownerAccountId, classId, name, teamId = null, requestId: rid }) {
    await ownClass(ownerAccountId, classId); name = text(name, 40, 'INVALID_NAME'); requestId(rid); await checkTeam(classId, teamId);
    const fingerprint = await sha(JSON.stringify({ name, teamId }));
    const replay = async () => {
      const existing = await one('SELECT * FROM lesson_class_members WHERE class_id=? AND request_id=? AND ' + ownGuard, classId, rid, classId, ownerAccountId);
      if (!existing) return null; if (existing.request_fingerprint !== fingerprint) fail('REQUEST_CONFLICT'); return { member: presentMember(existing) };
    };
    const existing = await replay(); if (existing) return existing;
    const id = crypto.randomUUID(), pin = randomCode(8), hash = await hashPin(pin), time = now();
    for (let tries = 0; tries < 8; tries++) {
      try {
        const result = await run('INSERT INTO lesson_class_members(id,class_id,member_code,name,team_id,pin_hash,request_id,request_fingerprint,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ' + ownGuard, id, classId, randomCode(6), name, teamId, hash, rid, fingerprint, time, time, classId, ownerAccountId);
        if (!changes(result)) { await ownClass(ownerAccountId, classId); fail('CLASS_FULL'); }
        return { member: presentMember(await ownMember(ownerAccountId, classId, id)), pin };
      } catch (error) {
        if (!/UNIQUE/i.test(String(error?.message))) throw error;
        const raced = await replay(); if (raced) return raced;
      }
    }
    fail('CODE_UNAVAILABLE');
  }
  async function updateMember({ ownerAccountId, classId, memberId, name, teamId }) {
    const existing = await ownMember(ownerAccountId, classId, memberId);
    name = name === undefined ? existing.name : text(name, 40, 'INVALID_NAME');
    teamId = teamId === undefined ? existing.team_id : await checkTeam(classId, teamId);
    const result = await run('UPDATE lesson_class_members SET name=?,team_id=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND class_id=? AND ' + ownGuard, name, teamId, now(), memberId, classId, classId, ownerAccountId);
    if (!changes(result)) fail('NOT_FOUND'); return { member: presentMember(await ownMember(ownerAccountId, classId, memberId)) };
  }
  async function revokeMember({ ownerAccountId, classId, memberId }) {
    await ownMember(ownerAccountId, classId, memberId);
    const result = await run('UPDATE lesson_class_members SET revoked_at=COALESCE(revoked_at,?),updated_at=? WHERE id=? AND class_id=? AND ' + ownGuard, now(), now(), memberId, classId, classId, ownerAccountId);
    if (!changes(result)) fail('NOT_FOUND'); return { ok: true };
  }
  async function deleteMember({ ownerAccountId, classId, memberId, confirmName, confirmCode }) {
    const member = await ownMember(ownerAccountId, classId, memberId);
    if (confirmName !== member.name || confirmCode !== member.member_code) fail('CONFIRM_REQUIRED');
    const time = now(), snapshot = JSON.stringify({ title: member.name, classId, code: member.member_code, nonce: crypto.randomUUID() });
    const result = await db.batch([
      q("INSERT INTO site_trash(kind,object_id,owner_account_id,deleted_at,data) SELECT 'class-member',id,?,?,? FROM lesson_class_members WHERE id=? AND class_id=? AND name=? AND member_code=? AND " + ownGuard + ' ON CONFLICT(kind,object_id) DO UPDATE SET deleted_at=excluded.deleted_at,data=excluded.data', ownerAccountId, time, snapshot, memberId, classId, confirmName, confirmCode, classId, ownerAccountId),
      q("UPDATE lesson_class_members SET revoked_at=COALESCE(revoked_at,?),updated_at=? WHERE id=? AND class_id=? AND name=? AND member_code=? AND EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=? AND owner_account_id=? AND data=?) AND " + ownGuard, time, time, memberId, classId, confirmName, confirmCode, memberId, ownerAccountId, snapshot, classId, ownerAccountId),
      q("DELETE FROM site_trash WHERE kind='class-member' AND object_id=? AND owner_account_id=? AND data=? AND NOT EXISTS(SELECT 1 FROM lesson_class_members WHERE id=? AND updated_at=? AND revoked_at IS NOT NULL)", memberId, ownerAccountId, snapshot, memberId, time)
    ]);
    if (!changes(result[1])) fail('NOT_FOUND'); return { ok: true };
  }
  async function restoreTrash({ ownerAccountId, kind, id }) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    if (!['class', 'class-team', 'class-member'].includes(kind)) fail('INVALID_ACTION');
    const trash = await one('SELECT * FROM site_trash WHERE kind=? AND object_id=? AND owner_account_id=?', kind, id, ownerAccountId);
    if (!trash) fail('NOT_FOUND');
    const data = JSON.parse(trash.data), marker = 'EXISTS(SELECT 1 FROM site_trash WHERE kind=? AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=?)';
    const args = [kind, id, ownerAccountId, trash.data, trash.deleted_at];
    let out;
    if (kind === 'class') {
      out = await db.batch([
        q('UPDATE lesson_classes SET deleted_at=NULL,updated_at=? WHERE id=? AND owner_account_id=? AND deleted_at=? AND ' + marker, now(), id, ownerAccountId, trash.deleted_at, ...args),
        q('DELETE FROM site_trash WHERE kind=? AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=? AND EXISTS(SELECT 1 FROM lesson_classes WHERE id=? AND owner_account_id=? AND deleted_at IS NULL)', ...args, id, ownerAccountId)
      ]);
    } else if (kind === 'class-member') {
      await ownClass(ownerAccountId, data.classId);
      // Restoring identity never reinstates its old credential. A teacher issues a fresh PIN separately.
      out = await db.batch([
        q('UPDATE lesson_class_members SET updated_at=? WHERE id=? AND class_id=? AND revoked_at IS NOT NULL AND ' + ownGuard + ' AND ' + marker, now(), id, data.classId, data.classId, ownerAccountId, ...args),
        q('DELETE FROM site_trash WHERE kind=? AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=? AND EXISTS(SELECT 1 FROM lesson_class_members WHERE id=? AND class_id=? AND revoked_at IS NOT NULL) AND ' + ownGuard, ...args, id, data.classId, data.classId, ownerAccountId)
      ]);
    } else {
      const team = data.team;
      if (!team || team.id !== id || !Array.isArray(data.members)) fail('INVALID_BODY');
      await ownClass(ownerAccountId, team.class_id);
      const restoredRequest = team.request_id;
      out = await db.batch([
        q('INSERT INTO lesson_class_teams(id,class_id,title,request_id,created_at) SELECT ?,?,?,?,? WHERE ' + ownGuard + ' AND ' + marker + ' ON CONFLICT DO NOTHING', id, team.class_id, team.title, restoredRequest, team.created_at, team.class_id, ownerAccountId, ...args),
        q('UPDATE lesson_class_members SET team_id=?,updated_at=MAX(updated_at+1,?) WHERE class_id=? AND EXISTS(SELECT 1 FROM json_each(?) saved WHERE json_extract(saved.value,\'$.id\')=lesson_class_members.id AND json_extract(saved.value,\'$.updatedAt\')=lesson_class_members.updated_at) AND team_id IS NULL AND EXISTS(SELECT 1 FROM lesson_class_teams WHERE id=? AND class_id=? AND request_id=?) AND ' + ownGuard + ' AND ' + marker, id, now(), team.class_id, JSON.stringify(data.members), id, team.class_id, restoredRequest, team.class_id, ownerAccountId, ...args),
        q('DELETE FROM site_trash WHERE kind=? AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=? AND EXISTS(SELECT 1 FROM lesson_class_teams WHERE id=? AND class_id=? AND request_id=?) AND ' + ownGuard, ...args, id, team.class_id, restoredRequest, team.class_id, ownerAccountId)
      ]);
    }
    if (!changes(out[0]) || !changes(out.at(-1))) fail('RESTORE_CONFLICT');
    return { ok: true, ...(kind === 'class-member' ? { requiresNewPin: true, classId: data.classId } : {}) };
  }
  async function resetMemberPin({ ownerAccountId, classId, memberId }) {
    await ownMember(ownerAccountId, classId, memberId);
    if (await one("SELECT object_id FROM site_trash WHERE kind='class-member' AND object_id=?", memberId)) fail('RESTORE_REQUIRED');
    const pin = randomCode(8), hash = await hashPin(pin);
    const hasDevices = Boolean(await one("SELECT name FROM sqlite_master WHERE type='table' AND name='lesson_devices'"));
    const statements = [
      q("UPDATE lesson_class_members SET pin_hash=?,revoked_at=NULL,login_fail_count=0,login_window_start=NULL,updated_at=? WHERE id=? AND class_id=? AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=lesson_class_members.id) AND " + ownGuard, hash, now(), memberId, classId, classId, ownerAccountId),
      q('DELETE FROM lesson_class_login_sessions WHERE member_id=? AND EXISTS(SELECT 1 FROM lesson_class_members WHERE id=? AND pin_hash=? AND class_id=?) AND ' + ownGuard, memberId, memberId, hash, classId, classId, ownerAccountId),
      q('UPDATE lesson_learners SET token_hash=lower(hex(randomblob(32))) WHERE class_member_id=? AND EXISTS(SELECT 1 FROM lesson_class_members WHERE id=? AND pin_hash=? AND class_id=?) AND ' + ownGuard, memberId, memberId, hash, classId, classId, ownerAccountId)
    ];
    if (hasDevices) statements.push(q('UPDATE lesson_devices SET revoked_at=COALESCE(revoked_at,?) WHERE id IN(SELECT device_id FROM lesson_device_members WHERE class_member_id=?) AND EXISTS(SELECT 1 FROM lesson_class_members WHERE id=? AND pin_hash=? AND class_id=?) AND ' + ownGuard, now(), memberId, memberId, hash, classId, classId, ownerAccountId));
    const result = await db.batch(statements);
    if (!changes(result[0])) fail('NOT_FOUND');
    return { member: presentMember(await ownMember(ownerAccountId, classId, memberId)), pin };
  }
  async function joinClass({ classCode, memberCode, pin }) {
    const loginFail = () => fail('CLASS_LOGIN_UNAVAILABLE');
    if (![classCode, memberCode, pin].every(value => typeof value === 'string') || classCode.length > 20 || memberCode.length > 20 || pin.length > 80) loginFail();
    classCode = classCode.trim().toUpperCase(); memberCode = memberCode.trim().toUpperCase(); pin = pin.trim().toUpperCase();
    const member = await one('SELECT m.id FROM lesson_class_members m JOIN lesson_classes c ON c.id=m.class_id WHERE c.code=? AND m.member_code=? AND c.deleted_at IS NULL AND m.revoked_at IS NULL', classCode, memberCode);
    if (!member) loginFail();
    const time = now(), cutoff = time - LOGIN_WINDOW;
    const expired = '(login_window_start IS NULL OR login_window_start<=?)';
    const guard = 'EXISTS(SELECT 1 FROM lesson_classes WHERE id=lesson_class_members.class_id AND deleted_at IS NULL)';
    const reservation = await one(`UPDATE lesson_class_members SET login_fail_count=CASE WHEN ${expired} THEN 1 ELSE login_fail_count+1 END,login_window_start=CASE WHEN ${expired} THEN ? ELSE login_window_start END WHERE id=? AND revoked_at IS NULL AND ${guard} AND CASE WHEN ${expired} THEN 0 ELSE login_fail_count END<5 RETURNING pin_hash,login_window_start`, cutoff, cutoff, time, member.id, cutoff);
    if (!reservation || !new RegExp('^[' + ALPHABET + ']{8}$').test(pin) || !await verifyPin(pin, reservation.pin_hash)) loginFail();
    const token = base64url(crypto.getRandomValues(new Uint8Array(32))), id = crypto.randomUUID();
    const stillValid = 'EXISTS(SELECT 1 FROM lesson_class_members m JOIN lesson_classes c ON c.id=m.class_id WHERE m.id=? AND m.pin_hash=? AND m.login_window_start=? AND m.revoked_at IS NULL AND c.deleted_at IS NULL)';
    const args = [member.id, reservation.pin_hash, reservation.login_window_start];
    const out = await db.batch([
      q('INSERT INTO lesson_class_login_sessions(id,member_id,token_hash,created_at,expires_at) SELECT ?,?,?,?,? WHERE ' + stillValid, id, member.id, await sha(token), time, time + LOGIN_TTL, ...args),
      q('UPDATE lesson_class_members SET login_fail_count=login_fail_count-1 WHERE id=? AND login_fail_count>0 AND ' + stillValid + ' AND EXISTS(SELECT 1 FROM lesson_class_login_sessions WHERE id=?)', member.id, ...args, id),
      q('DELETE FROM lesson_class_login_sessions WHERE member_id=? AND id!=? AND EXISTS(SELECT 1 FROM lesson_class_login_sessions WHERE id=?) AND id NOT IN(SELECT id FROM lesson_class_login_sessions WHERE member_id=? AND id!=? ORDER BY created_at DESC,rowid DESC LIMIT 9)', member.id, id, id, member.id, id)
    ]);
    if (!changes(out[0])) loginFail(); return { token, ...(await getPassport({ token })) };
  }
  async function resolveMemberToken(token) {
    if (!decodeBase64url(token, 32)) fail('AUTH_REQUIRED');
    const member = await one('SELECT m.*,c.code AS class_code,c.title AS class_title,c.owner_account_id FROM lesson_class_login_sessions s JOIN lesson_class_members m ON m.id=s.member_id JOIN lesson_classes c ON c.id=m.class_id WHERE s.token_hash=? AND s.expires_at>? AND m.revoked_at IS NULL AND c.deleted_at IS NULL', await sha(token), now());
    if (!member) fail('AUTH_REQUIRED');
    return { memberId: member.id, classId: member.class_id, memberCode: member.member_code, name: member.name, teamId: member.team_id, ownerAccountId: member.owner_account_id, classCode: member.class_code, classTitle: member.class_title };
  }
  async function getPassport({ token }) {
    const identity = await resolveMemberToken(token);
    const sessions = await all('SELECT DISTINCT s.id,s.state,l.learner_id,json_extract(s.state,\'$.status\') AS status FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_learners l ON l.session_id=s.id JOIN lesson_classes c ON c.id=s.class_id JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE l.class_member_id=? AND s.class_id=? AND s.owner_account_id=? AND c.owner_account_id=? AND c.deleted_at IS NULL AND p.status IN (\'approved\',\'published\')', identity.memberId, identity.classId, identity.ownerAccountId, identity.ownerAccountId);
    const values = sessions.flatMap(session=>{const state=JSON.parse(session.state);return state.valueBadges?.[session.learner_id] || [];});
    const reflections = sessions.flatMap(session=>{const state=JSON.parse(session.state);const own=state.valueReflections?.[session.learner_id];return own?[{reflection:own.reflection,submittedAt:own.submittedAt}]:[];});
    const tutorHistory = sessions.flatMap(session=>(JSON.parse(session.state).passports?.[session.learner_id]?.tutorHistory || []).map(item=>({id:item.id,recipientName:item.recipientName,at:item.at,...(item.revokedAt?{revokedAt:item.revokedAt}:{})})));
    let syncPending = false;
    for (const session of sessions) {
      try { await syncSessionEvidence({ ownerAccountId: identity.ownerAccountId, sessionId: session.id, memberId: identity.memberId }); }
      catch (error) { if (error.message !== 'EVIDENCE_SNAPSHOT_CHANGED') throw error; syncPending = true; }
    }
    const leagueTable = await one("SELECT name FROM sqlite_master WHERE type='table' AND name='lesson_leagues'");
    const leagues = leagueTable ? await all('SELECT l.id,l.title,l.format FROM lesson_leagues l JOIN lesson_league_classes c ON c.league_id=l.id WHERE c.class_id=? AND l.owner_account_id=? AND l.deleted_at IS NULL AND c.deleted_at IS NULL', identity.classId, identity.ownerAccountId) : [];
    const rows = await all('SELECT e.* FROM lesson_class_evidence e WHERE member_id=? AND EXISTS(SELECT 1 FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id WHERE s.id=e.session_id AND s.class_id=? AND s.owner_account_id=? AND r.owner_account_id=s.owner_account_id AND r.deleted_at IS NULL) ORDER BY submitted_at,synced_at,rowid', identity.memberId, identity.classId, identity.ownerAccountId);
    const objectives = new Map();
    for (const row of rows) {
      if (!objectives.has(row.objective_code)) objectives.set(row.objective_code, { code: row.objective_code, statement: row.objective_statement, tasks: new Map() });
      const objective = objectives.get(row.objective_code); objective.statement = row.objective_statement;
      if (!row.assessed) continue;
      objective.tasks.set(row.task_id, row);
    }
    const summary = [...objectives.values()].map(objective => {
      let independentCount = 0, supportedCount = 0, hasRecheck = false, hasShould = false, hasFailure = false;
      for (const row of objective.tasks.values()) {
        if (row.level === 'should' && row.ok && !row.assisted && !FORBIDDEN_KINDS.has(row.kind)) hasShould = true;
        if (!row.counts_for_mastery || FORBIDDEN_KINDS.has(row.kind) || !MASTERY_KINDS.has(row.kind)) continue;
        if (!row.ok) { hasFailure = true; continue; }
        if (row.assisted) { supportedCount++; continue; }
        independentCount++;
        if (row.kind === 'independent_recheck' || row.kind === 'individual_recheck') hasRecheck = true;
      }
      const status = independentCount >= 2 && hasRecheck ? (hasShould ? 'standard_mastery' : 'minimum_mastery') : independentCount || supportedCount ? 'supported' : hasFailure ? 'needs_support' : 'no_evidence';
      return { code: objective.code, statement: objective.statement, status, independentCount, supportedCount };
    });
    await resolveMemberToken(token);
    if (sessions.length) {
      const active = await one('SELECT COUNT(*) AS count FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id WHERE s.id IN(SELECT value FROM json_each(?)) AND s.class_id=? AND s.owner_account_id=? AND r.owner_account_id=s.owner_account_id AND r.deleted_at IS NULL', JSON.stringify(sessions.map(session => session.id)), identity.classId, identity.ownerAccountId);
      if (active.count !== sessions.length) fail('EVIDENCE_SNAPSHOT_CHANGED');
    }
    return { class: { id: identity.classId, code: identity.classCode, title: identity.classTitle }, member: { id: identity.memberId, code: identity.memberCode, name: identity.name, teamId: identity.teamId }, passport: { objectives: summary, values, reflections, tutorHistory }, leagues, sessions: sessions.map(session=>({id:session.id,status:session.status,...(session.status==='concluded'?{storyEnding:storyCue({theme:JSON.parse(session.state).gamePlan?.theme,concluded:true})}:{})})), ...(syncPending ? { passportSyncPending: true } : {}) };
  }

  // Called by the server lesson service after its own CAS write. No HTTP action accepts evidence or answers.
  async function syncSessionEvidence({ ownerAccountId, sessionId, memberId = null }) {
    if (!ownerAccountId) fail('AUTH_REQUIRED');
    const session = await one('SELECT s.*,p.data AS package_data FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_classes c ON c.id=s.class_id JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE s.id=? AND s.owner_account_id=? AND c.owner_account_id=? AND c.deleted_at IS NULL AND p.status IN (\'approved\',\'published\')', sessionId, ownerAccountId, ownerAccountId);
    if (!session) fail('NOT_FOUND');
    const state = JSON.parse(session.state), pkg = practiceEvidencePackage(JSON.parse(session.package_data));
    const members = await all('SELECT l.learner_id,m.id FROM lesson_learners l JOIN lesson_class_members m ON m.id=l.class_member_id AND m.class_id=? WHERE l.session_id=? AND m.revoked_at IS NULL AND (? IS NULL OR m.id=?)', session.class_id, sessionId, memberId, memberId);
    const tasks = new Map((pkg.tasks || []).map(task => [task.id, task]));
    const objectives = new Map((pkg.objectives || []).map(objective => [objective.id, objective]));
    const evidenceKey = row => JSON.stringify([row.member_id, row.task_id, row.submission_id, row.objective_code]);
    const mirrored = new Map((await all('SELECT * FROM lesson_class_evidence WHERE session_id=? AND package_hash=? AND (? IS NULL OR member_id=?)', sessionId, session.package_hash, memberId, memberId)).map(row => [evidenceKey(row), row]));
    const statements = [], time = now();
    for (const member of members) {
      const passport = state.passports?.[member.learner_id];
      for (const submission of passport?.submissions || []) {
        const task = tasks.get(submission.taskId);
        if (!task || typeof submission.submissionId !== 'string' || !Number.isFinite(submission.at)) continue;
        const assisted = Boolean(submission.assisted || passport?.revealedTasks?.[task.id] || passport?.supportHistory?.some(hint => hint.taskId === task.id));
        for (const rule of (pkg.evidenceRules || []).filter(rule => rule.taskId === task.id)) {
          for (const objectiveId of rule.objectiveIds || [rule.objectiveId]) {
            const objective = objectives.get(objectiveId);
            if (!objective?.code) continue;
            const individual = task.participation === 'individual' && rule.individual === true && task.type !== 'reflection';
            const level = task.branch === 'core' && individual ? 'should' : task.branch === 'extension' && individual ? 'could' : 'must';
            const mastery = Boolean(state.submissions?.[submission.submissionId]?.source !== 'teacher_recorded_response' && state.openAssessments?.[submission.submissionId]?.nonMastery !== true && rule.countsForMastery && rule.individual === true && task.participation === 'individual' && task.type !== 'reflection' && MASTERY_KINDS.has(rule.kind) && !FORBIDDEN_KINDS.has(rule.kind));
            const fields = { member_id: member.id, task_id: task.id.replace(/^variant:(.+):\d+$/, '$1'), submission_id: submission.submissionId, objective_code: objective.code, objective_statement: objective.statement || objective.text || objective.code, level, kind: rule.kind, assessed: submission.assessmentStatus === 'assessed' ? 1 : 0, assisted: assisted ? 1 : 0, ok: submission.ok === true ? 1 : 0, counts_for_mastery: mastery ? 1 : 0, submitted_at: submission.at };
            const prior = mirrored.get(evidenceKey(fields));
            if (prior && Object.entries(fields).every(([key, value]) => prior[key] === value)) continue;
            const guard = 'EXISTS(SELECT 1 FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_classes c ON c.id=s.class_id JOIN lesson_learners l ON l.session_id=s.id JOIN lesson_class_members m ON m.id=l.class_member_id AND m.class_id=c.id WHERE s.id=? AND s.revision=? AND s.package_hash=? AND s.class_id=? AND s.owner_account_id=? AND c.owner_account_id=? AND c.deleted_at IS NULL AND l.learner_id=? AND m.id=? AND m.revoked_at IS NULL)';
            statements.push(q('INSERT INTO lesson_class_evidence(member_id,session_id,package_hash,task_id,submission_id,objective_code,objective_statement,level,kind,assessed,assisted,ok,counts_for_mastery,submitted_at,synced_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ' + guard + ' ON CONFLICT(member_id,session_id,package_hash,task_id,submission_id,objective_code) DO UPDATE SET objective_statement=excluded.objective_statement,level=excluded.level,kind=excluded.kind,assessed=excluded.assessed,assisted=excluded.assisted,ok=excluded.ok,counts_for_mastery=excluded.counts_for_mastery,synced_at=excluded.synced_at', member.id, sessionId, session.package_hash, task.id.replace(/^variant:(.+):\d+$/, '$1'), submission.submissionId, objective.code, objective.statement || objective.text || objective.code, level, rule.kind, submission.assessmentStatus === 'assessed' ? 1 : 0, assisted ? 1 : 0, submission.ok === true ? 1 : 0, mastery ? 1 : 0, submission.at, time, sessionId, session.revision, session.package_hash, session.class_id, ownerAccountId, ownerAccountId, member.learner_id, member.id));
          }
        }
      }
    }
    // ponytail: 100 writes per D1 batch; move to background sync if a class snapshot exceeds request CPU limits.
    for (let index = 0; index < statements.length; index += 100) {
      const out = await db.batch(statements.slice(index, index + 100));
      if (out.some(result => !changes(result))) fail('EVIDENCE_SNAPSHOT_CHANGED');
    }
    return { ok: true, evidenceCount: statements.length };
  }
  return { createClass, listClasses, getClass, updateClass, deleteClass, createTeam, deleteTeam, addMember, updateMember, revokeMember, deleteMember, restoreTrash, resetMemberPin, joinClass, resolveMemberToken, getPassport, syncSessionEvidence };
}
