import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLessonSession } from '../lib/lesson/runtime.js';
import { initLessonMode, serializeLessonMode } from '../lib/lesson/mode-bridge.js';
import { serializeForStudent, serializeForTeacher, serializeForPresenter } from '../lib/lesson/serialize.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
function classroom(participation = 'group') {
  const learners = [0, 1, 2, 3].map(index => ({ id: 'private-pupil-' + index, name: 'PRIVATE_NAME_' + index, teamId: index < 3 ? 'private-team-a' : 'private-team-b', mascot: index }));
  const initial = createLessonSession({ package: pkg, hostId: 'teacher', sessionId: 'teams', learners, now: 0 });
  initial.gamePlan = { participation }; initial.status = 'active';
  initial.timeline.activityIndex = 2; initial.timeline.currentActivityId = pkg.activities[2].id;
  for (const [index, learner] of learners.entries()) { initial.roster[learner.id].mascot = index; initial.diceTrack[learner.id].position = [20, 8, 16, 24][index]; }
  return initLessonMode(initial, 'relay').state;
}

test('pupil and TV maps have one anonymous marker per fixed team, min position and own team counts', () => {
  const state = classroom(), original = JSON.stringify(state);
  const own = serializeForStudent(state, 'private-pupil-1').map, tv = serializeForPresenter(state).map;
  assert.equal(own.peers.length, 2); assert.equal(own.unitCount, 2); assert.equal(own.memberCount, 4); assert.equal(own.ownTeamMemberCount, 3);
  assert.equal(own.peers[0].position, 8); assert.equal(own.peers[0].own, true); assert.equal(own.peers[0].mascot, 0);
  assert.equal(own.peers[0].name, 'Đội 1'); assert.equal(own.peers[0].memberCount, 3);
  assert.equal(tv.peers[0].own, undefined); assert.equal(tv.ownTeamMemberCount, undefined);
  for (const view of [own, tv]) assert.doesNotMatch(JSON.stringify(view), /PRIVATE_NAME|private-pupil|private-team|answerKey|submission|score/);
  assert.equal(JSON.stringify(state), original);
});

test('map uses matching current group die, current members and controller mascot; other groups stay independent', () => {
  const state = classroom(), unit = state.lessonMode.units[0];
  unit.controller = 1; state.roster['private-pupil-0'].present = false;
  const currentId = state.timeline.currentActivityId;
  state.groups[currentId] = { groups: [{ id: 'private-group-a', teamId: 'private-team-a', memberIds: unit.members.map(member => member.id), roles: {}, contributions: [] }] };
  state.groupDice['private-group-a'] = { position: 17 };
  const tv = serializeForPresenter(state).map;
  assert.equal(tv.peers[0].position, 17); assert.equal(tv.peers[0].mascot, 1); assert.equal(tv.peers[0].memberCount, 2);
  assert.equal(tv.memberCount, 3); assert.equal(tv.peers[1].position, 24);
  state.groupDice['private-group-a'].position = 999;
  assert.equal(serializeForPresenter(state).map.peers[0].position, serializeForPresenter(state).map.gatePosition);
  state.roster['private-pupil-1'].present = false; state.roster['private-pupil-2'].present = false;
  assert.equal(serializeForPresenter(state).map.peers.length, 1);
});

test('pair map markers stay separate, teacher diagnostic marker IDs keep individual roster indexing', () => {
  const state = classroom('pairs'), own = serializeForStudent(state, 'private-pupil-1').map;
  assert.equal(own.peers.length, 3); assert.equal(own.peers[0].name, 'Cặp 1'); assert.equal(own.peers[0].memberCount, 2);
  const teacher = serializeForTeacher(state).map;
  assert.deepEqual(teacher.peers.map(peer => peer.id), ['m0', 'm1', 'm2', 'm3']);
  assert.equal(teacher.peers[1].name, 'PRIVATE_NAME_1');
  state.lessonMode.participation = 'individual';
  assert.equal(serializeForPresenter(state).map.peers.length, 4);
});

test('mode panel tells waiting teammates to keep doing individual work, without naming controller', async () => {
  const source = await readFile(new URL('../components/lesson/LessonModePanel.tsx', import.meta.url), 'utf8'), component = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: component, exports: component.exports, require: () => React });
  const state = classroom(), html = renderToStaticMarkup(React.createElement(component.exports.LessonModePanel, { view: serializeLessonMode(state, 'private-pupil-1'), onAction() {} }));
  assert.match(html, /Em tiếp tục làm bài cá nhân/); assert.match(html, /1\/3/); assert.doesNotMatch(html, /PRIVATE_NAME|private-pupil|<button/);
});

test('only own individual map exposes current lane and server selection choices; TV and team markers omit them',()=>{
 const state=classroom();state.lessonMode.participation='individual';state.timeline.activityIndex=4;state.timeline.currentActivityId=pkg.activities[4].id;state.timeline.currentPhase=pkg.activities[4].phase;
 state.branches[state.timeline.currentActivityId]={'private-pupil-1':'support'};
 const own=serializeForStudent(state,'private-pupil-1').map;assert.equal(own.ownBranch,'support');assert.ok(own.availableBranches.includes('core'));
 assert.equal(serializeForPresenter(state).map.ownBranch,undefined);assert.equal(serializeForTeacher(state).map.ownBranch,undefined);
 state.lessonMode.participation='group';assert.equal(serializeForStudent(state,'private-pupil-1').map.ownBranch,undefined);
});
