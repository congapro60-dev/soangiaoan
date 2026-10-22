import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = readFileSync(new URL('../components/lesson/LessonCreationWizard.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const rows = [{ row_id: 'row-a', package_id: 'lesson-geometry', title: 'Hình học', grade: 10, slotMinutes: 80, version: '2', status: 'approved' }, { row_id: 'row-b', package_id: 'lesson-arithmetic', version: '1', status: 'draft' }];

function harness(response = { ok: true, json: async () => ({ packages: rows }) }, authoredResponse = { ok: true, json: async () => ({ lessons: [] }) }) {
  const states = [], effects = [], pending = [], calls = [];
  let stateIndex = 0, effectIndex = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, React, URLSearchParams, fetch: async (...args) => { calls.push(args); return args[0] === '/api/lesson-content' ? authoredResponse : response; }, require: name => {
    assert.equal(name, 'react');
    return { ...React, useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    }, useEffect(callback, deps) {
      const index = effectIndex++, previous = effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) pending.push(() => {
        previous?.cleanup?.();
        effects[index] = { deps, cleanup: callback() };
      });
    } };
  } });
  function render() {
    stateIndex = effectIndex = 0;
    const tree = exports.default();
    pending.splice(0).forEach(effect => effect());
    return tree;
  }
  return { render, calls, destination: exports.lessonCreationDestination };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [node, ...elements(node.props.children)];
}
const byLabel = (tree, label) => elements(tree).find(node => node.type === 'button' && renderToStaticMarkup(node).includes(label));
const byId = (tree, id) => elements(tree).find(node => node.props.id === id);
function stepTwo(h, purpose) {
  byLabel(h.render(), purpose).props.onClick();
  byLabel(h.render(), 'Tiếp tục').props.onClick();
  return h.render();
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('new entry requires authenticated teacher and uses existing lesson styles', () => {
  const page = readFileSync(new URL('../app/lessons/new/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /await requireChatGPTUser\("\/lessons\/new"\)/);
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /import "\.\/lessons\/lesson.css"/);
});

test('initial rendered wizard offers four choices, no preselection or content calls', () => {
  const h = harness(), tree = h.render(), html = renderToStaticMarkup(tree);
  for (const title of ['Hình thành kiến thức', 'Luyện tập', 'Ôn tập', 'Kiểm tra']) assert(html.includes(title));
  assert.equal(elements(tree).filter(node => node.props['aria-pressed'] === true).length, 0);
  assert.equal(byLabel(tree, 'Tiếp tục').props.disabled, true);
  assert.match(html, /href="\/hosts"/);
  assert.doesNotMatch(html, /Dãy số|creation-package|creation-minutes/);
  assert.deepEqual(h.calls, []);
});

test('each lesson purpose continues to explicit import source with selected grade and minutes', () => {
  for (const [label, purpose] of [['Hình thành kiến thức', 'formation'], ['Luyện tập', 'practice'], ['Ôn tập', 'review']]) {
    const h = harness();
    let tree = stepTwo(h, label);
    assert.equal(byLabel(tree, 'Tiếp tục soạn nội dung').props.disabled, true);
    byLabel(tree, 'Đưa giáo án hoặc ý tưởng vào').props.onClick();
    tree = h.render();
    byId(tree, 'creation-grade').props.onChange({ target: { value: '12' } });
    byId(tree, 'creation-minutes').props.onChange({ target: { value: '80' } });
    tree = h.render();
    const target = elements(tree).find(node => node.type === 'a' && node.props.href.startsWith('/lessons?')).props.href;
    assert.equal(target, `/lessons?setup=new&purpose=${purpose}&source=import&grade=12&minutes=80`);
    assert.deepEqual(h.calls, []);
  }
});

test('custom branch accepts grade 8 and arbitrary subject without library fetch', () => {
  const h = harness();
  let tree = stepTwo(h, 'Hình thành kiến thức');
  byLabel(tree, 'Tạo từ ý tưởng').props.onClick();
  tree = h.render();
  assert.equal(byId(tree, 'creation-subject').props.value, 'Toán');
  byId(tree, 'creation-subject').props.onChange({ target: { value: 'Sinh học' } });
  byId(tree, 'creation-grade').props.onChange({ target: { value: '8' } });
  byId(tree, 'creation-minutes').props.onChange({ target: { value: '45' } });
  tree = h.render();
  assert.match(renderToStaticMarkup(tree), /Bản nháp · cần giáo viên duyệt/);
  const target = elements(tree).find(node => node.type === 'a' && node.props.href.includes('source=custom'));
  assert.ok(target);
  assert.match(target.props.href, /subject=/);
  assert.match(target.props.href, /grade=8/);
  assert.deepEqual(h.calls, []);
});

test('library fetch is explicit, selection remains empty until teacher picks saved row', async () => {
  const h = harness();
  byLabel(stepTwo(h, 'Luyện tập'), 'Chọn từ thư viện').props.onClick();
  h.render();
  await settle();
  let tree = h.render();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0][0], '/api/lessons?kind=list');
  assert.equal(h.calls[0][1].cache, 'no-store');
  assert.equal(h.calls[1][0], '/api/lesson-content');
  assert.equal(byId(tree, 'creation-package').props.value, '');
  assert.equal(byLabel(tree, 'Tiếp tục soạn nội dung').props.disabled, true);
  assert.match(renderToStaticMarkup(tree), /Hình học · 2 · Đã duyệt/);
  assert.match(renderToStaticMarkup(tree), /lesson-arithmetic · 1 · Bản nháp/);
  byId(tree, 'creation-package').props.onChange({ target: { value: 'row-b' } });
  tree = h.render();
  assert(elements(tree).some(node => node.type === 'a' && node.props.href === '/lessons?setup=new&purpose=practice&source=library&package=row-b&grade=11&minutes=40'));
  byId(tree, 'creation-package').props.onChange({ target: { value: 'unlisted' } });
  assert.equal(byLabel(h.render(), 'Tiếp tục soạn nội dung').props.disabled, true);
});

test('saved metadata supplies original grade and duration with readonly controls', async () => {
  const h = harness();
  byLabel(stepTwo(h, 'Ôn tập'), 'Chọn từ thư viện').props.onClick();
  h.render(); await settle();
  byId(h.render(), 'creation-package').props.onChange({ target: { value: 'row-a' } });
  const tree = h.render();
  assert.equal(byId(tree, 'creation-grade').props.value, '10');
  assert.equal(byId(tree, 'creation-grade').props.disabled, true);
  assert.equal(byId(tree, 'creation-minutes').props.value, '80');
  assert.equal(byId(tree, 'creation-minutes').props.disabled, true);
  assert(elements(tree).some(node => node.type === 'a' && node.props.href === '/lessons?setup=new&purpose=review&source=library&package=row-a&grade=10&minutes=80'));
  assert.match(renderToStaticMarkup(tree), /Học liệu đã lưu giữ nguyên nội dung/);
  byLabel(tree, 'Đưa giáo án hoặc ý tưởng vào').props.onClick();
  assert.equal(byId(h.render(), 'creation-grade').props.disabled, false);
  assert.equal(byId(h.render(), 'creation-minutes').props.disabled, false);
});

test('authored lesson appears only after explicit library choice and keeps source identity', async () => {
  const h = harness(undefined, { ok: true, json: async () => ({ lessons: [{ id: 'g11-ch2-review', title: 'Ôn tập chương II', version: '1.0.0', status: 'draft', grade: 11, slotMinutes: 80 }] }) });
  byLabel(stepTwo(h, 'Ôn tập'), 'Chọn từ thư viện').props.onClick();
  h.render(); await settle();
  let tree = h.render();
  assert.match(renderToStaticMarkup(tree), /Ôn tập chương II · 1\.0\.0 · Bài có sẵn, cần lưu và GV duyệt/);
  byId(tree, 'creation-package').props.onChange({ target: { value: 'source:g11-ch2-review' } });
  tree = h.render();
  assert(elements(tree).some(node => node.type === 'a' && node.props.href === '/lessons?setup=new&purpose=review&source=authored&package=g11-ch2-review&grade=11&minutes=80'));
});

test('exam goes to exam editor, without lesson package or import requirement', () => {
  const h = harness(), tree = stepTwo(h, 'Kiểm tra');
  assert(elements(tree).some(node => node.type === 'a' && node.props.href === '/exams?setup=new&minutes=40'));
  assert.equal(byId(tree,'creation-grade'),undefined);
  assert.doesNotMatch(renderToStaticMarkup(tree), /Chọn từ thư viện|Đưa giáo án hoặc ý tưởng vào/);
  assert.deepEqual(h.calls, []);
});

test('semester library groups grade, week and type; searches without accents and preserves elective purpose',async()=>{
 const authored=[
  {id:'r22-g10-a',title:'Mệnh đề',version:'1.0.0',status:'draft',grade:10,week:1,period:2,category:'formation',slotMinutes:40},
  {id:'r22-g11-a',title:'Cấp số cộng',version:'1.0.0',status:'draft',grade:11,week:7,period:42,category:'formation',slotMinutes:40},
  {id:'r22-g11-b',title:'Game tổng hợp',version:'1.0.0',status:'draft',grade:11,week:7,period:47,category:'elective',slotMinutes:40},
 ];
 const h=harness({ok:true,json:async()=>({packages:[]})},{ok:true,json:async()=>({lessons:authored,exams:[{id:'g11-midterm',title:'Giữa học kỳ',grade:11,week:10,minutes:80}]})});
 byLabel(stepTwo(h,'Hình thành kiến thức'),'Chọn từ thư viện').props.onClick();h.render();await settle();
 let tree=h.render(),html=renderToStaticMarkup(tree);
 assert.match(html,/Lớp 11 · Discover · Học kỳ I/);assert.match(html,/<summary[^>]*><strong>Tuần 7/);assert.match(html,/Tự chọn · Game tổng hợp/);assert.doesNotMatch(html,/Mệnh đề/);
 byId(tree,'creation-week').props.onChange({target:{value:'7'}});tree=h.render();
 byId(tree,'creation-search').props.onChange({target:{value:'CAP SO CONG'}});tree=h.render();html=renderToStaticMarkup(tree);
 assert.match(html,/Cấp số cộng/);assert.doesNotMatch(html,/<span[^>]*>Game tổng hợp/);
 byId(tree,'creation-search').props.onChange({target:{value:''}});tree=h.render();
 byId(tree,'creation-category').props.onChange({target:{value:'elective'}});tree=h.render();
 byLabel(tree,'Tiết 47').props.onClick();tree=h.render();
 assert(elements(tree).some(node=>node.type==='a'&&node.props.href==='/lessons?setup=new&purpose=review&source=authored&package=r22-g11-b&grade=11&minutes=40'));
 assert.equal(byId(tree,'creation-grade').props.disabled,false);
 byId(tree,'creation-grade').props.onChange({target:{value:'10'}});tree=h.render();assert.equal(byLabel(tree,'Tiếp tục soạn nội dung').props.disabled,true);
});

test('semester week filter exposes HKII weeks from loaded library data', async () => {
 const authored = [
  { id: 'g11-week19', title: 'Hàm số mũ', version: '1.0.0', status: 'draft', grade: 11, week: 19, period: 1, category: 'formation', slotMinutes: 40 },
  { id: 'g11-week38', title: 'Ôn tập cuối năm', version: '1.0.0', status: 'draft', grade: 11, week: 38, period: 1, category: 'review', slotMinutes: 40 },
 ];
 const h = harness({ ok: true, json: async () => ({ packages: [] }) }, { ok: true, json: async () => ({ lessons: authored, exams: [] }) });
 byLabel(stepTwo(h, 'Hình thành kiến thức'), 'Chọn từ thư viện').props.onClick(); h.render(); await settle();
 const tree = h.render();
 const weekOptions = elements(elements(tree).find(node => node.props.id === 'creation-week')).filter(node => node.type === 'option');
 assert.equal(weekOptions.some(option => Number(option.props.value) === 19), true);
 assert.equal(weekOptions.some(option => Number(option.props.value) === 38), true);
 assert.match(renderToStaticMarkup(tree), /Lớp 11 · Discover · Học kỳ II/);
});

test('semester week filter falls back to weeks 1 through 38 before data arrives', async () => {
 const h = harness({ ok: true, json: async () => ({ packages: [] }) }, { ok: true, json: async () => ({ lessons: [], exams: [] }) });
 byLabel(stepTwo(h, 'Ôn tập'), 'Chọn từ thư viện').props.onClick(); h.render(); await settle();
 const tree = h.render();
 const weekOptions = elements(elements(tree).find(node => node.props.id === 'creation-week')).filter(node => node.type === 'option');
 assert.equal(weekOptions.some(option => Number(option.props.value) === 1), true);
 assert.equal(weekOptions.some(option => Number(option.props.value) === 38), true);
 assert.equal(weekOptions.length, 39);
});

test('duration validation rejects decimals, zero and overlimit before navigation', () => {
  const h = harness();
  stepTwo(h, 'Luyện tập');
  byLabel(h.render(), 'Đưa giáo án hoặc ý tưởng vào').props.onClick();
  for (const minutes of ['0', '1', '4', '-1', '1.5', '241', '', 'NaN']) {
    byId(h.render(), 'creation-minutes').props.onChange({ target: { value: minutes } });
    const tree = h.render();
    assert.equal(byId(tree, 'creation-minutes').props['aria-invalid'], true);
    assert.equal(byLabel(tree, 'Tiếp tục soạn nội dung').props.disabled, true);
  }
  for (const minutes of ['5', '20', '40', '80', '240']) assert(h.destination('review', 'import', '10', minutes, ''));
});

test('fixed destinations whitelist purpose, grade, source and package IDs', () => {
  const h = harness();
  for (const args of [['evil', 'import', '11', '40', ''], ['practice', 'evil', '11', '40', ''], ['review', 'import', '9', '40', ''], ['practice', 'library', '11', '40', '']]) assert.equal(h.destination(...args), null);
  assert.equal(h.destination('formation', 'library', '10', '40', 'row&next=https://bad.test'), null);
  assert.equal(h.destination('formation', 'library', '10', '40', 'row-safe_1'), '/lessons?setup=new&purpose=formation&source=library&package=row-safe_1&grade=10&minutes=40');
  assert.equal(h.destination('formation', 'custom', '8', '45', '', 'normal', 'Sinh học'), '/lessons?setup=new&purpose=formation&source=custom&subject=Sinh+h%E1%BB%8Dc&grade=8&minutes=45');
  assert.equal(h.destination('formation', 'library', '8', '45', 'row-safe_1'), null);
});

test('library errors retry, empty library explains import route, back preserves choice', async () => {
  for (const [response, text] of [[{ ok: false }, 'Không tải được thư viện'], [{ ok: true, json: async () => ({ packages: [] }) }, 'Thư viện chưa có học liệu']]) {
    const h = harness(response);
    byLabel(stepTwo(h, 'Ôn tập'), 'Chọn từ thư viện').props.onClick();
    h.render(); await settle();
    const tree = h.render();
    assert(renderToStaticMarkup(tree).includes(text));
    assert.equal(byLabel(tree, 'Tiếp tục soạn nội dung').props.disabled, true);
    byLabel(tree, 'Quay lại').props.onClick();
    assert.equal(byLabel(h.render(), 'Ôn tập').props['aria-pressed'], true);
  }
});
