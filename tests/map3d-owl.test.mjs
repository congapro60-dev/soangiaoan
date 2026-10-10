import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../public/vendor/three/three.core.min.js';

async function controller() {
  const src=await readFile(new URL('../public/map3d-owl.js',import.meta.url),'utf8');
  const ctx=vm.createContext({console,Set,Map,Promise,Math});
  const mod=new vm.SourceTextModule(src,{context:ctx});
  await mod.link(()=>new vm.SyntheticModule(Object.keys(THREE),function(){for(const k of Object.keys(THREE))this.setExport(k,THREE[k]);},{context:ctx}));
  await mod.evaluate();
  return mod.namespace.createOwlLayer;
}
function fixture(){
  const scene=new THREE.Group(),bone=new THREE.Bone();bone.name='RootBone';scene.add(bone);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,2,0],3));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(12),4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
  const material=new THREE.MeshStandardMaterial(),mesh=new THREE.SkinnedMesh(g,material);scene.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
  const animations=['idle','walk','hop'].map(name=>new THREE.AnimationClip(name,1,[new THREE.VectorKeyframeTrack('RootBone.position',[0,1],[0,0,0,0,1,0])]));
  return {scene,animations,mesh,bone,material};
}
const row=(id,own=false)=>({entry:{id,group:new THREE.Group(),mascot:1,own,walkT:1},depth:Number(id)||1,height:3,yaw:0});

test('owl layer loads lazily, caps three, isolates skeletons and preserves shared resources',async()=>{
  const create=await controller(),gltf=fixture();let loads=0,geomDisposals=0,matDisposals=0;
  gltf.mesh.geometry.addEventListener('dispose',()=>geomDisposals++);gltf.material.addEventListener('dispose',()=>matDisposals++);
  const layer=create({load:async()=>{loads++;return gltf;},changed:()=>{}}),items=[row('1',true),row('2'),row('3'),row('4')];
  assert.equal(layer.sync(items,2).size,0);assert.equal(loads,0);
  layer.sync(items,0);await new Promise(setImmediate);
  assert.equal(layer.sync(items,0).size,3);assert.equal(loads,1);
  const meshes=items.slice(0,3).map(r=>{let m;r.entry.group.traverse(x=>{if(x.isSkinnedMesh)m=x;});return m;});
  assert.notEqual(meshes[0].skeleton.bones[0],meshes[1].skeleton.bones[0]);assert.notEqual(meshes[0].skeleton.bones[0],gltf.bone);
  layer.step(0.1);assert.ok(meshes[0].skeleton.bones[0].position.y>0);assert.equal(gltf.bone.position.y,0);
  layer.sync(items,2);assert.equal(layer.stats().active,0);assert.equal(geomDisposals,0);assert.equal(matDisposals,0);
  layer.dispose();assert.equal(geomDisposals,1);assert.equal(matDisposals,1);
});

test('destroy during loading never resurrects a model; failed load keeps cards without retries',async()=>{
  const create=await controller(),gltf=fixture();let resolve,changed=0,disposed=0,loads=0;
  gltf.mesh.geometry.addEventListener('dispose',()=>disposed++);
  const layer=create({load:()=>new Promise(r=>{resolve=r;}),changed:()=>changed++});layer.sync([row('1')],0);layer.dispose();resolve(gltf);await new Promise(setImmediate);
  assert.equal(layer.stats().active,0);assert.equal(changed,0);assert.equal(disposed,1);
  const failed=create({load:async()=>{loads++;throw Error('offline');},changed:()=>{}});failed.sync([row('1')],0);await new Promise(setImmediate);
  assert.equal(failed.sync([row('1')],0).size,0);assert.equal(loads,1);failed.dispose();
});

test('owl motion follows walkT, hops once on arrival, idles at 12FPS and respects reduced motion',async()=>{
  const create=await controller(),item=row('1',true),layer=create({load:async()=>fixture()});
  layer.sync([item],0);await new Promise(setImmediate);layer.sync([item],0);
  assert.equal(layer.stats().clips[0],'idle');assert.equal(layer.step(0.01),false);
  item.entry.walkT=0.5;layer.step(0.1);assert.equal(layer.stats().clips[0],'walk');
  item.entry.walkT=1;layer.step(0.1);assert.equal(layer.stats().clips[0],'hop');
  for(let i=0;i<12;i++)layer.step(0.1);assert.equal(layer.stats().clips[0],'idle');layer.dispose();
  const frozen=create({load:async()=>fixture(),reduced:true});frozen.sync([item],0);await new Promise(setImmediate);frozen.sync([item],0);
  item.entry.walkT=0;assert.equal(frozen.step(0.1),false);assert.equal(frozen.stats().clips[0],'idle');frozen.dispose();
});

test('owl GLB stays within budget, is rigged, self contained and has three clips', async () => {
  const bytes=await readFile(new URL('../public/models/mascot-owl.glb',import.meta.url));
  assert.ok(bytes.length<=300*1024);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(gltf.skins?.[0].joints.length>=4);
  assert.deepEqual(gltf.animations.map(x=>x.name).sort(),['hop','idle','walk']);
  assert.ok(!gltf.images?.length && !gltf.buffers.some(x=>x.uri));
  const tris=gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+gltf.accessors[p.indices].count/3,0),0);
  assert.ok(tris<=3000);
  assert.equal(gltf.materials.length,1);
  for(const mesh of gltf.meshes)for(const p of mesh.primitives)assert.ok(p.attributes.COLOR_0!==undefined);
});
