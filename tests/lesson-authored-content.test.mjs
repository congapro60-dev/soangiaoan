import test from 'node:test';
import assert from 'node:assert/strict';
import {listAuthoredLessons,getAuthoredLesson} from '../lib/lesson/authored-content.js';
import {validateLessonPackage} from '../lib/lesson/validate.js';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {getSemesterExam,listSemesterExams} from '../lib/lesson/semester-content.js';

test('authored library contains source-reviewed drafts, list omits answers, selection clones exact package',async()=>{
 const list=listAuthoredLessons().filter(row=>!row.id.startsWith('r22-'));assert.equal(list.length,17);assert.equal(JSON.stringify(listAuthoredLessons()).includes('answerKey'),false);
 for(const row of list){const pkg=await getAuthoredLesson(row.id);assert.equal(pkg.status,'draft');assert.equal(validateLessonPackage(pkg).ok,true);assert.ok(pkg.sourceRefs.every(ref=>ref.verification==='teacher_review_required'));pkg.tasks[0].prompt='Changed';assert.notEqual((await getAuthoredLesson(row.id)).tasks[0].prompt,'Changed');}
 assert.equal(await getAuthoredLesson('__proto__'),null);assert.equal(await getAuthoredLesson('missing'),null);
});

test('eight additional Must drafts keep exact source objectives; full lessons remain available',async()=>{
 const list=listAuthoredLessons(),focused=list.filter(row=>row.id.endsWith('-must-only'));assert.equal(focused.length,8);
 for(const row of focused){const pkg=await getAuthoredLesson(row.id),full=await getAuthoredLesson(row.period===39?'g11-sequences-p2':`g11-w6-p${row.period}`);assert.equal(pkg.objectives.length,1);assert.deepEqual(pkg.objectives[0],full.objectives.find(o=>o.level==='must'));assert.deepEqual(pkg.sourceRefs,full.sourceRefs);assert.match(row.title,/Must/);assert.equal(pkg.status,'draft');assert.equal(pkg.budget.slotMinutes,40);assert.equal(pkg.budget.transitionMinutes,2);assert.equal(validateLessonPackage(pkg).ok,true);const ids=new Set(pkg.objectives.map(o=>o.id));for(const entity of [...pkg.tasks,...pkg.activities,...pkg.evidenceRules])assert.ok(entity.objectiveIds.every(id=>ids.has(id)));}
});

test('source library route authenticates before returning a package and keeps keys off public listing',async()=>{
 const context=createContext({URL,Response});const routeModule=new SourceTextModule(readFileSync(new URL('../app/api/lesson-content/route.js',import.meta.url),'utf8'),{context});
 const identity=new SyntheticModule(['resolveIdentity'],function(){this.setExport('resolveIdentity',request=>({user:request.headers.get('x-qa-owner')==='owner'?{userId:'owner'}:null}));},{context});
 const storage=new SyntheticModule(['getEnv'],function(){this.setExport('getEnv',()=>({}));},{context});const library=new SyntheticModule(['listAuthoredLessons','getAuthoredLesson'],function(){this.setExport('listAuthoredLessons',listAuthoredLessons);this.setExport('getAuthoredLesson',getAuthoredLesson);},{context});
 const semester=new SyntheticModule(['getSemesterExam','listSemesterExams'],function(){this.setExport('getSemesterExam',getSemesterExam);this.setExport('listSemesterExams',listSemesterExams);},{context});
 await routeModule.link(name=>name.includes('account-room-access')?identity:name.includes('storage')?storage:name.includes('semester-content')?semester:library);await routeModule.evaluate();
 const get=(query='',authorized=true)=>routeModule.namespace.GET(new Request('https://test/api/lesson-content'+query,{headers:authorized?{'x-qa-owner':'owner'}:{}}));
 assert.equal((await get('?id=g11-sequences-p2',false)).status,401);const list=await get();assert.equal(list.status,200);assert.equal((await list.text()).includes('answerKey'),false);
 assert.equal((await get('?id=missing')).status,404);assert.equal((await get('?id=g11-sequences-p2&id=missing')).status,400);const chosen=await get('?id=g11-sequences-p2');assert.equal(chosen.status,200);assert.equal((await chosen.json()).package.status,'draft');assert.equal(chosen.headers.get('Cache-Control'),'no-store');
 assert.equal((await get('?exam=g11-midterm&format=solutions',false)).status,401);
 assert.equal((await get('?exam=g11-midterm&format=solutions&id=other')).status,400);
 const solutions=await get('?exam=g11-midterm&format=solutions');assert.equal(solutions.status,200);assert.equal(solutions.headers.get('Cache-Control'),'no-store');assert.match(await solutions.text(),/CHỈ DÀNH CHO GIÁO VIÊN/);
});

