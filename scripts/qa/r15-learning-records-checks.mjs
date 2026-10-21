import assert from 'node:assert/strict';
export async function checkR15({api,cls,pupils,teacher,other,report}){
 const base='/api/lesson-classes?action=',scope='&id='+cls.id,memberId=pupils[0].member.id;
 await api(base+'records'+scope,undefined,{},401);
 await api(base+'records'+scope,undefined,other,404);
 await api(base+'records'+scope,undefined,{Authorization:'Bearer '+pupils[0].classToken},401);
 const before=await api(base+'records'+scope);assert.equal(before.members.length,pupils.length);
 let cursor=null,processed=0;
 for(let step=0;step<25;step++){
  const result=await api('/api/lesson-classes',{action:'records-backfill',classId:cls.id,cursor});processed+=result.processed;
  if(result.done)break;cursor=result.cursor;if(step===24)throw Error('R15_BACKFILL_BOUND');
 }
 const ready=await api(base+'records'+scope);assert.equal(ready.backfillRequired,false);
 const first=ready.members.find(member=>member.id===memberId);assert.ok(first.objectives.length>0);
 assert.equal(/"(?:pin|pin_hash|token|answer)":/.test(JSON.stringify(ready)),false);
 const detail=await api(base+'record'+scope+'&memberId='+memberId);assert.ok(detail.evidence.length>0);assert.ok(Array.isArray(detail.plans));
 const suggested=await api('/api/lesson-classes',{action:'learning-plan-suggest',classId:cls.id,memberId});assert.equal(suggested.plan.status,'draft');assert.ok(suggested.plan.body.items.length);
 const missingMember=pupils[1].member.id,diagnostic=await api('/api/lesson-classes',{action:'learning-plan-suggest',classId:cls.id,memberId:missingMember});
 assert.ok(diagnostic.plan.body.items.length);assert.ok(diagnostic.plan.body.items.some(item=>item.activity.includes('task-')),'no-evidence pupil gets approved literal diagnostic');
 const body={...suggested.plan.body,teacherNote:'GV QA đã đối chiếu minh chứng.'};
 const saved=await api('/api/lesson-classes',{action:'learning-plan-save',classId:cls.id,memberId,planId:suggested.plan.id,revision:suggested.plan.revision,body,status:'approved'});assert.equal(saved.plan.status,'approved');
 await api('/api/lesson-classes',{action:'learning-plan-save',classId:cls.id,memberId,planId:suggested.plan.id,revision:suggested.plan.revision,body,status:'draft'},teacher,409);
 await api('/api/lesson-classes',{action:'learning-plan-delete',classId:cls.id,memberId,planId:saved.plan.id,revision:saved.plan.revision});
 assert.ok((await api('/api/trash')).items.some(item=>item.kind==='learning-plan'&&item.id===saved.plan.id));
 await api('/api/trash',{action:'restore',kind:'learning-plan',id:saved.plan.id});
 assert.ok((await api(base+'record'+scope+'&memberId='+memberId)).plans.some(plan=>plan.id===saved.plan.id));
 const bundle=await api(base+'records-export'+scope+'&memberId='+memberId+'&format=json');assert.equal(bundle.schemaVersion,1);assert.equal(bundle.members.length,1);assert.ok(bundle.members[0].evidence.length);
 assert.equal(bundle.members[0].sourceMemberId,memberId);assert.equal(/"(?:pin|pin_hash|token|answer|teacherNote)":/.test(JSON.stringify(bundle)),false);
 report.r15={status:'PASS',processed,checks:['teacher/anonymous/foreign/pupil scope','compact class/detail evidence','bounded explicit backfill','draft/approve/CAS','approved literal material for no-evidence pupil','Trash/restore plan','JSON stable scoped compact export'],synthetic:true,noRealStudents:true};
}
