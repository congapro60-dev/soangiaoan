// Third-person 3D campaign map. A perspective camera orbits the pupil's own mascot like a
// third-person game: drag to turn and tilt, pinch or wheel to move closer or further away, and switch to
// "move" (or hold Shift / right mouse / use two fingers) to drag the map around and look at any place.
//
// Nothing is baked into a picture: the ground is painted by a shader from height, slope and noise (grass, rock,
// sand, dirt, road), the river and bay are real water, and the road, gates, houses, bridge, pier, lanterns and
// trees are 3D models standing on the height field with shadows. Roads and gates follow the route exactly.
// If WebGL is missing or the frame rate stays too low, `onFallback` is called so the page can go back to 2D.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPost } from './map3d-post.js';
import { makeDetailTextures } from './map3d-textures.js';
import { buildGeometry, makeModels } from './map3d-models.js';
import { THEMES } from './map3d-themes.js';
import { KITS } from './map3d-kits.js';

const WIDTH = 280; // world units across the playable map (it was 160 x 90: lanes 7 units apart, too tight for 50 pupils)
const DEPTH = 170;
const HX = 600; // half size of the whole landscape; it fades into the haze long before its edge
const HZ = 520;
const GATES = [0, 8, 16, 24, 32];
const RIGID_KINDS = new Set(['crystal', 'hay', 'cubetree', 'cubepine', 'cubebush', 'hedge']);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function hash(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), lerp(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
}
const fbm = (x, y, seed) => valueNoise(x, y, seed) * 0.55 + valueNoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + valueNoise(x * 4.3, y * 4.3, seed + 13) * 0.15;
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toWorld = (p) => new THREE.Vector2((p[0] / 100 - 0.5) * WIDTH, (p[1] / 100 - 0.5) * DEPTH);

function distanceToPath(x, z, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.y) * dz) / len2, 0, 1);
    const px = a.x + dx * t - x;
    const pz = a.y + dz * t - z;
    best = Math.min(best, px * px + pz * pz);
  }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------------------------------------- world themes
// Rivers and lakes are written in the original frame (x -80..80, z -45..45) and stretched to the playable map here.
const SX = WIDTH / 160;
const SZ = DEPTH / 90;
const frameRiver = (points) => points.map(([x, z]) => [x * SX, z * SZ]);
const frameLakes = (list) => list.map((l) => ({ x: l.x * SX, z: l.z * SZ, r: l.r * SX }));
// A theme is written in the original frame; the rivers and lakes are stretched to the playable map here.
const frameTheme = (raw) => ({ ...raw, river: frameRiver(raw.river), lakes: frameLakes(raw.lakes) });

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (...args) => new THREE.CylinderGeometry(...args);
const cone = (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg);

function waterNormalTexture() {
  const N = 128;
  const h = new Float32Array(N * N);
  const lat = (x, y) => hash(((x % 16) + 16) % 16, ((y % 16) + 16) % 16, 3);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * 16;
      const fy = (y / N) * 16;
      const xi = Math.floor(fx);
      const yi = Math.floor(fy);
      const u = smooth(0, 1, fx - xi);
      const v = smooth(0, 1, fy - yi);
      h[y * N + x] = lerp(lerp(lat(xi, yi), lat(xi + 1, yi), u), lerp(lat(xi, yi + 1), lat(xi + 1, yi + 1), u), v);
    }
  }
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
      const nx = -dx * 3;
      const ny = -dy * 3;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * N + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r0 = mulberry(5);
  for (let i = 0; i < 9; i++) {
    const x = 30 + r0() * 68;
    const y = 54 + r0() * 26;
    const r = 18 + r0() * 20;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const NOISE_GLSL = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y); }
float fb(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
`;

export function mount(host, model, options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const canvas = renderer.domElement;
  canvas.className = 'strategy-gl3';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label || 'Bản đồ 3D. Kéo để xoay quanh linh vật. Giữ Shift hoặc dùng hai ngón tay để di chuyển bản đồ. Lăn chuột hoặc chụm hai ngón để lại gần, ra xa.');
  host.appendChild(canvas);
  // Names and gate plaques are real HTML text laid over the canvas (not pictures of text drawn inside it): they stay
  // sharp at any zoom and any resolution scale, and cost one transform per label per frame.
  const mascotLayer = document.createElement('div');
  mascotLayer.setAttribute('aria-hidden', 'true');
  mascotLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2';
  host.appendChild(mascotLayer);
  const labelLayer = document.createElement('div');
  labelLayer.setAttribute('aria-hidden', 'true');
  labelLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2';
  host.appendChild(labelLayer);
  const labels = [];
  function makeLabel(kind, first, second) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;display:none;white-space:nowrap;will-change:transform;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.2;text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased';
    if (kind === 'gate') {
      el.style.cssText += ';padding:4px 11px;border-radius:10px;background:rgba(58,16,12,.95);border:2px solid #d9a740;color:#fff;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.45)';
      const num = document.createElement('span');
      num.textContent = first;
      num.style.cssText = 'color:#f6d481;font-weight:800;margin-right:8px';
      const name = document.createElement('span');
      name.textContent = String(second || '').slice(0, 22);
      el.append(num, name);
    } else {
      const own = kind === 'own';
      el.style.cssText += ';padding:' + (own ? '3px 11px' : '2px 9px') + ';border-radius:999px;font-weight:700;font-size:' + (own ? 15 : 13) + 'px;box-shadow:0 1px 5px rgba(0,0,0,.5);' + (own ? 'background:rgba(246,212,129,.98);color:#1b1405' : 'background:rgba(8,15,33,.82);color:#fff');
      el.textContent = String(first || '').slice(0, 24);
    }
    labelLayer.appendChild(el);
    labels.push(el);
    return el;
  }
  // A mascot is one cell of the picture sheet drawn as a CSS background, exactly like the flat map does, so it is as
  // sharp as the picture itself and is never softened by the 3D drawing or its anti-aliasing.
  function makeMascot(index) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;display:none;will-change:transform;pointer-events:none;background-repeat:no-repeat;background-size:400% 200%;filter:drop-shadow(0 3px 3px rgba(0,0,0,.42))';
    el.style.backgroundImage = "url('" + model.spriteUrl + "')";
    el.style.backgroundPosition = ((index % 4) * 100) / 3 + '% ' + Math.floor(index / 4) * 100 + '%';
    mascotLayer.appendChild(el);
    return el;
  }
  function makeArrow() {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;display:none;will-change:transform;pointer-events:none;width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:24px solid #f6d481;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))';
    mascotLayer.appendChild(el);
    return el;
  }
  // "+3": how many more mascots are standing under this one (they would only be a pile on the screen).
  const badges = [];
  function badgeAt(index) {
    let el = badges[index];
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;display:none;will-change:transform;pointer-events:none;padding:1px 7px;border-radius:999px;background:#f6d481;color:#1b1405;border:2px solid #fff;font:800 12px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.5)';
      mascotLayer.appendChild(el);
      badges[index] = el;
    }
    return el;
  }
  // The die's hint ("Chạm để lắc") and its result bubble ("4 bước").
  function makePill(first, second, hot) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;display:none;white-space:nowrap;text-align:center;will-change:transform;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.05;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.45);' + (hot ? 'padding:6px 20px 8px;border-radius:22px;background:linear-gradient(#ffe9a6,#f0b94a);border:3px solid #fff7dc;color:#3a2200' : 'padding:7px 16px;border-radius:999px;background:linear-gradient(#2a3a5c,#16213a);border:2px solid rgba(255,255,255,.6);color:#fff');
    const a = document.createElement('div');
    a.textContent = first;
    a.style.cssText = hot ? 'font-weight:900;font-size:30px' : 'font-weight:800;font-size:15px';
    el.appendChild(a);
    if (second) {
      const b = document.createElement('div');
      b.textContent = second;
      b.style.cssText = 'font-weight:800;font-size:13px';
      el.appendChild(b);
    }
    labelLayer.appendChild(el);
    return el;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 1, 760);
  const state = { model, mode: 'day', dirty: true, destroyed: false, fallback: false, drag: 'orbit', boat: null };
  const theme = frameTheme(THEMES[options.world] || THEMES.historical);
  const lifeCfg = { ...{ petals: 0xffffff, birds: true, walkers: 'villager', boat: true, lanterns: true }, ...(theme.life || {}) };
  const dens = { trees: 1, grass: 1, flowers: 1, rocks: 1, houses: 1, ...(theme.density || {}) };
  const shape = { rolling: 1, hills: 1, swell: 1, roadLift: 0, seabed: 0, seaOutside: false, ...(theme.terrain || {}) };
  const seed = theme.seed;
  const WATER = theme.water;
  const path = model.route.map(toWorld);
  const places = model.places || [];

  // ------------------------------------------------------------------------------------------ height field
  const riverPts = theme.river.map(([x, z]) => new THREE.Vector2(x, z));
  const lakes = theme.lakes;
  function heightAt(x, z) {
    const d = distanceToPath(x, z, path);
    const flat = smooth(3, 12, d);
    const rolling = (fbm(x * 0.022 + 90, z * 0.022 + 90, seed) - 0.5) * 9 * shape.rolling * (0.35 + 0.65 * flat);
    const hills = (fbm(x * 0.05 + 40, z * 0.05 + 40, seed + 1) - 0.45) * 7 * shape.hills * flat;
    const ox = Math.max(0, Math.abs(x) - WIDTH / 2);
    const oz = Math.max(0, Math.abs(z) - DEPTH / 2);
    const rim = Math.hypot(ox, oz);
    // beyond the playable map: wide, gentle swells of open country (never a wall), always dry land
    const swell = ((fbm(x * 0.011 + 11, z * 0.011 + 11, seed + 3) - 0.45) * 15 + (fbm(x * 0.028, z * 0.028, seed + 5) - 0.5) * 5) * shape.swell;
    const open = smooth(0, 90, rim);
    let h = 0.8 + rolling + hills + open * (3 + swell);
    // outside the playable map the land stays dry (worlds that are islands in the sea let the sea go on instead)
    if (!shape.seaOutside) h = lerp(h, Math.max(h, WATER + 1.5), smooth(0, 30, rim));
    // islands: away from the road the ground sinks to a flat sea bed, and the land around the road is raised above the sea
    if (shape.seabed) h = lerp(h, WATER - shape.seabed, smooth(11, 30, d));
    if (shape.roadLift) h = lerp(h, Math.max(h, WATER + shape.roadLift), 1 - smooth(7, 21, d));
    const dr = distanceToPath(x, z, riverPts);
    h -= (1 - smooth(0, theme.riverWidth, dr)) * 4.2;
    for (const l of lakes) {
      const dl = Math.hypot(x - l.x, z - l.z);
      h -= (1 - smooth(l.r * 0.45, l.r, dl)) * 5.5;
    }
    return h;
  }

  // Vertex positions along one axis: one every `spacing` units inside the playable area (plus a margin), then spacing
  // that grows step by step out to the far edge of the landscape. The triangle count stays the same as a plain grid.
  function stretchedAxis(innerHalf, spacing, outerSteps, outerHalf) {
    const inner = Math.ceil(innerHalf / spacing);
    const edge = inner * spacing;
    const length = outerHalf - edge;
    let lo = 1.0001;
    let hi = 2;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const total = (Math.pow(mid, outerSteps) - 1) / (mid - 1);
      if (total > length) hi = mid;
      else lo = mid;
    }
    const ratio = (lo + hi) / 2;
    const half = [];
    for (let k = 0; k <= inner; k++) half.push(k * spacing);
    let at = edge;
    let step = spacing;
    for (let j = 0; j < outerSteps; j++) {
      step *= ratio;
      at += step;
      half.push(at);
    }
    const scale = (outerHalf - edge) / (half[half.length - 1] - edge);
    for (let k = inner + 1; k < half.length; k++) half[k] = edge + (half[k] - edge) * scale;
    return [...half.slice(1).reverse().map((v) => -v), ...half];
  }
  const axisX = stretchedAxis(WIDTH / 2 + 20, 1.6, 70, HX);
  const axisZ = stretchedAxis(DEPTH / 2 + 20, 1.6, 24, HZ);
  const geo = new THREE.PlaneGeometry(1, 1, axisX.length - 1, axisZ.length - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let iz = 0; iz < axisZ.length; iz++) {
    for (let ix = 0; ix < axisX.length; ix++) {
      const i = iz * axisX.length + ix;
      pos.setX(i, axisX[ix]);
      pos.setZ(i, axisZ[iz]);
      pos.setY(i, heightAt(axisX[ix], axisZ[iz]));
    }
  }
  geo.computeVertexNormals();

  // road mask: the route drawn as a soft ribbon, sampled by the ground shader
  const maskCanvas = document.createElement('canvas');
  const MASK_W = 2048;
  const MASK_H = Math.round((MASK_W * DEPTH) / WIDTH);
  maskCanvas.width = MASK_W;
  maskCanvas.height = MASK_H;
  const mg = maskCanvas.getContext('2d');
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, MASK_W, MASK_H);
  mg.strokeStyle = '#fff';
  mg.lineCap = mg.lineJoin = 'round';
  mg.lineWidth = 3.1 * (MASK_W / WIDTH);
  if ('filter' in mg) mg.filter = 'blur(4px)';
  const mx = (p) => ((p.x + WIDTH / 2) / WIDTH) * MASK_W;
  const my = (p) => ((p.y + DEPTH / 2) / DEPTH) * MASK_H;
  mg.beginPath();
  path.forEach((p, i) => {
    if (i === 0) mg.moveTo(mx(p), my(p));
    else {
      const prev = path[i - 1];
      mg.quadraticCurveTo(mx(prev), my(prev), (mx(prev) + mx(p)) / 2, (my(prev) + my(p)) / 2);
    }
  });
  mg.lineTo(mx(path[path.length - 1]), my(path[path.length - 1]));
  mg.stroke();
  const roadTex = new THREE.CanvasTexture(maskCanvas);
  roadTex.wrapS = roadTex.wrapT = THREE.ClampToEdgeWrapping;
  roadTex.flipY = false; // canvas row 0 is the north edge, exactly like the shader's z axis

  const P = theme.palette;
  const detailTextures = makeDetailTextures();

  // The painted colour of the ground (grass, dry grass, dirt, rock, snow, sand, wet shore, deep water) needs a dozen
  // noise lookups per pixel. Doing that every frame took 20 ms on an Intel Iris Plus, so it is painted ONCE into two
  // textures when the map opens (by flattening the ground mesh into texture space with the very same code) and the
  // per-frame shader only looks it up and adds the fine tiling detail on top.
  // the playable map plus a margin at 2560 pixels across (about 7.8 pixels per unit); farther out the ground is plain meadow in the haze
  const BAKE_EXT = new THREE.Vector4(-(WIDTH / 2 + 24), -(DEPTH / 2 + 16), WIDTH + 48, DEPTH + 32);
  const BAKE_W = 2560;
  const BAKE_H = Math.round((BAKE_W * BAKE_EXT.w) / BAKE_EXT.z);
  const paletteUniforms = () => ({
    uExt: { value: BAKE_EXT },
    uWater: { value: WATER },
    uSnow: { value: P.snow },
    uGrassA: { value: new THREE.Color(P.grassA) },
    uGrassB: { value: new THREE.Color(P.grassB) },
    uDry: { value: new THREE.Color(P.dry) },
    uDirt: { value: new THREE.Color(P.dirt) },
    uRock: { value: new THREE.Color(P.rock) },
    uRockDark: { value: new THREE.Color(P.rockDark) },
    uSand: { value: new THREE.Color(P.sand) },
  });
  function bakeGround() {
    const make = (mask) =>
      new THREE.ShaderMaterial({
        uniforms: paletteUniforms(),
        defines: mask ? { BAKE_MASK: 1 } : {},
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        vertexShader: `
varying vec3 vWP;
varying vec3 vWN;
uniform vec4 uExt;
void main() {
  vWP = position;
  vWN = normal;
  vec2 t = (position.xz - uExt.xy) / uExt.zw;
  gl_Position = vec4(t * 2.0 - 1.0, 0.0, 1.0);
}`,
        fragmentShader: `
precision highp float;
varying vec3 vWP;
varying vec3 vWN;
uniform float uWater, uSnow;
uniform vec3 uGrassA, uGrassB, uDry, uDirt, uRock, uRockDark, uSand;
${NOISE_GLSL}
void main() {
  vec2 p = vWP.xz;
  float h = vWP.y;
  vec3 nW = normalize(vWN);
  float slope = 1.0 - clamp(nW.y, 0.0, 1.0);
  float n1 = fb(p * 0.08);
  float n2 = fb(p * 0.35 + 10.0);
  vec3 grass = mix(uGrassA, uGrassB, smoothstep(0.35, 0.68, n1));
  vec3 c = mix(grass, uDry, smoothstep(0.55, 0.78, fb(p * 0.05 + 30.0)) * 0.65);
  float dirtMix = smoothstep(0.62, 0.82, n2) * 0.45;
  c = mix(c, uDirt, dirtMix);
  float high = smoothstep(11.0, 26.0, h + (n1 - 0.5) * 6.0);
  float rockMix = clamp(smoothstep(0.2, 0.5, slope) + high * 0.85, 0.0, 1.0);
  vec3 rock = mix(uRock, uRockDark, smoothstep(0.3, 0.8, n2 + slope * 0.6));
  rock *= 0.9 + 0.2 * sin(h * 1.6 + n2 * 4.0);
  c = mix(c, rock, rockMix);
  float snow = smoothstep(26.0, 36.0, h + (n1 - 0.5) * 8.0) * uSnow * (1.0 - smoothstep(0.5, 0.75, slope));
  c = mix(c, vec3(0.92, 0.94, 0.97), snow);
  float shore = 1.0 - smoothstep(0.0, 1.3, h - uWater);
  c = mix(c, uSand, shore * (1.0 - rockMix * 0.7));
  float wet = 1.0 - smoothstep(-0.2, 0.7, h - uWater);
  c *= 1.0 - wet * 0.25;
  float depth = clamp((uWater - h) / 3.2, 0.0, 1.0);
  c = mix(c, vec3(0.05, 0.22, 0.27), depth * 0.9);
#ifdef BAKE_MASK
  gl_FragColor = vec4(rockMix, shore, dirtMix, depth);
#else
  gl_FragColor = vec4(c, 1.0);
#endif
}`,
      });
    const flat = new THREE.Mesh(geo, make(false));
    flat.frustumCulled = false;
    const bakeScene = new THREE.Scene();
    bakeScene.add(flat);
    const camera0 = new THREE.Camera();
    const target = (w, h, srgb) => {
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
      if (srgb) rt.texture.colorSpace = THREE.SRGBColorSpace;
      rt.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return rt;
    };
    const colorRT = target(BAKE_W, BAKE_H, true);
    const maskRT = target(BAKE_W / 2, Math.round(BAKE_H / 2), false);
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(colorRT);
    renderer.render(bakeScene, camera0);
    flat.material.dispose();
    flat.material = make(true);
    renderer.setRenderTarget(maskRT);
    renderer.render(bakeScene, camera0);
    flat.material.dispose();
    renderer.setRenderTarget(previous);
    return { color: colorRT, mask: maskRT };
  }
  const baked = bakeGround();

  const groundUniforms = {
    uRoad: { value: roadTex },
    uExt: { value: new THREE.Vector4(-WIDTH / 2, -DEPTH / 2, WIDTH, DEPTH) },
    uBake: { value: BAKE_EXT },
    uBakedColor: { value: baked.color.texture },
    uBakedMask: { value: baked.mask.texture },
    uWater: { value: WATER },
    uRoadA: { value: new THREE.Color(P.roadA) },
    uRoadB: { value: new THREE.Color(P.roadB) },
    uOuter: { value: new THREE.Color(P.grassA).lerp(new THREE.Color(P.grassB), 0.55).multiplyScalar(0.94) },
    uDetail: { value: detailTextures.detail },
    uRoadTex: { value: detailTextures.road },
    uTime: { value: 0 },
    uBump: { value: 0.4 },
  };
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWP;
varying vec3 vWN;
uniform sampler2D uRoad, uDetail, uRoadTex, uBakedColor, uBakedMask;
uniform vec4 uExt, uBake;
uniform float uWater, uTime, uBump;
uniform vec3 uRoadA, uRoadB, uOuter;
float gHeight;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec2 p = vWP.xz;
  float h = vWP.y;
  vec3 nW = normalize(vWN);

  // painted once when the map opened: colour, and (rock, shore, dirt, water depth) masks
  vec2 bt = (p - uBake.xy) / uBake.zw;
  vec3 c = texture2D(uBakedColor, bt).rgb;
  vec4 m = texture2D(uBakedMask, bt);
  float rockMix = m.x;
  float shore = m.y;
  float dirtMix = m.z;
  float depth = m.w;
  // outside the painted window: plain meadow (it lies far away, in the haze)
  vec2 edgeUv = abs(bt - 0.5) * 2.0;
  float away = smoothstep(0.93, 1.0, max(edgeUv.x, edgeUv.y));
  c = mix(c, uOuter, away);
  rockMix *= 1.0 - away;
  shore *= 1.0 - away;
  dirtMix *= 1.0 - away;
  depth *= 1.0 - away;

  // the road ribbon
  vec2 ruv = (p - uExt.xy) / uExt.zw;
  float road = 0.0;
  if (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0) road = texture2D(uRoad, ruv).r;
  road *= 1.0 - clamp(depth * 3.0, 0.0, 1.0);
  float roadMask = smoothstep(0.25, 0.75, road);

  // surface detail: bright/dark pattern per material, also used as bump
  vec3 dA = texture2D(uDetail, p * 0.16).rgb;
  vec3 dB = texture2D(uDetail, mat2(0.8, -0.6, 0.6, 0.8) * p * 0.037 + vec2(0.31, 0.17)).rgb;
  c = mix(c, mix(uRoadA, uRoadB, dA.g), roadMask);
  float grassD = mix(dA.r, dB.r, 0.45);
  float soilD = mix(dA.b, dB.b, 0.5);
  vec3 tw = pow(abs(nW), vec3(4.0));
  tw /= (tw.x + tw.y + tw.z);
  float rockD = texture2D(uDetail, vWP.zy * 0.11).g * tw.x + texture2D(uDetail, vWP.xz * 0.11).g * tw.y + texture2D(uDetail, vWP.xy * 0.11).g * tw.z;
  float rippleD = texture2D(uRoadTex, p * 0.21).g;
  float cobbleD = texture2D(uRoadTex, p * 0.34).r;
  float hgt = mix(grassD, soilD, clamp(dirtMix * 1.6, 0.0, 1.0));
  hgt = mix(hgt, 0.5 + (rippleD - 0.5) * 0.3, shore * (1.0 - rockMix));
  hgt = mix(hgt, rockD, rockMix);
  hgt = mix(hgt, cobbleD, roadMask);
  // fine detail fades out with distance: far away it only shimmers, and the bump derivatives turn into 2x2 blocks
  float viewDist = length(vViewPosition);
  gHeight = hgt * (1.0 - smoothstep(16.0, 60.0, viewDist));
  float near = 1.0 - smoothstep(35.0, 120.0, viewDist);
  float contrast = mix(mix(0.3, 0.4, shore), 0.85, rockMix) * near;
  c *= mix(1.0 - contrast * 0.5, 1.0 + contrast * 0.5, hgt);

  // soft foam where the water meets the shore
  float wave = 0.09 + 0.07 * sin(uTime * 1.4 + p.x * 0.6 + p.y * 0.45 + dB.g * 6.0);
  float foam = smoothstep(0.22, 0.0, abs(h - uWater - wave)) * smoothstep(0.35, 0.6, texture2D(uDetail, p * 0.31 + vec2(uTime * 0.02, uTime * 0.013)).b);
  c = mix(c, vec3(0.96, 0.98, 1.0), foam * 0.75 * (1.0 - rockMix));
  diffuseColor.rgb = c;
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  vec3 sigX = dFdx(-vViewPosition);
  vec3 sigY = dFdy(-vViewPosition);
  vec3 r1 = cross(sigY, normal);
  vec3 r2 = cross(normal, sigX);
  float det = dot(sigX, r1);
  vec3 grad = sign(det) * (dFdx(gHeight) * r1 + dFdy(gHeight) * r2);
  normal = normalize(abs(det) * normal - uBump * grad);
}`,
      );
  };
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // water
  const waterNormal = waterNormalTexture();
  waterNormal.repeat.set((HX * 2) / 5.9, (HZ * 2) / 5.9);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f8d9a, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.8, normalMap: waterNormal, normalScale: new THREE.Vector2(0.55, 0.55), depthWrite: false });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER;
  water.receiveShadow = true;
  water.renderOrder = -5; // drawn before the mascots so they are never tinted by the water in front of them
  scene.add(water);

  // ------------------------------------------------------------------------------------------ sky and light
  const SKY_R = 450;
  const skyGeo = new THREE.SphereGeometry(SKY_R, 32, 20);
  const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.userData.noAO = true;
  scene.add(sky);
  // the sun itself: a warm glow in the sky that the bloom pass turns into a soft halo
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  {
    const g = glowCanvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,250,225,1)');
    grad.addColorStop(0.18, 'rgba(255,236,170,0.85)');
    grad.addColorStop(0.5, 'rgba(255,205,120,0.25)');
    grad.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: 0xfff0c8 }));
  sunGlow.scale.set(150, 150, 1);
  scene.add(sunGlow);
  const ridgeCanvas = document.createElement('canvas');
  ridgeCanvas.width = 2048;
  ridgeCanvas.height = 128;
  {
    const g = ridgeCanvas.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(0, 128);
    for (let x = 0; x <= 2048; x += 4) {
      const a = (x / 2048) * Math.PI * 2;
      const v = 0.42 + 0.17 * Math.sin(3 * a + 1) + 0.12 * Math.sin(7 * a + 2) + 0.08 * Math.sin(13 * a + 0.5) + 0.05 * Math.sin(29 * a);
      g.lineTo(x, 128 * (1 - v));
    }
    g.lineTo(2048, 128);
    g.closePath();
    g.fill();
  }
  const ridgeTex = new THREE.CanvasTexture(ridgeCanvas);
  ridgeTex.wrapS = THREE.RepeatWrapping;
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(405, 405, 70, 96, 1, true), new THREE.MeshBasicMaterial({ map: ridgeTex, transparent: true, opacity: 0.7, side: THREE.BackSide, fog: false, depthWrite: false, color: 0xb9cde0 }));
  ridge.position.y = 25;
  ridge.renderOrder = -8;
  ridge.userData.noAO = true;
  scene.add(ridge);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a5a3a, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(-0.55, 0.78, 0.38).normalize();
  scene.fog = new THREE.Fog(0xcfe3f2, 80, 260);

  const clouds = [];
  const cloudTex = cloudTexture();
  const rnd = mulberry(seed * 31);
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
    s.position.set((rnd() - 0.5) * 840, 110 + rnd() * 70, (rnd() - 0.5) * 700);
    s.scale.set(120 + rnd() * 90, 60 + rnd() * 30, 1);
    scene.add(s);
    clouds.push(s);
  }

  // an optional starfield on the sky (night, or always for worlds in space)
  let stars = null;
  if (theme.stars) {
    const count = theme.stars.count || 700;
    const pos = new Float32Array(count * 3);
    const rs = mulberry(seed * 977);
    for (let i = 0; i < count; i++) {
      const u = rs() * 2 - 1;
      const a = rs() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * r * 430;
      pos[i * 3 + 1] = Math.abs(u) * 430 * 0.95 + 20;
      pos[i * 3 + 2] = Math.sin(a) * r * 430;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    stars.frustumCulled = false;
    stars.renderOrder = -9;
    stars.userData.noAO = true;
    scene.add(stars);
  }

  const glowMaterials = [];
  const PALETTES = {
    day: { sky: [0x2f6fc4, 0xd7e6f4], fog: 0xd2e2f0, sun: 0xfff0cf, sunI: 2.9, hemi: 0.35, env: 0.75, glow: 0.0, water: 0x2f8d9a, cloud: 0.8, exposure: 1.12, ridge: 0xb4c9de, ...(theme.sky?.day || {}) },
    night: { sky: [0x030816, 0x1b2b57], fog: 0x15213f, sun: 0x8ca8ff, sunI: 0.8, hemi: 0.22, env: 0.3, glow: 3.2, water: 0x16445c, cloud: 0.18, exposure: 1.25, ridge: 0x0f1b3a, ...(theme.sky?.night || {}) },
  };
  function applyMode(mode) {
    const p = PALETTES[mode];
    const top = new THREE.Color(p.sky[0]);
    const bottom = new THREE.Color(p.sky[1]);
    const a = skyGeo.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < a.count; i++) {
      c.copy(bottom).lerp(top, smooth(-0.05, 0.85, a.getY(i) / SKY_R));
      skyColors[i * 3] = c.r;
      skyColors[i * 3 + 1] = c.g;
      skyColors[i * 3 + 2] = c.b;
    }
    skyGeo.attributes.color.needsUpdate = true;
    scene.fog.color.setHex(p.fog);
    ridge.material.color.setHex(p.ridge);
    if (stars) stars.visible = theme.stars.when === 'always' || mode === 'night';
    sun.color.setHex(p.sun);
    sun.intensity = p.sunI;
    hemi.intensity = p.hemi;
    waterMat.color.setHex(p.water);
    renderer.toneMappingExposure = p.exposure;
    for (const m of glowMaterials) m.emissiveIntensity = p.glow;
    routeMat.emissiveIntensity = mode === 'night' ? 1.1 : 0.55;
    hintEl.style.opacity = mode === 'night' ? '0.8' : '1';
    for (const s of clouds) {
      s.userData.base = p.cloud;
      s.material.opacity = p.cloud;
    }
    sunGlow.visible = mode === 'day';
    scene.environmentIntensity = p.env;
    updateEnvironment(p);
    post?.setNight(mode === 'night');
    state.mode = mode;
    state.dirty = true;
  }

  // Image-based light: the sky itself, baked once per time of day, lights and reflects off every PBR surface.
  let envTarget = null;
  function updateEnvironment(p) {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    if (p === PALETTES.day) {
      const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0c8, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sunSprite.scale.set(260, 260, 1);
      sunSprite.position.copy(SUN_DIR).multiplyScalar(SKY_R * 0.9);
      envScene.add(sunSprite);
    }
    const next = pmrem.fromScene(envScene, 0.02, 1, 600, { size: 128 });
    scene.environment = next.texture;
    envTarget?.dispose();
    envTarget = next;
  }

  // ------------------------------------------------------------------------------------------ placement
  const models = makeModels(theme, KITS[theme.kit] || KITS.citadel);
  // Diffuse-only shading (Lambert): the models are matte, and the specular terms of a PBR material cost a lot per pixel.
  const vcMat = ({ roughness, metalness, ...extra } = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...extra });
  const windUniforms = { uTime: { value: 0 } };
  // Plants lean with a slow wind: stronger the higher a vertex sits on the model.
  function windMat({ amount = 1, lo = 0.6, hi = 6.5, ...extra } = {}) {
    const m = vcMat(extra);
    // lo and hi are written into the shader text, so they must be part of the program's cache key
    m.customProgramCacheKey = () => 'wind:' + lo + ':' + hi;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.uniforms.uSway = { value: amount };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec2 iw = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
#else
  vec2 iw = vec2(0.0);
#endif
float sw = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, position.y) * uSway;
transformed.x += sin(uTime * 1.5 + iw.x * 0.37 + iw.y * 0.21) * 0.2 * sw;
transformed.z += cos(uTime * 1.2 + iw.y * 0.31 + iw.x * 0.17) * 0.15 * sw;`,
        );
    };
    return m;
  }
  const rand = mulberry(seed * 7919);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const tint = new THREE.Color();

  const groundY = (x, z) => heightAt(x, z);
  const bridgeY = WATER + 0.55;
  // Road height: on the ground, lifted onto a bridge where the road crosses water.
  const roadY = (x, z) => Math.max(groundY(x, z), bridgeY);
  const underwater = (x, z) => groundY(x, z) < WATER + 0.25;
  const cellPoint = (cell) => {
    const p = path[clamp(Math.round(cell), 0, path.length - 1)];
    return new THREE.Vector3(p.x, roadY(p.x, p.y), p.y);
  };
  const slopeAt = (x, z) => Math.hypot(groundY(x + 1.2, z) - groundY(x - 1.2, z), groundY(x, z + 1.2) - groundY(x, z - 1.2)) / 2.4;

  function instanced(geometry, material, count, castShadow = true) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }
  function place(mesh, index, x, y, z, rotY, sx, sy = sx, sz = sx, tintValue = 1) {
    eul.set(0, rotY, 0);
    q.setFromEuler(eul);
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
    mesh.setMatrixAt(index, m4);
    tint.setRGB(tintValue, tintValue, tintValue);
    mesh.setColorAt(index, tint);
  }

  // trees, grouped in forests by a noise mask, thinner near the road
  const treeKinds = theme.trees;
  const MAX_TREES = 1500;
  const treeMeshes = {};
  const treeCounts = {};
  for (const [kind] of treeKinds) {
    // stiff things (crystals, haystacks, cube trees, hedges) do not sway in the wind
    treeMeshes[kind] = instanced(models[kind], windMat({ amount: RIGID_KINDS.has(kind) ? 0 : kind === 'bamboo' ? 1.5 : 1 }), MAX_TREES);
    treeCounts[kind] = 0;
  }
  const pickTree = () => {
    let r = rand();
    for (const [kind, w] of treeKinds) if ((r -= w) <= 0) return kind;
    return treeKinds[0][0];
  };
  let placedTrees = 0;
  for (let tries = 0; placedTrees < MAX_TREES && tries < MAX_TREES * 14; tries++) {
    const x = (rand() - 0.5) * WIDTH * 2.1;
    const z = (rand() - 0.5) * DEPTH * 2.1;
    const inside = Math.abs(x) < WIDTH / 2 && Math.abs(z) < DEPTH / 2;
    const forest = smooth(0.46, 0.66, fbm(x * 0.06 + 5, z * 0.06 + 5, seed + 9));
    if (rand() > (inside ? 0.07 + forest * 0.62 : 0.14 + forest * 0.6) * dens.trees) continue;
    const dRoad = distanceToPath(x, z, path);
    if (dRoad < (inside ? 4.2 : 3)) continue;
    if (rand() > 0.3 + 0.7 * (1 - smooth(25, 85, dRoad))) continue;
    const y = groundY(x, z);
    if (y < WATER + 0.9 || y > 22 || slopeAt(x, z) > 0.75) continue;
    const kind = pickTree();
    const s = 0.5 + rand() * 0.5;
    // hedges lie along the axes, so a crowd of them reads as the walls of a maze
    const turn = kind === 'hedge' ? Math.round(rand()) * (Math.PI / 2) : rand() * Math.PI * 2;
    place(treeMeshes[kind], treeCounts[kind]++, x, y - 0.1, z, turn, s, s * (0.9 + rand() * 0.3), s, 0.82 + rand() * 0.36);
    placedTrees++;
  }
  for (let tries = 0, extra = 0; extra < 160 && placedTrees < MAX_TREES && tries < 9000; tries++) {
    const x = (rand() - 0.5) * 560;
    const z = (rand() - 0.5) * 400;
    if (Math.abs(x) < WIDTH * 0.52 && Math.abs(z) < DEPTH * 0.52) continue; // the play area has its own loop above
    const forest = smooth(0.44, 0.64, fbm(x * 0.03 + 5, z * 0.03 + 5, seed + 9));
    if (rand() > 0.1 + forest * 0.8) continue;
    const y = groundY(x, z);
    if (y < WATER + 1 || y > 24 || slopeAt(x, z) > 0.7) continue;
    const kind = pickTree();
    const s = 0.8 + rand() * 0.9; // larger, so they still read from far away
    place(treeMeshes[kind], treeCounts[kind]++, x, y - 0.1, z, rand() * Math.PI * 2, s, s * (0.9 + rand() * 0.3), s, 0.82 + rand() * 0.36);
    placedTrees++;
    extra++;
  }
  for (const [kind] of treeKinds) {
    treeMeshes[kind].count = treeCounts[kind];
    treeMeshes[kind].instanceMatrix.needsUpdate = true;
    if (treeMeshes[kind].instanceColor) treeMeshes[kind].instanceColor.needsUpdate = true;
    scene.add(treeMeshes[kind]);
  }

  // rocks
  const rocks = instanced(models.rock, vcMat({ flatShading: true }), 240);
  let rockCount = 0;
  for (let tries = 0; rockCount < 240 && tries < 5000; tries++) {
    const x = (rand() - 0.5) * WIDTH * 1.9;
    const z = (rand() - 0.5) * DEPTH * 1.9;
    if (distanceToPath(x, z, path) < 3.2 || underwater(x, z) || groundY(x, z) > 9) continue;
    const nearWater = Math.abs(groundY(x, z) - WATER) < 1.8;
    if ((!nearWater && rand() < 0.55) || rand() > dens.rocks) continue;
    const s = 0.4 + rand() * 1.2;
    place(rocks, rockCount++, x, groundY(x, z), z, rand() * 6, s, s * (0.7 + rand() * 0.6), s, 0.8 + rand() * 0.35);
  }
  rocks.count = rockCount;
  scene.add(rocks);

  // grass tufts and meadow flowers: they make the ground read as a field instead of a painted sheet
  const MAX_TUFTS = 9000;
  const tufts = instanced(models.tuft, windMat({ amount: 1.7, lo: 0.0, hi: 1.1, side: THREE.DoubleSide, emissive: 0x2b5a1c, emissiveIntensity: 0.3 }), MAX_TUFTS, false);
  let tuftCount = 0;
  for (let tries = 0; tuftCount < MAX_TUFTS && tries < MAX_TUFTS * 8; tries++) {
    const x = (rand() - 0.5) * (WIDTH + 24);
    const z = (rand() - 0.5) * (DEPTH + 16);
    const meadow = fbm(x * 0.09 + 3, z * 0.09 + 3, seed + 21);
    if (rand() > (0.22 + smooth(0.38, 0.62, meadow) * 0.78) * dens.grass) continue;
    const y = groundY(x, z);
    if (y < WATER + 0.7 || y > 11 || slopeAt(x, z) > 0.5) continue;
    const dTuft = distanceToPath(x, z, path);
    if (dTuft < 2.4) continue;
    if (rand() > 0.25 + 0.75 * (1 - smooth(18, 65, dTuft))) continue;
    const sc = 0.8 + rand() * 0.9;
    place(tufts, tuftCount++, x, y - 0.02, z, rand() * 6.28, sc, sc * (0.8 + rand() * 0.6), sc, 0.8 + rand() * 0.45);
  }
  tufts.count = tuftCount;
  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  scene.add(tufts);

  const MAX_FLOWERS = 1100;
  const flowers = instanced(models.flower, windMat({ amount: 1.2, lo: 0.0, hi: 0.6, side: THREE.DoubleSide, roughness: 0.7 }), MAX_FLOWERS, false);
  const petalColors = [0xffffff, 0xffd1e3, 0xffe36b, 0xd2b4ff, 0xff9aa8].map((hex) => new THREE.Color(hex));
  let flowerCount = 0;
  for (let tries = 0; flowerCount < MAX_FLOWERS && tries < MAX_FLOWERS * 20; tries++) {
    const x = (rand() - 0.5) * WIDTH;
    const z = (rand() - 0.5) * DEPTH;
    if (rand() > smooth(0.52, 0.7, fbm(x * 0.12 + 9, z * 0.12 + 9, seed + 33)) * dens.flowers) continue;
    const y = groundY(x, z);
    if (y < WATER + 0.8 || y > 9 || slopeAt(x, z) > 0.4 || distanceToPath(x, z, path) < 2.6) continue;
    const sc = 0.9 + rand() * 0.7;
    place(flowers, flowerCount, x, y, z, rand() * 6.28, sc);
    flowers.setColorAt(flowerCount, petalColors[Math.floor(rand() * petalColors.length)]);
    flowerCount++;
  }
  flowers.count = flowerCount;
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  scene.add(flowers);

  // houses: small hamlets beside the road, facing it
  const houses = instanced(models.house, vcMat({ side: THREE.DoubleSide }), 80);
  let houseCount = 0;
  const hamlets = [];
  for (let tries = 0; hamlets.length < Math.round(12 * dens.houses) && tries < 1200; tries++) {
    const x = (rand() - 0.5) * WIDTH * 0.92;
    const z = (rand() - 0.5) * DEPTH * 0.92;
    const d = distanceToPath(x, z, path);
    if (d < 8 || d > 15 || underwater(x, z) || slopeAt(x, z) > 0.3) continue;
    if (hamlets.some((h) => Math.hypot(h.x - x, h.z - z) < 26)) continue;
    hamlets.push({ x, z });
  }
  for (const h of hamlets) {
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const x = h.x + (rand() - 0.5) * 11;
      const z = h.z + (rand() - 0.5) * 9;
      if (distanceToPath(x, z, path) < 5 || underwater(x, z) || slopeAt(x, z) > 0.35 || houseCount >= 80) continue;
      let bestD = Infinity;
      let toward = 0;
      for (const p of path) {
        const dd = Math.hypot(p.x - x, p.y - z);
        if (dd < bestD) {
          bestD = dd;
          toward = Math.atan2(p.x - x, p.y - z);
        }
      }
      const s = 0.9 + rand() * 0.3;
      place(houses, houseCount++, x, groundY(x, z), z, toward + (rand() - 0.5) * 0.3, s, s, s, 0.92 + rand() * 0.16);
    }
  }
  houses.count = houseCount;
  scene.add(houses);

  // a faint golden guide along the whole road, readable from far away
  const routeMat = new THREE.MeshStandardMaterial({ color: theme.guide?.color ?? 0xffd36a, emissive: theme.guide?.emissive ?? 0xffb43a, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, opacity: 0.6, depthWrite: false });
  {
    const guide = new THREE.CatmullRomCurve3(path.map((_, i) => { const v = cellPoint(i); return new THREE.Vector3(v.x, v.y + 0.3, v.z); }), false, 'centripetal', 0.5);
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(guide, 260, 0.12, 6, false), routeMat);
    ribbon.userData.noAO = true;
    ribbon.renderOrder = 2;
    scene.add(ribbon);
  }

  // road cells and lanterns
  const pads = instanced(models.pad, vcMat(), path.length, false);
  const checks = instanced(models.padCheck, vcMat(), GATES.length, false);
  let padCount = 0;
  let checkCount = 0;
  for (let i = 0; i < path.length; i++) {
    const p = cellPoint(i);
    if (GATES.includes(i)) place(checks, checkCount++, p.x, p.y, p.z, 0, 1);
    else place(pads, padCount++, p.x, p.y, p.z, 0, 1);
  }
  pads.count = padCount;
  checks.count = checkCount;
  scene.add(pads, checks);

  const lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: theme.glow?.lamp ?? 0xff7a3a, emissiveIntensity: 0 });
  glowMaterials.push(lampMat);
  const lampPosts = instanced(models.lampPost, vcMat(), 40);
  const lampLights = instanced(models.lampLight, lampMat, 40, false);
  let lampCount = 0;
  for (let i = 2; i < path.length - 1 && lampCount < 40; i += 2) {
    if (GATES.includes(i) || GATES.includes(i - 1) || GATES.includes(i + 1)) continue;
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len = Math.hypot(dx, dz) || 1;
    const side = (i / 2) % 2 ? 1 : -1;
    const x = a.x + (-dz / len) * 2.2 * side;
    const z = a.y + (dx / len) * 2.2 * side;
    if (underwater(x, z)) continue;
    const y = groundY(x, z);
    place(lampPosts, lampCount, x, y, z, 0, 1);
    place(lampLights, lampCount, x, y, z, 0, 1);
    lampCount++;
  }
  lampPosts.count = lampLights.count = lampCount;
  scene.add(lampPosts, lampLights);

  // gates: an arch on the road, a tower beside it, flanking walls and a plaque with the gate number
  const gateGroups = [];
  const archMat = vcMat({ side: THREE.DoubleSide });
  const gateGlow = new THREE.MeshStandardMaterial({ color: theme.glow?.gateColor ?? 0xffd98a, emissive: theme.glow?.gate ?? 0xffb64a, emissiveIntensity: 0, roughness: 0.4 });
  glowMaterials.push(gateGlow);
  const plaques = [];
  GATES.forEach((cell, index) => {
    const g = new THREE.Group();
    const p = cellPoint(cell);
    const a = path[clamp(cell, 0, path.length - 2)];
    const b = path[clamp(cell + 1, 1, path.length - 1)];
    const yaw = Math.atan2(b.x - a.x, b.y - a.y);
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const last = index === GATES.length - 1;
    const scale = last ? 1.18 : 1;
    const arch = new THREE.Mesh(models.arch, archMat);
    arch.castShadow = arch.receiveShadow = true;
    arch.rotation.y = yaw;
    arch.scale.setScalar(scale);
    g.add(arch);
    const tw = new THREE.Mesh(models.tower, archMat);
    tw.castShadow = tw.receiveShadow = true;
    const towerSide = index % 2 ? -1 : 1;
    const toff = side.clone().multiplyScalar(towerSide * 9.5 * scale);
    tw.position.set(toff.x, groundY(p.x + toff.x, p.z + toff.z) - p.y + 0.05, toff.z);
    tw.rotation.y = yaw;
    tw.scale.setScalar(last ? 1.35 : 0.9);
    g.add(tw);
    for (const s of [-1, 1]) {
      const wl = new THREE.Mesh(models.wall, archMat);
      wl.castShadow = wl.receiveShadow = true;
      const woff = side.clone().multiplyScalar(s * 6.4 * scale);
      wl.position.set(woff.x, groundY(p.x + woff.x, p.z + woff.z) - p.y, woff.z);
      wl.rotation.y = yaw;
      g.add(wl);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), gateGlow);
    orb.position.set(0, 5.9 * scale, 0);
    g.add(orb);
    const plaque = new THREE.Object3D();
    plaque.position.set(0, 7.6 * scale, 0);
    g.add(plaque);
    plaques.push({ anchor: plaque, el: makeLabel('gate', String(index + 1).padStart(2, '0'), places[index] || 'Cổng ' + (index + 1)) });
    g.position.copy(p);
    scene.add(g);
    gateGroups.push(g);
  });

  // bridges where the road crosses water, and the ferry pier at the first gate
  const woodMat = vcMat({ roughness: 0.85 });
  let bridgeCount = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    let wet = false;
    for (let k = 0; k <= 6; k++) if (underwater(lerp(a.x, b.x, k / 6), lerp(a.y, b.y, k / 6))) wet = true;
    if (!wet) continue;
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len = Math.hypot(dx, dz);
    const posts = Math.max(2, Math.round(len / 2.2));
    const deck = buildGeometry([
      { geo: box(3.4, 0.28, len + 1.2), color: 0x8a6238 },
      { geo: box(0.2, 0.9, len + 1.2), pos: [-1.6, 0.55, 0], color: theme.pillar },
      { geo: box(0.2, 0.9, len + 1.2), pos: [1.6, 0.55, 0], color: theme.pillar },
      ...Array.from({ length: posts }, (_, k) => ({ geo: cyl(0.14, 0.14, 4, 5), pos: [k % 2 ? -1.6 : 1.6, -1.6, (k / (posts - 1) - 0.5) * len], color: 0x5b3b22 })),
    ]);
    const mesh = new THREE.Mesh(deck, woodMat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.bridge = true;
    mesh.position.set((a.x + b.x) / 2, bridgeY, (a.y + b.y) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    scene.add(mesh);
    bridgeCount++;
  }
  if (lifeCfg.boat && lakes.length) {
    const start = path[0];
    const toward = new THREE.Vector2(lakes[0].x - start.x, lakes[0].z - start.y).normalize();
    const pierLen = 18;
    const yaw = Math.atan2(toward.x, toward.y);
    const pier = new THREE.Mesh(
      buildGeometry([
        { geo: box(3, 0.22, pierLen), color: 0x93673a },
        ...Array.from({ length: 6 }, (_, k) => ({ geo: cyl(0.16, 0.16, 3.2, 5), pos: [k % 2 ? -1.4 : 1.4, -1.3, (Math.floor(k / 2) / 2 - 0.5) * pierLen * 0.8], color: 0x5b3b22 })),
      ]),
      woodMat,
    );
    pier.castShadow = pier.receiveShadow = true;
    pier.position.set(start.x + toward.x * pierLen * 0.5, WATER + 0.6, start.y + toward.y * pierLen * 0.5);
    pier.rotation.y = yaw;
    scene.add(pier);
    const boat = new THREE.Mesh(
      buildGeometry([
        { geo: box(1.7, 0.55, 4.6), pos: [0, 0.15, 0], color: 0x6f4a2a },
        { geo: cone(0.85, 1.4, 4), pos: [0, 0.15, 2.8], rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1, 1, 0.55], color: 0x6f4a2a },
        { geo: cyl(0.8, 0.8, 1.6, 8, 1, false, 0, Math.PI), pos: [0, 0.95, -0.2], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.6], color: 0xcdb27a },
        { geo: cyl(0.05, 0.05, 3, 5), pos: [0, 2, 1.4], color: 0x3a2a1c },
        { geo: box(0.05, 1.4, 1.0), pos: [0, 2.4, 1.9], color: 0xe9dfc8 },
      ]),
      woodMat,
    );
    boat.castShadow = true;
    boat.position.set(start.x + toward.x * (pierLen + 4), WATER + 0.1, start.y + toward.y * (pierLen + 4) + 3);
    boat.rotation.y = yaw + 0.8;
    scene.add(boat);
    state.boat = boat;
  }

  // ------------------------------------------------------------------------------------------ life
  // A little life on the map: petals in the day, fireflies and floating lanterns at night, a sailing boat, birds
  // over the mountains and villagers in straw hats walking the road. All of it is cheap and only drawn, never
  // part of the game state.
  const life = { time: 0 };
  const riverLen = [0];
  for (let i = 1; i < riverPts.length; i++) riverLen.push(riverLen[i - 1] + riverPts[i].distanceTo(riverPts[i - 1]));
  const riverTotal = riverLen[riverLen.length - 1];
  const riverAt = (u) => {
    let i = 1;
    while (i < riverLen.length - 1 && riverLen[i] < u) i++;
    const a = riverPts[i - 1];
    const b = riverPts[i];
    const t = clamp((u - riverLen[i - 1]) / (riverLen[i] - riverLen[i - 1] || 1), 0, 1);
    return { x: lerp(a.x, b.x, t), z: lerp(a.y, b.y, t), dx: b.x - a.x, dz: b.y - a.y };
  };

  // drifting particles that always surround the point we look at
  function makeDrift(count, map, color, size, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ map, color, size, sizeAttenuation: true, transparent: true, depthWrite: false, vertexColors: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.userData.noAO = true;
    scene.add(points);
    return { points, geo, pos, col, seeds, count };
  }
  const petalCanvas = document.createElement('canvas');
  petalCanvas.width = petalCanvas.height = 32;
  {
    const g = petalCanvas.getContext('2d');
    g.translate(16, 16);
    g.rotate(-0.6);
    g.fillStyle = '#ffd3e2';
    g.beginPath();
    g.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffb3cc';
    g.beginPath();
    g.ellipse(3, 0, 6, 3.4, 0, 0, Math.PI * 2);
    g.fill();
  }
  const petalTex = new THREE.CanvasTexture(petalCanvas);
  petalTex.colorSpace = THREE.SRGBColorSpace;
  life.petals = makeDrift(140, petalTex, lifeCfg.petals ?? 0xffffff, 0.62, false);
  life.petals.points.visible = false;
  life.flies = makeDrift(110, glowTex, 0xcfff7a, 1.15, true);
  life.flies.points.visible = false;
  life.lanterns = makeDrift(16, glowTex, 0xffa63a, 2.1, true);
  life.lanterns.points.visible = false;

  // a sampan drifting down the river; it slips out of sight when it passes under a bridge
  const bridgeSpots = [];
  scene.traverse((o) => {
    if (o.userData.bridge) bridgeSpots.push(o.position);
  });
  life.sampan = new THREE.Mesh(
    buildGeometry([
      { geo: box(1.3, 0.34, 3.4), pos: [0, 0.1, 0], color: 0x7a5230 },
      { geo: cone(0.65, 1.1, 4), pos: [0, 0.1, 2.2], rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1, 1, 0.55], color: 0x7a5230 },
      { geo: box(0.5, 0.3, 0.8), pos: [0, 0.4, -0.7], color: 0xcdb27a },
    ]),
    woodMat,
  );
  life.sampan.castShadow = true;
  life.sampan.visible = lifeCfg.boat;
  scene.add(life.sampan);

  // birds: two triangles each, wings flapping
  life.birds = [];
  for (let i = 0; lifeCfg.birds && i < 7; i++) {
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([0, 0, 0.45, -1.4, 0, -0.1, 0, 0, -0.45, 0, 0, 0.45, 1.4, 0, -0.1, 0, 0, -0.45]);
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const bird = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2b2f3a, side: THREE.DoubleSide }));
    bird.userData = { noAO: true, phase: rand() * 6.28, radius: 38 + rand() * 40, height: 26 + rand() * 18, speed: (0.07 + rand() * 0.05) * (i % 2 ? 1 : -1), angle: rand() * 6.28, cx: (rand() - 0.5) * 50, cz: (rand() - 0.5) * 20 };
    bird.scale.setScalar(1.7);
    bird.castShadow = false;
    scene.add(bird);
    life.birds.push(bird);
  }

  // villagers in conical straw hats, walking up and down the road
  const robes = [0x8a3a2e, 0x2f5d7a, 0x6b7a2f, 0x8a6a3a, 0x5a3f7a, 0x2f6a5a, 0x9a5a2a];
  life.walkers = (lifeCfg.walkers ? robes : []).map((robe, i) => {
    const geometry = models.walker ? models.walker(robe) : buildGeometry([
      { geo: cyl(0.26, 0.38, 1.15, 7), pos: [0, 0.72, 0], color: robe, grad: [0.75, 1.1, 0.15, 1.3] },
      { geo: new THREE.SphereGeometry(0.23, 8, 6), pos: [0, 1.5, 0], color: 0xe3b98f },
      { geo: cone(0.55, 0.36, 10), pos: [0, 1.82, 0], color: 0xd9b86a, grad: [0.85, 1.15, 1.6, 2.0] },
      { geo: box(0.1, 0.4, 0.1), pos: [-0.12, 0.2, 0], color: 0x3a2a1c },
      { geo: box(0.1, 0.4, 0.1), pos: [0.12, 0.2, 0], color: 0x3a2a1c },
    ]);
    const mesh = new THREE.Mesh(geometry, vcMat());
    mesh.castShadow = true;
    mesh.scale.setScalar(1.25);
    scene.add(mesh);
    return { mesh, cell: 2 + ((i * 4.3) % 28), dir: i % 2 ? 1 : -1, speed: 0.22 + (i % 3) * 0.05, side: i % 2 ? 1.5 : -1.5, phase: i * 1.7 };
  });

  function updateLife(now, dt) {
    life.time = now / 1000;
    const night = state.mode === 'night';
    const target = orbit.shown.target;
    const t = life.time;
    // petals (day) fall and sway inside a box around the view; fireflies (night) wander and blink
    const drift = (d, fall, spreadX, spreadY, flicker) => {
      for (let i = 0; i < d.count; i++) {
        const a = d.seeds[i * 3];
        const b = d.seeds[i * 3 + 1];
        const c = d.seeds[i * 3 + 2];
        const px = ((a * 60 + (flicker ? Math.sin(t * 0.4 + c * 9) * 3 : t * 0.9 * (0.5 + b) + Math.sin(t * 0.7 + c * 8) * 2)) % 60 + 60) % 60 - 30;
        const py = ((b * 26 - t * fall * (0.6 + c * 0.8)) % 26 + 26) % 26;
        const pz = ((c * 60 + (flicker ? Math.cos(t * 0.35 + a * 7) * 3 : Math.cos(t * 0.6 + a * 6) * 2)) % 60 + 60) % 60 - 30;
        d.pos[i * 3] = target.x + px * spreadX;
        d.pos[i * 3 + 1] = target.y + (flicker ? 0.5 + py * spreadY * 0.3 : py * spreadY - 2);
        d.pos[i * 3 + 2] = target.z + pz * spreadX;
        if (flicker) {
          const k = 0.45 + 0.55 * Math.sin(t * (1.5 + a * 2.5) + c * 20);
          d.col[i * 3] = d.col[i * 3 + 1] = d.col[i * 3 + 2] = Math.max(0.05, k);
        }
      }
      d.geo.attributes.position.needsUpdate = true;
      if (flicker) d.geo.attributes.color.needsUpdate = true;
    };
    life.petals.points.visible = !night && lifeCfg.petals !== null;
    life.flies.points.visible = night;
    life.lanterns.points.visible = night && lifeCfg.lanterns;
    if (!night) {
      if (lifeCfg.petals !== null) drift(life.petals, 0.9, 1, 1, false);
    } else {
      drift(life.flies, 0, 1, 1, true);
      for (let i = 0; lifeCfg.lanterns && i < life.lanterns.count; i++) {
        const u = (((i / life.lanterns.count) * riverTotal + t * 1.4) % riverTotal + riverTotal) % riverTotal;
        const r = riverAt(u);
        const side = Math.sin(i * 12.9898) * 1.6;
        life.lanterns.pos[i * 3] = r.x + side;
        life.lanterns.pos[i * 3 + 1] = WATER + 0.25 + Math.sin(t * 1.3 + i) * 0.05;
        life.lanterns.pos[i * 3 + 2] = r.z;
      }
      life.lanterns.geo.attributes.position.needsUpdate = true;
    }

    // sampan
    if (lifeCfg.boat) {
      const u = (t * 2.0 + 6) % riverTotal;
      const r = riverAt(u);
      life.sampan.position.set(r.x, WATER + 0.12 + Math.sin(t * 1.1) * 0.04, r.z);
      life.sampan.rotation.y = Math.atan2(r.dx, r.dz);
      life.sampan.rotation.z = Math.sin(t * 0.9) * 0.03;
      life.sampan.visible = !bridgeSpots.some((p) => Math.hypot(p.x - r.x, p.z - r.z) < 5.5);
    }
    // birds
    if (!night) {
      for (const bird of life.birds) {
        const d = bird.userData;
        d.angle += d.speed * dt;
        bird.position.set(d.cx + Math.cos(d.angle) * d.radius, d.height + Math.sin(t * 0.5 + d.phase) * 1.5, d.cz + Math.sin(d.angle) * d.radius * 0.6);
        const heading = Math.sign(d.speed);
        bird.rotation.y = Math.atan2(-Math.sin(d.angle) * d.radius * heading, Math.cos(d.angle) * d.radius * 0.6 * heading);
        const flap = Math.sin(t * 8 + d.phase) * 0.7;
        const p = bird.geometry.attributes.position;
        p.setY(1, flap);
        p.setY(4, flap);
        p.needsUpdate = true;
      }
    }
    for (const bird of life.birds) bird.visible = !night && orbit.shown.dist < 75;
    // villagers
    for (const w of life.walkers) {
      w.cell += w.dir * w.speed * dt;
      if (w.cell > path.length - 3) w.dir = -1;
      if (w.cell < 2) w.dir = 1;
      const lo = Math.floor(w.cell);
      const a = cellPoint(lo);
      const b = cellPoint(lo + 1);
      const f = w.cell - lo;
      const px = lerp(a.x, b.x, f);
      const pz = lerp(a.z, b.z, f);
      const dx = (b.x - a.x) * w.dir;
      const dz = (b.z - a.z) * w.dir;
      const len = Math.hypot(dx, dz) || 1;
      w.mesh.position.set(px + (-dz / len) * w.side, lerp(a.y, b.y, f) + Math.abs(Math.sin(t * 5 + w.phase)) * 0.1, pz + (dx / len) * w.side);
      w.mesh.rotation.y = Math.atan2(dx, dz);
      w.mesh.rotation.z = Math.sin(t * 5 + w.phase) * 0.05;
    }
  }

  // ------------------------------------------------------------------------------------------ mascots
  // ------------------------------------------------------------------------------------------ mascots (HTML, see makeMascot)
  const peers = new Map();

  // One shadow shape for everybody (a pupil only scales it).
  const shadowGeo = new THREE.CircleGeometry(1, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const crowdStats = { full: 0, chips: 0, hidden: 0 };

  // Where a mascot stands: on the road at `along` (a fractional cell index), moved sideways by off.u and along the road
  // by off.v so that pupils on the same cell form a loose crowd instead of one pile.
  function standAt(entry, along) {
    const last = path.length - 1;
    const at = clamp(along, 0, last);
    const lo = Math.min(last - 1, Math.floor(at));
    const f = at - lo;
    const a = path[lo];
    const b = path[lo + 1];
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const len = Math.hypot(dx, dz) || 1;
    const tx = dx / len;
    const tz = dz / len;
    const x = lerp(a.x, b.x, f) - tz * entry.off.u + tx * entry.off.v;
    const z = lerp(a.y, b.y, f) + tx * entry.off.u + tz * entry.off.v;
    entry.group.position.set(x, roadY(x, z), z);
  }

  function makePeer(peer) {
    const index = Number(peer.mascot) || 0;
    const own = peer.id === model.own;
    const size = own ? 7.5 : 5.2;
    const group = new THREE.Group();
    const mascotEl = makeMascot(index);
    let arrowEl = null;
    if (own) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 36), new THREE.MeshBasicMaterial({ color: 0xf6d481, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      group.add(ring);
      group.userData.ring = ring;
      // a small gold arrow above the head: finds the mascot without covering its face
      arrowEl = makeArrow();
    }
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.scale.setScalar(own ? 1.5 : 1.1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    shadow.userData.shared = true;
    group.add(shadow);
    // the name sits under the feet so it never hides the face the pupil chose
    const labelEl = peer.name ? makeLabel(own ? 'own' : 'peer', peer.name) : null;
    scene.add(group);
    const entry = { group, mascotEl, arrowEl, labelEl, px: 0, lod: 'full', size, own, cell: peer.position, walkFrom: peer.position, walkTo: peer.position, walkT: 1, hop: 0, mascot: peer.mascot, name: peer.name, slot: { u: 0, v: 0 }, off: { u: 0, v: 0 }, fresh: true };
    standAt(entry, peer.position);
    return entry;
  }
  function disposePeer(entry) {
    scene.remove(entry.group);
    entry.mascotEl.remove();
    entry.arrowEl?.remove();
    if (entry.labelEl) {
      entry.labelEl.remove();
      const at = labels.indexOf(entry.labelEl);
      if (at >= 0) labels.splice(at, 1);
    }
    entry.group.traverse((o) => {
      if (o.userData.shared) return;
      o.material?.map?.dispose?.();
      o.material?.dispose?.();
      o.geometry?.dispose?.();
    });
  }
  // Pupils whose walk ends on the same cell fan out around it (a sunflower pattern: even, never a ring or a line); the
  // pupil's own mascot keeps the middle. The pattern is wider along the road than across it.
  const SLOT_GAP = 3;
  function assignSlots() {
    const groups = new Map();
    for (const [id, entry] of peers) {
      const key = Math.round(entry.walkTo);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([id, entry]);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (b[1].own ? 1 : 0) - (a[1].own ? 1 : 0) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      list.forEach(([, entry], k) => {
        if (k === 0) {
          entry.slot.u = 0;
          entry.slot.v = 0;
          return;
        }
        const r = SLOT_GAP * Math.sqrt(k);
        const angle = k * 2.39996323 + 0.7;
        entry.slot.u = r * Math.cos(angle) * 0.42;
        entry.slot.v = r * Math.sin(angle) * 1.15;
      });
    }
  }
  function syncPeers(next) {
    const seen = new Set();
    for (const peer of next.peers) {
      seen.add(peer.id);
      let entry = peers.get(peer.id);
      if (entry && (entry.mascot !== peer.mascot || entry.name !== peer.name)) {
        disposePeer(entry);
        peers.delete(peer.id);
        entry = undefined;
      }
      if (!entry) peers.set(peer.id, makePeer(peer));
      else if (peer.position !== entry.walkTo) {
        entry.walkFrom = entry.cell;
        entry.walkTo = peer.position;
        entry.walkT = 0;
      }
    }
    for (const [id, entry] of peers) {
      if (!seen.has(id)) {
        disposePeer(entry);
        peers.delete(id);
      }
    }
    assignSlots();
    for (const entry of peers.values()) {
      if (!entry.fresh) continue;
      entry.fresh = false;
      entry.off.u = entry.slot.u;
      entry.off.v = entry.slot.v;
      standAt(entry, entry.cell);
    }
    state.dirty = true;
  }

  // ------------------------------------------------------------------------------------------ dice in the scene
  // A real 3D die lives in the map: it floats beside the pupil's mascot ("tap to roll"), tumbles up over the
  // mascot while the answer comes back, is thrown onto the ground in front of it, bounces, settles on the rolled
  // face and pops a result bubble. The page drives it with setDice({phase, face, steps, canRoll}).
  const FACE_ORDER = [3, 4, 1, 6, 2, 5]; // box material order: +x, -x, +y, -y, +z, -z (opposite faces add up to 7)
  const FACE_NORMAL = { 1: [0, 1, 0], 6: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 2: [0, 0, 1], 5: [0, 0, -1] };
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function pipTexture(n) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const bg = g.createLinearGradient(0, 0, 256, 256);
    bg.addColorStop(0, '#fffaf0');
    bg.addColorStop(1, '#eadfc4');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,90,40,0.25)';
    g.lineWidth = 6;
    g.strokeRect(5, 5, 246, 246);
    for (const cell of PIPS[n]) {
      const x = 56 + (cell % 3) * 72;
      const y = 56 + Math.floor(cell / 3) * 72;
      const red = n === 1 || n === 4;
      const r = n === 1 ? 40 : 22;
      const pg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      pg.addColorStop(0, red ? '#ff6a4d' : '#4a4a55');
      pg.addColorStop(1, red ? '#a3160d' : '#14141a');
      g.fillStyle = pg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  const dieMats = FACE_ORDER.map((n) => new THREE.MeshStandardMaterial({ map: pipTexture(n), roughness: 0.34, metalness: 0.04 }));
  const dieMesh = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 5, 0.14), dieMats);
  dieMesh.castShadow = true;
  const dieGroup = new THREE.Group();
  dieGroup.add(dieMesh);
  dieGroup.visible = false;
  scene.add(dieGroup);
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 128;
  {
    const g = haloCanvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,226,140,0.95)');
    grad.addColorStop(0.45, 'rgba(255,200,90,0.35)');
    grad.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  const dieHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  dieHalo.scale.set(2.3, 2.3, 1);
  dieGroup.add(dieHalo);
  const dieHint = new THREE.Object3D();
  dieHint.visible = false;
  dieGroup.add(dieHint);
  const hintEl = makePill('Chạm để lắc', '', false);
  hintEl.style.cursor = 'pointer';
  hintEl.addEventListener('click', () => {
    if (dice.mode === 'idle' && dice.canRoll) options.onRollRequest?.();
  });
  const dieBubble = new THREE.Object3D();
  dieBubble.scale.set(0.001, 0.001, 1);
  dieBubble.userData.k = 0;
  dieBubble.visible = false;
  scene.add(dieBubble);
  const bubbleEl = makePill('4', 'bước', true);
  const shockRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 56), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  shockRing.rotation.x = -Math.PI / 2;
  shockRing.visible = false;
  scene.add(shockRing);

  const dice = {
    mode: 'hidden', // hidden | idle | spin | throw | rest | fade
    canRoll: false,
    face: 1,
    steps: 0,
    t: 0,
    pos: new THREE.Vector3(),
    path: [],
    qFinal: new THREE.Quaternion(),
    axes: [new THREE.Vector3(1, 0.3, 0.2).normalize(), new THREE.Vector3(0.1, 1, 0.4).normalize()],
    land: new THREE.Vector3(),
    announced: false,
    restAt: 0,
    spinQ: new THREE.Quaternion(),
    ring: 0,
  };
  const UP = new THREE.Vector3(0, 1, 0);
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const raycaster = new THREE.Raycaster();

  function mascotScale(entry) {
    return clamp(camera.position.distanceTo(entry.group.position) / 24, 1, 3.6);
  }
  function dieGrow(mp) {
    return clamp(camera.position.distanceTo(mp) / 26, 1, 3);
  }
  function startThrow() {
    const own = ownEntry();
    if (!own) return;
    const mp = own.group.position;
    const s = orbit.shown;
    const toCam = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
    const grow = dieGrow(mp);
    const size = 2.1 * grow;
    const ground = (x, z) => Math.max(groundY(x, z), WATER + 0.15) + size / 2;
    const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    const at = (d) => {
      const p = mp.clone().addScaledVector(toCam, d * grow).addScaledVector(right, 3.4 * grow * 0.9);
      p.y = ground(p.x, p.z);
      return p;
    };
    dice.land.copy(at(4.2));
    dice.path = [dieGroup.position.clone(), at(6.4), at(5.2), dice.land.clone()];
    const n = FACE_NORMAL[dice.face] || FACE_NORMAL[1];
    tmpQ.setFromUnitVectors(new THREE.Vector3(...n), UP);
    tmpQ2.setFromAxisAngle(UP, rand() * Math.PI * 2);
    dice.qFinal.copy(tmpQ2).multiply(tmpQ);
    dice.axes[0].set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    dice.axes[1].set(rand() - 0.5, rand() + 0.2, rand() - 0.5).normalize();
    dice.t = 0;
    dice.announced = false;
    dice.mode = 'throw';
    dieBubble.visible = false;
    dieHint.visible = false;
  }
  function setDice(next) {
    const phase = next?.phase || 'idle';
    dice.canRoll = Boolean(next?.canRoll);
    if (phase === 'rolling') {
      if (dice.mode !== 'spin' && dice.mode !== 'throw') {
        dice.mode = 'spin';
        dice.t = 0;
        if (dice.mode === 'spin' && !dieGroup.visible) dieGroup.position.copy(diceTarget('idle'));
      }
    } else if (phase === 'landed') {
      dice.face = clamp(Number(next.face) || 1, 1, 6);
      dice.steps = Number(next.steps) || dice.face;
      if (dice.mode !== 'throw' && dice.mode !== 'rest') {
        bubbleEl.firstChild.textContent = String(dice.steps);
        if (!dieGroup.visible) dieGroup.position.copy(diceTarget('spin'));
        startThrow();
      }
    } else if (dice.mode === 'rest' || dice.mode === 'throw') {
      dice.mode = 'fade';
      dice.t = 0;
    } else if (dice.mode === 'spin') {
      dice.mode = dice.canRoll ? 'idle' : 'fade';
      dice.t = 0;
    } else if (dice.canRoll && dice.mode !== 'idle') {
      dice.mode = 'idle';
      dieGroup.position.copy(diceTarget('idle'));
    } else if (!dice.canRoll && dice.mode === 'idle') {
      dice.mode = 'fade';
      dice.t = 0;
    }
    state.dirty = true;
  }
  function diceTarget(kind) {
    const own = ownEntry();
    const out = new THREE.Vector3();
    if (!own) return out;
    const mp = own.group.position;
    const s = orbit.shown;
    const grow = dieGrow(mp);
    const h = own.size * mascotScale(own);
    if (kind === 'idle') {
      const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
      return out.copy(mp).addScaledVector(right, 5.4 * grow * 0.9).setY(mp.y + 2.8 * grow + Math.sin(performance.now() / 420) * 0.35 * grow);
    }
    return out.copy(mp).setY(mp.y + h * 0.95 + 2.6 * grow);
  }
  const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

  function updateDice(dt, now) {
    const own = ownEntry();
    if (dice.mode === 'hidden' || !own) {
      dieGroup.visible = false;
      dieBubble.visible = false;
      shockRing.visible = false;
      return;
    }
    const mp = own.group.position;
    const grow = dieGrow(mp);
    const size = 2.1 * grow;
    dieGroup.visible = true;
    dieGroup.scale.setScalar(size);
    state.dirty = true;
    const bob = Math.sin(now / 420);
    if (dice.mode === 'idle') {
      dieGroup.position.lerp(diceTarget('idle'), 1 - Math.exp(-dt * 8));
      dice.spinQ.setFromAxisAngle(UP, dt * 0.9);
      dieGroup.quaternion.premultiply(dice.spinQ);
      dieMesh.rotation.x = 0.4 + bob * 0.08;
      dieHalo.visible = true;
      dieHalo.material.opacity = 0.65 + bob * 0.2;
      dieHalo.scale.setScalar(2.3 + bob * 0.18);
      dieHint.visible = grow < 2.1;
      dieHint.position.set(0, 1.05, 0);
      dieHint.scale.set(1.7, 0.85, 1);
    } else if (dice.mode === 'spin') {
      dice.t += dt;
      dieGroup.position.lerp(diceTarget('spin'), 1 - Math.exp(-dt * 7));
      dice.spinQ.setFromAxisAngle(dice.axes[0], dt * 14);
      dieGroup.quaternion.premultiply(dice.spinQ);
      dice.spinQ.setFromAxisAngle(dice.axes[1], dt * 9);
      dieGroup.quaternion.premultiply(dice.spinQ);
      dieMesh.rotation.x = 0;
      dieHalo.visible = true;
      dieHalo.material.opacity = 0.9;
      dieHint.visible = false;
    } else if (dice.mode === 'throw') {
      dice.t = Math.min(1, dice.t + dt / (reduced ? 0.12 : 1.5));
      const t = dice.t;
      const segs = [0, 0.5, 0.78, 0.95];
      const heights = [4.5 * grow, 1.9 * grow * 0.7, 0.6 * grow * 0.7];
      let k = t < 0.5 ? 0 : t < 0.78 ? 1 : t < 0.95 ? 2 : 3;
      if (k < 3) {
        const u = (t - segs[k]) / ((k === 2 ? 0.95 : segs[k + 1]) - segs[k]);
        const a = dice.path[k];
        const b = dice.path[k + 1];
        dieGroup.position.set(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + heights[k] * 4 * u * (1 - u), lerp(a.z, b.z, u));
      } else dieGroup.position.copy(dice.land);
      const e = smooth(0, 0.93, t);
      const f = (1 - e) * (1 - e);
      dieGroup.quaternion.copy(tmpQ.setFromAxisAngle(dice.axes[0], 7 * Math.PI * f)).multiply(tmpQ2.setFromAxisAngle(dice.axes[1], 5 * Math.PI * f)).multiply(dice.qFinal);
      dieMesh.rotation.x = 0;
      dieHalo.visible = false;
      if (t >= 1) {
        dice.mode = 'rest';
        dice.restAt = now;
        dice.ring = 0;
        shockRing.visible = true;
        shockRing.position.copy(dice.land).setY(dice.land.y - size / 2 + 0.1);
        dieBubble.visible = true;
        if (!dice.announced) {
          dice.announced = true;
          options.onDiceDone?.();
        }
      }
    } else if (dice.mode === 'rest') {
      const age = (now - dice.restAt) / 1000;
      dieGroup.position.copy(dice.land);
      const pop = clamp(age / 0.35, 0, 1);
      dieGroup.scale.setScalar(size * (1 + 0.12 * Math.sin(Math.min(1, age / 0.4) * Math.PI)));
      dieBubble.position.copy(dice.land).setY(dice.land.y + size * 1.25 + Math.sin(now / 380) * 0.2 * grow);
      const bs = size * 2.0 * easeOutBack(pop);
      dieBubble.scale.set(bs, bs * 0.5, 1);
      dieBubble.userData.k = easeOutBack(pop);
      dice.ring = age / 0.8;
      shockRing.material.opacity = Math.max(0, 0.75 * (1 - dice.ring));
      shockRing.scale.setScalar(size * (1 + dice.ring * 5));
      if (dice.ring >= 1) shockRing.visible = false;
      dieHalo.visible = true;
      dieHalo.material.opacity = 0.5;
    } else if (dice.mode === 'fade') {
      dice.t += dt / 0.35;
      const f = clamp(1 - dice.t, 0, 1);
      dieGroup.scale.setScalar(size * f);
      dieBubble.scale.multiplyScalar(0.9);
      dieBubble.userData.k *= 0.9;
      shockRing.visible = false;
      if (dice.t >= 1) {
        dieBubble.visible = false;
        if (dice.canRoll) {
          dice.mode = 'idle';
          dieGroup.position.copy(diceTarget('idle'));
        } else {
          dice.mode = 'hidden';
          dieGroup.visible = false;
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------ camera
  const orbit = { yaw: Math.PI, pitch: 0.62, dist: 30, target: new THREE.Vector3(), shown: { yaw: Math.PI, pitch: 0.62, dist: 30, target: new THREE.Vector3() }, follow: true };
  const MIN_DIST = 9;
  const MAX_DIST = 330;
  const PITCH_MIN = 0.1;
  const PITCH_MAX = 1.4;
  const ownEntry = () => {
    for (const entry of peers.values()) if (entry.own) return entry;
    return null;
  };
  // Pull back and look down to see the whole road at once.
  function overview() {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
    orbit.target.set((minX + maxX) / 2, 2, (minZ + maxZ) / 2);
    const aspect = camera.aspect || 1.6;
    const fit = Math.max((maxX - minX) / aspect, maxZ - minZ) * 0.5 + 24;
    orbit.dist = clamp((fit / Math.tan((camera.fov * Math.PI) / 360)) * 0.98, MIN_DIST, MAX_DIST);
    orbit.pitch = 1.12;
    orbit.yaw = Math.PI;
    orbit.follow = false;
    state.dirty = true;
  }
  function snapCamera() {
    orbit.shown.yaw = orbit.yaw;
    orbit.shown.pitch = orbit.pitch;
    orbit.shown.dist = orbit.dist;
    orbit.shown.target.copy(orbit.target);
    state.dirty = true;
  }
  function frameOwn() {
    const own = ownEntry();
    if (!own) {
      overview();
      return;
    }
    orbit.target.copy(own.group.position).setY(own.group.position.y + 2);
    orbit.dist = 38;
    orbit.pitch = 0.84;
    orbit.yaw = Math.PI;
    orbit.follow = true;
    state.dirty = true;
  }

  const forced = Number(new URLSearchParams(window.location.search).get('q'));
  function initialQuality() {
    if (Number.isInteger(forced) && forced >= 0 && forced <= 2 && new URLSearchParams(window.location.search).has('q')) return forced;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const small = Math.min(window.screen?.width || 1000, window.screen?.height || 1000) < 700;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    if (coarse && (small || cores <= 4 || memory <= 3)) return 1;
    if (cores <= 2) return 1;
    return 0;
  }
  // level = which features are on (0 full, 1 medium, 2 light); scale = fraction of the screen's pixels we draw,
  // adjusted continuously from the measured frame rate so the picture never stutters (see adaptResolution).
  const LEVEL_CAP = [2, 1.5, 1];
  const MIN_SCALE = 0.55;
  const quality = { level: initialQuality(), scale: 1, cap: 2 };
  let post = null;
  const sunShadow = { dirty: true, half: 0, last: 0, at: new THREE.Vector3(1e9, 0, 0) };
  function applyDetail() {
    const grass = quality.level === 0 ? 1 : quality.level === 1 ? 0.55 : 0.3;
    tufts.count = Math.floor(tuftCount * grass);
    flowers.count = Math.floor(flowerCount * (quality.level === 0 ? 1 : quality.level === 1 ? 0.5 : 0));
    for (const [kind] of treeKinds) treeMeshes[kind].count = Math.floor(treeCounts[kind] * (quality.level < 2 ? 1 : 0.65));
  }
  function setShadowQuality() {
    applyDetail();
    const on = quality.level < 2;
    renderer.shadowMap.enabled = on;
    renderer.shadowMap.type = quality.level === 0 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    sun.castShadow = on;
    quality.cap = LEVEL_CAP[quality.level];
    post?.setLevel(quality.level);
    const size = quality.level === 0 ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    sunShadow.half = 0;
    sunShadow.dirty = true;
    scene.traverse((o) => {
      if (o.material) o.material.needsUpdate = true;
    });
  }
  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, quality.cap));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (!post) post = createPost({ renderer, scene, camera, width: w, height: h, pixelRatio: dpr, level: quality.level });
    post.setSize(w, h, dpr);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 66 : 52;
    camera.updateProjectionMatrix();
    state.dirty = true;
  }

  // ------------------------------------------------------------------------------------------ input
  const pointers = new Map();
  let gesture = null;
  function panBy(dx, dy) {
    // world units per screen pixel at the point we look at
    const k = (2 * orbit.dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, host.clientHeight);
    const stretch = 1 / Math.max(0.35, Math.sin(orbit.pitch));
    const rx = Math.cos(orbit.yaw);
    const rz = -Math.sin(orbit.yaw);
    const fx = -Math.sin(orbit.yaw);
    const fz = -Math.cos(orbit.yaw);
    orbit.target.x += (-dx * rx + dy * fx * stretch) * k;
    orbit.target.z += (-dx * rz + dy * fz * stretch) * k;
    orbit.target.x = clamp(orbit.target.x, -WIDTH * 0.5, WIDTH * 0.5);
    orbit.target.z = clamp(orbit.target.z, -DEPTH * 0.5, DEPTH * 0.5);
    orbit.target.y = groundY(orbit.target.x, orbit.target.z) + 2;
    orbit.follow = false;
  }
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, sx: event.clientX, sy: event.clientY, moved: false, pan: event.button === 2 || event.button === 1 || event.shiftKey });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    const cur = { x: event.clientX, y: event.clientY, sx: prev.sx, sy: prev.sy, pan: prev.pan, moved: prev.moved || Math.hypot(event.clientX - prev.sx, event.clientY - prev.sy) > 6 };
    pointers.set(event.pointerId, cur);
    if (pointers.size >= 2 && gesture) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      orbit.dist = clamp(gesture.dist * (gesture.d / d), MIN_DIST, MAX_DIST);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      panBy(cx - gesture.cx, cy - gesture.cy);
      gesture.cx = cx;
      gesture.cy = cy;
    } else if (pointers.size === 1) {
      if (cur.pan || state.drag === 'pan') panBy(cur.x - prev.x, cur.y - prev.y);
      else {
        orbit.yaw -= (cur.x - prev.x) * 0.0062;
        orbit.pitch = clamp(orbit.pitch + (cur.y - prev.y) * 0.0048, PITCH_MIN, PITCH_MAX);
      }
    }
    state.dirty = true;
    options.onViewChange?.();
  });
  const release = (event) => {
    const press = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) gesture = null;
    if (event.type === 'pointerup' && press && !press.moved && pointers.size === 0 && dice.mode === 'idle' && dice.canRoll) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
      if (raycaster.intersectObjects([dieMesh, dieHalo], false).length) options.onRollRequest?.();
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      orbit.dist = clamp(orbit.dist * Math.exp(event.deltaY * 0.0012), MIN_DIST, MAX_DIST);
      state.dirty = true;
    },
    { passive: false },
  );
  canvas.addEventListener('keydown', (event) => {
    const step = 0.12;
    if (event.shiftKey && event.key.startsWith('Arrow')) {
      const k = orbit.dist * 0.06;
      panBy(event.key === 'ArrowLeft' ? k : event.key === 'ArrowRight' ? -k : 0, event.key === 'ArrowUp' ? k : event.key === 'ArrowDown' ? -k : 0);
    } else if (event.key === 'ArrowLeft') orbit.yaw += step;
    else if (event.key === 'ArrowRight') orbit.yaw -= step;
    else if (event.key === 'ArrowUp') orbit.pitch = clamp(orbit.pitch - step, PITCH_MIN, PITCH_MAX);
    else if (event.key === 'ArrowDown') orbit.pitch = clamp(orbit.pitch + step, PITCH_MIN, PITCH_MAX);
    else if (event.key === '+' || event.key === '=') orbit.dist = clamp(orbit.dist * 0.85, MIN_DIST, MAX_DIST);
    else if (event.key === '-') orbit.dist = clamp(orbit.dist / 0.85, MIN_DIST, MAX_DIST);
    else if (event.key === '0') overview();
    else return;
    event.preventDefault();
    state.dirty = true;
    options.onViewChange?.();
  });

  // ------------------------------------------------------------------------------------------ frame loop
  const frameStamps = [];
  const perf = { busyAt: 0, drawnScale: 1, calibrated: 0, frames: 0, since: performance.now(), slow: 0, changedAt: 0, raisedFrom: 0, raisedAt: 0, maxScale: 1 };
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let last = performance.now();
  let lastAmbient = 0;
  const tmp = new THREE.Vector3();

  function updatePeers(dt) {
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 6);
    for (const entry of peers.values()) {
      let moved = false;
      if (entry.walkT < 1) {
        const total = Math.abs(entry.walkTo - entry.walkFrom) || 1;
        entry.walkT = Math.min(1, entry.walkT + dt / (reduced ? 0.01 : 0.2 * total));
        entry.cell = lerp(entry.walkFrom, entry.walkTo, entry.walkT);
        entry.hop = Math.abs(Math.sin(entry.cell * Math.PI)) * 1.1;
        if (entry.walkT >= 1) {
          entry.cell = entry.walkTo;
          entry.hop = 0;
        }
        moved = true;
      }
      const du = entry.slot.u - entry.off.u;
      const dv = entry.slot.v - entry.off.v;
      if (Math.abs(du) > 0.005 || Math.abs(dv) > 0.005) {
        entry.off.u += du * ease;
        entry.off.v += dv * ease;
        moved = true;
      }
      if (!moved) continue;
      standAt(entry, entry.cell);
      state.dirty = true;
    }
  }

  // Mascots, names and plaques keep a readable size on screen: they grow with the camera distance.
  function scaleBillboards() {
    const now = performance.now();
    for (const entry of peers.values()) {
      const d = camera.position.distanceTo(entry.group.position);
      const grow = clamp(d / (entry.own ? 24 : 34), 1, entry.own ? 3.6 : 2.4);
      if (entry.group.userData.ring) entry.group.userData.ring.scale.setScalar(grow * (1 + Math.sin(now / 380) * 0.08));
    }
  }

  // Puts every HTML piece at the screen position of its anchor: mascots standing on the road, the arrow above the
  // pupil's own, names under the feet, gate plaques above the gates, the die's hint and its result bubble.
  const labelPoint = new THREE.Vector3();
  const viewPoint = new THREE.Vector3();
  function placeLabels(now) {
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const w = host.clientWidth;
    const h = host.clientHeight;
    const pxPerUnit = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    let sx = 0;
    let sy = 0;
    const screen = (world) => {
      labelPoint.copy(world).project(camera);
      sx = Math.round((labelPoint.x * 0.5 + 0.5) * w);
      sy = Math.round((-labelPoint.y * 0.5 + 0.5) * h);
      return labelPoint.z > -1 && labelPoint.z < 1 && sx > -220 && sx < w + 220 && sy > -220 && sy < h + 220;
    };
    const show = (el, on) => {
      const hidden = el.style.display === 'none';
      if (!on) {
        if (!hidden) el.style.display = 'none';
      } else if (hidden) el.style.display = '';
    };
    const put = (el, world, anchor, scale) => {
      if (!screen(world)) return show(el, false);
      show(el, true);
      const dy = anchor === 'below' ? '6px' : anchor === 'center' ? '-50%' : '-100%';
      el.style.transform = 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,' + dy + ')' + (scale === undefined ? '' : ' scale(' + scale + ')');
      return undefined;
    };
    const crowd = [];
    // mascots of a big class are drawn a little smaller
    const others = Math.max(0, peers.size - 12);
    const crowdScale = Math.max(0.62, 1 - others * 0.008);
    const items = [];
    for (const entry of peers.values()) {
      const feet = entry.group.position;
      viewPoint.copy(feet).applyMatrix4(camera.matrixWorldInverse);
      const depth = -viewPoint.z;
      const visible = depth > 0.5 && screen(feet);
      if (!visible) {
        show(entry.mascotEl, false);
        if (entry.arrowEl) show(entry.arrowEl, false);
        if (entry.labelEl) show(entry.labelEl, false);
        continue;
      }
      const grow = clamp(camera.position.distanceTo(feet) / (entry.own ? 24 : 34), 1, entry.own ? 3.6 : 2.4);
      const px = Math.max(24, Math.round((entry.size * (entry.own ? 1 : crowdScale) * grow * pxPerUnit) / depth));
      items.push({ entry, fx: sx, fy: sy, depth, px, lift: (entry.hop * pxPerUnit) / depth });
    }
    // the pupil's own mascot first, then the nearest: each one is drawn in full only when it does not sit on top of
    // a mascot already placed; otherwise it becomes a small chip, and when even that would be a pile it is counted
    // into a "+N" badge on the mascot that covers it
    items.sort((a, b) => (a.entry.own ? 0 : 1) - (b.entry.own ? 0 : 1) || a.depth - b.depth);
    const placed = [];
    const covered = (rect) => {
      const area = (rect.r - rect.l) * (rect.b - rect.t);
      let sum = 0;
      let best = null;
      let bestArea = 0;
      for (const p of placed) {
        const w = Math.min(rect.r, p.r) - Math.max(rect.l, p.l);
        const h = Math.min(rect.b, p.b) - Math.max(rect.t, p.t);
        if (w > 0 && h > 0) {
          sum += w * h;
          if (w * h > bestArea) {
            bestArea = w * h;
            best = p;
          }
        }
      }
      return { fraction: sum / area, best };
    };
    const CHIP = 30;
    crowdStats.full = crowdStats.chips = crowdStats.hidden = 0;
    for (const item of items) {
      const entry = item.entry;
      let size = item.px;
      let lod = 'full';
      let top = Math.round(item.fy - size * 0.95 - item.lift);
      let rect = { l: item.fx - size / 2, t: top, r: item.fx + size / 2, b: top + size, more: 0 };
      if (!entry.own) {
        const first = covered(rect);
        if (first.fraction > 0.3) {
          size = Math.min(size, CHIP);
          top = Math.round(item.fy - size * 0.95 - item.lift * (size / item.px));
          rect = { l: item.fx - size / 2, t: top, r: item.fx + size / 2, b: top + size, more: 0 };
          const second = covered(rect);
          if (second.fraction > 0.5) {
            lod = 'hidden';
            if (second.best) second.best.more++;
          } else lod = 'chip';
        }
      }
      if (lod === 'hidden') {
        crowdStats.hidden++;
        show(entry.mascotEl, false);
        if (entry.arrowEl) show(entry.arrowEl, false);
        if (entry.labelEl) show(entry.labelEl, false);
        continue;
      }
      placed.push(rect);
      if (lod === 'chip') crowdStats.chips++;
      else crowdStats.full++;
      show(entry.mascotEl, true);
      if (entry.px !== size) {
        entry.mascotEl.style.width = entry.mascotEl.style.height = size + 'px';
        entry.px = size;
      }
      if (entry.lod !== lod) {
        entry.lod = lod;
        entry.mascotEl.style.borderRadius = lod === 'chip' ? '50%' : '';
        entry.mascotEl.style.backgroundColor = lod === 'chip' ? 'rgba(8,15,33,.6)' : '';
        entry.mascotEl.style.boxShadow = lod === 'chip' ? '0 0 0 2px rgba(255,255,255,.9)' : '';
      }
      entry.mascotEl.style.zIndex = String(Math.round(100000 / item.depth));
      entry.mascotEl.style.transform = 'translate(' + Math.round(item.fx - size / 2) + 'px,' + top + 'px)';
      if (entry.arrowEl) {
        show(entry.arrowEl, true);
        entry.arrowEl.style.zIndex = '999999';
        entry.arrowEl.style.transform = 'translate(' + (item.fx - 15) + 'px,' + Math.round(top - 26 + Math.sin(now / 300) * 3) + 'px)';
      }
      if (entry.labelEl) {
        if (lod === 'full') crowd.push({ el: entry.labelEl, x: item.fx, y: item.fy, depth: item.depth, rank: entry.own ? 0 : 2, below: true });
        else show(entry.labelEl, false);
      }
    }
    let badge = 0;
    for (const rect of placed) {
      if (!rect.more) continue;
      const el = badgeAt(badge++);
      el.textContent = '+' + rect.more;
      show(el, true);
      el.style.zIndex = '900000';
      const span = rect.r - rect.l;
      el.style.transform = 'translate(' + Math.round(rect.l + span * 0.6) + 'px,' + Math.round(rect.t + span * 0.04 - 2) + 'px)';
    }
    for (let i = badge; i < badges.length; i++) show(badges[i], false);
    for (const plaque of plaques) {
      if (screen(plaque.anchor.getWorldPosition(tmp))) {
        viewPoint.copy(tmp).applyMatrix4(camera.matrixWorldInverse);
        crowd.push({ el: plaque.el, x: sx, y: sy, depth: -viewPoint.z, rank: 1, below: false });
      } else show(plaque.el, false);
    }
    // Names and plaques that would sit on top of each other are not all shown: the pupil's own name first, then the
    // gate plaques, then the others, nearest first. The ones that do not fit appear again as the camera comes closer.
    crowd.sort((a, b) => a.rank - b.rank || a.depth - b.depth);
    const taken = [];
    for (const item of crowd) {
      const width = item.el.textContent.length * 8 + (item.below ? 24 : 62);
      const height = item.below ? 24 : 32;
      const left = item.x - width / 2;
      const top = item.below ? item.y + 6 : item.y - height;
      const clash = taken.some((r) => left < r.right && left + width > r.left && top < r.bottom && top + height > r.top);
      if (clash) {
        show(item.el, false);
        continue;
      }
      taken.push({ left, right: left + width, top, bottom: top + height });
      show(item.el, true);
      item.el.style.transform = 'translate(' + item.x + 'px,' + item.y + 'px) translate(-50%,' + (item.below ? '6px' : '-100%') + ')';
    }
    if (dieHint.visible && dieGroup.visible) put(hintEl, dieHint.getWorldPosition(tmp), 'center');
    else show(hintEl, false);
    if (dieBubble.visible && dieBubble.userData.k > 0.03) put(bubbleEl, dieBubble.position, 'above', Math.max(0.05, dieBubble.userData.k));
    else show(bubbleEl, false);
  }

  // The sun's shadow frustum follows what we look at. It is snapped to whole shadow texels and its size comes in a few
  // steps, and the shadow map is only redrawn when one of those changes (or a few times a second for things that move).
  const LIGHT_X = new THREE.Vector3(0, 1, 0).cross(SUN_DIR).normalize();
  const LIGHT_Y = new THREE.Vector3().crossVectors(SUN_DIR, LIGHT_X);
  const SHADOW_HALVES = [30, 42, 60, 84, 120, 170];
  const snapped = new THREE.Vector3();
  function followSun(s, now) {
    const want = clamp(s.dist * 0.9, 30, 170);
    const half = SHADOW_HALVES.find((v) => v >= want) || 170;
    const texel = (half * 2) / sun.shadow.mapSize.x;
    snapped
      .copy(LIGHT_X)
      .multiplyScalar(Math.round(s.target.dot(LIGHT_X) / texel) * texel)
      .addScaledVector(LIGHT_Y, Math.round(s.target.dot(LIGHT_Y) / texel) * texel)
      .addScaledVector(SUN_DIR, s.target.dot(SUN_DIR));
    if (sunShadow.half !== half || snapped.distanceToSquared(sunShadow.at) > 1e-6) {
      sunShadow.half = half;
      sunShadow.at.copy(snapped);
      sunShadow.dirty = true;
      sun.position.copy(snapped).addScaledVector(SUN_DIR, 150);
      sun.target.position.copy(snapped);
      const sc = sun.shadow.camera;
      sc.left = -half;
      sc.right = half;
      sc.top = half;
      sc.bottom = -half;
      sc.near = 10;
      sc.far = 340;
      sc.updateProjectionMatrix();
    }
    if (now - sunShadow.last > (s.dist < 70 ? 330 : 900)) sunShadow.dirty = true;
    if (sunShadow.dirty && sun.castShadow) {
      renderer.shadowMap.needsUpdate = true;
      sunShadow.last = now;
    }
    sunShadow.dirty = false;
  }

  // Keeps the frame rate smooth by changing how many pixels we draw, a little at a time, instead of switching
  // features off (which recompiles every shader and stutters). Features only drop when the floor is reached.
  function adaptResolution(fps, now) {
    if (fps < 50) {
      const next = Math.max(MIN_SCALE, Math.round(quality.scale * Math.sqrt(clamp(fps / 58, 0.4, 0.96)) * 20) / 20);
      if (next < quality.scale - 0.04) {
        if (perf.raisedAt && now - perf.raisedAt < 9000) perf.maxScale = perf.raisedFrom;
        quality.scale = next;
        perf.changedAt = now;
        perf.slow = 0;
        return;
      }
      if (fps >= 27) return; // slower than the screen but still fluid: keep the features, the resolution is already at its floor
      if (quality.level < 2) {
        quality.level++;
        quality.scale = Math.max(quality.scale, 0.8);
        setShadowQuality();
        resize();
        perf.changedAt = now;
      } else if (++perf.slow >= 3 && !state.fallback) {
        state.fallback = true;
        options.onFallback?.('slow');
      }
      return;
    }
    perf.slow = 0;
    if (fps >= 56 && quality.scale < Math.min(1, perf.maxScale) && now - perf.changedAt > 5000) {
      perf.raisedFrom = quality.scale;
      perf.raisedAt = now;
      quality.scale = Math.min(1, perf.maxScale, quality.scale + 0.1);
      perf.changedAt = now;
    }
  }

  // Measures what a frame really costs on this device (a one-pixel read waits for the GPU) and starts at a resolution
  // that fits, dropping features first only when even the lowest resolution would be too slow.
  function calibrate() {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    post.setScale(1);
    const measure = () => {
      renderer.shadowMap.needsUpdate = true;
      post.render();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t = performance.now();
      for (let i = 0; i < 3; i++) {
        renderer.shadowMap.needsUpdate = true;
        post.render();
      }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return (performance.now() - t) / 3;
    };
    const BUDGET = 17;
    let ms = measure();
    while (ms > BUDGET * (1 / (MIN_SCALE * MIN_SCALE)) && quality.level < 2) {
      quality.level++;
      setShadowQuality();
      resize();
      ms = measure();
    }
    const scale = clamp(Math.round(Math.sqrt(BUDGET / ms) * 20) / 20, MIN_SCALE, 1);
    if (scale < quality.scale - 0.04) quality.scale = scale;
    perf.calibrated = ms;
    perf.changedAt = performance.now();
    sunShadow.dirty = true;
    state.dirty = true;
  }

  function tick(now) {
    if (state.destroyed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    updatePeers(dt);
    updateDice(dt, now);
    if (!reduced && now - lastAmbient > (now - perf.busyAt > 3000 ? 62 : 30)) {
      const ambientDt = Math.min(0.25, (now - lastAmbient) / 1000);
      lastAmbient = now;
      updateLife(now, ambientDt);
      groundUniforms.uTime.value = now / 1000;
      windUniforms.uTime.value = now / 1000;
      waterNormal.offset.x = (now / 60000) % 1;
      waterNormal.offset.y = (now / 90000) % 1;
      for (const c of clouds) {
        c.position.x += dt * 1.4;
        if (c.position.x > 420) c.position.x = -420;
      }
      if (state.boat) state.boat.rotation.z = Math.sin(now / 900) * 0.025;
      state.dirty = true;
    }

    if (orbit.follow) {
      const own = ownEntry();
      if (own) orbit.target.lerp(tmp.set(own.group.position.x, own.group.position.y + 2 + own.hop * 0.4, own.group.position.z), 1 - Math.exp(-dt * 8));
    }
    const k = 1 - Math.exp(-dt * (reduced ? 60 : 10));
    const s = orbit.shown;
    const dyaw = Math.atan2(Math.sin(orbit.yaw - s.yaw), Math.cos(orbit.yaw - s.yaw));
    s.yaw += dyaw * k;
    s.pitch = lerp(s.pitch, orbit.pitch, k);
    s.dist = lerp(s.dist, orbit.dist, k);
    s.target.lerp(orbit.target, 1 - Math.exp(-dt * 9));
    const moving = Math.abs(dyaw) > 0.0005 || Math.abs(s.pitch - orbit.pitch) > 0.0005 || Math.abs(s.dist - orbit.dist) > 0.01 || s.target.distanceToSquared(orbit.target) > 0.0004;
    const walking = [...peers.values()].some((p) => p.walkT < 1);
    if (moving || walking) perf.busyAt = now;
    const settled = now - perf.busyAt > 220;
    if (moving) state.dirty = true;
    // the last frames of a movement were drawn smaller: draw one more at full size as soon as it has settled
    if (settled && perf.drawnScale < 1) state.dirty = true;

    if (state.dirty) {
      const cp = Math.cos(s.pitch);
      camera.position.set(s.target.x + Math.sin(s.yaw) * cp * s.dist, s.target.y + Math.sin(s.pitch) * s.dist, s.target.z + Math.cos(s.yaw) * cp * s.dist);
      const floor = groundY(camera.position.x, camera.position.z);
      if (camera.position.y < floor + 2.2) camera.position.y = floor + 2.2;
      camera.lookAt(s.target);
      sky.position.copy(camera.position);
      ridge.position.x = camera.position.x;
      ridge.position.z = camera.position.z;
      scene.fog.far = Math.max(260, s.dist * 1.9);
      scene.fog.near = Math.min(scene.fog.far * 0.8, Math.max(70, s.dist * 1.1));
      // clouds float high above the map: when the camera rises to their height (the whole-map view) they fade out
      // instead of hanging in front of the ground like a white sheet
      for (const c of clouds) c.material.opacity = (c.userData.base ?? 0.8) * clamp((c.position.y - camera.position.y) / 30 + 0.25, 0, 1);
      followSun(s, now);
      scaleBillboards();
      placeLabels(now);
      sunGlow.position.copy(camera.position).addScaledVector(SUN_DIR, SKY_R * 0.88);
      frameStamps.push(now);
      if (frameStamps.length > 90) frameStamps.shift();
      perf.drawnScale = settled ? 1 : quality.scale;
      post.setScale(perf.drawnScale);
      post.setPasses({ fxaa: perf.drawnScale >= 0.85, sharpen: perf.drawnScale >= 0.85 });
      post.render();
      state.dirty = false;
      perf.frames++;
      if (!perf.calibrated && document.visibilityState === 'visible') calibrate();
    }

    if ((moving || walking) && document.visibilityState === 'visible') {
      const elapsed = now - perf.since;
      if (elapsed > 6000) {
        // a long gap (tab switched away, device asleep): the numbers would mean nothing, start a new window
        perf.frames = 0;
        perf.since = now;
      } else if (elapsed > 1200) {
        const fps = (perf.frames * 1000) / elapsed;
        perf.frames = 0;
        perf.since = now;
        adaptResolution(fps, now);
      }
    } else {
      perf.frames = 0;
      perf.since = now;
    }
  }

  const resetPerf = () => {
    perf.frames = 0;
    perf.since = performance.now();
    perf.slow = 0;
    perf.changedAt = performance.now();
  };
  document.addEventListener('visibilitychange', resetPerf);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  ro?.observe(host);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (!state.fallback) {
      state.fallback = true;
      options.onFallback?.('context');
    }
  });

  resize();
  setShadowQuality();
  applyMode('day');
  updateLife(performance.now(), 0);
  syncPeers(model);
  frameOwn();
  snapCamera();
  raf = requestAnimationFrame(tick);

  const api = {
    update(next) {
      state.model = next;
      model = next;
      syncPeers(next);
    },
    resize,
    /** Drives the die: {phase: 'idle' | 'rolling' | 'landed', face, steps, canRoll}. */
    setDice,
    diceMode: () => dice.mode,
    /** Frames drawn per second over the last 90 draws (for measuring on real devices). */
    fps() {
      if (frameStamps.length < 2) return 0;
      return Math.round(((frameStamps.length - 1) * 1000) / (frameStamps[frameStamps.length - 1] - frameStamps[0]));
    },
    /** Back behind the pupil's own mascot ("Tìm tôi"). */
    reset: frameOwn,
    /** Pull back to see the whole road ("Xem cả bản đồ"). */
    overview,
    zoom(delta) {
      orbit.dist = clamp(orbit.dist * Math.exp(-delta * 1.4), MIN_DIST, MAX_DIST);
      state.dirty = true;
    },
    look(yaw, pitch) {
      if (typeof yaw === 'number') orbit.yaw = yaw + Math.PI;
      if (typeof pitch === 'number') orbit.pitch = clamp(pitch, PITCH_MIN, PITCH_MAX);
      state.dirty = true;
    },
    /** 'orbit' turns the camera around the target; 'pan' drags the map itself. */
    dragAs(mode) {
      state.drag = mode === 'pan' ? 'pan' : 'orbit';
    },
    read() {
      return { yaw: (((orbit.yaw - Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), pitch: orbit.pitch, dist: orbit.dist, mode: '3d', follow: orbit.follow };
    },
    light() {
      applyMode(state.mode === 'day' ? 'night' : 'day');
      return state.mode;
    },
    /** Switches single features on or off, to find what costs the most (reachable from the console with ?debug). */
    tune(opts = {}) {
      if ('shadows' in opts) {
        renderer.shadowMap.enabled = sun.castShadow = Boolean(opts.shadows);
        scene.traverse((o) => {
          if (o.material) o.material.needsUpdate = true;
        });
      }
      if ('scale' in opts) quality.scale = opts.scale;
      if ('dpr' in opts) {
        quality.cap = opts.dpr;
        resize();
      }
      if ('grass' in opts) {
        tufts.count = Math.floor(tuftCount * opts.grass);
        flowers.count = Math.floor(flowerCount * opts.grass);
      }
      if ('direct' in opts) state.direct = Boolean(opts.direct);
      post?.setPasses(opts);
      state.dirty = true;
    },
    /** Draws frames back to back and reports the real time per frame. A one-pixel read at the end waits for the GPU. */
    bench(frames = 10, withShadows = false) {
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      post?.setScale(quality.scale);
      const draw = () => {
        if (withShadows) renderer.shadowMap.needsUpdate = true;
        if (post?.active && !state.direct) post.render();
        else renderer.render(scene, camera);
      };
      draw();
      draw();
      sync();
      renderer.info.autoReset = false;
      renderer.info.reset();
      const t0 = performance.now();
      for (let i = 0; i < frames; i++) draw();
      sync();
      const ms = (performance.now() - t0) / frames;
      const calls = renderer.info.render.calls / frames;
      const triangles = renderer.info.render.triangles / frames;
      renderer.info.autoReset = true;
      return { ms: Math.round(ms * 10) / 10, calls: Math.round(calls), triangles: Math.round(triangles) };
    },
    stats() {
      return { calibratedMs: Math.round(perf.calibrated * 10) / 10, scale: quality.scale, post: post?.level, trees: placedTrees, houses: houseCount, bridges: bridgeCount, lamps: lampCount, quality: quality.level, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, crowd: { total: peers.size, full: crowdStats.full, chips: crowdStats.chips, hidden: crowdStats.hidden } };
    },
    destroy() {
      state.destroyed = true;
      document.removeEventListener('visibilitychange', resetPerf);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      for (const entry of peers.values()) disposePeer(entry);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          m.map?.dispose?.();
          m.normalMap?.dispose?.();
          m.dispose?.();
        }
      });
      roadTex.dispose();
      // resources the scene owns but no material points to: the shared shadow, the painted ground, the detail textures
      shadowGeo.dispose();
      shadowMat.dispose();
      baked.color.dispose();
      baked.mask.dispose();
      detailTextures.detail?.dispose?.();
      detailTextures.road?.dispose?.();
      post?.dispose();
      envTarget?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
      labelLayer.remove();
      mascotLayer.remove();
    },
  };
  if (/[?&]debug/.test(window.location.search)) window.__map3d = Object.assign(api, { scene, renderer, camera, quality, perf, orbit, post: () => post });
  return api;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
