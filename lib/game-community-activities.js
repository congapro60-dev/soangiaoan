import { contextQuestion } from './context-questions.js';
import {TOPICS} from './campaign.js';
import { CLASS_EVENT_TYPES, startClassEvent, answerClassEvent, pickClassEvent, buzzClassEvent, finishClassEvent, leaveClassEvent, classEventView } from './lesson/class-events.js';

export const GAME_ACTIVITY_TYPES = CLASS_EVENT_TYPES;
export const GAME_ACTIVITY_DURATION = 180000;
export const gameActivityOf = room => { try { return JSON.parse(room?.race || 'null')?.classActivity || null; } catch { return null; } };
const host = room => ({ role: 'teacher', id: `game:${room.id}` });

// ponytail: three seeded numeric questions per player; longer activities need a reviewed question pool.
export function createGameActivity(room, campaign, roster, type, wall, triggerId) {
  if (!GAME_ACTIVITY_TYPES.includes(type)) throw Error('INVALID_CLASS_EVENT');
  const eligible = roster.filter(player => player.status === 'active');
  if (eligible.length < 2) throw Error('EVENT_ROSTER_TOO_SMALL');
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const tasks = Array.from({ length: 6 }, (_, i) => {
    const plan = campaign.plan[i % campaign.plan.length];
    const question = contextQuestion({ ...plan, level: Math.min(plan.level, 1), format: 'short', category: 'practice' }, (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0);
    if (!Number.isFinite(question.answer)) throw Error('EVENT_QUESTION_INVALID');
    return { id: `game-event-${i}`, type: 'closed', prompt: question.question,
      objectiveIds: [`topic-${plan.topic}`], inputSchema: {}, evaluation: { checkerId: 'numeric_exact', answerKey: question.answer } };
  });
  const startAt = wall + 10000;
  const session = { id: room.id, hostId: host(room).id, status: 'active', seed, round: room.round,
    timeline: { activityIndex: 0 }, clock: {}, roster: Object.fromEntries(eligible.map(player => [player.id, { present: true }])),
    package: { budget: { reserveMinutes: 3 }, objectives: campaign.plan.map(plan => ({ id: `topic-${plan.topic}`, statement: TOPICS.find(topic=>topic.id===plan.topic)?.name||'Bài Toán đã chọn' })),
      activities: [{ id: 'game-community', phase: 'practice', taskIds: tasks.map(task => task.id) }], tasks } };
  const engine = startClassEvent(session, { type, seed, durationMs: GAME_ACTIVITY_DURATION }, host(room), startAt);
  return { id: engine.id, type, triggerId, round: room.round, openedAt: wall, startAt,
    finishAt: engine.endsAt, resumeAt: engine.endsAt + 10000, engine };
}

export function applyGameActivity(event, input, wall) {
  if (wall < event.startAt || wall >= event.finishAt) throw Error('EVENT_BOUNDARY');
  const { learnerId, requestId, eventAction, step, answer, cellId } = input;
  const data = { learnerId, requestId };
  let engine;
  if (eventAction === 'pick') engine = pickClassEvent(event.engine, { ...data, cellId }, wall);
  else if (eventAction === 'buzz') engine = buzzClassEvent(event.engine, { ...data, step }, wall);
  else if (eventAction === 'answer') {
    if (typeof answer !== 'string' && typeof answer !== 'number' || String(answer).length > 80) throw Error('INVALID_EVENT_INPUT');
    engine = answerClassEvent(event.engine, { ...data, step, answer }, wall);
  } else throw Error('INVALID_EVENT_INPUT');
  return { ...event, engine };
}

export function withdrawGameActivity(event, activeIds, wall) {
  let engine = event.engine;
  for (const id of Object.keys(engine.participants)) if (!activeIds.includes(id) && engine.participants[id].absentAt == null)
    engine = leaveClassEvent(engine, id, { role: 'teacher', id: engine.hostId }, Math.max(wall, engine.lastNow));
  return { ...event, engine };
}

export function finishGameActivity(room, event, wall) {
  if (event.engine.status === 'closed') return event;
  return { ...event, finishAt: wall, resumeAt: wall, engine: finishClassEvent(event.engine, host(room), Math.max(wall, event.engine.lastNow)) };
}

export function publicGameActivity(event, wall, ownId, teacher = false) {
  if (!event) return null;
  const participant = ownId && Object.hasOwn(event.engine.participants, ownId) ? ownId : null;
  const phase = wall < event.startAt ? 'countdown' : wall < event.finishAt ? 'playing' : wall < event.resumeAt ? 'results' : 'done';
  const view = classEventView(event.engine, participant, Math.max(event.startAt, wall, event.engine.lastNow), { teacher, presenter: !participant });
  if (phase !== 'playing' && view.own) { view.own.task = null; view.own.canAnswer = false; if (view.own.buzzer) view.own.buzzer.canBuzz = false; view.own.canPick = false; }
  // Opponent identifiers are only needed inside the server engine, never on a public screen.
  if (view.own) delete view.own.opponentId;
  return { ...view, phase, openedAt: event.openedAt, startAt: event.startAt, finishAt: event.finishAt, resumeAt: event.resumeAt,
    remainingMs: Math.max(0, (phase === 'countdown' ? event.startAt : phase === 'playing' ? event.finishAt : event.resumeAt) - wall) };
}

export function settleGameActivities(player, room, wall, logicalNow) {
  let race;
  try { race = JSON.parse(room.race || 'null'); } catch { return; }
  for (const event of [...(race?.classActivityHistory || []), race?.classActivity].filter(Boolean)) {
    const own = event.engine.participants[player.id];
    if (!own || wall < event.resumeAt || player.events.some(item => item.type === 'class-activity-result' && item.eventId === event.id)) continue;
    const points = own.score;
    player.score = (player.score || 0) + points;
    player.events.push({ type: 'class-activity-result', eventId: event.id, activity: event.type, correct: own.correct, points, at: logicalNow });
  }
}
