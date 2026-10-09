// Models for the 3D map, built from code: soft rounded tree crowns, drooping pines, grass tufts, and buildings
// with real curved, up-turned roofs. Every model is one geometry with vertex colours (a gradient from dark at the
// bottom to light on top, a little noise), so a whole forest is a single draw call.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1442695041);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const xf = f(x - xi);
  const yf = f(y - yi);
  const zf = f(z - zi);
  const l = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(l(0, 0, 0), l(1, 0, 0), xf), lerp(l(0, 1, 0), l(1, 1, 0), xf), yf),
    lerp(lerp(l(0, 0, 1), l(1, 0, 1), xf), lerp(l(0, 1, 1), l(1, 1, 1), xf), yf),
    zf,
  );
}

/**
 * Merge parts into one geometry with vertex colours.
 * part: { geo, color, pos, rot, scale, grad: [bottomFactor, topFactor, y0, y1], jitter }
 */
export function buildGeometry(parts) {
  const positions = [];
  const normals = [];
  const colors = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
    e.set(...(part.rot || [0, 0, 0]));
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(...(part.pos || [0, 0, 0])), q, new THREE.Vector3(...(part.scale || [1, 1, 1])));
    g.applyMatrix4(m);
    c.set(part.color);
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const own = g.attributes.color?.array;
    const [g0, g1, y0, y1] = part.grad || [1, 1, 0, 1];
    const jit = part.jitter || 0;
    for (let i = 0; i < p.length; i += 3) {
      const t = clamp((p[i + 1] - y0) / (y1 - y0 || 1), 0, 1);
      let f = lerp(g0, g1, t);
      if (jit) f *= 1 + (noise3(p[i] * 2.3, p[i + 1] * 2.3, p[i + 2] * 2.3) - 0.5) * 2 * jit;
      positions.push(p[i], p[i + 1], p[i + 2]);
      normals.push(n[i], n[i + 1], n[i + 2]);
      colors.push(c.r * f * (own ? own[i] : 1), c.g * f * (own ? own[i + 1] : 1), c.b * f * (own ? own[i + 2] : 1));
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (...args) => new THREE.CylinderGeometry(...args);
const cone = (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg);
const shade = (hex, l) => new THREE.Color(hex).offsetHSL(0, 0, l).getHex();

/** A rounded, slightly lumpy crown: welded icosphere pushed in and out by noise, smooth-shaded. */
function blob(radius, seed, { squash = 1, amp = 0.16, detail = 1 } = {}) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-3);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (noise3(v.x * 1.4 + seed * 3.1, v.y * 1.4 + seed, v.z * 1.4 - seed * 2.3) - 0.5) * 2 * amp;
    v.multiplyScalar(k);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A pine tier: a cone whose lower rim droops and wobbles a little. */
function droopCone(radius, height, segments, droop, seed) {
  const g = new THREE.ConeGeometry(radius, height, segments, 1, true);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y < 0) {
      const angle = Math.atan2(v.z, v.x);
      const wob = 1 + (noise3(Math.cos(angle) * 2 + seed, seed, Math.sin(angle) * 2) - 0.5) * 0.28;
      v.x *= wob;
      v.z *= wob;
      v.y -= height * droop * (0.6 + 0.4 * Math.sin(angle * 3 + seed));
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A traditional roof: an outline that shrinks from the wide eave to the ridge, rising slowly at first and steeply
 * near the top (a concave sweep), with the eave corners curling up. Footprint half sizes a (x) and b (z).
 */
export function curvedRoof(a, b, height, { over = 0.5, up = 0.4, rings = 7, perEdge = 7, exponent = 1.7 } = {}) {
  const alongX = a >= b;
  const ridge = Math.abs(a - b);
  const A0 = a + over;
  const B0 = b + over;
  const positions = [];
  const colors = [];
  const indices = [];
  const count = perEdge * 4;
  for (let ri = 0; ri <= rings; ri++) {
    const t = ri / rings;
    const A = lerp(A0, alongX ? ridge : 0, t);
    const B = lerp(B0, alongX ? 0 : ridge, t);
    const y = height * Math.pow(t, exponent);
    const tile = ri % 2 ? 1 : 0.9; // visible tile courses
    for (let k = 0; k < count; k++) {
      const edge = Math.floor(k / perEdge);
      const s = (k % perEdge) / perEdge;
      let x;
      let z;
      if (edge === 0) { x = lerp(-A, A, s); z = -B; }
      else if (edge === 1) { x = A; z = lerp(-B, B, s); }
      else if (edge === 2) { x = lerp(A, -A, s); z = B; }
      else { x = -A; z = lerp(B, -B, s); }
      const corner = (Math.abs(x) / A0) * (Math.abs(z) / B0);
      const lift = up * Math.pow(corner, 2.4) * Math.pow(1 - t, 2);
      positions.push(x, y + lift, z);
      colors.push(tile, tile, tile);
    }
  }
  for (let ri = 0; ri < rings; ri++) {
    for (let k = 0; k < count; k++) {
      const k2 = (k + 1) % count;
      const a0 = ri * count + k;
      const a1 = ri * count + k2;
      const b0 = (ri + 1) * count + k;
      const b1 = (ri + 1) * count + k2;
      indices.push(a0, b0, a1, a1, b0, b1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Roof with its ridge cap and ornaments. Returns parts to be placed at height y. */
function roofParts(a, b, y, color, trim, rise = 1.1, { over = 0.55, up = 0.45 } = {}) {
  const parts = [{ geo: curvedRoof(a, b, rise, { over, up }), pos: [0, y, 0], color }];
  const ridge = Math.abs(a - b);
  const alongX = a >= b;
  if (ridge > 0.05) {
    parts.push({ geo: box(alongX ? ridge * 2 + 0.5 : 0.3, 0.2, alongX ? 0.3 : ridge * 2 + 0.5), pos: [0, y + rise + 0.05, 0], color: trim });
    for (const s of [-1, 1]) {
      parts.push({ geo: cone(0.17, 0.62, 5), pos: [alongX ? s * (ridge + 0.3) : 0, y + rise + 0.32, alongX ? 0 : s * (ridge + 0.3)], rot: alongX ? [0, 0, -s * 0.5] : [s * 0.5, 0, 0], color: trim });
    }
  } else {
    parts.push({ geo: cyl(0.05, 0.12, 0.9, 6), pos: [0, y + rise + 0.4, 0], color: trim });
    parts.push({ geo: new THREE.SphereGeometry(0.2, 8, 6), pos: [0, y + rise + 0.95, 0], color: trim });
  }
  return parts;
}

export function baseModels(theme) {
  const models = {};
  // ---- trees
  models.pine = buildGeometry([
    { geo: cyl(0.22, 0.38, 2.2, 7), pos: [0, 1.1, 0], color: 0x5b3b22, grad: [0.6, 1, 0, 2.2] },
    { geo: droopCone(2.0, 3.0, 11, 0.22, 1), pos: [0, 3.0, 0], color: theme.leaf.pine, grad: [0.62, 1.1, 1.4, 4.5], jitter: 0.07 },
    { geo: droopCone(1.65, 2.7, 11, 0.22, 2), pos: [0, 4.6, 0], color: shade(theme.leaf.pine, 0.03), grad: [0.66, 1.14, 3.2, 6.0], jitter: 0.07 },
    { geo: droopCone(1.3, 2.4, 10, 0.2, 3), pos: [0, 6.0, 0], color: shade(theme.leaf.pine, 0.06), grad: [0.7, 1.18, 4.8, 7.2], jitter: 0.07 },
    { geo: droopCone(0.85, 2.0, 9, 0.16, 4), pos: [0, 7.3, 0], color: shade(theme.leaf.pine, 0.09), grad: [0.78, 1.25, 6.2, 8.4], jitter: 0.07 },
  ]);
  const crown = (leaf) =>
    buildGeometry([
      { geo: cyl(0.3, 0.46, 2.6, 7), pos: [0, 1.3, 0], color: 0x6a4527, grad: [0.6, 1, 0, 2.6] },
      { geo: blob(1.75, 1, { squash: 0.84 }), pos: [0, 3.9, 0], color: leaf, grad: [0.6, 1.1, 2.4, 5.6], jitter: 0.07 },
      { geo: blob(1.3, 2, { squash: 0.9 }), pos: [1.3, 3.25, 0.4], color: shade(leaf, -0.03), grad: [0.62, 1.08, 2.2, 4.6], jitter: 0.07 },
      { geo: blob(1.25, 3, { squash: 0.9 }), pos: [-1.1, 4.3, -0.5], color: shade(leaf, 0.03), grad: [0.66, 1.12, 3.0, 5.6], jitter: 0.07 },
      { geo: blob(1.0, 4, { squash: 0.9 }), pos: [0.2, 5.15, 0.45], color: shade(leaf, 0.07), grad: [0.74, 1.2, 4.2, 6.2], jitter: 0.07 },
    ]);
  models.round = crown(theme.leaf.round);
  models.blossom = crown(theme.leaf.blossom);
  const stalks = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + i * 0.3;
    const lean = 0.05 + (i % 3) * 0.03;
    stalks.push({
      geo: cyl(0.06, 0.1, 5.2 + (i % 3), 5),
      pos: [Math.cos(a) * (0.35 + (i % 2) * 0.3), 2.8, Math.sin(a) * (0.35 + (i % 2) * 0.3)],
      rot: [Math.sin(a) * lean, 0, -Math.cos(a) * lean],
      color: i % 2 ? theme.leaf.bamboo : shade(theme.leaf.bamboo, -0.07),
      grad: [0.8, 1.15, 0, 6],
    });
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    stalks.push({ geo: blob(0.85, 10 + i, { squash: 0.55, amp: 0.22 }), pos: [Math.cos(a) * 0.55, 5.1 + (i % 2) * 0.6, Math.sin(a) * 0.55], color: shade(theme.leaf.bamboo, 0.05), grad: [0.8, 1.2, 4.5, 6.5], jitter: 0.08 });
  }
  models.bamboo = buildGeometry(stalks);
  models.rock = buildGeometry([{ geo: blob(1, 7, { squash: 0.7, amp: 0.28, detail: 1 }), pos: [0, 0.25, 0], color: theme.rockColor ?? 0x8a8378, grad: [0.7, 1.1, -0.5, 1], jitter: 0.1 }]);

  // ---- grass and flowers
  const tuft = [];
  const bladeCount = 6;
  for (let i = 0; i < bladeCount; i++) {
    const a = (i / bladeCount) * Math.PI * 2 + hash3(i, 3, 5) * 0.8;
    const lean = 0.18 + hash3(i, 7, 9) * 0.22;
    const hgt = 0.7 + hash3(i, 11, 13) * 0.55;
    const w = 0.09;
    const g = new THREE.BufferGeometry();
    const cx = Math.cos(a) * 0.1;
    const cz = Math.sin(a) * 0.1;
    const px = -Math.sin(a) * w;
    const pz = Math.cos(a) * w;
    const tx = cx + Math.cos(a) * lean;
    const tz = cz + Math.sin(a) * lean;
    g.setAttribute('position', new THREE.Float32BufferAttribute([cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, hgt, tz], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    tuft.push({ geo: g, color: shade(theme.palette.grassB, -0.02), grad: [0.5, 1.3, 0, 1.0] });
  }
  models.tuft = buildGeometry(tuft);
  models.flower = buildGeometry([
    { geo: new THREE.CircleGeometry(0.17, 6), pos: [0, 0.52, 0], rot: [-Math.PI / 2 + 0.25, 0, 0], color: 0xffffff },
    { geo: new THREE.CircleGeometry(0.06, 5), pos: [0, 0.535, 0.01], rot: [-Math.PI / 2 + 0.25, 0, 0], color: 0xffd86a },
  ]);

  return models;
}

/** The original kit: a Vietnamese citadel with curved tiled roofs, a pagoda tower and a gate. */
export function citadelKit(theme) {
  const models = {};
  // ---- house: stone plinth, plaster walls in a timber frame, lattice windows, curved tiled roof
  const house = [
    { geo: box(3.0, 0.32, 2.6), pos: [0, 0.16, 0], color: 0x8d877b, jitter: 0.06 },
    { geo: box(2.4, 1.5, 2.0), pos: [0, 1.07, 0], color: theme.wall, grad: [0.86, 1, 0.3, 1.8] },
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ geo: cyl(0.11, 0.11, 1.6, 6), pos: [sx * 1.2, 1.12, sz * 1.0], color: theme.pillar })),
    { geo: box(2.55, 0.14, 2.15), pos: [0, 1.82, 0], color: theme.pillar },
    { geo: box(0.62, 1.0, 0.07), pos: [0, 0.82, 1.03], color: 0x5a3a24 },
    { geo: box(0.76, 0.1, 0.1), pos: [0, 1.36, 1.05], color: theme.pillar },
    ...[-0.78, 0.78].flatMap((x) => [
      { geo: box(0.55, 0.5, 0.06), pos: [x, 1.3, 1.03], color: 0x2c2018 },
      { geo: box(0.5, 0.04, 0.08), pos: [x, 1.3, 1.045], color: 0xc9a86a },
      { geo: box(0.04, 0.46, 0.08), pos: [x, 1.3, 1.045], color: 0xc9a86a },
    ]),
    { geo: box(0.9, 0.12, 0.5), pos: [0, 0.06, 1.4], color: 0x9d968a },
    ...roofParts(1.35, 1.12, 1.88, theme.roof, theme.trim, 1.2, { over: 0.6, up: 0.4 }),
  ];
  models.house = buildGeometry(house);

  // ---- tiered pagoda tower
  const tower = [
    { geo: box(6.8, 0.5, 6.8), pos: [0, 0.25, 0], color: 0x8d877b, jitter: 0.05 },
    { geo: box(5.8, 0.5, 5.8), pos: [0, 0.75, 0], color: 0x9d968a, jitter: 0.05 },
    ...[0, 1, 2].map((i) => ({ geo: box(2.4 - i * 0.2, 0.17, 0.6), pos: [0, 0.17 + i * 0.17, 3.25 + 0.5 - i * 0.3], color: 0xa9a294 })),
  ];
  let y = 1;
  for (let k = 0; k < 3; k++) {
    const w = 3.9 - k * 0.8;
    const half = w / 2;
    tower.push({ geo: box(w, 1.75, w), pos: [0, y + 0.88, 0], color: theme.wall, grad: [0.84, 1, y, y + 1.8] });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower.push({ geo: cyl(0.13, 0.13, 1.85, 7), pos: [sx * half, y + 0.92, sz * half], color: theme.pillar });
    tower.push({ geo: box(w + 0.2, 0.16, w + 0.2), pos: [0, y + 1.78, 0], color: theme.pillar });
    tower.push({ geo: box(w + 0.95, 0.12, w + 0.95), pos: [0, y + 1.92, 0], color: theme.trim });
    for (const [rx, rz, wx, wz] of [[0, half + 0.02, 0.8, 0.06], [0, -half - 0.02, 0.8, 0.06], [half + 0.02, 0, 0.06, 0.8], [-half - 0.02, 0, 0.06, 0.8]]) {
      tower.push({ geo: box(wx, 1.0, wz), pos: [rx, y + 0.85, rz], color: 0x2d2118 });
      tower.push({ geo: box(wx > 0.1 ? 0.9 : 0.1, 0.07, wz > 0.1 ? 0.1 : 0.9), pos: [rx, y + 0.35, rz], color: theme.trim });
    }
    tower.push(...roofParts(half + 0.15, half + 0.15, y + 1.98, theme.roof, theme.trim, 1.05 - k * 0.04, { over: 0.85, up: 0.6 }));
    y += 3.1;
  }
  tower.push({ geo: cyl(0.06, 0.1, 2.6, 6), pos: [0, y + 0.5, 0], color: theme.trim });
  for (let i = 0; i < 4; i++) tower.push({ geo: new THREE.TorusGeometry(0.28 - i * 0.04, 0.05, 5, 12), pos: [0, y + 0.1 + i * 0.4, 0], rot: [Math.PI / 2, 0, 0], color: theme.trim });
  tower.push({ geo: new THREE.SphereGeometry(0.26, 10, 8), pos: [0, y + 1.9, 0], color: theme.trim });
  models.tower = buildGeometry(tower);

  // ---- gate over the road (the beam runs along local x, the road along local z)
  const arch = [];
  for (const s of [-1, 1]) {
    arch.push({ geo: cyl(0.32, 0.36, 4.7, 8), pos: [s * 3.2, 2.35, 0], color: theme.pillar, grad: [0.8, 1.05, 0, 4.7] });
    arch.push({ geo: cyl(0.5, 0.58, 0.6, 10), pos: [s * 3.2, 0.3, 0], color: 0x8d877b });
    arch.push({ geo: cyl(0.22, 0.25, 3.6, 7), pos: [s * 2.2, 1.8, 0], color: theme.pillar });
    arch.push({ geo: box(0.7, 0.55, 0.7), pos: [s * 2.2, 0.28, 0], color: 0x8d877b });
    arch.push({ geo: box(0.55, 0.3, 0.5), pos: [s * 3.2, 4.45, 0], color: theme.trim });
    arch.push({ geo: box(0.4, 0.25, 0.4), pos: [s * 2.2, 3.7, 0], color: theme.trim });
  }
  arch.push({ geo: box(7.5, 0.55, 0.7), pos: [0, 4.35, 0], color: theme.pillar });
  arch.push({ geo: box(7.6, 0.15, 0.85), pos: [0, 4.06, 0], color: theme.trim });
  arch.push({ geo: box(5.0, 0.4, 0.55), pos: [0, 3.72, 0], color: theme.pillar });
  for (let i = -3; i <= 3; i++) arch.push({ geo: box(0.28, 0.32, 0.5), pos: [i * 1.05, 4.0, 0], color: theme.trim });
  arch.push(...roofParts(4.1, 0.95, 4.7, theme.roof, theme.trim, 1.25, { over: 0.65, up: 0.6 }));
  models.arch = buildGeometry(arch);

  models.wall = buildGeometry([
    { geo: box(5, 2, 1), pos: [0, 1, 0], color: 0xcdc3ad, grad: [0.78, 1, 0, 2], jitter: 0.05 },
    { geo: box(5.1, 0.25, 1.2), pos: [0, 2.1, 0], color: 0x8d877b },
    ...[-2, -0.7, 0.7, 2].map((x) => ({ geo: box(0.8, 0.45, 1.05), pos: [x, 2.45, 0], color: 0xcdc3ad, grad: [0.85, 1, 2.2, 2.7] })),
  ]);
  models.lampPost = buildGeometry([
    { geo: cyl(0.07, 0.09, 2.4, 5), pos: [0, 1.2, 0], color: 0x3a2a1c },
    { geo: box(0.6, 0.08, 0.08), pos: [0, 2.35, 0], color: 0x3a2a1c },
  ]);
  models.lampLight = buildGeometry([{ geo: new THREE.IcosahedronGeometry(0.3, 1), pos: [0, 2.0, 0], scale: [1, 1.3, 1], color: 0xe34a2c }]);
  models.pad = buildGeometry([
    { geo: cyl(0.78, 0.84, 0.2, 14), pos: [0, 0.1, 0], color: 0x9d9689 },
    { geo: cyl(0.52, 0.52, 0.24, 14), pos: [0, 0.12, 0], color: 0xc7bda5 },
  ]);
  models.padCheck = buildGeometry([
    { geo: cyl(1.4, 1.5, 0.3, 18), pos: [0, 0.15, 0], color: 0x8d877b },
    { geo: cyl(1.05, 1.05, 0.34, 18), pos: [0, 0.17, 0], color: 0xd9a740 },
  ]);
  return models;
}

const KIT_PARTS = ['house', 'tower', 'arch', 'wall', 'lampPost', 'lampLight', 'pad', 'padCheck'];

/** The base models (trees, rocks, grass, flowers) plus the buildings of the given kit; a part the kit leaves out is the citadel's. */
export function makeModels(theme, kit = citadelKit) {
  const models = { ...baseModels(theme), ...kit(theme) };
  if (KIT_PARTS.some((part) => !models[part])) {
    const fallback = citadelKit(theme);
    for (const part of KIT_PARTS) if (!models[part]) models[part] = fallback[part];
  }
  return models;
}

// what a kit needs to build its own geometry
export { box, cyl, cone, shade, blob, droopCone, noise3, hash3, roofParts };
