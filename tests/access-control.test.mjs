import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {createContext, SourceTextModule, SyntheticModule} from 'node:vm';
import ts from 'typescript';
import {
  canManageRoom,
  configuredRoot,
  extractSIWCUser,
  isRoot,
  permission,
  publicStudentRoom,
  publicTeacherRoom,
  shouldAudit,
} from '../lib/access-control.js';

const headers = values => new Headers(values);

test('extractSIWCUser parses valid identity headers without dispatch proof', () => {
  const h = headers({
    'oai-authenticated-user-id': 'u1',
    'oai-authenticated-user-email': 'Owner@Example.test',
    'oai-authenticated-user-full-name': 'A%20Owner',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  });
  assert.deepEqual(extractSIWCUser(h), {
    userId: 'u1',
    email: 'owner@example.test',
    fullName: 'A Owner',
    displayName: 'A Owner',
  });
});

test('extractSIWCUser returns null for anonymous visitor and incomplete headers', () => {
  assert.equal(extractSIWCUser(headers({})), null);
  assert.equal(extractSIWCUser(headers({'oai-authenticated-user-id': 'u1'})), null);
  assert.equal(extractSIWCUser(headers({'oai-authenticated-user-email': 'user@example.test'})), null);
  assert.equal(extractSIWCUser(headers({'oai-authenticated-user-id': '  ', 'oai-authenticated-user-email': 'user@example.test'})), null);
  assert.equal(extractSIWCUser(headers({'oai-authenticated-user-id': 'u1', 'oai-authenticated-user-email': '  '})), null);
});

test('extractSIWCUser decodes UTF-8 encoded names and falls back to email if absent', () => {
  const hVietnamese = headers({
    'oai-authenticated-user-id': 'u-vn',
    'oai-authenticated-user-email': 'teacher@truong.edu.vn',
    'oai-authenticated-user-full-name': 'Nguy%E1%BB%85n%20V%C4%83n%20A',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  });
  assert.deepEqual(extractSIWCUser(hVietnamese), {
    userId: 'u-vn',
    email: 'teacher@truong.edu.vn',
    fullName: 'Nguyễn Văn A',
    displayName: 'Nguyễn Văn A',
  });

  const hNoName = headers({
    'oai-authenticated-user-id': 'u-noname',
    'oai-authenticated-user-email': 'noname@example.test',
  });
  assert.deepEqual(extractSIWCUser(hNoName), {
    userId: 'u-noname',
    email: 'noname@example.test',
    fullName: null,
    displayName: 'noname@example.test',
  });
});

test('extractSIWCUser handles malformed and unannounced name encodings gracefully', () => {
  const hMalformed = headers({
    'oai-authenticated-user-id': 'u-malformed',
    'oai-authenticated-user-email': 'malformed@example.test',
    'oai-authenticated-user-full-name': 'Bad%ZZEncoding',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  });
  assert.deepEqual(extractSIWCUser(hMalformed), {
    userId: 'u-malformed',
    email: 'malformed@example.test',
    fullName: null,
    displayName: 'malformed@example.test',
  });

  const hNoEncodingHeader = headers({
    'oai-authenticated-user-id': 'u-no-enc',
    'oai-authenticated-user-email': 'noenc@example.test',
    'oai-authenticated-user-full-name': 'Raw%20Name',
  });
  assert.deepEqual(extractSIWCUser(hNoEncodingHeader), {
    userId: 'u-no-enc',
    email: 'noenc@example.test',
    fullName: null,
    displayName: 'noenc@example.test',
  });
});

test('extractSIWCUser rejects inputs without a headers getter', () => {
  assert.equal(extractSIWCUser({'oai-authenticated-user-id': 'u1', 'oai-authenticated-user-email': 'owner@example.test'}), null);
  assert.equal(extractSIWCUser({body: {userId: 'u1', email: 'owner@example.test'}}), null);
  assert.equal(extractSIWCUser({query: {'oai-authenticated-user-id': 'u1'}}), null);
  assert.equal(extractSIWCUser({cookie: 'user=u1'}), null);
  assert.equal(extractSIWCUser(null), null);
  assert.equal(extractSIWCUser(undefined), null);
  assert.equal(extractSIWCUser('oai-authenticated-user-id=u1'), null);
  assert.equal(extractSIWCUser({get: 'not a function'}), null);
});

test('server adapter app/chatgpt-auth.ts resolves user via mocked next headers', async () => {
  let activeHeaders = new Headers();
  const context = createContext({URL, encodeURIComponent, console});

  const nextHeadersModule = new SyntheticModule(['headers'], function() {
    this.setExport('headers', async () => activeHeaders);
  }, {context, identifier: 'next/headers'});

  let redirectedTo = null;
  const nextNavModule = new SyntheticModule(['redirect'], function() {
    this.setExport('redirect', (url) => {
      redirectedTo = url;
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  }, {context, identifier: 'next/navigation'});

  const accessControlCode = await readFile(resolve('lib/access-control.js'), 'utf8');
  const accessControlModule = new SourceTextModule(accessControlCode, {context, identifier: resolve('lib/access-control.js')});

  const rawAuthTs = await readFile(resolve('app/chatgpt-auth.ts'), 'utf8');
  const transpiledAuthJs = ts.transpileModule(rawAuthTs, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
  const authModule = new SourceTextModule(transpiledAuthJs, {context, identifier: resolve('app/chatgpt-auth.ts')});

  await accessControlModule.link(() => {});
  await accessControlModule.evaluate();
  await nextHeadersModule.link(() => {});
  await nextHeadersModule.evaluate();
  await nextNavModule.link(() => {});
  await nextNavModule.evaluate();

  await authModule.link((specifier) => {
    if (specifier === 'next/headers') return nextHeadersModule;
    if (specifier === 'next/navigation') return nextNavModule;
    if (specifier.includes('access-control')) return accessControlModule;
    throw new Error(`Unexpected specifier ${specifier}`);
  });
  await authModule.evaluate();

  const {getChatGPTUser, requireChatGPTUser, chatGPTSignInPath} = authModule.namespace;

  // 1. Anonymous visitor
  activeHeaders = new Headers();
  assert.equal(await getChatGPTUser(), null);

  await assert.rejects(
    async () => requireChatGPTUser('/dashboard'),
    /NEXT_REDIRECT:\/signin-with-chatgpt\?return_to=%2Fdashboard/
  );
  assert.equal(redirectedTo, chatGPTSignInPath('/dashboard'));

  // Mock the trusted server boundary, not Sites dispatch itself.
  activeHeaders = new Headers({
    'oai-authenticated-user-id': 'chatgpt-user-42',
    'oai-authenticated-user-email': 'teacher@class.test',
    'oai-authenticated-user-full-name': 'Th%E1%BA%A7y%20Gi%C3%A1o',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  });
  const user = await getChatGPTUser();
  assert.equal(user?.userId, 'chatgpt-user-42');
  assert.equal(user?.email, 'teacher@class.test');
  assert.equal(user?.fullName, 'Thầy Giáo');
  assert.equal(user?.displayName, 'Thầy Giáo');

  const requiredUser = await requireChatGPTUser('/dashboard');
  assert.equal(requiredUser.userId, 'chatgpt-user-42');
  assert.equal(requiredUser.email, 'teacher@class.test');
  assert.equal(requiredUser.fullName, 'Thầy Giáo');
  assert.equal(requiredUser.displayName, 'Thầy Giáo');

  // 3. Negative: adapter relies solely on headers(), ignoring body/query/cookie spoof attempts
  activeHeaders = new Headers({cookie: 'userId=u1; email=owner@example.test; role=root'});
  const spoof = {userId: 'u1', email: 'owner@example.test', role: 'root'};
  assert.equal(await getChatGPTUser({body: spoof, query: spoof, role: 'root'}), null);
});

test('root is explicit and permissions fail closed', () => {
  const env = {SITE_OWNER_EMAIL:'owner@example.test',SITE_OWNER_USER_ID:'u1'};
  const user = {userId:'u1',email:'owner@example.test'};
  assert.deepEqual(configuredRoot(env), {email:'owner@example.test',userId:'u1',role:'root'});
  assert.equal(isRoot(user, env), true);
  assert.equal(isRoot({userId:'u2',email:'owner@example.test'}, env), false);
  assert.equal(isRoot({userId:'u1',email:'other@example.test'}, env), false);
  assert.equal(isRoot(user, {}), false);
  assert.equal(configuredRoot({SITE_OWNER_EMAIL: user.email}), null);
  assert.equal(configuredRoot({SITE_OWNER_USER_ID: user.userId}), null);
  assert.equal(permission('root','delete-room',{revoked:true}), false);
  assert.equal(permission('owner','read-room',{isSystemHost:false}), false);
  assert.equal(permission('cohost','delete-room'), false);
  assert.equal(permission('observer','read-room'), true);
  assert.equal(permission('owner','delete-room',{revoked:true}), false);
});

test('room scope and serializers do not leak secrets', () => {
  const room = {id:'r1',code:'ABC123',title:'Room',started:null,mode:'race',ownerAccountId:'u1',role:'owner',admin_hash:'secret',invite_token:'raw'};
  assert.equal(canManageRoom({roomId:'r2',role:'owner'}, 'r1', 'delete-room'), false);
  assert.deepEqual(publicStudentRoom(room), {id:'r1',code:'ABC123',title:'Room',started:null,mode:'race'});
  assert.deepEqual(publicTeacherRoom(room), {id:'r1',code:'ABC123',title:'Room',started:null,mode:'race',ownerAccountId:'u1',role:'owner'});
});

test('audit follows successful CAS result only', () => {
  assert.equal(shouldAudit({meta:{changes:0}}), false);
  assert.equal(shouldAudit({meta:{changes:1}}), true);
});
