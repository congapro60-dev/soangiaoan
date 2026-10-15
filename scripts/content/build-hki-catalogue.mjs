import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const compress=value=>gzipSync(JSON.stringify(value)).toString('base64');
const periods=new Map(JSON.parse(read('tasks/r22/ppct-hki.json')).grades.flatMap(grade=>grade.lessons.map(period=>[period.id,period])));
const lessons=[],exams=[];
for(const grade of [10,11,12]){
  const authored=JSON.parse(read(`content/lessons/hki-2026-g${grade}.json`));
  for(const {pkg,title,week,period,kind,sourcePeriodId} of authored.entries){
    const source=periods.get(sourcePeriodId);
    const category=kind==='elective'?'elective':kind==='review'?'review':kind==='assessment_feedback'?'feedback':kind==='orientation'?'orientation':source.activity_type==='project_presentation'?'project':/luyện tập|practice/i.test(source.detail)?'practice':'formation';
    lessons.push({id:pkg.id,title,grade,week,period,kind,category,status:pkg.status,version:pkg.version,slotMinutes:pkg.budget.slotMinutes,data:compress(pkg)});
  }
  for(const item of authored.exams){
    const normalized=JSON.parse(read(item.files.normalizedExam||item.files.json));
    const exam=normalized.exam||normalized;
    const questionText=read(item.files.questionText||item.files.text);
    const teacherSolutions=item.files.teacherSolutions?read(item.files.teacherSolutions):['CHỈ DÀNH CHO GIÁO VIÊN',item.title,...exam.questions.map(question=>`${question.section} - ${question.label} (${question.points} điểm)\n${question.solution}\n${question.rubric||''}`)].join('\n\n');
    exams.push({id:item.id,title:item.title,grade,week:item.week,minutes:item.minutes,sourcePeriodIds:item.sourcePeriodIds,status:'draft',data:compress({exam,questionText,teacherSolutions})});
  }
}
assert.equal(lessons.length,403);assert.equal(exams.length,6);
assert.equal(new Set(lessons.map(item=>item.id)).size,403);
const output=JSON.stringify({lessons,exams})+'\n';
writeFileSync(new URL('content/hki-2026-catalogue.json',root),output);
console.log(JSON.stringify({lessons:lessons.length,exams:exams.length,bytes:Buffer.byteLength(output)}));
