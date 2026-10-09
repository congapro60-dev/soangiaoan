// Detail textures for the ground, made on the spot (no downloads): tileable grayscale patterns that give the
// painted colours a surface. One RGB texture holds grass (R), rock (G) and soil/sand (B); a second holds the
// cobbled road (R) and sand ripples (G). They are used as brightness and bump, never as colour.
import * as THREE from 'three';

const SIZE = 512;

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Value noise that repeats every `period` cells, so the texture tiles without a seam.
function tileNoise(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % period) + period) % period;
  const a = hash2(m(xi), m(yi), seed);
  const b = hash2(m(xi + 1), m(yi), seed);
  const c = hash2(m(xi), m(yi + 1), seed);
  const d = hash2(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmTile(x, y, basePeriod, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let period = basePeriod;
  for (let o = 0; o < octaves; o++) {
    sum += amp * tileNoise((x / SIZE) * period, (y / SIZE) * period, period, seed + o * 17);
    total += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / total;
}

// Voronoi on a wrapped grid: returns distance to the nearest point (f1), the next (f2) and the nearest cell's id.
function voronoi(x, y, cells, seed) {
  const gx = (x / SIZE) * cells;
  const gy = (y / SIZE) * cells;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const wx = ((cx % cells) + cells) % cells;
      const wy = ((cy % cells) + cells) % cells;
      const px = cx + 0.15 + hash2(wx, wy, seed) * 0.7;
      const py = cy + 0.15 + hash2(wx, wy, seed + 5) * 0.7;
      const d = Math.hypot(gx - px, gy - py);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(wx, wy, seed + 9);
      } else if (d < f2) f2 = d;
    }
  }
  return { f1, f2, id };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function grassValue(x, y) {
  const base = fbmTile(x, y, 6, 4, 11);
  // short blades: a stretched noise gives vertical strokes
  const blade = tileNoise((x / SIZE) * 110, (y / SIZE) * 110, 110, 3);
  const blade2 = tileNoise((x / SIZE) * 190 + 0.37, (y / SIZE) * 160, 190, 5);
  return clamp01(0.5 + (base - 0.5) * 0.85 + (blade - 0.5) * 0.2 + (blade2 - 0.5) * 0.08);
}

function rockValue(x, y) {
  const v = voronoi(x, y, 9, 21);
  const edge = clamp01((v.f2 - v.f1) * 3.2); // 0 on the cracks, 1 inside a facet
  const slab = 0.38 + v.id * 0.34; // each facet its own brightness
  const grain = fbmTile(x, y, 10, 4, 31);
  const ridged = 1 - Math.abs(fbmTile(x, y, 5, 3, 41) * 2 - 1);
  return clamp01(slab * (0.45 + 0.55 * edge) + (grain - 0.5) * 0.5 + (ridged - 0.5) * 0.25);
}

function soilValue(x, y) {
  const a = fbmTile(x, y, 14, 4, 51);
  const grain = tileNoise((x / SIZE) * 180, (y / SIZE) * 180, 180, 53);
  return clamp01(0.5 + (a - 0.5) * 0.85 + (grain - 0.5) * 0.18);
}

function cobbleValue(x, y) {
  const v = voronoi(x, y, 11, 61);
  const dome = clamp01(1 - v.f1 * 1.5);
  const edge = clamp01((v.f2 - v.f1) * 5);
  const shade = 0.42 + v.id * 0.28;
  const grain = fbmTile(x, y, 24, 3, 71);
  return clamp01((shade * (0.4 + 0.6 * edge) + dome * 0.22) + (grain - 0.5) * 0.25);
}

function rippleValue(x, y) {
  const warp = fbmTile(x, y, 4, 3, 81) * 7;
  const wave = Math.sin(((x / SIZE) * 14 + warp) * Math.PI * 2) * 0.5 + 0.5;
  const grain = tileNoise((x / SIZE) * 200, (y / SIZE) * 200, 200, 83);
  return clamp01(0.5 * wave + 0.12 * grain + 0.3);
}

function normalise(values) {
  // Stretch to the full range so every layer has the same contrast, centred on mid-grey after the shader's maths.
  let lo = 1;
  let hi = 0;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = Math.max(0.0001, hi - lo);
  for (let i = 0; i < values.length; i++) values[i] = (values[i] - lo) / span;
}

function texture(data) {
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function makeDetailTextures() {
  const n = SIZE * SIZE;
  const layers = {
    grass: new Float32Array(n),
    rock: new Float32Array(n),
    soil: new Float32Array(n),
    cobble: new Float32Array(n),
    ripple: new Float32Array(n),
  };
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      layers.grass[i] = grassValue(x, y);
      layers.rock[i] = rockValue(x, y);
      layers.soil[i] = soilValue(x, y);
      layers.cobble[i] = cobbleValue(x, y);
      layers.ripple[i] = rippleValue(x, y);
    }
  }
  Object.values(layers).forEach(normalise);
  const a = new Uint8Array(n * 4);
  const b = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    a[i * 4] = layers.grass[i] * 255;
    a[i * 4 + 1] = layers.rock[i] * 255;
    a[i * 4 + 2] = layers.soil[i] * 255;
    a[i * 4 + 3] = 255;
    b[i * 4] = layers.cobble[i] * 255;
    b[i * 4 + 1] = layers.ripple[i] * 255;
    b[i * 4 + 2] = 128;
    b[i * 4 + 3] = 255;
  }
  return { detail: texture(a), road: texture(b) };
}
