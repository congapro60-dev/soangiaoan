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
const basis = 'Toán 11 Dãy số: phân biệt dãy hữu hạn/vô hạn và bốn cách biểu diễn; làm việc theo nhóm, recheck cá nhân.';

test('generation runs real workerd D1/R2 with one provider call and durable reload', { timeout: 60000 }, async () => {
  const source = [
    "import {createLessonSourceService} from './lib/lesson/source-service.js';",
    "import {createLessonGenerationService} from './lib/lesson/generation-service.js';",
    "import {generateLessonCandidate} from './lib/lesson/generation-provider.js';",
    "import {importDocx} from './lib/lesson/import/docx.js';",
    "import pilot from './content/lessons/g11-sequences-p1.json';",
    "export default {async fetch(request,env) {",
    "const url=new URL(request.url),owner=url.searchParams.get('owner');",
    "const sourceService=createLessonSourceService({db:env.DB,bucket:env.LESSON_SOURCES,importDocx});",
    "const config={LESSON_AI_ENABLED:'true',LESSON_AI_ENDPOINT:'https://provider.example.invalid/chat',LESSON_AI_MODEL:'test-model',LESSON_AI_API_KEY:'synthetic-secret'};",
    "const generate=async input=>generateLessonCandidate(input,{env:config,fetchImpl:async()=>{",
    "await env.DB.prepare(\"INSERT INTO system_settings(key,value,updated_at) VALUES('generationCalls','1',0) ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1\").run();",
    "const candidate={package:structuredClone(pilot),citations:[...pilot.objectives,...pilot.activities,...pilot.tasks,...pilot.hints,...pilot.evidenceRules].map(entity=>({entityId:entity.id,segmentId:'seg-1',quote:'Toán 11 Dãy số: phân biệt dãy hữu hạn/vô hạn và bốn cách biểu diễn; làm việc theo nhóm, recheck cá nhân.',origin:'adapted'})),uncertainties:[]};",
    "return Response.json({choices:[{message:{content:JSON.stringify(candidate)},finish_reason:'stop'}]});",
    "}});",
    "const jobs=createLessonGenerationService({db:env.DB,sourceService,generate});",
    "try {",
    "if(url.pathname==='/upload') return Response.json({source:await sourceService.upload({ownerAccountId:owner,requestId:'upload',originalName:'source.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:new Uint8Array(await request.arrayBuffer())}),runtime:navigator.userAgent});",
    "const input=request.method==='POST'?await request.json():{};",
    "const job=url.pathname==='/start'?await jobs.start({ownerAccountId:owner,sourceId:input.sourceId,requestId:input.requestId,settings:{slotMinutes:40,subject:'math',grade:11},model:'test-model'}):url.pathname==='/run'?await jobs.run({ownerAccountId:owner,id:input.id,aiConsent:input.aiConsent}):await jobs.get({ownerAccountId:owner,id:url.searchParams.get('id')});",
    "return Response.json({job,runtime:navigator.userAgent});",
    "}catch(error){return Response.json({error:error.message},{status:400});}}};"
  ].join('\n');
  const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: source }, bundle: true, format: 'esm', target: 'es2022', platform: 'neutral', external: ['node:*', 'cloudflare:*'], write: false, conditions: ['workerd', 'worker', 'browser'], mainFields: ['module', 'main'] });
  const mf = new Miniflare({ modules: [{ type: 'ESModule', path: 'worker.js', contents: bundle.outputFiles[0].text }], compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'generation' }, r2Buckets: { LESSON_SOURCES: 'generation' } });
  try {
    const db = await mf.getD1Database('DB');
    for (const file of (await readdir('drizzle')).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort()) for (const sql of (await readFile('drizzle/' + file, 'utf8')).split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)) await db.prepare(sql).run();
    for (const owner of ['teacher-a', 'teacher-b']) await db.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').bind(owner, owner + '@example.invalid', 1).run();
    const bytes = zipSync({ 'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + basis + '</w:t></w:r></w:p></w:body></w:document>') });
    const uploaded = await (await mf.dispatchFetch('https://test/upload?owner=teacher-a', { method: 'POST', body: bytes })).json();
    assert.equal(uploaded.runtime, 'Cloudflare-Workers');
    assert.equal(uploaded.source.status, 'ready');
    const post = async (path, body, owner = 'teacher-a') => (await mf.dispatchFetch('https://test' + path + '?owner=' + owner, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    const starts = await Promise.all(Array.from({ length: 3 }, () => post('/start', { sourceId: uploaded.source.id, requestId: 'same-request' })));
    assert.equal(new Set(starts.map(value => value.job?.id)).size, 1, JSON.stringify(starts));
    const id = starts[0].job.id;
    await Promise.all(Array.from({ length: 3 }, () => post('/run', { id, aiConsent: { confirmed: true, sourceId: uploaded.source.id, sourceSha256: uploaded.source.sha256, parserRevision: uploaded.source.parserRevision, extractionHash: uploaded.source.extractionHash } })));
    const fresh = await (await mf.dispatchFetch('https://test/get?owner=teacher-a&id=' + id)).json();
    assert.equal(fresh.job.status, 'needs_review');
    assert.equal(fresh.job.result.validation.ok, true, JSON.stringify(fresh.job.result.validation.errors));
    assert.equal(fresh.job.result.package.id, 'proposal-' + id);
    assert.equal(fresh.job.result.package.sourceRefs[0].hash, uploaded.source.sha256);
    assert.equal(fresh.job.result.package.sourceRefs[0].verification, 'teacher_review_required');
    assert.equal(Number((await db.prepare("SELECT value FROM system_settings WHERE key='generationCalls'").first()).value), 1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM lesson_generation_jobs').first()).n, 1);
    assert.equal((await (await mf.dispatchFetch('https://test/get?owner=teacher-b&id=' + id)).json()).error, 'NOT_FOUND');
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
    assert.ok(!JSON.stringify(fresh).includes('synthetic-secret'));
  } finally { await mf.dispose(); }
});
