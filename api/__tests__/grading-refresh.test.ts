import { beforeEach, expect, it, vi } from 'vitest';
import { runGradingRefreshItem } from '../_grading-refresh';

let store: Record<string, any>;
const ref = (key: string): any => ({ id: key.split('/').at(-1), get: async () => ({ id:key.split('/').at(-1),exists:!!store[key],data:()=>structuredClone(store[key]) }), collection:(name:string)=>({doc:(id:string)=>ref(`${key}/${name}/${id}`)}), update:async(data:any)=>{store[key]={...store[key],...data}},set:async(data:any,options:any)=>{store[key]=options?.merge?{...store[key],...data}:data} });
const db: any = { collection:(name:string)=>({doc:(id:string)=>ref(`${name}/${id}`)}),runTransaction:async(fn:any)=>fn({get:(r:any)=>r.get(),update:(r:any,d:any)=>r.update(d),set:(r:any,d:any,o:any)=>r.set(d,o)}) };
beforeEach(()=>{store={
 'gradingRefreshJobs/job':{teacherId:'owner',submissionIds:['s'],cursor:0,status:'running',expiresAt:Date.now()+60_000},
 'classes/c':{teacherId:'owner'},'classes/c/students/kid':{},
 'assignments/a':{teacherId:'owner',classId:'c',type:'upload'},
 'submissions/s':{teacherId:'owner',classId:'c',studentId:'kid',assignmentId:'a',status:'graded',grade:{score:8,gradedAt:'2026-10-10T00:00:00Z'}},
};});
it('leases work, completes once, then replay cannot grade twice',async()=>{
 const grade=vi.fn(async()=>({success:true}));
 expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({done:true,outcome:'graded'});
 expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({done:true,remaining:0});
 expect(grade).toHaveBeenCalledTimes(1);expect(store['submissions/s'].grade.score).toBe(8);
});
it.each(['owner','manual','source','busy'])('skips unsafe %s item without invoking AI',async reason=>{
 if(reason==='owner')store['submissions/s'].teacherId='other';
 if(reason==='manual')store['submissions/s'].grade.questionResults=[{teacherEdited:true}];
 if(reason==='source')delete store['submissions/s'].assignmentId;
 if(reason==='busy')store['submissions/s'].deletionRunId='delete';
 const grade=vi.fn();const result=await runGradingRefreshItem(db,'job',grade);
 expect(result).toHaveProperty('outcome',`skipped_${reason==='owner'?'scope':reason}`);expect(grade).not.toHaveBeenCalled();
});
it('concurrent call cannot claim an active lease; failed grade advances with failure record',async()=>{
 store['gradingRefreshJobs/job'].leaseUntil=Date.now()+1000;
 const grade=vi.fn(async()=>{throw Error('provider down')});
 expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({busy:true,remaining:1});
 store['gradingRefreshJobs/job'].leaseUntil=0;
 expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({done:true,outcome:'failed'});
 expect(store['gradingRefreshJobs/job'].counts.failed).toBe(1);
});
it('lost response after successful grade does not regrade when lease expires',async()=>{
 store['gradingRefreshJobs/job/items/s']={startedAt:'2026-10-15T01:00:00Z',previousGradeAt:'2026-10-10T00:00:00Z'};
 store['submissions/s'].grade.gradedAt='2026-10-15T01:01:00Z';
 const grade=vi.fn();expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({outcome:'already_done'});expect(grade).not.toHaveBeenCalled();
});
it('only administrator job data grants the one-off daily quota waiver; pause survives completion',async()=>{
 store['gradingRefreshJobs/job'].allowDailyQuotaBypass=true;
 const grade=vi.fn(async()=>{store['gradingRefreshJobs/job'].status='paused';return{success:true};});
 await runGradingRefreshItem(db,'job',grade);
 expect(grade.mock.calls[0][2]).toBe(true);expect(store['gradingRefreshJobs/job'].status).toBe('paused');
});
it('fresh grading waits without consuming item; stale grading can recover',async()=>{
 store['submissions/s'].status='grading';store['submissions/s'].updatedAt=new Date().toISOString();
 const grade=vi.fn(async()=>({success:true}));
 expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({busy:true,remaining:1});expect(grade).not.toHaveBeenCalled();
 store['submissions/s'].updatedAt='2026-01-01';expect(await runGradingRefreshItem(db,'job',grade)).toMatchObject({outcome:'graded'});
});
