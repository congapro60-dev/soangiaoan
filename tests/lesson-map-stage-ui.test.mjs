import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

async function load(file, imports = {}) {
  const source = await readFile(new URL(`../components/lesson/${file}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    window: { matchMedia: () => ({ matches: false }) },
    document: { getElementById: () => null },
    require(name) {
      if (name === 'react') return { ...React, default: React };
      for (const [suffix, mod] of Object.entries(imports)) if (name.endsWith(suffix)) return mod;
      throw new Error(`Unexpected import in ${file}: ${name}`);
    },
  });
  return exports;
}

const worldMap = { LessonWorldMap: ({ map }) => React.createElement('div', { className: 'mock-map' }, `peers:${map.peers.length}`), __esModule: true };
const { LessonMapStage } = await load('LessonMapStage.tsx', { '/LessonWorldMap': worldMap });
const { LessonMascotPicker } = await load('LessonMascotPicker.tsx');
const { LessonEncounterSheet } = await load('LessonEncounterSheet.tsx');

const baseMap = (position, extra = {}) => ({
  totalPosition: 72,
  gatePosition: 16,
  unitsPerActivity: 8,
  peers: [{ id: 'm0', mascot: 1, position, own: true, chosen: true, name: 'An' }, { id: 'm1', mascot: 3, position: 5, name: 'Bình' }],
  ...extra,
});

const render = (props) => renderToStaticMarkup(React.createElement(LessonMapStage, { sessionKey: 's', rolls: 2, disabled: false, taskElementId: 'task', onRoll: () => ({ ok: true, die: 3 }), ...props }));

test('map stage: a pupil far from the gate gets a roll button and the distance to the gate', () => {
  const html = render({ map: baseMap(10) });
  assert.match(html, /lesson-roll-fab/);
  assert.match(html, /Lắc xúc xắc/);
  assert.doesNotMatch(html, /lesson-roll-fab"[^>]*disabled/);
  assert.match(html, /Cổng <strong>2<\/strong>\/9/);
  assert.match(html, /Còn 6 bước/);
});

test('map stage: at the gate the roll is closed and the pupil is sent to the task', () => {
  const html = render({ map: baseMap(16) });
  assert.match(html, /Đã tới cổng/);
  assert.match(html, /lesson-roll-fab"[^>]*disabled/);
});

test('map stage: at the gate the one main button becomes "do the task" when the page can open it', () => {
  const html = render({ map: baseMap(16), onOpenTask: () => {} });
  assert.match(html, /Làm nhiệm vụ/);
  assert.doesNotMatch(html, /lesson-roll-fab[^>]*disabled/);
  assert.match(html, /lesson-roll-fab-task/);
});

test('map stage: a paused or locked room disables the roll', () => {
  assert.match(render({ map: baseMap(4), disabled: true }), /lesson-roll-fab"[^>]*disabled/);
});

test('map stage: dice are explained as movement only, never as the learning result', () => {
  assert.match(render({ map: baseMap(4) }), /Xúc xắc chỉ giúp linh vật di chuyển; kết quả học tập do bài làm của em quyết định\./);
});

test('map stage: the TV and teacher views (no own marker) show the map without any dice controls', () => {
  const html = render({ map: { totalPosition: 72, gatePosition: 16, unitsPerActivity: 8, peers: [{ id: 'm0', mascot: 0, position: 3 }] } });
  assert.match(html, /mock-map/);
  assert.doesNotMatch(html, /lesson-roll-fab/);
  assert.doesNotMatch(html, /lesson-map-hud/);
});

test('map stage: without a map nothing is drawn', () => {
  assert.equal(render({ map: null }), '');
});

test('mascot picker: until a mascot is chosen all eight are offered', () => {
  const names = ['Cáo', 'Cú', 'Mèo', 'Gấu trúc', 'Thỏ', 'Ếch', 'Robot', 'Rồng'];
  const html = renderToStaticMarkup(React.createElement(LessonMascotPicker, { spriteImage: '/assets/mascots.png', mascots: names, current: 0, chosen: false, onChoose: () => ({ ok: true }) }));
  assert.match(html, /Chọn linh vật của em/);
  assert.equal((html.match(/lesson-mascot-option/g) || []).length, 8);
  for (const name of names) assert.match(html, new RegExp(name));
  assert.match(html, /url\((?:'|&#x27;)\/assets\/mascots\.png(?:'|&#x27;)\)/);
  assert.doesNotMatch(html, /assets\/\/assets/);
});

test('mascot picker: once chosen it folds into a bar showing the chosen mascot', () => {
  const names = ['Cáo', 'Cú', 'Mèo', 'Gấu trúc', 'Thỏ', 'Ếch', 'Robot', 'Rồng'];
  const html = renderToStaticMarkup(React.createElement(LessonMascotPicker, { spriteImage: 'mascots.png', mascots: names, current: 3, chosen: true, onChoose: () => ({ ok: true }) }));
  assert.match(html, /Linh vật của em: <strong>Gấu trúc<\/strong>/);
  assert.match(html, /Đổi linh vật/);
  assert.equal((html.match(/lesson-mascot-option/g) || []).length, 0);
  assert.match(html, /url\((?:'|&#x27;)\/assets\/mascots\.png(?:'|&#x27;)\)/);
});

test('mascot picker: once the lesson has started the chosen mascot shows a lock instead of a change button', () => {
  const names = ['Cáo', 'Cú', 'Mèo', 'Gấu trúc', 'Thỏ', 'Ếch', 'Robot', 'Rồng'];
  const html = renderToStaticMarkup(React.createElement(LessonMascotPicker, { spriteImage: 'mascots.png', mascots: names, current: 7, chosen: true, locked: true, onChoose: () => ({ ok: true }) }));
  assert.match(html, /Đã khóa khi tiết học bắt đầu/);
  assert.doesNotMatch(html, /Đổi linh vật/);
});

test('encounter sheet: closed it is hidden from everyone but keeps its content, so a half-typed answer survives', () => {
  const html = renderToStaticMarkup(React.createElement(LessonEncounterSheet, { open: false, title: 'Nhiệm vụ của cổng', onClose: () => {} }, React.createElement('textarea', { defaultValue: 'đang gõ dở' })));
  assert.match(html, /data-open="false"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /đang gõ dở/);
});

test('encounter sheet: open it is a modal dialog with a title and a way back to the map', () => {
  const html = renderToStaticMarkup(React.createElement(LessonEncounterSheet, { open: true, title: 'Nhiệm vụ của cổng', kicker: 'PHA: EXPERIENCE', onClose: () => {} }, React.createElement('p', null, 'nội dung')));
  assert.match(html, /data-open="true"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Nhiệm vụ của cổng/);
  assert.match(html, /Xem bản đồ/);
});

test('map stage forwards eligible gate selection to the shared 2D/3D frame',async()=>{
 let received; const {LessonMapStage:Stage}=await load('LessonMapStage.tsx',{'/LessonWorldMap':{LessonWorldMap:props=>{received=props;return null;}}});
 const callback=()=>{};
 renderToStaticMarkup(React.createElement(Stage,{sessionKey:'s',map:baseMap(10),disabled:false,onRoll:()=>({ok:true}),onGateSelect:callback}));
 assert.equal(received.onGateSelect,callback);
 renderToStaticMarkup(React.createElement(Stage,{sessionKey:'s',map:baseMap(10),disabled:true,onRoll:()=>({ok:true}),onGateSelect:callback}));
 assert.equal(received.onGateSelect,undefined);
});
