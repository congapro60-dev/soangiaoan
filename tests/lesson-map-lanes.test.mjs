import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = f => readFile(new URL('../' + f, import.meta.url), 'utf8');
function nodeSource(source, name, variable = false) {
  const tree = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(n) { if ((variable ? ts.isVariableDeclaration(n) : ts.isFunctionDeclaration(n)) && n.name?.getText(tree) === name) found = n; ts.forEachChild(n, visit); }
  visit(tree);
  assert(found, `${name} exists`);
  return variable ? `var ${found.getText(tree)};` : found.getText(tree);
}

test('three lanes meet exact checkpoints, preserve progress, remain bounded in all worlds', async () => {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(await read('public/terrain-core.js'), ctx);
  vm.runInContext(await read('public/strategic-map.js'), ctx);
  vm.runInContext(await read('public/campaign-data.js'), ctx);
  const { sampleLessonLane } = ctx.window.SignalTerrain;
  assert.equal(typeof sampleLessonLane, 'function');
  for (const theme of Object.values(ctx.window.SignalCampaign.themes)) {
    const route = theme.route, gates = [0, 4, 7, 11, 14, 18, 21, 25, 28, 32];
    for (const branch of ['support', 'core', 'extension']) {
      for (const cell of gates) assert.deepEqual(Array.from(sampleLessonLane(route, cell, branch, gates)), Array.from(ctx.window.SignalTerrainCore.sample(route, cell)));
      for (let cell = 0; cell <= 32; cell += .25) {
        const base = ctx.window.SignalTerrainCore.sample(route, cell), point = sampleLessonLane(route, cell, branch, gates);
        assert(Math.hypot((point[0] - base[0]) * 2.8, (point[1] - base[1]) * 1.7) <= 4.001);
        assert(point.every(Number.isFinite));
      }
    }
    const a = sampleLessonLane(route, 2, 'support', gates), c = sampleLessonLane(route, 2, 'core', gates), e = sampleLessonLane(route, 2, 'extension', gates);
    assert(Math.hypot(a[0] - c[0], a[1] - c[1]) > .1);
    assert(Math.hypot(e[0] - c[0], e[1] - c[1]) > .1);
    assert.deepEqual(Array.from(sampleLessonLane(route, 2, 'spoof', gates)), Array.from(c));
    const corner = 5, left = sampleLessonLane(route, corner - 1e-6, 'support', gates), right = sampleLessonLane(route, corner + 1e-6, 'support', gates);
    assert(Math.hypot((left[0] - right[0]) * 2.8, (left[1] - right[1]) * 1.7) < .001);
  }
});

test('parent branch messages require own projection, available server branch, trusted frame and handler', async () => {
  const source = await read('components/lesson/LessonWorldMap.tsx'), owned = {}, accepted = [];
  const ctx = vm.createContext({ window: { location: { origin: 'https://map.test' } }, frameRef: { current: { contentWindow: owned } }, latest: { current: { payload: { map: { peers: [{ id: 'me', own: true }], ownBranch: 'core', availableBranches: ['support', 'core'] } } } }, handlers: { current: { onSelectBranch: branch => accepted.push(branch) } } });
  vm.runInContext(ts.transpileModule(nodeSource(source, 'onMessage', true), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  const msg = branch => ({ origin: 'https://map.test', source: owned, data: { type: 'lesson-map:branch', payload: { branch } } });
  ctx.onMessage({ ...msg('support'), origin: 'https://bad.test' });
  ctx.onMessage({ ...msg('support'), source: {} });
  ctx.onMessage(msg('extension'));
  ctx.onMessage(msg('__proto__'));
  assert.deepEqual(accepted, []);
  ctx.onMessage(msg('support'));
  assert.deepEqual(accepted, ['support']);
  ctx.latest.current.payload.examJourney = {};
  ctx.onMessage(msg('support'));
  ctx.latest.current.payload.examJourney = null;
  ctx.latest.current.payload.map.peers = [{ id: 'team' }];
  ctx.onMessage(msg('support'));
  assert.deepEqual(accepted, ['support']);
});

test('iframe lane choice delegates parent without optimistic branch or position mutation', async () => {
  const html = await read('public/lesson-map.html'), sent = [];
  const input = { map: { ownBranch: 'core', availableBranches: ['support', 'core'], peers: [{ id: 'me', own: true, position: 4 }] }, branchSelection: true };
  const ctx = vm.createContext({ lastInput: input, post: (type, data) => sent.push({ type, data }) });
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  vm.runInContext(nodeSource(script, 'selectBranch'), ctx);
  ctx.selectBranch('extension');
  ctx.selectBranch('support');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'lesson-map:branch');
  assert.equal(sent[0].data.payload.branch, 'support');
  assert.equal(input.map.ownBranch, 'core');
  assert.equal(input.map.peers[0].position, 4);
  assert.match(html, /\.lm-lanes[^}]*min-height:44px/);
  assert.match(html, /aria-pressed/);
});

test('2D and 3D use own branch only, neutral peers stay on the common route', async () => {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(await read('public/terrain-core.js'), ctx);
  vm.runInContext(await read('public/strategic-map.js'), ctx);
  const route = [[10, 50], [30, 50], [50, 50], [70, 50], [90, 50]], model = { route, own: 'me', ownBranch: 'support', lessonGates: [{ cell: 0 }, { cell: 4 }] };
  const { sampleLessonLane } = ctx.window.SignalTerrain;
  const flat = vm.createContext({ K: ctx.window.SignalTerrainCore, sampleLessonLane, model });
  const strategic = await read('public/strategic-map.js');
  vm.runInContext(nodeSource(strategic, 'laneGates') + nodeSource(strategic, 'unitPoint'), flat);
  assert.deepEqual(Array.from(flat.unitPoint({ id: 'peer', branch: 'extension' }, 2)), [50, 50]);
  assert.notDeepEqual(Array.from(flat.unitPoint({ id: 'me' }, 2)), [50, 50]);
  const world = p => ({ x: (p[0] / 100 - .5) * 280, y: (p[1] / 100 - .5) * 170 });
  const spatial = vm.createContext({ model, path: route.map(world), window: ctx.window, toWorld: world, roadY: () => 0, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t });
  vm.runInContext(nodeSource(await read('public/map3d.js'), 'standAt'), spatial);
  let position;
  const entry = own => ({ own, off: { u: 0, v: 0 }, group: { position: { set: (x, y, z) => { position = [x, y, z]; } } } });
  spatial.standAt(entry(false), 2);
  assert.deepEqual(position, [0, 0, 0]);
  spatial.standAt(entry(true), 2);
  assert(Math.abs(position[2] + 4) < 1e-9);
  spatial.standAt(entry(true), 4);
  assert(Math.abs(position[0] - 112) < 1e-9 && position[2] === 0);
  model.examJourney = {};
  spatial.standAt(entry(true), 2);
  assert.deepEqual(position, [0, 0, 0]);
});
