import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashPackage} from '../lib/lesson/schema.js';
const lesson=period=>JSON.parse(readFileSync(new URL(`../content/lessons/g11-w6-p${period}.json`,import.meta.url)));
test('cot scaffolding uses cot domain and recurrence states its continuation assumption',()=>{
 const cot=lesson(34).tasks.find(t=>t.id==='task-w6p34-core');assert.doesNotMatch(cot.prompt,/Với bài tan/);assert.match(cot.prompt,/cot/);assert.match(cot.prompt,/x.*≠.*k/);assert.match(cot.evaluation.rubric.lookFor.join(' '),/cot/);
 const core=lesson(38).tasks.find(t=>t.id==='task-w6p38-core');assert.match(core.prompt,/Giả sử.*tăng thêm/);assert.match(core.evaluation.rubric.lookFor[0],/giả định/);
});
test('extension rubrics match the given exercise; any new objective check is explicitly asked',()=>{
 const tasks=[34,35,36,38].map(p=>[p,lesson(p).tasks.find(t=>t.id===`task-w6p${p}-extension`)]);
 for(const [p,t] of tasks){assert.equal(t.metadata.sourceCitation.origin,'adapted');assert.equal(t.metadata.numericReviewRequired,true);assert.equal(t.evidenceIds.length,0);assert.equal(lesson(p).contentHash,hashPackage(lesson(p)));}
 const by=Object.fromEntries(tasks);assert.match(by[34].prompt,/chu kỳ.*sin/);assert.match(by[34].evaluation.rubric.criteria.join(' '),/t.*−1/);
 assert.match(by[35].prompt,/sai|bỏ sót/);assert.match(by[36].prompt,/mô hình|pha/);assert.match(by[36].evaluation.rubric.criteria.join(' '),/tăng.*giảm/);
 assert.match(by[38].prompt,/dự đoán|giả thuyết/);assert.match(by[38].evaluation.rubric.criteria.join(' '),/hữu hạn/);
});

test('prechecks assess only the short question and provide exact teacher answers',()=>{
 const p36=lesson(36),p41=lesson(41),by=(pkg,id)=>pkg.tasks.find(t=>t.id===id).evaluation.rubric;
 assert.doesNotMatch(by(p36,'task-w6p36-pre-0').criteria.join(' '),/giá trị/);assert.match(by(p36,'task-w6p36-pre-0').lookFor.join(' '),/kπ|k.*π/);
 assert.match(by(p36,'task-w6p36-pre-1').lookFor.join(' '),/\[1; ?3\]/);assert.doesNotMatch(by(p36,'task-w6p36-pre-2').criteria.join(' '),/mô hình|pha/);
 assert.doesNotMatch(by(p41,'task-w6p41-pre-0').criteria.join(' '),/Đủ nghiệm|dãy con/);assert.match(by(p41,'task-w6p41-pre-0').lookFor.join(' '),/π\/6/);
 assert.match(by(p41,'task-w6p41-pre-1').lookFor.join(' '),/2π/);assert.doesNotMatch(by(p41,'task-w6p41-pre-2').criteria.join(' '),/rubric/);
});
