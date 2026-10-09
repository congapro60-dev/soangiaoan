import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

async function createRouteHarness(options = {}) {
  const {
    identityUser = { userId: 'teacher-1', email: 'teacher@school.edu', displayName: 'Teacher 1' },
    isRootUser = false,
    serviceImpl = {},
    stmtImpl = null
  } = options;

  const context = createContext({
    Request,
    Response,
    Headers,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    JSON,
    Object,
    Number,
    Error,
    TypeError,
    RangeError,
    RegExp,
    Buffer,
    Set,
    Array,
    ReadableStream,
    Date
  });

  const storageModule = new SyntheticModule(['db', 'stmt', 'getEnv'], function () {
    this.setExport('db', () => ({}));
    this.setExport('stmt', (sql, ...values) => {
      if (stmtImpl) return stmtImpl(sql, ...values);
      return { run: async () => ({ meta: { changes: 1 } }) };
    });
    this.setExport('getEnv', () => ({}));
  }, { context });

  const accessModule = new SyntheticModule(['resolveIdentity'], function () {
    this.setExport('resolveIdentity', (request) => {
      const hasAuth = request.headers.get('oai-authenticated-user-id');
      if (hasAuth && identityUser) {
        return { user: identityUser, isRootUser };
      }
      return { user: null, isRootUser: false };
    });
  }, { context });

  const serviceModule = new SyntheticModule(['createLessonService', 'MAX_PACKAGE_BYTES'], function () {
    this.setExport('createLessonService', () => ({
      savePackage: async (arg) => {
        if (serviceImpl.savePackage) return serviceImpl.savePackage(arg);
        return { saved: true };
      },
      approvePackage: async (arg) => {
        if (serviceImpl.approvePackage) return serviceImpl.approvePackage(arg);
        return { approved: true };
      },
      approvePlan: async (arg) => {
        if (serviceImpl.approvePlan) return serviceImpl.approvePlan(arg);
        return { approvedPlan: true };
      },
      listPackages: async (arg) => {
        if (serviceImpl.listPackages) return serviceImpl.listPackages(arg);
        return [];
      },
      getPackage: async (arg) => {
        if (serviceImpl.getPackage) return serviceImpl.getPackage(arg);
        return { id: arg.id };
      },
      getDirectorDraft: async (arg) => {
        if (serviceImpl.getDirectorDraft) return serviceImpl.getDirectorDraft(arg);
        return {};
      }
    }));
    this.setExport('MAX_PACKAGE_BYTES', 128 * 1024);
  }, { context });

  const importTextModule = new SyntheticModule(['importText'], function () {
    this.setExport('importText', () => ({ ok: true, segments: [] }));
  }, { context });

  const pilotJsonModule = new SyntheticModule(['default'], function () {
    this.setExport('default', { id: 'pilot' });
  }, { context });

  const routeSource = await readFile(new URL('../app/api/lessons/route.js', import.meta.url), 'utf8');
  const route = new SourceTextModule(routeSource, { context });

  await route.link((specifier) => {
    if (specifier.endsWith('storage.js')) return storageModule;
    if (specifier.endsWith('account-room-access.js')) return accessModule;
    if (specifier.endsWith('service.js')) return serviceModule;
    if (specifier.endsWith('text.js')) return importTextModule;
    if (specifier.endsWith('.json')) return pilotJsonModule;
    throw new Error(`Unlinked specifier: ${specifier}`);
  });

  await route.evaluate();

  const post = async (body, opts = {}) => {
    const headers = new Headers(opts.headers || {
      'content-type': 'application/json',
      'oai-authenticated-user-id': 'teacher-1'
    });
    const init = {
      method: 'POST',
      headers
    };
    if (body instanceof ReadableStream) {
      init.body = body;
      init.duplex = 'half';
    } else if (typeof body === 'string') {
      init.body = body;
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const req = new Request(opts.url || 'https://site.test/api/lessons', init);
    return route.namespace.POST(req);
  };

  return { post, route };
}

for (const message of ['toString', 'constructor', '__proto__']) {
  test(`POST /api/lessons: Error("${message}") returns generic 503 without throwing or leaking`, async () => {
    const { post } = await createRouteHarness({
      serviceImpl: {
        savePackage: async () => { throw new Error(message); }
      }
    });

    const res = await post({ action: 'save', package: {} });
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const rawText = await res.text();
    assert.equal(rawText.includes(message), false);
    assert.deepEqual(JSON.parse(rawText), { error: 'LESSON_UNAVAILABLE' });
  });
}

test('POST /api/lessons: DB SQL syntax error during savePackage masks raw error and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new Error('SqliteError: near "FROM": syntax error in SELECT secret_col FROM table_internal WHERE id=123');
      }
    }
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('cache-control'), 'no-store');

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /SqliteError|syntax error|secret_col|table_internal/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: local filesystem path error during savePackage masks paths and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new Error('ENOENT: no such file or directory, open "C:\\Users\\Administrator\\data\\secure.sqlite"');
      }
    }
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 503);

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /ENOENT|Administrator|secure\.sqlite/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: internal TypeError masks stack/property info and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new TypeError('Cannot read properties of undefined (reading "manifestPath") at Object.savePackage (/app/service.js:89:12)');
      }
    }
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 503);

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /TypeError|criticalField|manifestPath|service\.js/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: DB error during account upsert masks SQL and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    stmtImpl: () => ({
      run: async () => {
        throw new Error('SqliteError: disk I/O error while writing to /var/data/users.db');
      }
    })
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 503);

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /SqliteError|disk I\/O|users\.db/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: DB SQL/path error during approve masks raw data and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      approvePackage: async () => {
        throw new Error('SqliteError: foreign key violation in /srv/data/lessons.sqlite on table lesson_approvals');
      }
    }
  });

  const res = await post({
    action: 'approve',
    id: 'p1',
    parentHash: 'h0',
    version: '1.0.0',
    sourceReviewAck: [],
    notes: 'approved'
  });
  assert.equal(res.status, 503);

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /lessons\.sqlite|lesson_approvals|foreign key/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: DB SQL/path error during approve-plan masks raw data and returns 503 LESSON_UNAVAILABLE', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      approvePlan: async () => {
        throw new Error('SqliteError: database is locked /var/lib/data/session_plans.db');
      }
    }
  });

  const res = await post({
    action: 'approve-plan',
    packageRowId: 'row-1',
    packageVersion: '1.0.0',
    packageHash: 'pkg-hash',
    planHash: 'plan-hash',
    sourceReview: []
  });
  assert.equal(res.status, 503);

  const rawText = await res.text();
  assert.doesNotMatch(rawText, /database is locked|session_plans\.db/i);

  const json = JSON.parse(rawText);
  assert.deepEqual(json, { error: 'LESSON_UNAVAILABLE' });
});

test('POST /api/lessons: preserves INVALID_PACKAGE structured validation errors with 400 status', async () => {
  const validationErrors = [
    { code: 'INVALID_TITLE', path: 'title', message: 'Title is required' },
    { code: 'INVALID_OBJECTIVES', path: 'objectives', message: 'At least one objective is required' }
  ];
  const { post } = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw Object.assign(new Error('INVALID_PACKAGE'), { validationErrors });
      }
    }
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.deepEqual(body, {
    error: 'INVALID_PACKAGE',
    errors: validationErrors
  });
});

test('POST /api/lessons: preserves plain INVALID_PACKAGE without validation errors with 400 status', async () => {
  const { post } = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new Error('INVALID_PACKAGE');
      }
    }
  });

  const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.deepEqual(body, { error: 'INVALID_PACKAGE' });
});

test('POST /api/lessons: recognized conflict errors retain exact semantics and 409 status', async () => {
  // 1. DUPLICATE_VERSION
  const harness1 = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new Error('DUPLICATE_VERSION');
      }
    }
  });
  const res1 = await harness1.post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(res1.status, 409);
  assert.deepEqual(await res1.json(), { error: 'DUPLICATE_VERSION' });

  // 2. APPROVAL_CONFLICT
  const harness2 = await createRouteHarness({
    serviceImpl: {
      approvePackage: async () => {
        throw new Error('APPROVAL_CONFLICT');
      }
    }
  });
  const res2 = await harness2.post({
    action: 'approve',
    id: 'p1',
    parentHash: 'h0',
    version: '1.0.0',
    sourceReviewAck: [],
    notes: ''
  });
  assert.equal(res2.status, 409);
  assert.deepEqual(await res2.json(), { error: 'APPROVAL_CONFLICT' });

  // 3. SOURCE_ACK_MISMATCH
  const harness3 = await createRouteHarness({
    serviceImpl: {
      approvePackage: async () => {
        throw new Error('SOURCE_ACK_MISMATCH');
      }
    }
  });
  const res3 = await harness3.post({
    action: 'approve',
    id: 'p1',
    parentHash: 'h0',
    version: '1.0.0',
    sourceReviewAck: [],
    notes: ''
  });
  assert.equal(res3.status, 409);
  assert.deepEqual(await res3.json(), { error: 'SOURCE_ACK_MISMATCH' });
});

test('POST /api/lessons: recognized body errors retain exact semantics (413 BODY_TOO_LARGE, 400 INVALID_BODY)', async () => {
  const { post } = await createRouteHarness();

  // 1. Oversized body -> 413 BODY_TOO_LARGE
  const bigPayload = 'x'.repeat(128 * 1024 + 10);
  const resBig = await post(bigPayload, {
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(bigPayload).byteLength),
      'oai-authenticated-user-id': 'teacher-1'
    }
  });
  assert.equal(resBig.status, 413);
  assert.deepEqual(await resBig.json(), { error: 'BODY_TOO_LARGE' });

  // 2. Malformed JSON -> 400 INVALID_BODY
  const resBadJson = await post('{ not-valid-json', {
    headers: {
      'content-type': 'application/json',
      'oai-authenticated-user-id': 'teacher-1'
    }
  });
  assert.equal(resBadJson.status, 400);
  assert.deepEqual(await resBadJson.json(), { error: 'INVALID_BODY' });

  // 3. Array body -> 400 INVALID_BODY
  const resArray = await post([1, 2, 3]);
  assert.equal(resArray.status, 400);
  assert.deepEqual(await resArray.json(), { error: 'INVALID_BODY' });

  // 4. Unknown action -> 400 INVALID_BODY
  const resUnknownAction = await post({ action: 'unknown-action' });
  assert.equal(resUnknownAction.status, 400);
  assert.deepEqual(await resUnknownAction.json(), { error: 'INVALID_BODY' });
});

test('POST /api/lessons: recognized auth errors retain exact semantics (401 AUTH_REQUIRED, 403 FORBIDDEN)', async () => {
  // 1. Missing authentication header -> 401 AUTH_REQUIRED
  const { post } = await createRouteHarness();
  const resUnauth = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } }, {
    headers: { 'content-type': 'application/json' }
  });
  assert.equal(resUnauth.status, 401);
  assert.deepEqual(await resUnauth.json(), { error: 'AUTH_REQUIRED' });

  // 2. FORBIDDEN thrown from service -> 403 FORBIDDEN
  const harnessForbidden = await createRouteHarness({
    serviceImpl: {
      savePackage: async () => {
        throw new Error('FORBIDDEN');
      }
    }
  });
  const resForbidden = await harnessForbidden.post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
  assert.equal(resForbidden.status, 403);
  assert.deepEqual(await resForbidden.json(), { error: 'FORBIDDEN' });
});

test('POST /api/lessons: recognized service contract errors retain exact semantics and statuses', async () => {
  const cases = [
    { code: 'INVALID_PACKAGE_STATUS', expectedStatus: 400, action: 'save', payload: { action: 'save', package: {} } },
    { code: 'INVALID_APPROVAL', expectedStatus: 400, action: 'approve', payload: { action: 'approve', id: '1', parentHash: 'h', version: '1.0.0', sourceReviewAck: [], notes: '' } },
    { code: 'INVALID_APPROVED_PACKAGE', expectedStatus: 400, action: 'approve', payload: { action: 'approve', id: '1', parentHash: 'h', version: '1.0.0', sourceReviewAck: [], notes: '' } },
    { code: 'SOURCE_REVIEW_REQUIRED', expectedStatus: 400, action: 'approve-plan', payload: { action: 'approve-plan', packageRowId: '1', packageVersion: '1.0.0', packageHash: 'h1', planHash: 'h2', sourceReview: [] } },
    { code: 'PLAN_HASH_MISMATCH', expectedStatus: 400, action: 'approve-plan', payload: { action: 'approve-plan', packageRowId: '1', packageVersion: '1.0.0', packageHash: 'h1', planHash: 'h2', sourceReview: [] } },
    { code: 'INVALID_APPROVED_PLAN', expectedStatus: 400, action: 'approve-plan', payload: { action: 'approve-plan', packageRowId: '1', packageVersion: '1.0.0', packageHash: 'h1', planHash: 'h2', sourceReview: [] } },
    { code: 'NOT_FOUND', expectedStatus: 404, action: 'approve', payload: { action: 'approve', id: '1', parentHash: 'h', version: '1.0.0', sourceReviewAck: [], notes: '' } }
  ];

  for (const { code, expectedStatus, action, payload } of cases) {
    const harness = await createRouteHarness({
      serviceImpl: {
        savePackage: async () => { throw new Error(code); },
        approvePackage: async () => { throw new Error(code); },
        approvePlan: async () => { throw new Error(code); }
      }
    });
    const res = await harness.post(payload);
    assert.equal(res.status, expectedStatus, `Expected status ${expectedStatus} for ${code}, got ${res.status}`);
    const body = await res.json();
    assert.deepEqual(body, { error: code });
  }
});

test('POST /api/lessons: no raw error details or logs are printed to console on failure', async () => {
  const logged = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => { logged.push({ type: 'log', args }); };
  console.error = (...args) => { logged.push({ type: 'error', args }); };
  console.warn = (...args) => { logged.push({ type: 'warn', args }); };

  try {
    const { post } = await createRouteHarness({
      serviceImpl: {
        savePackage: async () => {
          throw new Error('SqliteError: syntax error table leak /secret/db.sqlite');
        }
      }
    });

    const res = await post({ action: 'save', package: { id: 'pkg-1', version: '1.0.0' } });
    assert.equal(res.status, 503);

    // Verify nothing containing SQL/path was logged
    const joinedLogs = JSON.stringify(logged);
    assert.doesNotMatch(joinedLogs, /SqliteError|secret|table leak/i);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
});
