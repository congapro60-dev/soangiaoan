import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createLessonSourceService} from '../lib/lesson/source-service.js';
import {importDocx} from '../lib/lesson/import/docx.js';
import {importPdf} from '../lib/lesson/import/pdf.js';
import {importText} from '../lib/lesson/import/text.js';
import {zipSync,strToU8} from 'fflate';

const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql','0008_striped_wallflower.sql','0009_approved_session_plans.sql','0010_lesson_sources.sql','0011_unknown_sebastian_shaw.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run('teacher-a','a@test','A',1);
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run('teacher-b','b@test','B',1);
const stmt=(sql,...args)=>{const q=database.prepare(sql);return {first:()=>q.get(...args)??null,all:()=>({results:q.all(...args)}),run:()=>({meta:{changes:Number(q.run(...args).changes)}})}};
const objects=new Map();
const bucket={async put(key,value,options={}){if(options.onlyIf?.etagDoesNotMatch==='*'&&objects.has(key))return null;objects.set(key,new Uint8Array(value));return {key};},async head(key){return objects.has(key)?{key}:null;},async get(key){const value=objects.get(key);return value?{size:value.byteLength,async arrayBuffer(){return value.slice().buffer;},async text(){return new TextDecoder().decode(value);}}:null;}};
const context=createContext({Date,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,TextDecoder,console});
const env={LESSON_SOURCES:bucket};const cache=new Map();
// Supply D1's prepare/bind interface, not an empty database object.
const d1={prepare:sql=>({bind:(...args)=>stmt(sql,...args)})};
async function moduleAt(path){if(cache.has(path))return cache.get(path);let mod;const normalized=path.replaceAll('\\','/');if(resolve(path)===resolve('lib/storage.js'))mod=new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',stmt);this.setExport('db',()=>({}));this.setExport('getEnv',()=>env);},{context,identifier:path});else if(resolve(path)===resolve('lib/account-room-access.js'))mod=new SyntheticModule(['resolveIdentity'],function(){this.setExport('resolveIdentity',(req)=>{const id=req.headers.get('x-test-user');return {user:id?{userId:id,email:id+'@test'}:null,isRootUser:false};});},{context,identifier:path});else if(normalized.endsWith('/lib/lesson/import/text.js'))mod=new SyntheticModule(['importText'],function(){this.setExport('importText',importText);},{context,identifier:path});else if(normalized.endsWith('/lib/lesson/import/docx.js'))mod=new SyntheticModule(['importDocx'],function(){this.setExport('importDocx',({bytes,originalName})=>({ok:true,status:'needs_review',sha256:'docx',bytes:bytes.byteLength,originalName,segments:[{text:'DOCX'}],uncertainties:[]}));},{context,identifier:path});else if(normalized.endsWith('/lib/lesson/import/pdf.js'))mod=new SyntheticModule(['importPdf'],function(){this.setExport('importPdf',async({bytes,originalName})=>({ok:true,status:'needs_review',sha256:'pdf',bytes:bytes.byteLength,originalName,segments:[],uncertainties:[{code:'OCR_REQUIRED',pageNumber:1}]}));},{context,identifier:path});else mod=new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,mod);return mod;}
const storagePath=resolve('lib/storage.js');
cache.set(storagePath,new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',stmt);this.setExport('db',()=>d1);this.setExport('getEnv',()=>env);},{context,identifier:storagePath}));
const entry=await moduleAt(resolve('app/api/lessons/sources/route.js'));await entry.link((specifier,parent)=>moduleAt(resolve(dirname(parent.identifier),specifier)));await entry.evaluate();const route=entry.namespace;
const request=(user,bytes,mime='application/pdf',requestId='r1',name='x.pdf')=>new Request('https://x.test/api/lessons/sources',{method:'POST',headers:{'x-test-user':user,'x-request-id':requestId,'x-file-name':name,'content-type':mime,'content-length':String(bytes.byteLength)},body:bytes});
assert.equal((await route.POST(new Request('https://x.test/api/lessons/sources',{method:'POST',body:new Uint8Array([1])}))).status,401);
const pdf=new TextEncoder().encode('%PDF-hello');let response=await route.POST(request('teacher-a',pdf));assert.equal(response.status,201,await response.clone().text());const first=(await response.json()).source;assert.equal(first.status,'ready');assert.deepEqual(first.extraction.uncertainties,[{code:'OCR_REQUIRED',pageNumber:1}]);
response=await route.POST(request('teacher-a',pdf,'application/pdf','r1'));assert.equal(response.status,201);assert.equal((await response.json()).source.id,first.id);
response=await route.POST(request('teacher-a',pdf,'application/pdf','r-same-bytes','renamed.pdf'));assert.equal(response.status,201);assert.notEqual((await response.json()).source.id,first.id);
response=await route.POST(request('teacher-a',new TextEncoder().encode('%PDF-other'),'application/pdf','r1'));assert.equal(response.status,409);
assert.equal((await route.GET(new Request(`https://x.test/api/lessons/sources?id=${first.id}`,{headers:{'x-test-user':'teacher-b'}}))).status,404);
assert.equal((await route.GET(new Request(`https://x.test/api/lessons/sources?id=${first.id}`,{headers:{'x-test-user':'teacher-a'}}))).status,200);
assert.equal((await route.POST(request('teacher-a',new Uint8Array([1,2,3]),'application/pdf','r2'))).status,415);
console.log('Lesson source route: auth, owner isolation, signature, idempotency, conflict, OCR_REQUIRED projection and private reload passed.');

// Streaming limits apply independently of declared length and client limit overrides.
for(const declared of [null,'1',String(10*1024*1024+1)]){
  const headers={'x-test-user':'teacher-a','x-request-id':'overflow','content-type':'application/pdf','x-max-bytes':'999999999'};
  if(declared!==null)headers['content-length']=declared;
  let cancelled=false;
  const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}});
  const result=await route.POST(new Request('https://x.test/api/lessons/sources?maxBytes=999999999',{method:'POST',headers,body:stream,duplex:'half'}));
  assert.equal(result.status,413);
  assert.deepEqual(await result.json(),{error:'BODY_TOO_LARGE'});
  if(declared!==String(10*1024*1024+1))assert.equal(cancelled,true);
  assert.equal(database.prepare("SELECT count(*) n FROM lesson_sources WHERE request_id='overflow'").get().n,0);
}
const missing=request('teacher-b',pdf,'application/pdf','missing-length');missing.headers.delete('content-length');
assert.equal((await route.POST(missing)).status,201);
const short=request('teacher-a',new Uint8Array([80,75,0,0]),'application/vnd.openxmlformats-officedocument.wordprocessingml.document','short-zip');
assert.equal((await route.POST(short)).status,415);
for(const kind of ['student','presenter']){
  assert.equal((await route.GET(new Request(`https://x.test/api/lessons/sources?kind=${kind}&id=${first.id}`,{headers:{authorization:'Bearer learner-or-presenter-token'}}))).status,401);
}
const reload=await route.GET(new Request(`https://x.test/api/lessons/sources?id=${first.id}`,{headers:{'x-test-user':'teacher-a'}}));
assert.equal(reload.headers.get('cache-control'),'no-store');
const projection=await reload.json();
for(const secret of ['lesson-source/','request_fingerprint','requestId','owner_account_id','originalKey','extractionKey'])assert.equal(JSON.stringify(projection).includes(secret),false);

// Exercise production parsers with SQLite and the same R2 contract, not canned statuses.
const api=createLessonSourceService({db:d1,bucket,importDocx,importPdf});
const docx=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Exact source text</w:t></w:r></w:p></w:body></w:document>')});
const upload={ownerAccountId:'teacher-a',requestId:'real-docx',originalName:'source.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:docx};
const parsed=importDocx({bytes:docx,originalName:'source.docx'});
assert.equal(parsed.ok,true);
const doc=await api.upload(upload);assert.equal(doc.status,'ready');assert.equal(doc.extraction.status,'needs_review');
assert.equal(doc.extraction.text,parsed.text);
assert.deepEqual(doc.extraction.segments[0].xmlLocation,parsed.segments[0].xmlLocation);
assert.deepEqual(await api.get('teacher-a',doc.id),doc);
// Typed lesson briefs (text/plain) go through the same storage and become a ready source only when importText is wired.
const brief=new TextEncoder().encode('Toán 11 KNTT, Bài 6 Cấp số cộng, mục 1.\nYêu cầu cần đạt: nhận biết cấp số cộng.');
await assert.rejects(api.upload({ownerAccountId:'teacher-a',requestId:'typed-off',originalName:'noi-dung.txt',mime:'text/plain',bytes:brief}),/INVALID_MIME/);
const apiText=createLessonSourceService({db:d1,bucket,importDocx,importPdf,importText});
const typed=await apiText.upload({ownerAccountId:'teacher-a',requestId:'typed-brief',originalName:'noi-dung.txt',mime:'text/plain',bytes:brief});
assert.equal(typed.status,'ready');assert.match(typed.extraction.segments.map(s=>s.text).join(' '),/Cấp số cộng/);
for (const [variant, text] of [['nfd', 'Toán 11: nhận biết dãy số.'.normalize('NFD')], ['bom', '\ufeffToán 11: nhận biết dãy số.']]) {
  const bytes = new TextEncoder().encode(text);
  const source = await apiText.upload({ownerAccountId:'teacher-a',requestId:'typed-'+variant,originalName:'x.txt',mime:'text/plain',bytes});
  assert.equal(source.status, 'ready');
  assert.equal(source.extraction.sha256, source.sha256, variant + ' must preserve the source hash used by proposal validation');
  assert.equal(source.extraction.bytes, bytes.length);
  assert.deepEqual((await apiText.downloadOriginal('teacher-a', source.id)).bytes, bytes);
}
await assert.rejects(apiText.upload({ownerAccountId:'teacher-a',requestId:'typed-bad',originalName:'x.txt',mime:'text/plain',bytes:new Uint8Array([0xff,0xfe,0x00])}),/INVALID_SIGNATURE/);
const originalRequest = id => new Request(`https://x.test/api/lessons/sources?id=${id}&download=original`, {headers: {'x-test-user': 'teacher-a'}});
const download = await route.GET(originalRequest(doc.id));
assert.equal(download.status, 200);
assert.equal(download.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
assert.equal(download.headers.get('cache-control'), 'no-store');
assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
assert.equal(download.headers.get('content-length'), String(docx.byteLength));
assert.match(download.headers.get('content-disposition'), /^attachment;/);
assert.deepEqual(new Uint8Array(await download.arrayBuffer()), docx);
assert.equal((await route.GET(new Request(`https://x.test/api/lessons/sources?id=${doc.id}&download=original`, {headers: {'x-test-user': 'teacher-b'}}))).status, 404);
assert.equal((await route.GET(new Request(`https://x.test/api/lessons/sources?id=${doc.id}&download=original`, {headers: {authorization: 'Bearer student-token'}}))).status, 401);
assert.equal((await route.GET(originalRequest('missing-source'))).status, 404);
const originalKey = `lesson-source/${doc.id}/original`;
const originalBytes = objects.get(originalKey);
objects.set(originalKey, new TextEncoder().encode('corrupted stored bytes'));
const corruptedDownload = await route.GET(originalRequest(doc.id));
assert.equal(corruptedDownload.status, 503);
assert.deepEqual(await corruptedDownload.json(), {error: 'SOURCE_UNAVAILABLE'});
objects.delete(originalKey);
assert.equal((await route.GET(originalRequest(doc.id))).status, 503);
objects.set(originalKey, originalBytes);
const namedSource = await api.upload({...upload, requestId: 'unicode-name', originalName: "Dãy số O'Brien (1)*.docx"});
const namedDownload = await route.GET(originalRequest(namedSource.id));
assert.equal(namedDownload.status, 200);
assert.match(namedDownload.headers.get('content-disposition'), /filename\*=UTF-8''D%C3%A3y%20s%E1%BB%91%20O%27Brien%20%281%29_.docx$/);
assert.deepEqual(new Uint8Array(await namedDownload.arrayBuffer()), docx);
const malformed=await api.upload({ownerAccountId:'teacher-a',requestId:'bad-pdf',originalName:'bad.pdf',mime:'application/pdf',bytes:new TextEncoder().encode('%PDF-1.7 broken')});
assert.equal(malformed.status,'failed');assert.equal(malformed.errorCode,'CORRUPTED_PDF');
assert(objects.has(`lesson-source/${malformed.id}/original`));
assert.equal(objects.has(`lesson-source/${malformed.id}/extraction`),false);
assert.deepEqual(await api.get('teacher-a',malformed.id),malformed);
assert.deepEqual(new Uint8Array(await (await route.GET(originalRequest(malformed.id))).arrayBuffer()), new TextEncoder().encode('%PDF-1.7 broken'));
const brokenDoc=await api.upload({...upload,requestId:'bad-docx',bytes:new Uint8Array([80,75,3,4,0])});
assert.equal(brokenDoc.status,'failed');assert.equal(brokenDoc.errorCode,'PARSE_FAILED');
assert(objects.has(`lesson-source/${brokenDoc.id}/original`));

// Inject original/extraction R2 failures. The reservation survives, but ready cannot publish.
for(const phase of ['original','extraction']){
  let failing=true;
  const failingBucket={...bucket,async put(key,value,options){if(failing&&key.endsWith('/'+phase))throw Error('private storage path /secret');return bucket.put(key,value,options);}};
  const recovery=createLessonSourceService({db:d1,bucket:failingBucket,importDocx,importPdf});
  const input={...upload,ownerAccountId:phase==='original'?'teacher-b':'teacher-a',requestId:'retry-'+phase,bytes:zipSync({'word/document.xml':strToU8(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${phase}</w:t></w:r></w:p></w:body></w:document>`)})};
  await assert.rejects(recovery.upload(input),/SOURCE_STORAGE_UNAVAILABLE/);
  const reserved=database.prepare('SELECT * FROM lesson_sources WHERE request_id=?').get(input.requestId);
  assert.equal(reserved.status,'pending');assert.equal(reserved.extraction_hash,null);
  failing=false;
  const recovered=await recovery.upload(input);assert.equal(recovered.id,reserved.id);assert.equal(recovered.status,'ready');
  assert.deepEqual(await recovery.upload(input),recovered);
}
assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
const snapshot=JSON.parse(await readFile('drizzle/meta/0011_snapshot.json','utf8'));
const previous=JSON.parse(await readFile('drizzle/meta/0010_snapshot.json','utf8'));
assert.equal(snapshot.prevId,previous.id);assert.equal(journal.entries.find(entry=>entry.idx===11).tag,'0011_unknown_sebastian_shaw');assert.equal(journal.entries.find(entry=>entry.idx===11).version,snapshot.version);
for(const table of ['lesson_sources','lesson_package_sources']){
  assert.deepEqual(database.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name).sort(),Object.keys(snapshot.tables[table].columns).sort());
  assert.deepEqual(database.prepare(`PRAGMA index_list(${table})`).all().filter(x=>x.origin==='c').map(x=>x.name).sort(),Object.keys(snapshot.tables[table].indexes).sort());
}
console.log('Source regressions: streaming limits, private reload, real DOCX/corrupt PDF, retained failures, R2 retry and migration metadata passed.');
