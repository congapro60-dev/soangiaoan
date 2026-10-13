const SOURCE_SITE_ID='appgprj_6ac8d74b14f8819193caded9533bb337';
export const exportSourceSiteId=SOURCE_SITE_ID;
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
export const csvCell=value=>{
 let text=String(value??'');
 if(/^[\s\u0000-\u001f]*[=+@-]/u.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
};
export function learningRecordsCsv(bundle){
 const lines=[['Học sinh','Mã hồ sơ','Mục tiêu','Nội dung','Tiết học','Nhiệm vụ','Trạng thái','Hỗ trợ','Ngày nộp']];
 for(const member of bundle.members)for(const row of member.evidence)lines.push([member.name,member.code,row.objectiveCode,row.objectiveStatement,row.sessionId,row.taskId,row.assessed?(row.ok?'Đúng':'Cần củng cố'):'Chờ chấm',row.assisted?'Có':'Không',new Date(row.submittedAt).toISOString()]);
 return '\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n');
}
// ponytail: exports at most 50 pupils / 5000 compact rows; narrow the time or pupil scope for larger histories.
export async function exportLearningRecords(api,args,{now=Date.now}={}){
 const sourceSnapshot=await api.getClassSourceSnapshot(args);
 const page=await api.getRecords({...args,offset:args.offset??0,limit:50});
 if(page.backfillRequired)throw Error('EVIDENCE_SNAPSHOT_CHANGED');
 const ids=args.memberId?[args.memberId]:page.members.map(member=>member.id);
 const members=[],snapshots=new Map();let count=0;
 for(const memberId of ids){
  const record=await api.getRecord({...args,memberId});
  if(record.truncated)throw Error('EXPORT_TOO_LARGE');
  snapshots.set(memberId,JSON.stringify(record.evidence));
  count+=record.evidence.length;if(count>5000)throw Error('EXPORT_TOO_LARGE');
  const rows=[];
  for(const row of record.evidence){
   const identity=JSON.stringify([SOURCE_SITE_ID,args.classId,memberId,row.sessionId,row.packageHash,row.taskId,row.submissionId,row.objectiveCode]);
   rows.push({evidenceId:await digest(identity),operation:'upsert',revision:row.revision,sessionId:row.sessionId,packageHash:row.packageHash,taskId:row.taskId,submissionId:row.submissionId,objectiveCode:row.objectiveCode,objectiveNamespace:JSON.stringify([SOURCE_SITE_ID,row.packageHash,row.objectiveCode]),objectiveStatement:row.objectiveStatement,kind:row.kind,level:row.level,assessed:row.assessed,assisted:row.assisted,ok:row.assessed?row.ok:null,countsForMastery:row.countsForMastery&&['individual_recheck','independent_recheck','exit'].includes(row.kind),submittedAt:row.submittedAt});
  }
  members.push({sourceMemberId:record.member.id,name:record.member.name,code:record.member.code,evidence:rows});
 }
 // Recheck each source snapshot: no mixed revision exports after a simultaneous regrade/delete.
 for(const member of members){
  const latest=await api.getRecord({...args,memberId:member.sourceMemberId});
  if(latest.truncated||JSON.stringify(latest.evidence)!==snapshots.get(member.sourceMemberId))throw Error('EVIDENCE_SNAPSHOT_CHANGED');
 }
 const final=await api.getRecords({...args,offset:args.offset??0,limit:50});
 if(final.backfillRequired||sourceSnapshot!==await api.getClassSourceSnapshot(args)||(!args.memberId&&JSON.stringify(page.members.map(member=>[member.id,member.name,member.code]))!==JSON.stringify(final.members.map(member=>[member.id,member.name,member.code]))))throw Error('EVIDENCE_SNAPSHOT_CHANGED');
 return {schemaVersion:1,policyVersion:'game-evidence-v1',sourceSiteId:SOURCE_SITE_ID,exportId:crypto.randomUUID(),exportedAt:now(),scope:{sourceClassId:args.classId,from:args.from??0,to:args.to??Number.MAX_SAFE_INTEGER,offset:page.offset,limit:page.limit,memberIds:ids},mappingVersion:0,completeForSelectedMembers:true,nextOffset:!args.memberId&&page.offset+page.limit<page.total?page.offset+page.limit:null,manualImportWarning:'File nhập thủ công cần giáo viên kiểm tra nguồn và ghép học sinh; không tự quy đổi thành điểm năng lực.',members};
}
