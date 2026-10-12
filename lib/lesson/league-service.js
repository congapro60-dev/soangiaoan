import { createLessonClassService } from './class-service.js';

const fail = code => { throw new Error(code); };
const changes = result => Number(result?.meta?.changes || 0);
const validId = value => { if (typeof value !== 'string' || !value || value.length > 80) fail('INVALID_BODY'); return value; };
const roundNumber = value => { if (!Number.isSafeInteger(value) || value < 1 || value > 1000) fail('INVALID_ROUND'); return value; };
const presentLeague = row => ({ id: row.id, title: row.title, format: row.format, createdAt: row.created_at });
const presentRound = row => ({ id: row.id, round: row.round, participantCount: row.participant_count, meanScore: row.mean_score, improvement: row.improvement, finalized: row.finalized_at !== null, linkedAt: row.linked_at, finalizedAt: row.finalized_at });
function average(state, ids) {
  let total = 0;
  for (const id of ids) {
    const wallet = state.gameWallets?.learners?.[id] || {};
    const earned = wallet.earned ?? 0, bonus = wallet.bonus ?? 0;
    if (![earned, bonus].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9)) fail('INVALID_SERVER_SCORE');
    total += earned + bonus;
  }
  return total / ids.length;
}

export function createLessonLeagueService({ db, now = () => Date.now() }) {
  const q = (sql, ...values) => db.prepare(sql).bind(...values);
  const one = (sql, ...values) => q(sql, ...values).first();
  const all = async (sql, ...values) => (await q(sql, ...values).all()).results || [];
  const run = (sql, ...values) => q(sql, ...values).run();
  const classApi = createLessonClassService({ db, now });
  const ownLeague = async (owner, id) => {
    if (typeof owner !== 'string' || !owner) fail('AUTH_REQUIRED'); validId(id);
    const league = await one('SELECT * FROM lesson_leagues WHERE id=? AND owner_account_id=?', id, owner);
    if (!league) fail('NOT_FOUND'); return league;
  };
  const ownClass = async (owner, id) => {
    validId(id);
    const classroom = await one('SELECT * FROM lesson_classes WHERE id=? AND owner_account_id=? AND deleted_at IS NULL', id, owner);
    if (!classroom) fail('NOT_FOUND'); return classroom;
  };
  const scope = 'EXISTS(SELECT 1 FROM lesson_leagues g JOIN lesson_classes c ON c.id=? WHERE g.id=? AND g.owner_account_id=? AND c.owner_account_id=? AND c.deleted_at IS NULL)';
  const frozenClasses = '(SELECT COUNT(*) FROM lesson_league_classes c WHERE c.league_id=?)=(SELECT COUNT(*) FROM lesson_league_round_results r WHERE r.league_id=? AND r.round=?)';
  const ready = async (leagueId, round) => {
    const counts = await one('SELECT (SELECT COUNT(*) FROM lesson_league_classes WHERE league_id=?) AS enrolled,(SELECT COUNT(*) FROM lesson_league_classes e JOIN lesson_classes c ON c.id=e.class_id WHERE e.league_id=? AND c.deleted_at IS NULL) AS available,(SELECT COUNT(*) FROM lesson_league_round_results WHERE league_id=? AND round=?) AS linked', leagueId, leagueId, leagueId, round);
    return counts.enrolled >= 2 && counts.enrolled === counts.linked && counts.available === counts.enrolled;
  };

  async function createLeague({ ownerAccountId, title, format = 'async', requestId }) {
    if (typeof ownerAccountId !== 'string' || !ownerAccountId) fail('AUTH_REQUIRED');
    if (typeof title !== 'string') fail('INVALID_TITLE'); title = title.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!title || title.length > 120 || /[\u0000-\u001f\u007f]/.test(title)) fail('INVALID_TITLE');
    if (!['async', 'live', 'cooperative'].includes(format)) fail('INVALID_FORMAT');
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) fail('INVALID_REQUEST_ID');
    await run('INSERT INTO lesson_leagues(id,owner_account_id,title,format,request_id,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_account_id,request_id) DO NOTHING', crypto.randomUUID(), ownerAccountId, title, format, requestId, now());
    const row = await one('SELECT * FROM lesson_leagues WHERE owner_account_id=? AND request_id=?', ownerAccountId, requestId);
    if (row.title !== title || row.format !== format) fail('REQUEST_CONFLICT'); return { league: presentLeague(row) };
  }
  async function listLeagues(ownerAccountId) {
    if (typeof ownerAccountId !== 'string' || !ownerAccountId) fail('AUTH_REQUIRED');
    return { leagues: (await all('SELECT * FROM lesson_leagues WHERE owner_account_id=? ORDER BY created_at DESC,rowid DESC', ownerAccountId)).map(presentLeague) };
  }
  async function addClass({ ownerAccountId, leagueId, classId }) {
    await ownLeague(ownerAccountId, leagueId); await ownClass(ownerAccountId, classId);
    const existing = await one('SELECT class_id FROM lesson_league_classes WHERE league_id=? AND class_id=?', leagueId, classId);
    if (existing) return { ok: true };
    const result = await run('INSERT INTO lesson_league_classes(league_id,class_id,added_at) SELECT ?,?,? WHERE ' + scope + ' AND NOT EXISTS(SELECT 1 FROM lesson_league_round_results WHERE league_id=?) ON CONFLICT(league_id,class_id) DO NOTHING', leagueId, classId, now(), classId, leagueId, ownerAccountId, ownerAccountId, leagueId);
    if (!changes(result)) fail('LEAGUE_CLASSES_FROZEN'); return { ok: true };
  }
  async function linkSession({ ownerAccountId, leagueId, classId, sessionId, round }) {
    await ownLeague(ownerAccountId, leagueId); await ownClass(ownerAccountId, classId); validId(sessionId); roundNumber(round);
    const entry = await one('SELECT * FROM lesson_league_classes WHERE league_id=? AND class_id=?', leagueId, classId);
    if (!entry) fail('NOT_FOUND');
    const existing = await one('SELECT * FROM lesson_league_round_results WHERE league_id=? AND class_id=? AND round=?', leagueId, classId, round);
    if (existing) { if (existing.session_id !== sessionId) fail('ROUND_CONFLICT'); return { round: presentRound(existing) }; }
    const session = await one('SELECT s.* FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE s.id=? AND s.class_id=? AND s.owner_account_id=? AND p.status IN (\'approved\',\'published\')', sessionId, classId, ownerAccountId);
    if (!session) fail('NOT_FOUND');
    const state = JSON.parse(session.state);
    const linkedMembers = await all('SELECT l.learner_id FROM lesson_learners l JOIN lesson_class_members m ON m.id=l.class_member_id AND m.class_id=? WHERE l.session_id=? AND l.present=1 AND m.revoked_at IS NULL', classId, sessionId);
    const participants = linkedMembers.map(row => row.learner_id).filter(id => state.roster?.[id]?.present !== false && state.roster?.[id]);
    if (!participants.length) fail('NO_PARTICIPANTS');
    const mean = average(state, participants), id = crypto.randomUUID(), time = now();
    const sessionGuard = 'EXISTS(SELECT 1 FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE s.id=? AND s.class_id=? AND s.owner_account_id=? AND s.revision=? AND p.status IN (\'approved\',\'published\'))';
    const participantGuard = 'NOT EXISTS(SELECT 1 FROM json_each(?) participant WHERE NOT EXISTS(SELECT 1 FROM lesson_learners l JOIN lesson_class_members m ON m.id=l.class_member_id AND m.class_id=? WHERE l.session_id=? AND l.learner_id=participant.value AND l.present=1 AND m.revoked_at IS NULL))';
    try {
      const out = await db.batch([
        q('INSERT INTO lesson_league_round_results(id,league_id,class_id,round,session_id,participant_ids_json,participant_count,linked_revision,linked_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ' + scope + ' AND ' + sessionGuard + ' AND ' + participantGuard, id, leagueId, classId, round, sessionId, JSON.stringify(participants), participants.length, session.revision, time, classId, leagueId, ownerAccountId, ownerAccountId, sessionId, classId, ownerAccountId, session.revision, JSON.stringify(participants), classId, sessionId),
        q('UPDATE lesson_league_classes SET baseline_mean=?,baseline_count=? WHERE league_id=? AND class_id=? AND baseline_mean IS NULL AND EXISTS(SELECT 1 FROM lesson_league_round_results WHERE id=?)', mean, participants.length, leagueId, classId, id)
      ]);
      if (!changes(out[0])) fail('LEAGUE_CONFLICT');
    } catch (error) {
      if (!/UNIQUE/i.test(String(error?.message))) throw error;
      const raced = await one('SELECT * FROM lesson_league_round_results WHERE league_id=? AND class_id=? AND round=?', leagueId, classId, round);
      if (!raced || raced.session_id !== sessionId) fail('ROUND_CONFLICT'); return { round: presentRound(raced) };
    }
    return { round: presentRound(await one('SELECT * FROM lesson_league_round_results WHERE id=?', id)) };
  }
  async function finalizeRound({ ownerAccountId, leagueId, classId, round }) {
    const league = await ownLeague(ownerAccountId, leagueId); await ownClass(ownerAccountId, classId); roundNumber(round);
    const result = await one('SELECT r.*,c.baseline_mean FROM lesson_league_round_results r JOIN lesson_league_classes c ON c.league_id=r.league_id AND c.class_id=r.class_id WHERE r.league_id=? AND r.class_id=? AND r.round=?', leagueId, classId, round);
    if (!result) fail('NOT_FOUND'); if (result.finalized_at !== null) return { round: presentRound(result) };
    if (league.format === 'live' && !await ready(leagueId, round)) fail('LIVE_NOT_READY');
    const session = await one('SELECT s.* FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE s.id=? AND s.class_id=? AND s.owner_account_id=? AND p.status IN (\'approved\',\'published\')', result.session_id, classId, ownerAccountId);
    if (!session) fail('NOT_FOUND');
    if (session.status !== 'concluded') fail('SESSION_NOT_CONCLUDED');
    const state = JSON.parse(session.state), participants = JSON.parse(result.participant_ids_json);
    if (!Array.isArray(participants) || participants.length !== result.participant_count || !participants.length) fail('INVALID_SERVER_SCORE');
    const mean = average(state, participants);
    const liveGuard = league.format === 'live' ? ` AND (SELECT COUNT(*) FROM lesson_league_classes WHERE league_id=?)>=2 AND ${frozenClasses}` : '';
    const written = await run('UPDATE lesson_league_round_results SET mean_score=?,improvement=?,finalized_revision=?,finalized_at=? WHERE id=? AND finalized_at IS NULL AND ' + scope + ' AND EXISTS(SELECT 1 FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash WHERE s.id=lesson_league_round_results.session_id AND s.class_id=? AND s.owner_account_id=? AND s.revision=? AND s.status=\'concluded\' AND p.status IN (\'approved\',\'published\'))' + liveGuard, mean, mean - result.baseline_mean, session.revision, now(), result.id, classId, leagueId, ownerAccountId, ownerAccountId, classId, ownerAccountId, session.revision, ...(league.format === 'live' ? [leagueId, leagueId, leagueId, round] : []));
    if (!changes(written)) {
      const raced = await one('SELECT * FROM lesson_league_round_results WHERE id=?', result.id);
      if (raced && raced.finalized_at !== null) return { round: presentRound(raced) }; fail('LEAGUE_CONFLICT');
    }
    return { round: presentRound(await one('SELECT * FROM lesson_league_round_results WHERE id=?', result.id)) };
  }
  async function getLeague({ ownerAccountId, leagueId, memberToken }) {
    let identity;
    if (memberToken) {
      identity = await classApi.resolveMemberToken(memberToken);
      const allowed = await one('SELECT g.* FROM lesson_leagues g JOIN lesson_league_classes c ON c.league_id=g.id WHERE g.id=? AND c.class_id=?', validId(leagueId), identity.classId);
      if (!allowed) fail('NOT_FOUND'); ownerAccountId = allowed.owner_account_id;
    }
    const league = await ownLeague(ownerAccountId, leagueId);
    const entries = await all('SELECT e.*,c.title FROM lesson_league_classes e JOIN lesson_classes c ON c.id=e.class_id WHERE e.league_id=? AND c.owner_account_id=? AND c.deleted_at IS NULL ORDER BY e.added_at,e.rowid', leagueId, ownerAccountId);
    const rounds = await all('SELECT * FROM lesson_league_round_results WHERE league_id=? ORDER BY round,linked_at,rowid', leagueId);
    const latestRound = rounds.length ? Math.max(...rounds.map(row => row.round)) : null;
    const liveReady = league.format === 'live' && latestRound !== null ? await ready(leagueId, latestRound) : false;
    const provisional = new Map();
    const cooperativeReady = league.format === 'cooperative' && entries.length > 0 && entries.every(entry => rounds.some(row => row.class_id === entry.class_id && row.round === latestRound));
    if (liveReady || cooperativeReady) {
      const linked = await all('SELECT r.*,s.state,c.baseline_mean FROM lesson_league_round_results r JOIN lesson_sessions s ON s.id=r.session_id AND s.class_id=r.class_id JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash JOIN lesson_league_classes c ON c.league_id=r.league_id AND c.class_id=r.class_id WHERE r.league_id=? AND r.round=? AND s.owner_account_id=? AND p.status IN (\'approved\',\'published\')', leagueId, latestRound, ownerAccountId);
      for (const row of linked) {
        const mean = row.finalized_at !== null ? row.mean_score : average(JSON.parse(row.state), JSON.parse(row.participant_ids_json));
        provisional.set(row.class_id, { ...presentRound(row), meanScore: mean, improvement: mean - row.baseline_mean, provisional: row.finalized_at === null });
      }
    }
    const classes = entries.map(entry => {
      const own = rounds.filter(row => row.class_id === entry.class_id), latest = own.find(row => row.round === latestRound && row.finalized_at !== null);
      return { ...(identity ? {} : { classId: entry.class_id }), classTitle: entry.title, baselineMean: entry.baseline_mean, latest: provisional.get(entry.class_id) || (latest ? presentRound(latest) : null), rounds: own.map(row => ({ ...presentRound(row), ...(identity ? {} : { sessionId: row.session_id }) })) };
    });
    const scored = classes.filter(entry => entry.latest), highest = [...scored].sort((a, b) => b.latest.meanScore - a.latest.meanScore).map(entry => ({ classTitle: entry.classTitle, meanScore: entry.latest.meanScore }));
    const mostImproved = [...scored].sort((a, b) => b.latest.improvement - a.latest.improvement).map(entry => ({ classTitle: entry.classTitle, improvement: entry.latest.improvement }));
    const participants = scored.reduce((total, entry) => total + entry.latest.participantCount, 0);
    const cooperativeMean = participants ? scored.reduce((total, entry) => total + entry.latest.meanScore * entry.latest.participantCount, 0) / participants : null;
    if (identity) await classApi.resolveMemberToken(memberToken); else await ownLeague(ownerAccountId, leagueId);
    return { league: presentLeague(league), round: latestRound, classes, highest, mostImproved, cooperativeMean, participantCount: participants, liveReady, scoresFinal: scored.length === entries.length && scored.length > 0 && scored.every(entry => entry.latest.finalized), readOnly: Boolean(identity) };
  }
  return { createLeague, listLeagues, getLeague, addClass, linkSession, finalizeRound };
}
