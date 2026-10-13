import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const noop = () => {};
const html = await read('public/lesson-map.html');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
function sourceNode(source, name, variable = false) {
  const file = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (!found && (variable ? ts.isVariableDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(file) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(file); assert.ok(found, `source node ${name} exists`);
  return variable ? `var ${found.getText(file)};` : found.getText(file);
}
function element(tag = 'div') {
  return { tag, children: [], style: {}, dataset: {}, attributes: {}, hidden: false, textContent: '',
    appendChild(child) { child.parentElement?.removeChild(child); this.children.push(child); child.parentElement = this; return child; },
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentElement = null; child.focused = false; },
    insertBefore(child, next) { child.parentElement?.removeChild(child); const index = next ? this.children.indexOf(next) : this.children.length; this.children.splice(index, 0, child); child.parentElement = this; },
    remove() { this.parentElement?.removeChild(this); }, setAttribute(key, value) { this.attributes[key] = String(value); },
    querySelectorAll() { return this.children; }, querySelector() { return null; }
  };
}
const activityIds = Array.from({ length: 9 }, (_, index) => 'activity-' + (index + 1));
const input = () => ({ sessionKey: 'room', world: 'modern', map: { totalPosition: 72, peers: [{ id: 'm1', own: true, position: 16 }],
  activityIds, gateStars: [{ activityId: activityIds[0], stars: 4 }, { activityId: activityIds[8], stars: 3 }],
  revisitEnabled: true, revisitGates: [{ id: activityIds[0], title: 'Khởi động' }, { id: activityIds[1], title: 'Trạm đã qua' }] } });

test('personal gate geometry follows every actual activity, not the five decorative landmarks', () => {
  const context = vm.createContext({ visiblePeers: data => data.map.peers, cellOf: (position, total) => Math.round(position / total * 32), sprite: noop, selectPeer: noop, openPeerChooser: noop, selectGate: noop });
  vm.runInContext(sourceNode(script, 'buildModel'), context);
  const model = context.buildModel(input(), { route: [], places: ['Bến', 'Kho', 'Trạm', 'Đài', 'Thành'] });
  assert.equal(model.lessonGates.length, 9);
  assert.deepEqual(plain(model.lessonGates.map(gate => gate.activityId)), activityIds);
  assert.equal(model.lessonGates[8].cell, 32); assert.equal(model.lessonGates[8].index, 9);
  assert.equal(model.lessonGates[0].stars, 4);
  assert.notEqual(model.lessonGates[4].cell, 32);
  const tv = input(); tv.map.peers = [{ id: 'm1', position: 16 }];
  assert.deepEqual(plain(context.buildModel(tv, { route: [] }).lessonGates), []);
  assert.deepEqual(plain(context.buildModel({ ...input(), examJourney: { stations: [], phase: 'review' } }, { route: [] }).lessonGates), []);
});

test('frame bridge accepts only current own eligible gate from the same origin and exact frame', async () => {
  const source = await read('components/lesson/LessonWorldMap.tsx'), frame = {}, accepted = [];
  const context = vm.createContext({ window: { location: { origin: 'https://map.test' } }, frameRef: { current: { contentWindow: frame } },
    latest: { current: { payload: input() } }, handlers: { current: { onGateSelect: id => accepted.push(id) } } });
  vm.runInContext(ts.transpileModule(sourceNode(source, 'onMessage', true), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const message = { origin: 'https://map.test', source: frame, data: { type: 'lesson-map:gate', payload: { activityId: activityIds[0] } } };
  context.onMessage(message);
  assert.deepEqual(accepted, [activityIds[0]]);
  for (const extra of [{ origin: 'https://bad.test' }, { source: {} }, { data: { type: 'lesson-map:gate', payload: { activityId: activityIds[8] } } }, { data: { type: 'lesson-map:gate', payload: { activityId: 5 } } }]) context.onMessage({ ...message, ...extra });
  context.latest.current.payload.map.revisitEnabled = false; context.onMessage(message);
  context.latest.current.payload = input(); context.latest.current.payload.map.peers[0].own = false; context.onMessage(message);
  context.latest.current.payload = { ...input(), examJourney: { phase: 'review' } }; context.onMessage(message);
  assert.deepEqual(accepted, [activityIds[0]]);
});

test('gate picker retains accessible buttons, current stars and eligibility after polling', () => {
  const root = element(), nodes = new Map(), sent = [];
  const createElement=()=>{const node=element();node.appendChild=child=>{node.children.push(child);child.parentElement=node;if(child.id)nodes.set(child.id,child);return child;};return node;};
  const menu=createElement();menu.id="lmMenu";nodes.set(menu.id,menu);
  root.appendChild = child => { root.children.push(child); child.parentElement = root; nodes.set(child.id, child); return child; };
  const context = vm.createContext({ root, lastInput: input(), standaloneDemo: false,
    document: { getElementById: id => nodes.get(id), createElement },
    window: { parent: { postMessage: data => sent.push(plain(data)) }, location: { origin: 'https://map.test' } },
    visiblePeers: data => data.map.peers, cellOf: (position, total) => Math.round(position / total * 32), sprite: noop, selectPeer: noop, openPeerChooser: noop });
  vm.runInContext(['post', 'buildModel', 'gateAllowed', 'selectGate', 'renderGatePicker'].map(name => sourceNode(script, name)).join('\n'), context);
  context.renderGatePicker(context.lastInput);
  const picker = nodes.get('lmGates'); assert.equal(picker.hidden, false);
  assert.equal(picker.parentElement.parentElement,menu);assert.equal(picker.parentElement.open,undefined,'gate list starts in collapsed details');
  assert.equal(picker.attributes['aria-label'], 'Sao từng cổng của em');
  assert.equal(picker.children.length, 9);
  const first = picker.children[0]; assert.equal(first.textContent, 'Cổng 1 · ★★★★');
  assert.equal(first.disabled, false); assert.equal(picker.children[8].disabled, true);
  assert.ok(first.attributes['aria-label'].includes('4 sao'));
  first.onclick(); assert.deepEqual(sent.at(-1), { type: 'lesson-map:gate', payload: { activityId: activityIds[0] } });
  first.focused = true;
  context.lastInput.map.gateStars[0].stars = 2; context.renderGatePicker(context.lastInput);
  assert.equal(picker.children[0], first); assert.equal(first.textContent, 'Cổng 1 · ★★');
  assert.equal(first.focused, true, 'poll must not move the focused button out of its DOM position');
  context.lastInput.map.revisitEnabled = false; context.renderGatePicker(context.lastInput);
  first.onclick(); assert.equal(sent.length, 1); assert.equal(first.disabled, true);
  context.lastInput.map.peers[0].own = false; context.renderGatePicker(context.lastInput);
  assert.equal(picker.hidden, true);
});

test('3D plaques show activity stars only when their actual route cell matches', async () => {
  const source = await read('public/map3d.js');
  const plaque = cell => ({ cell, index: cell / 8, el: { children: [element('span'), element('span')], dataset: {} } });
  const plaques = [plaque(0), plaque(8), plaque(16), plaque(24), plaque(32)];
  const context = vm.createContext({ plaques, places: ['Bến', 'Kho', 'Trạm', 'Đài', 'Thành'] });
  vm.runInContext(sourceNode(source, 'syncGatePlaques'), context);
  const model = { lessonGates: [{ activityId: 'a9', index: 9, cell: 32, stars: 3 }] };
  context.syncGatePlaques(model);
  assert.equal(plaques[4].el.children[0].textContent, 'Cổng 9');
  assert.match(plaques[4].el.children[1].textContent, /★★★/);
  assert.equal(plaques[1].el.children[0].textContent, '');
  context.syncGatePlaques({});
  assert.equal(plaques[4].el.children[0].textContent, '05');
});

test('2D physical gate at the end shows activity nine, not decorative gate five', () => {
  const pin = element('button'), number = element('span'), detail = element('small');
  pin.dataset.cell = '32'; pin.querySelector = selector => selector === '.pin-symbol' ? number : detail;
  const context = vm.createContext({ document: { querySelectorAll: () => [pin] } });
  vm.runInContext(sourceNode(script, 'syncFlatGateStars'), context);
  context.syncFlatGateStars({ lessonGates: [{ activityId: 'a9', index: 9, cell: 32, stars: 3 }] });
  assert.equal(number.textContent, '09'); assert.equal(detail.textContent, 'Cổng 9 · ★★★');
  assert.equal(pin.dataset.lessonGateId, 'a9');
  context.syncFlatGateStars({ lessonGates: [{ activityId: 'a1', index: 1, cell: 4, stars: 1 }] });
  assert.equal(number.textContent, ''); assert.equal(detail.textContent, 'Mốc cảnh quan');
  assert.equal(pin.dataset.lessonGateId, '');
  context.syncFlatGateStars({ lessonGates: [] });
  assert.equal(pin.dataset.lessonGateId, undefined);
});
