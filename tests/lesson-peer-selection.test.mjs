import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { Vector3, Matrix4 } from '../public/vendor/three/three.core.min.js';

const read = (f) => readFile(new URL('../' + f, import.meta.url), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));
const noop = () => {};
const click = (el, props = {}) => el.onclick({ preventDefault:noop, stopPropagation:noop, target:el, ...props });

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

function element(tag = 'div') {
  const el = {
    tag, className: '', style: { display: '', setProperty: noop }, dataset: {}, children: [], attributes: {},
    appendChild(c) { if(c.parentElement)c.remove(); this.children.push(c); c.parentElement = this; return c; },
    append(...cs) { cs.forEach((c) => this.appendChild(c)); },
    prepend(c) { this.children.unshift(c); c.parentElement = this; },
    remove() { this.focused = false; const i = this.parentElement?.children.indexOf(this) ?? -1; if (i >= 0) this.parentElement.children.splice(i, 1); },
    listeners: {}, addEventListener(t, f) { (this.listeners[t] ||= []).push(f); this[t] = f; }, removeEventListener(t,f) { this.listeners[t] = (this.listeners[t] || []).filter(fn => fn !== f); }, emit(t,e) { for(const fn of this.listeners[t] || [])fn(e); },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    get firstChild() {return this.children[0];}, removeChild(c) {c.remove();}, getAttribute(k) { return this.attributes[k] ?? null; },
    querySelector(s) {
      const cls = s.replace(/^[.#]/, '');
      const find = (n) => (n.className?.includes(cls) || n.tag === s) ? n : n.children?.reduce((a, c) => a || find(c), null);
      return find(this);
    },
    querySelectorAll(s) { return this.children.filter((c) => c.className?.includes(s.replace(/^[.#]/, '')) || c.tag === s); },
    closest() { return this; },
    getContext: () => ({ clearRect: noop, drawImage: noop, fillRect: noop, beginPath: noop, lineTo: noop, moveTo: noop, stroke: noop, fill: noop, arc: noop, setLineDash: noop, strokeRect: noop, fillText: noop, setTransform: noop }),
    classList: { add: noop, remove: noop, toggle: noop },
    focus() { this.focused = true; }, close() { this.open = false; }, showModal() { this.open = true; },
  };
  Object.defineProperty(el, 'innerHTML', { set() { this.children = []; }, get: () => '' });
  return el;
}

test('Parent LessonWorldMap: outbound payload peerSelection flag & message validation', async () => {
  const source = await read('components/lesson/LessonWorldMap.tsx');
  const sent = [];
  const fakeFrame = { contentWindow: { postMessage: (m) => sent.push(plain(m)) } };
  let refIndex = 0; let listener;
  const mockReact = { createElement: () => ({}), useRef: (v) => ({ current: refIndex++ === 0 ? fakeFrame : v }), useEffect: (fn) => fn(), useCallback: (fn) => fn };
  const mapWindow = { location: { origin: 'https://map.test' }, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: noop };
  const ready = () => listener({ origin: 'https://map.test', source: fakeFrame.contentWindow, data: { type: 'lesson-map:ready' } });
  const compCtx = vm.createContext({
    React: mockReact, useRef: mockReact.useRef, useEffect: mockReact.useEffect, useCallback: mockReact.useCallback, window: mapWindow,
    resolveThemeId: () => 'modern',
  });
  vm.runInContext(ts.transpileModule(sourceNode(source, 'LessonWorldMap').replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, compCtx);

  compCtx.LessonWorldMap({ sessionKey: 's1', map: { totalPosition: 100, peers: [{ id: 'p1' }] } });
  ready();
  assert.equal(sent[0]?.payload?.peerSelection, false);
  assert.deepEqual(Object.keys(sent[0].payload).sort(), ['map', 'peerSelection', 'sessionKey', 'topInset', 'world']);

  sent.length = 0; refIndex = 0;
  compCtx.LessonWorldMap({ sessionKey: 's1', map: { totalPosition: 100, peers: [{ id: 'p1' }] }, onPeerSelect: noop });
  ready();
  assert.equal(sent[0]?.payload?.peerSelection, true);
  assert.deepEqual(Object.keys(sent[0].payload).sort(), ['map', 'peerSelection', 'sessionKey', 'topInset', 'world']);

  const accepted = [];
  const owned = fakeFrame.contentWindow;
  const peers = [{ id: 'p1' }, { id: 'p2' }];
  const msgCtx = vm.createContext({
    window: { location: { origin: 'https://map.test' } }, frameRef: { current: { contentWindow: owned } },
    latest: { current: { payload: { map: { peers } } } }, handlers: { current: { onPeerSelect: (id) => accepted.push(id) } },
  });
  vm.runInContext(ts.transpileModule(sourceNode(source, 'onMessage', true), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, msgCtx);
  const okMsg = { origin: 'https://map.test', source: owned, data: { type: 'lesson-map:peer', payload: { peerId: 'p1' } } };
  msgCtx.onMessage({ ...okMsg, origin: 'https://bad.test' });
  msgCtx.onMessage({ ...okMsg, source: {} });
  msgCtx.onMessage({ ...okMsg, data: { type: 'lesson-map:peer', payload: { peerId: 123 } } });
  msgCtx.onMessage({ ...okMsg, data: { type: 'lesson-map:peer', payload: { peerId: 'p999' } } });
  msgCtx.handlers.current.onPeerSelect = null;
  msgCtx.onMessage(okMsg);
  assert.deepEqual(accepted, []);
  msgCtx.handlers.current.onPeerSelect = (id) => accepted.push(id);
  msgCtx.onMessage(okMsg);
  assert.deepEqual(accepted, ['p1']);
});

test('HTML layer: buildModel forwarding, selectPeer validation, peer chooser dialog lifecycle', async () => {
  const html = await read('public/lesson-map.html');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const sent = [];
  const nodes = new Map();
  const dlg = element('dialog');
  dlg.id = 'lmPeerChooser';
  nodes.set('lmPeerChooser', dlg);
  const ctx = vm.createContext({
    document: { getElementById: (id) => nodes.get(id), createElement: element, body: element() },
    window: { parent: { postMessage: (d) => sent.push(plain(d)) }, location: { origin: 'https://map.test' } },
    lastInput: null, standaloneDemo: false,
    themeOf: () => ({ image: 'm.webp', route: [], sprites: 's.png', mascots: [] }),
    visiblePeers: (inp) => inp.map.peers, cellOf: (p) => p, esc: (s) => s,
  });
  vm.runInContext(['sprite', 'post', 'buildModel', 'selectPeer', 'openPeerChooser', 'closePeerChooser'].map((n) => sourceNode(script, n)).join('\n'), ctx);

  const m1 = ctx.buildModel({ sessionKey: 's', world: 'm', map: { totalPosition: 10, peers: [] }, peerSelection: true }, { route: [] });
  assert.equal(m1.peerSelection, true);
  assert.equal(typeof m1.onPeerSelect, 'function');
  const m0 = ctx.buildModel({ sessionKey: 's', world: 'm', map: { totalPosition: 10, peers: [] } }, { route: [] });
  assert.equal(Boolean(m0.peerSelection), false);

  ctx.lastInput = { peerSelection: true, map: { peers: [{ id: 'p1', mascot: 1, name:'Private Alice' }] } };
  ctx.selectPeer('p99');
  assert.equal(sent.length, 0);
  ctx.lastInput.peerSelection = false;
  ctx.selectPeer('p1');
  assert.equal(sent.length, 0);
  ctx.lastInput.peerSelection = true;
  ctx.selectPeer('p1');
  assert.deepEqual(sent, [{ type: 'lesson-map:peer', payload: { peerId: 'p1' } }]);

  ctx.lastInput.map.peers.push({ id: 'p2', mascot: 2 });
  ctx.openPeerChooser(['p1', 'p2', 'p1', 'stale']);
  assert.equal(dlg.open, true);
  const walk = n => [n, ...n.children.flatMap(walk)];
  const btns = walk(dlg).filter((c) => c.tag === 'button' && c.dataset.peerId);
  assert.equal(btns.length, 2);
  assert.ok(btns.every(b => !String(b.textContent || '').includes('Private Alice')));
  click(btns[1]);
  assert.equal(sent.at(-1)?.payload?.peerId, 'p2');
  assert.equal(dlg.open, false);
  ctx.openPeerChooser(['p1']);
  ctx.closePeerChooser();
  assert.equal(dlg.open, false);
});

test('2D Strategic map: >=44 buttons, select vs focus on click, badge with actual hidden IDs', async () => {
  const source = await read('public/strategic-map.js');
  const calls = []; let frame;
  const host = element();
  host.clientWidth = 800; host.clientHeight = 600;
  const back = element(); const img = element('img'); back.appendChild(img); back.querySelector = () => img;
  const lines = element('canvas'); const units = element(); units.className = 'strategy-units';
  const pins = element(); pins.className = 'strategy-pins';
  host.append(back, lines, pins, units);
  host.querySelector = s => s === '.strategy-backdrop' ? back : s === 'canvas' ? lines : s === '.strategy-units' ? units : pins;
  host.setPointerCapture = noop; host.removeEventListener = noop; host.isConnected = true;
  host.closest = () => {
    const sec = element();
    sec.querySelector = (s) => (s.includes('minimap') ? element('canvas') : element());
    sec.querySelectorAll = () => [];
    return sec;
  };
  const K = {
    clamp: (v) => v, sample: () => [10, 10], at: (p) => p?.to ?? 0, move: (_, pos) => ({ from: pos, to: pos }),
    hash: () => 0, elevation: () => 0,
  };
  const ctx = vm.createContext({
    window: { SignalTerrainCore: K }, document: { createElement: element, addEventListener: noop, removeEventListener: noop, body: { classList: { contains: () => true } } },
    host, Image: class { set src(_) { this.onload?.(); } }, ResizeObserver: class { observe() {} disconnect() {} },
    performance: { now: () => 0 }, requestAnimationFrame: fn => {frame=fn;return 1;}, cancelAnimationFrame: noop, devicePixelRatio: 1, matchMedia: () => ({ matches: true }),
  });
  vm.runInContext(source, ctx);

  const peers = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, mascot: i, position: 1, own: i === 4 }));
  const model = {
    key: 'k1', image: 'i.png', route: Array.from({length:33},(_,i)=>[i,i]), peers, mathCells: [], places: [],
    peerSelection: true, onPeerSelect: (id) => calls.push(['select', id]),
    openPeerChooser: (ids) => calls.push(['chooser', ids]),
    sprite: () => '', phase: () => '', focus: null, own: 'p4', now: 0,
  };
  const ctrl = ctx.window.SignalTerrain.mount(host, model);
  frame(100);
  const unitLayer = units;
  const btn0 = unitLayer.children[0];
  assert.ok(parseInt(btn0.style.minWidth || '0') >= 44 && parseInt(btn0.style.minHeight || '0') >= 44);

  click(btn0);
  assert.deepEqual(calls.shift(), ['select', 'p0']);
  const press = {pointerId:1, clientX:0,clientY:0,button:0,target:btn0,type:'pointerdown'};
  host.emit('pointerdown',press); host.emit('pointermove',{...press,clientX:20,type:'pointermove'}); host.emit('pointerup',{...press,clientX:20,type:'pointerup'});
  btn0.onclick({detail:1,preventDefault:noop,stopPropagation:noop}); assert.equal(calls.length,0);
  host.emit('pointerdown',press); host.emit('pointerdown',{...press,pointerId:2}); host.emit('pointerup',{...press,type:'pointerup'}); host.emit('pointerup',{...press,pointerId:2,type:'pointerup'});
  btn0.onclick({detail:1,preventDefault:noop,stopPropagation:noop}); assert.equal(calls.length,0);
  btn0.onclick({detail:0,preventDefault:noop,stopPropagation:noop}); assert.deepEqual(calls.shift(),['select','p0']);

  const badge = unitLayer.children.find(c => c.dataset.peerIds);
  assert.ok(badge, 'badge exists');
  badge.focus();
  ctrl.update({...model}); frame(200);
  assert.equal(unitLayer.children.find(c=>c.dataset.peerIds),badge,'poll retains the same badge DOM node');
  assert.equal(badge.focused,true,'poll retains badge keyboard focus');
  click(badge,{detail:0});
  assert.deepEqual(plain(calls.shift()), ['chooser', ['p5']]);

  ctrl.update({ ...model, peerSelection: false });
  click(btn0);
  assert.equal(calls.length, 0);
  ctrl.destroy();
});

test('3D map: >=44 hit buttons, retained for modeled owl, hidden aggregated, drag suppression & disposal', async () => {
  const source = await read('public/map3d.js');
  const calls = [];
  const interactiveLayer = element(); const peerLayer = element();
  const vector = () => new Vector3();
  const camera = {
    position: vector(), fov: 60, matrixWorld: new Matrix4(), matrixWorldInverse: new Matrix4(),
    projectionMatrix: new Matrix4().makeScale(0.01, 0.01, 0.01), updateMatrixWorld: noop,
  };
  const ctx = vm.createContext({
    THREE: {
      Vector3, Matrix4, Group: class { constructor() { this.position = vector(); this.userData = {}; } add() {} traverse() {} },
      Mesh: class { constructor() { this.position = vector(); this.scale = vector(); this.rotation={}; this.userData = {}; } },
      RingGeometry: class {}, CircleGeometry: class {}, MeshBasicMaterial: class {},
    },
    camera, scene: { add: noop, remove: noop }, host: { clientWidth: 800, clientHeight: 600 }, interactiveLayer, peerLayer,
    mascotLayer:element(), document: { createElement: element }, path: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    peers: new Map(), labels: [], badges: [], crowdStats: {}, plaques: [], tmp: vector(),
    orbit: { shown: { yaw: 0 }, yaw: 0, pitch: 0, dist: 10 }, quality: { level: 'high' },
    owlLayer: { sync: (cands) => new Set(cands.map((c) => c.entry)), drop: noop },
    makeMascot: () => element(), makeArrow: () => element(), makeLabel: () => element(),
    shadowGeo: {}, shadowMat: {}, standAt: e => e.group.position.set(0,0,-10), assignSlots: noop,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, k) => a + (b - a) * k,
    roadY: () => 0, heightAt: () => 0, state: { dirty: true, destroyed:false }, stationLabels: new Map(),
    model: {
      peerSelection: true, onPeerSelect: (id) => calls.push(['select', id]),
      openPeerChooser: (ids) => calls.push(['chooser', ids]),
    },
    pointers: new Map(), gesture: null, peerPointers:new Map(), blockPeerClick:false, syncStations:noop, dieHint:{visible:false}, dieBubble:{visible:false}, hintEl:element(), bubbleEl:element(),
  });
  vm.runInContext(['labelPoint', 'viewPoint'].map((n) => sourceNode(source, n, true)).join('\n') + '\n' + 
    ['onPeerPointerDown','onPeerPointerMove','onPeerPointerEnd','onPeerPointerCancel','badgeAt', 'makePeer', 'makePeerTarget', 'disposePeer', 'syncPeers', 'placeLabels'].map((n) => sourceNode(source, n)).join('\n'), ctx);

  ctx.model.peers = [{ id: 'p1', mascot: 1, position: 0 }, { id: 'p2', mascot: 2, position: 0 }]; ctx.syncPeers(ctx.model);
  ctx.placeLabels(100);
  const targets = peerLayer.children.filter((c) => c.dataset?.peerId);
  assert.ok(targets.length >= 1);
  const t1 = targets[0];
  assert.ok(parseInt(t1.style.minWidth || t1.style.width || '0') >= 44);

  click(t1);
  assert.deepEqual(calls.shift(), ['select', t1.dataset.peerId]);

  ctx.onPeerPointerDown({pointerId:1,clientX:0,clientY:0}); ctx.onPeerPointerMove({pointerId:1,clientX:20,clientY:0}); ctx.onPeerPointerEnd({pointerId:1});
  click(t1);
  assert.equal(calls.length, 0);
  ctx.onPeerPointerDown({pointerId:1,clientX:0,clientY:0}); ctx.onPeerPointerDown({pointerId:2,clientX:0,clientY:0}); ctx.onPeerPointerEnd({pointerId:1}); ctx.onPeerPointerEnd({pointerId:2});
  t1.onclick({detail:1,preventDefault:noop,stopPropagation:noop});assert.equal(calls.length,0);
  t1.onclick({detail:0,preventDefault:noop,stopPropagation:noop});assert.deepEqual(calls.shift(),['select',t1.dataset.peerId]);
  const aggregate=peerLayer.children.find(el=>el.dataset.peerIds); assert.deepEqual(plain(JSON.parse(aggregate.dataset.peerIds)),['p2']);
  aggregate.onclick({detail:0,preventDefault:noop,stopPropagation:noop});assert.deepEqual(plain(calls.shift()),['chooser',['p2']]);
  assert.equal(t1.style.display,''); assert.equal(ctx.peers.get('p1').mascotEl.style.display,'none');

  ctx.model.peers = Array.from({length:6},(_,i)=>({id:'p'+(i+1),mascot:i,position:0})); ctx.syncPeers(ctx.model);
  ctx.camera.projectionMatrix.makeScale(0.01,0.01,0.001);
  for(const [id,entry] of ctx.peers) entry.group.position.set((Math.floor((Number(id.slice(1))-1)/2)-1)*60,0,-100);
  ctx.placeLabels(150);
  const teacherBadges=peerLayer.children.filter(el=>el.dataset.peerIds && el.style.display!=='none');
  assert.equal(teacherBadges.length,1,'teacher gets one aggregate chooser instead of overlapping per-cluster buttons');
  const hiddenIds=[...ctx.peers].filter(([,entry])=>entry.targetEl.style.display==='none').map(([id])=>id).sort();
  assert.deepEqual(plain(JSON.parse(teacherBadges[0].dataset.peerIds)).sort(),hiddenIds,'chooser contains all actual hidden IDs, excludes visible peers');
  assert.equal(teacherBadges[0].style.bottom,'12px'); assert.equal(teacherBadges[0].style.left,'50%');

  ctx.model.peers = [{ id: 'p2', mascot: 2, position: 0 }]; ctx.syncPeers(ctx.model);
  assert.equal(peerLayer.children.some((c) => c.dataset?.peerId === 'p1'), false);
});

test('3D peer hit targets keep camera drag and pinch; controls do not start gestures', async () => {
  const source = await read('public/map3d.js');
  const file = ts.createSourceFile('map3d.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const registrations = [], declarations = [], touchStyles = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && /^onCamera/.test(node.name.getText(file))) declarations.push(`var ${node.getText(file)};`);
    if (ts.isBinaryExpression(node) && node.left.getText(file).startsWith('peerLayer.style.')) touchStyles.push(node.getText(file));
    if (ts.isCallExpression(node) && node.expression.getText(file).match(/^(host|canvas)\.addEventListener$/) && /^pointer(down|move|up|cancel)$/.test(node.arguments[0]?.text)) registrations.push(node.getText(file));
    ts.forEachChild(node, visit);
  }
  visit(file);
  const host = element(), canvas = element('canvas'), peerLayer = element(), target = element('button');
  vm.runInNewContext(touchStyles.join(';\n'), {peerLayer});
  assert.ok(peerLayer.style.touchAction === 'none' || /touch-action\s*:\s*none/.test(peerLayer.style.cssText || ''), 'peer overlay must own touch gestures instead of native scrolling');
  peerLayer.append(target); peerLayer.contains = node => node === target;
  canvas.setPointerCapture = target.setPointerCapture = noop;
  const context = vm.createContext({host,canvas,peerLayer,peerPointers:new Map(),blockPeerClick:false,pointers:new Map(),gesture:null,orbit:{yaw:0,pitch:0.8,dist:10},state:{drag:'orbit'},MIN_DIST:1,MAX_DIST:100,PITCH_MIN:0.1,PITCH_MAX:1.5,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),panBy:noop,options:{},dice:{mode:'idle',canRoll:false}});
  vm.runInContext(['onPeerPointerDown','onPeerPointerMove','onPeerPointerEnd','onPeerPointerCancel'].map(n=>sourceNode(source,n)).join('\n') + '\n' + declarations.join('\n') + '\n' + sourceNode(source,'release',true) + '\n' + registrations.join(';\n'),context);
  const emit = (type, fields) => {
    const event = {type, target, pointerId:1, clientX:0, clientY:0, button:0, ...fields};
    if(event.target===canvas) canvas.emit(type,event);
    host.emit(type,event);
  };
  emit('pointerdown'); emit('pointermove',{clientX:20}); emit('pointerup',{clientX:20});
  assert.notEqual(context.orbit.yaw,0,'drag on the peer button must orbit the camera');
  assert.equal(context.blockPeerClick,true);
  const yaw = context.orbit.yaw;
  emit('pointerdown',{target:element('button')}); emit('pointermove',{clientX:30}); emit('pointerup');
  assert.equal(context.orbit.yaw,yaw,'unrelated controls must not capture camera gestures');
  emit('pointerdown',{pointerId:1}); emit('pointerdown',{pointerId:2,clientX:20});
  emit('pointermove',{pointerId:2,clientX:40}); emit('pointerup',{pointerId:1}); emit('pointerup',{pointerId:2});
  assert.ok(context.orbit.dist<10,'pinch on peer buttons must zoom');
  assert.equal(context.blockPeerClick,true);
});
