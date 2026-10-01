import assert from 'node:assert/strict';
await import('../public/terrain-core.js');
const K=globalThis.SignalTerrainCore,route=[[0,0],[10,0],[10,10],[20,10]];
let m=K.move(null,0,0);m=K.move(m,3,100);
assert.deepEqual(K.sample(route,K.at(m,320)),[10,0],'Movement visits intermediate path bend, never cuts diagonally across terrain');
assert.deepEqual(K.sample(route,K.at(m,540)),[10,10]);
assert.deepEqual(K.sample(route,K.at(m,9999)),[20,10]);
let old=K.move(m,1,500);assert.equal(old,m,'Delayed older position cannot reverse a player');
let next=K.move(m,5,600);assert.equal(next.from,K.at(m,600),'Polling and extra movement resume at the current animated position');
assert.equal(K.move(m,5,600,true).duration,0,'Reduced motion immediately uses the authoritative destination');
for(let x=-80;x<=80;x+=2)for(let z=-45;z<=45;z+=2){let h=K.elevation(x,z);assert(Number.isFinite(h)&&h>=0&&h<20);}
assert.equal(K.hash('Học sinh 26'),K.hash('Học sinh 26'));
console.log('Terrain movement passed: path bends, late response, chained moves, reduced motion and finite height field.');
