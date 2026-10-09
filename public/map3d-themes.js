// The look of each world on the 3D map: one entry per world id (the same ids as `SignalCampaign.themes`).
// map3d.js stretches the rivers and lakes to the playable map and reads everything else as it is.
//
//   kit        which set of buildings the world uses: houses, the gate over the road, the tower beside it, walls, lamps,
//              the stepping pads of the route (see map3d-kits.js; "citadel" is the original Vietnamese citadel)
//   seed       any whole number; changes where hills, forests and flowers fall
//   water      sea level in world units (ground lower than this is under water)
//   river      points [x, z] of a river in the ORIGINAL frame x -80..80, z -45..45 (the map is stretched to 280 x 170)
//   riverWidth how wide the river valley is, in world units
//   lakes      [{ x, z, r }] in the same original frame
//   terrain    optional { rolling, hills, swell }: multipliers for the shape of the ground (default 1 each)
//   palette    colours of the ground: grassA/grassB (two greens, mixed by noise), dry, dirt, rock, rockDark, sand,
//              roadA/roadB (the road), snow (0..1, how much white on the highest ground)
//   trees      [[kind, weight], ...]; every kind must exist in the models (pine, round, blossom, bamboo, or a kit's own)
//   leaf       colours of the tree kinds (pine, round, blossom, bamboo, plus whatever the kit's trees ask for)
//   rockColor  colour of rocks (optional)
//   roof, wall, pillar, trim   the colours the kit builds its buildings from
//   sky        optional overrides of the lighting for `day` and `night`: { sky: [top, horizon], fog, sun, sunI, hemi,
//              env, glow, water, cloud, exposure, ridge }
//   guide      optional { color, emissive }: the glowing line along the road
//   stars      optional { count, when: 'night' | 'always' }: a starfield on the sky
//   life       optional switches for the little animated things: { petals: colour or null, birds, walkers, boat, lanterns }
//   density    optional multipliers: { trees, grass, flowers, rocks, houses } (default 1)
export const THEMES = {
  historical: {
    kit: 'citadel',
    seed: 2,
    water: -0.7,
    river: [[-8, -60], [-6, -38], [-16, -22], [-12, -8], [-26, 6], [-38, 16], [-52, 28], [-72, 40]],
    riverWidth: 7.5,
    lakes: [{ x: -84, z: 38, r: 28 }, { x: 70, z: -30, r: 12 }],
    palette: { grassA: 0x4f8a3c, grassB: 0x86a84c, dry: 0xb09a58, dirt: 0x8a6a46, rock: 0x84796b, rockDark: 0x4d4944, sand: 0xdac78f, roadA: 0xcdb98a, roadB: 0xa89268, snow: 0.3 },
    trees: [['pine', 0.45], ['round', 0.3], ['blossom', 0.15], ['bamboo', 0.1]],
    leaf: { pine: 0x2f6b3a, round: 0x4c8a3c, blossom: 0xf1a9c2, bamboo: 0x7bb04a },
    roof: 0x3a4452,
    wall: 0xe9dfc8,
    pillar: 0x9c2f26,
    trim: 0xd9a740,
    life: { petals: 0xffffff, birds: true, walkers: 'villager', boat: true, lanterns: true },
  },
};

// ---------------------------------------------------------------------------------------------------- the other worlds
THEMES.future = {
  kit: 'scifi',
  seed: 3,
  water: -1.4,
  river: [[-80, -42], [-45, -40], [-10, -44], [30, -41], [80, -38]],
  riverWidth: 7,
  lakes: [{ x: -72, z: -12, r: 14 }, { x: 70, z: 34, r: 12 }],
  palette: { grassA: 0x2f8f86, grassB: 0x5fbfa6, dry: 0x9fc5b8, dirt: 0x5e8088, rock: 0x8393a0, rockDark: 0x3d4a56, sand: 0xd3e8e6, roadA: 0xe3ecf2, roadB: 0xa6b8c6, snow: 0.4 },
  trees: [['crystal', 0.5], ['alien', 0.3], ['round', 0.2]],
  leaf: { pine: 0x1f6f78, round: 0x3fae9b, blossom: 0xb48cff, bamboo: 0x5fd0c0, crystal: 0x66e6ff, alien: 0xa885ff },
  rockColor: 0x8393a0,
  roof: 0x2a3a52,
  wall: 0xeaf2f7,
  pillar: 0x34506e,
  trim: 0x45e3ff,
  sky: {
    day: { sky: [0x1c2f7a, 0x9be0e8], fog: 0x9fd6de, sun: 0xe9fbff, sunI: 2.6, hemi: 0.4, env: 0.8, water: 0x38c4d4, cloud: 0.5, exposure: 1.1, ridge: 0x7fb7c9 },
    night: { sky: [0x040b22, 0x1b3a63], fog: 0x12304f, sun: 0x7fd8ff, glow: 3.6, water: 0x0e5a78, ridge: 0x0e2a45 },
  },
  glow: { lamp: 0x2ee6ff, gate: 0x3fe0ff, gateColor: 0xa8f4ff },
  guide: { color: 0x9ff5ff, emissive: 0x2ec9e8 },
  stars: { count: 800, when: 'night' },
  life: { petals: 0x9ff5ff, birds: false, walkers: 'robot', boat: false, lanterns: true },
  density: { trees: 0.85 },
};

THEMES.galaxy = {
  kit: 'scifi',
  seed: 11,
  water: -8,
  river: [[-80, -42], [-40, -40], [0, -43], [40, -40], [80, -42]],
  riverWidth: 6,
  lakes: [{ x: -70, z: -14, r: 13 }, { x: 72, z: 36, r: 11 }, { x: 4, z: 40, r: 9 }],
  terrain: { rolling: 1.25, hills: 1.3 },
  palette: { grassA: 0x3a2e6a, grassB: 0x5a3f9a, dry: 0x7a5ab0, dirt: 0x4a3050, rock: 0x6a5a86, rockDark: 0x2a2240, sand: 0x8a7ab0, roadA: 0x7b8bea, roadB: 0x4a58b4, snow: 0 },
  trees: [['crystal', 0.6], ['alien', 0.4]],
  leaf: { pine: 0x5a3f9a, round: 0x6a4fb4, blossom: 0xff7be0, bamboo: 0x7a8cff, crystal: 0xff7be0, alien: 0x7a8cff },
  rockColor: 0x6a5a86,
  roof: 0x201a3a,
  wall: 0xd9d6f0,
  pillar: 0x3b2f6b,
  trim: 0xff5fd2,
  sky: {
    day: { sky: [0x05061a, 0x2b1a5a], fog: 0x1d1448, sun: 0xffd6f6, sunI: 2.2, hemi: 0.45, env: 0.6, cloud: 0, exposure: 1.2, ridge: 0x2a1f5c },
    night: { sky: [0x02030d, 0x150f35], fog: 0x0e0a26, sun: 0x9a8cff, sunI: 0.9, glow: 3.6, cloud: 0, ridge: 0x1a1240 },
  },
  glow: { lamp: 0xff4fd0, gate: 0xff5fd2, gateColor: 0xffb0ec },
  guide: { color: 0xff9be6, emissive: 0xff2fb8 },
  stars: { count: 1500, when: 'always' },
  life: { petals: 0xff9ae6, birds: false, walkers: 'robot', boat: false, lanterns: false },
  density: { trees: 0.7, grass: 0.5, flowers: 0.4 },
};

THEMES.ring = {
  kit: 'scifi',
  seed: 7,
  water: -1.2,
  river: [[-80, -40], [-40, -42], [0, -40], [40, -43], [80, -40]],
  riverWidth: 6,
  lakes: [{ x: 6, z: 14, r: 11 }, { x: -72, z: -20, r: 12 }, { x: 74, z: -26, r: 10 }],
  palette: { grassA: 0x4c9a8a, grassB: 0x7fc9b0, dry: 0xb7c9a0, dirt: 0x7a8a78, rock: 0x8d98a4, rockDark: 0x46505c, sand: 0xe6dcc0, roadA: 0xf1efe8, roadB: 0xb4b8bf, snow: 0.2 },
  trees: [['round', 0.4], ['crystal', 0.3], ['alien', 0.3]],
  leaf: { pine: 0x2f7a6a, round: 0x4fa88a, blossom: 0xffb0c8, bamboo: 0x7fd09a, crystal: 0xffcf7a, alien: 0xff9a6a },
  roof: 0x3a4a6a,
  wall: 0xf1efe8,
  pillar: 0x3a4a6a,
  trim: 0xffb347,
  sky: {
    day: { sky: [0x3a4f9e, 0xf6c9a0], fog: 0xf2d6bc, sun: 0xffd9a8, sunI: 2.6, hemi: 0.4, env: 0.75, water: 0x4aa6c0, cloud: 0.7, ridge: 0xd9b8c0 },
    night: { sky: [0x080d26, 0x3a2a4f], fog: 0x241f3f, glow: 3.4, water: 0x1b4a66, ridge: 0x2a2048 },
  },
  glow: { lamp: 0xffa63a, gate: 0xffb347, gateColor: 0xffe2a8 },
  guide: { color: 0xffd36a, emissive: 0xffa63a },
  stars: { count: 600, when: 'night' },
  life: { petals: 0xffd3a0, birds: true, walkers: 'robot', boat: false, lanterns: true },
};

THEMES.modern = {
  kit: 'city',
  seed: 1,
  water: -0.5,
  river: [[-80, 41], [-40, 43], [0, 40], [40, 44], [80, 41]],
  riverWidth: 11,
  lakes: [{ x: 70, z: -38, r: 12 }],
  terrain: { rolling: 0.6, hills: 0.5 },
  palette: { grassA: 0x5c8f4a, grassB: 0x86b05a, dry: 0xb7ab7e, dirt: 0x8a7a5a, rock: 0x8d9298, rockDark: 0x4d5056, sand: 0xdcd0a8, roadA: 0x6a6f77, roadB: 0x4d5158, snow: 0.1 },
  trees: [['round', 0.4], ['palm', 0.22], ['shrub', 0.28], ['pine', 0.1]],
  leaf: { pine: 0x2f5f3a, round: 0x4f8a45, blossom: 0xe8a0b8, bamboo: 0x7bb04a, palm: 0x3c9a4a },
  rockColor: 0x8d9298,
  roof: 0x3a5873,
  wall: 0xe6e3dc,
  pillar: 0x5c6573,
  trim: 0xffd24a,
  sky: {
    day: { sky: [0x3d6db5, 0xf1dcc0], fog: 0xe8d9c5, sun: 0xffe2b0, water: 0x2f7aa6, ridge: 0xcfc4bc },
    night: { sky: [0x050b1c, 0x2a3350], fog: 0x1a2236, water: 0x143a58, ridge: 0x18203a },
  },
  glow: { lamp: 0xffd27a, gate: 0xffd24a, gateColor: 0xffe9a8 },
  guide: { color: 0xffe28a, emissive: 0xffc43a },
  stars: { count: 500, when: 'night' },
  life: { petals: null, birds: true, walkers: 'person', boat: false, lanterns: false },
  density: { trees: 0.7, grass: 0.8, houses: 1.35 },
};

THEMES.dewey = {
  kit: 'campus',
  seed: 4,
  water: -0.5,
  river: [[-80, -40], [-55, -38], [-30, -42], [0, -40], [30, -43]],
  riverWidth: 6,
  lakes: [{ x: -66, z: -30, r: 12 }, { x: 68, z: 36, r: 10 }, { x: -70, z: 36, r: 9 }],
  terrain: { rolling: 0.7, hills: 0.6 },
  palette: { grassA: 0x58a844, grassB: 0x8cc254, dry: 0xc2b878, dirt: 0x9a7a52, rock: 0x8d9298, rockDark: 0x4d5056, sand: 0xe6dcb0, roadA: 0xe0ddd2, roadB: 0xbdb9ad, snow: 0 },
  trees: [['round', 0.45], ['blossom', 0.2], ['shrub', 0.25], ['pine', 0.1]],
  leaf: { pine: 0x2f6b3a, round: 0x4f9a45, blossom: 0xe8505b, bamboo: 0x7bb04a },
  roof: 0xb64032,
  wall: 0xf4e9bf,
  pillar: 0xa8553a,
  trim: 0xffe27a,
  sky: {
    day: { sky: [0x2f78d0, 0xe3f0fa], fog: 0xdcebf5, water: 0x3a9aa8 },
  },
  glow: { lamp: 0xffd27a, gate: 0xffd24a, gateColor: 0xffe9a8 },
  guide: { color: 0xfff0a8, emissive: 0xffd24a },
  life: { petals: 0xff7a8a, birds: true, walkers: 'person', boat: false, lanterns: false },
  density: { trees: 0.8, houses: 1.2 },
};

THEMES.pastoral = {
  kit: 'farm',
  seed: 5,
  water: -0.9,
  river: [[-40, -60], [-30, -30], [-18, -10], [-4, 6], [8, 22], [20, 40], [30, 60]],
  riverWidth: 8,
  lakes: [{ x: -70, z: -30, r: 12 }, { x: 70, z: 34, r: 11 }],
  terrain: { rolling: 0.8, hills: 0.7 },
  palette: { grassA: 0x7aa83c, grassB: 0xb5c24a, dry: 0xd0b860, dirt: 0x9a7a4a, rock: 0x8a8272, rockDark: 0x4d4944, sand: 0xe6d49a, roadA: 0xd9c08a, roadB: 0xb89a64, snow: 0 },
  trees: [['round', 0.4], ['blossom', 0.3], ['hay', 0.15], ['pine', 0.1], ['bamboo', 0.05]],
  leaf: { pine: 0x3a6a3a, round: 0x6a9a3a, blossom: 0xf2b24a, bamboo: 0x9ab04a },
  roof: 0xc9a04a,
  wall: 0xf3e8cc,
  pillar: 0x7a5a3a,
  trim: 0xe8505b,
  sky: {
    day: { sky: [0x4a86c8, 0xfbe6c0], fog: 0xf2e2c0, sun: 0xffe8b0, water: 0x4aa0b0, ridge: 0xcdbfa0 },
  },
  guide: { color: 0xffe08a, emissive: 0xffb43a },
  life: { petals: 0xffe08a, birds: true, walkers: 'villager', boat: true, lanterns: true },
  density: { trees: 0.8 },
};

THEMES.survival = {
  kit: 'tropical',
  seed: 10,
  water: 1.0,
  river: [[-80, -43], [-40, -42], [0, -44], [40, -41], [80, -43]],
  riverWidth: 6,
  lakes: [{ x: -78, z: 36, r: 16 }, { x: 74, z: -36, r: 14 }],
  terrain: { rolling: 0.8, hills: 0.6, swell: 0.2, roadLift: 2.0, seabed: 4, seaOutside: true },
  palette: { grassA: 0x4fa04a, grassB: 0x84c458, dry: 0xc8c070, dirt: 0x9a7a52, rock: 0x7a7468, rockDark: 0x45403a, sand: 0xf0dfa0, roadA: 0xd8c690, roadB: 0xb29a64, snow: 0 },
  trees: [['palm', 0.5], ['round', 0.2], ['bamboo', 0.2], ['blossom', 0.1]],
  leaf: { pine: 0x2f6b3a, round: 0x4c9a3c, blossom: 0xff9ab0, bamboo: 0x7bb04a, palm: 0x3aa04a },
  roof: 0xc9a85a,
  wall: 0xd9c28a,
  pillar: 0x7a5a3a,
  trim: 0xff7a3a,
  sky: {
    day: { sky: [0x1e90e0, 0xd8f0fa], fog: 0xcfeaf5, water: 0x1f9fb0, ridge: 0x9ac8d8 },
    night: { water: 0x0d4a5c },
  },
  guide: { color: 0xfff0a8, emissive: 0xffc43a },
  life: { petals: 0xff9ab0, birds: true, walkers: 'villager', boat: true, lanterns: true },
  density: { trees: 0.9 },
};

THEMES.cube = {
  kit: 'blocks',
  seed: 6,
  water: 0.6,
  river: [[-80, -43], [-40, -42], [0, -44], [40, -41], [80, -43]],
  riverWidth: 6,
  lakes: [{ x: -78, z: 36, r: 16 }, { x: 74, z: -36, r: 14 }],
  terrain: { rolling: 0.8, hills: 0.6, swell: 0.2, roadLift: 1.8, seabed: 3.5, seaOutside: true },
  palette: { grassA: 0x5cc24a, grassB: 0x9be05a, dry: 0xd8d27a, dirt: 0xb08a5a, rock: 0xa0a6b0, rockDark: 0x5a606c, sand: 0xf6e6a8, roadA: 0xf4f1e8, roadB: 0xc9c6bd, snow: 0 },
  trees: [['cubetree', 0.4], ['cubepine', 0.25], ['cubebush', 0.35]],
  leaf: { pine: 0x2f9a5a, round: 0x58c24a, blossom: 0xff9ab0, bamboo: 0x7ae05a },
  roof: 0x4aa3e8,
  wall: 0xff6a5a,
  pillar: 0xffd23a,
  trim: 0x6aefff,
  sky: {
    day: { sky: [0x2f90e8, 0xdff0ff], fog: 0xd4ebfa, water: 0x3ab6e8, ridge: 0xa8cce8 },
  },
  glow: { lamp: 0x6aefff, gate: 0x6aefff, gateColor: 0xc8f8ff },
  guide: { color: 0xfff0a8, emissive: 0xffd24a },
  life: { petals: null, birds: true, walkers: 'person', boat: false, lanterns: false },
  density: { grass: 0.6 },
};

THEMES.maze = {
  kit: 'blocks',
  seed: 12,
  water: -1.5,
  river: [[-80, -43], [-40, -42], [0, -44], [40, -41], [80, -43]],
  riverWidth: 5,
  lakes: [{ x: -76, z: 38, r: 12 }, { x: 74, z: -36, r: 11 }],
  terrain: { rolling: 0.7, hills: 0.6 },
  palette: { grassA: 0x2f6a3a, grassB: 0x4f8a4a, dry: 0x8a9a5a, dirt: 0x6a5a4a, rock: 0x7a7a80, rockDark: 0x3a3a42, sand: 0xb8b08a, roadA: 0xb8b0a0, roadB: 0x8a8478, snow: 0 },
  trees: [['hedge', 0.6], ['cubepine', 0.2], ['cubebush', 0.2]],
  leaf: { pine: 0x1f5a34, round: 0x2f7a3a, blossom: 0xd8a8ff, bamboo: 0x3f8a44 },
  roof: 0x5a5a66,
  wall: 0xb8b0a0,
  pillar: 0x3a3a46,
  trim: 0xff5ad8,
  sky: {
    day: { sky: [0x3a2f6a, 0xd8a8c8], fog: 0xb89ab8, sun: 0xffc8e8, sunI: 2.1, ridge: 0x8a6a9a },
    night: { sky: [0x0a0618, 0x2a1840], fog: 0x1a1030, ridge: 0x1a1030 },
  },
  glow: { lamp: 0xff5ad8, gate: 0xff5ad8, gateColor: 0xffc0f0 },
  guide: { color: 0xff9be6, emissive: 0xff3ac8 },
  stars: { count: 600, when: 'night' },
  life: { petals: 0xd8a8ff, birds: false, walkers: 'person', boat: false, lanterns: false },
  density: { trees: 1.7, grass: 0.7 },
};

THEMES.academy = {
  kit: 'academy',
  seed: 9,
  water: -0.9,
  river: [[-20, -60], [-14, -40], [-26, -26], [-40, -10], [-52, 6], [-66, 22], [-78, 34]],
  riverWidth: 7,
  lakes: [{ x: -84, z: 38, r: 28 }, { x: 70, z: -32, r: 12 }],
  palette: { grassA: 0x3f7a4a, grassB: 0x6a9a5a, dry: 0xa8a870, dirt: 0x6a5a4a, rock: 0x7a7a88, rockDark: 0x3a3a48, sand: 0xc8c0a0, roadA: 0xa8a8b4, roadB: 0x7a7a8a, snow: 0.2 },
  trees: [['pine', 0.5], ['round', 0.25], ['blossom', 0.15], ['bamboo', 0.1]],
  leaf: { pine: 0x1f5a3a, round: 0x3a7a4a, blossom: 0xb48cff, bamboo: 0x5a9a6a },
  roof: 0x3a2f6b,
  wall: 0xd8d0c0,
  pillar: 0x5a3a8a,
  trim: 0xffd86a,
  sky: {
    day: { sky: [0x2a2f78, 0xd0a8c8], fog: 0xbfa8c8, sun: 0xffd8b0, sunI: 2.4, ridge: 0x8a7aa8 },
    night: { sky: [0x050818, 0x241a48], fog: 0x1a1536, ridge: 0x1a1740 },
  },
  glow: { lamp: 0xffa63a, gate: 0xffd86a, gateColor: 0xffefb0 },
  guide: { color: 0xffe28a, emissive: 0xffc43a },
  stars: { count: 700, when: 'night' },
  life: { petals: 0xd8b8ff, birds: true, walkers: 'student', boat: true, lanterns: true },
};

THEMES.zones = {
  kit: 'academy',
  seed: 8,
  water: -1.6,
  river: [[-80, -43], [-40, -42], [0, -44], [40, -41], [80, -43]],
  riverWidth: 6,
  lakes: [{ x: -72, z: -26, r: 10 }, { x: 72, z: 36, r: 10 }],
  terrain: { rolling: 1.2, hills: 1.1 },
  palette: { grassA: 0x8a8a3c, grassB: 0xb0a050, dry: 0xc2a070, dirt: 0x8a6a46, rock: 0x8a7a6a, rockDark: 0x4a4038, sand: 0xd8c090, roadA: 0xb89a64, roadB: 0x8a6a46, snow: 0 },
  trees: [['pine', 0.35], ['round', 0.2]],
  leaf: { pine: 0x5a6a3a, round: 0x8a7a3a, blossom: 0xc08a50, bamboo: 0x8a9a4a },
  rockColor: 0x8a7a6a,
  roof: 0x5a2a22,
  wall: 0xcfc3a8,
  pillar: 0x9a2f26,
  trim: 0xd9a740,
  sky: {
    day: { sky: [0x6a7088, 0xe8c8a0], fog: 0xd8c0a0, sun: 0xffe0b0, sunI: 2.4, cloud: 0.9, ridge: 0xb8a890 },
    night: { sky: [0x0a0c18, 0x3a2a30], fog: 0x2a2024, ridge: 0x2a2024 },
  },
  glow: { lamp: 0xff7a3a, gate: 0xffa63a, gateColor: 0xffd58a },
  guide: { color: 0xffb06a, emissive: 0xff6a2a },
  stars: { count: 500, when: 'night' },
  life: { petals: 0xd8a060, birds: false, walkers: 'student', boat: false, lanterns: false },
  density: { trees: 0.6, grass: 0.6, rocks: 1.4, houses: 1.1 },
};
