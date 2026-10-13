import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createContext,SourceTextModule,SyntheticModule} from 'node:vm';
const raw=new DatabaseSync(':memory:');
for(const item of JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries)raw.exec(readFileSync('drizzle/'+item.tag+'.sql','utf8'));
const prepare=sql=>({bind:(...args)=>({first:async()=>raw.prepare(sql).get(...args)||null,all:async()=>({results:raw.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(raw.prepare(sql).run(...args).changes)}})})});
const db={prepare,batch:async statements=>{raw.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
const env={SITE_OWNER_EMAIL:'root@example.invalid',SITE_OWNER_USER_ID:'root'};
const context=createContext({crypto:globalThis.crypto,Request,Response,URL,TextEncoder,TextDecoder,console,structuredClone,Buffer,setTimeout,clearTimeout,performance,btoa,atob});
const cache=new Map();
function moduleAt(path){if(cache.has(path))return cache.get(path);let m;
 if(path===resolve('lib/storage.js'))m=new SyntheticModule(['db','getEnv','stmt'],function(){this.setExport('db',()=>db);this.setExport('getEnv',()=>env);this.setExport('stmt',(sql,...args)=>prepare(sql).bind(...args));},{context,identifier:path});
 else if(path.endsWith('.json'))m=new SyntheticModule(['default'],function(){this.setExport('default',JSON.parse(readFileSync(path,'utf8')));},{context,identifier:path});
 else m=new SourceTextModule(readFileSync(path,'utf8'),{context,identifier:path});cache.set(path,m);return m;}
const builtins=new Map();
const entry=moduleAt(resolve('app/api/trash/route.js'));await entry.link(async(name,parent)=>{
 if(name.startsWith('.'))return moduleAt(resolve(dirname(parent.identifier),name));
 if(!builtins.has(name)){const mod=await import(name);builtins.set(name,new SyntheticModule(Object.keys(mod),function(){for(const [key,value] of Object.entries(mod))this.setExport(key,value);},{context,identifier:name}));}return builtins.get(name);
});await entry.evaluate();
const headers=owner=>owner?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.invalid'}:{};
const post=async(owner,body,extra={})=>{const response=await entry.namespace.POST(new Request('https://site.invalid/api/trash',{method:'POST',headers:{'Content-Type':'application/json',...headers(owner),...extra},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};};
raw.exec("INSERT INTO accounts(id,email,created_at) VALUES('owner','owner@example.invalid',1),('other','other@example.invalid',1);INSERT INTO rooms(id,code,admin_hash,title,created,owner_account_id,deleted_at,revision) VALUES('room','ABC234','private','QA',1,'owner',20,1);");
raw.prepare("INSERT INTO site_trash VALUES('room','room','owner',20,?)").run(JSON.stringify({title:'QA',revision:1,privateAnswer:'HIDDEN'}));
test('common Trash API scopes owner metadata and validates restore without trusting body authority',async()=>{
 const anonymous=await entry.namespace.GET(new Request('https://site.invalid/api/trash'));assert.equal(anonymous.status,401);
 const list=await entry.namespace.GET(new Request('https://site.invalid/api/trash',{headers:headers('owner')}));const data=await list.json();assert.equal(data.items.length,1);assert(!JSON.stringify(data).includes('HIDDEN'));
 assert.equal((await post('other',{action:'restore',kind:'room',id:'room'})).status,404);
 assert.equal((await post('owner',{action:'restore',kind:'room',id:'room',ownerAccountId:'other'})).status,400);
 assert.equal((await post('owner',{action:'restore',kind:'room',id:'room'},{Origin:'https://other.invalid'})).status,403);
 const restored=await post('owner',{action:'restore',kind:'room',id:'room'});assert.equal(restored.status,200);assert.equal(raw.prepare('SELECT deleted_at FROM rooms').get().deleted_at,null);
});
test('revoked account cannot read or restore Trash with a valid identity header',async()=>{
 raw.exec("INSERT INTO system_hosts(account_id,role,created_at,revoked_at) VALUES('owner','host',1,2)");
 assert.equal((await entry.namespace.GET(new Request('https://site.invalid/api/trash',{headers:headers('owner')}))).status,403);
 assert.equal((await post('owner',{action:'restore',kind:'room',id:'room'})).status,403);
});
