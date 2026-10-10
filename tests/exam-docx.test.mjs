import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import katex from 'katex';
import vm from 'node:vm';
import ts from 'typescript';
import { parseExamLines } from '../lib/exam/parse.js';
import * as examParser from '../lib/exam/parse.js';
import { parseMarkingGuide } from '../lib/exam/answer-key.js';

const exam = JSON.parse(readFileSync(new URL('./fixtures/exam-docx-toan11-4-dang.json', import.meta.url), 'utf8'));
const guide = JSON.parse(readFileSync(new URL('./fixtures/exam-docx-hdc-toan11-4-dang.json', import.meta.url), 'utf8'));
const adapter = await import('../lib/exam/docx-import.js').catch(() => ({}));
const lines = fixture => fixture.segments.flatMap(s => s.text.split(/\r?\n/)).map(text => ({ text }));
const expected = ['C','B','B','B','A','B','B','C','B','A','A','A',[true,true,true,false],[true,true,true,false],[true,false,true,true],[true,true,true,false],{accept:['2']},{accept:['258']},{accept:['6']}];

test('real Word structure yields 23 questions, four parts, 10 points and separate complete items', () => {
  const parsed = parseExamLines(lines(exam));
  assert.equal(parsed.questions.length, 23);
  assert.deepEqual(parsed.sections.map(s => s.roman), ['I','II','III','IV']);
  assert.deepEqual(parsed.questions.map(q => q.type), [...Array(12).fill('mc'),...Array(4).fill('tf'),...Array(3).fill('short'),...Array(4).fill('essay')]);
  assert.equal(parsed.questions.reduce((n,q)=>n+q.points,0), 10);
  for(const q of parsed.questions.filter(q=>q.type==='mc')) { assert.deepEqual(Object.keys(q.choiceText), ['A','B','C','D']); assert.doesNotMatch(q.text, /(?:^|\s)[A-D]\.\s/); }
  for(const q of parsed.questions.filter(q=>q.type==='tf')) { assert.deepEqual(Object.keys(q.statementText), ['a','b','c','d']); assert.doesNotMatch(q.text, /(?:^|\s)[a-d]\)\s/); }
  assert.match(parsed.questions[4].text, /Với.*k/);
  assert.doesNotMatch(parsed.questions[4].choiceText.D, /Với/);
  assert.match(parsed.questions[6].text, /\\frac\{2n\+1\}\{n\+1\}/);
  assert.match(parsed.questions[21].text, /a\).*b\).*c\)/s, 'essay subparts remain one block');
  assert.doesNotMatch(JSON.stringify(parsed), /UNSUPPORTED_WORD_CONTENT|UNSUPPORTED_DRAWING/);
});

test('real Word guide horizontal MC, TF and short tables yield all 19 keys and 23 solutions', () => {
  const qs = parseExamLines(lines(exam)).questions;
  const result = parseMarkingGuide(lines(guide).map(l=>l.text).join('\n'),qs);
  assert.deepEqual(Object.values(result.keys), expected);
  assert.equal(Object.keys(result.solutions).length, 23);
  assert.equal(Object.keys(result.rubrics).length, 4);
  assert.match(result.rubrics.q23, /9\/10|9 năm|10 năm/);
  assert.ok(result.problems.some(p=>/Bài 4/.test(p)&&/9|10|mốc thời gian/.test(p)), 'real ambiguous timing gets a teacher warning');
  assert.doesNotMatch(result.rubrics.q23, /BẢNG TỔNG HỢP NHANH/);
});

test('DOCX adapter reuses OMML and attaches all 14 figures in source order with bounded image data', {skip: !existsSync('C:/Users/ADMIN/Downloads/Toan11_GHKI_4_Dang.docx')}, () => {
  assert.equal(typeof adapter.importExamDocx,'function');
  const result = adapter.importExamDocx(readFileSync('C:/Users/ADMIN/Downloads/Toan11_GHKI_4_Dang.docx'));
  assert.equal(result.parsed.questions.length,23);
  assert.equal(result.images.length,14);
  assert.deepEqual(result.images.map(i=>i.qid),['q1','q2','q4','q6','q9','q10','q11','q12','q13','q14','q15','q16','q22','q23']);
  assert.deepEqual(result.images.map(i=>i.order), Array(14).fill(0));
  for(const image of result.images) { assert.match(image.mime,/^image\/(?:png|jpeg|webp)$/); assert.ok(image.data.length<=700000); assert.ok(image.segmentId); }
  assert.doesNotMatch(result.lines.join('\n'), /UNSUPPORTED_WORD_CONTENT|UNSUPPORTED_DRAWING/);
  assert.equal(result.warnings.some(w=>/bookmark|OMML.*preserved/.test(w)),false);
});

test('all actual Word stem, option, statement and solution formulas render without KaTeX errors', {skip: !existsSync('C:/Users/ADMIN/Downloads/Huong_dan_cham_Toan11_GHKI_4_dang.docx')}, () => {
  assert.equal(typeof adapter.importExamDocx,'function');
  const parsed = adapter.importExamDocx(readFileSync('C:/Users/ADMIN/Downloads/Toan11_GHKI_4_Dang.docx'));
  const marking = adapter.importExamDocx(readFileSync('C:/Users/ADMIN/Downloads/Huong_dan_cham_Toan11_GHKI_4_dang.docx'));
  const values = [...parsed.parsed.questions.flatMap(q=>[q.text,...Object.values(q.choiceText||{}),...Object.values(q.statementText||{})]),...marking.lines];
  let count=0;
  for(const text of values) for(const match of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) { count++; assert.doesNotThrow(()=>katex.renderToString(match[1]||match[2],{throwOnError:true,strict:'error'}),text); }
  const originalCount=[...exam.segments,...guide.segments].reduce((n,s)=>n+[...s.text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)].length,0);
  assert.ok(count>=originalCount,count+' output formulas preserve '+originalCount+' converter formula blocks');
});

const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main', A='http://schemas.openxmlformats.org/drawingml/2006/main', R='http://schemas.openxmlformats.org/officeDocument/2006/relationships', P='http://schemas.openxmlformats.org/package/2006/relationships';
function archive(target='media/p.png',mode='', ns=P, bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])) {
  return zipSync({'word/document.xml':strToU8(`<w:document xmlns:w="${W}" xmlns:a="${A}" xmlns:r="${R}"><w:body><w:p><w:r><w:t>PHẦN I. (1 câu/1 điểm) Trắc nghiệm</w:t></w:r></w:p><w:p><w:r><w:t>Câu 1. Hình</w:t></w:r><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p><w:p><w:r><w:t>A. Một B. Hai C. Ba D. Bốn</w:t></w:r></w:p></w:body></w:document>`),'word/_rels/document.xml.rels':strToU8(`<Relationships xmlns="${ns}"><Relationship Id="rId1" Type="${R}/image" Target="${target}" ${mode}/></Relationships>`),'word/media/p.png':bytes});
}

test('DOCX media targets reject external, traversal, wrong namespace and oversized or forged images', () => {
  assert.equal(typeof adapter.importExamDocx,'function');
  for(const [target,mode,ns] of [['https://evil.test/p.png','TargetMode="External"',P],['../p.png','',P],['media/p.svg','',P],['media/p.png','','urn:fake']]) {
    const result=adapter.importExamDocx(archive(target,mode,ns));
    assert.equal(result.images.length,0,target);
    assert.ok(result.warnings.length,target);
  }
  assert.equal(adapter.importExamDocx(archive()).images.length,1);
  assert.equal(adapter.importExamDocx(archive('media/p.png','',P,strToU8('<svg>fake</svg>'))).images.length,0);
  assert.throws(()=>adapter.importExamDocx(archive('media/p.png','',P,new Uint8Array(525001))),/INVALID_BODY/);
});

test('dependent option text defaults to protected; incomplete options stay whole for manual repair', () => {
  const parsed=parseExamLines([{text:'PHẦN I. Trắc nghiệm'},{text:'Câu 1. Chọn. A. Một B. Hai C. Cả A và B D. Không có đáp án'},{text:'Câu 2. Chọn. A. Một B. Hai'}]);
  assert.equal(parsed.questions[0].noShuffle,true);
  assert.equal(parsed.questions[1].choiceText,undefined);
  assert.equal(parsed.questions[1].noShuffle,true);
  assert.match(parsed.questions[1].text,/A\. Một B\. Hai/);
});

test('exam math compatibility renders known trig names as operators without rewriting commands or identifiers', () => {
  assert.equal(typeof adapter.examMathText,'function');
  const trig=adapter.examMathText('$sinx=cos\\alpha$'),sum=adapter.examMathText('$$sin3x+sinx=cosx.$$');
  assert.equal(trig,'$\\sin x=\\cos \\alpha$');
  assert.equal(sum,'$$\\sin 3x+\\sin x=\\cos x.$$');
  assert.equal(adapter.examMathText('$\\sin x+costTotal+asinx+\\operatorname{sinx}$'),'$\\sin x+costTotal+asinx+\\operatorname{sinx}$');
  const html=katex.renderToString(trig.slice(1,-1),{throwOnError:true});
  assert.match(html,/class="mop"[^>]*>sin<\/span>/);
  assert.match(html,/class="mop"[^>]*>cos<\/span>/);
});

test('PDF item crops require four isolated vertical labels; inline, shared tails and fragmented math fail closed', () => {
  assert.equal(typeof examParser.detectPdfItemRegions,'function');
  const rows=['Câu 1. Đề và hình phía trên','A. Một','B. Hai','C. Ba','D. Bốn'].map((text,i)=>({text,page:1,top:20+i*30,bottom:32+i*30,x:40,...(i?{itemContentX:60}:{})}));
  const q={id:'q1',type:'mc',label:'Câu 1',options:['A','B','C','D'],regions:[{page:1,top:18,bottom:160}]};
  const out=examParser.detectPdfItemRegions(q,rows,[{height:800}]);
  assert.deepEqual(Object.keys(out.itemRegions),['A','B','C','D']);
  assert.ok(out.stemRegions[0].bottom<out.itemRegions.A[0].top);
  assert.ok(out.stemRegions[0].bottom>rows[0].bottom);
  for(const [i,letter] of ['A','B','C','D'].entries()) { const r=out.itemRegions[letter][0]; assert.ok(r.top<rows[i+1].top&&r.bottom>rows[i+1].bottom); assert.equal(r.left,60,'original raster label is excluded'); }
  for(const lines of [[rows[0],{...rows[1],text:'A. Một B. Hai C. Ba D. Bốn'}],[...rows,{text:'Với k∈Z',page:1,top:154,bottom:159,x:40}],[...rows,{text:'√',page:1,top:64,bottom:68,x:50}],rows.map(row=>({...row,itemContentX:undefined}))]) {
    const failed=examParser.detectPdfItemRegions(q,lines,[{height:800}]);
    assert.deepEqual(failed.itemRegions,{});
    assert.ok(failed.reason);
    assert.deepEqual(failed.stemRegions,q.regions);
  }
});

test('PDF grouping measures label-only text item and refuses a combined label/content item', () => {
  const item=(str,x,width=10,y=700)=>({str,width,height:10,transform:[10,0,0,10,x,y]});
  const [separate]=examParser.groupPdfLines([item('A.',40,10),item('x = 2',60,30)],800,1);
  assert.equal(separate.itemContentX,55);
  assert.equal(examParser.groupPdfLines([item('A. x = 2',40,50)],800,1)[0].itemContentX,undefined);
  assert.equal(examParser.groupPdfLines([item('a)',40,10),item('x = 2',48,30)],800,1)[0].itemContentX,undefined,'overlapping label cannot be erased safely');
});

test('PDF crop honors per-region horizontal boundary; legacy whole-question strips keep their margin', async () => {
  const source=readFileSync(new URL('../components/exam/pdf-import.ts',import.meta.url),'utf8');
  const body=/async crop\(regions\) \{([\s\S]*?)\n    \},\n    destroy/.exec(source)[1];
  const code=ts.transpileModule('(async(regions)=>{'+body+'})',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const drawn=[];
  const crop=vm.runInNewContext(code,{clearCanvases(){},render:async()=>({width:400,height:600}),pages:[{width:200,height:300}],margin:10,SCALE:2,trimBlank(){},document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(...args){drawn.push(args);}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'})}});
  await crop([{page:1,top:20,bottom:40,left:60}]);
  assert.equal(drawn[0][1],120);
  assert.equal(drawn[0][3],260);
  await crop([{page:1,top:20,bottom:40}]);
  assert.equal(drawn[1][1],20);
  assert.equal(drawn[1][3],360);
});
