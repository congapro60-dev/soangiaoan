import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';

const require = createRequire(import.meta.url);
const wrangler = require.resolve('wrangler');
const { build } = await import(pathToFileURL(require.resolve('esbuild', { paths: [wrangler] })).href);
const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [wrangler] })).href);
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const fixture = text => zipSync({ 'word/document.xml': strToU8(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`) });

test('source service runs with real workerd D1/R2, concurrent replay and integrity checks', { timeout: 60000 }, async () => {
  const bundle = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import {createLessonSourceService} from './lib/lesson/source-service.js';
        import {importDocx} from './lib/lesson/import/docx.js';
        import {importPdf} from './lib/lesson/import/pdf.js';
        export default {async fetch(request,env) {
          const url=new URL(request.url);
          const service=createLessonSourceService({db:env.DB,bucket:env.LESSON_SOURCES,importDocx,importPdf});
          const owner=url.searchParams.get('owner');
          try {
            const source=request.method==='POST' ? await service.upload({ownerAccountId:owner,requestId:url.searchParams.get('request'),originalName:'fixture.docx',mime:request.headers.get('content-type'),bytes:new Uint8Array(await request.arrayBuffer())}) : await service.get(owner,url.searchParams.get('id'));
            return Response.json({source,runtime:navigator.userAgent});
          } catch(error) {return Response.json({error:error.message},{status:400});}
        }};`
    },
    bundle: true, format: 'esm', target: 'es2022', platform: 'neutral', external: ['node:*', 'cloudflare:*'], write: false,
    conditions: ['workerd', 'worker', 'browser'], mainFields: ['module', 'main']
  });
  const mf = new Miniflare({
    modules: [{ type: 'ESModule', path: 'worker.js', contents: bundle.outputFiles[0].text }], compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'],
    d1Databases: { DB: 'source-test' }, r2Buckets: { LESSON_SOURCES: 'source-test' }
  });
  try {
    const db = await mf.getD1Database('DB');
    for (const file of (await readdir('drizzle')).filter(file => /^\d{4}_.*\.sql$/.test(file)).sort()) {
      for (const statement of (await readFile(`drizzle/${file}`, 'utf8')).split('--> statement-breakpoint').map(x => x.trim()).filter(Boolean)) {
        await db.prepare(statement).run();
      }
    }
    for (const owner of ['owner-a', 'owner-b']) await db.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').bind(owner, `${owner}@example.invalid`, 1).run();
    const upload = (requestId, bytes, owner = 'owner-a') => mf.dispatchFetch(`https://test/upload?owner=${owner}&request=${requestId}`, { method: 'POST', headers: { 'content-type': mime }, body: bytes });
    const bytes = fixture('Đối chiếu nguồn');
    const records = await Promise.all(Array.from({ length: 4 }, async () => {
      const response = await upload('same-request', bytes);
      assert.equal(response.bodyUsed, false, 'dispatchFetch must return an unread body');
      return response.json();
    }));
    assert.ok(records.every(record => record.source?.status === 'ready'), JSON.stringify(records));
    assert.ok(records.every(record => record.runtime === 'Cloudflare-Workers'));
    assert.equal(new Set(records.map(record => record.source.id)).size, 1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM lesson_sources WHERE owner_account_id=?').bind('owner-a').first()).n, 1);
    const source = records[0].source;
    assert.match(source.extraction.text, /Đối chiếu nguồn/);
    assert.ok(source.extraction.segments[0].xmlLocation);
    const conflict = await upload('same-request', fixture('Other content'));
    assert.equal((await conflict.json()).error, 'REQUEST_ID_CONFLICT');
    const another = await upload('new-request', bytes);
    assert.equal((await another.json()).source.status, 'ready');
    const foreign = await mf.dispatchFetch(`https://test/source?owner=owner-b&id=${source.id}`);
    assert.equal((await foreign.json()).error, 'NOT_FOUND');
    const bucket = await mf.getR2Bucket('LESSON_SOURCES');
    const originalKey = `lesson-source/${source.id}/original`;
    const original = await bucket.get(originalKey);
    assert.deepEqual(new Uint8Array(await original.arrayBuffer()), bytes);
    assert.equal(await bucket.put(originalKey, new Uint8Array([1]), { onlyIf: { etagDoesNotMatch: '*' } }), null);
    await bucket.put(`lesson-source/${source.id}/extraction`, 'corrupt retained object');
    const corrupt = await mf.dispatchFetch(`https://test/source?owner=owner-a&id=${source.id}`);
    assert.equal((await corrupt.json()).error, 'SOURCE_STORAGE_UNAVAILABLE');
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
  } finally {
    await mf.dispose();
  }
});
