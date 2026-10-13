const MASTERY_KINDS = new Set(['independent_recheck', 'individual_recheck', 'exit']);
const FORBIDDEN_KINDS = new Set(['group_product', 'map_position', 'race_position', 'group_score']);
export const objectiveKey = row => JSON.stringify([row.package_hash, row.objective_code]);
export const evidenceId = row => JSON.stringify([row.member_id,row.session_id,row.package_hash,row.task_id,row.submission_id,row.objective_code]);
export function summarizeEvidence(rows) {
  const objectives = new Map();
  for (const row of rows) {
    const key=objectiveKey(row);
    if(!objectives.has(key)) objectives.set(key,{key,packageHash:row.package_hash,code:row.objective_code,statement:row.objective_statement,tasks:new Map(),lastSubmittedAt:0});
    const objective=objectives.get(key), taskKey=JSON.stringify([row.task_id.replace(/^variant:(.+):\d+$/,'$1')]);
    objective.statement=row.objective_statement;objective.lastSubmittedAt=Math.max(objective.lastSubmittedAt,row.submitted_at);
    const prior=objective.tasks.get(taskKey);
    if(!prior || row.submitted_at>prior.submitted_at || (row.submitted_at===prior.submitted_at && row.synced_at>=prior.synced_at)) objective.tasks.set(taskKey,row);
  }
  return [...objectives.values()].map(({tasks,...objective})=>{
    let independentCount=0,supportedCount=0,pendingCount=0,hasRecheck=false,hasShould=false,hasFailure=false;
    for(const row of tasks.values()) {
      if(FORBIDDEN_KINDS.has(row.kind))continue;
      if(!row.assessed){pendingCount++;continue;}
      if(row.level==='should' && row.ok && !row.assisted)hasShould=true;
      if(!row.counts_for_mastery || !MASTERY_KINDS.has(row.kind))continue;
      if(!row.ok){hasFailure=true;continue;}
      if(row.assisted){supportedCount++;continue;}
      independentCount++;if(row.kind==='independent_recheck'||row.kind==='individual_recheck')hasRecheck=true;
    }
    const status=independentCount>=2&&hasRecheck?(hasShould?'standard_mastery':'minimum_mastery'):pendingCount?'pending':independentCount||supportedCount?'supported':hasFailure?'needs_support':'no_evidence';
    return {...objective,status,independentCount,supportedCount,pendingCount};
  });
}
// Source validity belongs in SQL: deleted/preview/unapproved sources cannot reappear in a projection.
export const activeEvidenceJoins = `JOIN lesson_sessions s ON s.id=e.session_id AND s.package_hash=e.package_hash
 JOIN lesson_evidence_sync sync ON sync.session_id=s.id AND sync.source_revision=s.revision
 JOIN rooms r ON r.id=s.room_id AND r.owner_account_id=s.owner_account_id AND r.deleted_at IS NULL
 JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash AND p.status IN ('approved','published')
 JOIN lesson_classes c ON c.id=s.class_id AND c.owner_account_id=s.owner_account_id AND c.deleted_at IS NULL
 JOIN lesson_class_members m ON m.id=e.member_id AND m.class_id=c.id AND m.revoked_at IS NULL`;
export const activeEvidenceWhere = `c.id=? AND c.owner_account_id=? AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=c.owner_account_id AND revoked_at IS NOT NULL) AND COALESCE(json_extract(s.state,'$.mode'),'')!='preview'
 AND NOT EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id)
 AND NOT EXISTS(SELECT 1 FROM site_trash t WHERE t.kind='class-member' AND t.object_id=m.id)`;
const fail=code=>{throw Error(code);};
export function recordsRange({from=0,to=Number.MAX_SAFE_INTEGER}={}) {
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<from)fail('INVALID_QUERY');return {from,to};
}
export const sourceSnapshotSql = `SELECT COALESCE(json_group_array(json_array(id,revision,source_revision,deleted_at,room_owner,package_hash,status,withdrawn,mode)),'[]') FROM (SELECT s.id,s.revision,sync.source_revision,r.deleted_at,r.owner_account_id AS room_owner,p.content_hash AS package_hash,p.status,EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id) AS withdrawn,COALESCE(json_extract(s.state,'$.mode'),'') AS mode FROM lesson_sessions s JOIN lesson_learners l ON l.session_id=s.id JOIN rooms r ON r.id=s.room_id JOIN lesson_packages p ON p.row_id=s.package_row_id LEFT JOIN lesson_evidence_sync sync ON sync.session_id=s.id WHERE s.class_id=? AND l.class_member_id=? AND s.owner_account_id=? ORDER BY s.id)`;
export const approvedClassPackagesSql=`SELECT DISTINCT p.row_id,p.content_hash,p.data FROM lesson_packages p JOIN lesson_sessions s ON s.package_row_id=p.row_id AND s.package_hash=p.content_hash JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_classes c ON c.id=s.class_id AND c.owner_account_id=s.owner_account_id AND c.deleted_at IS NULL WHERE c.id=? AND c.owner_account_id=? AND p.status IN ('approved','published') AND COALESCE(json_extract(s.state,'$.mode'),'')!='preview' AND NOT EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id) ORDER BY p.row_id`;
export const classPackageSnapshotSql=`SELECT COALESCE(json_group_array(json_array(row_id,content_hash)),'[]') FROM (${approvedClassPackagesSql})`;
export function createLearningRecordsService({db,syncSessionEvidence}) {
 const q=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>q(sql,...args).first(),all=async(sql,...args)=>(await q(sql,...args).all()).results||[];
 async function ownClass(ownerAccountId,classId) {
  if(!ownerAccountId)fail('AUTH_REQUIRED');const row=await one('SELECT id,code,title FROM lesson_classes WHERE id=? AND owner_account_id=? AND deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=lesson_classes.owner_account_id AND revoked_at IS NOT NULL)',classId,ownerAccountId);if(!row)fail('NOT_FOUND');return row;
 }
 async function ownMember(ownerAccountId,classId,memberId) {
  await ownClass(ownerAccountId,classId);const row=await one("SELECT id,member_code AS code,name FROM lesson_class_members WHERE id=? AND class_id=? AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=lesson_class_members.id)",memberId,classId);if(!row)fail('NOT_FOUND');return row;
 }
 async function classSnapshot(classId,ownerAccountId) {
  const sessions=await one(`SELECT COALESCE(json_group_array(json_array(id,revision,source_revision,deleted_at,room_owner,package_hash,status,withdrawn,mode)),'[]') AS snapshot FROM (SELECT s.id,s.revision,sync.source_revision,r.deleted_at,r.owner_account_id AS room_owner,p.content_hash AS package_hash,p.status,EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id) AS withdrawn,COALESCE(json_extract(s.state,'$.mode'),'') AS mode FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id JOIN lesson_packages p ON p.row_id=s.package_row_id LEFT JOIN lesson_evidence_sync sync ON sync.session_id=s.id WHERE s.class_id=? AND s.owner_account_id=? ORDER BY s.id)`,classId,ownerAccountId);
  return sessions.snapshot;
 }
 async function getRecords({ownerAccountId,classId,offset=0,limit=50,...range}) {
  const classroom=await ownClass(ownerAccountId,classId),{from,to}=recordsRange(range);
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000||!Number.isSafeInteger(limit)||limit<1||limit>50)fail('INVALID_QUERY');
  const snapshot=await classSnapshot(classId,ownerAccountId);
  const members=await all("SELECT id,member_code AS code,name FROM lesson_class_members WHERE class_id=? AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=lesson_class_members.id) ORDER BY created_at,id LIMIT ? OFFSET ?",classId,limit,offset);
  const {total}=await one("SELECT COUNT(*) AS total FROM lesson_class_members WHERE class_id=? AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=lesson_class_members.id)",classId);
  // Only latest family rows are read; bounded roster page, no durable state loaded into JS.
  const rows=await all(`SELECT * FROM (SELECT e.*,ROW_NUMBER() OVER(PARTITION BY e.member_id,e.package_hash,e.objective_code,e.task_id ORDER BY e.submitted_at DESC,e.synced_at DESC,e.rowid DESC) AS latest FROM lesson_class_evidence e ${activeEvidenceJoins} WHERE ${activeEvidenceWhere} AND e.member_id IN(SELECT value FROM json_each(?)) AND e.submitted_at BETWEEN ? AND ?) WHERE latest=1 ORDER BY submitted_at,synced_at LIMIT 10001`,classId,ownerAccountId,JSON.stringify(members.map(m=>m.id)),from,to);
  if(rows.length>10000)fail('RECORD_TRUNCATED');
  const missing=await one(`SELECT COUNT(*) AS count FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash AND p.status IN ('approved','published') LEFT JOIN lesson_evidence_sync sync ON sync.session_id=s.id WHERE s.class_id=? AND s.owner_account_id=? AND COALESCE(json_extract(s.state,'$.mode'),'')!='preview' AND NOT EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id) AND (sync.source_revision IS NULL OR sync.source_revision!=s.revision)`,classId,ownerAccountId);
  await ownClass(ownerAccountId,classId);
  if(snapshot!==await classSnapshot(classId,ownerAccountId))fail('EVIDENCE_SNAPSHOT_CHANGED');
  const active=await one("SELECT count(*) AS n FROM lesson_class_members WHERE id IN(SELECT value FROM json_each(?)) AND class_id=? AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM site_trash WHERE kind='class-member' AND object_id=lesson_class_members.id)",JSON.stringify(members.map(m=>m.id)),classId);if(active.n!==members.length)fail('EVIDENCE_SNAPSHOT_CHANGED');
  return {class:classroom,members:members.map(member=>{const objectives=summarizeEvidence(rows.filter(r=>r.member_id===member.id));return {...member,objectives,lastSubmittedAt:Math.max(0,...objectives.map(o=>o.lastSubmittedAt))};}),total,offset,limit,backfillRequired:missing.count>0};
 }
 async function getRecord({ownerAccountId,classId,memberId,...range}) {
  const classroom=await ownClass(ownerAccountId,classId),member=await ownMember(ownerAccountId,classId,memberId),{from,to}=recordsRange(range);
  const snapshot=await getSourceSnapshot({ownerAccountId,classId,memberId});
  const rows=await all(`SELECT e.*,s.revision AS revision FROM lesson_class_evidence e ${activeEvidenceJoins} WHERE ${activeEvidenceWhere} AND e.member_id=? AND e.submitted_at BETWEEN ? AND ? ORDER BY e.submitted_at DESC,e.synced_at DESC,e.rowid DESC LIMIT 501`,classId,ownerAccountId,memberId,from,to);
  const summaryRows=await all(`SELECT * FROM (SELECT e.*,ROW_NUMBER() OVER(PARTITION BY e.package_hash,e.objective_code,e.task_id ORDER BY e.submitted_at DESC,e.synced_at DESC,e.rowid DESC) AS latest FROM lesson_class_evidence e ${activeEvidenceJoins} WHERE ${activeEvidenceWhere} AND e.member_id=? AND e.submitted_at BETWEEN ? AND ?) WHERE latest=1 ORDER BY submitted_at,synced_at LIMIT 10001`,classId,ownerAccountId,memberId,from,to);
  if(summaryRows.length>10000)fail('RECORD_TRUNCATED');
  const evidence=rows.slice(0,500);await ownMember(ownerAccountId,classId,memberId);
  if(snapshot!==await getSourceSnapshot({ownerAccountId,classId,memberId}))fail('EVIDENCE_SNAPSHOT_CHANGED');
  return {class:classroom,member,objectives:summarizeEvidence(summaryRows),evidence:evidence.map(row=>({evidenceId:evidenceId(row),sessionId:row.session_id,packageHash:row.package_hash,taskId:row.task_id,submissionId:row.submission_id,objectiveCode:row.objective_code,objectiveStatement:row.objective_statement,kind:row.kind,level:row.level,assessed:Boolean(row.assessed),assisted:Boolean(row.assisted),ok:row.assessed?Boolean(row.ok):null,countsForMastery:Boolean(row.counts_for_mastery),submittedAt:row.submitted_at,revision:row.revision})),truncated:rows.length>500};
 }
 async function backfill({ownerAccountId,classId,cursor=null}) {
  await ownClass(ownerAccountId,classId);if(cursor!==null&&(typeof cursor!=='string'||cursor.length>256))fail('INVALID_QUERY');
  const session=await one(`SELECT s.id FROM lesson_sessions s JOIN rooms r ON r.id=s.room_id AND r.deleted_at IS NULL AND r.owner_account_id=s.owner_account_id JOIN lesson_packages p ON p.row_id=s.package_row_id AND p.content_hash=s.package_hash AND p.status IN ('approved','published') WHERE s.class_id=? AND s.owner_account_id=? AND s.id>? AND COALESCE(json_extract(s.state,'$.mode'),'')!='preview' AND NOT EXISTS(SELECT 1 FROM lesson_content_deletions d WHERE d.kind='package' AND d.object_id=p.row_id) ORDER BY s.id LIMIT 1`,classId,ownerAccountId,cursor||'');
  if(!session)return {cursor:null,done:true,processed:0};await syncSessionEvidence({ownerAccountId,sessionId:session.id});await ownClass(ownerAccountId,classId);return {cursor:session.id,done:false,processed:1};
 }
 async function getSourceSnapshot({ownerAccountId,classId,memberId}) {await ownMember(ownerAccountId,classId,memberId);const row=await one('SELECT ('+sourceSnapshotSql+') AS snapshot',classId,memberId,ownerAccountId);return row.snapshot;}
 async function getClassSourceSnapshot({ownerAccountId,classId}) {await ownClass(ownerAccountId,classId);return classSnapshot(classId,ownerAccountId);}
 async function getApprovedPlanPackages({ownerAccountId,classId}) {await ownClass(ownerAccountId,classId);const rows=await all(approvedClassPackagesSql+' LIMIT 31',classId,ownerAccountId);if(rows.length>30)fail('RECORD_TRUNCATED');return rows.map(row=>({packageHash:row.content_hash,packageRowId:row.row_id,package:JSON.parse(row.data)}));}
 return {getApprovedPlanPackages,getClassSourceSnapshot,getSourceSnapshot,ownClass,ownMember,getRecords,getRecord,backfill};
}
