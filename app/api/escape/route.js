import { COMMUNITY_CELL, individual, communityOf, gameNow, communityActive, createCommunity, communityAnswer, publicCommunity, settleCommunity, arenaEventOf, registerPause, canOpenEvent, enqueueEvent, eventQueueState } from '../../../lib/community.js';
import { ARENA_CELL, COMBAT_ACTIONS, createArenaEvent, arenaEntries, arenaAnswer, arenaCombat, publicArena, settleArena, arenaPhase } from '../../../lib/arena-community.js';
import { checkContext } from '../../../lib/context-questions.js';
import { createCampaign, campaignPublic, numericAnswer, modeConfig } from '../../../lib/campaign.js';
import {createGame, reduce as reduceMode} from '../../../lib/mode-engine/index.js';
import {projectMode} from '../../../lib/mode-runtime.js';
import {serializePublic as modePublic} from '../../../lib/mode-engine/serialize.js';
import { stationLogic } from '../../../lib/station-logic.js';
import { initRace, taskIndex, selectTurn, ready, roll, finishStation, doorCode, racePublic, compareTeams, advanceMath } from '../../../lib/race.js';
import { SKILLS, effects } from '../../../lib/skills.js';
import { challenge, safePuzzle, checkPuzzle } from '../../../lib/challenges.js';
import G from '../../../lib/game-engine.js';
import { hints } from '../../../lib/hints.js';
import { guide } from '../../../lib/teacher-guide.js';
import { stmt, db, getEnv } from '../../../lib/storage.js';
import { resolveIdentity, fetchAuthority, authorizeAction, canCreateRoom, requiredPermission, createRoomOwnershipStatements } from '../../../lib/account-room-access.js';
import { managementStatements } from '../../../lib/room-management.js';
import { fingerprint } from '../../../lib/room-events.js';
import { createRecovery, setDraft, downgradeQuestion, requestTeacherHelp, reportBrokenQuestion, abandon as abandonRecovery } from '../../../lib/recovery.js';
export const dynamic = 'force-dynamic';
const fail = (message, status = 400, code) => Response.json({ error: message, ...(code ? { code } : {}) }, { status, headers: { 'Cache-Control': 'no-store' } });
const reply = data => Response.json({ ...data, serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
const hash = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(x => x.toString(16).padStart(2, '0')).join('');
function puzzle(s, i, l) { const seed=s.questionSeeds?.[i]??s.seed; return s.campaign ? stationLogic(i, l, seed) : challenge(i, l, seed); }
function roomCampaign(room) { return room.config ? JSON.parse(room.config) : null; }
function modeView(room,s,host=false) {
    const mode=projectMode(room,Date.now());
    return mode?{...modePublic(mode,s?.modeUnit,host),unitId:s?.modeUnit??null,revision:room.revision,round:room.round}:null;
}
function guardRequest(s, b, room, revision) {
    if (typeof b.requestId !== 'string' || !b.requestId.trim() || b.requestId.length > 70 || ['__proto__', 'constructor', 'prototype'].includes(b.requestId))
        return { error: 'Thiếu mã lượt gửi.' };
    if ((b.round ?? 1) !== room.round)
        return { error: 'Phòng đã reset.', status: 409, code: 'SESSION_RESET' };
    s.requestCache ??= {};
    const key = b.requestId, fp = fingerprint({ ...b, requestId: undefined });
    const prior = Object.hasOwn(s.requestCache, key) ? s.requestCache[key] : null;
    if (prior) {
        if (prior.fingerprint === undefined)
            return { replay: prior };
        if (prior.fingerprint !== fp)
            return { error: 'Mã thao tác đã được dùng cho dữ liệu khác.', status: 409, code: 'REQUEST_ID_CONFLICT' };
        return { replay: prior.result };
    }
    if (b.revision !== undefined && (!Number.isInteger(b.revision) || b.revision !== revision))
        return { error: 'Tiến độ vừa thay đổi. Hãy đồng bộ rồi thử lại.', status: 409, code: 'REVISION_MISMATCH' };
    if (b.deadline !== undefined && (!Number.isFinite(b.deadline) || Date.now() > b.deadline))
        return { error: 'Lượt gửi đã hết hạn. Hãy thử lại.', status: 409, code: 'DEADLINE_EXPIRED' };
    return { fingerprint: fp };
}
function rememberRequest(s, b, guard, result) {
    s.requestCache[b.requestId] = { fingerprint: guard.fingerprint, result };
    s.eventHistory ??= [];
    s.eventHistory.push({ requestId: b.requestId, type: b.action, round: s.round || 1, questionRevision: s.recovery?.questionRevision ?? 0, at: Date.now(), result });
}
function recoveryFor(s, i) {
    if (!s.recovery || s.recovery.stage !== i || s.recovery.round !== (s.round||1) || s.recovery.participant !== `${s.id}:${i}`) {
        s.recoveryHistory ??= [];
        if (s.recovery?.round === (s.round||1) && s.recovery.state !== 'complete') s.recoveryHistory.push(s.recovery);
        s.recovery = { ...createRecovery({ participant: `${s.id}:${i}`, round: s.round || 1, questionRevision: 0, phase: i === 0 ? 'start' : i >= 4 ? 'end' : 'middle' }), stage: i };
    }
    return s.recovery;
}
function recoveryContext(s,b,i,required=false) {
    if ((required || b.stage !== undefined) && (!Number.isInteger(b.stage)||b.stage!==i)) return fail('Trạm đã thay đổi hoặc thiếu mã trạm. Hãy đồng bộ lại.',409,'STAGE_MISMATCH');
    const r=recoveryFor(s,i);
    if ((required || b.questionRevision!==undefined || r.questionRevision>0) && (!Number.isInteger(b.questionRevision)||b.questionRevision!==r.questionRevision)) return fail('Đề đã thay đổi hoặc thiếu phiên bản đề. Bản nháp cũ không được gửi.',409,'DRAFT_REVISION_MISMATCH');
    return null;
}
function supportHint(s,i,level,now) {
    const r=recoveryFor(s,i),policy=s.campaign?.supportPolicy||'competitive';
    if(level<1||level>3||level>s.hints[i].length+1)return {ok:false,reason:'stale'};
    if(level<=s.hints[i].length)return {ok:true,level,cost:0};
    const before=s.penalty,result=G.hint(s,i,now);
    if(!result.ok)return result;
    const cost=policy==='practice'?0:Math.min(result.cost,Math.max(0,180000-(r.supportPenalty||0)));
    s.penalty=before+cost;r.supportPenalty=(r.supportPenalty||0)+cost;
    const event=s.events.at(-1);event.type='support-hint';event.cost=cost;
    r.hintTier=['none','nudge','method','guided'][level];
    r.supportUntil??=now+8000;
    if(level===3)r.assisted=true;
    return {...result,cost,assisted:!!r.assisted};
}
function supportView(s,i) {
    const r=s.recovery;if(!r||r.stage!==i||r.round!==(s.round||1)||r.participant!==`${s.id}:${i}`)return null;
    const p=s.levels?.[i]!=null?puzzle(s,i,s.levels[i]):null;
    return {...r,policy:s.campaign?.supportPolicy||'competitive',points:p?Math.floor(p.points*(r.assisted?.5:1)):null,downgradePoints:p&&p.level>0?Math.floor(puzzle(s,i,p.level-1).points*(r.assisted?.5:1)):null};
}
const bearer = req => (req.headers.get('authorization') || '').replace(/^Bearer /, '');
async function communityData(room) {
    let c = communityOf(room);
    if (!c)
        return { c: null, entries: [] };
    let rows = (await stmt('SELECT cp.data,t.removed_at FROM community_players cp JOIN teams t ON t.id=cp.team_id WHERE cp.event_id=?', c.id).all()).results, entries = rows.map(r => ({ ...JSON.parse(r.data), withdrawn: !!r.removed_at }));
    return { c, entries };
}
async function communityView(room, ownId, teacher = false) { let { c, entries } = await communityData(room); return publicCommunity(c, roomCampaign(room), entries, Date.now(), ownId, teacher); }
// Arena rows live in the same community_players table, keyed by the arena event id.
async function arenaData(room) {
    let a = arenaEventOf(room);
    if (!a)
        return { a: null, entries: [] };
    let rows = (await stmt('SELECT cp.data,t.removed_at FROM community_players cp JOIN teams t ON t.id=cp.team_id WHERE cp.event_id=?', a.id).all()).results;
    return { a, entries: rows.map(r => ({ ...JSON.parse(r.data), withdrawn: !!r.removed_at })) };
}
async function arenaView(room, ownId, teacher = false) { let { a, entries } = await arenaData(room); return publicArena(a, roomCampaign(room), entries, Date.now(), ownId, teacher); }
// One wording per event type; both pause the same main-game clock.
function pausedMessage(room) {
    return arenaEventOf(room) && Date.now() < arenaEventOf(room).resumeAt
        ? 'Cả lớp đang ở Lôi Đài Ngũ Ấn. Ván chính được tạm dừng.'
        : 'Cả lớp đang tham gia đua thuyền Toán. Ván chính được tạm dừng.';
}
// Shared roster snapshot for any community event trigger.
async function eventRoster(room, now) {
    return (await stmt('SELECT data FROM teams WHERE room_id=? AND removed_at IS NULL ORDER BY rowid', room.id).all()).results.map(r => { let x = JSON.parse(r.data); if (x.status === 'waiting') {
        x.status = 'active';
        x.start = room.started;
    } G.expire(x, now); initRace(x); return x; });
}
// Each player returns to the exact stage/revision/round they paused on.
function returnMarkers(roster) {
    return Object.fromEntries(roster.map(x => [x.id, { stage: taskIndex(x), questionRevision: x.recovery?.questionRevision ?? 0, round: x.round || 1 }]));
}
async function settle(s, room, data, arena) { let { c, entries } = data || await communityData(room); if (c)
    settleCommunity(s, room, entries); let { a, entries: arenaRows } = arena || await arenaData(room); if (a)
    settleArena(s, room, a, arenaRows); }
async function publicState(s, room, revision = 0) {
    if(roomCampaign(room)?.rule&&roomCampaign(room).rule!=='campaign')return {id:s.id,name:s.name,status:room.started?'active':'waiting',round:room.round,revision,mode:modeView(room,s),arena:await arenaView(room,s.id),community:await communityView(room,s.id),start:s.start,race:null,solved:[],hints:[],events:[],drafts:{},room:room.code};
    const i=taskIndex(s);if(i<5&&s.status==='active')recoveryFor(s,i);
    let v=G.variant(s.seed),recovery=supportView(s,i);
    return {recovery,supportPolicy:s.campaign?.supportPolicy||'competitive',drafts:s.drafts||{},community:await communityView(room,s.id),arena:await arenaView(room,s.id),race:racePublic(s),round:s.round||1,levels:s.levels||null,score:s.effects?.wallet??s.score??0,effects:s.effects||null,puzzles:s.levels?s.levels.map((l,j)=>{if(l===null)return null;const p=safePuzzle(puzzle(s,j,l));if(j===i&&recovery?.assisted)p.points=recovery.points;return p;}):null,revision,version:s.version,id:s.id,name:s.name,status:s.status,start:s.start,end:s.end,solved:s.solved,hints:s.hints,wrong:s.wrong,penalty:s.penalty,cooldown:s.cooldown,events:s.events,variant:v,room:room.code,hintTexts:s.hints.map((levels,j)=>(s.levels&&s.levels[j]!==null?levelHints(puzzle(s,j,s.levels[j])):hints(j,v)).slice(0,levels.length))};
}
function levelHints(p) {
    return ['Đọc từng điều kiện và đánh dấu dữ kiện đã biết. Chưa cần đoán đáp án.',
        'Lập bảng các trường hợp hoặc ghi từng bước tính. Loại trường hợp vi phạm bất kỳ điều kiện nào; kiểm tra lại trên bàn thử.',
        `Hoàn thành bước cuối: đối chiếu từng giá trị với đề rồi tự nhập ${p.fields.map(f=>f.label).join('; ')}. Với mã hàng đơn vị, lấy phần dư khi chia kết quả cho 10. Hệ thống vẫn kiểm tra toàn bộ đáp án; giải đúng với hỗ trợ nhận 50% điểm câu này.`];
}
function unavailable(code, message) { throw Object.assign(Error(message), { code, status: 410 }); }
function assertRoom(room) { if (!room || room.deleted_at)
    unavailable('ROOM_DELETED', 'Giáo viên đã xóa phòng này. Hãy xin mã phòng mới.'); }
async function loadTeam(req, id) { let row = await stmt('SELECT * FROM teams WHERE id = ?', id).first(); if (!row || await hash(bearer(req)) !== row.token_hash)
    return null; let room = await stmt('SELECT * FROM rooms WHERE id = ?', row.room_id).first(); assertRoom(room); if (row.removed_at)
    unavailable('TEAM_REMOVED', 'Giáo viên đã xóa đội này khỏi phòng. Có thể nhập lại mã phòng để vào bằng tên nhóm mới.'); let s = JSON.parse(row.data); if ((s.round || 1) !== room.round) {
    row = await stmt('SELECT * FROM teams WHERE id = ?', id).first();
    if (row.removed_at)
        unavailable('TEAM_REMOVED', 'Giáo viên đã xóa đội này khỏi phòng.');
    s = JSON.parse(row.data);
} if (room.mode === 'race') {
    s.campaign ??= roomCampaign(room);
    initRace(s);
} if (s.status === 'waiting' && room.started) {
    s.status = 'active';
    s.start = room.started;
} if (s.recovery && (s.recovery.round!==(s.round||1) || s.recovery.participant!==`${s.id}:${s.recovery.stage}`)) {s.recovery=null;s.recoveryHistory=[];s.eventHistory=[];s.drafts={};}
if (s.race && s.race.phase === 'challenge' && !s.race.entered && room.started)
    s.race.entered = room.started; await settle(s, room); G.expire(s, gameNow(room)); let actions = (await stmt('SELECT * FROM skill_actions WHERE room_id = ? AND (actor_id = ? OR target_id = ?)', room.id, s.id, s.id).all()).results; s.effects = effects(s, actions, gameNow(room)); if(s.recovery?.supportUntil&&s.recovery.state!=='complete')s.effects.freezeUntil=Math.max(s.recovery.supportUntil,Math.min(s.effects.freezeUntil,s.recovery.supportUntil)); return { row, room, s }; }
async function admin(req, id) { let room = await stmt('SELECT * FROM rooms WHERE id = ?', id).first(); if (!room || await hash(bearer(req)) !== room.admin_hash)
    return null; assertRoom(room); return room; }
/**
 * Unified teacher authorization for escape route actions.
 *
 * Authorization flow (enforced fresh every call):
 *   1. If room is legacy (owner_account_id IS NULL): legacy bearer is the only valid credential.
 *      Account identity headers are ignored for legacy rooms to avoid breaking existing sessions.
 *   2. If room is account-owned (owner_account_id IS NOT NULL):
 *      a. Identity is read from Sites-dispatched request headers only (never body/query).
 *      b. Authority is resolved fresh from system_hosts + room_memberships.
 *      c. Bearer is ignored entirely — revoked system hosts and revoked memberships are denied
 *         even if they present the original admin bearer (old bearer cannot bypass revoke).
 *
 * @param {Request} req
 * @param {string} roomId
 * @param {string} action - the permission string required (see requiredPermission())
 * @returns {object|null} room row if authorized, null if not authorized
 */
async function adminAuth(req, roomId, action) {
    const room = await stmt('SELECT * FROM rooms WHERE id=?', roomId).first();
    if (!room) return null;
    const {user, isRootUser} = resolveIdentity(req, getEnv());
    if (isRootUser) {
        assertRoom(room);
        return room;
    }
    // Legacy room: owner_account_id is NULL. Only the legacy bearer may manage it.
    if (room.owner_account_id === null || room.owner_account_id === undefined) {
        if (await hash(bearer(req)) !== room.admin_hash) return null;
        assertRoom(room);
        return room;
    }
    // Account-owned room: identity from headers only.
    assertRoom(room);
    if (!user) return null;
    const {authority} = await fetchAuthority(stmt, {user, isRootUser, roomId, room});
    if (!authorizeAction(authority, action)) return null;
    return room;
}
async function raceRoom(room) {
    if(roomCampaign(room)?.rule&&roomCampaign(room).rule!=='campaign')return null;
    if (room.mode !== 'race')
        return null;
    for (let attempt = 0; attempt < 5; attempt++) {
        let current = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
        assertRoom(current);
        let rows = (await stmt('SELECT id,data FROM teams WHERE room_id=? AND removed_at IS NULL ORDER BY rowid', room.id).all()).results;
        let actions = (await stmt('SELECT * FROM skill_actions WHERE room_id=?', room.id).all()).results, now = gameNow(current), data = await communityData(current), arena = await arenaData(current);
        let teams = [];
        for (let row of rows) {
            let s = JSON.parse(row.data);
            s.campaign ??= roomCampaign(current);
            initRace(s);
            if (s.status === 'waiting' && current.started) {
                s.status = 'active';
                s.start = current.started;
            }
            await settle(s, current, data, arena);
            G.expire(s, now);
            s.effects = effects(s, actions, now);
            teams.push(s);
        }
        let old = JSON.parse(current.race || 'null'), solo = roomCampaign(current)?.playMode === 'individual';
        let turn = solo ? { cursor: null, deadline: 0, sequence: 0, log: [], ...old, mode: 'individual' } : current.started && !communityActive(current) ? selectTurn(old, teams, now) : { ...old, cursor: null, deadline: 0, sequence: old?.sequence || 0, log: old?.log || [] };
        if (JSON.stringify(turn) !== JSON.stringify(old)) {
            let saved = await stmt('UPDATE rooms SET race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL', JSON.stringify(turn), room.id, current.revision, current.round).run();
            if (!saved.meta.changes)
                continue;
            current.revision++;
            current.race = JSON.stringify(turn);
        }
        let publicTurn = { ...turn };
        delete publicTurn.community;
        delete publicTurn.arena;
        delete publicTurn.commit;
        return { campaign: campaignPublic(roomCampaign(current)), turn: publicTurn, community: publicCommunity(data.c, roomCampaign(current), data.entries, Date.now()), arena: publicArena(arena.a, roomCampaign(current), arena.entries, Date.now()), roomRevision: current.revision, peers: teams.map(s => ({ id: s.id, name: s.name, status: s.status, position: s.race.position, mascot: s.race.mascot, phase: s.race.reward ? 'reward' : s.race.bonus && !s.race.bonus.done ? 'bonus' : s.race.phase, completed: s.race.outcomes.filter(o => !o.skipped).length, freezeUntil: s.effects.freezeUntil, score: s.effects.wallet })), log: turn.log || [] };
    }
    throw Error('Board busy');
}
function raceReport(s, now) { let r = G.report(s, now); if (s.race) {
    r.completed = s.race.outcomes.filter(o => !o.skipped).length;
    r.race = racePublic(s);
} return r; }
export async function GET(req) { try {
    let u = new URL(req.url), kind = u.searchParams.get('kind'), id = u.searchParams.get('id');
    if (!id)
        return fail('Thiếu phiên.');
    if (kind === 'crew') {
        let t = await loadTeam(req, id);
        if (!t)
            return fail('Không có quyền truy cập.', 403);
        let rows = (await stmt('SELECT id,data FROM teams WHERE room_id = ? AND removed_at IS NULL', t.room.id).all()).results;
        return reply({ map: await raceRoom(t.room), peers: rows.map(row => { let x = JSON.parse(row.data); if (x.status === 'waiting' && t.room.started)
                x.status = 'active'; G.expire(x, gameNow(t.room)); return { id: x.id, name: x.name, status: x.status, completed: x.race ? x.race.outcomes.filter(o => !o.skipped).length : x.solved.length }; }) });
    }
    if (kind === 'state') {
        let t = await loadTeam(req, id);
        if (!t)
            return fail('Không tìm thấy quyền truy cập phiên này.', 403);
        if (JSON.stringify(t.s) !== t.row.data) {
            let saved = await stmt('UPDATE teams SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=teams.room_id AND deleted_at IS NULL AND round=?)', JSON.stringify(t.s), id, t.row.revision, t.s.round || 1).run();
            if (saved.meta.changes)
                t.row.revision++;
            else
                t = await loadTeam(req, id);
        }
        return reply({ state: await publicState(t.s, t.room, t.row.revision), map: await raceRoom(t.room) });
    }
    if (kind === 'board') {
        let room = await adminAuth(req, id, 'read-room');
        if (!room)
            return fail('Mã quản lý phòng không hợp lệ.', 403);
        let roomActions = (await stmt('SELECT * FROM skill_actions WHERE room_id = ? ORDER BY created', id).all()).results;
        let rows = (await stmt('SELECT id,data FROM teams WHERE room_id = ? AND removed_at IS NULL', id).all()).results;
        let sharedMap = await raceRoom(room);
        room = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
        let communityInfo = await communityData(room), arenaInfo = await arenaData(room);
        let list = await Promise.all(rows.map(async (row) => { let s = JSON.parse(row.data); if (room.mode === 'race') {
            s.campaign ??= roomCampaign(room);
            initRace(s);
        }
        s.drafts ??= {};
        if (s.status === 'waiting' && room.started) {
            s.status = 'active';
            s.start = room.started;
        } if (s.race && s.race.phase === 'challenge' && !s.race.entered && room.started)
            s.race.entered = room.started; await settle(s, room, communityInfo, arenaInfo); G.expire(s, gameNow(room)); s.effects = effects(s, roomActions, gameNow(room)); let extra = { mathHistory: s.race?.mathHistory || [], bonusGuide: s.race?.bonus ? { question: s.race.bonus.question, answer: s.race.bonus.answer, steps: s.race.bonus.steps || [], points: s.race.bonus.points || 40, done: s.race.bonus.done } : null, race: racePublic(s), effects: s.effects, variant: G.variant(s.seed), guide: s.levels ? s.levels.map((l, i) => l === null ? { title: 'Chưa chọn mức độ', question: ['Nhóm chưa chọn mức độ cho khóa này.'], steps: [], answer: 'Chưa có đề.', digit: '·' } : puzzle(s, i, l)) : guide(G.variant(s.seed)), drafts: s.drafts || {}, submissions: s.submissions || [], events: s.events, solved: s.solved, levels: s.levels || null, score: s.effects.wallet }; return s.status === 'waiting' ? { id: s.id, team: s.name, status: 'waiting', completed: 0, elapsedMs: 0, penaltyMs: 0, adjustedMs: 0, hints: [0, 0, 0, 0, 0], wrong: 0, ...extra } : { ...raceReport(s, gameNow(room)), ...extra }; }));
        for (const team of list) {
            const saved = JSON.parse(rows.find(row => row.id === team.id).data);
            team.recovery = saved.recovery || null;
            team.recoveryHistory = saved.recoveryHistory || [];
            team.eventHistory = saved.eventHistory || [];
            team.revision = (await stmt('SELECT revision FROM teams WHERE id=?',team.id).first()).revision;
            team.round = saved.round || 1;
            const mode=projectMode(room,Date.now());
            team.mode=mode?{...modeView(room,saved,true),objective:mode.ruleState.players[saved.modeUnit]||null,history:JSON.parse(room.race).modeRequests?.eventHistory?.filter(e=>e.unitId===saved.modeUnit)||[],answers:Object.values(mode.challenges).filter(q=>q.unitId===saved.modeUnit)}:null;
        }
        return reply({ community: await communityView(room, null, true), arena: await arenaView(room, null, true), eventQueue: eventQueueState(JSON.parse(room.race || 'null'), Date.now()).queue, room: { id: room.id, title: room.title, code: room.code, started: room.started, round: room.round, revision: room.revision, created: room.created, mode: room.mode, campaign: campaignPublic(roomCampaign(room)) }, map: sharedMap, teams: list.sort(compareTeams), skills: roomActions.map(a => ({ ...a, actor: list.find(t => t.id === a.actor_id)?.team || 'Đội đã xóa', target: list.find(t => t.id === a.target_id)?.team || 'Đội đã xóa' })) });
    }
    return fail('Yêu cầu không hợp lệ.');
}
catch (e) {
    if (e.code)
        return fail(e.message, e.status, e.code);
    console.error('escape GET', e.message);
    return fail('Chưa kết nối được máy chủ. Giữ trang mở và thử lại.', 503);
} }
function submitLevel(s, input, now) { if (now < (s.effects?.freezeUntil || 0))
    return { ok: false, reason: 'frozen' }; if (!s.levels)
    return G.submit(s, s.solved.length, input, now); let i = taskIndex(s); if (now < (s.effects?.freezeUntil || 0))
    return { ok: false, reason: 'frozen' }; if (G.expire(s, now) || s.status !== 'active' || (s.race && s.race.phase !== 'challenge') || i >= 5 || s.levels[i] === null)
    return { ok: false, reason: 'inactive' }; if (now < s.cooldown)
    return { ok: false, reason: 'cooldown' }; if (s.race?.bonus && !s.race.bonus.done)
    return { ok: false, reason: 'bonus' }; let p = puzzle(s, i, s.levels[i]); if (!checkPuzzle(p, input)) {
    s.wrong++;
    const recovery=s.recovery;
    const cost=recovery?.supportUntil?Math.min(G.WRONG_COST,Math.max(0,180000-(recovery.supportPenalty||0))):G.WRONG_COST;
    s.penalty += cost;
    if(recovery?.supportUntil)recovery.supportPenalty=(recovery.supportPenalty||0)+cost;
    s.cooldown = now + G.COOLDOWN;
    s.events.push({ type: 'wrong', lock: i + 1, cost: G.WRONG_COST, at: now });
    return { ok: false, reason: 'wrong' };
} const recovery=recoveryFor(s,i),points=Math.floor(p.points*(recovery.assisted?.5:1));
recovery.state='complete';recovery.completedAt=now;recovery.helpPending=false;recovery.reportPending=false;
s.recoveryHistory??=[];s.recoveryHistory.push({...recovery});
if (s.race) {
    if (s.race.phase !== 'challenge')
        return { ok: false, reason: 'inactive' };
    finishStation(s, p.digit, now);
}
else
    s.solved.push(p.digit); s.score = (s.score || 0) + points; s.events.push({ type: 'solved', lock: i + 1, points, assisted:!!recovery.assisted, at: now }); return { ok: true, digit: p.digit, points }; }
function unlockRace(s, code, now) { if (G.expire(s, now) || s.status !== 'active' || s.race.phase !== 'gate' || s.race.bonus && !s.race.bonus.done)
    return { ok: false, reason: 'inactive' }; if (now < s.cooldown)
    return { ok: false, reason: 'cooldown' }; if (String(code).trim() !== doorCode(s)) {
    s.wrong++;
    s.penalty += 60000;
    s.cooldown = now + 10000;
    s.events.push({ type: 'wrong', lock: 6, cost: 60000, at: now });
    return { ok: false, reason: 'wrong' };
} s.status = 'completed'; s.end = now; s.race.phase = 'finished'; s.events.push({ type: 'completed', at: now }); return { ok: true }; }
export async function POST(req) {
    try {
        let origin = req.headers.get('origin');
        if (origin && origin !== new URL(req.url).origin)
            return fail('Nguồn yêu cầu không hợp lệ.', 403);
        if (Number(req.headers.get('content-length') || 0) > 12000)
            return fail('Yêu cầu quá dài.');
        let rawBody;
        try { rawBody = await req.text(); } catch { return fail('Yêu cầu quá dài.'); }
        if (new TextEncoder().encode(rawBody).byteLength > 12000)
            return fail('Yêu cầu quá dài.');
        let b;
        try { b = JSON.parse(rawBody); } catch { return fail('Yêu cầu không hợp lệ.'); }
        if (b.action === 'create-room') {
            // Identity required — no anonymous room creation, no first-visitor bootstrap.
            const env = getEnv();
            const {user, isRootUser} = resolveIdentity(req, env);
            if (!user) return fail('Cần đăng nhập để tạo phòng.', 401, 'AUTH_REQUIRED');
            // Fetch system host status to determine create privilege.
            const {authority} = await fetchAuthority(stmt, {user, isRootUser, roomId: null});
            if (!canCreateRoom(authority, user))
                return fail('Chỉ tài khoản giáo viên đang hoạt động mới được tạo phòng.', 403, 'FORBIDDEN');
            if (typeof b.id !== 'string' || b.id.length > 60 || b.id.length < 1 || ['__proto__', 'constructor', 'prototype'].includes(b.id))
                return fail('Thông tin phòng không hợp lệ.');
            // Legacy bearer path: rooms use adminKey for backward compatibility during transition.
            // New rooms are always account-owned; adminKey is required but its hash is stored.
            if (typeof b.adminKey !== 'string' || b.adminKey.length < 50)
                return fail('Thông tin phòng không hợp lệ.');
            let existing = await stmt('SELECT * FROM rooms WHERE id = ?', b.id).first();
            if (existing) {
                // Existing account-owned room: caller must be the owner (or have authority).
                if (existing.owner_account_id !== null && existing.owner_account_id !== undefined) {
                    if (existing.owner_account_id !== user.userId && !isRootUser)
                        return fail('Không có quyền truy cập.', 403);
                    assertRoom(existing);
                    return reply({ room: { id: existing.id, code: existing.code, title: existing.title, started: existing.started } });
                }
                // Legacy room: check bearer as before.
                if (existing.admin_hash !== await hash(b.adminKey))
                    return fail('Không có quyền truy cập.', 403);
                assertRoom(existing);
                return reply({ room: { id: existing.id, code: existing.code, title: existing.title, started: existing.started } });
            }
            let config = null;
            try {
                if (b.campaign)
                    config = createCampaign(b.campaign, crypto.getRandomValues(new Uint32Array(1))[0]);
                if(config)Object.assign(config,modeConfig(b.campaign));
            }
            catch (e) {
                return fail(e.message);
            }
            let alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', rnd = crypto.getRandomValues(new Uint8Array(6)), code = Array.from(rnd, x => alphabet[x % alphabet.length]).join('');
            const now = Date.now();
            const title = String(b.title || 'Nhiệm vụ cứu hộ').trim().slice(0, 60);
            const auditId = crypto.randomUUID();
            const mutationId = crypto.randomUUID();
            // Atomic: room INSERT + membership + audit in one batch.
            const insertRoom = stmt("INSERT INTO rooms (id,code,admin_hash,title,created,started,mode,config,owner_account_id) SELECT ?,?,?,?, ?,NULL,'race',?,? WHERE NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=? AND revoked_at IS NOT NULL)", b.id, code, await hash(b.adminKey), title, now, config ? JSON.stringify(config) : null, user.userId, user.userId);
            // Account upsert ensures the FK parent exists before room ownership is written.
            const upsertAccount = stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name', user.userId, user.email, user.displayName ?? null, now);
            const ownershipStatements = createRoomOwnershipStatements(stmt, {roomId: b.id, accountId: user.userId, auditId, mutationId, now});
            const created = await db().batch([upsertAccount, insertRoom, ...ownershipStatements]);
            if (created[1].meta.changes !== 1)
                return fail('Quyền host đã thay đổi. Không thể tạo phòng.', 403, 'FORBIDDEN');
            return reply({ room: { id: b.id, code, title, started: null } });
        }
        if (b.action === 'room-info') {
            let code = String(b.code || '').trim().toUpperCase();
            if (!/^[A-Z2-9]{6}$/.test(code))
                return fail('Mã phòng chưa đúng.');
            let room = await stmt('SELECT * FROM rooms WHERE code = ? AND deleted_at IS NULL', code).first();
            if (!room)
                return fail('Mã phòng chưa đúng. Kiểm tra mã giáo viên cung cấp.');
            return reply({ campaign: campaignPublic(roomCampaign(room)) });
        }
        if (b.action === 'join') {
            let name = String(b.name || '').trim().slice(0, 40), code = String(b.code || '').trim().toUpperCase();
            if (!name || !code)
                return fail('Nhập mã phòng và tên nhóm.');
            let room = await stmt('SELECT * FROM rooms WHERE code = ? AND deleted_at IS NULL', code).first();
            if (!room)
                return fail('Mã phòng chưa đúng. Kiểm tra mã giáo viên cung cấp.');
            let count = await stmt('SELECT COUNT(*) AS n FROM teams WHERE room_id = ? AND removed_at IS NULL', room.id).first();
            if (count.n >= 40)
                return fail('Phòng đã đủ 40 nhóm.');
            let key = name.normalize('NFC').toLocaleLowerCase('vi');
            let dup = await stmt('SELECT id FROM teams WHERE room_id = ? AND name_key = ? AND removed_at IS NULL', room.id, key).first();
            if (dup)
                return fail('Tên nhóm này đã vào phòng. Dùng lại thiết bị đã vào, hoặc chọn tên nhóm khác.', 409);
            let seed = crypto.getRandomValues(new Uint32Array(1))[0], s = G.make(name, seed, room.started || 0);
            const modeConfigValue = roomCampaign(room)?.rule && roomCampaign(room).rule !== 'campaign' ? roomCampaign(room) : null;
            if (modeConfigValue) {
                const participation = modeConfigValue.participation || 'individual';
                if (b.memberNames !== undefined && (!Array.isArray(b.memberNames) || b.memberNames.some(value=>typeof value !== 'string'||!value.trim()||value.length>80)))
                    return fail('Danh sách thành viên trên thiết bị chưa hợp lệ.',400,'DEVICE_MEMBERS_INVALID');
                const memberNames = Array.isArray(b.memberNames) ? b.memberNames.map(value => value.trim()) : [name];
                const maxMembers = participation === 'individual' ? 1 : participation === 'pairs' ? 2 : 4;
                if (memberNames.length < 1 || memberNames.length > maxMembers || new Set(memberNames).size !== memberNames.length)
                    return fail('Danh sách thành viên trên thiết bị chưa hợp lệ.', 409, 'DEVICE_MEMBERS_INVALID');
                if (participation === 'individual' && memberNames[0] !== name)
                    return fail('Tên thiết bị phải trùng tên học sinh.', 409, 'DEVICE_MEMBER_MISMATCH');
                s.memberNames = memberNames;
            }
            s.round = room.round;
            s.levels = [null, null, null, null, null];
            s.score = 0;
            s.mascot = Number.isInteger(b.mascot) && b.mascot >= 0 && b.mascot < 8 ? b.mascot : seed % 8;
            if (room.mode === 'race') {
                s.campaign ??= roomCampaign(room);
                initRace(s);
            }
            s.status = room.started ? 'active' : 'waiting';
            s.start = room.started;
            s.requestCache = {};
            G.expire(s, gameNow(room));
            let token = crypto.randomUUID() + crypto.randomUUID();
            let nextRace = null;
            const parsedRace = JSON.parse(room.race || 'null');
            if (room.started && parsedRace?.modeState && modeConfigValue) {
                const mode = projectMode(room,Date.now()), names = s.memberNames || [name];
                const learners = names.map((memberName, index) => ({id: `device-${s.id}-${index + 1}`, name: memberName}));
                try {
                    const reduced = reduceMode(mode, {type:'join', requestId:`${s.id}:join`, round:room.round, learners}, {gameNow:communityActive(room) ? mode.gameNow : gameNow(room), pause:communityActive(room)});
                    nextRace = {...parsedRace, modeState:reduced.state};
                    s.modeUnit = reduced.state.units.at(-1)?.id;
                } catch (e) { return fail(e.message, 409, e.message); }
            }
            let joined;
            if (modeConfigValue) {
                const commit = crypto.randomUUID();
                nextRace = {...(nextRace || parsedRace || {}), modeCommit: commit};
                const roomWrite = stmt("UPDATE rooms SET race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL AND (SELECT COUNT(*) FROM teams WHERE room_id=? AND removed_at IS NULL)<40 AND NOT EXISTS(SELECT 1 FROM teams WHERE room_id=? AND name_key=? AND removed_at IS NULL)", JSON.stringify(nextRace), room.id, room.revision, room.round, room.id, room.id, key);
                const teamWrite = stmt("INSERT INTO teams(id,room_id,name_key,token_hash,data,revision) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.modeCommit')=?)",s.id,room.id,key,await hash(token),JSON.stringify(s),room.id,room.round,commit);
                joined = await db().batch([roomWrite, teamWrite]);
                if (joined[0].meta.changes !== 1 || joined[1].meta.changes !== 1)
                    return fail('Phòng vừa thay đổi. Kiểm tra mã phòng và vào lại.',409,'REVISION_MISMATCH');
                room.race=JSON.stringify(nextRace);room.revision++;
            } else {
                const inserted = await stmt('INSERT INTO teams (id,room_id,name_key,token_hash,data,revision) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND revision=? AND deleted_at IS NULL) AND (SELECT COUNT(*) FROM teams WHERE room_id=? AND removed_at IS NULL)<40',s.id,room.id,key,await hash(token),JSON.stringify(s),room.id,room.revision,room.id).run();
                if (!inserted.meta.changes) return fail('Phòng vừa thay đổi. Kiểm tra mã phòng và vào lại.',409);
            }
            return reply({ session: { id: s.id, token, room: room.code }, state: await publicState(s, room, 0), map: await raceRoom(room) });
        }
        if (['reset-room', 'delete-room', 'remove-team'].includes(b.action)) {
            let room = await adminAuth(req, b.id, b.action);
            if (!room)
                return fail('Chỉ giáo viên quản lý phòng mới được thực hiện thao tác này.', 403);
            if (!Number.isInteger(b.revision) || typeof b.requestId !== 'string' || b.requestId.length > 70)
                return fail('Thiếu phiên bản phòng hoặc mã thao tác.');
            if (['reset-room', 'delete-room'].includes(b.action) && b.confirmCode !== room.code)
                return fail('Mã xác nhận chưa khớp với phòng.');
            if (b.action === 'remove-team' && (typeof b.teamId !== 'string' || b.teamId.length > 60))
                return fail('Thiếu đội cần xóa.');
            const controlKey=JSON.stringify({requestId:b.requestId,fingerprint:fingerprint({action:b.action,teamId:b.teamId??null,revision:b.revision,confirmCode:b.confirmCode??null})});
            if (room.control_key === controlKey)
                return reply({ ok: true, action: b.action, replay: true });
            let priorControl;try{priorControl=JSON.parse(room.control_key||'null');}catch{priorControl=null;}
            if(priorControl?.requestId===b.requestId||room.control_key===b.requestId)
                return fail('Mã thao tác đã được dùng cho dữ liệu khác.',409,'REQUEST_ID_CONFLICT');
            if (b.action==='remove-team' && JSON.parse(room.race||'null')?.modeState) {
                const target=await stmt('SELECT id,data,revision FROM teams WHERE id=? AND room_id=? AND removed_at IS NULL',b.teamId,room.id).first();
                if(!target)return fail('Không tìm thấy đội.',404,'TEAM_NOT_FOUND');
                const data=JSON.parse(target.data),race=JSON.parse(room.race),commit=crypto.randomUUID();
                let mode=projectMode(room,Date.now());
                const unit=mode.units.find(unit=>unit.id===data.modeUnit);
                if(unit)for(const member of unit.members.filter(member=>member.present))
                    mode=reduceMode(mode,{type:'leave',learnerId:member.id,round:mode.round,requestId:`remove:${commit}:${member.id}`},{gameNow:mode.gameNow,pause:mode.paused}).state;
                race.modeState=mode;race.modeCommit=commit;
                const results=await db().batch([
                    stmt('UPDATE rooms SET race=?,revision=revision+1,control_key=? WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM teams WHERE id=? AND room_id=? AND revision=? AND removed_at IS NULL)',JSON.stringify(race),controlKey,room.id,b.revision,room.round,target.id,room.id,target.revision),
                    stmt("UPDATE teams SET removed_at=?,revision=revision+1 WHERE id=? AND room_id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.modeCommit')=?)",Date.now(),target.id,room.id,target.revision,room.id,room.round,commit)
                ]);
                if(results[0].meta.changes!==1||results[1].meta.changes!==1)return fail('Phòng vừa thay đổi.',409,'REVISION_MISMATCH');
                return reply({ok:true,action:b.action});
            }
            const queries=managementStatements(stmt,b.action,{roomId:room.id,revision:b.revision,requestId:controlKey,teamId:b.teamId,now:Date.now()});
            if(b.action==='reset-room')queries.push(stmt("UPDATE teams SET data=json_remove(data,'$.modeUnit') WHERE room_id=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND control_key=? AND deleted_at IS NULL)",room.id,room.id,controlKey));
            let results = await db().batch(queries);
            if (!results[0].meta.changes)
                return fail('Phòng vừa thay đổi. Kiểm tra lại danh sách trước khi xác nhận.', 409);
            return reply({ ok: true, action: b.action });
        }
        if (b.action === 'begin') {
            let room = await adminAuth(req, b.id, 'begin');
            if (!room)
                return fail('Không có quyền bắt đầu phòng.', 403);
            let at = Date.now();
            const config=roomCampaign(room);
            if(config?.rule&&config.rule!=='campaign'&&!room.started){
                const rows=(await stmt('SELECT id,data,revision FROM teams WHERE room_id=? AND removed_at IS NULL ORDER BY rowid',room.id).all()).results;
                const rosterNames = Array.isArray(config.roster) ? config.roster : [];
                const rosterIds = new Map(rosterNames.map((name, i) => [String(name).trim(), `learner-${i + 1}`]));
                const participation = config.participation || 'individual';
                if(participation!=='individual' && rows.some(row=>!Array.isArray(JSON.parse(row.data).memberNames))) return fail('Cần danh sách thành viên từng thiết bị.',409,'ROSTER_DEVICE_MEMBERS_REQUIRED');
                const devices = rows.map(row => {
                    const data = JSON.parse(row.data);
                    const names = Array.isArray(data.memberNames) ? data.memberNames : [data.name];
                    return {members: names.map((name, i) => ({id: rosterIds.get(name) || `device-${row.id}-${i + 1}`, name}))};
                });
                const flatNames = devices.flatMap(device => device.members.map(member => member.name));
                if (rosterNames.length && (new Set(flatNames).size !== flatNames.length || flatNames.length !== rosterNames.length || flatNames.some(name => !rosterIds.has(name))))
                    return fail('Thiết bị chưa khớp danh sách học sinh đã cấu hình.',409,'ROSTER_DEVICE_MISMATCH');
                const learners=(rosterNames.length ? rosterNames : rows.map(row=>JSON.parse(row.data).name)).map((name,i)=>({id:`learner-${i+1}`,name}));
                let mode;
                try{const curriculum=Object.fromEntries(['grade','topics','minLevel','maxLevel','categories','formats'].filter(key=>Object.hasOwn(config,key)).map(key=>[key,config[key]]));mode=createGame({rule:config.rule,learners,devices,participation:config.participation,seed:config.factionSeed,curriculum,factions:config.factions,gameNow:at});}catch(e){return fail(e.message);}
                if(rows.length!==mode.units.length)return fail('Join one shared device per assigned unit before starting.',409,'ROSTER_DEVICE_MISMATCH');
                mode.round=room.round;
                const commit=crypto.randomUUID(),race={...JSON.parse(room.race||'null'),modeState:mode,modeCommit:commit};
                const teamGuards=rows.map(()=>"EXISTS(SELECT 1 FROM teams WHERE id=? AND room_id=? AND revision=? AND removed_at IS NULL)").join(' AND ');
                const queries=[stmt(`UPDATE rooms SET started=?,race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND started IS NULL AND deleted_at IS NULL AND (SELECT COUNT(*) FROM teams WHERE room_id=? AND removed_at IS NULL)=? AND ${teamGuards}`,at,JSON.stringify(race),room.id,b.revision??room.revision,room.round,room.id,rows.length,...rows.flatMap(row=>[row.id,room.id,row.revision]))];
                rows.forEach((row,i)=>queries.push(stmt("UPDATE teams SET data=json_set(data,'$.modeUnit',?),revision=revision+1 WHERE id=? AND room_id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND json_extract(race,'$.modeCommit')=?)",mode.units[i].id,row.id,room.id,row.revision,room.id,room.round,commit)));
                const results=await db().batch(queries);
                if(!results[0].meta.changes)return fail('Room changed.',409,'REVISION_MISMATCH');
                return reply({room:{id:room.id,code:room.code,title:room.title,started:at}});
            }
            let changed = await stmt('UPDATE rooms SET started = ?,revision=revision+1 WHERE id = ? AND started IS NULL AND deleted_at IS NULL AND revision=?', at, b.id, b.revision ?? room.revision).run();
            if (!changed.meta.changes && !room.started)
                return fail('Phòng vừa thay đổi. Kiểm tra lại trước khi bắt đầu.', 409);
            let current = await stmt('SELECT * FROM rooms WHERE id = ?', b.id).first();
            return reply({ room: { id: room.id, code: room.code, title: room.title, started: current.started } });
        }
        if(['mode-state','mode-issue','mode-progress','mode-tick'].includes(b.action)){
            const t=await loadTeam(req,b.id);
            if(!t)return fail('Invalid team token.',403);
            const {room,s}=t,race=JSON.parse(room.race||'null'),mode=projectMode(room,Date.now());
            if(b.round!==room.round)return fail('Room reset.',409,'SESSION_RESET');
            if(!mode||mode.rule==='campaign')return fail('Mode not started.',409,'MODE_NOT_STARTED');
            if(b.action==='mode-state')return reply({mode:modeView(room,s)});
            race.modeRequests??={requestCache:{},round:room.round};
            const guard=guardRequest(race.modeRequests,b,room,room.revision);
            if(guard.error)return fail(guard.error,guard.status,guard.code);
            if(guard.replay)return reply({result:guard.replay,mode:modeView(room,s)});
            if(!Number.isInteger(b.revision)||!Number.isFinite(b.deadline))return fail('Revision and deadline required.',400);
            if(!s.modeUnit)return fail('Late arrivals are spectators.',409,'UNIT_INACTIVE');
            if(Object.hasOwn(b,'correct')||Object.hasOwn(b,'expected'))return fail('UNTRUSTED_SOLUTION',400);
            let reduced;
            try{const event=JSON.parse(JSON.stringify({type:b.action.slice(5),requestId:`${s.id}:${b.requestId}`,round:room.round,unitId:s.modeUnit,action:b.modeAction,challengeId:b.challengeId,answer:b.answer}));reduced=reduceMode(mode,event,{gameNow:communityActive(room)?mode.gameNow:gameNow(room),pause:communityActive(room)});}catch(e){return fail(e.message,409,e.message);}
            race.modeState=reduced.state;
            rememberRequest(race.modeRequests,b,guard,reduced.result);
            const actingUnit=mode.units.find(unit=>unit.id===s.modeUnit);
            Object.assign(race.modeRequests.eventHistory.at(-1),{teamId:s.id,unitId:s.modeUnit,learnerId:actingUnit?.members?.[actingUnit.controller]?.id??null,action:b.modeAction?.type??b.action.slice(5),challengeId:b.challengeId??null,input:typeof b.answer==='string'?b.answer.slice(0,80):null,gameNow:reduced.state.gameNow});
            if(race.modeRequests.eventHistory.length>1000)race.modeRequests.eventHistory.splice(0,race.modeRequests.eventHistory.length-1000);
            const saved=await stmt('UPDATE rooms SET race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)',JSON.stringify(race),room.id,room.revision,room.round,s.id).run();
            if(!saved.meta.changes)return fail('Mode changed.',409,'REVISION_MISMATCH');
            room.race=JSON.stringify(race);room.revision++;
            return reply({result:reduced.result,mode:modeView(room,s)});
        }
        // Host opens Lôi Đài Ngũ Ấn from the board; the ancient map also opens it automatically on the arena cell.
        if (b.action === 'arena-open') {
            let room = await adminAuth(req, b.id, 'game-action');
            if (!room)
                return fail('Chỉ giáo viên quản lý phòng mới mở được Lôi Đài.', 403);
            if (typeof b.requestId !== 'string' || !b.requestId.trim() || b.requestId.length > 70)
                return fail('Thiếu mã thao tác.');
            const campaign = roomCampaign(room);
            if (campaign?.theme !== 'historical')
                return fail('Lôi Đài Ngũ Ấn chỉ mở trong thế giới Cổ trang · Ngũ Ấn Long Thành.', 409, 'ARENA_THEME_REQUIRED');
            if (!room.started)
                return fail('Hãy bắt đầu ván trước khi mở Lôi Đài.', 409, 'ROOM_NOT_STARTED');
            if (projectMode(room,Date.now())?.finished)
                return fail('Ván đã kết thúc. Chơi lại phòng trước khi mở Lôi Đài.',409,'GAME_FINISHED');
            for (let attempt = 0; attempt < 5; attempt++) {
                room = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
                assertRoom(room);
                let turn = JSON.parse(room.race || 'null') || { cursor: null, deadline: 0, sequence: 0, log: [] };
                // Replay of the same open request returns the same event instead of opening a second one.
                if (turn.arena && turn.arena.triggerId === b.requestId)
                    return reply({ ok: true, replay: true, arena: await arenaView(room, null, true) });
                const gate = canOpenEvent(turn, Date.now());
                if (!gate.ok)
                    return fail(gate.code === 'EVENT_ACTIVE' ? 'Một hoạt động cộng đồng đang diễn ra. Chờ hoạt động này kết thúc.' : 'Ván này đã dùng hết số hoạt động cộng đồng.', 409, gate.code);
                const now = gameNow(room), roster = await eventRoster(room, now);
                if (roster.length < 2)
                    return fail('Cần ít nhất 2 người chơi đang hoạt động để mở Lôi Đài.', 409, 'ARENA_ROSTER_TOO_SMALL');
                const event = createArenaEvent({ roster, wall: Date.now(), triggerId: b.requestId, round: room.round });
                if(turn.modeState)turn.modeState=projectMode(room,event.openedAt);
                turn.arena = event;
                if(turn.modeState)turn.modeState=projectMode({...room,race:JSON.stringify(turn)},event.openedAt);
                turn.pauses = registerPause(turn, event);
                turn.eventQueue = (turn.eventQueue || []).filter(x => x.kind !== 'arena');
                turn.cursor = null;
                turn.deadline = 0;
                turn.commit = b.requestId;
                const rows = arenaEntries(event, returnMarkers(roster));
                const statements = [stmt('UPDATE rooms SET race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL', JSON.stringify(turn), room.id, room.revision, room.round)];
                rows.forEach(entry => statements.push(stmt("INSERT INTO community_players(id,room_id,event_id,team_id,data,revision) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.commit')=? AND json_extract(race,'$.arena.id')=?)", event.id + '.' + entry.id, room.id, event.id, entry.id, JSON.stringify(entry), room.id, room.round, b.requestId, event.id)));
                const results = await db().batch(statements);
                if (!results[0].meta.changes)
                    continue;
                room = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
                return reply({ ok: true, arena: await arenaView(room, null, true) });
            }
            return fail('Phòng vừa thay đổi. Hãy tải lại bảng lớp rồi mở Lôi Đài.', 409);
        }
        if (b.action === 'arena-state') {
            if (b.teacher === true) {
                const room = await adminAuth(req, b.id, 'read-room');
                if (!room)
                    return fail('Không có quyền xem Lôi Đài.', 403);
                return reply({ arena: await arenaView(room, null, true) });
            }
            const t = await loadTeam(req, b.id);
            if (!t)
                return fail('Phiên không hợp lệ.', 403);
            return reply({ arena: await arenaView(t.room, t.s.id), state: await publicState(t.s, t.room, t.row.revision) });
        }
        // One authenticated student action. `answer` grades server-side; combat spends earned resource.
        if (b.action === 'arena-action') {
            let t = await loadTeam(req, b.id);
            if (!t)
                return fail('Phiên không hợp lệ.', 403);
            if (b.round !== t.room.round)
                return fail('Phòng đã reset.', 409, 'SESSION_RESET');
            if (typeof b.requestId !== 'string' || !b.requestId.trim() || b.requestId.length > 70)
                return fail('Thiếu mã thao tác.');
            const kind = b.arenaAction;
            if (kind !== 'answer' && !COMBAT_ACTIONS.includes(kind))
                return fail('Hành động Lôi Đài không hợp lệ.', 400, 'INVALID_ARENA_ACTION');
            for (let attempt = 0; attempt < 4; attempt++) {
                t = await loadTeam(req, b.id);
                if (!t)
                    return fail('Phiên không hợp lệ.', 403);
                const event = arenaEventOf(t.room);
                if (!event)
                    return fail('Chưa có trận Lôi Đài nào đang mở.', 409, 'NO_ARENA');
                if (b.eventId !== event.id)
                    return fail('Trận Lôi Đài đã thay đổi. Đang đồng bộ.', 409, 'ARENA_EVENT_MISMATCH');
                const wall = Date.now();
                if (b.deadline !== undefined && (!Number.isFinite(b.deadline) || wall > b.deadline))
                    return fail('Lượt gửi đã hết hạn. Hãy thử lại.', 409, 'DEADLINE_EXPIRED');
                if (wall >= event.finishAt)
                    return fail('Trận đã hết 75 giây. Đang chốt kết quả.', 409, 'ARENA_CLOSED');
                const myRow = await stmt('SELECT * FROM community_players WHERE id=? AND event_id=?', event.id + '.' + t.s.id, event.id).first();
                // Late entrants are spectators: no actions, no reward for an event they did not enter.
                if (!myRow)
                    return fail('Bạn đang xem trận này với vai trò khán giả.', 409, 'ARENA_SPECTATOR');
                const actor = JSON.parse(myRow.data);
                const prior = actor.log.find(a => a.requestId === b.requestId);
                if (prior) {
                    const samePayload = prior.action === (kind === 'answer' ? 'answer' : kind) && (kind !== 'answer' || (prior.answer === String(b.answer ?? '').slice(0, 40) && prior.step === b.step)) && (kind === 'answer' || (prior.target ?? null) === (b.target ?? null));
                    if (!samePayload)
                        return fail('Mã thao tác đã được dùng cho dữ liệu khác.', 409, 'REQUEST_ID_CONFLICT');
                    return reply({ result: { ok: true, replay: true, correct: prior.ok ?? null, effect: prior.effect ?? prior.action, blocked: !!prior.blocked }, arena: await arenaView(t.room, t.s.id), state: await publicState(t.s, t.room, t.row.revision) });
                }
                 let statements, nextActor, outcome, pairedMutation = false;
                if (kind === 'answer') {
                    if (!Number.isInteger(b.step))
                        return fail('Thiếu số thứ tự câu hỏi.', 409, 'ARENA_STEP_REQUIRED');
                    const graded = arenaAnswer(event, roomCampaign(t.room), actor, { answer: b.answer, step: b.step, wall, requestId: b.requestId });
                    if (!graded.ok)
                        return fail(graded.reason === 'cooldown' ? 'Chờ 2 giây trước câu tiếp theo.' : graded.reason === 'stunned' ? 'Linh vật đang choáng. Chờ hết choáng rồi trả lời.' : graded.reason === 'countdown' ? 'Trận chưa bắt đầu.' : graded.reason === 'exhausted' ? 'Bạn đã trả lời hết số câu của trận.' : 'Câu hỏi hoặc thời gian trận đã thay đổi. Đang đồng bộ.', 409, 'ARENA_ANSWER_' + String(graded.reason || 'stale').toUpperCase().replace(/-/g, '_'));
                    nextActor = graded.entry;
                    outcome = { ok: true, action: 'answer', correct: graded.correct, resource: nextActor.resource };
                    statements = [stmt('UPDATE community_players SET data=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,\'$.arena.id\')=?) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)', JSON.stringify(nextActor), myRow.id, myRow.revision, t.room.id, t.room.round, event.id, t.s.id)];
                } else {
                    let targetRow = null, target = null;
                    if (kind !== 'guard') {
                        const targetId = typeof b.target === 'string' ? b.target : '';
                        if (!targetId || targetId.length > 60)
                            return fail('Chọn một linh vật mục tiêu.', 400, 'ARENA_TARGET_REQUIRED');
                        targetRow = await stmt('SELECT * FROM community_players WHERE id=? AND event_id=?', event.id + '.' + targetId, event.id).first();
                        if (!targetRow)
                            return fail('Mục tiêu không ở trong trận này.', 409, 'ARENA_TARGET_MISSING');
                        target = JSON.parse(targetRow.data);
                    }
                    const combat = arenaCombat(event, { actor, target, action: kind, wall, requestId: b.requestId });
                    if (!combat.ok)
                        return fail(combat.reason === 'resource' ? 'Chưa đủ linh khí. Giải thêm câu Toán để nạp.' : combat.reason === 'cooldown' ? 'Chiêu này đang hồi. Chờ một chút.' : combat.reason === 'stunned' ? 'Linh vật đang choáng.' : combat.reason === 'assist-limit' ? 'Đã hỗ trợ đủ số lần cho phép.' : combat.reason === 'shield-active' ? 'Khiên vẫn đang mở.' : combat.reason === 'invalid-target' ? 'Mục tiêu không hợp lệ cho chiêu này.' : combat.reason === 'countdown' ? 'Trận chưa bắt đầu.' : 'Trận đã đóng.', 409, 'ARENA_' + String(combat.reason || 'stale').toUpperCase().replace(/-/g, '_'));
                    nextActor = combat.actor;
                    outcome = { ok: true, action: kind, effect: combat.effect, resource: nextActor.resource };

                     let actorUpdateSql = "UPDATE community_players SET data=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.arena.id')=?) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)";
                     let actorArgs = [JSON.stringify(nextActor), myRow.id, myRow.revision, t.room.id, t.room.round, event.id, t.s.id];
                    if (combat.target && targetRow) {
                         pairedMutation = true;
                         // Actor and target must commit as one CAS. Updating them in two
                         // statements lets a stale actor lose its write while the target
                         // still takes damage when another request advanced the actor row.
                         // One guarded UPDATE either matches both original revisions or
                         // matches neither; the caller retries the whole combat on a miss.
                         statements = [stmt(`UPDATE community_players
                             SET data=CASE id WHEN ? THEN ? WHEN ? THEN ? END,
                                 revision=revision+1
                             WHERE id IN (?,?)
                               AND (SELECT COUNT(*) FROM community_players
                                    WHERE (id=? AND revision=?) OR (id=? AND revision=?))=2
                               AND ((id=? AND revision=?) OR (id=? AND revision=?))
                               AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)
                               AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)
                               AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.arena.id')=?)`,
                             myRow.id, JSON.stringify(nextActor), targetRow.id, JSON.stringify(combat.target),
                             myRow.id, targetRow.id,
                             myRow.id, myRow.revision, targetRow.id, targetRow.revision,
                             myRow.id, myRow.revision, targetRow.id, targetRow.revision,
                             t.s.id, target.id,
                             t.room.id, t.room.round, event.id)];
                    } else {
                        statements = [stmt(actorUpdateSql, ...actorArgs)];
                    }
                }
                const results = await db().batch(statements);
                 const expectedChanges = pairedMutation ? 2 : 1;
                 if (results[0].meta.changes === expectedChanges)
                    return reply({ result: outcome, arena: await arenaView(t.room, t.s.id), state: await publicState(t.s, t.room, t.row.revision) });
            }
            return fail('Lôi Đài vừa cập nhật. Hãy thử lại.', 409, 'ARENA_BUSY');
        }
        // Settles rewards once the 75s wall plus results window has passed, then restores the main game.
        if (b.action === 'arena-finish') {
            const t = await loadTeam(req, b.id);
            if (!t)
                return fail('Phiên không hợp lệ.', 403);
            const event = arenaEventOf(t.room);
            if (!event)
                return fail('Chưa có trận Lôi Đài nào.', 409, 'NO_ARENA');
            const wall = Date.now();
            if (wall < event.resumeAt)
                return fail('Trận chưa chốt xong. Đang chờ bảng kết quả.', 409, 'ARENA_PENDING');
            // settle() inside loadTeam already awarded exactly once; persist that mutation now.
            const saved = await stmt('UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL)', JSON.stringify(t.s), t.s.id, t.row.revision, t.room.id, t.room.round).run();
            const current = saved.meta.changes ? await loadTeam(req, b.id) : t;
            const entry = await stmt('SELECT data FROM community_players WHERE id=?', event.id + '.' + t.s.id).first();
            return reply({
                ok: true, phase: arenaPhase(event, wall),
                // The client restores exactly this stage/revision/round.
                return: entry ? JSON.parse(entry.data).return : null,
                arena: await arenaView(current.room, current.s.id),
                state: await publicState(current.s, current.room, current.row.revision), map: await raceRoom(current.room)
            });
        }
        if (b.action === 'community-answer') {
            let t = await loadTeam(req, b.id);
            if (!t)
                return fail('Phiên không hợp lệ.', 403);
            if (b.round !== t.room.round)
                return fail('Phòng đã reset.', 409, 'SESSION_RESET');
            let c = communityOf(t.room);
            if (!c)
                return fail('Chưa có hoạt động cộng đồng.', 409);
            if (typeof b.requestId !== 'string' || b.requestId.length > 70)
                return fail('Thiếu mã thao tác.');
            let entryRow = await stmt('SELECT * FROM community_players WHERE id=?', c.id + '.' + t.s.id).first();
            if (!entryRow)
                return fail('Bạn đang xem với vai trò khán giả của lượt này.', 409);
            let entry = JSON.parse(entryRow.data), prior = entry.log.find(a => a.requestId === b.requestId);
            if (prior)
                return reply({ result: { ok: true, correct: prior.ok }, state: await publicState(t.s, t.room, t.row.revision), map: await raceRoom(t.room) });
            let result = communityAnswer(c, t.s.campaign, entry, b.answer, b.step, Date.now());
            if (!result.ok)
                return fail(result.reason === 'cooldown' ? 'Chờ 2,5 giây trước câu tiếp theo.' : 'Câu hỏi hoặc thời gian đua đã thay đổi. Đang đồng bộ.', 409);
            entry.log.at(-1).requestId = b.requestId;
            let saved = await stmt('UPDATE community_players SET data=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND revision=?) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND removed_at IS NULL)', JSON.stringify(entry), entryRow.id, entryRow.revision, t.room.id, t.room.round, t.room.revision, t.s.id).run();
            if (!saved.meta.changes)
                return fail('Câu này vừa được gửi. Đang cập nhật câu tiếp theo.', 409);
            return reply({ result, state: await publicState(t.s, t.room, t.row.revision), map: await raceRoom(t.room) });
        }
        if (['roll', 'abandon', 'bonus', 'bonus-draft', 'mascot', 'reward', 'pact'].includes(b.action)) {
            if (typeof b.requestId !== 'string' || b.requestId.length > 70)
                return fail('Thiếu mã thao tác.');
            for (let attempt = 0; attempt < 5; attempt++) {
                let t = await loadTeam(req, b.id);
                if (!t)
                    return fail('Phiên không hợp lệ.', 403);
                let { s, room, row } = t;
                if ((b.round ?? 1) !== room.round)
                    return fail('Phòng đã reset.', 409, 'SESSION_RESET');
                if (!s.race)
                    return fail('Phòng này đang dùng luật cũ.');
                let guard = guardRequest(s, b, room, row.revision);
                if (guard.error) return fail(guard.error, guard.status, guard.code);
                if (guard.replay) return reply({ state: await publicState(s, room, row.revision), result: guard.replay, map: await raceRoom(room) });
                if (communityActive(room))
                    return fail(pausedMessage(room), 409, 'EVENT_ACTIVE');
                let now = gameNow(room), result = { ok: true }, trigger = null, triggerSlot = null, triggerRows = [];
                if (b.action === 'mascot') {
                    if (s.status !== 'waiting' || !Number.isInteger(b.mascot) || b.mascot < 0 || b.mascot > 7)
                        return fail('Chỉ đổi linh vật khi đang chờ.');
                    s.race.mascot = b.mascot;
                    s.mascot = b.mascot;
                }
                else {
                    if (s.status !== 'active')
                        return fail('Cuộc đua chưa bắt đầu hoặc đã kết thúc.');
                    if (b.action !== 'bonus-draft' && now < s.effects.freezeUntil)
                        return fail('Đội đang đóng băng. Chờ hoặc dùng Phá băng.',409,'TEAM_FROZEN');
                    if (b.action === 'reward') {
                        let r = s.race.reward;
                        if (!r)
                            return fail('Phần thưởng đã được nhận hoặc chưa có.');
                        let choice = b.choice;
                        if (!['points', 'time', 'card', 'steps', 'dice'].includes(choice))
                            return fail('Chọn phần thưởng hợp lệ.');
                        if (choice === 'points')
                            s.score += r.points;
                        if (choice === 'time')
                            s.race.timeBonus += Math.min(60000, r.points * 500);
                        if (choice === 'card')
                            s.race.cards++;
                        if (choice === 'steps')
                            s.race.carry += 2;
                        if (choice === 'dice')
                            s.race.extraDice = (s.race.extraDice || 0) + 1;
                        s.events.push({ type: 'reward', choice, points: r.points, serial: r.serial, at: now });
                        s.race.reward = null;
                        advanceMath(s);
                    }
                    if (b.action === 'pact') {
                        if (s.solved.length < 1 || (s.race.pacts || 0) >= 2)
                            return fail('Qua xuất phát mới được giao kèo; tối đa 2 lần mỗi ván.');
                        if (!['freeze', 'pass', 'delay'].includes(b.choice))
                            return fail('Giao kèo chưa hợp lệ.');
                        if (s.race.bonus && !s.race.bonus.done || s.race.reward)
                            return fail('Xử lý nhiệm vụ và phần thưởng đang mở trước.');
                        s.race.pacts = (s.race.pacts || 0) + 1;
                        if (b.choice === 'freeze') {
                            s.events.push({ type: 'ice', at: now, until: now + 20000, source: 'Giao kèo tự đóng băng' });
                            s.race.cards++;
                        }
                        if (b.choice === 'pass') {
                            s.race.promisedPasses = (s.race.promisedPasses || 0) + 1;
                            s.race.cards++;
                        }
                        if (b.choice === 'delay') {
                            s.penalty += 45000;
                            s.score += 40;
                        }
                        s.events.push({ type: 'pact', choice: b.choice, at: now });
                    }
                    if (b.action === 'roll') {
                        if (individual(s)) {
                            if (!ready(s, now) || b.sequence !== s.race.rolls || now - (s.race.lastRollAt || 0) < 6000)
                                return fail('Chờ đủ 6 giây và hoàn tất nhiệm vụ đang mở trước khi lăn.', 409);
                        }
                        else {
                            await raceRoom(room);
                            room = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
                            now = gameNow(room);
                            let turn = JSON.parse(room.race || 'null');
                            if (communityActive(room) || !ready(s, now) || turn?.cursor !== s.id || turn.sequence !== b.sequence || now >= turn.deadline)
                                return fail('Chưa đến lượt hoặc lượt đã hết. Bản đồ đang cập nhật.', 409);
                        }
                        result = roll(s, now);
                        let turn = JSON.parse(room.race || 'null') || { cursor: null, deadline: 0, sequence: 0, log: [] };
                        if (!individual(s)) {
                            turn.last = s.id;
                            turn.cursor = null;
                            turn.deadline = 0;
                            turn.log.push({ type: 'roll', team: s.id, die: result.die, from: result.from, to: result.to, at: now });
                        }
                        const kind = s.campaign?.community, cell = kind === 'arena' ? ARENA_CELL : COMMUNITY_CELL;
                        const crossed = kind && ['boat', 'arena'].includes(kind) && result.from < cell && result.to >= cell && now - s.start < G.DURATION - 90000;
                        if (crossed && !turn[kind === 'arena' ? 'arena' : 'community']) {
                            const gate = canOpenEvent(turn, Date.now());
                            if (!gate.ok)
                                // Queue instead of overlapping; the next eligible roll reopens it.
                                turn.eventQueue = enqueueEvent(turn, { kind, triggerId: s.id, at: Date.now() });
                            else {
                                let roster = await eventRoster(room, now);
                                trigger = kind === 'arena'
                                    ? createArenaEvent({ roster, wall: Date.now(), triggerId: s.id, round: room.round })
                                    : createCommunity(room, roster, Date.now(), s.id);
                                triggerSlot = kind === 'arena' ? 'arena' : 'community';
                                triggerRows = kind === 'arena'
                                    ? arenaEntries(trigger, returnMarkers(roster))
                                    : trigger.roster.map((p, slot) => ({ id: p.id, slot, step: 0, correct: 0, wrong: 0, lastAt: 0, log: [] }));
                                turn[triggerSlot] = trigger;
                                turn.pauses = registerPause(turn, trigger);
                                turn.eventQueue = (turn.eventQueue || []).filter(x => x.kind !== kind);
                                turn.cursor = null;
                                turn.deadline = 0;
                            }
                        }
                        room.race = JSON.stringify(turn);
                    }
                    if (b.action === 'abandon') {
                        if (b.stage !== undefined && b.stage !== taskIndex(s))
                            return fail('Trạm đã thay đổi. Hãy kiểm tra lại.', 409);
                        if (s.race.reward || s.race.bonus && !s.race.bonus.done)
                            return fail('Xử lý câu thưởng và phần thưởng trước khi từ bỏ trạm.');
                        let i = taskIndex(s);
                        if (s.race.phase !== 'challenge' || i < 1 || i > 3)
                            return fail('Vạch đầu và vạch đích bắt buộc giải đúng.');
                        if (now - s.race.entered < 90000)
                            return fail('Cần tham gia thử thách ít nhất 90 giây trước khi từ bỏ.');
                        let loss = Math.min(80, s.effects.wallet);
                        s.score -= loss;
                        s.penalty += 45000;
                        s.events.push({ type: 'abandon', lock: i + 1, cost: 45000, pointsLost: loss, at: now });
                        finishStation(s, null, now, true);
                    }
                    if (b.action === 'bonus-draft') {
                        if (!s.race.bonus || s.race.bonus.done)
                            return fail('Câu thưởng đã kết thúc.');
                        s.drafts.bonus = { answer: String(b.answer || '').slice(0, 40) };
                    }
                    if (b.action === 'bonus') {
                        s.drafts.bonus = { answer: String(b.answer || '').slice(0, 40) };
                        let q = s.race.bonus;
                        if (!q || q.done)
                            return fail('Không có câu hỏi thưởng đang chờ.');
                        if (b.skip) {
                            q.done = true;
                            s.events.push({ type: 'bonus-skip', at: now });
                        }
                        else {
                            if (now < s.cooldown)
                                return fail('Chờ hết thời gian kiểm tra rồi gửi lại.');
                            q.attempts++;
                            let verdict = checkContext(q, b.answer);
                            result.ok = verdict === null ? numericAnswer(b.answer, q.answer) : verdict;
                            if (result.ok) {
                                q.done = true;
                                if (s.campaign?.version >= 3) {
                                    s.race.reward = { points: q.points || 40, serial: q.serial };
                                }
                                else
                                    s.score += q.points || 40;
                            }
                            else {
                                s.cooldown = now + 10000;
                                if (q.attempts >= (q.maxAttempts || 2))
                                    q.done = true;
                            }
                            s.events.push({ type: 'bonus-answer', ok: result.ok, points: result.ok ? q.points || 40 : 0, question: q.question, answer: s.drafts.bonus.answer, topic: q.topic, at: now });
                        }
                    }
                    if (b.action === 'bonus')
                        advanceMath(s);
                }
                rememberRequest(s, b, guard, result);
                let commit = b.requestId, results;
                if (individual(s) && !trigger) {
                    let saved = await stmt('UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL)', JSON.stringify(s), s.id, row.revision, room.id, room.revision, room.round).run();
                    results = [saved, saved];
                }
                else {
                    let turn = JSON.parse(room.race || 'null') || {};
                    turn.commit = commit;
                    let statements = [stmt('UPDATE rooms SET race=?,revision=revision+1 WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM teams WHERE id=? AND revision=? AND removed_at IS NULL)', JSON.stringify(turn), room.id, room.revision, room.round, s.id, row.revision), stmt("UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.commit')=?)", JSON.stringify(s), s.id, row.revision, room.id, room.round, commit)];
                    if (trigger)
                        // One row per roster member, atomic with the room mutation that opened the event.
                        triggerRows.forEach(entry => statements.push(stmt(`INSERT INTO community_players(id,room_id,event_id,team_id,data,revision) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND json_extract(race,'$.commit')=? AND json_extract(race,'$.${triggerSlot}.id')=?)`, trigger.id + '.' + entry.id, room.id, trigger.id, entry.id, JSON.stringify(entry), room.id, room.round, commit, trigger.id)));
                    results = await db().batch(statements);
                }
                if (results[0].meta.changes && results[1].meta.changes) {
                    s.effects = effects(s, s.effects.history, now);
                    room = await stmt('SELECT * FROM rooms WHERE id=?', room.id).first();
                    return reply({ state: await publicState(s, room, row.revision + 1), result, map: await raceRoom(room) });
                }
            }
            return fail('Có lượt khác vừa cập nhật. Hãy thử lại.', 409);
        }
        if (b.action === 'skill') {
            let t = await loadTeam(req, b.id);
            if (!t || t.s.status !== 'active' || !t.s.levels || t.s.solved.length < 1)
                return fail('Mở ít nhất một khóa để dùng kỹ năng.');
            if ((b.round ?? 1) !== t.room.round)
                return fail('Phòng đã reset.', 409, 'SESSION_RESET');
            if (communityActive(t.room))
                return fail('Kỹ năng tạm dừng trong hoạt động cộng đồng.', 409);
            let spec = SKILLS[b.skill];
            if (!spec || typeof b.requestId !== 'string' || b.requestId.length > 70)
                return fail('Kỹ năng không hợp lệ.');
            let prior = await stmt('SELECT id FROM skill_actions WHERE id = ?', b.requestId).first();
            if (prior)
                return reply({ state: await publicState(t.s, t.room, t.row.revision) });
            if (['time', 'boost', 'double'].includes(b.skill) && (!t.s.campaign || t.s.effects.history.filter(a => a.actor_id === t.s.id && a.kind === b.skill).length >= 2))
                return fail('Kỹ năng này tối đa 2 lần mỗi ván mới.');
            let target = ['thaw', 'shield', 'time', 'boost', 'double'].includes(b.skill) ? t.s.id : b.target;
            let row = await stmt('SELECT data,revision FROM teams WHERE id = ? AND room_id = ? AND removed_at IS NULL', target, t.room.id).first();
            if (!row)
                return fail('Nhóm nhận kỹ năng không ở phòng này.');
            let other = JSON.parse(row.data);
            if (other.status === 'waiting' && t.room.started) {
                other.status = 'active';
                other.start = t.room.started;
            }
            G.expire(other, gameNow(t.room));
            if (other.status !== 'active' || (['help', 'freeze'].includes(b.skill) && target === t.s.id))
                return fail('Chọn một nhóm khác đang chơi.');
            let now = gameNow(t.room), all = (await stmt('SELECT * FROM skill_actions WHERE room_id = ?', t.room.id).all()).results, fx = effects(other, all, now);
            if (b.skill === 'thaw' && t.s.effects.freezeUntil <= now)
                return fail('Nhóm hiện không bị đóng băng.');
            if (b.skill === 'shield' && t.s.effects.shieldUntil > now)
                return fail('Lá chắn vẫn đang hoạt động.');
            if (b.skill === 'freeze' && (other.solved.length < 1 || fx.shieldUntil > now || t.s.effects.attackCount >= 2 || now - t.s.effects.lastAttack < 60000))
                return fail('Chưa thể gây nhiễu: nhóm có bảo vệ, chưa mở khóa đầu hoặc đã chạm giới hạn.');
            let free = b.free === true;
            let used = all.filter(a => a.actor_id === t.s.id && a.cost === 0).length;
            if (free && (!t.s.race || used >= t.s.race.cards || !['shield', 'help', 'freeze'].includes(b.skill)))
                return fail('Không có thẻ miễn phí phù hợp.');
            let cost = free ? 0 : spec.cost;
            let insertion = stmt(`INSERT INTO skill_actions(id,room_id,actor_id,target_id,kind,cost,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COALESCE(json_extract(data,'$.score'),0) FROM teams WHERE id=?) - COALESCE((SELECT SUM(cost) FROM skill_actions WHERE actor_id=?),0) >= ? AND (? != 'freeze' OR ((SELECT COUNT(*) FROM skill_actions WHERE actor_id=? AND kind='freeze') < 2 AND (SELECT COUNT(*) FROM skill_actions WHERE target_id=? AND kind='freeze') < 2 AND NOT EXISTS(SELECT 1 FROM skill_actions WHERE actor_id=? AND kind='freeze' AND created > ?) AND NOT EXISTS(SELECT 1 FROM skill_actions WHERE target_id=? AND ((kind IN ('shield','freeze') AND created > ?) OR (kind='help' AND created > ?))))) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND json_extract(data,'$.status')='active' AND removed_at IS NULL) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND json_extract(data,'$.status')='active' AND removed_at IS NULL) AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=? AND deleted_at IS NULL AND revision=?) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND revision=?) AND EXISTS(SELECT 1 FROM teams WHERE id=? AND revision=?) AND ? < (SELECT started+1800000 FROM rooms WHERE id=?) AND (?=0 OR (SELECT COUNT(*) FROM skill_actions WHERE actor_id=? AND cost=0)<(SELECT COALESCE(json_extract(data,'$.race.cards'),0) FROM teams WHERE id=?))`, b.requestId, t.room.id, t.s.id, target, b.skill, cost, now, t.s.id, t.s.id, cost, b.skill, t.s.id, target, t.s.id, now - 60000, target, now - 60000, now - 20000, t.s.id, target, t.room.id, t.s.round || 1, t.room.revision, t.s.id, t.row.revision, target, row.revision, now, t.room.id, free ? 1 : 0, t.s.id, t.s.id);
            let results = await db().batch([insertion, stmt('UPDATE teams SET revision=revision+1 WHERE (id=? OR id=?) AND EXISTS(SELECT 1 FROM skill_actions WHERE id=? AND actor_id=?)', t.s.id, target, b.requestId, t.s.id)]), inserted = results[0];
            if (!inserted.meta.changes)
                return fail('Không đủ điểm hoặc nhóm vừa được bảo vệ. Điểm chưa bị trừ.');
            let current = await loadTeam(req, b.id);
            return reply({ state: await publicState(current.s, current.room, current.row.revision), skill: { name: spec.name, cost } });
        }
        if(['acknowledge-help','resolve-question'].includes(b.action)) {
            const room=await adminAuth(req,b.id,'game-action');if(!room)return fail('Chỉ giáo viên quản lý phòng mới được xử lý hỗ trợ.',403);
            const row=await stmt('SELECT * FROM teams WHERE id=? AND room_id=? AND removed_at IS NULL',b.teamId,room.id).first();
            if(!row)return fail('Không tìm thấy đội trong phòng.',404);
            const s=JSON.parse(row.data),guard=guardRequest(s,b,room,row.revision);
            if(guard.error)return fail(guard.error,guard.status,guard.code);
            if(guard.replay)return reply({result:guard.replay});
            const i=taskIndex(s),invalid=recoveryContext(s,b,i,true);if(invalid)return invalid;
            if(s.status!=='active'||i>=5||communityActive(room))return fail('Chưa thể xử lý trạm lúc này.',409,'INACTIVE_STATION');
            const r=s.recovery;
            if(b.action==='acknowledge-help') {
                if(!r.helpPending)return fail('Yêu cầu hỗ trợ đã được xử lý.',409,'HELP_RESOLVED');
                r.helpPending=false;r.acknowledgedAt=Date.now();r.state=r.reportPending?'broken-question':'active';
            }else{
                if(!r.reportPending||s.levels?.[i]==null)return fail('Không có báo lỗi đề đang chờ.',409,'REPORT_RESOLVED');
                s.recoveryHistory??=[];s.recoveryHistory.push({...r,resolvedAt:Date.now()});
                s.questionSeeds??={};s.questionSeeds[i]=((s.questionSeeds[i]??s.seed)+1)>>>0;
                s.recovery={...downgradeQuestion(r,{reason:'teacher-replacement'}),helpPending:false,reportPending:false,replacedAt:Date.now()};
                s.drafts[i]={};s.hints[i]=[];
            }
            const result={ok:true,questionRevision:s.recovery.questionRevision};rememberRequest(s,b,guard,result);
            const changed=await stmt('UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=teams.room_id AND round=? AND revision=? AND deleted_at IS NULL)',JSON.stringify(s),s.id,row.revision,room.round,room.revision).run();
            if(!changed.meta.changes)return fail('Tiến độ vừa thay đổi. Hãy tải lại bảng lớp.',409,'REVISION_MISMATCH');
            return reply({result});
        }
        if (['teacher-help', 'report-question', 'save-draft', 'request-hint', 'downgrade-question', 'abandon-station'].includes(b.action)) {
            let t = await loadTeam(req, b.id);
            if (!t)
                return fail('Phiên không hợp lệ.', 403);
            let { s, row, room } = t, guard = guardRequest(s, b, room, row.revision);
            if (guard.error)
                return fail(guard.error, guard.status, guard.code);
            if (guard.replay)
                return reply({ result: guard.replay, state: await publicState(s, room, row.revision) });
            let i = taskIndex(s), now = gameNow(room);
            if (communityActive(room) || s.status !== 'active' || i >= 5 || (s.race && (s.race.phase !== 'challenge' || s.race.reward || s.race.bonus && !s.race.bonus.done)))
                return fail('Trạm chưa mở hoặc ván chính đang tạm dừng.', 409, 'INACTIVE_STATION');
            const invalid=recoveryContext(s,b,i,true);if(invalid)return invalid;
            let recovery = recoveryFor(s, i), revision = b.questionRevision;
            let result = { ok: true, action: b.action };
            try {
                if (b.action === 'save-draft') {
                    recovery = setDraft(recovery, Object.fromEntries(Object.entries(b.input || {}).slice(0, 8).map(([k, v]) => [String(k).slice(0, 30), String(v).slice(0, 40)])), revision);
                    s.drafts[i] = recovery.draft.answer;
                }
                else if (b.action === 'request-hint') {
                    const tier = b.tier || 'nudge', level = ['none', 'nudge', 'method', 'guided'].indexOf(tier);
                    if (level < 1 || s.levels?.[i] == null || level > s.hints[i].length + 1) return fail('Hãy mở lần lượt từng mức gợi ý.', 409, 'INVALID_HINT_TIER');
                    result = supportHint(s,i,level,now);
                }
                else if (b.action === 'downgrade-question') {
                    if (!s.levels || s.levels[i] == null || s.levels[i] <= 0) return fail('Đề đã ở mức thấp nhất.', 409, 'DOWNGRADE_UNAVAILABLE');
                    if (now < s.effects.freezeUntil || now < s.cooldown) return fail('Chờ hết thời gian kiểm tra rồi đổi đề.', 409, 'COOLDOWN');
                    s.recoveryHistory??=[];s.recoveryHistory.push({...recovery});
                    recovery = downgradeQuestion(recovery, { reason: String(b.reason || 'too-hard').slice(0, 80) });
                    s.levels[i]--;
                    s.drafts[i] = {};
                    s.hints[i] = [];
                }
                else if (b.action === 'teacher-help')
                    recovery = {...requestTeacherHelp(recovery),helpPending:true};
                else if (b.action === 'report-question')
                    recovery = {...reportBrokenQuestion(recovery),reportPending:true};
                else {
                    recovery = abandonRecovery(recovery);
                    if (!s.race || now - s.race.entered < 90000 || now < s.effects.freezeUntil) return fail('Chưa đủ điều kiện từ bỏ trạm.', 409, 'ABANDON_UNAVAILABLE');
                    const loss = Math.min(80, s.effects.wallet);
                    s.score -= loss; s.penalty += 45000;
                    s.events.push({ type: 'abandon', lock: i + 1, cost: 45000, pointsLost: loss, at: now });
                    finishStation(s, null, now, true);
                }
            }
            catch (e) {
                return fail(e.message==='GUIDED_GATE_REQUIRED'?'Cổng đầu và cổng cuối phải tự hoàn thành bước cuối. Hãy dùng gợi ý hoặc gọi giáo viên.':'Không thể thực hiện hỗ trợ lúc này.', 409, e.message);
            }
            s.recovery = recovery;
            s.events ??= [];
            s.events.push({ type: b.action, requestId: b.requestId, round: room.round, revision: recovery.questionRevision, at: Date.now() });
            result.questionRevision = recovery.questionRevision;
            s.effects = effects(s, s.effects?.history || [], now);
            rememberRequest(s, b, guard, result);
            let saved = await stmt('UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=teams.room_id AND round=? AND revision=? AND deleted_at IS NULL)', JSON.stringify(s), s.id, row.revision, room.round, room.revision).run();
            if (saved.meta.changes) {
                return reply({ result, state: await publicState(s, room, row.revision + 1) });
            }
            return fail('Câu này vừa được cập nhật. Đang đồng bộ.', 409);
        }
        if (['hint', 'submit', 'unlock', 'draft', 'choose-level'].includes(b.action)) {
            if (typeof b.requestId !== 'string' || b.requestId.length > 70)
                return fail('Thiếu mã lượt gửi.');
            for (let attempt = 0; attempt < 4; attempt++) {
                let t = await loadTeam(req, b.id);
                if (!t)
                    return fail('Phiên không hợp lệ.', 403);
                let { s, row, room } = t;
                if ((b.round ?? 1) !== room.round)
                    return fail('Giáo viên đã reset phòng. Đang cập nhật lượt chơi mới.', 409, 'SESSION_RESET');
                let guard = guardRequest(s, b, room, row.revision);
                if (guard.error)
                    return fail(guard.error, guard.status, guard.code);
                if (guard.replay)
                    return reply({ result: guard.replay, state: await publicState(s, room, row.revision) });
                if (communityActive(room))
                    return fail(pausedMessage(room), 409, 'EVENT_ACTIVE');
                let now = gameNow(room), i = taskIndex(s);
                let recovery = i < 5 ? recoveryFor(s, i) : null;
                if(recovery&&['draft','submit','hint'].includes(b.action)){const invalid=recoveryContext(s,b,i,false);if(invalid)return invalid;}
                if (recovery && b.questionRevision !== undefined && b.questionRevision !== recovery.questionRevision)
                    return fail('Đề đã thay đổi. Hãy đồng bộ lại.', 409, 'DRAFT_REVISION_MISMATCH');
                if (recovery && recovery.questionRevision > 0 && ['draft', 'submit'].includes(b.action) && b.questionRevision === undefined)
                    return fail('Cần gửi phiên bản đề hiện tại.', 409, 'DRAFT_REVISION_MISMATCH');
                if (s.race && b.stage !== undefined && b.stage !== i)
                    return fail('Nhiệm vụ đã thay đổi. Đang đồng bộ lại trạm.', 409);
                if (s.race?.reward)
                    return fail('Chọn phần thưởng đang chờ trước khi mở nhiệm vụ.');
                if (s.race?.bonus && !s.race.bonus.done)
                    return fail('Xử lý hoặc bỏ câu thưởng trước khi mở hồ sơ trạm.');
                if (s.race && ((i < 5 && s.race.phase !== 'challenge') || (i === 5 && s.race.phase !== 'gate')))
                    return fail('Hãy đến trạm trên bản đồ trước khi mở nhiệm vụ.');
                if (b.action === 'choose-level') {
                    if (s.status !== 'active' || !s.levels || i >= 5 || !Number.isInteger(b.level) || b.level < 0 || b.level > 4 || (s.campaign && b.level > s.campaign.stationMax))
                        return fail('Không thể chọn mức độ lúc này.');
                    if (s.levels[i] === null) {
                        s.levels[i] = b.level;
                        s.events.push({ type: 'level', lock: i + 1, level: b.level, at: now });
                    }
                }
                if (['draft', 'submit'].includes(b.action) && s.status === 'active' && taskIndex(s) < 5 && (b.action !== 'draft' || b.lock === taskIndex(s))) {
                    let clean = Object.fromEntries(Object.entries(b.input || {}).slice(0, 8).map(([k, v]) => [String(k).slice(0, 30), String(v).slice(0, 40)]));
                    s.drafts[taskIndex(s)] = clean;
                    s.recovery = setDraft(recovery, clean);
                }
                let result = ['draft', 'choose-level'].includes(b.action) ? { ok: true } : b.action === 'hint' ? (b.level <= s.hints[taskIndex(s)]?.length ? { ok: true, level: b.level, cost: 0 } : b.level === s.hints[taskIndex(s)]?.length + 1 ? (s.levels && s.levels[taskIndex(s)] === null ? { ok: false, reason: 'inactive' } : G.hint(s, taskIndex(s), now)) : { ok: false, reason: 'stale' }) : b.action === 'unlock' ? (now < (s.effects?.freezeUntil || 0) ? { ok: false, reason: 'frozen' } : (s.race ? unlockRace(s, b.code, now) : G.unlock(s, b.code, now))) : submitLevel(s, b.input || {}, now);
                if (['submit', 'unlock'].includes(b.action) && ['wrong', undefined].includes(result.reason) && s.status !== 'waiting') {
                    s.submissions ??= [];
                    s.submissions.push({ lock: b.action === 'unlock' ? 6 : (result.ok ? s.solved.length : s.solved.length + 1), at: now, ok: result.ok, input: b.action === 'unlock' ? { code: String(b.code || '').slice(0, 5) } : Object.fromEntries(Object.entries(b.input || {}).slice(0, 8).map(([k, v]) => [String(k).slice(0, 30), String(v).slice(0, 40)])) });
                }
                s.effects = effects(s, s.effects?.history || [], now);
                rememberRequest(s, b, guard, result);
                let r = await stmt('UPDATE teams SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=teams.room_id AND deleted_at IS NULL AND round=? AND revision=?)', JSON.stringify(s), s.id, row.revision, s.round || 1, room.revision).run();
                if (r.meta.changes)
                    return reply({ result, state: await publicState(s, room, row.revision + 1), map: await raceRoom(room) });
            }
            return fail('Đang có lượt gửi khác. Kiểm tra lại tiến độ trước khi gửi.', 409);
        }
        return fail('Yêu cầu không hợp lệ.');
    }
    catch (e) {
        if (e.code)
            return fail(e.message, e.status, e.code);
        console.error('escape POST', e.message);
        return fail('Chưa lưu được lượt này. Giữ câu trả lời và kết nối lại máy chủ.', 503);
    }
}
