import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../components/exam/ExamPlay.tsx', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const q = (id, type, extra = {}) => ({ id, type, section: 'I', label: 'Câu ' + id.slice(1), points: 1, text: 'Đề ' + id, ...extra });
const base = extra => ({
  serverNow: Date.now(), exam: { code: 'ABC123', title: 'Kiểm tra', status: 'running', review: 'after_close', questionCount: 1, sections: [], endsAt: Date.now() + 600000 },
  attempt: { id: 'p1', name: 'An', mascot: 0, submittedAt: Date.now() }, questions: [], answers: {}, photos: {}, finished: true,
  badges: ['Hoàn thành', 'Đúng giờ'], result: { total: 0.5, max: 1, answered: 1, count: 1, essaysPending: false }, ...extra,
});

function harness(state, selected = 0) {
  const hooks = [false, state, 'pupil-token', state.answers, state.photos, selected], refs = [], effects = [], polls = [], images = [], posts = [];
  const storage = new Map([['exam-session', JSON.stringify({ code: state.exam.code, token: 'pupil-token', name: state.attempt.name })]]), removed = [];
  let cursor = 0, refCursor = 0;
  let remote = state;
  const react = { ...React,
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useEffect(callback) { effects.push(callback); },
    useCallback(callback) { return callback; },
  };
  const exports = {};
  vm.runInNewContext(js.replace('const leave = () => {', 'const leave = exports.leave = () => {'), { exports, Date, URL, console,
    window: { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => { removed.push(key); storage.delete(key); } } },
    require(name) {
      if (name === 'react') return react;
      if (name.endsWith('/MathText')) return { __esModule: true, default: ({ text }) => React.createElement('span', null, text) };
      if (name.endsWith('/LessonMascotPicker')) return { mascotSpriteStyle: () => ({}) };
      if (name.endsWith('/LessonWorldMap')) return { LessonWorldMap: () => React.createElement('iframe', {title:'Hành trình sau kiểm tra'}) };
      if (name === './client') return { ApiError: class extends Error {}, pupilGet: async token => { polls.push(token); return remote; }, pupilPost: async (body, token) => { posts.push({ body, token }); return remote; }, pupilImageUrl: async (token, query) => { images.push({ token, query }); return 'blob:' + query; } };
      return {};
    },
  });
  const tree = () => { cursor = refCursor = 0; effects.length = 0; return exports.default(); };
  const html = () => renderToStaticMarkup(tree());
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; }
    return null;
  };
  return { html, tree, find, refs, effects, polls, images, posts, hooks, storage, removed, leave: () => exports.leave(), setRemote(next) { remote = next; } };
}

test('new running exam opens on two unchecked integrity disclosures; server acknowledgement required before questions', async () => {
  const state = base({ finished: false, attempt: { ...base().attempt, submittedAt: null }, questions: [], integrity: { required: true, confirmed: false } });
  const h = harness(state), checks = [];
  let tree = h.tree();
  h.find(tree, node => { if (node.type === 'input' && node.props.type === 'checkbox') checks.push(node); return false; });
  assert.equal(checks.length, 2); assert.ok(checks.every(node => node.props.checked === false));
  let button = h.find(tree, node => node.type === 'button' && node.props.children === 'Xác nhận và mở bài');
  assert.equal(button.props.disabled, true);
  await button.props.onClick(); assert.equal(h.posts.length, 0);
  assert.doesNotMatch(h.html(), /exam-question|Nộp bài/);
  checks[0].props.onChange({ target: { checked: true } });
  checks[1].props.onChange({ target: { checked: true } });
  tree = h.tree(); button = h.find(tree, node => node.type === 'button' && node.props.children === 'Xác nhận và mở bài');
  assert.equal(button.props.disabled, false);
  // A stale response still lacking the server marker cannot open any questions.
  await button.props.onClick(); await new Promise(setImmediate);
  assert.equal(h.posts[0].token, 'pupil-token');
  assert.equal(JSON.stringify(h.posts[0].body), JSON.stringify({ action: 'integrity', integrity: { confirmed: true, usedAI: true } }));
  assert.match(h.html(), /Làm bài trung thực/);
  state.exam.endsAt = Date.now() - 1000;
  h.tree(); h.effects[3](); h.refs[2].current(); await new Promise(setImmediate);
  assert.ok(!h.posts.some(post => post.body.action === 'submit'), 'unacknowledged deadline cannot send a submission');
});

test('early submission shows only passport, server badges and total; policy none makes no solution promise', () => {
  const html = harness(base()).html();
  assert.match(html, /Hộ chiếu kết quả/);
  assert.match(html, /Hoàn thành/);
  assert.match(html, /Đúng giờ/);
  assert.match(html, /0,5/);
  assert.match(html, /Lời giải sẽ mở khi phòng kết thúc\./);
  assert.doesNotMatch(html, /Đáp án đúng|Kết quả từng ý/);
  const premature = harness(base({ review: { questions: [q('q1', 'mc', { key: 'C', solution: 'Secret solution' })], answers: {}, manual: {}, comments: {}, items: {} } })).html();
  assert.doesNotMatch(premature, /Secret solution|Đáp án đúng|Trạm lời giải/);
  const hidden = harness(base({ exam: { ...base().exam, review: 'none' }, result: null })).html();
  assert.doesNotMatch(hidden, /Lời giải sẽ mở|exam-score/);
  const closedHidden = harness(base({ exam: { ...base().exam, status: 'closed', review: 'none' }, review: { questions: [q('q1', 'mc', { key: 'C', solution: 'Secret solution' })], answers: {}, manual: {}, comments: {}, items: {} } })).html();
  assert.doesNotMatch(closedHidden, /Secret solution|Đáp án đúng|Trạm lời giải/);
});

test('closed review opens every station; missing key never labels an answer wrong', () => {
  const questions = [q('q1', 'mc', { key: 'C', solution: 'Chọn C.' }), q('q2', 'short', { key: null })];
  const state = base({ exam: { ...base().exam, status: 'closed' }, review: { questions, answers: { q1: 'A', q2: '2' }, manual: {}, comments: {}, items: { q1: { points: 0, max: 1, correct: false }, q2: { points: 0, max: 1, correct: false } } } });
  const h = harness(state);
  assert.match(h.html(), /Đáp án đúng/);
  assert.match(h.html(), /Chọn C\./);
  const station = h.find(h.tree(), node => node.type === 'button' && node.props['aria-label'] === 'Xem lại Câu 2');
  assert.ok(station, 'all stations remain selectable');
  station.props.onClick();
  assert.match(h.html(), /Chưa có đáp án/);
  assert.doesNotMatch(h.html(), /Trả lời sai/);
});

test('TF review uses server marks for each statement and THPT points', () => {
  const question = q('q1', 'tf', { statements: ['a', 'b', 'c', 'd'], key: [true, false, true, false] });
  const state = base({ exam: { ...base().exam, status: 'closed' }, review: { questions: [question], answers: { q1: [true, true, null, false] }, manual: {}, comments: {}, items: { q1: { points: 0.25, max: 1, correct: false, detail: { correct: 2, total: 4, marks: [true, false, null, true] } } } } });
  const html = harness(state).html();
  assert.match(html, /Kết quả từng ý/);
  assert.match(html, /Trả lời đúng/);
  assert.match(html, /Trả lời sai/);
  assert.match(html, /Chưa trả lời/);
  assert.match(html, /0,25/);
  assert.match(html, /THPT/);
});

test('essay review shows own text, model, rubric, pending then teacher mark and comment', () => {
  const question = q('q1', 'essay', { solution: 'Lời giải mẫu', rubric: 'Bước 1 (0,25đ)' });
  const review = { questions: [question], answers: { q1: { text: 'Bài làm của An' } }, manual: {}, comments: {}, items: { q1: { points: 0, max: 1, pending: true } } };
  const state = base({ exam: { ...base().exam, status: 'closed' }, review });
  const html = harness(state).html();
  assert.match(html, /Bài làm của An/);
  assert.match(html, /Lời giải mẫu/);
  assert.match(html, /Bước 1/);
  assert.match(html, /Đang chờ giáo viên chấm/);
  const graded = harness({ ...state, review: { ...review, manual: { q1: 0.75 }, comments: { q1: 'Cần nêu điều kiện.' }, items: { q1: { points: 0.75, max: 1, pending: false } } } }).html();
  assert.match(graded, /0,75/);
  assert.match(graded, /Cần nêu điều kiện\./);
  assert.doesNotMatch(graded, /Đang chờ giáo viên chấm/);
});

test('submitted and closed sessions keep polling for closure and later marks', async () => {
  for (const status of ['running', 'closed']) {
    const h = harness(base({ exam: { ...base().exam, status } }));
    h.tree();
    h.effects[3]();
    h.refs[2].current();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(h.polls, ['pupil-token'], status + ' keeps refreshing after submission');
  }
});

test('a status poll unlocks review and a later poll updates the teacher comment without reload', async () => {
  const h = harness(base());
  h.tree();
  h.effects[3]();
  const review = { questions: [q('q1', 'essay', { solution: 'Lời giải mới' })], answers: { q1: { text: 'Bài của em' } }, manual: {}, comments: {}, items: { q1: { points: 0, max: 1, pending: true } } };
  const closed = base({ exam: { ...base().exam, status: 'closed' }, review });
  h.setRemote(closed);
  h.refs[2].current();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.html(), /Lời giải mới/);
  assert.match(h.html(), /Đang chờ giáo viên chấm/);
  h.effects[3]();
  h.refs[4].current = 0;
  h.setRemote({ ...closed, review: { ...review, manual: { q1: 1 }, comments: { q1: 'Trình bày tốt.' }, items: { q1: { points: 1, max: 1, pending: false } } } });
  h.refs[2].current();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.html(), /Trình bày tốt\./);
  assert.doesNotMatch(h.html(), /Đang chờ giáo viên chấm/);
});

test('review fetches own photos and solution assets with the pupil token and distinct asset queries', async () => {
  const review = { questions: [q('q1', 'essay', { solutionImages: [{ id: 'solution-1', bytes: 100 }] })], answers: {}, manual: {}, comments: {}, items: { q1: { pending: true } } };
  const h = harness(base({ exam: { ...base().exam, status: 'closed' }, photos: { q1: ['own-photo'] }, review }));
  h.html();
  for (const effect of h.effects.slice(-2)) effect();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.images, [{ token: 'pupil-token', query: 'photo=own-photo' }, { token: 'pupil-token', query: 'solution=solution-1' }]);
  const html = h.html();
  assert.match(html, /alt="Ảnh bài làm 1"/);
  assert.match(html, /alt="Ảnh lời giải 1"/);
  assert.doesNotMatch(html, /Xóa ảnh này/);
});

test('displayed option and statement text are rendered with the labels received from the server', () => {
  const question = q('101_q1', 'mc', { options:['A','B','C','D'], choiceText:{A:'$\\frac{\\pi}{2}$',B:'Nội dung đã đảo B'}, text:'Thân câu hỏi' });
  const active = base({finished:false,attempt:{...base().attempt,submittedAt:null},questions:[question]});
  const html = harness(active).html();
  assert.match(html, /Nội dung đã đảo B/);
  assert.match(html, /frac/);
  const tf = q('101_q2', 'tf', {statements:['a','b','c','d'],statementText:{a:'Ý a đã đảo',b:'Ý b vẫn cùng ngữ cảnh'}});
  assert.match(harness({...active,questions:[tf]}).html(), /Ý a đã đảo/);
  const review = {questions:[tf],answers:{[tf.id]:[true]},manual:{},comments:{},items:{}};
  assert.match(harness(base({exam:{...base().exam,status:'closed'},review})).html(), /Ý b vẫn cùng ngữ cảnh/);
});

test('Word figures keep the stem and ordered image metadata; visible code is opt-in', () => {
  const question=q('101_q1','mc',{imageMode:'figure',hasImage:true,text:'Đọc đồ thị để chọn',questionImages:[{id:'figure-1',bytes:100}]});
  const active=base({finished:false,attempt:{...base().attempt,submittedAt:null},questions:[question]});
  const html=harness(active).html();
  assert.match(html,/Đọc đồ thị để chọn/);
  assert.doesNotMatch(html,/Mã đề 101/);
  assert.match(harness({...active,exam:{...active.exam,examCode:'101'}}).html(),/Mã đề 101/);
});

test('manual unassigned pupils wait instead of opening an empty exam', () => {
  const active=base({finished:false,assignmentPending:true,attempt:{...base().attempt,submittedAt:null},questions:[]});
  const html=harness(active).html();
  assert.match(html,/Chờ thầy\/cô phân mã đề/);
  assert.doesNotMatch(html,/Nộp bài<\/button>/);
});

test('legacy PDF pictures remount on question changes so stale pictures cannot answer a new question', () => {
  const definition = /function QuestionContent[\s\S]*?return <>/.exec(source)[0];
  assert.match(definition, /<QuestionImage\s+key=\{q.id\}/);
});

test('post-exam passport exposes review PIN only when supplied, with a private handling reminder', () => {
  const html=harness(base({reviewPin:'ABCDEFGH'})).html();
  assert.match(html,/PIN xem lại/);
  assert.match(html,/ABCDEFGH/);
  assert.match(html,/Giữ PIN riêng/);
  assert.doesNotMatch(harness(base()).html(),/ABCDEFGH/);
});

test('closed review declares its own safe-area bottom spacing and opaque navigation', async () => {
  const review={questions:[q('q1','essay')],answers:{},manual:{},comments:{},items:{}};
  assert.match(harness(base({exam:{...base().exam,status:'closed'},review})).html(),/exam-shell exam-review/);
  const css=await readFile(new URL('../app/exam/exam.css',import.meta.url),'utf8');
  assert.match(css,/\.exam-review\s*\{[^}]*padding-bottom:\s*calc\(120px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.exam-review \.exam-nav\s*\{[^}]*background:\s*var\(--lesson-bg\)/);
});

test('finished passport supplies metadata-only journey and station selection changes the selected review', () => {
  const review={questions:[q('q1','mc',{key:'C'}),q('q2','short',{key:null})],answers:{q1:'A'},manual:{},comments:{},items:{}};
  const h=harness(base({exam:{...base().exam,status:'closed'},review}));
  const map=h.find(h.tree(),node=>typeof node.type==='function'&&node.props?.examJourney);
  assert.ok(map);
  assert.equal(map.props.examJourney.phase,'review');
  assert.deepEqual(Object.keys(map.props.examJourney.stations[0]),['id','label','answered']);
  map.props.onExamStationSelect('q2');
  assert.match(h.html(),/Chưa có đáp án/);
  map.props.onExamStationSelect('foreign');
  assert.match(h.html(),/Chưa có đáp án/);
});

test('leaving a finished exam preserves the session for later review; leaving while running clears it', () => {
  for (const extra of [{ finished: true, attempt: { ...base().attempt, submittedAt: null } }, { finished: false }, { finished: false, attempt: { ...base().attempt, submittedAt: null }, exam: { ...base().exam, status: 'closed' } }]) {
    const h = harness(base(extra));
    const saved = h.storage.get('exam-session');
    h.tree();
    h.leave();
    assert.equal(h.storage.get('exam-session'), saved);
    assert.deepEqual(h.removed, []);
    assert.equal(h.hooks[1], null);
    assert.equal(h.hooks[2], '');
  }
  const running = harness(base({ finished: false, attempt: { ...base().attempt, submittedAt: null } }));
  running.tree();
  running.leave();
  assert.equal(running.storage.has('exam-session'), false);
  assert.deepEqual(running.removed, ['exam-session']);
});
