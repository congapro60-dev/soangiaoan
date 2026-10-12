import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../components/lesson/useLessonSession.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const projection = (pupil, revision) => ({ view: { id: 'room', round: 1, revision, passport: { name: pupil }, timeline: { currentActivityId: 'activity' } }, revision, serverNow: 1000 });

function hook(options = {}) {
  let cursor = 0, currentOptions = { sessionId: 'room', role: 'student', bearerToken: 'device-token', actingLearnerId: 'a', ...options };
  const slots = [], pendingEffects = [], requests = [], timers = new Map(); let timerId = 0;
  const same = (before, after) => before?.length === after?.length && before.every((value, index) => Object.is(value, after[index]));
  const react = {
    useState(initial) { const index = cursor++; slots[index] ||= { value: initial }; return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }]; },
    useRef(initial) { const index = cursor++; slots[index] ||= { current: initial }; return slots[index]; },
    useEffect(effect, dependencies) { const index = cursor++, old = slots[index]; if (!old || !same(old.dependencies, dependencies)) pendingEffects.push(() => { old?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; }); },
    useCallback(callback, dependencies) { const index = cursor++; if (!slots[index] || !same(slots[index].dependencies, dependencies)) slots[index] = { dependencies, callback }; return slots[index].callback; },
  };
  const clock = { now: 2000 }, FakeDate = class extends Date { static now() { return clock.now; } };
  const context = { exports: {}, require: () => react, URL, console, Date: FakeDate, Error, window: { location: { origin: 'https://test' } }, setTimeout: callback => { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout: id => timers.delete(id), fetch: (url, init) => { const request = { url, init, ...deferred() }; requests.push(request); return request.promise; } };
  vm.runInNewContext(compiled, context);
  let output;
  const render = (updates = {}) => { currentOptions = { ...currentOptions, ...updates }; cursor = 0; pendingEffects.length = 0; output = context.exports.useLessonSession(currentOptions); for (const effect of pendingEffects) effect(); return output; };
  return { render, requests, clock, slots, timers, get output() { return output; } };
}

test('sequential commands use the first response revision before React renders again', async () => {
  const env = hook(); env.render(); env.requests[0].resolve(reply(projection('OWN A', 2))); await flush();
  const state = env.render(); env.render();
  const save = state.dispatchCommand('SAVE_DRAFT', { taskId: 'task', answer: { thought: 'Own idea' } });
  env.requests.at(-1).resolve(reply({ ...projection('OWN A', 3), result: { ok: true } })); await save;
  const contribute = state.dispatchCommand('GROUP_CONTRIBUTE', { taskId: 'task', text: 'Own idea' });
  const request = env.requests.at(-1);
  assert.equal(JSON.parse(request.init.body).event.revision, 3);
  request.resolve(reply({ ...projection('OWN A', 4), result: { ok: true } })); assert.equal((await contribute).ok, true);
});

test('switching pupils rejects an old GET view/revision and starts a new poll while the previous GET remains pending', async () => {
  const env = hook(); env.render(); assert.equal(env.requests.length, 1);
  env.render({ actingLearnerId: 'b' }); assert.equal(env.requests.length, 2);
  assert.equal(new URL(env.requests[1].url).searchParams.get('actingLearnerId'), 'b');
  env.requests[0].resolve(reply(projection('OLD PRIVATE A', 90))); await flush();
  let state = env.render(); assert.equal(state.view, null); assert.equal(state.revision, 0);
  const poll = state.refresh(); assert.equal(env.requests.length, 2, 'old request completion must not unlock the new inflight poll');
  env.requests[1].resolve(reply(projection('OWN B', 4))); await flush(); await poll;
  state = env.render(); assert.equal(state.view.passport.name, 'OWN B'); assert.equal(state.revision, 4); assert.equal(state.error, null);
});

test('a stale GET error whose JSON arrives after a pupil switch cannot replace the new pupils successful state', async () => {
  const env = hook(); env.render(); const body = deferred();
  env.requests[0].resolve({ ok: false, status: 403, json: () => body.promise }); await flush();
  env.render({ actingLearnerId: 'b' }); env.requests[1].resolve(reply(projection('OWN B', 4))); await flush();
  body.resolve({ error: 'FORBIDDEN' }); await flush();
  const state = env.render(); assert.equal(state.view.passport.name, 'OWN B'); assert.equal(state.error, null); assert.equal(state.revision, 4);
});

test('switching pupils permits a new POST while an old POST is still pending; old success cannot replace the new view', async () => {
  const env = hook(); env.render(); env.requests[0].resolve(reply(projection('OWN A', 2))); await flush();
  let state = env.render(); env.render(); const old = state.dispatchCommand('SAVE_DRAFT', { taskId: 'task', answer: 'A' });
  env.render({ actingLearnerId: 'b' }); env.requests.at(-1).resolve(reply(projection('OWN B', 3))); await flush();
  state = env.render(); env.render(); const fresh = state.dispatchCommand('SAVE_DRAFT', { taskId: 'task', answer: 'B' });
  assert.equal(env.requests.filter(request => request.init.method === 'POST').length, 2);
  const latestPost = env.requests.at(-1); assert.equal(JSON.parse(latestPost.init.body).actingLearnerId, 'b');
  env.requests[1].resolve(reply({ ...projection('OLD PRIVATE A', 80), result: { ok: true } })); await flush();
  state = env.render(); assert.equal(state.view.passport.name, 'OWN B'); assert.equal(state.isSubmitting, true, 'old POST finally must not unlock the current POST');
  latestPost.resolve(reply({ ...projection('OWN B', 4), result: { ok: true } })); await fresh;
  assert.equal((await old).code, 'STALE_DEVICE_VIEW'); state = env.render(); assert.equal(state.view.passport.name, 'OWN B'); assert.equal(state.revision, 4);
});

test('a stale POST conflict cannot call an old pupils refresh or conflict callback after the identity changes', async () => {
  let conflicts = 0;
  const env = hook({ onConflict: () => conflicts++ }); env.render(); env.requests[0].resolve(reply(projection('OWN A', 1))); await flush();
  let state = env.render(); env.render(); const old = state.dispatchCommand('SAVE_DRAFT', { taskId: 'task', answer: 'A' });
  env.render({ actingLearnerId: 'b' }); env.requests[2].resolve(reply(projection('OWN B', 3))); await flush();
  const before = env.requests.length; env.requests[1].resolve(reply({ error: 'REVISION_MISMATCH' }, 409));
  assert.equal((await old).code, 'STALE_DEVICE_VIEW'); await flush();
  assert.equal(conflicts, 0); assert.equal(env.requests.length, before); state = env.render(); assert.equal(state.view.passport.name, 'OWN B');
});

test('HTTP200 rejected commands retain the server result code for the caller', async () => {
  const env = hook(); env.render(); env.requests[0].resolve(reply(projection('OWN A', 1))); await flush();
  const state = env.render(); env.render(); const command = state.dispatchCommand('GROUP_VOTE', { taskId: 'task', proposalHash: 'old' });
  env.requests[1].resolve(reply({ result: { ok: false, code: 'STALE_GROUP_PROPOSAL' }, revision: 1 }));
  const result = await command; assert.equal(result.ok, false); assert.equal(result.code, 'STALE_GROUP_PROPOSAL');
});

test('class-event pause freezes the authoritative lesson clock despite client time moving forward', async () => {
  const env = hook(); let state = env.render();
  env.requests[0].resolve(reply({ ...projection('OWN A', 1), view: { ...projection('OWN A', 1).view, clock: { activityDeadline: 10000, pausedAt: null, classEventPausedAt: 3000 } } })); await flush();
  state = env.render(); assert.equal(state.getRemainingMs(), 7000); env.clock.now += 30000;
  state = env.render(); assert.equal(state.getRemainingMs(), 7000);
});

test('changing projection role invalidates an older teacher GET before student view can be displayed', async () => {
  const env = hook({ role: 'teacher', bearerToken: null, actingLearnerId: undefined }); env.render();
  env.render({ role: 'student', bearerToken: null });
  env.requests[0].resolve(reply({ ...projection('TEACHER', 99), view: { ...projection('TEACHER', 99).view, passports: { private: { answer: 'SECRET' } } } })); await flush();
  const state = env.render(); assert.equal(state.view, null); assert.equal(state.revision, 0);
  assert.equal(env.requests.length, 2, 'a role switch must start its own request, without old inflight gate');
});

test('an old teacher tick reply cannot overwrite the new room view or revision', async () => {
  const env = hook({ role: 'teacher', bearerToken: null, actingLearnerId: undefined }); env.render(); env.requests[0].resolve(reply(projection('ROOM A', 2))); await flush();
  let state = env.render(); env.render(); const ticking = state.dispatchTick();
  env.render({ sessionId: 'room-b' }); env.requests[2].resolve(reply(projection('ROOM B', 3))); await flush();
  env.requests[1].resolve(reply({ ...projection('OLD PRIVATE ROOM A', 80), result: { ok: true } }));
  const result = await ticking; assert.equal(result.ok, false); assert.equal(result.code, 'STALE_DEVICE_VIEW');
  state = env.render(); assert.equal(state.view.passport.name, 'ROOM B'); assert.equal(state.revision, 3);
});

test('old presenter rotation cannot return an old-room token or change new-room revision', async () => {
  const env = hook({ role: 'teacher', bearerToken: null, actingLearnerId: undefined }); env.render(); env.requests[0].resolve(reply(projection('ROOM A', 2))); await flush();
  let state = env.render(); env.render(); const rotate = state.rotatePresenterToken();
  env.render({ sessionId: 'room-b' }); env.requests[2].resolve(reply(projection('ROOM B', 3))); await flush();
  env.requests[1].resolve(reply({ presenterToken: 'old-private-room-token', revision: 81 }));
  const result = await rotate; assert.equal(result.ok, false); assert.equal(result.presenterToken, undefined);
  state = env.render(); assert.equal(state.revision, 3);
});

test('stale teacher GET whose body shows a finished arena cannot issue an old-room automatic tick', async () => {
  const env = hook({ role: 'teacher', bearerToken: null, actingLearnerId: undefined }); env.render(); const body = deferred();
  env.requests[0].resolve({ ok: true, status: 200, json: () => body.promise }); await flush();
  env.render({ sessionId: 'room-b' }); env.requests[1].resolve(reply(projection('ROOM B', 3))); await flush();
  body.resolve({ ...projection('OLD ROOM A', 2), view: { ...projection('OLD ROOM A', 2).view, status: 'active', arena: { id: 'arena-a', phase: 'done', settled: false } } }); await flush();
  assert.equal(env.requests.filter(request => request.init.method === 'POST').length, 0);
  assert.equal(env.render().view.passport.name, 'ROOM B');
});
