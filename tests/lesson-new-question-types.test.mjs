import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHECKER_REGISTRY } from '../lib/lesson/schema.js';

const items = [{ id: 'a', label: 'Thu thập dữ kiện' }, { id: 'b', label: 'Tính kết quả' }, { id: 'c', label: 'Kiểm tra kết quả' }];
const categories = [{ id: 'finite', label: 'Hữu hạn' }, { id: 'infinite', label: 'Vô hạn' }];
const ordering = { id: 'order-task', type: 'closed', inputSchema: { items }, evaluation: { checkerId: 'ordering_exact', answerKey: ['a', 'b', 'c'] } };
const classification = { id: 'classify-task', type: 'closed', inputSchema: { items, categories }, evaluation: { checkerId: 'classification_exact', answerKey: { a: 'finite', b: 'infinite', c: 'finite' } } };

test('ordering requires every known ID exactly once in the assessed order', () => {
  const checker = CHECKER_REGISTRY.ordering_exact;
  assert.equal(typeof checker, 'function');
  assert.deepEqual(checker(['a', 'b', 'c'], ordering), { ok: true });
  for (const input of [undefined, 'a,b,c', [], ['a', 'b'], ['a', 'b', 'b'], ['a', 'b', 'c', 'd'], ['a', 'c', 'b'], ['a', 'b', 3], ['a', 'b', 'unknown']]) assert.equal(checker(input, ordering).ok, false);
  for (const answerKey of [undefined, [], ['a', 'b', 'b'], ['a', 'b'], ['a', 'b', 'unknown']]) assert.equal(checker(['a', 'b', 'c'], { ...ordering, evaluation: { ...ordering.evaluation, answerKey } }).ok, false);
  assert.equal(checker(['a', 'b', 'c'], { ...ordering, inputSchema: { items: [...items, { id: 'a', label: 'duplicate' }] } }).ok, false);
  assert.equal(checker(['a', , 'c'], ordering).ok, false, 'sparse array is not a complete permutation');
  assert.equal(checker(['a', 'b', 'c'], { ...ordering, inputSchema: { items: [items[0], , items[2]] } }).ok, false);
});

test('classification requires exact item domain and known categories, repeated categories are valid', () => {
  const checker = CHECKER_REGISTRY.classification_exact;
  assert.equal(typeof checker, 'function');
  assert.deepEqual(checker({ c: 'finite', a: 'finite', b: 'infinite' }, classification), { ok: true });
  for (const input of [undefined, [], 'finite', {}, { a: 'finite', b: 'infinite' }, { a: 'finite', b: 'infinite', c: 'finite', d: 'finite' }, { a: 'finite', b: 'unknown', c: 'finite' }, { a: 'finite', b: 'finite', c: 'finite' }, { a: 'finite', b: 1, c: 'finite' }]) assert.equal(checker(input, classification).ok, false);
  for (const answerKey of [undefined, {}, { a: 'finite', b: 'infinite' }, { a: 'finite', b: 'unknown', c: 'finite' }]) assert.equal(checker(classification.evaluation.answerKey, { ...classification, evaluation: { ...classification.evaluation, answerKey } }).ok, false);
  for (const inputSchema of [{ items: [], categories }, { items, categories: [] }, { items: [...items, items[0]], categories }, { items, categories: [...categories, categories[0]] }]) assert.equal(checker(classification.evaluation.answerKey, { ...classification, inputSchema }).ok, false);
});

const source = await readFile(new URL('../components/lesson/TaskInput.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
function editor(task, extras = {}) {
  const hooks = [], timers = new Map(), saved = [], submitted = [];
  let cursor = 0, serial = 0;
  const mockReact = { ...React,
    useId() { cursor++; return 'question-input'; },
    useState(initial) { const at = cursor++; if (!(at in hooks)) hooks[at] = typeof initial === 'function' ? initial() : initial; return [hooks[at], value => { hooks[at] = typeof value === 'function' ? value(hooks[at]) : value; }]; },
    useRef(initial) { const at = cursor++; return hooks[at] ||= { current: initial }; },
    useEffect(effect, dependencies) { const at = cursor++, previous = hooks[at]; if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) { previous?.cleanup?.(); hooks[at] = { dependencies, cleanup: effect() }; } }
  };
  const schedule = callback => { const id = ++serial; timers.set(id, callback); return id; };
  const component = { exports: {} };
  vm.runInNewContext(code, { module: component, exports: component.exports,
    require: name => name === 'react' ? mockReact : { default: props => React.createElement('span', null, props.text), __esModule: true },
    setTimeout: schedule, clearTimeout: id => timers.delete(id), window: { setTimeout: schedule, clearTimeout: id => timers.delete(id) } });
  const publicTask = structuredClone(task); delete publicTask.evaluation.answerKey;
  const props = { task: publicTask, onSaveDraft: value => saved.push(value), onSubmit: value => submitted.push(value), ...extras };
  return { saved, submitted, props, render() { cursor = 0; return component.exports.TaskInput(props); }, flush() { for (const [id, run] of [...timers]) { timers.delete(id); run(); } } };
}
function find(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (predicate(node)) found.push(node);
  for (const child of React.Children.toArray(node.props?.children)) find(child, predicate, found);
  return found;
}

test('ordering native buttons change saved/submitted ID order without revealing answers', async () => {
  const ui = editor(ordering, { initialDraft: ['c', 'a', 'b'] });
  let tree = ui.render();
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Sắp xếp/);
  assert.doesNotMatch(html, /Đáp án chuẩn|answerKey|textarea/);
  assert.equal(find(tree, node => node.type === 'button' && node.props['aria-label']?.includes('lên'))[0].props.disabled, true);
  const downs = find(tree, node => node.type === 'button' && node.props['aria-label']?.includes('xuống'));
  assert.equal(downs.at(-1).props.disabled, true);
  downs[0].props.onClick();
  tree = ui.render(); ui.flush();
  assert.deepEqual(Array.from(ui.saved.at(-1)), ['a', 'c', 'b']);
  await find(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(Array.from(ui.submitted.at(-1)), ['a', 'c', 'b']);
  ui.props.disabled = true;
  assert.ok(find(ui.render(), node => node.type === 'button').every(node => node.props.disabled));
});

test('classification labelled selectors require all categories and save selected item mapping', async () => {
  const ui = editor(classification);
  let tree = ui.render();
  assert.equal(find(tree, node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, true);
  const selects = find(tree, node => node.type === 'select');
  assert.equal(selects.length, 3);
  assert.equal(find(tree, node => node.type === 'label' && node.props.htmlFor).length, 3);
  for (let i = 0; i < items.length; i++) {
    find(ui.render(), node => node.type === 'select')[i].props.onChange({ target: { value: i === 1 ? 'infinite' : 'finite' } });
  }
  tree = ui.render(); ui.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.saved.at(-1))), classification.evaluation.answerKey);
  assert.equal(find(tree, node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, false);
  await find(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(ui.submitted.at(-1))), classification.evaluation.answerKey);
  const html = renderToStaticMarkup(tree);
  assert.doesNotMatch(html, /Đáp án chuẩn|answerKey|textarea/);
  ui.props.disabled = true;
  assert.ok(find(ui.render(), node => node.type === 'select').every(node => node.props.disabled));
});

test('generic matching instruction supports subjects beyond formula representation', () => {
  const task = { id: 'match', type: 'closed', inputSchema: { representations: items, cards: categories }, evaluation: { checkerId: 'representation_match' } };
  assert.match(renderToStaticMarkup(editor(task).render()), /Ghép mỗi mục với thẻ phù hợp/);
});

test('teacher ordering editor changes the keyed order independently of initial item order',async()=>{
 const source=await readFile(new URL('../components/lesson/StructuredQuestionEditor.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const out={exports:{}};vm.runInNewContext(code,{module:out,exports:out.exports,crypto:globalThis.crypto,require:()=>React});let changed;
 const task=structuredClone(ordering),tree=out.exports.StructuredQuestionEditor({task,onChange:(schema,answerKey)=>{changed={schema,answerKey};}});
 const up=find(tree,node=>node.type==='button'&&node.props['aria-label']==='Đưa thẻ 2 lên')[0];up.props.onClick();
 assert.deepEqual(JSON.parse(JSON.stringify(changed.answerKey)),['b','a','c']);assert.deepEqual(JSON.parse(JSON.stringify(changed.schema.items)),items);
 assert.equal(CHECKER_REGISTRY.ordering_exact(['b','a','c'],{...task,inputSchema:changed.schema,evaluation:{...task.evaluation,answerKey:changed.answerKey}}).ok,true);
});

test('failed group contribution keeps private thought text and shows a recoverable error',async()=>{
 const ui=editor(classification,{isGroupMode:true,onGroupContribute:async()=>{throw Error('OFFLINE');}});
 let tree=ui.render();find(tree,node=>node.type==='textarea')[0].props.onChange({target:{value:'Ý tưởng của riêng em'}});tree=ui.render();
 await find(tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});
 tree=ui.render();assert.equal(find(tree,node=>node.type==='textarea')[0].props.value,'Ý tưởng của riêng em');assert.match(renderToStaticMarkup(tree),/Chưa gửi được ý kiến/);
});

test('shared private thought restores independently of the group classification answer editor',()=>{
 const ui=editor(classification,{isGroupMode:true,initialDraft:{thought:'Nháp riêng trước thảo luận'}});let tree=ui.render();
 assert.equal(find(tree,node=>node.type==='textarea')[0].props.value,'Nháp riêng trước thảo luận');
 find(tree,node=>node.type==='button'&&node.props.role==='tab')[1].props.onClick();tree=ui.render();
 const selectors=find(tree,node=>node.type==='select');assert.equal(selectors.length,3);assert.ok(selectors.every(node=>!node.props.value));
});

test('late private thought restores without overwriting unsent text and clears for another task',()=>{
 const ui=editor(classification,{isGroupMode:true});ui.render();ui.flush();
 ui.props.initialDraft={thought:'Nháp tải muộn'};ui.render();ui.flush();let tree=ui.render();
 assert.equal(find(tree,node=>node.type==='textarea')[0].props.value,'Nháp tải muộn');
 find(tree,node=>node.type==='textarea')[0].props.onChange({target:{value:'Ý mới chưa gửi'}});
 ui.props.initialDraft={thought:'Nháp máy chủ cũ'};ui.render();ui.flush();tree=ui.render();
 assert.equal(find(tree,node=>node.type==='textarea')[0].props.value,'Ý mới chưa gửi');
 ui.props.task={...ui.props.task,id:'another-task'};ui.props.initialDraft=null;ui.render();ui.flush();tree=ui.render();
 assert.equal(find(tree,node=>node.type==='textarea')[0].props.value,'');
});

test('TaskInput renders Desmos geometry buttons, hand-drawn photo tools and diagram scaffolding', () => {
  const openTask = {
    id: 'open-geometry-task',
    type: 'open',
    prompt: 'Vẽ hình và chứng minh',
    diagramUrl: 'https://example.com/diagram.png',
    advertisedHints: [{ id: 'h1', tier: 'H1', opened: true, text: 'Gợi ý tầng 1', diagramUrl: 'https://example.com/hint-diagram.png' }],
    evaluation: { rubric: { criteria: ['Vẽ đúng thiết diện'] } }
  };
  const ui = editor(openTask);
  let tree = ui.render();
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Desmos Hình học/);
  assert.match(html, /Desmos Đồ thị/);
  assert.match(html, /Tải ảnh vẽ tay/);
  assert.match(html, /https:\/\/example.com\/diagram.png/);
  assert.match(html, /https:\/\/example.com\/hint-diagram.png/);
});
