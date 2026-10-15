import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import katex from 'katex';
import {hashPackage} from '../../lib/lesson/schema.js';
import {validateLessonPackage} from '../../lib/lesson/validate.js';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const data=JSON.parse(read('content/lessons/hki-2026-g12.json'));
const math=new Set();
function inspect(value,path=''){
  if(typeof value==='string'){
    assert.doesNotMatch(value,/(?<!\\)\binfty\b|F_\{trước\}/u,path);
    for(const[,expression]of value.matchAll(/\$([^$]+)\$/g))math.add(expression);
  }else if(value&&typeof value==='object')for(const[key,item]of Object.entries(value))inspect(item,path+'.'+key);
}
assert.equal(data.entries.length,133);
for(const entry of data.entries){
  assert.equal(entry.pkg.contentHash,hashPackage(entry.pkg),entry.pkg.id);
  assert.equal(validateLessonPackage(entry.pkg).ok,true,entry.pkg.id);
}
inspect(data,'grade12');
for(const exam of data.exams)for(const path of Object.values(exam.files))inspect(path.endsWith('.json')?JSON.parse(read(path)):read(path),path);
for(const path of ['tasks/r22/g12-solutions.json','tasks/r22/g12-practice-bank.json'])inspect(JSON.parse(read(path)),path);
for(const expression of math)assert.doesNotThrow(()=>katex.renderToString(expression,{throwOnError:true,strict:'error'}),expression);

// This formatting repair must preserve every objective, answer, rubric, duration and exam score.
const keyed={lessons:data.entries.map(e=>({id:e.pkg.id,objectives:e.pkg.objectives.map(o=>({id:o.id,code:o.code,statement:o.statement})),budget:e.pkg.budget,tasks:e.pkg.tasks.map(t=>({id:t.id,type:t.type,evaluation:t.evaluation}))})),exams:data.exams.map(e=>({id:e.id,exam:JSON.parse(read(e.files.normalizedExam)).questions.map(q=>({id:q.id,type:q.type,points:q.points,key:q.key,solution:q.solution,rubric:q.rubric}))}))};
assert.equal(createHash('sha256').update(JSON.stringify(keyed)).digest('hex'),'92683dabc905524a2720c4a58925f6b8cecc49ffda3ffd51d5b3cbbaad918452');
console.log(JSON.stringify({packages:133,distinctMath:math.size,hashes:'PASS',strictKatex:'PASS',malformedPatterns:'NONE',mathematicalContent:'UNCHANGED'}));
