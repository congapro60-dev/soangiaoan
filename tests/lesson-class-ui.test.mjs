import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function ui(relative, extra = {}) {
  let cursor = 0;
  const state = [], effects = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) }),
    useState: initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useRef: initial => { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useId: () => 'roster',
    useEffect: effect => { effects.push(effect); },
  };
  const values = new Map();
  const sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const exports = {};
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const context = { exports, require: name => name === 'react' ? react : name === 'next/link' ? 'Link' : name.endsWith('values.js') ? {EDUFIT_VALUES:[]} : {}, sessionStorage, AbortController, crypto: globalThis.crypto, console, window: { confirm: () => true }, ...extra };
  vm.runInNewContext(compiled, context);
  const render = (name, props) => { cursor = 0; effects.length = 0; return exports[name](props); };
  return { render, effects, state, values, exports, context };
}
function elements(root, predicate = () => true) {
  if (!root || typeof root !== 'object') return [];
  return [...(predicate(root) ? [root] : []), ...root.children.flatMap(child => elements(child, predicate))];
}
const byId = (root, id) => elements(root, node => node.props.id === id)[0];
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };
const pupil = { class: { id: 'class-1', code: 'ABC234', title: 'QA' }, member: { id: 'member-1', code: 'DEF567', name: 'An' }, passport: { objectives: [{ code: 'T11.18', statement: 'Dãy số', status: 'standard_mastery', independentCount: 2, supportedCount: 0 }] } };

test('passport login sends three credentials in body only; stores only opaque bearer then clears PIN and logs out', async () => {
  const calls = [];
  const env = ui('../app/passport/page.tsx', { fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ token: 'opaque-token', ...pupil }) }; } });
  let tree = env.render('default');
  byId(tree, 'passport-class-code').props.onChange({ target: { value: 'abc234' } });
  byId(tree, 'passport-member-code').props.onChange({ target: { value: 'def567' } });
  byId(tree, 'passport-pin').props.onChange({ target: { value: 'PRIVATE8' } });
  tree = env.render('default');
  await elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(calls[0].url, '/api/lesson-classes');
  assert.deepEqual(JSON.parse(calls[0].options.body), { action: 'join', classCode: 'ABC234', memberCode: 'DEF567', pin: 'PRIVATE8' });
  assert.deepEqual([...env.values.values()], ['opaque-token']);
  assert.equal(env.state[2], '');
  tree = env.render('default');
  const logout = elements(tree, node => node.type === 'button' && node.children.includes('Thoát trên thiết bị này'))[0];
  assert.ok(logout); logout.props.onClick();
  assert.equal(env.values.size, 0); assert.equal(env.state[4], null); assert.equal(env.state[3], '');
  assert.equal(elements(env.render('default'), node => node.type === 'form').length, 1);
});

test('restored passport requests use own bearer only, ignore URLs; revoked bearer removed from memory and storage', async () => {
  const calls = [];
  const env = ui('../app/passport/page.tsx', { window: { location: { search: '?memberId=someone-else&token=forged' } }, fetch: async (url, options) => { calls.push({ url, options }); return { ok: false, json: async () => ({ error: 'AUTH_REQUIRED' }) }; } });
  env.values.set(env.exports.CLASS_PASSPORT_TOKEN_KEY, 'private-device-token');
  env.render('default'); env.effects[0](); await flush();
  env.render('default'); const cleanup = env.effects[1](); await flush(); cleanup();
  assert.equal(calls[0].url, '/api/lesson-classes');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-device-token');
  assert.equal(env.values.size, 0); assert.equal(env.state[3], '');
  assert.ok(elements(env.render('default'),node=>node.props.role==='status').some(node=>node.children.some(text=>String(text).includes('thu hồi'))));
});

test('teacher class selection clears a displayed PIN; slow initial roster reply cannot replace a newer member list', async () => {
  let resolveRoster;
  const calls = [];
  const classroom = { id: 'class-1', code: 'ABC234', title: 'QA', activeMemberCount: 0 };
  const member = { id: 'member-1', code: 'DEF567', name: 'An', teamId: null, revoked: false };
  const env = ui('../components/lesson/ClassRosterPanel.tsx', { fetch: async (url, options) => {
    calls.push({ url, options });
    if (options?.method === 'POST') return { ok: true, json: async () => ({ member, pin: 'PRIVATE8' }) };
    if (url.includes('?')) {
      if (calls.filter(call => call.url.includes('?')).length === 1) return new Promise(resolve => { resolveRoster = resolve; });
      return { ok: true, json: async () => ({ members: [member], teams: [] }) };
    }
    return { ok: true, json: async () => ({ classes: [classroom] }) };
  } });
  env.render('ClassRosterPanel', {}); env.effects[0](); env.effects[1](); await flush();
  let tree = env.render('ClassRosterPanel', {});
  byId(tree, 'roster-class').props.onChange({ target: { value: 'class-1' } });
  tree = env.render('ClassRosterPanel', {}); const cleanup = env.effects[1](); await flush();
  byId(tree, 'roster-name').props.onChange({ target: { value: 'An' } });
  tree = env.render('ClassRosterPanel', {});
  await elements(tree, node => node.type === 'form')[1].props.onSubmit({ preventDefault() {} });
  await flush();
  tree = env.render('ClassRosterPanel', {});
  assert.ok(elements(tree, node => node.children.includes('PRIVATE8')).length);
  resolveRoster({ ok: true, json: async () => ({ members: [], teams: [] }) }); await flush();
  tree = env.render('ClassRosterPanel', {});
  assert.equal(elements(tree, node => node.type === 'li').length, 1);
  byId(tree, 'roster-class').props.onChange({ target: { value: '' } });
  tree = env.render('ClassRosterPanel', {});
  assert.equal(elements(tree, node => node.children.includes('PRIVATE8')).length, 0);
  assert.equal(calls.some(call => call.url.includes('PRIVATE8')), false); cleanup();
});

test('class and PIN inputs have labels and the PIN field conceals its value', () => {
  const env = ui('../app/passport/page.tsx');
  const tree = env.render('default');
  for (const id of ['passport-class-code', 'passport-member-code', 'passport-pin']) {
    assert.ok(byId(tree, id)); assert.ok(elements(tree, node => node.type === 'label' && node.props.htmlFor === id).length);
  }
  assert.equal(byId(tree, 'passport-pin').props.type, 'password');
});

test('teacher retries a lost create reply with the same request ID; changed title gets a fresh ID', async () => {
  const calls = [];
  const env = ui('../components/lesson/ClassRosterPanel.tsx', { fetch: async (url, options) => { calls.push({ url, options }); throw new Error('offline'); } });
  let tree = env.render('ClassRosterPanel', {});
  byId(tree, 'roster-new').props.onChange({ target: { value: 'Class A' } });
  tree = env.render('ClassRosterPanel', {});
  elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await flush();
  tree = env.render('ClassRosterPanel', {});
  elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await flush();
  assert.equal(JSON.parse(calls[0].options.body).requestId, JSON.parse(calls[1].options.body).requestId);
  byId(tree, 'roster-new').props.onChange({ target: { value: 'Class B' } });
  tree = env.render('ClassRosterPanel', {});
  elements(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await flush();
  assert.notEqual(JSON.parse(calls[1].options.body).requestId, JSON.parse(calls[2].options.body).requestId);
});
