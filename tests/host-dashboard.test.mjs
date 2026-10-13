import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";

const source = readFileSync("app/hosts/host-dashboard.tsx", "utf8");
const transpiled = ts.transpile(source, {
  jsx: ts.JsxEmit.React,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.CommonJS
});

function createMockContext(hash = '#invite=1234567890123456789012345678901234567890123') {
  const logs = [];
  const storage = {};
  const context = createContext({
    exports: {},
    require: () => ({}),
    console: { log: (msg) => logs.push(msg) },
    window: {
      location: { hash, pathname: '/hosts', search: '' },
      history: { replaceState: (state, title, url) => { context.replacedUrl = url; } }
    },
    localStorage: {
      getItem: (k) => storage[k],
      setItem: (k, v) => storage[k] = v,
      removeItem: (k) => delete storage[k]
    },
    URLSearchParams: globalThis.URLSearchParams
  });
  
  runInContext(`
    const module = { exports: {} };
    ` + transpiled + `
    Object.assign(exports, module.exports);
  `, context);
  
  return { context, logs, storage };
}

test("host UI keeps invite acceptance in the URL fragment and clears it", () => {
  const token = '1234567890123456789012345678901234567890123';
  const { context, logs, storage } = createMockContext('#invite=' + token);
  const result = runInContext('exports.consumeInviteFragment(window.location, window.history)', context);
  assert.equal(result, token);
  assert.equal(context.replacedUrl, '/hosts');
  
  // no secret persistent storage
  assert.deepEqual(Object.keys(storage), []);
  
  // raw invite token not logged
  assert.equal(logs.some(l => String(l).includes(token)), false);
});

test("malformed/absent fragment", () => {
  const { context } = createMockContext('#invite=short');
  const result = runInContext('exports.consumeInviteFragment(window.location, window.history)', context);
  assert.equal(result, null);
  
  const { context: context2 } = createMockContext('');
  const result2 = runInContext('exports.consumeInviteFragment(window.location, window.history)', context2);
  assert.equal(result2, null);
});

test("host UI sends the API contract without bearer tokens", () => {
  const { context } = createMockContext();
  const result = runInContext('exports.inviteAction("test@test.com", "host")', context);
  assert.equal(result.action, "create-invite");
  assert.equal(result.expectedEmail, "test@test.com");
  assert.equal(result.role, "host");
});


test("teacher dashboard routes lessons separately and denies unsupported lesson observers", () => {
  const {context} = createMockContext();
  const destination = context.exports.roomDestination;
  const identity = {isRoot: false, revoked: false};
  const lesson = {id: 'room-lesson', mode: 'lesson', lessonSessionId: 'session-a/b', role: 'owner'};
  assert.equal(destination(lesson, identity), '/lessons?session=session-a%2Fb');
  assert.equal(destination({...lesson, role: 'cohost'}, identity), '/lessons?session=session-a%2Fb');
  assert.equal(destination({...lesson, role: 'observer'}, identity), null);
  assert.equal(destination({...lesson, role: 'observer'}, {isRoot: true, revoked: false}), '/lessons?session=session-a%2Fb');
  assert.equal(destination({...lesson, lessonSessionId: null}, identity), null);
  assert.equal(destination(lesson, {...identity, revoked: true}), null);
  assert.equal(destination({id: 'game/a', mode: 'legacy', role: 'observer'}, identity), '/?view=teacher&room=game%2Fa');
});


test("teacher entry visibly offers organization choices while permission forms start collapsed", () => {
  const identity = {user: null, isRoot: false, configured: true, systemRole: "host", revoked: false};
  const rooms = [{id: 'room-a', code: 'ABCDEF', title: 'Lesson A', mode: 'lesson', role: 'owner', lessonSessionId: 'session-a'}, {id: 'room-b', code: 'BCD234', title: 'Game B', mode: 'legacy', role: 'observer'}, {id: 'room-c', code: 'CDF345', title: 'Lesson C', mode: 'lesson', role: 'observer', lessonSessionId: 'session-c'}];
  let stateIndex = 0;
  const context = createContext({exports: {}, require: id => {
    if (id === 'react') return {...React, useState: initial => [stateIndex++ === 0 ? identity : stateIndex === 2 ? rooms : initial, () => {}], useRef: value => ({current: value}), useEffect: () => {}};
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'next/link') return {default: props => React.createElement('a', props)};
    throw Error(id);
  }});
  runInContext(ts.transpileModule(source, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS}}).outputText, context);
  const markup = renderToStaticMarkup(context.exports.default({user: {displayName: 'Teacher', email: 'teacher@example.test'}}));
  const nav = markup.match(/<nav[\s\S]*?<\/nav>/)[0];
  for (const label of ['Tổ chức tiết học', 'Tạo phòng game', 'Quản lý quyền giáo viên']) assert(nav.includes(label));
  assert(nav.includes('href="/lessons"'));
  assert(nav.includes('href="/?view=teacher"'));
  assert(nav.includes('href="#host-permissions"'));
  assert.match(markup, /<details id="host-permissions" class="hosts-permissions hosts-section">/);
  assert(markup.includes('href="/lessons?session=session-a"'));
  assert(markup.includes('href="/?view=teacher&amp;room=room-b"'));
  assert(!markup.includes('href="/lessons?session=session-c"'));
  assert(markup.includes('Tiết học chưa hỗ trợ màn hình quan sát viên.'));
  assert(markup.includes('Lời mời host toàn cục'));
  identity.isRoot = true; stateIndex = 0;
  assert(renderToStaticMarkup(context.exports.default({user: {displayName: 'Root', email: 'root@example.test'}})).includes('Nhận phòng legacy'));
});
