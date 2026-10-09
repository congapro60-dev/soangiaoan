// Post-processing for the 3D map: dynamic resolution, a gentle glow on lights at night, colour grading with a vignette,
// tone mapping and a cheap edge smoothing (FXAA). It used to carry ambient occlusion, a tilt-shift blur and 4x
// multisampling too, but measured on an Intel Iris Plus those cost 150 ms of a 230 ms frame, so they are gone: shadows,
// baked vertex shading and the sky light give the depth instead.
//
// Dynamic resolution: the scene is drawn into the lower-left part of a full-size render target (no re-allocation,
// so changing the amount is free) and the first screen pass stretches that part back over the whole target. FXAA then
// runs at full size, so a reduced picture is still smooth. When nothing moves the scale goes back to 1 (crisp).
//   level 0 = glow at night + grade + FXAA     levels 1 and 2 = grade + FXAA
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';

// Runs on linear colour before tone mapping: stretches the part of the target that was drawn, then adds a touch of
// saturation, warm highlights over cool shadows and a vignette.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uScale: { value: new THREE.Vector2(1, 1) },
    uMax: { value: new THREE.Vector2(1, 1) },
    uSat: { value: 1.12 },
    uWarm: { value: 1.0 },
    uVignette: { value: 0.55 },
    uNight: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uScale, uMax;
    uniform float uSat, uWarm, uVignette, uNight;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, min(vUv * uScale, uMax));
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      vec3 shadowTint = mix(vec3(-0.004, 0.002, 0.012), vec3(-0.01, 0.0, 0.03), uNight);
      vec3 lightTint = mix(vec3(0.03, 0.014, -0.02), vec3(0.0, 0.01, 0.03), uNight);
      c.rgb += mix(shadowTint, lightTint, smoothstep(0.05, 0.9, l)) * uWarm;
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.92);
      float v = smoothstep(0.92, 0.28, length(d));
      c.rgb *= mix(1.0, v, uVignette);
      gl_FragColor = c;
    }`,
};

// Gives back the crispness that FXAA, the stretch and the tone mapping take away: each pixel is pushed away from the
// average of its four neighbours, but never beyond the darkest and lightest neighbour (plus a small margin), so no
// halos appear around edges.
const SharpenShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, amount: { value: 0.55 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, resolution.y)).rgb;
      vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, resolution.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(resolution.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, vUv - vec2(resolution.x, 0.0)).rgb;
      vec3 lo = min(c, min(min(n, s), min(e, w)));
      vec3 hi = max(c, max(max(n, s), max(e, w)));
      vec3 sharp = c + (c * 4.0 - n - s - e - w) * amount;
      gl_FragColor = vec4(clamp(sharp, lo - 0.035, hi + 0.035), 1.0);
    }`,
};

class SharpenPass extends ShaderPass {
  constructor() {
    super(SharpenShader);
  }

  setSize(width, height) {
    this.material.uniforms.resolution.value.set(1 / width, 1 / height);
  }
}

// Draws the scene into only the lower-left `scale` part of the target.
class ScaledRenderPass extends RenderPass {
  constructor(scene, camera) {
    super(scene, camera);
    this.scale = 1;
    this.drawn = new THREE.Vector2(1, 1);
  }

  render(renderer, writeBuffer, readBuffer, ...rest) {
    const w = readBuffer.width;
    const h = readBuffer.height;
    const vw = Math.max(2, Math.min(w, Math.round(w * this.scale)));
    const vh = Math.max(2, Math.min(h, Math.round(h * this.scale)));
    this.drawn.set(vw / w, vh / h);
    const partial = vw < w || vh < h;
    if (partial) {
      readBuffer.viewport.set(0, 0, vw, vh);
      readBuffer.scissor.set(0, 0, vw, vh);
      readBuffer.scissorTest = true;
    }
    super.render(renderer, writeBuffer, readBuffer, ...rest);
    if (partial) {
      readBuffer.viewport.set(0, 0, w, h);
      readBuffer.scissor.set(0, 0, w, h);
      readBuffer.scissorTest = false;
    }
  }
}

export function createPost({ renderer, scene, camera, width, height, pixelRatio, level }) {
  const post = { level: -1, composer: null, renderPass: null, bloom: null, grade: null, fxaa: null, sharpen: null, night: false, scale: 1 };
  let w = width;
  let h = height;
  let dpr = pixelRatio;

  function dispose() {
    post.composer?.passes.forEach((p) => p.dispose?.());
    post.composer?.renderTarget1?.dispose();
    post.composer?.renderTarget2?.dispose();
    post.composer = post.renderPass = post.bloom = post.grade = post.fxaa = post.sharpen = null;
  }

  function sizeBloom() {
    // the glow is soft anyway: start its mip chain at a quarter of the screen
    post.bloom?.setSize(Math.max(2, Math.round((w * dpr) / 2)), Math.max(2, Math.round((h * dpr) / 2)));
  }

  function build(next) {
    dispose();
    post.level = next;
    const composer = new EffectComposer(renderer);
    composer.renderTarget1.samples = 0;
    composer.renderTarget2.samples = 0;
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    const renderPass = new ScaledRenderPass(scene, camera);
    composer.addPass(renderPass);
    post.renderPass = renderPass;

    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    post.grade = grade;

    if (next === 0) {
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.75, 0.8);
      bloom.enabled = post.night;
      composer.addPass(bloom);
      post.bloom = bloom;
    }

    composer.addPass(new OutputPass());
    const fxaa = new FXAAPass();
    composer.addPass(fxaa);
    post.fxaa = fxaa;
    const sharpen = new SharpenPass();
    composer.addPass(sharpen);
    post.sharpen = sharpen;
    post.composer = composer;
    composer.setSize(w, h);
    sizeBloom();
    api.setNight(post.night);
  }

  const api = {
    get level() {
      return post.level;
    },
    get active() {
      return Boolean(post.composer);
    },
    get composer() {
      return post.composer;
    },
    setLevel(next) {
      const want = next === 0 ? 0 : 1;
      if (want !== post.level) build(want);
    },
    setSize(nw, nh, ndpr) {
      w = nw;
      h = nh;
      dpr = ndpr;
      if (!post.composer) return;
      post.composer.setPixelRatio(dpr);
      post.composer.setSize(w, h);
      sizeBloom();
    },
    /** Fraction (0.3 to 1) of the picture's width and height that is really drawn; the rest is stretched. */
    setScale(scale) {
      post.scale = Math.min(1, Math.max(0.3, scale));
    },
    setNight(night) {
      post.night = night;
      if (post.bloom) {
        post.bloom.enabled = night;
        post.bloom.strength = 0.85;
        post.bloom.threshold = 0.8;
      }
      if (post.grade) {
        post.grade.uniforms.uNight.value = night ? 1 : 0;
        post.grade.uniforms.uVignette.value = night ? 0.7 : 0.5;
      }
    },
    /** Turns single passes on or off (used when measuring). */
    setPasses({ bloom, fxaa, sharpen } = {}) {
      if (post.sharpen && sharpen !== undefined) post.sharpen.enabled = Boolean(sharpen);
      if (post.bloom && bloom !== undefined) post.bloom.enabled = Boolean(bloom);
      if (post.fxaa && fxaa !== undefined) post.fxaa.enabled = Boolean(fxaa);
    },
    render() {
      const pass = post.renderPass;
      pass.scale = post.scale;
      const u = post.grade.uniforms;
      // what the scene pass will draw this frame, so the grade pass stretches exactly that part
      const rw = post.composer.renderTarget1.width;
      const rh = post.composer.renderTarget1.height;
      const vw = Math.max(2, Math.min(rw, Math.round(rw * post.scale)));
      const vh = Math.max(2, Math.min(rh, Math.round(rh * post.scale)));
      u.uScale.value.set(vw / rw, vh / rh);
      u.uMax.value.set((vw - 0.5) / rw, (vh - 0.5) / rh);
      post.composer.render();
    },
    dispose,
  };
  build(level === 0 ? 0 : 1);
  return api;
}
