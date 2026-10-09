// Kit "scifi": dome habitats, a beacon spire beside each gate, a ring portal over the road, glowing barriers.
// Used by the worlds in space and in the future (future, galaxy, ring). Colours come from the theme:
// wall = the pale hull, pillar = the dark frame, trim = the colour of the lights.
import * as THREE from 'three';
import { buildGeometry, box, cyl, cone, shade, blob } from './map3d-models.js';

const sphere = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const dome = (r) => new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

export function scifiKit(theme) {
  const light = theme.trim;
  const models = {};

  // a dome habitat with a glowing window band, a hatch on the +z side and a small antenna
  models.house = buildGeometry([
    { geo: cyl(1.75, 1.95, 0.36, 16), pos: [0, 0.18, 0], color: theme.pillar },
    { geo: dome(1.6), pos: [0, 0.36, 0], color: theme.wall, grad: [0.78, 1.12, 0.3, 2.0] },
    { geo: cyl(1.62, 1.62, 0.16, 16), pos: [0, 0.95, 0], color: light },
    { geo: box(0.66, 0.95, 0.14), pos: [0, 0.82, 1.62], color: shade(theme.pillar, -0.08) },
    { geo: box(0.5, 0.06, 0.16), pos: [0, 1.32, 1.64], color: light },
    { geo: cyl(0.03, 0.045, 1.3, 5), pos: [0.85, 2.3, -0.35], color: theme.pillar },
    { geo: sphere(0.11, 8, 6), pos: [0.85, 3.0, -0.35], color: light },
  ]);

  // the spire: a stepped tower with glowing rings, fins at the foot and a beacon on top
  const spire = [
    { geo: cyl(3.3, 3.7, 0.6, 8), pos: [0, 0.3, 0], color: theme.pillar },
    { geo: cyl(1.5, 2.3, 3.4, 8), pos: [0, 2.3, 0], color: theme.wall, grad: [0.78, 1.12, 0.6, 4] },
    { geo: cyl(1.62, 1.62, 0.18, 8), pos: [0, 1.5, 0], color: light },
    { geo: cyl(1.3, 1.3, 0.18, 8), pos: [0, 3.3, 0], color: light },
    { geo: cyl(0.95, 1.5, 3.2, 8), pos: [0, 5.7, 0], color: theme.wall, grad: [0.85, 1.15, 4, 7.3] },
    { geo: cyl(1.08, 1.08, 0.16, 8), pos: [0, 6.6, 0], color: light },
    { geo: cone(1.15, 2.4, 8), pos: [0, 8.5, 0], color: theme.pillar },
    { geo: cyl(0.05, 0.08, 3.2, 5), pos: [0, 11.1, 0], color: theme.pillar },
    { geo: sphere(0.3), pos: [0, 12.8, 0], color: light },
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    spire.push({ geo: box(0.35, 3.2, 1.5), pos: [Math.cos(a) * 1.9, 1.9, Math.sin(a) * 1.9], rot: [0, -a + Math.PI / 2, 0], color: theme.pillar });
  }
  models.tower = buildGeometry(spire);

  // the gate: two pylons with light strips and a big ring over the road (the road runs along z, so the ring stands in the xy plane)
  const portal = [];
  for (const s of [-1, 1]) {
    portal.push({ geo: cyl(0.55, 0.72, 5.2, 8), pos: [s * 3.5, 2.6, 0], color: theme.pillar, grad: [0.8, 1.1, 0, 5.2] });
    portal.push({ geo: cyl(0.8, 0.9, 0.5, 8), pos: [s * 3.5, 0.25, 0], color: theme.wall });
    portal.push({ geo: box(0.14, 4.4, 0.14), pos: [s * 3.5, 2.7, 0.56], color: light });
    portal.push({ geo: box(0.14, 4.4, 0.14), pos: [s * 3.5, 2.7, -0.56], color: light });
  }
  portal.push({ geo: new THREE.TorusGeometry(3.5, 0.3, 8, 40, Math.PI), pos: [0, 5.2, 0], color: theme.pillar });
  portal.push({ geo: new THREE.TorusGeometry(3.2, 0.1, 6, 40, Math.PI), pos: [0, 5.2, 0.28], color: light });
  portal.push({ geo: new THREE.TorusGeometry(3.2, 0.1, 6, 40, Math.PI), pos: [0, 5.2, -0.28], color: light });
  portal.push({ geo: box(7.1, 0.34, 0.6), pos: [0, 5.2, 0], color: theme.pillar });
  portal.push({ geo: box(6.4, 0.1, 0.22), pos: [0, 5.38, 0], color: light });
  models.arch = buildGeometry(portal);

  // a low barrier with a glowing top
  models.wall = buildGeometry([
    { geo: box(5, 0.9, 0.5), pos: [0, 0.45, 0], color: theme.wall, grad: [0.78, 1, 0, 0.9] },
    { geo: box(5.06, 0.12, 0.56), pos: [0, 0.96, 0], color: light },
    ...[-2.3, 2.3].map((x) => ({ geo: cyl(0.16, 0.2, 1.5, 6), pos: [x, 0.75, 0], color: theme.pillar })),
  ]);

  models.lampPost = buildGeometry([
    { geo: cyl(0.06, 0.1, 2.3, 6), pos: [0, 1.15, 0], color: theme.pillar },
    { geo: cyl(0.2, 0.2, 0.1, 8), pos: [0, 0.05, 0], color: theme.pillar },
    { geo: box(0.5, 0.06, 0.06), pos: [0.18, 2.3, 0], color: theme.pillar },
  ]);
  models.lampLight = buildGeometry([{ geo: sphere(0.28, 10, 8), pos: [0.36, 2.2, 0], color: light }]);
  models.pad = buildGeometry([
    { geo: cyl(0.85, 0.9, 0.16, 6), pos: [0, 0.08, 0], color: theme.pillar },
    { geo: cyl(0.58, 0.58, 0.2, 6), pos: [0, 0.1, 0], color: theme.wall },
  ]);
  models.padCheck = buildGeometry([
    { geo: cyl(1.5, 1.6, 0.24, 8), pos: [0, 0.12, 0], color: theme.pillar },
    { geo: new THREE.TorusGeometry(1.1, 0.13, 6, 24), pos: [0, 0.27, 0], rot: [Math.PI / 2, 0, 0], color: light },
    { geo: cyl(0.8, 0.8, 0.3, 8), pos: [0, 0.15, 0], color: theme.wall },
  ]);

  // trees: glass crystals and alien bulb trees
  const leaf = theme.leaf;
  const crystals = [];
  [[0, 0, 3.6, 0], [0.7, 0.2, 2.5, 0.35], [-0.6, 0.45, 2.9, -0.3], [0.2, -0.7, 1.8, 0.25], [-0.5, -0.5, 2.1, -0.4]].forEach(([x, z, h, lean], i) => {
    crystals.push({ geo: cyl(0.04, 0.42, h, 6), pos: [x, h / 2, z], rot: [lean * 0.6, i, -lean], color: shade(leaf.crystal || leaf.round, i * 0.03), grad: [0.62, 1.3, 0, h] });
  });
  crystals.push({ geo: blob(0.6, 4, { squash: 0.5, amp: 0.2 }), pos: [0, 0.15, 0], color: shade(leaf.crystal || leaf.round, -0.12) });
  models.crystal = buildGeometry(crystals);
  models.alien = buildGeometry([
    { geo: cyl(0.1, 0.2, 3.4, 6), pos: [0, 1.7, 0], color: theme.pillar, grad: [0.7, 1, 0, 3.4] },
    { geo: sphere(1.25, 12, 9), pos: [0, 4.1, 0], color: leaf.alien || leaf.round, grad: [0.7, 1.2, 2.9, 5.4] },
    { geo: sphere(0.7, 10, 8), pos: [1.0, 3.2, 0.3], color: shade(leaf.alien || leaf.round, 0.06) },
    { geo: sphere(0.55, 10, 8), pos: [-0.9, 3.0, -0.4], color: shade(leaf.alien || leaf.round, 0.1) },
  ]);

  // a small robot walking the road
  models.walker = (color) =>
    buildGeometry([
      { geo: cyl(0.26, 0.34, 0.9, 8), pos: [0, 0.75, 0], color, grad: [0.75, 1.1, 0.3, 1.2] },
      { geo: sphere(0.25, 10, 8), pos: [0, 1.42, 0], color: 0xf1f4f7 },
      { geo: box(0.34, 0.08, 0.1), pos: [0, 1.44, 0.2], color: light },
      { geo: box(0.1, 0.4, 0.1), pos: [-0.13, 0.2, 0], color: theme.pillar },
      { geo: box(0.1, 0.4, 0.1), pos: [0.13, 0.2, 0], color: theme.pillar },
    ]);
  return models;
}
