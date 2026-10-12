import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../components/lesson/ContentScopePicker.tsx', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const catalogue = { uncertainties: ['SOURCE_YEAR_CONFLICT'], lessons: [
  { id: 'seq', title: 'Dãy số', chapter:1, packageId: 'pilot', sections: [{ id: 's1', title: 'Nhận biết dãy số', objectiveCodes: ['T11.18'] }, { id: 's2', title: 'Bốn cách biểu diễn', objectiveCodes: ['T11.19'] }] },
  { id: 'trig', title: 'Công thức lượng giác', chapter:1, packageId: null, sections: [{ id: 's3', title: 'Công thức cộng', objectiveCodes: [] }] }
] };
function harness(extra = {}) {
  const values = [], refs = [], effects = [], exports = {}; let cursor = 0, refCursor = 0, effectCursor = 0;
  vm.runInNewContext(js, { exports, require(name) {
    assert.equal(name, 'react', 'client component must not import node crypto or server validators');
    return { ...React, default: React, useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; }, useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; }, useEffect(fn, deps) { const i = effectCursor++; if (!effects[i] || deps.some((d, index) => d !== effects[i][index])) { effects[i] = deps; fn(); } } };
  } });
  const calls = [];
  const props = { catalogue, packageId: 'pilot', packageObjectives: [{ id: 'o18', code: 'T11.18', statement: 'Nhận biết' }, { id: 'o19', code: 'T11.19', statement: 'Biểu diễn' }],
    onPreview: async selection => { calls.push(['preview', selection]); return { ok: true, package: { id: 'draft' }, issues: [] }; },
    onSelect: (draft, scope) => calls.push(['select', draft, scope]), onRequestScope: request => calls.push(['ai', request]), ...extra };
  const render = () => { cursor = 0; refCursor = 0; effectCursor = 0; return exports.ContentScopePicker(props); };
  const nodes = (tree = render()) => { const list = []; const visit = item => { if (!item || typeof item !== 'object') return; list.push(item); React.Children.forEach(item.props?.children, visit); }; visit(tree); return list; };
  const find = (predicate) => nodes().find(predicate);
  const click = label => find(n => n.type === 'button' && n.props.children === label).props.onClick();
  const html = () => renderToStaticMarkup(render());
  return { calls, props, render, find, click, html };
}

test('scope picker defaults to whole lesson and warns about draft curriculum and conflicting source years', async () => {
  const h = harness();
  assert.match(h.html(), /Nguồn đang chờ đối soát/);
  assert.match(h.html(), /2026|25–26|năm học/);
  assert.equal(h.find(n => n.type === 'input' && n.props.value === 'whole').props.checked, true);
  await h.click('Dùng toàn bộ bài');
  assert.equal(h.calls[0][1], null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[1])), ['select', { id: 'draft' }, null]);
});

test('partial section checkboxes resolve known objective IDs and select only the previewed draft', async () => {
  const h = harness();
  h.find(n => n.type === 'input' && n.props.value === 'partial').props.onChange();
  const box = h.find(n => n.type === 'input' && n.props.type === 'checkbox' && n.props.value === 's1');
  assert.equal(box.props.checked, false);
  box.props.onChange({ target: { checked: true } });
  assert.equal(h.find(n => n.type === 'input' && n.props.value === 's1').props.checked, true);
  await h.click('Dùng phần đã chọn');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), ['preview', { objectiveIds: ['o18'] }]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[1][2])), { lessonId: 'seq', sectionIds: ['s1'] });
});

test('mixed-objective preview shows a Vietnamese conflict, retains selection and allows retry', async () => {
  const h = harness({ onPreview: async () => ({ ok: false, package: null, issues: [{ code: 'SCOPE_MIXED_OBJECTIVES', taskId: 'mixed-exit', message: 'server English' }] }) });
  h.find(n => n.type === 'input' && n.props.value === 'partial').props.onChange();
  h.find(n => n.type === 'input' && n.props.value === 's1').props.onChange({ target: { checked: true } });
  await h.click('Dùng phần đã chọn');
  assert.match(h.html(), /mục tiêu chưa chọn/);
  assert.match(h.html(), /mixed-exit/);
  assert.doesNotMatch(h.html(), /server English/);
  assert.equal(h.find(n => n.type === 'input' && n.props.value === 's1').props.checked, true);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Dùng phần đã chọn').props.disabled, false);
  assert.equal(h.calls.length, 0);
});

test('PPCT-only scope can request an AI draft without claiming existing objectives', async () => {
  const h = harness();
  h.find(n => n.type === 'input' && n.props.value === 'partial').props.onChange();
  h.find(n => n.type === 'select').props.onChange({ target: { value: 'trig' } });
  h.find(n => n.type === 'input' && n.props.value === 's3').props.onChange({ target: { checked: true } });
  assert.match(h.html(), /chưa đối soát mục tiêu/);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Dùng phần đã chọn').props.disabled, true);
  await h.click('Soạn bản nháp cho phần đã chọn');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), ['ai', { lessonId: 'trig', sectionIds: ['s3'] }]);
});

test('empty scope never calls preview or AI and network failures remain retryable', async () => {
  const h = harness({ onPreview: async () => { throw Error('raw secret'); } });
  h.find(n => n.type === 'input' && n.props.value === 'partial').props.onChange();
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Dùng phần đã chọn').props.disabled, true);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Soạn bản nháp cho phần đã chọn').props.disabled, true);
  h.find(n => n.type === 'input' && n.props.value === 's1').props.onChange({ target: { checked: true } });
  await h.click('Dùng phần đã chọn');
  assert.match(h.html(), /Không kiểm tra được/);
  assert.doesNotMatch(h.html(), /raw secret/);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Dùng phần đã chọn').props.disabled, false);
});

test('a preview returning after the package changed cannot replace the new package', async () => {
  let resolve;
  const h = harness({ onPreview: () => new Promise(r => { resolve = r; }) });
  const pending = h.click('Dùng toàn bộ bài');
  h.props.packageId = 'other'; h.render();
  resolve({ ok: true, package: { id: 'old-draft' }, issues: [] });
  await pending;
  assert.equal(h.calls.length, 0);
});

test('source-backed knowledge checkboxes select a single objective and pass the exact descendant ID', async () => {
  const data = structuredClone(catalogue);
  data.lessons[0].sections[0].knowledge = [{ id: 'knowledge-18', title: 'Phân biệt chỉ số và số hạng', objectiveCodes: ['T11.18'] }];
  const h = harness({ catalogue: data });
  h.find(n => n.type === 'input' && n.props.value === 'partial').props.onChange();
  h.find(n => n.type === 'input' && n.props.value === 'knowledge-18').props.onChange({ target: { checked: true } });
  await h.click('Soạn bản nháp cho phần đã chọn');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), ['ai', { lessonId: 'seq', sectionIds: ['knowledge-18'] }]);
});
test('multi-lesson review checkboxes submit exact sections, retain unknown labels and never preview concatenated packages',async()=>{
 const h=harness();h.find(node=>node.type==='input'&&node.props.value==='multiple').props.onChange();
 assert.equal(h.find(node=>node.type==='button'&&node.props.children==='Soạn bản nháp ôn tập').props.disabled,true);
 h.find(node=>node.type==='input'&&node.props.id==='review-seq-s1').props.onChange({target:{checked:true}});
 h.find(node=>node.type==='input'&&node.props.id==='review-trig-s3').props.onChange({target:{checked:true}});
 await h.click('Soạn bản nháp ôn tập');assert.deepEqual(JSON.parse(JSON.stringify(h.calls)),[['ai',{selections:[{lessonId:'seq',sectionIds:['s1']},{lessonId:'trig',sectionIds:['s3']}]}]]);
 assert.match(h.html(),/chưa đối soát mục tiêu/);assert.match(h.html(),/không tự ghép/);assert.doesNotMatch(h.html(),/answerKey|evaluation/);
});
test('chapter selection checks all chapter source sections, unchecking one retains remaining exact scope',async()=>{
 const h=harness();h.find(node=>node.type==='input'&&node.props.value==='multiple').props.onChange();h.find(node=>node.type==='input'&&node.props.id==='review-chapter-1').props.onChange({target:{checked:true}});
 assert.equal(h.find(node=>node.type==='input'&&node.props.id==='review-seq-s2').props.checked,true);
 h.find(node=>node.type==='input'&&node.props.id==='review-seq-s2').props.onChange({target:{checked:false}});await h.click('Soạn bản nháp ôn tập');assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])),{selections:[{lessonId:'seq',sectionIds:['s1']},{lessonId:'trig',sectionIds:['s3']}]});
});
