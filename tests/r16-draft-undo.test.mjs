import test from 'node:test';
import assert from 'node:assert/strict';
import {containsDraftRemoval} from '../lib/lesson/draft-undo.js';
test('draft removal recognises nested fields, deleted questions and reordered items without mistaking ordinary edits',()=>{
 const before={id:'p',tasks:[{id:'a',prompt:'Old',options:['A','B']},{id:'b',prompt:'B'}],answer:{a:'1'}};
 assert.equal(containsDraftRemoval(before,{...before,tasks:[before.tasks[1],before.tasks[0]]}),false);
 assert.equal(containsDraftRemoval(before,{...before,tasks:[{...before.tasks[0],prompt:'New'},before.tasks[1]]}),false);
 assert.equal(containsDraftRemoval(before,{...before,tasks:[before.tasks[0]]}),true);
 assert.equal(containsDraftRemoval(before,{...before,tasks:[{...before.tasks[0],options:['A']},before.tasks[1]]}),true);
 assert.equal(containsDraftRemoval(before,{...before,answer:{}}),true);
 assert.equal(containsDraftRemoval(null,before),false);
});
