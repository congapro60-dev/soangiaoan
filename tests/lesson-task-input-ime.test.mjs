import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

const source = await readFile(new URL('../components/lesson/TaskInput.tsx', import.meta.url), 'utf8');

test('Vietnamese composition keeps local text during pending hydration and saves the finished word', () => {
  const hooks = [], effects = [], timers = new Map(), saved = [];
  let cursor = 0, timerId = 0;
  const mockReact = { ...React,
    useId() { cursor++; return "ime-input"; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
    useEffect(callback) { cursor++; effects.push(callback); },
  };
  const setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
  const componentModule = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: componentModule.exports, module: componentModule, require: name => name === 'react' ? mockReact : { default: () => null, __esModule: true }, window: { setTimeout, clearTimeout: id => timers.delete(id) }, setTimeout, clearTimeout: id => timers.delete(id) });
  const props = { task: { id: 'q', type: 'open' }, initialDraft: 'nháp máy chủ', onSaveDraft: value => saved.push(value) };
  const render = () => { cursor = 0; effects.length = 0; return componentModule.exports.TaskInput(props); };
  const find = node => { if (!node || typeof node !== 'object') return null; if (node.type === 'textarea') return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child); if (found) return found; } return null; };
  const runTimers = () => { for (const [id, timer] of [...timers]) { timers.delete(id); timer.fn(); } };
  const input = find(render());
  for (const effect of effects) effect();
  input.props.onCompositionStart();
  input.props.onChange({ target: { value: 'day' } });
  runTimers();
  assert.equal(find(render()).props.value, 'day');
  assert.deepEqual(saved, [], 'partial IME text is not autosaved');
  input.props.onCompositionEnd({ currentTarget: { value: 'dãy' } });
  runTimers();
  assert.equal(find(render()).props.value, 'dãy');
  assert.deepEqual(saved, ['dãy']);
});
