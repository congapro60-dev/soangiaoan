// Kits "farm" (a farmhouse with a hip roof, a windmill beside each gate, a festival gate with bunting, wooden fences,
// haystacks) and "tropical" (bamboo huts on stilts, a lookout tower, a totem gate, torches, palms).
// Colours come from the theme: wall = plaster or bamboo, roof = thatch or tiles, pillar = timber, trim = flags and lights.
import * as THREE from 'three';
import { buildGeometry, box, cyl, cone, shade, blob } from './map3d-models.js';
import { makePalm } from './map3d-kit-city.js';

const sphere = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const BUNTING = [0xe8505b, 0xf2c14a, 0x4aa3c8, 0x6cbf5a, 0xb36ad8];

/** A hip roof (a pyramid with a rectangular base) as a part: width w, depth d, height h, starting at height y0. */
function hip(w, d, h, y0, color, extra = {}) {
  return { geo: new THREE.CylinderGeometry(0, 0.7071, 1, 4, 1), pos: [0, y0 + h / 2, 0], rot: [0, Math.PI / 4, 0], scale: [w, h, d], color, grad: [0.82, 1.12, y0, y0 + h], ...extra };
}

function props(theme) {
  const models = {};
  models.lampPost = buildGeometry([
    { geo: cyl(0.07, 0.1, 2.3, 6), pos: [0, 1.15, 0], color: theme.pillar },
    { geo: box(0.6, 0.07, 0.07), pos: [0.22, 2.3, 0], color: theme.pillar },
  ]);
  models.lampLight = buildGeometry([{ geo: box(0.3, 0.42, 0.3), pos: [0.46, 2.05, 0], color: theme.trim }]);
  models.pad = buildGeometry([
    { geo: cyl(0.8, 0.86, 0.16, 9), pos: [0, 0.08, 0], color: 0x9d9689, jitter: 0.05 },
    { geo: cyl(0.52, 0.52, 0.2, 9), pos: [0, 0.1, 0], color: 0xc7bda5 },
  ]);
  models.padCheck = buildGeometry([
    { geo: cyl(1.45, 1.55, 0.26, 12), pos: [0, 0.13, 0], color: theme.pillar },
    { geo: new THREE.TorusGeometry(1.1, 0.12, 6, 20), pos: [0, 0.28, 0], rot: [Math.PI / 2, 0, 0], color: theme.trim },
    { geo: cyl(0.85, 0.85, 0.3, 12), pos: [0, 0.15, 0], color: shade(theme.pillar, 0.08) },
  ]);
  return models;
}

export function farmKit(theme) {
  const models = props(theme);
  // a farmhouse: stone plinth, plaster walls, shutters, a hip roof of thatch or tiles and a chimney
  models.house = buildGeometry([
    { geo: box(3.0, 0.3, 2.6), pos: [0, 0.15, 0], color: 0x8d877b, jitter: 0.06 },
    { geo: box(2.6, 1.6, 2.2), pos: [0, 1.1, 0], color: theme.wall, grad: [0.86, 1, 0.3, 1.9] },
    { geo: box(0.62, 1.0, 0.08), pos: [0, 0.8, 1.12], color: theme.pillar },
    ...[-0.85, 0.85].flatMap((x) => [
      { geo: box(0.5, 0.5, 0.06), pos: [x, 1.35, 1.12], color: 0x2c2018 },
      { geo: box(0.2, 0.52, 0.08), pos: [x - 0.33, 1.35, 1.12], color: theme.trim },
      { geo: box(0.2, 0.52, 0.08), pos: [x + 0.33, 1.35, 1.12], color: theme.trim },
    ]),
    hip(3.6, 3.1, 1.6, 1.9, theme.roof, { jitter: 0.05 }),
    { geo: box(0.4, 1.0, 0.4), pos: [0.8, 3.0, -0.4], color: 0x8d877b },
  ]);

  // the windmill (CỐI GIÓ): a tapering tower, a cap, and four sails facing +z
  const mill = [
    { geo: cyl(3.4, 3.6, 0.4, 10), pos: [0, 0.2, 0], color: 0x9d968a, jitter: 0.05 },
    { geo: cyl(1.4, 2.2, 6.6, 10), pos: [0, 3.7, 0], color: theme.wall, grad: [0.8, 1.08, 0.4, 7] },
    { geo: cyl(1.5, 1.5, 0.22, 10), pos: [0, 3.4, 0], color: theme.pillar },
    { geo: box(0.8, 1.3, 0.1), pos: [0, 1.0, 2.12], color: theme.pillar },
    { geo: box(0.5, 0.6, 0.08), pos: [0, 4.6, 1.5], color: 0x2c2018 },
    { geo: cone(1.7, 1.9, 10), pos: [0, 8.0, 0], color: theme.roof },
    { geo: sphere(0.3), pos: [0, 7.2, 1.7], color: theme.pillar },
  ];
  for (let k = 0; k < 4; k++) {
    const a = k * (Math.PI / 2) + 0.35;
    mill.push({ geo: box(0.16, 4.2, 0.1), pos: [Math.sin(a) * 2.1, 7.2 + Math.cos(a) * 2.1, 1.9], rot: [0, 0, -a], color: theme.pillar });
    mill.push({ geo: box(0.9, 3.4, 0.05), pos: [Math.sin(a) * 2.3 + Math.cos(a) * 0.5, 7.2 + Math.cos(a) * 2.3 - Math.sin(a) * 0.5, 1.95], rot: [0, 0, -a], color: shade(theme.wall, -0.04) });
  }
  models.tower = buildGeometry(mill);

  // the festival gate: two timber posts, a beam, a sign board and a line of bunting
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push({ geo: cyl(0.3, 0.38, 4.7, 8), pos: [s * 3.3, 2.35, 0], color: theme.pillar, grad: [0.8, 1.05, 0, 4.7] });
    gate.push({ geo: box(0.9, 0.35, 0.9), pos: [s * 3.3, 0.18, 0], color: 0x9d968a });
    gate.push({ geo: sphere(0.3), pos: [s * 3.3, 4.85, 0], color: theme.trim });
  }
  gate.push({ geo: box(7.6, 0.4, 0.5), pos: [0, 4.4, 0], color: theme.pillar });
  gate.push({ geo: box(4.0, 0.8, 0.14), pos: [0, 3.55, 0], color: theme.wall });
  gate.push({ geo: box(4.2, 0.1, 0.2), pos: [0, 4.0, 0], color: theme.trim });
  for (let i = 0; i < 10; i++) gate.push({ geo: cone(0.3, 0.75, 3), pos: [-3.1 + i * 0.69, 3.8, 0.34], rot: [Math.PI, 0, 0], scale: [1, 1, 0.3], color: BUNTING[i % BUNTING.length] });
  models.arch = buildGeometry(gate);

  // a timber fence
  const fence = [];
  for (let i = -2; i <= 2; i++) fence.push({ geo: cyl(0.08, 0.1, 1.15, 5), pos: [i * 1.1, 0.57, 0], color: theme.pillar });
  fence.push({ geo: box(5, 0.08, 0.1), pos: [0, 0.45, 0], color: shade(theme.pillar, 0.05) });
  fence.push({ geo: box(5, 0.08, 0.1), pos: [0, 0.85, 0], color: shade(theme.pillar, 0.05) });
  models.wall = buildGeometry(fence);

  // a haystack (listed among the "trees" by worlds that want them)
  models.hay = buildGeometry([
    { geo: cyl(1.1, 1.25, 1.3, 9), pos: [0, 0.65, 0], color: 0xe0c060, grad: [0.8, 1.1, 0, 1.3], jitter: 0.06 },
    { geo: blob(1.12, 3, { squash: 0.75, amp: 0.1 }), pos: [0, 1.3, 0], color: 0xe9cf72, jitter: 0.06 },
    { geo: cyl(0.04, 0.05, 1.0, 4), pos: [0, 2.3, 0], color: 0x6a4a2a },
  ]);
  return models;
}

export function tropicalKit(theme) {
  const models = props(theme);
  const bamboo = theme.wall;
  const stilts = (w, d, h) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ geo: cyl(0.1, 0.13, h, 5), pos: [sx * w, h / 2, sz * d], color: theme.pillar }));
  // a bamboo hut on stilts with a thatched cone roof and a ladder
  models.house = buildGeometry([
    ...stilts(1.2, 1.0, 1.2),
    { geo: box(2.9, 0.16, 2.5), pos: [0, 1.25, 0], color: shade(theme.pillar, 0.06) },
    { geo: cyl(1.45, 1.5, 1.3, 7), pos: [0, 1.95, 0], color: bamboo, grad: [0.84, 1.05, 1.3, 2.6] },
    { geo: box(0.55, 0.9, 0.06), pos: [0, 1.85, 1.46], color: 0x2c2018 },
    { geo: cone(2.3, 1.9, 7), pos: [0, 3.55, 0], color: theme.roof, grad: [0.82, 1.1, 2.6, 4.5], jitter: 0.06 },
    { geo: box(0.4, 1.4, 0.08), pos: [0.5, 0.65, 1.55], rot: [0.35, 0, 0], color: theme.pillar },
  ]);

  // a lookout tower: four tall poles, two platforms, a thatched roof and a torch on top
  const lookout = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lookout.push({ geo: cyl(0.16, 0.22, 7.2, 6), pos: [sx * 1.5, 3.6, sz * 1.5], color: theme.pillar, grad: [0.75, 1.05, 0, 7.2] });
  lookout.push({ geo: box(3.8, 0.2, 3.8), pos: [0, 3.2, 0], color: shade(theme.pillar, 0.06) });
  lookout.push({ geo: box(3.8, 0.2, 3.8), pos: [0, 6.2, 0], color: shade(theme.pillar, 0.06) });
  lookout.push({ geo: box(3.5, 0.12, 0.1), pos: [0, 6.8, 1.65], color: theme.pillar });
  lookout.push({ geo: box(3.5, 0.12, 0.1), pos: [0, 6.8, -1.65], color: theme.pillar });
  lookout.push({ geo: cone(3.0, 2.1, 8), pos: [0, 8.4, 0], color: theme.roof, jitter: 0.06 });
  lookout.push({ geo: cyl(0.06, 0.08, 1.4, 5), pos: [0, 9.8, 0], color: theme.pillar });
  lookout.push({ geo: cone(0.28, 0.6, 6), pos: [0, 10.7, 0], color: theme.trim });
  for (let i = 0; i < 6; i++) lookout.push({ geo: box(1.2, 0.08, 0.14), pos: [0, 0.7 + i * 0.5, 1.6], color: theme.pillar });
  models.tower = buildGeometry(lookout);

  // the totem gate: two carved poles with stacked faces and a beam with a thatch fringe
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push({ geo: cyl(0.4, 0.46, 5.0, 7), pos: [s * 3.3, 2.5, 0], color: theme.pillar, grad: [0.75, 1.05, 0, 5] });
    for (let i = 0; i < 3; i++) {
      gate.push({ geo: box(0.9, 0.7, 0.32), pos: [s * 3.3, 1.0 + i * 1.3, 0.34], color: i % 2 ? theme.trim : theme.roof });
      gate.push({ geo: box(0.5, 0.12, 0.1), pos: [s * 3.3, 1.2 + i * 1.3, 0.54], color: 0x2c2018 });
    }
    gate.push({ geo: cone(0.5, 0.9, 6), pos: [s * 3.3, 5.45, 0], color: theme.trim });
  }
  gate.push({ geo: box(7.4, 0.42, 0.55), pos: [0, 4.6, 0], color: theme.pillar });
  gate.push({ geo: box(7.6, 0.5, 0.8), pos: [0, 4.95, 0], color: theme.roof, jitter: 0.06 });
  models.arch = buildGeometry(gate);

  // a bamboo picket fence
  const fence = [{ geo: box(5, 0.08, 0.1), pos: [0, 0.5, 0], color: theme.pillar }];
  for (let i = -5; i <= 5; i++) fence.push({ geo: cyl(0.07, 0.09, 1.0 + (i % 2) * 0.2, 5), pos: [i * 0.45, 0.55, 0], color: i % 2 ? bamboo : shade(bamboo, -0.06) });
  models.wall = buildGeometry(fence);

  // torches instead of lamps
  models.lampPost = buildGeometry([
    { geo: cyl(0.06, 0.1, 2.1, 5), pos: [0, 1.05, 0], color: theme.pillar },
    { geo: cyl(0.2, 0.12, 0.22, 7), pos: [0, 2.15, 0], color: 0x3a2a1c },
  ]);
  models.lampLight = buildGeometry([{ geo: cone(0.2, 0.55, 6), pos: [0, 2.55, 0], color: theme.trim }]);

  models.palm = makePalm(theme.leaf.palm || theme.leaf.round);
  return models;
}
