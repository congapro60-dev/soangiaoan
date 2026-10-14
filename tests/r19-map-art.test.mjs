import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PRODUCT_THEMES} from '../lib/product-content.js';
const routes={"cube": "72ce52c0de00dbc14cc58f752b0864797060c3391880b8ec5172bff0abb1b940", "ring": "d84501345c1238ae7df19701d2c4b751b6f799f9459d44a203bbe2227b03e867", "zones": "e4f5a1814a77a814d645e09cfb1b19c66d48cae46f1e90b658fb05661b313d12", "academy": "851c4a48a8f22647d29a4c64d803504eb9a80011f30d4faea2693f654000f285", "survival": "8870564487ab24a15d379d56dc35477459eeb190f384f0d16376edaeece94fd0", "galaxy": "f2a77df87efac52107157d0d66ceb8377dc8c0456d2fb1b58d1b69bcf187ded0", "maze": "ae1903b2d45d3a30a9240d1a05b737997725e94af4b5b85f1c00b682df29fcdc"};
test('new painted maps preserve all seven exact routes, checkpoints, covers and native-resolution asset pairs',()=>{
 for(const [world,hash] of Object.entries(routes)){
  const t=PRODUCT_THEMES[world];assert.equal(createHash('sha256').update(JSON.stringify(t.route)).digest('hex'),hash);
  assert.deepEqual(t.checkpoints,[0,8,16,24,32]);assert.equal(t.coverImage,`cover-${world}-r18-hd.webp`);
  assert.equal(t.image,`map-${world}-r19.webp`);assert.equal(t.imageHi,`map-${world}-r19-hd.webp`);
  for(const file of [t.image,t.imageHi])assert.ok(existsSync(new URL('../public/assets/'+file,import.meta.url)));
 }
 assert.deepEqual(['modern','historical','future','dewey','pastoral'].map(w=>PRODUCT_THEMES[w].image),['campaign-island.webp','campaign-historical.webp','campaign-future.webp','campaign-dewey.webp','campaign-pastoral.webp']);
});
test('game and lesson share explicit sharp-image metadata without changing 3D geometry',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),lesson=readFileSync(new URL('../public/lesson-map.html',import.meta.url),'utf8');
 assert.match(app,/imageHi: theme\(\)\.imageHi \? '\/assets\/' \+ theme\(\)\.imageHi/);
 assert.match(lesson,/imageHi: theme\.imageHi \? '\/assets\/' \+ theme\.imageHi/);
});
