import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initClassQuest, questsOf, questMandatoryHold, clearSelfPaceHolds } from '../lib/lesson/self-pace.js';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';

// Gói tối thiểu: một cổng luyện tập có câu đóng, rồi cổng thoát.
const pkg = {
  activities: [
    { id: 'a1', phase: 'practice', minutes: 10, taskIds: ['t1'] },
    { id: 'a2', phase: 'exit', minutes: 5, taskIds: [] },
  ],
  tasks: [{ id: 't1', type: 'closed', activityId: 'a1', prompt: 'Câu thử', participation: 'individual' }],
};

const sessionAt = pacing => ({ pacing, package: pkg, roster: {}, timeline: {} });

// Nhiệm vụ cả lớp đã lưu từ bản cũ: còn cờ bắt buộc, đang mở, chưa ai tham gia.
const legacyOpenQuest = () => [{ slot: 0, gateIndex: 0, activityId: 'a1', eventType: 'quiz', mandatory: true, status: 'open', joined: [] }];

test('chế độ GV điều nhịp: nhiệm vụ cả lớp slot 0 vẫn bắt buộc', () => {
  const state = sessionAt('teacher');
  initClassQuest(state, 'quiz', 0);
  assert.equal(questsOf(state)[0].mandatory, true);
});

test('chế độ tự đi: nhiệm vụ cả lớp không bắt buộc và không giữ lớp', () => {
  const state = sessionAt('self');
  initClassQuest(state, 'quiz', 0);
  assert.equal(questsOf(state)[0].mandatory, false);
  state.classQuests[0].status = 'open';
  assert.equal(questMandatoryHold(state), false);
});

test('chế độ GV: nhiệm vụ bắt buộc đang mở vẫn giữ lớp', () => {
  const state = sessionAt('teacher');
  state.classQuests = legacyOpenQuest();
  state.classEvent = { status: 'active', mandatory: true, participants: { s1: {} }, endsAt: 1 };
  assert.equal(questMandatoryHold(state), true);
});

test('chế độ tự đi: phòng cũ còn cờ bắt buộc đã lưu vẫn không giữ lớp', () => {
  const state = sessionAt('self');
  state.classQuests = legacyOpenQuest();
  state.classEvent = { status: 'active', mandatory: true, participants: { s1: {} }, endsAt: 1 };
  assert.equal(questMandatoryHold(state), false);
});

test('clearSelfPaceHolds: tự đi trả bản sao đã xoá cờ, bản gốc giữ nguyên; GV không đổi', () => {
  const self = sessionAt('self');
  self.classQuests = legacyOpenQuest();
  self.classEvent = { status: 'active', mandatory: true, participants: {}, endsAt: 1 };
  const cleared = clearSelfPaceHolds(self);
  assert.equal(cleared.classQuests[0].mandatory, false);
  assert.equal(cleared.classEvent.mandatory, false);
  assert.equal(self.classQuests[0].mandatory, true);
  assert.equal(self.classEvent.mandatory, true);

  const teacher = sessionAt('teacher');
  teacher.classQuests = legacyOpenQuest();
  assert.equal(clearSelfPaceHolds(teacher), teacher);
});

test('chế độ GV: classQuest đơn cũ (không có cờ) vẫn bắt buộc và giữ lớp', () => {
  const state = sessionAt('teacher');
  state.classQuest = { eventType: 'quiz', gateIndex: 0, activityId: 'a1', status: 'open', joined: [] };
  assert.equal(questsOf(state)[0].mandatory, true);
  assert.equal(questMandatoryHold(state), true);
});

test('phòng tự đi mở với cờ bắt buộc cũ: sự kiện mở không còn bắt buộc, TICK hệ thống đóng đúng giờ', () => {
  const fixture = JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  const host = { role: 'teacher', id: 'teacher-1' };
  const system = { role: 'system', id: 'system' };
  let seq = 0;
  const send = (state, type, now, payload = {}, actor = host) =>
    reduceLessonSession(state, { eventId: `stale-${++seq}`, type, payload, round: state.round, revision: state.revision }, { actor, now });

  let state = createLessonSession({ package: structuredClone(fixture), sessionId: 'stale-self', hostId: host.id, mode: 'preview', learners: [{ id: 's1', name: 'HS 1' }, { id: 's2', name: 'HS 2' }], now: 1000 });
  state.pacing = 'self';
  let r = send(state, 'START', 1001);
  assert.equal(r.result.ok, true);
  state = r.state;
  state.classQuests[0].mandatory = true; // phòng cũ: cờ bắt buộc đã lưu

  r = send(state, 'CLASS_EVENT_OPEN', 1002, { type: 'boss', durationMs: 180000, slot: 0 });
  assert.equal(r.result.ok, true, JSON.stringify(r.result));
  state = r.state;
  assert.equal(state.classEvent.mandatory, false);

  r = send(state, 'TICK', 181003, {}, system);
  assert.equal(r.result.ok, true, JSON.stringify(r.result));
  assert.equal(r.state.classEvent.status, 'closed');
});
