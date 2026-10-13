import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const source = readFileSync(new URL('../components/lesson/LearningRecords.tsx', import.meta.url), 'utf8');
test('records load KaTeX stylesheet before other CSS rules',()=>{assert.ok(readFileSync(new URL('../app/learning-records/records.css',import.meta.url),'utf8').startsWith('@import url("/katex/katex.min.css");'));});
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true}}).outputText;
const classroom = {id: 'class-a', code: 'CLASSA', title: 'Lớp 11'};
const objective = {key: 'package-a:LO1', packageHash: 'package-a', code: 'LO1', statement: '$\\dfrac{1}{2}$', status: 'pending', independentCount: 0, supportedCount: 0, pendingCount: 1};
const member = {id: 'member-a', code: 'STUDA', name: 'Học sinh A', objectives: [objective], lastSubmittedAt: 1800000000000};
const plan = {id: 'plan-a', revision: 1, status: 'draft', stale: false, updatedAt: 1800000000000, body: {items: [{objectiveKey: objective.key, objectiveCode: 'LO1', statement: objective.statement, activity: 'Một bài cá nhân tương đương.', minutes: 5, recheck: 'Kiểm tra lại bằng câu đã duyệt.', evidenceIds: ['evidence-a']}], teacherNote: ''}};
const records = {class: classroom, members: [member], total: 150, offset: 0, limit: 50, backfillRequired: true};
const detail = {class: classroom, member, objectives: [objective], evidence: [{evidenceId: 'evidence-a', sessionId: 'session-a', objectiveCode: 'LO1', objectiveStatement: objective.statement, assessed: false, assisted: false, ok: null, countsForMastery: false, submittedAt: 1800000000000}], plans: [plan]};
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness(handler = async url => !url.includes('?') ? {classes: [classroom]} : url.includes('action=records&') ? records : detail) {
  const states = [], refs = [], effects = [], pending = [], calls = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0;
  const exports = {};
  vm.runInNewContext(code, {exports, React, AbortController, URLSearchParams, Number, Date, document: {getElementById: () => null}, fetch: async (url, init) => {calls.push({url, init}); const result = await handler(url, init); return {ok: result?.error ? false : true, json: async () => result};}, require(name) {
    if (name === './MathText') return {__esModule: true, default: ({text}) => React.createElement('span', {className: 'math-rendered'}, text)};
    assert.equal(name, 'react');
    return {...React, useState(initial) {const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], value => {states[i] = typeof value === 'function' ? value(states[i]) : value;}];}, useRef(initial) {const i = refIndex++; return refs[i] ||= {current: initial};}, useEffect(callback, deps) {const i = effectIndex++, previous = effects[i]; if (!previous || deps.some((value, index) => value !== previous.deps[index])) pending.push(() => {previous?.cleanup?.(); effects[i] = {deps, cleanup: callback()};});}};
  }});
  return {calls, api: exports, render() {stateIndex = refIndex = effectIndex = 0; const tree = exports.default(); pending.splice(0).forEach(effect => effect()); return tree;}};
}
function nodes(node) {if (Array.isArray(node)) return node.flatMap(nodes); if (!node || typeof node !== 'object' || !node.props) return []; return [node, ...nodes(node.props.children)];}
const text = node => renderToStaticMarkup(node);
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node).includes(label));
const select = (tree, label) => nodes(nodes(tree).find(node => node.type === 'label' && text(node).includes(label))).find(node => node.type === 'select');
const input = (tree, label) => nodes(nodes(tree).find(node => node.type === 'label' && text(node).includes(label))).find(node => ['textarea', 'input'].includes(node.type));
async function openClass(h) {h.render(); await settle(); select(h.render(), 'Lớp').props.onChange({target: {value: classroom.id}}); h.render(); await settle(); return h.render();}
async function openMember(h) {button(await openClass(h), member.name).props.onClick(); h.render(); await settle(); return h.render();}

test('server gates teacher route; host auxiliary link uses native navigation', () => {
  assert.match(readFileSync(new URL('../app/learning-records/page.tsx', import.meta.url), 'utf8'), /await requireChatGPTUser\("\/learning-records"\)/);
  assert.match(readFileSync(new URL('../app/hosts/host-dashboard.tsx', import.meta.url), 'utf8'), /<a href="\/learning-records"[^>]*>Hồ sơ học tập/);
});
test('initial entry selects no class; paginated load explicitly labels page filter and pending evidence', async () => {
  const h = harness(), initial = h.render(); await settle();
  assert.equal(select(initial, 'Lớp').props.value, '');
  assert.equal(h.calls.length, 1);
  const tree = await openClass(h), html = text(tree);
  assert.match(h.calls.at(-1).url, /action=records&id=class-a&offset=0&limit=50/);
  assert.match(html, /Lọc trên trang này|Chờ chấm|Thiếu dữ liệu không đồng nghĩa học sinh yếu/);
  assert.equal(button(tree, 'Trang trước').props.disabled, true);
  button(tree, 'Trang sau').props.onClick(); h.render(); await settle();
  assert.match(h.calls.at(-1).url, /offset=50&limit=50/);
  assert.equal(h.calls.filter(call => call.init.method === 'POST').length, 0);
});
test('detail contains MathText, lazy evidence timeline, original scoped session and no negative pending score', async () => {
  const h = harness(), tree = await openMember(h), html = text(tree);
  assert.match(h.calls.at(-1).url, /action=record&id=class-a&memberId=member-a/);
  assert.match(html, /class="math-rendered"/);
  const timeline = nodes(tree).find(node => node.type === 'details' && text(node).includes('Dòng thời gian'));
  assert.equal(timeline.props.open, undefined);
  assert.match(text(timeline), /Chờ chấm/);
  assert.doesNotMatch(text(timeline), /Cần kiểm tra lại|0 điểm/);
  assert(nodes(tree).some(node => node.type === 'a' && node.props.href === '/lessons?session=session-a'));
});
test('plan suggestion persists, edit save carries CAS, explicit approval, delete enters Trash', async () => {
  const h = harness(async (url, init) => {
    if (init.method === 'POST') {const body = JSON.parse(init.body); if (body.action === 'learning-plan-delete') return {ok: true}; return {plan: {...plan, revision: body.action === 'learning-plan-save' ? 2 : 1, status: body.status || 'draft', body: body.body || plan.body}};}
    return !url.includes('?') ? {classes: [classroom]} : url.includes('action=records&') ? records : detail;
  });
  let tree = await openMember(h);
  button(tree, 'Gợi ý kế hoạch').props.onClick(); await settle(); tree = h.render();
  assert.deepEqual(JSON.parse(h.calls.at(-1).init.body), {action: 'learning-plan-suggest', classId: 'class-a', memberId: 'member-a'});
  input(tree, 'Hoạt động').props.onChange({target: {value: 'GV chọn bài tương đương.'}}); tree = h.render();
  nodes(tree).find(node => node.type === 'form' && text(node).includes('Lưu nháp')).props.onSubmit({preventDefault() {}}); await settle(); tree = h.render();
  const saved = JSON.parse(h.calls.at(-1).init.body);
  assert.equal(saved.revision, 1); assert.equal(saved.status, 'draft'); assert.equal(saved.body.items[0].activity, 'GV chọn bài tương đương.');
  button(tree, 'Duyệt kế hoạch').props.onClick(); await settle(); tree = h.render();
  assert.equal(JSON.parse(h.calls.at(-1).init.body).status, 'approved');
  assert.match(text(tree), /Chưa tự giao bài/);
  button(tree, 'Xóa kế hoạch').props.onClick(); tree = h.render();
  const calls = h.calls.length;
  assert.match(text(tree), /Có thể khôi phục tại/);
  assert.equal(h.calls.length, calls);
  button(tree, 'Chuyển vào Thùng rác').props.onClick(); await settle(); tree = h.render();
  assert.equal(JSON.parse(h.calls.findLast(call => call.init.method === 'POST').init.body).action, 'learning-plan-delete');
  assert.match(text(tree), /Đã chuyển kế hoạch vào Thùng rác/);
});
test('stale plans cannot be approved; minute validation prevents invalid writes', async () => {
  const h = harness(async url => !url.includes('?') ? {classes: [classroom]} : url.includes('action=records&') ? records : {...detail, plans: [{...plan, stale: true}]});
  let tree = await openMember(h);
  select(tree, 'Kế hoạch đã lưu').props.onChange({target: {value: plan.id}}); tree = h.render();
  assert.equal(button(tree, 'Duyệt kế hoạch').props.disabled, true);
  assert.match(text(tree), /Minh chứng đã thay đổi/);
  input(tree, 'Thời lượng').props.onChange({target: {value: '1.5'}}); tree = h.render();
  assert.equal(button(tree, 'Lưu nháp').props.disabled, true);
});
test('backfill is explicit and bounded; cursor requires another teacher click', async () => {
  const h = harness(async (url, init) => init.method === 'POST' ? {cursor: 'next-session', done: false, processed: 1} : !url.includes('?') ? {classes: [classroom]} : records);
  let tree = await openClass(h);
  assert.equal(h.calls.filter(call => call.init.method === 'POST').length, 0);
  button(tree, 'Cập nhật lịch sử cũ').props.onClick(); await settle(); tree = h.render();
  assert.equal(JSON.parse(h.calls.findLast(call => call.init.method === 'POST').init.body).cursor, null);
  assert.match(text(tree), /Đã cập nhật một tiết/);
  button(tree, 'Tiếp tục cập nhật lịch sử').props.onClick(); await settle();
  assert.equal(JSON.parse(h.calls.findLast(call => call.init.method === 'POST').init.body).cursor, 'next-session');
});
test('export scopes applied dates and selected student; no claim of working automatic connection', async () => {
  const h = harness(); let tree = await openMember(h);
  const link = nodes(tree).find(node => node.type === 'a' && text(node).includes('Tải JSON'));
  const query = new URL(link.props.href, 'https://game.test').searchParams;
  assert.equal(query.get('memberId'), member.id); assert.equal(query.get('id'), classroom.id); assert.equal(query.get('format'), 'json');
  assert.equal(query.get('offset'), '0');
  assert.match(text(tree), /Chưa kết nối tự động với GiaoAnDewey/);
});
test('export failures remain on the teacher page with actionable human error', async () => {
  const h = harness(async url => url.includes('action=records-export') ? {error: 'RECORD_TRUNCATED'} : !url.includes('?') ? {classes: [classroom]} : url.includes('action=records&') ? records : detail);
  let tree = await openClass(h);
  nodes(tree).find(node => node.type === 'a' && text(node).includes('Tải JSON')).props.onClick({preventDefault() {}}); await settle(); tree = h.render();
  assert.match(text(tree), /Lịch sử vượt giới hạn xuất. Thu hẹp khoảng thời gian hoặc chọn một học sinh/);
  assert.doesNotMatch(text(tree), /RECORD_TRUNCATED/);
});
test('empty saved plan cannot be approved or saved as an actionable plan', async () => {
  const h = harness(async url => !url.includes('?') ? {classes: [classroom]} : url.includes('action=records&') ? records : {...detail, plans: [{...plan, body: {...plan.body, items: []}}]});
  let tree = await openMember(h);
  select(tree, 'Kế hoạch đã lưu').props.onChange({target: {value: plan.id}}); tree = h.render();
  assert.equal(button(tree, 'Duyệt kế hoạch').props.disabled, true);
  assert.equal(button(tree, 'Lưu nháp').props.disabled, true);
  assert.match(text(tree), /Chưa có mục tiêu hoặc hoạt động để duyệt/);
});
test('API runtime boundary rejects malformed record, mismatched class and excessive data', async () => {
  const h = harness();
  assert.equal(h.api.isRecords({...records, members: [{...member, objectives: ["unsafe"]}]}), false);
  assert.equal(h.api.isRecords({...records, members: Array(51).fill(member)}), false);
  assert.equal(h.api.isDetail({...detail, evidence: [{...detail.evidence[0], assessed: 'yes'}]}), false);
  const wrong = harness(async url => !url.includes('?') ? {classes: [classroom]} : {...records, class: {...classroom, id: 'other'}});
  const tree = await openClass(wrong);
  assert.match(text(tree), /Hồ sơ lớp chưa hợp lệ/);
  assert.equal(button(tree, member.name), undefined);
});
test('late detail response is discarded after class selection changed', async () => {
  let resolveDetail;
  const h = harness(async url => !url.includes('?') ? {classes: [classroom, {...classroom, id: 'class-b'}]} : url.includes('action=records&') ? {...records, class: {...classroom, id: new URL(url, 'https://game.test').searchParams.get('id')}} : new Promise(resolve => {resolveDetail = resolve;}));
  let tree = await openClass(h);
  button(tree, member.name).props.onClick(); tree = h.render(); await settle();
  select(tree, 'Lớp').props.onChange({target: {value: 'class-b'}}); h.render(); await settle();
  resolveDetail(detail); await settle(); tree = h.render();
  assert.doesNotMatch(text(tree), /Mã học sinh: STUDA|Dòng thời gian minh chứng/);
});
