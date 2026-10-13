import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import katex from 'katex';
import {hashPackage} from '../lib/lesson/schema.js';
const normalize=s=>s.replaceAll('$','').replaceAll('\\ge','≥').replaceAll('\\le','≤').replaceAll('\\pi','π').replaceAll('−','-').replace(/\\(sin|tan)\s*/g,'$1').replaceAll('u_(n+1)','u_{n+1}').replace(/_\{(\d+)\}/g,'_$1');
const canonical=v=>typeof v==='string'?normalize(v):Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='contentHash').map(([k,x])=>[k,canonical(x)])):v;
const records=[
  {
    "file": "content/lessons/g11-w6-p38.json",
    "semanticSha": "e94c14bec17631b227214b7890c4d90eb3b70ee374e8feea10f170472dfeb672"
  },
  {
    "file": "content/lessons/g11-w6-p41.json",
    "semanticSha": "5596c546b772a6948434da4dd1b2b153c2aec6eab20c5621b343885330f5ce79"
  },
  {
    "file": "content/lessons/g11-sequences-p1.json",
    "semanticSha": "0a208f786d05fc5ad642f9dc04c7c2c3dffec8e52b5e0d6f68947142340dc527",
    "paths": [
      "objectives.0.statement",
      "activities.2.expectedProduct",
      "activities.2.teacherLookFor",
      "activities.4.expectedProduct",
      "activities.7.studentAction",
      "activities.8.teacherLookFor",
      "tasks.2.supportRationale",
      "tasks.3.supportRationale",
      "tasks.5.supportRationale",
      "tasks.6.supportRationale",
      "tasks.7.supportRationale",
      "tasks.8.supportRationale",
      "hints.4.text",
      "hints.5.text",
      "hints.6.text",
      "hints.7.text",
      "hints.9.text",
      "hints.13.text",
      "hints.15.text",
      "rubric.lookFor.0"
    ]
  },
  {
    "file": "content/lessons/g11-sequences-p2.json",
    "semanticSha": "d63284b11a16c9535f75c39f835858a3aff0db3ed7dd158174393046d5f00eb7",
    "paths": [
      "tasks.8.inputSchema.options.1.label",
      "rubric.criteria.1"
    ]
  },
  {
    "file": "content/lessons/g11-w6-p39-must-only.json",
    "semanticSha": "3079f1c894aa6d8c486badf4e9f2e5fd2d94e40aabdd8491b6ab19681c69a3e1",
    "paths": [
      "prerequisites.1",
      "tasks.3.inputSchema.options.0.label",
      "tasks.3.inputSchema.options.1.label",
      "tasks.3.inputSchema.options.2.label"
    ]
  }
];
for(const record of records)test(record.file+' formatting preserves every source fact and renders math',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../'+record.file,import.meta.url)));
 assert.equal(createHash('sha256').update(JSON.stringify(canonical(pkg))).digest('hex'),record.semanticSha);
 assert.equal(pkg.contentHash,hashPackage(pkg));
 const texts=record.paths?record.paths.map(path=>path.split('.').reduce((o,k)=>o[k],pkg)):[...pkg.tasks.map(t=>t.prompt),...pkg.rubric.criteria];
 for(const text of texts)for(const [,math]of text.matchAll(/\$([^$]+)\$/g))assert.doesNotThrow(()=>katex.renderToString(math,{throwOnError:true,strict:'error'}));
});

