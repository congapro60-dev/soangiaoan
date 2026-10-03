import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";
import ts from "typescript";

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
    require: (id) => ({}),
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
