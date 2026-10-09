// Kit "blocks": everything is built from cubes, like a toy set (houses, a stacked tower, a gate of cubes, cube trees,
// and long hedge blocks that make a maze when scattered). Colours come from the theme: wall = main cube colour,
// roof = second colour, pillar = third, trim = the glowing cube. Used by cube and maze.
import * as THREE from 'three';
import { buildGeometry, box, cyl, shade } from './map3d-models.js';

/** One cube as a part: size s, its centre at (x, y + s / 2, z). */
const cube = (x, y, z, s, color, extra = {}) => ({ geo: box(s, s, s), pos: [x, y + s / 2, z], color, grad: [0.84, 1.08, y, y + s], ...extra });

export function blocksKit(theme) {
  const models = {};
  const [a, b, c, glow] = [theme.wall, theme.roof, theme.pillar, theme.trim];

  models.house = buildGeometry([cube(0, 0, 0, 2.6, a), cube(0.2, 2.6, -0.1, 1.7, b), cube(0, 4.3, 0, 0.7, glow), { geo: box(0.6, 1.0, 0.1), pos: [0, 0.5, 1.32], color: c }, { geo: box(0.5, 0.5, 0.1), pos: [0.95, 1.5, 1.32], color: glow }]);

  models.tower = buildGeometry([
    { geo: box(6.4, 0.4, 6.4), pos: [0, 0.2, 0], color: shade(c, 0.1) },
    cube(0, 0.4, 0, 4.2, a),
    cube(0, 4.6, 0, 3.2, b),
    cube(0, 7.8, 0, 2.2, c),
    cube(0, 10.0, 0, 1.4, a),
    cube(0, 11.4, 0, 0.9, glow),
    { geo: box(0.12, 2.0, 0.12), pos: [0, 12.9, 0], color: c },
    cube(0, 13.9, 0, 0.45, glow),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => cube(sx * 2.4, 0.4, sz * 2.4, 1.1, b)),
  ]);

  const gate = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) gate.push(cube(s * 3.3, i * 1.5, 0, 1.5, i % 2 ? b : a));
  for (let i = -2; i <= 2; i++) gate.push(cube(i * 1.5, 4.5, 0, 1.5, (i + 2) % 2 ? a : c));
  gate.push(cube(0, 6.0, 0, 0.9, glow));
  models.arch = buildGeometry(gate);

  models.wall = buildGeometry([cube(-1.7, 0, 0, 1.5, a), cube(0, 0, 0, 1.5, b), cube(1.7, 0, 0, 1.5, c), cube(0, 1.5, 0, 0.9, glow)]);
  models.lampPost = buildGeometry([{ geo: box(0.14, 2.2, 0.14), pos: [0, 1.1, 0], color: c }]);
  models.lampLight = buildGeometry([cube(0, 2.0, 0, 0.5, glow)]);
  models.pad = buildGeometry([{ geo: box(1.5, 0.14, 1.5), pos: [0, 0.07, 0], color: shade(c, 0.12) }, { geo: box(1.0, 0.18, 1.0), pos: [0, 0.09, 0], color: shade(a, 0.05) }]);
  models.padCheck = buildGeometry([{ geo: box(2.7, 0.2, 2.7), pos: [0, 0.1, 0], color: c }, { geo: box(2.1, 0.24, 2.1), pos: [0, 0.12, 0], color: glow }, { geo: box(1.5, 0.28, 1.5), pos: [0, 0.14, 0], color: a }]);

  // trees made of cubes, bushes, and a long hedge block
  const leaf = theme.leaf;
  models.cubetree = buildGeometry([
    { geo: box(0.55, 2.4, 0.55), pos: [0, 1.2, 0], color: 0x7a5a3a },
    cube(0, 2.0, 0, 2.4, leaf.round, { jitter: 0.06 }),
    cube(0.4, 4.3, -0.2, 1.6, shade(leaf.round, 0.05), { jitter: 0.06 }),
    cube(-1.3, 2.8, 0.5, 1.2, shade(leaf.round, -0.04), { jitter: 0.06 }),
  ]);
  models.cubepine = buildGeometry([
    { geo: box(0.5, 1.6, 0.5), pos: [0, 0.8, 0], color: 0x7a5a3a },
    cube(0, 1.4, 0, 2.6, leaf.pine),
    cube(0, 3.9, 0, 1.9, shade(leaf.pine, 0.04)),
    cube(0, 5.7, 0, 1.2, shade(leaf.pine, 0.08)),
  ]);
  models.cubebush = buildGeometry([cube(0, 0, 0, 1.5, leaf.bamboo, { jitter: 0.07 }), cube(1.0, 0, 0.5, 1.0, shade(leaf.bamboo, 0.05), { jitter: 0.07 })]);
  models.hedge = buildGeometry([
    { geo: box(4.6, 2.3, 1.2), pos: [0, 1.15, 0], color: leaf.round, grad: [0.78, 1.08, 0, 2.3], jitter: 0.09 },
    { geo: box(4.7, 0.2, 1.3), pos: [0, 2.35, 0], color: shade(leaf.round, 0.07), jitter: 0.07 },
  ]);

  models.walker = (color) =>
    buildGeometry([
      { geo: box(0.55, 0.8, 0.4), pos: [0, 0.8, 0], color, grad: [0.78, 1.1, 0.4, 1.2] },
      { geo: box(0.45, 0.45, 0.45), pos: [0, 1.45, 0], color: 0xf1d9b8 },
      { geo: box(0.46, 0.12, 0.46), pos: [0, 1.74, 0], color: c },
      { geo: box(0.16, 0.4, 0.16), pos: [-0.14, 0.2, 0], color: c },
      { geo: box(0.16, 0.4, 0.16), pos: [0.14, 0.2, 0], color: c },
    ]);
  return models;
}
