import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { Vector3, Matrix4 } from '../public/vendor/three/three.core.min.js';

const read = (file) => readFile(new URL('../' + file, import.meta.url), 'utf8');

const plain = (value) => JSON.parse(JSON.stringify(value));
const noop = () => {};

test('station layer stays below mascot labels so the own label wins overlap', async () => {
  const source=await read('public/map3d.js');
  const layerZ=name=>Number(new RegExp(name+"\\.style\\.cssText = '[^']*z-index:(\\d+)").exec(source)?.[1]);
  assert.ok(layerZ('interactiveLayer')<layerZ('labelLayer'));
});

// Extract intact source nodes; never supply helpers missing from production scope.
function sourceNode(source, name, variable = false) {
  const file = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (!found && (variable ? ts.isVariableDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(file) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(found, `source node ${name} exists`);
  return variable ? `var ${found.getText(file)};` : found.getText(file);
}

function element() {
  return {
    style: { display: 'none', setProperty: noop }, dataset: {}, children: [], attributes: {},
    appendChild(child) { this.children.push(child); },
    addEventListener(type, fn) { this[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    remove: noop,
    set innerHTML(value) { this.children = []; },
    closest(selector) { return selector === 'button[data-exam-station]' && this.dataset.examStation ? this : null; },
  };
}

async function frameHarness() {
  const source = await read('public/map3d.js');
  const projected = [];
  let allocations = 0;
  class FrameVector extends Vector3 {
    constructor(...args) { super(...args); allocations++; }
    project(camera) { projected.push([this.x, this.y, this.z]); return super.project(camera); }
  }
  const vector = () => new Vector3();
  const camera = {
    position: vector(), fov: 60, matrixWorld: new Matrix4(), matrixWorldInverse: new Matrix4(),
    projectionMatrix: new Matrix4().makeScale(0.01, 0.01, 0.01), updateMatrixWorld: noop, lookAt: noop,
  };
  const ctx = vm.createContext({
    THREE: { Vector3: FrameVector }, camera, state: { dirty: true }, host: { clientWidth: 800, clientHeight: 600 },
    stationLabels: new Map(), labels: [], interactiveLayer: element(), document: { createElement: element, visibilityState: 'hidden' },
    window: { parent: { postMessage: noop }, location: { origin: 'https://map.test' } },
    path: [{ x: 0, y: 0 }, { x: 20, y: 10 }, { x: 40, y: 30 }], heightAt: (x, z) => x / 10 + z / 10,
    peers: new Map(), plaques: [], badges: [], crowdStats: {}, tmp: vector(),
    dieHint: { visible: false }, dieBubble: { visible: false }, hintEl: element(), bubbleEl: element(),
    raf: 0, last: 0, reduced: true, requestAnimationFrame: () => 1,
    updatePeers: noop, updateDice: noop, scaleBillboards: noop, followSun: noop,
    orbit: { yaw: 0, pitch: 0, dist: 10, target: vector(), shown: { yaw: 0, pitch: 0, dist: 10, target: vector() } },
    perf: { busyAt: 0, drawnScale: 1, frames: 0 }, quality: { scale: 1 },
    lerp: (a, b, k) => a + (b - a) * k, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    groundY: () => 0, sky: { position: vector() }, ridge: { position: vector() }, scene: { fog: {} }, clouds: [],
    sunGlow: { position: vector() }, SUN_DIR: vector(), SKY_R: 1, frameStamps: [],
    post: { setScale: noop, setPasses: noop, render: noop },
  });
  vm.runInContext(['labelPoint', 'viewPoint'].map((n) => sourceNode(source, n, true)).join('\n') + '\n' +
    ['syncStations', 'placeLabels', 'tick'].map((n) => sourceNode(source, n)).join('\n'), ctx);
  return { ctx, projected, allocations: () => allocations };
}

test('Exam journey: actual tick projects selected station at its route fraction, culls and restores visibility', async () => {
  const { ctx, projected, allocations } = await frameHarness();
  ctx.syncStations({ examJourney: { phase: 'review', selectedStationId: 'q2', stations: [1, 2, 3].map((i) => ({ id: 'q' + i, label: 'Q' + i, answered: false })) } });
  const before = allocations();
  ctx.tick(1000);
  const selected = ctx.stationLabels.get('q2');
  assert.equal(selected.style.display, '');
  assert.equal(selected.style.background, '#f6d481');
  assert.ok(projected.some(([x, y, z]) => Math.abs(x - 80 / 3) < 1e-9 && Math.abs(z - 50 / 3) < 1e-9 && Math.abs(y - 19 / 3) < 1e-9));
  assert.equal(selected.style.transform, 'translate(507px,281px) translate(-50%,-50%) scale(1)');
  ctx.camera.projectionMatrix.makeTranslation(0, 0, 5);
  ctx.state.dirty = true;
  ctx.tick(1016);
  assert.equal(selected.style.display, 'none');
  ctx.camera.projectionMatrix.makeScale(0.01, 0.01, 0.01);
  ctx.state.dirty = true;
  ctx.tick(1032);
  assert.equal(selected.style.display, '');
  assert.equal(allocations(), before, 'station projection reuses an existing vector');
});

test('Exam journey: non-journey frame allocates no station vector', async () => {
  const { ctx, allocations } = await frameHarness();
  const before = allocations();
  ctx.tick(1000);
  assert.equal(allocations(), before);
});

test('Exam journey: real parent callback rejects foreign origin/source, unknown qid and submitted phase', async () => {
  const source = await read('components/lesson/LessonWorldMap.tsx');
  const accepted = [];
  const owned = {};
  const journey = { phase: 'review', stations: [{ id: 'q1' }] };
  const ctx = vm.createContext({
    window: { location: { origin: 'https://map.test' } }, frameRef: { current: { contentWindow: owned } },
    latest: { current: { payload: { examJourney: journey } } }, handlers: { current: { onExamStationSelect: (id) => accepted.push(id) } },
  });
  vm.runInContext(ts.transpileModule(sourceNode(source, 'onMessage', true), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  const event = { origin: 'https://map.test', source: owned, data: { type: 'exam-map:select', payload: { qid: 'q1' } } };
  ctx.onMessage({ ...event, origin: 'https://foreign.test' });
  ctx.onMessage({ ...event, source: {} });
  ctx.onMessage({ ...event, data: { type: 'exam-map:select', payload: { qid: 'unknown' } } });
  ctx.onMessage({ ...event, data: { type: 'exam-map:select', payload: { qid: 1 } } });
  journey.phase = 'submitted';
  ctx.onMessage(event);
  assert.deepEqual(accepted, []);
  journey.phase = 'review';
  ctx.onMessage(event);
  assert.deepEqual(accepted, ['q1']);
});

async function pageHarness() {
  const html = await read('public/lesson-map.html');
  const source = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const nodes = new Map();
  const timers = new Map();
  const sent = [];
  const models = [];
  let seq = 0;
  const terrainController = { update: (model) => models.push(model), destroy: noop, frame: noop, mode: noop };
  const ctx = vm.createContext({
    window: { SignalTerrain: { mount: (_host, model) => { models.push(model); return terrainController; } }, parent: { postMessage: (data) => sent.push(plain(data)) }, location: { origin: 'https://map.test' } },
    document: { getElementById: (id) => nodes.get(id), querySelector: () => element(), createElement: element,
      body: { appendChild: (el) => nodes.set(el.id, el) } },
    root: element(), campaign: {}, lastInput: null, current: null, controller: null, pilot: null, pilotWanted: false,
    themeOf: () => ({ image: 'map.webp', route: [[0, 0], [1, 1]] }),
    markup: () => '', leavePilot: noop, followOwn: noop, renderFilterUi: noop, applyDice: noop,
    visiblePeers: (input) => input.map.peers, cellOf: (p) => p,
    setTimeout: (fn) => { timers.set(++seq, fn); return seq; }, clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(['buildModel', 'mount', 'renderExamJourney', 'receive'].map((n) => sourceNode(source, n)).join('\n'), ctx);
  return { ctx, timers, sent, nodes, models, flush: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); } };
}

const input = (phase = 'review', sessionKey = 's1') => ({
  sessionKey, world: 'historical', map: { totalPosition: 100, peers: [{ id: 'own', own: true, position: 100 }, { id: 'other', position: 50 }] },
  examJourney: { phase, selectedStationId: 'q1', stations: [{ id: 'q1', label: 'Q1', answered: true }] },
});

test('Exam journey: receive sanitizes metadata and forwards it to the actual model', async () => {
  const { ctx, models } = await pageHarness();
  const payload = input('invalid');
  payload.examJourney = { ...payload.examJourney, selectedStationId: 'outside', secret: 'omit', stations: [
    null, { id: '' }, { id: 4 }, { id: 'x'.repeat(101) },
    ...Array.from({ length: 100 }, (_, i) => ({ id: 'q' + i, label: 'L'.repeat(40), answered: i % 2, answer: 'omit', score: 9 })),
  ] };
  ctx.receive(payload);
  const result = plain(ctx.lastInput.examJourney);
  assert.equal(result.phase, 'submitted');
  assert.equal(result.selectedStationId, null);
  assert.equal(result.stations.length, 80);
  assert.deepEqual(Object.keys(result).sort(), ['phase', 'selectedStationId', 'stations']);
  for (const station of result.stations) {
    assert.deepEqual(Object.keys(station).sort(), ['answered', 'id', 'label']);
    assert.equal(station.label.length, 30);
    assert.equal(typeof station.answered, 'boolean');
  }
  assert.deepEqual(plain(models.at(-1).examJourney), result);
  assert.deepEqual(plain(models.at(-1).peers).map((p) => p.id), ['own']);
  assert.equal(payload.map.peers[0].position, 100);
});

test('Exam journey: valid IDs including object property names survive; duplicates and invalid selection do not', async () => {
  const { ctx } = await pageHarness();
  const payload = input();
  payload.examJourney.stations = ['constructor', '__proto__', 'q1', 'q1'].map((id) => ({ id, label: id }));
  ctx.receive(payload);
  assert.deepEqual(plain(ctx.lastInput.examJourney.stations).map((s) => s.id), ['constructor', '__proto__', 'q1']);
  assert.equal(ctx.lastInput.examJourney.selectedStationId, 'q1');
});

test('Exam journey: first mount completes submitted walk without mutating the parent payload', async () => {
  const { ctx, flush } = await pageHarness();
  const payload = input('submitted');
  const before = plain(payload);
  ctx.receive(payload);
  assert.equal(ctx.lastInput.map.peers[0].position, 0);
  flush();
  assert.equal(ctx.lastInput.map.peers[0].position, 100);
  assert.deepEqual(payload, before);
});

test('Exam journey: stale timer cannot overwrite review, another session or another world', async () => {
  for (const update of [input('review'), input('submitted', 's2'), { ...input('submitted'), world: 'modern' }]) {
    const { ctx, timers } = await pageHarness();
    ctx.controller = { update: noop, destroy: noop };
    ctx.current = { key: 's1:historical' };
    ctx.receive(input('submitted'));
    const stale = [...timers.values()][0];
    assert.equal(typeof stale, 'function');
    update.map.peers[0].position = 70;
    const before = plain(update);
    ctx.receive(update);
    const position = ctx.lastInput.map.peers[0].position;
    stale();
    assert.equal(ctx.lastInput.map.peers[0].position, position);
    assert.deepEqual(update, before);
  }
});

test('Exam journey: 2D buttons dispatch owned review station, expose selection, block submitted clicks', async () => {
  const { ctx, nodes, sent } = await pageHarness();
  ctx.receive(input());
  const container = nodes.get('examJourneyContainer');
  const button = container.children[0];
  container.click({ target: button });
  assert.deepEqual(sent, [{ type: 'exam-map:select', payload: { qid: 'q1' } }]);
  assert.equal(button.attributes['aria-pressed'], 'true');
  ctx.receive(input('submitted'));
  const disabled = container.children[0];
  assert.equal(disabled.disabled, true);
  container.click({ target: disabled });
  assert.equal(sent.length, 1);
});

test('Exam journey: 3D buttons expose selected state and guard submitted events', async () => {
  const { ctx } = await frameHarness();
  const sent = [];
  ctx.window.parent.postMessage = (data) => sent.push(plain(data));
  ctx.syncStations(input());
  const button = ctx.stationLabels.get('q1');
  button.onclick({ preventDefault: noop, stopPropagation: noop });
  assert.equal(sent.length, 1);
  assert.equal(button.attributes['aria-pressed'], 'true');
  ctx.syncStations(input('submitted'));
  button.onclick({ preventDefault: noop, stopPropagation: noop });
  assert.equal(sent.length, 1);
});
