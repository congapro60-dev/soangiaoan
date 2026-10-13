import { sourceSnapshotSql, classPackageSnapshotSql } from './learning-records.js';
const fail=code=>{throw Error(code);};
const approvedTaskText=task=>task.id+': '+task.prompt+(Array.isArray(task.inputSchema?.options)?'\n'+task.inputSchema.options.map(option=>typeof option==='string'?option:option.label).filter(label=>typeof label==='string').join(' · '):'');
export async function recordFingerprint(record,snapshot='') {
 const text=snapshot+JSON.stringify(record.evidence.map(e=>[e.evidenceId,e.revision,e.assessed,e.assisted,e.ok,e.countsForMastery]).sort((a,b)=>a[0].localeCompare(b[0])));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validateBody(body,record) {
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['items','teacherNote'].includes(k))||!Array.isArray(body.items)||body.items.length>30)fail('INVALID_BODY');
 const clean=(value,max)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail('INVALID_BODY');return value.trim();};
 const objectives=new Map(record.objectives.map(o=>[o.key,o])),evidence=new Map(record.evidence.map(e=>[e.evidenceId,e]));
 return {items:body.items.map(item=>{
  if(!item||typeof item!=='object'||Object.keys(item).some(k=>!['objectiveKey','objectiveCode','statement','activity','minutes','recheck','evidenceIds'].includes(k)))fail('INVALID_BODY');
  const objective=objectives.get(item.objectiveKey);
  if(!objective||item.objectiveCode!==objective.code||!Number.isSafeInteger(item.minutes)||item.minutes<1||item.minutes>60||!Array.isArray(item.evidenceIds)||item.evidenceIds.length>30||item.evidenceIds.some(id=>{const e=evidence.get(id);return !e||JSON.stringify([e.packageHash,e.objectiveCode])!==item.objectiveKey;}))fail('INVALID_BODY');
  if(typeof item.activity!=='string'||!item.activity.trim()||typeof item.recheck!=='string'||!item.recheck.trim())fail('INVALID_BODY');
  return {objectiveKey:objective.key,objectiveCode:objective.code,statement:clean(item.statement,1000),activity:clean(item.activity,1500),minutes:item.minutes,recheck:clean(item.recheck,1000),evidenceIds:[...new Set(item.evidenceIds)]};
 }),teacherNote:clean(body.teacherNote??'',2000)};
}
export function createLearningPlanService({db,records,now=()=>Date.now()}) {
 const q=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>q(sql,...args).first();
 const guard="EXISTS(SELECT 1 FROM lesson_classes c JOIN lesson_class_members m ON m.class_id=c.id WHERE c.id=? AND c.owner_account_id=? AND c.deleted_at IS NULL AND m.id=? AND m.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=c.owner_account_id AND revoked_at IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=m.id))";
 const sourceGuard='?=('+sourceSnapshotSql+') AND ?=('+classPackageSnapshotSql+')';
 const sourceArgs=(args,snapshot,packageSnapshot)=>[snapshot,args.classId,args.memberId,args.ownerAccountId,packageSnapshot,args.classId,args.ownerAccountId];
 const packageSnapshot=async args=>(await one('SELECT ('+classPackageSnapshotSql+') AS snapshot',args.classId,args.ownerAccountId)).snapshot;
 const present=(row,fingerprint)=>({id:row.id,revision:row.revision,status:row.status,body:JSON.parse(row.body),sourceFingerprint:row.source_fingerprint,stale:row.source_fingerprint!==fingerprint,createdAt:row.created_at,updatedAt:row.updated_at});
 async function source(args){
  const initial=await records.getSourceSnapshot(args),initialPackages=await packageSnapshot(args),record=await records.getRecord({...args,from:0,to:Number.MAX_SAFE_INTEGER});
  if(record.truncated)fail('RECORD_TRUNCATED');
  const packages=await records.getApprovedPlanPackages(args),objectives=new Map(record.objectives.map(o=>[o.key,o]));
  for(const entry of packages)for(const objective of entry.package.objectives||[]){
   if(typeof objective.code!=='string'||!objective.code)continue;const key=JSON.stringify([entry.packageHash,objective.code]);
   if(!objectives.has(key))objectives.set(key,{key,packageHash:entry.packageHash,code:objective.code,statement:objective.statement||objective.text||objective.code,status:'no_evidence',independentCount:0,supportedCount:0,pendingCount:0,lastSubmittedAt:0});
  }
  record.objectives=[...objectives.values()];
  const snapshot=await records.getSourceSnapshot(args),currentPackages=await packageSnapshot(args);
  if(initial!==snapshot||initialPackages!==currentPackages)fail('EVIDENCE_SNAPSHOT_CHANGED');
  if(JSON.parse(snapshot).some(s=>s[3]===null&&['approved','published'].includes(s[6])&&!s[7]&&s[8]!=='preview'&&s[1]!==s[2]))fail('EVIDENCE_SNAPSHOT_CHANGED');
  return {record,packages,snapshot,packageSnapshot:currentPackages,fingerprint:await recordFingerprint(record,snapshot+currentPackages)};
 }
 async function listPlans(args,record) {
  record=await records.getRecord({...args,from:0,to:Number.MAX_SAFE_INTEGER});
  const snapshot=await records.getSourceSnapshot(args),currentPackages=await packageSnapshot(args),fingerprint=await recordFingerprint(record,snapshot+currentPackages),rows=(await q('SELECT * FROM lesson_learning_plans WHERE class_id=? AND member_id=? AND owner_account_id=? AND deleted_at IS NULL ORDER BY updated_at DESC,id LIMIT 30',args.classId,args.memberId,args.ownerAccountId).all()).results;
  await records.ownMember(args.ownerAccountId,args.classId,args.memberId);return Promise.all(rows.map(async row=>({...present(row,fingerprint),versions:(await q('SELECT revision,status,body,created_at AS createdAt FROM lesson_learning_plan_versions WHERE plan_id=? ORDER BY revision DESC LIMIT 30',row.id).all()).results.map(v=>({...v,body:JSON.parse(v.body)}))})));
 }
 async function suggestPlan(args) {
  const {record,fingerprint,snapshot,packages,packageSnapshot:currentPackages}=await source(args),items=record.objectives.slice(0,30).map(o=>{
   const pkg=packages.find(p=>p.packageHash===o.packageHash)?.package,objectiveIds=(pkg?.objectives||[]).filter(item=>item.code===o.code).map(item=>item.id);
   const tasks=(pkg?.tasks||[]).filter(task=>task.participation==='individual'&&['closed','open'].includes(task.type)&&typeof task.id==='string'&&typeof task.prompt==='string'&&task.prompt.length>0&&approvedTaskText(task).length<=1500&&(pkg.activities||[]).some(a=>(a.taskIds||[]).includes(task.id))&&((task.objectiveIds||[]).some(id=>objectiveIds.includes(id))||(pkg.evidenceRules||[]).some(rule=>rule.taskId===task.id&&rule.individual===true&&(rule.objectiveIds||[rule.objectiveId]).some(id=>objectiveIds.includes(id)))));
   const recheck=tasks.find(task=>approvedTaskText(task).length<=1000&&(pkg.evidenceRules||[]).some(rule=>rule.taskId===task.id&&['individual_recheck','independent_recheck','exit'].includes(rule.kind))),diagnostic=tasks.find(task=>(pkg.evidenceRules||[]).some(rule=>rule.taskId===task.id&&rule.kind==='precheck'))||recheck;
   const task=o.status==='pending'?null:o.status==='no_evidence'?diagnostic:o.status==='needs_support'?tasks.find(t=>t.branch==='support'):o.status==='supported'?recheck||tasks.find(t=>t.branch==='core'):tasks.find(t=>t.branch==='extension');
   const activity=task?approvedTaskText(task):o.status==='pending'?'GV chấm minh chứng đang chờ trước khi chọn hoạt động tiếp theo.':'Chưa có bài cá nhân phù hợp trong học liệu đã duyệt; GV bổ sung trước khi giao.',activityMinutes=task?(pkg.activities||[]).find(a=>(a.taskIds||[]).includes(task.id))?.minutes:5;
   return {objectiveKey:o.key,objectiveCode:o.code,statement:o.statement,activity,minutes:Number.isSafeInteger(activityMinutes)?Math.max(1,Math.min(60,activityMinutes)):5,recheck:recheck?approvedTaskText(recheck):'GV bổ sung bài kiểm tra lại cá nhân theo đúng mục tiêu; không dùng trợ giúp.',evidenceIds:record.evidence.filter(e=>JSON.stringify([e.packageHash,e.objectiveCode])===o.key).slice(0,10).map(e=>e.evidenceId)};
  });
  const body={items,teacherNote:items.length?'Bản nháp dùng bài cá nhân trong học liệu đã duyệt khi có. GV kiểm tra, bổ sung phần còn thiếu trước khi giao.':'Chưa có minh chứng mục tiêu. GV bổ sung kiểm tra ngắn theo mục tiêu tiết học trước khi lập kế hoạch.'},id=crypto.randomUUID(),time=now();
  const out=await db.batch([
   q('INSERT INTO lesson_learning_plans(id,owner_account_id,class_id,member_id,revision,status,body,source_fingerprint,created_at,updated_at) SELECT ?,?,?,?,1,\'draft\',?,?,?,? WHERE '+guard+' AND '+sourceGuard,id,args.ownerAccountId,args.classId,args.memberId,JSON.stringify(body),fingerprint,time,time,args.classId,args.ownerAccountId,args.memberId,...sourceArgs(args,snapshot,currentPackages)),
   q('INSERT INTO lesson_learning_plan_versions(plan_id,revision,status,body,source_fingerprint,actor_account_id,created_at) SELECT id,revision,status,body,source_fingerprint,?,updated_at FROM lesson_learning_plans WHERE id=?',args.ownerAccountId,id)
  ]);if(!out.every(r=>Number(r.meta?.changes)===1))fail('NOT_FOUND');
  return {plan:present(await one('SELECT * FROM lesson_learning_plans WHERE id=?',id),fingerprint)};
 }
 async function savePlan(args) {
  if(!['draft','approved'].includes(args.status)||!Number.isSafeInteger(args.revision)||args.revision<1)fail('INVALID_BODY');
  const {record,fingerprint,snapshot,packageSnapshot:currentPackages}=await source(args),prior=await one('SELECT * FROM lesson_learning_plans WHERE id=? AND class_id=? AND member_id=? AND owner_account_id=? AND deleted_at IS NULL',args.planId,args.classId,args.memberId,args.ownerAccountId);
  if(!prior)fail('NOT_FOUND');if(prior.revision!==args.revision)fail('PLAN_CONFLICT');if(args.status==='approved'&&prior.source_fingerprint!==fingerprint)fail('STALE_PLAN');
  const body=validateBody(args.body,record),time=now();if(args.status==='approved'&&!body.items.length)fail('INVALID_BODY');
  const out=await db.batch([
   q('UPDATE lesson_learning_plans SET revision=revision+1,status=?,body=?,source_fingerprint=?,updated_at=?,approved_at=? WHERE id=? AND revision=? AND deleted_at IS NULL AND '+guard+' AND '+sourceGuard,args.status,JSON.stringify(body),fingerprint,time,args.status==='approved'?time:null,args.planId,args.revision,args.classId,args.ownerAccountId,args.memberId,...sourceArgs(args,snapshot,currentPackages)),
   q('INSERT INTO lesson_learning_plan_versions(plan_id,revision,status,body,source_fingerprint,actor_account_id,created_at) SELECT id,revision,status,body,source_fingerprint,?,updated_at FROM lesson_learning_plans WHERE id=? AND revision=? AND body=? AND updated_at=? ON CONFLICT DO NOTHING',args.ownerAccountId,args.planId,args.revision+1,JSON.stringify(body),time)
  ]);if(!out.every(r=>Number(r.meta?.changes)===1))fail('PLAN_CONFLICT');
  return {plan:present(await one('SELECT * FROM lesson_learning_plans WHERE id=?',args.planId),fingerprint)};
 }
 async function deletePlan(args) {
  await records.ownMember(args.ownerAccountId,args.classId,args.memberId);if(!Number.isSafeInteger(args.revision))fail('INVALID_BODY');const time=now(),nonce=crypto.randomUUID();
  const out=await db.batch([
   q("INSERT INTO site_trash(kind,object_id,owner_account_id,deleted_at,data) SELECT 'learning-plan',id,owner_account_id,?,json_object('title','Kế hoạch học tiếp','classId',class_id,'memberId',member_id,'revision',revision,'nonce',?) FROM lesson_learning_plans WHERE id=? AND owner_account_id=? AND class_id=? AND member_id=? AND revision=? AND deleted_at IS NULL AND "+guard,time,nonce,args.planId,args.ownerAccountId,args.classId,args.memberId,args.revision,args.classId,args.ownerAccountId,args.memberId),
   q("UPDATE lesson_learning_plans SET deleted_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM site_trash WHERE kind='learning-plan' AND object_id=? AND owner_account_id=? AND json_extract(data,'$.nonce')=?) AND "+guard,time,args.planId,args.revision,args.planId,args.ownerAccountId,nonce,args.classId,args.ownerAccountId,args.memberId)
  ]);if(!out.every(r=>Number(r.meta?.changes)===1))fail('PLAN_CONFLICT');return {ok:true};
 }
 async function restorePlan({ownerAccountId,id}) {
  if(!ownerAccountId)fail('AUTH_REQUIRED');const trash=await one("SELECT * FROM site_trash WHERE kind='learning-plan' AND object_id=? AND owner_account_id=?",id,ownerAccountId);if(!trash)fail('NOT_FOUND');const data=JSON.parse(trash.data);await records.ownMember(ownerAccountId,data.classId,data.memberId);
  const out=await db.batch([
   q("UPDATE lesson_learning_plans SET deleted_at=NULL WHERE id=? AND owner_account_id=? AND deleted_at=? AND revision=? AND EXISTS(SELECT 1 FROM site_trash WHERE kind='learning-plan' AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=?) AND "+guard,id,ownerAccountId,trash.deleted_at,data.revision,id,ownerAccountId,trash.data,trash.deleted_at,data.classId,ownerAccountId,data.memberId),
   q("DELETE FROM site_trash WHERE kind='learning-plan' AND object_id=? AND owner_account_id=? AND data=? AND deleted_at=? AND EXISTS(SELECT 1 FROM lesson_learning_plans WHERE id=? AND deleted_at IS NULL)",id,ownerAccountId,trash.data,trash.deleted_at,id)
  ]);if(!out.every(r=>Number(r.meta?.changes)===1))fail('PLAN_CONFLICT');return {ok:true};
 }
 return {listPlans,suggestPlan,savePlan,deletePlan,restorePlan};
}


