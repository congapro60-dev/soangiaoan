// Kits "city" (glass and concrete blocks, a skyscraper beside each gate, a modern portal) and "campus" (classroom blocks
// with hip roofs, a clock tower, a school gate with brick pillars). Colours come from the theme:
// wall = the main wall, roof = roofs and glass, pillar = accents (frames, brick), trim = lights and signs.
import * as THREE from 'three';
import { buildGeometry, box, cyl, cone, shade, blob } from './map3d-models.js';

const sphere = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const GLASS = 0x5d86a8;

/** Bands of glass around a box of the given size, so a plain wall reads as a building with floors. */
function bands(w, d, y0, y1, step, color = GLASS) {
  const parts = [];
  for (let y = y0; y <= y1 + 1e-6; y += step) parts.push({ geo: box(w + 0.05, step * 0.34, d + 0.05), pos: [0, y, 0], color });
  return parts;
}

function sharedProps(theme, light) {
  const models = {};
  models.lampPost = buildGeometry([
    { geo: cyl(0.06, 0.1, 2.5, 6), pos: [0, 1.25, 0], color: theme.pillar },
    { geo: box(0.7, 0.07, 0.1), pos: [0.25, 2.5, 0], color: theme.pillar },
  ]);
  models.lampLight = buildGeometry([{ geo: box(0.42, 0.12, 0.26), pos: [0.5, 2.42, 0], color: light }]);
  models.pad = buildGeometry([
    { geo: cyl(0.82, 0.88, 0.14, 16), pos: [0, 0.07, 0], color: 0x7c8189 },
    { geo: cyl(0.52, 0.52, 0.18, 16), pos: [0, 0.09, 0], color: 0xc7ccd1 },
  ]);
  models.padCheck = buildGeometry([
    { geo: cyl(1.45, 1.55, 0.2, 18), pos: [0, 0.1, 0], color: 0x6a7078 },
    { geo: new THREE.TorusGeometry(1.1, 0.14, 6, 24), pos: [0, 0.23, 0], rot: [Math.PI / 2, 0, 0], color: light },
    { geo: cyl(0.78, 0.78, 0.26, 18), pos: [0, 0.13, 0], color: 0xb9bfc6 },
  ]);
  models.walker = (color) =>
    buildGeometry([
      { geo: cyl(0.24, 0.32, 1.0, 8), pos: [0, 0.78, 0], color, grad: [0.75, 1.1, 0.3, 1.3] },
      { geo: sphere(0.23, 9, 7), pos: [0, 1.5, 0], color: 0xe3b98f },
      { geo: sphere(0.25, 9, 6), pos: [0, 1.58, -0.02], color: 0x3a2a1c, scale: [1, 0.55, 1] },
      { geo: box(0.1, 0.4, 0.1), pos: [-0.12, 0.2, 0], color: 0x2c3140 },
      { geo: box(0.1, 0.4, 0.1), pos: [0.12, 0.2, 0], color: 0x2c3140 },
    ]);
  return models;
}

export function cityKit(theme) {
  const light = theme.trim;
  const models = sharedProps(theme, light);

  // an apartment block: plaster walls, bands of glass, a flat roof with a plant room
  models.house = buildGeometry([
    { geo: box(2.7, 3.1, 2.5), pos: [0, 1.55, 0], color: theme.wall, grad: [0.84, 1, 0, 3.1] },
    ...bands(2.7, 2.5, 0.85, 2.6, 0.75),
    { geo: box(2.9, 0.22, 2.7), pos: [0, 3.2, 0], color: theme.pillar },
    { geo: box(1.0, 0.55, 0.8), pos: [-0.6, 3.58, -0.3], color: shade(theme.wall, -0.08) },
    { geo: cyl(0.07, 0.07, 0.9, 5), pos: [0.75, 3.8, 0.4], color: theme.pillar },
    { geo: box(0.7, 1.0, 0.1), pos: [0, 0.5, 1.28], color: shade(theme.pillar, -0.1) },
    { geo: box(0.95, 0.07, 0.4), pos: [0, 1.1, 1.4], color: light },
  ]);

  // a skyscraper: plinth, glass shaft in tiers, a crown with a mast and a red beacon
  const tower = [
    { geo: box(7, 0.4, 7), pos: [0, 0.2, 0], color: 0x9a9fa6, jitter: 0.04 },
    { geo: box(4.0, 5.2, 4.0), pos: [0, 3.0, 0], color: theme.wall, grad: [0.84, 1, 0.4, 5.6] },
    ...bands(4.0, 4.0, 0.9, 5.2, 0.7),
    { geo: box(4.2, 0.28, 4.2), pos: [0, 5.7, 0], color: theme.pillar },
    { geo: box(3.0, 4.2, 3.0), pos: [0, 7.9, 0], color: theme.wall, grad: [0.88, 1.05, 5.8, 10] },
    ...bands(3.0, 3.0, 6.3, 9.7, 0.7),
    { geo: box(3.2, 0.26, 3.2), pos: [0, 10.1, 0], color: theme.pillar },
    { geo: box(2.0, 1.8, 2.0), pos: [0, 11.1, 0], color: theme.roof },
    { geo: cyl(0.06, 0.12, 3.4, 6), pos: [0, 13.7, 0], color: theme.pillar },
    { geo: sphere(0.24, 8, 6), pos: [0, 15.5, 0], color: 0xe34a2c },
  ];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower.push({ geo: box(0.3, 5.2, 0.3), pos: [sx * 2.0, 3.0, sz * 2.0], color: theme.pillar });
  models.tower = buildGeometry(tower);

  // the gate: two concrete piers and a deep beam with a lit sign over the road (the road runs along z)
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push({ geo: box(1.0, 5.4, 1.1), pos: [s * 3.4, 2.7, 0], color: theme.wall, grad: [0.8, 1, 0, 5.4] });
    gate.push({ geo: box(1.15, 0.4, 1.25), pos: [s * 3.4, 0.2, 0], color: 0x8d9298 });
    gate.push({ geo: box(0.12, 4.2, 0.12), pos: [s * 3.4, 2.7, 0.6], color: light });
    gate.push({ geo: box(0.12, 4.2, 0.12), pos: [s * 3.4, 2.7, -0.6], color: light });
  }
  gate.push({ geo: box(8.2, 1.15, 1.3), pos: [0, 5.2, 0], color: theme.pillar });
  gate.push({ geo: box(7.0, 0.55, 0.12), pos: [0, 5.2, 0.7], color: light });
  gate.push({ geo: box(7.0, 0.55, 0.12), pos: [0, 5.2, -0.7], color: light });
  gate.push({ geo: box(8.4, 0.2, 1.5), pos: [0, 5.85, 0], color: theme.roof });
  models.arch = buildGeometry(gate);

  // a concrete barrier with a yellow band
  models.wall = buildGeometry([
    { geo: box(5, 1.1, 0.7), pos: [0, 0.55, 0], color: theme.wall, grad: [0.8, 1, 0, 1.1] },
    { geo: box(5.04, 0.22, 0.74), pos: [0, 0.7, 0], color: light },
    { geo: box(5.1, 0.16, 0.8), pos: [0, 1.18, 0], color: theme.pillar },
  ]);

  // palms and round street trees (the theme says which it uses)
  const leaf = theme.leaf;
  models.palm = makePalm(leaf.palm || leaf.round);
  models.shrub = buildGeometry([{ geo: blob(1.1, 5, { squash: 0.7, amp: 0.2 }), pos: [0, 0.8, 0], color: leaf.round, grad: [0.7, 1.15, 0, 1.8], jitter: 0.07 }]);
  return models;
}

/** A palm tree: a leaning trunk and a crown of seven drooping fronds (shared by the city and tropical kits). */
export function makePalm(leafColor) {
  const palm = [{ geo: cyl(0.14, 0.26, 4.2, 6), pos: [0.2, 2.1, 0], rot: [0, 0, -0.08], color: 0x8a6a46, grad: [0.7, 1.05, 0, 4.2] }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    palm.push({ geo: cone(0.42, 3.2, 4), pos: [0.35 + Math.cos(a) * 0.9, 4.15, Math.sin(a) * 0.9], rot: [Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15], scale: [1, 1, 0.35], color: shade(leafColor, (i % 2) * 0.05), grad: [0.8, 1.15, 3.2, 5] });
  }
  palm.push({ geo: sphere(0.28, 7, 5), pos: [0.35, 4.1, 0], color: 0x6a4a2a });
  return buildGeometry(palm);
}

export function campusKit(theme) {
  const light = theme.trim;
  const models = sharedProps(theme, light);

  // a classroom block: brick-coloured plinth, plaster, two rows of windows and a hip roof
  models.house = buildGeometry([
    { geo: box(2.9, 0.4, 2.5), pos: [0, 0.2, 0], color: theme.pillar },
    { geo: box(2.7, 1.8, 2.3), pos: [0, 1.3, 0], color: theme.wall, grad: [0.88, 1, 0.4, 2.2] },
    ...[-0.85, 0, 0.85].flatMap((x) => [
      { geo: box(0.55, 0.55, 0.06), pos: [x, 1.0, 1.17], color: GLASS },
      { geo: box(0.55, 0.55, 0.06), pos: [x, 1.85, 1.17], color: GLASS },
    ]),
    { geo: box(0.55, 0.85, 0.08), pos: [0, 0.82, 1.18], color: shade(theme.pillar, -0.1) },
    { geo: new THREE.CylinderGeometry(0, 1.95, 1.2, 4, 1), pos: [0, 2.85, 0], rot: [0, Math.PI / 4, 0], scale: [1.18, 1, 1.02], color: theme.roof, grad: [0.85, 1.1, 2.2, 3.5] },
    { geo: box(1.2, 1.0, 0.4), pos: [0.2, 0.55, -1.3], color: shade(theme.wall, -0.08) },
  ]);

  // a clock tower: stone shaft, a clock on each face, a pyramid roof with a flag
  const tower = [
    { geo: box(6.4, 0.4, 6.4), pos: [0, 0.2, 0], color: 0xb9b2a3, jitter: 0.04 },
    { geo: box(3.4, 7.4, 3.4), pos: [0, 4.1, 0], color: theme.wall, grad: [0.84, 1, 0.4, 7.8] },
    { geo: box(3.7, 0.4, 3.7), pos: [0, 2.0, 0], color: theme.pillar },
    { geo: box(3.7, 0.4, 3.7), pos: [0, 7.9, 0], color: theme.pillar },
    { geo: box(2.2, 1.7, 2.2), pos: [0, 8.9, 0], color: theme.wall },
  ];
  for (const [rx, rz, ry] of [[0, 1.72, 0], [0, -1.72, Math.PI], [1.72, 0, Math.PI / 2], [-1.72, 0, -Math.PI / 2]]) {
    tower.push({ geo: cyl(0.85, 0.85, 0.12, 20), pos: [rx, 5.6, rz], rot: [Math.PI / 2, 0, ry], color: 0xf6f1e2 });
    tower.push({ geo: box(0.07, 0.6, 0.07), pos: [rx, 5.75, rz + Math.sign(rz) * 0.09], color: 0x2a2a2a });
    tower.push({ geo: box(0.07, 0.07, 0.4), pos: [rx + Math.sign(rx) * 0.09, 5.6, rz], color: 0x2a2a2a });
  }
  tower.push({ geo: new THREE.CylinderGeometry(0, 1.9, 2.6, 4, 1), pos: [0, 11.0, 0], rot: [0, Math.PI / 4, 0], color: theme.roof });
  tower.push({ geo: cyl(0.04, 0.06, 2.0, 5), pos: [0, 13.2, 0], color: theme.pillar });
  tower.push({ geo: box(0.9, 0.5, 0.05), pos: [0.45, 13.9, 0], color: light });
  models.tower = buildGeometry(tower);

  // the school gate: two brick pillars with lamps and a lit sign board over the road
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push({ geo: box(1.1, 4.6, 1.1), pos: [s * 3.4, 2.3, 0], color: theme.pillar, grad: [0.82, 1, 0, 4.6], jitter: 0.05 });
    gate.push({ geo: box(1.3, 0.3, 1.3), pos: [s * 3.4, 4.75, 0], color: theme.wall });
    gate.push({ geo: sphere(0.3, 8, 6), pos: [s * 3.4, 5.15, 0], color: light });
  }
  gate.push({ geo: box(7.2, 0.9, 0.35), pos: [0, 4.6, 0], color: theme.wall });
  gate.push({ geo: box(6.6, 0.12, 0.42), pos: [0, 5.1, 0], color: theme.roof });
  gate.push({ geo: box(6.6, 0.12, 0.42), pos: [0, 4.12, 0], color: light });
  models.arch = buildGeometry(gate);

  // a low brick fence with a railing
  const fence = [{ geo: box(5, 0.8, 0.5), pos: [0, 0.4, 0], color: theme.pillar, grad: [0.8, 1, 0, 0.8], jitter: 0.05 }, { geo: box(5.06, 0.14, 0.56), pos: [0, 0.85, 0], color: theme.wall }];
  for (let i = -2; i <= 2; i++) fence.push({ geo: cyl(0.04, 0.04, 0.7, 5), pos: [i * 0.95, 1.25, 0], color: 0x2c3140 });
  models.wall = buildGeometry(fence);

  const leaf = theme.leaf;
  models.shrub = buildGeometry([{ geo: blob(1.1, 5, { squash: 0.7, amp: 0.2 }), pos: [0, 0.8, 0], color: leaf.round, grad: [0.7, 1.15, 0, 1.8], jitter: 0.07 }]);
  return models;
}
