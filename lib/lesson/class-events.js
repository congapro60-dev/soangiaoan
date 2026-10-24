import { canonicalize, CHECKER_REGISTRY } from './schema.js';

export const CLASS_EVENT_TYPES = Object.freeze(['tug', 'boss', 'buzzer', 'mountain', 'castle', 'archery', 'surf', 'duel', 'relay', 'treasure', 'estimate', 'bingo']);
export const CLASS_EVENT_LABELS = Object.freeze({ tug: 'Kéo co', boss: 'Đánh trùm cả lớp', buzzer: 'Bấm chuông', mountain: 'Leo núi',
  castle: 'Lâu đài', archery: 'Bắn cung', surf: 'Lướt sóng', duel: 'Đối kháng', relay: 'Tiếp sức', treasure: 'Truy tìm kho báu', estimate: 'Ước lượng', bingo: 'Bingo' });
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !['__proto__', 'prototype', 'constructor'].includes(value);
const fail = code => { throw new Error(code); };
const teacherAllowed = (hostId, actor) => actor?.role === 'teacher' && (actor.id === hostId || actor.authorizedHostId === hostId);
function clock(event, now) { if (!Number.isFinite(now) || now < 0 || now < (event?.lastNow || 0)) fail('INVALID_EVENT_CLOCK'); }
function hash(value) { let result = 0; for (const char of value) result = (Math.imul(result, 31) + char.charCodeAt(0)) >>> 0; return result; }
function validAnswer(value, depth = 0) {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 8000;
  if (Array.isArray(value)) return value.length <= 100 && Array.from(value).every(item => validAnswer(item, depth + 1));
  return Boolean(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).every(key => id(key) && validAnswer(value[key], depth + 1)));
}

/** now is the parent's logical active clock: paused calls keep it unchanged. */
export function startClassEvent(session, { type, seed = session.seed, durationMs = 180000 }, actor, now) {
  if (!teacherAllowed(session.hostId, actor)) fail('UNAUTHORIZED');
  clock(null, now);
  if (!CLASS_EVENT_TYPES.includes(type)) fail('INVALID_CLASS_EVENT');
  if (!Number.isSafeInteger(seed)) fail('INVALID_EVENT_SEED');
  if (!Number.isInteger(durationMs) || durationMs < 180000 || durationMs > 300000) fail('INVALID_EVENT_DURATION');
  if (session.status !== 'active' || session.timeline?.locked || session.clock?.arenaPausedAt != null) fail('EVENT_BOUNDARY');
  if (session.classEvent && session.classEvent.status !== 'closed' && now < session.classEvent.endsAt) fail('EVENT_ALREADY_ACTIVE');
  const available = (session.package?.budget?.reserveMinutes || 0) * 60000;
  if ((session.clock?.classEventBudgetUsedMs || 0) + (session.clock?.arenaBudgetUsedMs || 0) + durationMs > available) fail('EVENT_BUDGET_EXCEEDED');
  const activity = session.package?.activities?.[session.timeline.activityIndex];
  if (!activity || ['recheck', 'exit'].includes(activity.phase)) fail('EVENT_BOUNDARY');
  const pool = (session.package.tasks || []).filter(task => activity.taskIds.includes(task.id) && task.type === 'closed' &&
    CHECKER_REGISTRY[task.evaluation?.checkerId] && (type !== 'estimate' || task.evaluation.checkerId === 'numeric_exact'));
  const participants = {};
  const boardCategories = {};
  for (const [learnerId, learner] of Object.entries(session.roster || {})) {
    if (learner.present === false) continue;
    if (!id(learnerId)) fail('INVALID_EVENT_ROSTER');
    const branch = session.branches?.[activity.id]?.[learnerId] || 'core';
    const tasks = pool.filter(task => !task.branch || task.branch === 'shared' || task.branch === branch)
      .sort((a, b) => hash(`${seed}:${learnerId}:${a.id}`) - hash(`${seed}:${learnerId}:${b.id}`)).slice(0, 3);
    if (type === 'mountain') tasks.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
    if (!tasks.length) fail('EVENT_NO_LANE_QUESTION');
    const bingoFree = Array.from({ length: 4 }, (_, i) => i >= tasks.length);
    participants[learnerId] = { taskIds: tasks.map(task => task.id), step: 0, correct: 0, wrong: 0, score: 0, cooldownUntil: 0,
      bingo: [...bingoFree], bingoFree };
    if (type === 'mountain') Object.assign(participants[learnerId], {
      board: tasks.map((task, index) => {
        const objective = (task.objectiveIds || []).map(objectiveId => session.package.objectives?.find(item => item.id === objectiveId)).find(Boolean);
        boardCategories[task.id] = objective?.statement || objective?.code || 'Nhiệm vụ đã duyệt';
        return { id: task.id, points: (index + 1) * 10 };
      }), selectedCellId: null, usedCellIds: [],
    });
  }
  const learnerIds = Object.keys(participants).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`) || a.localeCompare(b));
  if (!learnerIds.length) fail('EVENT_EMPTY_ROSTER');
  const teams = [0, 1].map(index => ({ id: `event-team-${index + 1}`, memberIds: learnerIds.filter((_, i) => i % 2 === index), turn: 0, points: 0 }));
  for (const [index, learnerId] of learnerIds.entries()) participants[learnerId].team = index % 2;
  const pair = type === 'duel';
  const devicePairs = pair ? actor.duelDevicePairs : undefined, paired = new Set();
  if (devicePairs !== undefined) {
    if (!Array.isArray(devicePairs) || devicePairs.length > Math.floor(learnerIds.length / 2)) fail('INVALID_EVENT_PAIRS');
    for (const ids of Array.from(devicePairs)) {
      if (!Array.isArray(ids) || ids.length !== 2 || !Array.from(ids).every(learnerId => id(learnerId) && participants[learnerId] && !paired.has(learnerId)) || ids[0] === ids[1]) fail('INVALID_EVENT_PAIRS');
      for (let i = 0; i < 2; i++) { participants[ids[i]].opponent=ids[1-i];participants[ids[i]].sharedDuel=true;paired.add(ids[i]); }
    }
  }
  const remaining = learnerIds.filter(learnerId => !paired.has(learnerId));
  if (pair) for (let i = 0; i < remaining.length; i += 2) {
    participants[remaining[i]].opponent = remaining[i + 1] || null;
    if (remaining[i + 1]) participants[remaining[i + 1]].opponent = remaining[i];
  }
  const used = new Set(Object.values(participants).flatMap(player => player.taskIds));
  // ponytail: up to three authored lane questions; a longer event needs a reviewed variant pool, never live AI.
  return { id: crypto.randomUUID(), hostId: session.hostId, sessionId: session.id, activityId: activity.id, round: session.round, type, seed,
    ...(type === 'surf' ? {comboVersion:1} : {}),
    ...(type === 'buzzer' ? {buzzerVersion:1} : {}),
    ...(pair && devicePairs !== undefined ? {duelPairingVersion:1} : {}),
    ...(type === 'mountain' ? { boardVersion: 1, boardCategories } : {}),
    status: 'active', startedAt: now, endsAt: now + durationMs, durationMs, lastNow: now,
    participants, teams, tasks: structuredClone(pool.filter(task => used.has(task.id))), receipts: {}, fastest: null,
    bossHealth: Object.values(participants).reduce((sum, player) => sum + player.taskIds.length, 0) };
}

export function pickClassEvent(event, input, now) {
  clock(event, now);
  if (!input || Object.keys(input).some(key => !['learnerId', 'cellId', 'requestId'].includes(key)) ||
    !id(input.learnerId) || !id(input.cellId) || !id(input.requestId)) fail('INVALID_EVENT_INPUT');
  if (event.type !== 'mountain' || event.boardVersion !== 1) fail('INVALID_CLASS_EVENT');
  const player = event.participants[input.learnerId];
  if (!player) fail('EVENT_LEARNER_UNAVAILABLE');
  const fingerprint = canonicalize(input), receiptKey = canonicalize(['pick', input.learnerId, input.requestId]);
  const receipt = event.receipts[receiptKey];
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) fail('EVENT_REQUEST_CONFLICT');
    return { ...structuredClone(event), lastResult: { ...receipt.result, replay: true } };
  }
  if (event.status !== 'active') fail('EVENT_CLOSED');
  if (now >= event.endsAt) fail('EVENT_EXPIRED');
  if (player.absentAt != null) fail('EVENT_LEARNER_UNAVAILABLE');
  if (!player.board.some(cell => cell.id === input.cellId)) fail('EVENT_CELL_UNAVAILABLE');
  if (player.usedCellIds.includes(input.cellId)) fail('EVENT_CELL_USED');
  if (player.selectedCellId) fail('EVENT_CELL_SELECTED');
  if (now < player.cooldownUntil) fail('EVENT_ANSWER_COOLDOWN');
  const next = structuredClone(event);
  next.participants[input.learnerId].selectedCellId = input.cellId;
  const result = { ok: true, selectedCellId: input.cellId, step: player.step, replay: false };
  next.lastNow = now; next.lastResult = result; next.receipts[receiptKey] = { fingerprint, result };
  return next;
}

export function buzzClassEvent(event, input, now) {
  clock(event, now);
  if (!input || Object.keys(input).some(key => !['learnerId','step','requestId'].includes(key)) || !id(input.learnerId) || !id(input.requestId) || !Number.isInteger(input.step) || input.step < 0) fail('INVALID_EVENT_INPUT');
  if (event.type !== 'buzzer' || event.buzzerVersion !== 1) fail('INVALID_CLASS_EVENT');
  const player = event.participants[input.learnerId];
  if (!player) fail('EVENT_LEARNER_UNAVAILABLE');
  const fingerprint=canonicalize(input),receiptKey=canonicalize(['buzz',input.learnerId,input.requestId]),receipt=event.receipts[receiptKey];
  if(receipt){if(receipt.fingerprint!==fingerprint)fail('EVENT_REQUEST_CONFLICT');return{...structuredClone(event),lastResult:{...receipt.result,replay:true}};}
  if(event.status!=='active')fail('EVENT_CLOSED');
  if(now>=event.endsAt)fail('EVENT_EXPIRED');
  if(player.absentAt!=null)fail('EVENT_LEARNER_UNAVAILABLE');
  if(input.step!==player.step || player.step>=player.taskIds.length)fail('STALE_EVENT_STEP');
  if(now<player.cooldownUntil)fail('EVENT_ANSWER_COOLDOWN');
  if(player.buzz?.step===player.step&&now<player.buzz.expiresAt)fail('EVENT_ALREADY_BUZZED');
  const next=structuredClone(event),buzz={step:player.step,pressedAt:now,expiresAt:Math.min(event.endsAt,now+30000)};
  next.participants[input.learnerId].buzz=buzz;
  const result={ok:true,step:player.step,pressedAt:buzz.pressedAt,expiresAt:buzz.expiresAt,replay:false};
  next.lastNow=now;next.lastResult=result;next.receipts[receiptKey]={fingerprint,result};return next;
}

function numeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const text = value.trim().replace(/[−–]/g, '-').replace(',', '.');
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)) { const [top, bottom] = text.split('/').map(Number); return bottom ? top / bottom : NaN; }
  return /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
}

export function answerClassEvent(event, input, now) {
  clock(event, now);
  if (!input || Object.keys(input).some(key => !['learnerId', 'step', 'answer', 'requestId'].includes(key)) ||
    !id(input.learnerId) || !id(input.requestId) || !Number.isInteger(input.step) || input.step < 0 || !validAnswer(input.answer)) fail('INVALID_EVENT_INPUT');
  const player = event.participants[input.learnerId];
  if (!player) fail('EVENT_LEARNER_UNAVAILABLE');
  const fingerprint = canonicalize(input);
  if (fingerprint.length > 16000) fail('INVALID_EVENT_INPUT');
  const receiptKey = canonicalize([input.learnerId, input.requestId]), receipt = event.receipts[receiptKey];
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) fail('EVENT_REQUEST_CONFLICT');
    return { ...structuredClone(event), lastResult: { ...receipt.result, replay: true } };
  }
  if (event.status !== 'active') fail('EVENT_CLOSED');
  if (now >= event.endsAt) fail('EVENT_EXPIRED');
  if (player.absentAt != null) fail('EVENT_LEARNER_UNAVAILABLE');
  if (input.step !== player.step || input.step >= player.taskIds.length) fail('STALE_EVENT_STEP');
  if (now < player.cooldownUntil) fail('EVENT_ANSWER_COOLDOWN');
  const team = event.teams[player.team];
  const buzzer = event.type === 'buzzer' && event.buzzerVersion === 1;
  if (buzzer && (player.buzz?.step !== player.step || now >= player.buzz.expiresAt)) fail('EVENT_BUZZ_REQUIRED');
  if (event.type === 'relay' && team.memberIds[team.turn] !== input.learnerId) fail('NOT_EVENT_TURN');
  const mountain = event.type === 'mountain' && event.boardVersion === 1;
  if (mountain && !player.selectedCellId) fail('EVENT_CELL_REQUIRED');
  const cell = mountain ? player.board.find(cell => cell.id === player.selectedCellId) : null;
  const task = event.tasks.find(task => task.id === (mountain ? cell.id : player.taskIds[player.step]));
  const verdict = CHECKER_REGISTRY[task.evaluation.checkerId](input.answer, task);
  const correct = Boolean(verdict.ok);
  const ratio = Number.isFinite(verdict.ratio) ? verdict.ratio : (correct ? 1 : 0);
  let points = Math.round((cell?.points || 10) * ratio);
  const surfCombo = event.type === 'surf' && event.comboVersion === 1;
  const streak = surfCombo && correct ? Math.min(3,(player.streak || 0)+1) : 0;
  if (surfCombo) points = correct ? Math.round(10*streak*ratio) : 0;  if (event.type === 'estimate' && !correct) {
    const value = numeric(input.answer), key = task.evaluation.answerKey;
    points = Number.isFinite(value) ? Math.max(0, Math.floor(10 * (1 - Math.abs(value - key) / Math.max(1, Math.abs(key))))) : 0;
  }
  const next = structuredClone(event), changed = next.participants[input.learnerId];
  changed.step++; changed.correct += Number(correct); changed.wrong += Number(!correct); changed.score += points;
  if (buzzer) changed.buzz = null;
  if (surfCombo) changed.streak = streak;
  changed.cooldownUntil = correct ? now : now + 10000;
  if (mountain) { changed.usedCellIds.push(player.selectedCellId); changed.selectedCellId = null; }
  if (correct) {
    changed.bingo[mountain ? player.taskIds.indexOf(cell.id) : input.step] = true;
    next.bossHealth = Math.max(0, next.bossHealth - 1);
    const elapsed = now - event.startedAt;
    if (!next.fastest || elapsed < next.fastest.elapsedMs) next.fastest = { learnerId: input.learnerId, elapsedMs: elapsed };
  }
  next.teams[player.team].points += points;
  if (event.type === 'relay') {
    const members = next.teams[player.team].memberIds;
    const at = next.teams[player.team].turn;
    for (let i = 1; i <= members.length; i++) {
      const turn = (at + i) % members.length, candidate = next.participants[members[turn]];
      if (candidate.absentAt == null && candidate.step < candidate.taskIds.length) { next.teams[player.team].turn = turn; break; }
    }
  }
  const result = { ok: true, correct, points, score: changed.score, step: changed.step, replay: false };
  next.lastNow = now; next.lastResult = result; next.receipts[receiptKey] = { fingerprint, result };
  return next;
}

export function finishClassEvent(event, actor, now) {
  if (!teacherAllowed(event.hostId, actor)) fail('UNAUTHORIZED');
  clock(event, now);
  return { ...structuredClone(event), status: 'closed', closedAt: now, lastNow: now };
}

export function leaveClassEvent(event, learnerId, actor, now) {
  if (!teacherAllowed(event.hostId, actor)) fail('UNAUTHORIZED');
  clock(event, now);
  const next = structuredClone(event), player = next.participants[learnerId];
  if (!player || next.status !== 'active') return next;
  // Frozen participants and scores remain historical; rejoining the class never reopens this event.
  player.absentAt ??= now;
  if (next.type === 'relay') for (const team of next.teams) {
    const current = next.participants[team.memberIds[team.turn]];
    if (!current) continue;
    if (current.absentAt == null && current.step < current.taskIds.length) continue;
    for (let i = 1; i <= team.memberIds.length; i++) {
      const turn = (team.turn + i) % team.memberIds.length, candidate = next.participants[team.memberIds[turn]];
      if (candidate.absentAt == null && candidate.step < candidate.taskIds.length) { team.turn = turn; break; }
    }
  }
  return next;
}

function progress(event) {
  const players = Object.values(event.participants), correct = players.reduce((sum, player) => sum + player.correct, 0);
  switch (event.type) {
    case 'tug': return { label: 'Lợi thế kéo co', value: Math.max(-10, Math.min(10, (event.teams[0].points - event.teams[1].points) / 10)), max: 10 };
    case 'boss': return { label: 'Năng lượng trùm còn lại', value: event.bossHealth, max: players.reduce((sum, player) => sum + player.taskIds.length, 0) };
    case 'buzzer': return { label: 'Thời gian trả lời đúng nhanh nhất', value: event.fastest ? event.fastest.elapsedMs / 1000 : 0, unit: 'giây' };
    case 'mountain': return { label: 'Bậc núi đã chinh phục', value: Math.min(4, Math.max(...players.map(player => Math.floor(player.correct / player.taskIds.length * 4)))), max: 4 };
    case 'castle': return { label: 'Lớp thành đã mở', value: Math.min(3, correct), max: 3 };
    case 'archery': return { label: 'Mũi tên trúng đích', value: correct };
    case 'surf': return { label: 'Quãng đường lướt sóng', value: correct * 20, unit: 'm' };
    case 'duel': return { label: 'Điểm đối kháng', value: players.reduce((sum, player) => sum + player.score, 0) };
    case 'relay': return { label: 'Chặng tiếp sức hoàn thành', value: correct };
    case 'treasure': return { label: 'Manh mối kho báu', value: correct };
    case 'estimate': return { label: 'Điểm ước lượng', value: players.reduce((sum, player) => sum + player.score, 0) };
    case 'bingo': return { label: 'Hàng Bingo hoàn thành', value: players.filter(player => [[0, 1], [2, 3], [0, 2], [1, 3]].some(line =>
      line.every(cell => player.bingo[cell]) && line.some(cell => !(player.bingoFree?.[cell] ?? cell >= player.taskIds.length)))).length };
  }
}

function publicTask(task) {
  if (!task) return null;
  const schema = {};
  for (const key of ['options', 'representations', 'cards', 'items', 'categories']) if (Array.isArray(task.inputSchema?.[key])) schema[key] = task.inputSchema[key].map(item => ({ id: item.id, label: item.label }));
  return { id: task.id, type: 'closed', prompt: task.prompt, evaluation: { checkerId: task.evaluation.checkerId }, inputSchema: schema };
}

export function classEventView(event, learnerId, now, { presenter = false, teacher = false } = {}) {
  if (!event) return null;
  clock(event, now);
  const player = learnerId ? event.participants[learnerId] : null;
  if (learnerId && !player) fail('EVENT_LEARNER_UNAVAILABLE');
  const expiredHold = event.status === 'active' && event.mandatory === true && now >= event.endsAt;
  const status = event.status === 'closed' || (now >= event.endsAt && !expiredHold) ? 'closed' : 'active';
  const mountain = event.type === 'mountain' && event.boardVersion === 1;
  const buzzer = event.type === 'buzzer' && event.buzzerVersion === 1;
  const pressed = Boolean(buzzer && player && player.buzz?.step === player.step && now < player.buzz.expiresAt && player.absentAt == null && status === 'active');
  const own = !presenter && player ? { step: player.step, correct: player.correct, wrong: player.wrong, score: player.score,
    ...(event.type === 'surf' && event.comboVersion === 1 ? {combo:player.streak || 0} : {}),
    questions: player.taskIds.length, cooldownUntil: player.cooldownUntil, canAnswer: status === 'active' && player.absentAt == null && now >= player.cooldownUntil &&
      player.step < player.taskIds.length && (!mountain || Boolean(player.selectedCellId)) && (!buzzer || pressed) && (event.type !== 'relay' || event.teams[player.team].memberIds[event.teams[player.team].turn] === learnerId),
    task: status === 'active' && player.absentAt == null && (!buzzer || pressed) ? publicTask(event.tasks.find(task => task.id === (mountain ? player.selectedCellId : player.taskIds[player.step]))) : null,
    ...(buzzer ? {buzzer:{canBuzz:status==='active'&&player.absentAt==null&&player.step<player.taskIds.length&&now>=player.cooldownUntil&&!pressed,pressed,remainingMs:pressed?Math.max(0,player.buzz.expiresAt-now):0}} : {}),
    ...(mountain ? { board: player.board.map(cell => ({ ...cell, category: event.boardCategories?.[cell.id] || cell.category || 'Nhiệm vụ đã duyệt', used: player.usedCellIds.includes(cell.id), selected: player.selectedCellId === cell.id })),
      selectedCellId: player.selectedCellId, canPick: status === 'active' && player.absentAt == null && !player.selectedCellId && now >= player.cooldownUntil && player.step < player.taskIds.length } : {}),
    team: player.team + 1, opponentScore: player.opponent ? event.participants[player.opponent]?.score : null,
    ...(event.type === 'duel' ? {opponentId:player.opponent || null,sharedDuel:player.sharedDuel===true} : {}),
    bingo: [...player.bingo], bingoFree: player.bingoFree ? [...player.bingoFree] : player.bingo.map((_, i) => i >= player.taskIds.length) } : null;
  return { id: event.id, type: event.type, label: CLASS_EVENT_LABELS[event.type], status, startedAt: event.startedAt, endsAt: event.endsAt,
    now, remainingMs: Math.max(0, event.endsAt - now), players: Object.keys(event.participants).length, progress: progress(event),
    ...(event.mandatory ? { mandatory: true, hold: status === 'active' && now >= event.endsAt } : {}),
    teams: event.teams.map((team, i) => ({ label: `Đội ${i + 1}`, points: team.points, players: team.memberIds.length })), own, teacher: teacher === true };
}
