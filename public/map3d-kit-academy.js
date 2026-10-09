// Kit "academy": a stone hall with a steep slate roof and a turret, a round tower with battlements beside each gate, a
// pointed stone arch, crenellated walls and brazier torches. Used by academy (violet slate, gold) and zones (red
// banners, dusty stone). Colours come from the theme: wall = stone, roof = slate, pillar = banners and timber, trim = gold or fire.
import * as THREE from 'three';
import { buildGeometry, box, cyl, cone, shade } from './map3d-models.js';

const sphere = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);

/** A steep pyramid roof with a rectangular base, as a part. */
function pyramid(w, d, h, y0, color) {
  return { geo: new THREE.CylinderGeometry(0, 0.7071, 1, 4, 1), pos: [0, y0 + h / 2, 0], rot: [0, Math.PI / 4, 0], scale: [w, h, d], color, grad: [0.8, 1.15, y0, y0 + h] };
}

export function academyKit(theme) {
  const models = {};
  const stone = theme.wall;
  const glow = theme.trim;

  // a hall: plinth, stone walls, tall pointed windows with a warm light, a steep roof and a round turret with a cap
  models.house = buildGeometry([
    { geo: box(3.0, 0.3, 2.6), pos: [0, 0.15, 0], color: shade(stone, -0.12), jitter: 0.06 },
    { geo: box(2.6, 2.0, 2.2), pos: [0, 1.3, 0], color: stone, grad: [0.82, 1, 0.3, 2.3], jitter: 0.05 },
    ...[-0.8, 0, 0.8].map((x) => ({ geo: box(0.3, 0.75, 0.06), pos: [x, 1.45, 1.12], color: glow })),
    { geo: box(0.6, 1.0, 0.08), pos: [0, 0.8, 1.12], color: theme.pillar },
    pyramid(3.2, 2.8, 2.6, 2.3, theme.roof),
    { geo: cyl(0.55, 0.62, 3.0, 8), pos: [-1.35, 1.5, -1.0], color: stone, grad: [0.82, 1, 0, 3] },
    { geo: cone(0.78, 1.5, 8), pos: [-1.35, 3.75, -1.0], color: theme.roof },
  ]);

  // a round tower with battlements, arrow slits, a banner and a pointed cap
  const tower = [
    { geo: cyl(3.4, 3.7, 0.5, 12), pos: [0, 0.25, 0], color: shade(stone, -0.12), jitter: 0.05 },
    { geo: cyl(1.9, 2.3, 8.2, 12), pos: [0, 4.6, 0], color: stone, grad: [0.8, 1.08, 0.5, 8.7], jitter: 0.05 },
    { geo: cyl(2.35, 2.35, 0.35, 12), pos: [0, 8.8, 0], color: shade(stone, -0.06) },
    { geo: cyl(1.5, 1.7, 2.0, 12), pos: [0, 10.0, 0], color: stone },
    { geo: cone(2.0, 4.2, 12), pos: [0, 13.1, 0], color: theme.roof },
    { geo: cyl(0.05, 0.07, 2.2, 5), pos: [0, 16.3, 0], color: theme.pillar },
    { geo: box(1.2, 0.7, 0.05), pos: [0.65, 16.9, 0], color: theme.pillar },
    { geo: sphere(0.25), pos: [0, 15.45, 0], color: glow },
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    tower.push({ geo: box(0.6, 0.55, 0.5), pos: [Math.cos(a) * 2.25, 9.15, Math.sin(a) * 2.25], rot: [0, -a, 0], color: stone });
  }
  for (const a of [0.3, 2.4, 4.4]) tower.push({ geo: box(0.14, 1.0, 0.1), pos: [Math.cos(a) * 2.1, 5.2, Math.sin(a) * 2.1], rot: [0, -a + Math.PI / 2, 0], color: 0x1f1a24 });
  models.tower = buildGeometry(tower);

  // the gate: two stone piers and a pointed arch (two leaning beams meeting at the top) with a glowing stone and banners
  const gate = [];
  for (const s of [-1, 1]) {
    gate.push({ geo: box(1.1, 3.4, 1.1), pos: [s * 3.4, 1.7, 0], color: stone, grad: [0.8, 1, 0, 3.4], jitter: 0.05 });
    gate.push({ geo: box(1.35, 0.35, 1.35), pos: [s * 3.4, 0.18, 0], color: shade(stone, -0.12) });
    gate.push({ geo: box(1.35, 0.3, 1.35), pos: [s * 3.4, 3.55, 0], color: shade(stone, -0.05) });
    gate.push({ geo: box(0.9, 2.6, 0.06), pos: [s * 3.4, 2.0, 0.6], color: theme.pillar });
    // each beam runs from the top of its pier (x = +-3.4, y = 3.7) up to the keystone (x = 0, y = 6.0): length 4.1, slope 0.595 rad
    gate.push({ geo: box(4.2, 0.8, 1.0), pos: [s * 1.7, 4.85, 0], rot: [0, 0, -s * 0.595], color: stone, jitter: 0.05 });
  }
  gate.push({ geo: box(1.3, 1.3, 1.1), pos: [0, 6.0, 0], color: stone });
  gate.push({ geo: cone(0.7, 1.4, 4), pos: [0, 7.3, 0], rot: [0, Math.PI / 4, 0], color: theme.roof });
  gate.push({ geo: sphere(0.34), pos: [0, 5.2, 0.6], color: glow });
  models.arch = buildGeometry(gate);

  // a crenellated wall
  const wall = [{ geo: box(5, 1.7, 0.8), pos: [0, 0.85, 0], color: stone, grad: [0.78, 1, 0, 1.7], jitter: 0.05 }];
  for (let i = 0; i < 4; i++) wall.push({ geo: box(0.8, 0.5, 0.85), pos: [-1.9 + i * 1.27, 1.95, 0], color: shade(stone, -0.03) });
  models.wall = buildGeometry(wall);

  // a post with a brazier bowl; lampLight is the fire
  models.lampPost = buildGeometry([
    { geo: cyl(0.07, 0.1, 2.0, 6), pos: [0, 1.0, 0], color: 0x2c2a30 },
    { geo: cyl(0.3, 0.16, 0.26, 8), pos: [0, 2.05, 0], color: 0x2c2a30 },
  ]);
  models.lampLight = buildGeometry([{ geo: cone(0.24, 0.62, 6), pos: [0, 2.45, 0], color: glow }]);
  models.pad = buildGeometry([
    { geo: cyl(0.82, 0.88, 0.16, 10), pos: [0, 0.08, 0], color: 0x8d877b, jitter: 0.05 },
    { geo: cyl(0.52, 0.52, 0.2, 10), pos: [0, 0.1, 0], color: 0xb9b2a3 },
  ]);
  models.padCheck = buildGeometry([
    { geo: cyl(1.45, 1.55, 0.26, 12), pos: [0, 0.13, 0], color: 0x8d877b },
    { geo: new THREE.TorusGeometry(1.1, 0.12, 6, 20), pos: [0, 0.28, 0], rot: [Math.PI / 2, 0, 0], color: glow },
    { geo: cyl(0.85, 0.85, 0.3, 12), pos: [0, 0.15, 0], color: 0xb9b2a3 },
  ]);

  // a student (or soldier) in a long robe and a pointed hat
  models.walker = (color) =>
    buildGeometry([
      { geo: cyl(0.22, 0.4, 1.2, 8), pos: [0, 0.65, 0], color, grad: [0.7, 1.1, 0.05, 1.25] },
      { geo: sphere(0.22, 8, 6), pos: [0, 1.5, 0], color: 0xe3b98f },
      { geo: cone(0.3, 0.7, 8), pos: [0, 2.0, 0], color: shade(color, -0.12) },
      { geo: cyl(0.4, 0.4, 0.05, 10), pos: [0, 1.68, 0], color: shade(color, -0.12) },
    ]);
  return models;
}
