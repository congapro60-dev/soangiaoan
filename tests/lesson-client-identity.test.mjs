import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../app/play/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('play.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function helper(name, bindings) {
  let node;
  const visit = item => { if (ts.isFunctionDeclaration(item) && item.name?.text === name) node = item; ts.forEachChild(item, visit); };
  visit(ast); assert.ok(node);
  const code = ts.transpileModule(`${node.getText(ast)}; ${name};`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  return vm.runInNewContext(code, bindings);
}

test('a shared device keeps separate learner bearers, with stable normalized rejoin', () => {
  const values = new Map(); let issued = 0;
  const get = helper('getOrCreateBearer', {
    sessionStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)},
    generate32ByteBase64Url: () => `token-${++issued}`, Date, Math, encodeURIComponent
  });
  const first = get('ABC123', '  Thảo   An ');
  const second = get('ABC123', 'Bảo Bình');
  assert.notEqual(first.token, second.token);
  assert.equal(get(' abc123 ', 'THẢO AN').token, first.token);
  assert.equal(get('ABC123', 'Thảo An').requestId, first.requestId);
});

test('a legacy room bearer is not silently assigned to a newly named learner', () => {
  const values = new Map([['lesson_bearer_ABC123', 'previous-person']]);
  const get = helper('getOrCreateBearer', {
    sessionStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)},
    generate32ByteBase64Url: () => 'new-person', Date, Math, encodeURIComponent
  });
  assert.equal(get('ABC123', 'New learner').token, 'new-person');
});

test('presenter query selects the requested room without reusing another room token', async () => {
  const presenterSource = await readFile(new URL('../app/presenter/page.tsx', import.meta.url), 'utf8');
  const presenterAst = ts.createSourceFile('presenter.tsx', presenterSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let restore;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(presenterAst) === 'useEffect' && node.arguments[0]?.getText(presenterAst).includes('const savedSession')) restore = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(presenterAst);
  assert.ok(restore);
  const script = ts.transpileModule(`const restore = ${restore.getText(presenterAst)}; restore();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const newToken of [null, 'new-room-test-token']) {
    const values = new Map([['presenter_active_session', 'old-room'], ['presenter_token_old-room', 'old-room-test-token']]);
    if (newToken) values.set('presenter_token_new-room', newToken);
    const state = {};
    const bindings = {
      URLSearchParams,
      window: { location: { search: '?session=new-room' }, setTimeout: fn => { fn(); return 1; }, clearTimeout: () => {} },
      sessionStorage: { getItem: key => values.get(key) ?? null }
    };
    for (const name of ['SessionId', 'PresenterToken', 'TeacherOwnedPresenter', 'Connected', 'IsSessionRestored']) bindings[`set${name}`] = value => { state[name] = value; };
    vm.runInNewContext(script, bindings);
    assert.equal(state.SessionId, 'new-room');
    assert.equal(state.PresenterToken, newToken);
    assert.equal(state.TeacherOwnedPresenter, !newToken);
    assert.equal(state.Connected, true);
  }
});
