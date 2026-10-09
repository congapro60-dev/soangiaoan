import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');

test('3D pilot: the vendored Three.js build ships with its licence and the core file it imports', async () => {
  await access(new URL('../public/vendor/three/three.module.min.js', import.meta.url));
  await access(new URL('../public/vendor/three/three.core.min.js', import.meta.url));
  assert.match(await read('vendor/three/LICENSE'), /MIT License/);
  assert.match(await read('vendor/three/three.module.min.js'), /from"\.\/three\.core\.min\.js"/);
});

test('3D pilot: the scene orbits the pupil with a perspective camera and falls back to 2D when it cannot keep up', async () => {
  const source = await read('map3d.js');
  assert.match(source, /export function mount\(/);
  assert.match(source, /export function webglAvailable\(/);
  assert.match(source, /new THREE\.PerspectiveCamera/);
  assert.match(source, /options\.onFallback\?\.\('slow'\)/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /prefers-reduced-motion/);
});

test('3D pilot: the worlds that have a 3D theme load the new scene, from a lazy import, and the page can return to the flat map', async () => {
  const page = await read('lesson-map.html');
  assert.match(page, /PILOT_WORLDS = \{ historical: true,/);
  assert.match(page, /import\('\/map3d\.js'\)/);
  assert.match(page, /fallbackTo2D\(/);
  assert.match(page, /leavePilot\(true\)/);
});

test('3D map: the pupil can drag the map around as well as orbit, and "see the whole map" is separate from "find me"', async () => {
  const source = await read('map3d.js');
  assert.match(source, /dragAs\(mode\)/);
  assert.match(source, /function panBy\(/);
  assert.match(source, /event\.shiftKey/);
  assert.match(source, /overview,/);
  assert.match(source, /reset: frameOwn/);
  const page = await read('lesson-map.html');
  assert.match(page, /Xem cả bản đồ/);
  assert.match(page, /pilot\.overview\(\)/);
  assert.match(page, /pilot\.dragAs\(/);
});

test('3D map: nothing is baked into the ground picture; shadows, water and models are drawn in 3D', async () => {
  const source = await read('map3d.js');
  assert.doesNotMatch(source, /TextureLoader\(\)\.load\(model\.image/);
  assert.match(source, /renderer\.shadowMap\.enabled = true/);
  assert.match(source, /groundMat\.onBeforeCompile/);
  assert.match(source, /models\.arch/);
});

test('dice: the die is an object in the 3D map (idle beside the mascot, spin, throw, rest) and the page only decides when it rolls', async () => {
  const source = await read('map3d.js');
  assert.match(source, /RoundedBoxGeometry/);
  assert.match(source, /setDice,/);
  for (const mode of ["'idle'", "'spin'", "'throw'", "'rest'", "'fade'"]) assert.ok(source.includes(`dice.mode = ${mode}`), `die mode ${mode}`);
  assert.match(source, /options\.onDiceDone\?\.\(\)/);
  assert.match(source, /options\.onRollRequest\?\.\(\)/);
});

test('dice: the flat map shows its own die over the map and both maps talk to the page by messages', async () => {
  const page = await read('lesson-map.html');
  assert.match(page, /lesson-map:roll/);
  assert.match(page, /lesson-map:dice-done/);
  assert.match(page, /applyDice\(input\.dice\)/);
  assert.match(page, /lm-die/);
  const world = await readFile(new URL('../components/lesson/LessonWorldMap.tsx', import.meta.url), 'utf8');
  assert.match(world, /lesson-map:roll/);
  assert.match(world, /lesson-map:dice-done/);
  assert.match(world, /dice\?: LessonMapDice/);
});

test('slim controls: the map has three floating buttons and one menu, not a toolbar of ten', async () => {
  const page = await read('lesson-map.html');
  assert.equal((page.match(/class="lm-btn"/g) || []).length, 3);
  assert.match(page, /id="lmMenu"/);
  assert.doesNotMatch(page, /map-heading|campaign-toolbar|lesson-view-row/);
});

test('3D look: post-processing, made-on-the-spot ground detail and curved-roof models are separate modules the scene uses', async () => {
  const scene = await read('map3d.js');
  assert.match(scene, /from '\.\/map3d-post\.js'/);
  assert.match(scene, /from '\.\/map3d-textures\.js'/);
  assert.match(scene, /from '\.\/map3d-models\.js'/);
  const post = await read('map3d-post.js');
  for (const pass of ['UnrealBloomPass', 'OutputPass', 'FXAAPass', 'ScaledRenderPass']) assert.match(post, new RegExp(pass));
  // Measured on an Intel Iris Plus (1920x1080): ambient occlusion cost 72 ms, the tilt-shift blur 42 ms and 4x multisampling
  // on the float target 36 ms of a 231 ms frame. They must not come back into the default chain.
  assert.doesNotMatch(post, /GTAOPass|TiltShift|samples\s*=\s*[1-9]/);
  const models = await read('map3d-models.js');
  assert.match(models, /export function curvedRoof/);
  assert.match(models, /export function makeModels/);
});

test('3D speed: the ground colour is painted once, shadows redraw only when needed, resolution adapts without stutter', async () => {
  const scene = await read('map3d.js');
  // ground: a one-time bake into textures, then only lookups (the per-pixel noise cost 20 ms a frame)
  assert.match(scene, /function bakeGround\(\)/);
  assert.match(scene, /uBakedColor/);
  assert.doesNotMatch(scene.slice(scene.indexOf('const groundMat')), /float n1 = fb\(/);
  // shadows: snapped to shadow texels and redrawn only when the frustum moves, never unconditionally in the frame loop
  assert.match(scene, /function followSun\(/);
  const tick = scene.slice(scene.indexOf('function tick(now)'), scene.indexOf('const resetPerf'));
  assert.doesNotMatch(tick, /shadowMap\.needsUpdate = true/);
  // resolution: viewport scaling inside one render target (free), measured from real frames, never judged while hidden
  assert.match(scene, /function adaptResolution\(/);
  assert.match(scene, /function calibrate\(\)/);
  assert.match(scene, /document\.visibilityState === 'visible'/);
  assert.match(scene, /elapsed > 6000/);
  assert.match(scene, /post\.setScale\(/);
  assert.match(scene, /applyDetail\(\)/);
  assert.match(scene, /const forced = Number\(/);
  // a settled view is drawn at full size again
  assert.match(scene, /const settled = now - perf\.busyAt > 220/);
});

test('3D text: names and gate plaques are real HTML text over the canvas, not pictures of text, so they stay sharp', async () => {
  const scene = await read('map3d.js');
  assert.match(scene, /function makeLabel\(/);
  assert.match(scene, /function placeLabels\(now\)/);
  // names and plaques that would overlap are not all shown (the nearest and most important win)
  assert.match(scene, /const crowd = \[\]/);
  assert.match(scene, /labelLayer\.style\.cssText/);
  assert.doesNotMatch(scene, /nameTexture|plaqueTexture|pillTexture/);
  // the mascots, the arrow over the pupil's own and the die's hint and bubble are HTML too: the browser draws them at
  // the screen's own resolution, which is what keeps them as sharp as on the flat map
  assert.match(scene, /function makeMascot\(/);
  assert.match(scene, /function makeArrow\(/);
  assert.match(scene, /function makePill\(/);
  assert.doesNotMatch(scene, /spriteTex|entry\.body|entry\.ghost/);
  // the pieces are placed in every drawn frame, after the camera and billboards are final
  assert.ok(scene.indexOf('scaleBillboards();\n      placeLabels(now);') > 0);
});

test('3D world: the landscape is open (no mountain wall) and goes on far beyond the map, but the pupil can only pan inside the play area', async () => {
  const scene = await read('map3d.js');
  assert.match(scene, /const HX = 600/);
  assert.match(scene, /function stretchedAxis\(/);
  assert.doesNotMatch(scene, /const mountains = /);
  // the camera target stays inside the playable rectangle, exactly as before
  assert.match(scene, /orbit\.target\.x = clamp\(orbit\.target\.x, -WIDTH \* 0\.5, WIDTH \* 0\.5\)/);
  assert.match(scene, /orbit\.target\.z = clamp\(orbit\.target\.z, -DEPTH \* 0\.5, DEPTH \* 0\.5\)/);
  // the world fades into haze before its edge, and a faint far ridge says "it goes on"
  assert.match(scene, /scene\.fog\.far = Math\.max\(260, s\.dist \* 1\.9\)/);
  assert.match(scene, /const ridge = new THREE\.Mesh\(/);
});

test('3D world: the playable map is wide enough for a class of 50 (roads far apart) and everything that depends on its size follows it', async () => {
  const scene = await read('map3d.js');
  const width = Number(scene.match(/const WIDTH = (\d+)/)?.[1]);
  const depth = Number(scene.match(/const DEPTH = (\d+)/)?.[1]);
  // it was 160 x 90 and the three lanes of the road were 7 units apart; the owner asked for a bigger map
  assert.ok(width >= 240 && depth >= 150, `map ${width} x ${depth}`);
  // rivers and lakes are written in the old frame and stretched, so every new world keeps the same convention
  assert.match(scene, /const frameRiver = /);
  assert.match(scene, /river: frameRiver\(/);
  assert.match(scene, /lakes: frameLakes\(/);
  // the road mask, the painted ground and the zoom limit are derived from the map size, not from fixed numbers
  assert.match(scene, /const MASK_H = Math\.round\(\(MASK_W \* DEPTH\) \/ WIDTH\)/);
  assert.match(scene, /const BAKE_EXT = new THREE\.Vector4\(-\(WIDTH \/ 2 \+ 24\)/);
  assert.match(scene, /stretchedAxis\(WIDTH \/ 2 \+ 20, 1\.6, 70, HX\)/);
  assert.match(scene, /const MAX_DIST = 3\d\d/);
});

test('3D crowd: pupils on one cell fan out, mascots that would pile up shrink to chips and "+N" badges, and the page can thin the map out', async () => {
  const scene = await read('map3d.js');
  // pupils whose walk ends on the same cell get slots around it (the pupil's own mascot keeps the middle)
  assert.match(scene, /function assignSlots\(\)/);
  assert.match(scene, /function standAt\(entry, along\)/);
  assert.match(scene, /2\.39996323/);
  // one shared shadow shape: fifty pupils must not be fifty geometries
  assert.match(scene, /const shadowGeo = new THREE\.CircleGeometry\(1, 20\)/);
  assert.match(scene, /if \(o\.userData\.shared\) return;/);
  // overlapping mascots: full -> chip -> counted in a badge
  assert.match(scene, /lod = 'chip'/);
  assert.match(scene, /lod = 'hidden'/);
  assert.match(scene, /function badgeAt\(index\)/);
  assert.match(scene, /crowd: \{ total: peers\.size/);
  const page = await read('lesson-map.html');
  // the choice of which mascots to show lives in the page, so it also thins out the flat map
  for (const mode of ['all', 'near', 'lead', 'pick', 'me']) assert.ok(page.includes(`data-mode="${mode}"`) || page.includes(`'${mode}'`), `filter mode ${mode}`);
  assert.match(page, /function visiblePeers\(input\)/);
  assert.match(page, /var peers = visiblePeers\(input\)\.map\(/);
  assert.match(page, /Linh vật trên bản đồ/);
  assert.match(page, /Bỏ chọn hết/);
  assert.match(page, /localStorage\.setItem\(FILTER_KEY/);
  // a pupil's own mascot is never filtered out, and "near" / "only me" make no sense for a teacher who has none
  assert.match(page, /if \(own\) keep\[own\.id\] = true;/);
  assert.match(page, /\(mode === 'near' \|\| mode === 'me'\) && !own/);
});

test('3D worlds: all twelve worlds have a theme with a known kit and tree kinds that kit can build, and the page offers exactly those worlds in 3D', async () => {
  const { THEMES } = await import('../public/map3d-themes.js');
  const page = await read('lesson-map.html');
  const data = await readFile(new URL('../public/campaign-data.js', import.meta.url), 'utf8');
  const listed = Object.keys(JSON.parse(page.match(/var PILOT_WORLDS = (\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":'))).sort();
  assert.deepEqual(Object.keys(THEMES).sort(), listed, 'the themes and the worlds listed in lesson-map.html are the same set');
  assert.equal(listed.length, 12);
  for (const world of listed) assert.ok(data.includes(`${world}:`) || data.includes(`"${world}"`) || data.includes(`'${world}'`), `${world} is a world of the campaign`);

  const kits = await read('map3d-kits.js');
  const kitNames = [...kits.matchAll(/^\s{2}(\w+): \w+,$/gm)].map((m) => m[1]);
  const kitFile = { citadel: 'map3d-models.js', scifi: 'map3d-kit-scifi.js', city: 'map3d-kit-city.js', campus: 'map3d-kit-city.js', farm: 'map3d-kit-farm.js', tropical: 'map3d-kit-farm.js', blocks: 'map3d-kit-blocks.js', academy: 'map3d-kit-academy.js' };
  assert.deepEqual(kitNames.sort(), Object.keys(kitFile).sort());
  const baseKinds = ['pine', 'round', 'blossom', 'bamboo'];
  for (const [world, theme] of Object.entries(THEMES)) {
    assert.ok(kitFile[theme.kit], `${world}: unknown kit ${theme.kit}`);
    const source = await read(kitFile[theme.kit]);
    for (const [kind] of theme.trees) assert.ok(baseKinds.includes(kind) || source.includes(`models.${kind} =`), `${world}: tree kind ${kind} is not built by kit ${theme.kit}`);
    for (const key of ['roof', 'wall', 'pillar', 'trim']) assert.equal(typeof theme[key], 'number', `${world}.${key}`);
    for (const key of ['grassA', 'grassB', 'dry', 'dirt', 'rock', 'rockDark', 'sand', 'roadA', 'roadB']) assert.equal(typeof theme.palette[key], 'number', `${world}.palette.${key}`);
    assert.ok(theme.river.length >= 2 && theme.lakes.length >= 1, `${world}: a river and a lake`);
    assert.ok(Number.isInteger(theme.seed), `${world}: seed`);
    // a world whose people are not villagers needs a walker in its kit
    if (theme.life?.walkers && theme.life.walkers !== 'villager') assert.ok(source.includes('models.walker'), `${world}: kit ${theme.kit} has no walker`);
  }
});

test('cockpit: one control bar (clock, primary action, TV, menu) replaces the row of eight buttons, and the room code stays visible after a refresh', async () => {
  const dashboard = await readFile(new URL('../app/lessons/lesson-dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboard, /className="cockpit-bar"/);
  assert.match(dashboard, /className="cockpit-more-menu"/);
  assert.match(dashboard, /active_teacher_session_code/);
  const menuAt = dashboard.indexOf('className="cockpit-more-menu"');
  const before = dashboard.slice(dashboard.indexOf('cockpit-bar-right'), menuAt);
  for (const rare of ['Khóa nộp bài', 'Đổi mã TV', 'Xuất báo cáo CSV', 'Kết thúc tiết học']) {
    assert.ok(!before.includes(rare), rare + ' is not on the bar itself');
    assert.ok(dashboard.indexOf(rare, menuAt) > menuAt, rare + ' is in the menu');
  }
});
