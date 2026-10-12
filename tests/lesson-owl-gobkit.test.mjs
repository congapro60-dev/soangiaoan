import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../public/vendor/three/three.core.min.js';

const bytes = await readFile(new URL('../public/models/mascot-gobkit-a.glb', import.meta.url));
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const binaryStart = 20 + bytes.readUInt32LE(12) + 8;
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function floats(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  assert.equal(a.componentType, 5126);
  const width = components[a.type], values = [];
  for (let i = 0; i < a.count; i++) for (let j = 0; j < width; j++) {
    values.push(bytes.readFloatLE(binaryStart + (view.byteOffset || 0) + (a.byteOffset || 0) + i * (view.byteStride || width * 4) + j * 4));
  }
  assert.ok(values.every(Number.isFinite));
  return values;
}
const varies = index => {
  const a = gltf.accessors[index], width = components[a.type], values = floats(index);
  return values.some((v, i) => Math.abs(v - values[i % width]) > 1e-4);
};

async function parseGeometry(file) {
  const context = vm.createContext({ console, URL, TextDecoder, ArrayBuffer, Uint8Array, Float32Array, Set, Map, Promise, Math });
  const three = new vm.SyntheticModule(Object.keys(THREE), function () { for (const key of Object.keys(THREE)) this.setExport(key, THREE[key]); }, { context });
  const utils = new vm.SourceTextModule(await readFile(new URL('../public/vendor/three/addons/utils/BufferGeometryUtils.js', import.meta.url), 'utf8'), { context });
  await utils.link(() => three); await utils.evaluate();
  const loader = new vm.SourceTextModule(await readFile(new URL('../public/vendor/three/addons/loaders/GLTFLoader.js', import.meta.url), 'utf8'), { context });
  await loader.link(specifier => specifier === 'three' ? three : utils); await loader.evaluate();
  const source = await readFile(new URL('../public/models/' + file + '.glb', import.meta.url)), jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
  // Geometry/controller check only: omit embedded texture decoding in Node.
  for (const material of json.materials || []) delete material.pbrMetallicRoughness?.baseColorTexture;
  json.images = []; json.textures = [];
  const encoded = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(padded);
  const binary = source.subarray(20 + jsonLength), buffer = Buffer.alloc(20 + padded.length + binary.length);
  source.subarray(0, 20).copy(buffer); buffer.writeUInt32LE(buffer.length, 8); buffer.writeUInt32LE(padded.length, 12); padded.copy(buffer, 20); binary.copy(buffer, 20 + padded.length);
  return new Promise((resolve, reject) => new loader.namespace.GLTFLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '', resolve, reject));
}

test('actual GLBs fit requested dimensions after independent skeleton cloning and animation', async () => {
  const context = vm.createContext({ console, Set, Map, Promise, Math });
  const controller = new vm.SourceTextModule(await readFile(new URL('../public/map3d-owl.js', import.meta.url), 'utf8'), { context });
  await controller.link(() => new vm.SyntheticModule(Object.keys(THREE), function () { for (const key of Object.keys(THREE)) this.setExport(key, THREE[key]); }, { context }));
  await controller.evaluate();
  for (const file of ['mascot-owl', 'mascot-gobkit-a']) {
    const asset = await parseGeometry(file), layer = controller.namespace.createOwlLayer({ load: async () => asset });
    if (file === 'mascot-gobkit-a') {
      const frame = asset.scene.getObjectByName('Glasses_Frame');
      assert.ok(frame, 'joined glasses are present in actual geometry');
      asset.scene.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(frame, true).getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x - 1.745193) < 1e-5 && Math.abs(size.y - .814294) < 1e-5 && Math.abs(size.z - .230814) < 1e-5, 'two rings and bridge retain approved world bounds');
    }
    const item = { entry: { id: 'own', group: new THREE.Group(), mascot: 1, own: true, walkT: 1 }, depth: 1, height: 3 };
    layer.sync([item], 0); await new Promise(setImmediate); layer.sync([item], 0);
    item.entry.group.updateMatrixWorld(true);
    const rest = new THREE.Box3().setFromObject(item.entry.group).getSize(new THREE.Vector3());
    assert.ok(Math.max(rest.x, rest.y, rest.z) <= item.height + 1e-5, file + ' rest size exceeds requested box');
    for (const walking of [false, true, false]) {
      item.entry.walkT = walking ? .5 : 1;
      for (let step = 0; step < 12; step++) {
        layer.step(.1); item.entry.group.updateMatrixWorld(true);
        item.entry.group.traverse(node => { if (node.isSkinnedMesh) node.computeBoundingBox(); });
        const bound = new THREE.Box3().setFromObject(item.entry.group), size = bound.getSize(new THREE.Vector3());
        // Real limb/breath deformation may extend5% beyond the fitted rest pose.
        assert.ok(Math.max(size.x, size.y, size.z) <= item.height * 1.05, file + ' exceeds requested animated size');
        assert.ok(bound.min.y > -.15 && bound.max.y < 3.7, file + ' clips feet or makes a gross root jump');
      }
    }
    layer.dispose();
  }
});

test('Gobkit A stays self contained, bounded, genuinely skinned and licensed', async () => {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.ok(bytes.length <= 300 * 1024);
  assert.equal(gltf.skins.length, 1);
  assert.equal(gltf.meshes.length, 3);
  assert.ok(gltf.meshes.every(mesh => mesh.primitives.length === 1), 'three draw primitives');
  assert.equal(gltf.skins[0].joints.length, 16);
  assert.ok(!gltf.buffers.some(b => b.uri) && !gltf.images.some(i => i.uri));
  const triangles = gltf.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, p) => n + gltf.accessors[p.indices].count / 3, 0), 0);
  assert.ok(triangles <= 5000);
  const body = gltf.nodes.find(n => n.name === 'Owl');
  assert.equal(body.skin, 0);
  const primitive = gltf.meshes[body.mesh].primitives[0], weights = floats(primitive.attributes.WEIGHTS_0);
  assert.ok(primitive.attributes.JOINTS_0 !== undefined);
  for (let i = 0; i < weights.length; i += 4) assert.ok(Math.abs(weights.slice(i, i + 4).reduce((a, b) => a + b, 0) - 1) < .001);
  const credits = await readFile(new URL('../public/models/CREDITS.md', import.meta.url), 'utf8');
  assert.match(credits, /mascot-gobkit-a\.glb/);
  assert.match(credits, /Gobkit \/ Alsomind Tech Co\., Ltd\./);
  assert.match(credits, /https:\/\/gobkit\.com\/freebies\/animalB\/Owl\.glb/);
  assert.match(credits, /https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/legalcode/);
});

test('all three clips retain real skeletal motion; glasses and cloak follow the correct bones', () => {
  assert.deepEqual(gltf.animations.map(a => a.name).sort(), ['hop', 'idle', 'walk']);
  for (const clip of gltf.animations) {
    const moving = clip.channels.filter(c => varies(clip.samplers[c.sampler].output));
    assert.ok(moving.length > 0, clip.name);
    assert.ok(moving.some(c => gltf.skins[0].joints.includes(c.target.node)), clip.name);
    if (clip.name === 'walk') assert.ok(moving.some(c => /Leg|Hand/.test(gltf.nodes[c.target.node].name)), 'walk moves limbs');
  }
  const hop = gltf.animations.find(a => a.name === 'hop');
  const root = hop.channels.find(c => gltf.nodes[c.target.node].name === 'Root' && c.target.path === 'translation');
  const position = floats(hop.samplers[root.sampler].output);
  const extent = axis => Math.max(...position.filter((_, i) => i % 3 === axis)) - Math.min(...position.filter((_, i) => i % 3 === axis));
  assert.ok(extent(1) > .3, 'hop moves vertically in glTF Y-up');
  assert.ok(extent(0) < .01 && extent(2) < .01, 'hop does not drift sideways');
  const head = gltf.nodes.find(n => n.name === 'Head'), spine = gltf.nodes.find(n => n.name === 'Spine');
  const glasses = gltf.nodes.findIndex(n => n.name === 'Glasses_Frame');
  assert.ok(glasses >= 0 && head.children.includes(glasses));
  const frame = gltf.meshes[gltf.nodes[glasses].mesh].primitives[0];
  assert.equal(gltf.accessors[frame.indices].count / 3, 268, 'two128-triangle rings plus12-triangle bridge');
  assert.equal(gltf.materials[frame.material].name, 'Glasses_Frame');
  const cloak = gltf.nodes.findIndex(n => n.name === 'BlueCloak');
  assert.ok(cloak >= 0 && spine.children.includes(cloak));
  const material = gltf.materials.find(m => m.name === 'Cloak_Blue');
  assert.equal(material.doubleSided, true);
  assert.ok(material.pbrMetallicRoughness.baseColorFactor[2] > material.pbrMetallicRoughness.baseColorFactor[0]);
});

test('candidate texture survives instance replacement, disposes exactly once with template', async () => {
  const context = vm.createContext({ console, Set, Map, Promise, Math });
  const controller = new vm.SourceTextModule(await readFile(new URL('../public/map3d-owl.js', import.meta.url), 'utf8'), { context });
  await controller.link(() => new vm.SyntheticModule(Object.keys(THREE), function () {
    for (const key of Object.keys(THREE)) this.setExport(key, THREE[key]);
  }, { context }));
  await controller.evaluate();
  const texture = new THREE.Texture(), scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture })));
  let disposals = 0; texture.addEventListener('dispose', () => disposals++);
  const layer = controller.namespace.createOwlLayer({ load: async () => ({ scene, animations: [] }) });
  const item = { entry: { id: 'own', group: new THREE.Group(), mascot: 1, own: true, walkT: 1 }, depth: 1, height: 3 };
  layer.sync([item], 0); await new Promise(setImmediate); layer.sync([item], 0);
  layer.sync([item], 2); assert.equal(disposals, 0);
  layer.dispose(); layer.dispose(); assert.equal(disposals, 1);
});
