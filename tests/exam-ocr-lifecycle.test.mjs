import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as parse from '../lib/exam/parse.js';
import * as keys from '../lib/exam/answer-key.js';
import { createOcr } from '../lib/exam/ocr-worker.js';

// ponytail: hook state/event harness; actual mounting/effect cleanup stays in browser QA.
function component(name, loadPdf) {
  const slots = []; let index = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const at = index++;
      if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial;
      return [slots[at], value => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }];
    },
    useRef(initial) { const at = index++; return slots[at] ||= { current: initial }; },
    useEffect() { index++; },
  };
  const modules = {
    react: React, '../lesson/MathText': { default: 'MathText' },
    '../../lib/exam/parse.js': parse, '../../lib/exam/answer-key.js': keys,
    './client': { messageFor: error => error.message }, './pdf-import': { loadPdf },
    './KeyEditor': { KeyEditor: 'KeyEditor', QuestionItemsEditor: 'QuestionItemsEditor', SolutionEditor: 'SolutionEditor', keyReady: () => true },
    './VariantEditor': { AntiCheatingSettings: 'AntiCheatingSettings', CodeTabs: 'CodeTabs' },
    './GuideImport': { GuideImport: 'GuideImport' },
  };
  const source = readFileSync(new URL(`../components/exam/${name}.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: id => { assert.ok(id in modules, id); return modules[id]; }, AbortController, DOMException, crypto: globalThis.crypto });
  const props = { onCreated() {}, onCancel() {}, onApply() {}, questions: [{ id: '101_q1', section: 'I', label: 'Câu 1', type: 'mc', points: 1, key: 'A' }] };
  return () => { index = 0; return exports[name](props); };
}

function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
}
const button = (tree, text) => nodes(tree).find(node => node.type === 'button' && node.props.children.includes(text));
const flush = () => new Promise(setImmediate);
const file = { name: 'scan.png', size: 1 };
function select(tree) { nodes(tree).find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [file], value: 'file' } }); }
function document(guide, image = 'prior-image') {
  const text = guide ? ['PHẦN I', 'Câu 1: A', 'Lời giải: x² = 9'] : ['PHẦN I. Trắc nghiệm', 'Câu 1. Tính x² = 9.', 'A. 1 B. 2 C. 3 D. 4'];
  return {
    lines: text.map((text, i) => ({ text, page: 1, x: 10, top: 10 + i * 20, bottom: 18 + i * 20 })),
    pages: [{ width: 100, height: 100 }], ocrPages: [1], destroyed: 0, crops: 0,
    destroy() { this.destroyed++; }, async crop() { this.crops++; return image; },
  };
}
function review(tree, guide) {
  return guide ? nodes(tree).find(node => node.type === 'SolutionEditor').props.q.solutionUploads[0].data : nodes(tree).find(node => node.type === 'img').props.src;
}

for (const guide of [false, true]) {
  const name = guide ? 'GuideImport' : 'ExamImport';
  const replace = tree => guide ? select(tree) : nodes(tree).find(node => node.type === 'CodeTabs').props.onImport('101', file);

  test(`${name} cancels replacement without losing prior PDF or staged review`, async () => {
    const prior = document(guide); const candidate = document(guide, 'new-image'); let finish; let count = 0;
    const render = component(name, async () => count++ ? new Promise(resolve => { finish = resolve; }) : prior);
    select(render()); await flush(); const image = review(render(), guide);
    replace(render()); await flush();
    button(render(), guide ? 'Hủy đọc hướng dẫn chấm' : 'Hủy đọc đề').props.onClick();
    finish(candidate); await flush();
    assert.equal(prior.destroyed, 0); assert.equal(candidate.destroyed, 1);
    assert.equal(review(render(), guide), image);
    const before = prior.crops;
    button(render(), guide ? 'Cắt ảnh lời giải' : 'Thêm phía trên').props.onClick(); await flush();
    assert.equal(prior.crops, before + 1);
  });

  test(`${name} rejects an empty OCR crop while retaining prior PDF and staged review`, async () => {
    const prior = document(guide); const candidate = document(guide, ''); let count = 0;
    const render = component(name, async () => count++ ? candidate : prior);
    select(render()); await flush(); const image = review(render(), guide);
    replace(render()); await flush();
    assert.equal(prior.destroyed, 0); assert.equal(candidate.destroyed, 1);
    assert.equal(review(render(), guide), image);
    const error = nodes(render()).find(node => node.props.role === 'alert');
    assert.match(error.props.children.join(''), guide ? /Ảnh lời giải scan quá lớn/ : /Không tạo được ảnh câu scan/);
  });
}

test('initialization worker errors remain failures rather than user cancellation', async () => {
  class ErrorWorker { postMessage() { queueMicrotask(() => this.onerror()); } terminate() {} }
  const ocr = createOcr({ WorkerCtor: ErrorWorker, origin: 'https://game.test' });
  await assert.rejects(ocr.recognize(new Uint8Array([1])), error => error.name !== 'AbortError' && /Chưa đọc được đề scan/.test(error.message));
});

test('cancellation rejects immediately while worker initialization is still pending', async () => {
  class PendingWorker { static dead=false; postMessage() {} terminate() { PendingWorker.dead = true; } }
  const controller = new AbortController();
  const ocr = createOcr({ WorkerCtor: PendingWorker, origin: 'https://game.test', signal: controller.signal });
  const pending = ocr.recognize(new Uint8Array([1])); controller.abort();
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(PendingWorker.dead, true);
});
