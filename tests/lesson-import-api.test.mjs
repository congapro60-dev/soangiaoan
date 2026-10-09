import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { createHash } from 'node:crypto';
import * as importTextModule from '../lib/lesson/import/text.js';

async function setupLessonRoute() {
  const dbCalls = [];
  const serviceCalls = [];

  const context = createContext({
    Request,
    Response,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    JSON,
    Object,
    Number,
    Error,
    RegExp,
    Buffer,
    Set,
    Array,
    ReadableStream,
    Date
  });

  const storage = new SyntheticModule(['db', 'stmt', 'getEnv'], function () {
    this.setExport('db', () => ({}));
    this.setExport('stmt', (sql, ...values) => {
      dbCalls.push({ sql, values });
      return { run: async () => ({ meta: { changes: 1 } }) };
    });
    this.setExport('getEnv', () => ({}));
  }, { context });

  const access = new SyntheticModule(['resolveIdentity'], function () {
    this.setExport('resolveIdentity', (request) => {
      const authUser = request.headers.get('oai-authenticated-user-id');
      if (authUser) {
        return {
          user: { userId: authUser, email: `${authUser}@school.edu`, displayName: 'Teacher' },
          isRootUser: false
        };
      }
      return { user: null, isRootUser: false };
    });
  }, { context });

  const service = new SyntheticModule(['createLessonService', 'MAX_PACKAGE_BYTES'], function () {
    this.setExport('createLessonService', () => ({
      savePackage: async (input) => {
        serviceCalls.push({ action: 'savePackage', input });
        return { saved: true };
      },
      approvePackage: async (input) => {
        serviceCalls.push({ action: 'approvePackage', input });
        return { approved: true };
      },
      approvePlan: async (input) => {
        serviceCalls.push({ action: 'approvePlan', input });
        return { approvedPlan: true };
      }
    }));
    this.setExport('MAX_PACKAGE_BYTES', 128 * 1024);
  }, { context });

  const importTextSynthetic = new SyntheticModule([
    'importText',
    'DEFAULT_MAX_BYTES',
    'parseSegments',
    'detectCapability'
  ], function () {
    this.setExport('importText', importTextModule.importText);
    this.setExport('DEFAULT_MAX_BYTES', importTextModule.DEFAULT_MAX_BYTES);
    this.setExport('parseSegments', importTextModule.parseSegments);
    this.setExport('detectCapability', importTextModule.detectCapability);
  }, { context });

  const pilotContent = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  const pilotJsonModule = new SyntheticModule(['default'], function () {
    this.setExport('default', pilotContent);
  }, { context });

  const routeSource = await readFile(new URL('../app/api/lessons/route.js', import.meta.url), 'utf8');
  const route = new SourceTextModule(routeSource, { context });

  await route.link((specifier) => {
    if (specifier.endsWith('storage.js')) return storage;
    if (specifier.endsWith('account-room-access.js')) return access;
    if (specifier.endsWith('service.js')) return service;
    if (specifier.endsWith('text.js')) return importTextSynthetic;
    if (specifier.endsWith('.json')) return pilotJsonModule;
    throw new Error(`Unlinked specifier: ${specifier}`);
  });

  await route.evaluate();

  const callRoute = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('content-type') && options.body && typeof options.body === 'string') {
      headers.set('content-type', 'application/json');
    }
    const init = {
      method: options.method || 'POST',
      headers,
      body: options.body
    };
    if (options.body && typeof options.body !== 'string' && !(options.body instanceof Uint8Array)) {
      init.duplex = 'half';
    }
    const req = new Request(url, init);
    return route.namespace.POST(req);
  };

  return { callRoute, dbCalls, serviceCalls };
}

test('POST /api/lessons/import requires authentication and fails closed with 401', async () => {
  const { callRoute } = await setupLessonRoute();

  // 1. Unauthenticated request without headers
  const res = await callRoute('https://test/api/lessons/import', {
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'lesson.md',
      text: '# Lesson 1'
    })
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'AUTH_REQUIRED');

  // 2. Authenticated request succeeds
  const resAuth = await callRoute('https://test/api/lessons/import', {
    headers: { 'oai-authenticated-user-id': 'teacher-1' },
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'lesson.md',
      text: '# Tiết 1: Dãy số'
    })
  });

  assert.equal(resAuth.status, 200);
  const dataAuth = await resAuth.json();
  assert.equal(dataAuth.status, 'needs_review');
  assert.equal(dataAuth.originalName, 'lesson.md');
});

test('POST /api/lessons/import bounds request body to <= 128 KiB and returns 413 on excess', async () => {
  const { callRoute } = await setupLessonRoute();
  const maxBytes = 128 * 1024; // 131,072 bytes

  // 1. Explicit content-length exceeding 128 KiB
  const oversizeContent = 'A'.repeat(maxBytes + 10);
  const resHeader = await callRoute('https://test/api/lessons/import', {
    headers: {
      'oai-authenticated-user-id': 'teacher-1',
      'content-length': String(maxBytes + 500)
    },
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'oversize.md',
      text: oversizeContent
    })
  });
  assert.equal(resHeader.status, 413);
  assert.equal((await resHeader.json()).error, 'BODY_TOO_LARGE');

  // 2. Body exceeding 128 KiB without content-length header
  const resNoHeader = await callRoute('https://test/api/lessons/import', {
    headers: {
      'oai-authenticated-user-id': 'teacher-1'
    },
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'oversize.md',
      text: 'B'.repeat(maxBytes + 100)
    })
  });
  assert.equal(resNoHeader.status, 413);
  assert.equal((await resNoHeader.json()).error, 'BODY_TOO_LARGE');

  // 3. Streaming body exceeding 128 KiB chunk-by-chunk
  const stream = new ReadableStream({
    start(controller) {
      const chunk = new Uint8Array(64 * 1024); // 64 KiB
      controller.enqueue(chunk);
      controller.enqueue(chunk); // 128 KiB total so far
      controller.enqueue(new Uint8Array(1024)); // 129 KiB -> exceeds 128 KiB!
      controller.close();
    }
  });

  const { callRoute: streamCallRoute } = await setupLessonRoute();
  const resStream = await streamCallRoute('https://test/api/lessons/import', {
    headers: { 'oai-authenticated-user-id': 'teacher-1' },
    body: stream
  });
  assert.equal(resStream.status, 413);

  // 4. Valid size within 128 KiB limit succeeds
  const validSizeText = '# Tiết 1\n' + 'Nội dung bài học hợp lệ.'.repeat(100);
  const resValid = await callRoute('https://test/api/lessons/import', {
    headers: { 'oai-authenticated-user-id': 'teacher-1' },
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'valid-size.md',
      text: validSizeText
    })
  });
  assert.equal(resValid.status, 200);
});

test('POST /api/lessons/import rejects non-JSON, non-object, missing fields and unknown keys strictly', async () => {
  const { callRoute } = await setupLessonRoute();
  const authHeaders = { 'oai-authenticated-user-id': 'teacher-1' };

  // 1. Malformed JSON
  const resBadJson = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: '{"kind": "markdown", invalid json}'
  });
  assert.equal(resBadJson.status, 400);
  assert.equal((await resBadJson.json()).error, 'INVALID_BODY');

  // 2. Non-object body (array)
  const resArray = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify([{ kind: 'markdown' }])
  });
  assert.equal(resArray.status, 400);
  assert.equal((await resArray.json()).error, 'INVALID_BODY');

  // 3. Missing kind
  const resMissingKind = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({ originalName: 'a.md', text: 'hi' })
  });
  assert.equal(resMissingKind.status, 400);
  const dataMissingKind = await resMissingKind.json();
  assert.equal(dataMissingKind.ok, false);
  assert.ok(dataMissingKind.errors.some(e => e.code === 'MISSING_KIND'));

  // 4. Missing originalName
  const resMissingName = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({ kind: 'markdown', text: 'hi' })
  });
  assert.equal(resMissingName.status, 400);
  const dataMissingName = await resMissingName.json();
  assert.ok(dataMissingName.errors.some(e => e.code === 'MISSING_ORIGINAL_NAME'));

  // 5. Missing text
  const resMissingText = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({ kind: 'markdown', originalName: 'a.md' })
  });
  assert.equal(resMissingText.status, 400);
  const dataMissingText = await resMissingText.json();
  assert.ok(dataMissingText.errors.some(e => e.code === 'MISSING_TEXT'));

  // 6. Unknown injected keys strictly rejected
  const resUnknownKey = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'a.md',
      text: 'hi',
      tasks: [{ id: 'injected-task' }],
      learningObjectives: ['injected-lo']
    })
  });
  assert.equal(resUnknownKey.status, 400);
  const dataUnknownKey = await resUnknownKey.json();
  assert.equal(dataUnknownKey.ok, false);
  assert.ok(dataUnknownKey.errors.some(e => e.code === 'UNKNOWN_INPUT_KEY' && e.path === 'tasks'));
  assert.ok(dataUnknownKey.errors.some(e => e.code === 'UNKNOWN_INPUT_KEY' && e.path === 'learningObjectives'));
});

test('POST /api/lessons/import returns explicit unsupported_format for DOCX and PDF inputs', async () => {
  const { callRoute } = await setupLessonRoute();
  const authHeaders = { 'oai-authenticated-user-id': 'teacher-1' };

  // 1. kind declares docx
  const resDocxKind = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'docx',
      originalName: 'lesson.docx',
      text: 'some binary simulation'
    })
  });
  assert.equal(resDocxKind.status, 400);
  const dataDocxKind = await resDocxKind.json();
  assert.equal(dataDocxKind.ok, false);
  assert.equal(dataDocxKind.status, 'unsupported_format');
  assert.equal(dataDocxKind.code, 'unsupported_format');
  assert.equal(dataDocxKind.format, 'docx');
  assert.equal(dataDocxKind.fallback, 'manual_paste');
  assert.equal(dataDocxKind.manualPasteFallback, true);
  assert.match(dataDocxKind.message, /DOCX/);
  assert.match(dataDocxKind.message, /manual paste fallback/);

  // 2. kind declares pdf
  const resPdfKind = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'pdf',
      originalName: 'exam.pdf',
      text: 'binary'
    })
  });
  assert.equal(resPdfKind.status, 400);
  const dataPdfKind = await resPdfKind.json();
  assert.equal(dataPdfKind.status, 'unsupported_format');
  assert.equal(dataPdfKind.format, 'pdf');
  assert.equal(dataPdfKind.manualPasteFallback, true);

  // 3. Filename extension indicates .docx
  const resDocxName = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'lesson-sequences.DOCX',
      text: 'dummy text'
    })
  });
  assert.equal(resDocxName.status, 400);
  const dataDocxName = await resDocxName.json();
  assert.equal(dataDocxName.status, 'unsupported_format');
  assert.equal(dataDocxName.format, 'docx');

  // 4. Filename extension indicates .pdf
  const resPdfName = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'text',
      originalName: 'test-ch3.pdf',
      text: 'dummy text'
    })
  });
  assert.equal(resPdfName.status, 400);
  const dataPdfName = await resPdfName.json();
  assert.equal(dataPdfName.status, 'unsupported_format');
  assert.equal(dataPdfName.format, 'pdf');

  // 5. Binary magic header detected (%PDF-)
  const resPdfMagic = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'text',
      originalName: 'extracted.txt',
      text: '%PDF-1.4\n1 0 obj\n<<>>'
    })
  });
  assert.equal(resPdfMagic.status, 400);
  const dataPdfMagic = await resPdfMagic.json();
  assert.equal(dataPdfMagic.status, 'unsupported_format');
  assert.equal(dataPdfMagic.format, 'pdf');
});

test('POST /api/lessons/import preserves math formulas verbatim and captures math uncertainties without mutating text', async () => {
  const { callRoute } = await setupLessonRoute();
  const authHeaders = { 'oai-authenticated-user-id': 'teacher-1' };

  const markdownWithMath = `# Tiết 1: Dãy số và Giới hạn

Công thức chưa đóng đô la: $u_n = 2n + 1 và tiếp tục câu chữ.

Khối công thức hai đô la chưa đóng:
$$
S_n = \\frac{n(u_1 + u_n)}{2}

Công thức lỗi cú pháp KaTeX: $\\frac{}$ kết thúc.
Công thức hợp lệ: $u_1 = 18$ và $d = 2$.
`;

  const res = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'g11-math.md',
      text: markdownWithMath
    })
  });

  assert.equal(res.status, 200);
  const extraction = await res.json();

  assert.equal(extraction.schemaVersion, '1.0.0');
  assert.equal(extraction.status, 'needs_review');
  assert.equal(extraction.kind, 'markdown');
  assert.equal(extraction.originalName, 'g11-math.md');

  // Verify exact byte hashing
  const expectedHash = createHash('sha256').update(markdownWithMath, 'utf8').digest('hex');
  assert.equal(extraction.sha256, expectedHash);
  assert.equal(extraction.bytes, Buffer.byteLength(markdownWithMath, 'utf8'));

  // Formula strings must remain verbatim without auto-closing
  const p1 = extraction.segments.find(s => s.text.includes('Công thức chưa đóng đô la'));
  assert.ok(p1);
  assert.ok(p1.text.includes('$u_n = 2n + 1 và tiếp tục câu chữ.'));
  assert.doesNotMatch(p1.text, /\$u_n = 2n \+ 1\$/);

  // Uncertainties must record the malformed delimiters and invalid syntax
  assert.ok(Array.isArray(extraction.uncertainties));
  assert.ok(extraction.uncertainties.length >= 3);

  const delimiterUnc = extraction.uncertainties.find(u => (u.kind === 'math_delimiter_malformed' || u.type === 'math_delimiter_malformed') && u.delimiter === '$');
  assert.ok(delimiterUnc);
  assert.ok(delimiterUnc.line >= 1);
  assert.ok(delimiterUnc.offset > 0);

  const syntaxUnc = extraction.uncertainties.find(u => u.kind === 'invalid_math_syntax' || u.type === 'invalid_math_syntax');
  assert.ok(syntaxUnc);
  assert.match(syntaxUnc.message, /LaTeX formula syntax error|KaTeX/i);

  // Invariant: markdownWithMath.slice(start, end) === segment.text
  for (const seg of extraction.segments) {
    assert.equal(markdownWithMath.slice(seg.start, seg.end), seg.text);
  }
});

test('POST /api/lessons/import enforces extraction-only contract (zero auto package / answers / AI / storage)', async () => {
  const { callRoute, dbCalls, serviceCalls } = await setupLessonRoute();
  const authHeaders = { 'oai-authenticated-user-id': 'teacher-1' };

  const inputMarkdown = `# Bài dạy Dãy số
1. Tìm $u_1$ biết $u_n = 3n - 1$.
Đáp án: $u_1 = 2$.`;

  const res = await callRoute('https://test/api/lessons/import', {
    headers: authHeaders,
    body: JSON.stringify({
      kind: 'markdown',
      originalName: 'bai-day.md',
      text: inputMarkdown
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  // 1. Only extraction fields are returned
  const keys = Object.keys(data).sort();
  assert.deepEqual(keys, [
    'bytes',
    'id',
    'kind',
    'originalName',
    'schemaVersion',
    'segments',
    'sha256',
    'status',
    'uncertainties',
    'warnings'
  ].sort());

  // 2. NO invented learning objectives, tasks, or answers
  assert.equal(data.objectives, undefined);
  assert.equal(data.learningObjectives, undefined);
  assert.equal(data.tasks, undefined);
  assert.equal(data.answers, undefined);
  assert.equal(data.answerKey, undefined);
  assert.equal(data.rubric, undefined);
  assert.equal(data.package, undefined);

  // 3. ZERO package service calls (no storage mutation)
  assert.equal(serviceCalls.length, 0);

  // 4. DB was only touched for account upsert (actor resolution), NOT lesson_packages
  const packageInsertCalls = dbCalls.filter(c => c.sql.includes('lesson_packages'));
  assert.equal(packageInsertCalls.length, 0);
});

test('app/api/lessons/import/route.js re-exports POST and dynamic from app/api/lessons/route.js', async () => {
  const source = await readFile(new URL('../app/api/lessons/import/route.js', import.meta.url), 'utf8');
  assert.match(source, /export\s*\{\s*POST,\s*dynamic\s*\}\s*from\s*'\.\.\/route\.js'/);
});
