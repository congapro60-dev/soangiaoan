import * as THREE from 'three';

export function createOwlLayer({ load, changed, reduced = false, enabled = true } = {}) {
  let template = null;
  let loading = false;
  let loadError = false;
  let disposed = false;
  let templateDisposed = false;
  let origHeight = 1;
  const center = new THREE.Vector3();
  const box = new THREE.Box3();
  const instances = new Map();
  let idleElapsed = 0;

  function disposeTemplate(tmpl) {
    if (!tmpl || templateDisposed) return;
    templateDisposed = true;
    const geoms = new Set(), mats = new Set();
    tmpl.scene.traverse(node => {
      if (node.geometry) geoms.add(node.geometry);
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach(m => mats.add(m));
        else mats.add(node.material);
      }
    });
    geoms.forEach(g => g.dispose());
    mats.forEach(m => m.dispose());
  }

  function ensureLoading() {
    if (template || loading || loadError || disposed) return;
    loading = true;
    const loader = load ? load() : import('./vendor/three/addons/loaders/GLTFLoader.js')
      .then(m => new m.GLTFLoader().loadAsync('/models/mascot-owl.glb'));
    loader.then(gltf => {
      loading = false;
      if (disposed) {
        disposeTemplate(gltf);
        return;
      }
      template = gltf;
      box.setFromObject(template.scene);
      box.getCenter(center);
      origHeight = (box.max.y - box.min.y) || 1;
      changed?.();
    }).catch(() => {
      loading = false;
      loadError = true;
    });
  }

  function createInstance(item) {
    const cloneScene = template.scene.clone(true);
    const origNodes = [], cloneNodes = [];
    template.scene.traverse(n => origNodes.push(n));
    cloneScene.traverse(n => cloneNodes.push(n));
    const boneMap = new Map();
    for (let i = 0; i < origNodes.length; i++) boneMap.set(origNodes[i], cloneNodes[i]);

    const skeletons = [];
    cloneScene.traverse(node => {
      if (node.isSkinnedMesh && node.skeleton) {
        const origSkel = node.skeleton;
        const newBones = origSkel.bones.map(b => { const mapped = boneMap.get(b); if (!mapped) throw Error("Invalid owl skeleton"); return mapped; });
        const newSkel = new THREE.Skeleton(newBones, origSkel.boneInverses ? origSkel.boneInverses.map(m => m.clone()) : undefined);
        node.bind(newSkel, node.bindMatrix);
        skeletons.push(newSkel);
      }
    });

    cloneScene.position.set(-center.x, -box.min.y, -center.z);
    const wrapper = new THREE.Group();
    wrapper.add(cloneScene);
    wrapper.scale.setScalar(item.height / origHeight);
    wrapper.rotation.y = item.yaw || 0;
    item.entry.group.add(wrapper);

    const mixer = new THREE.AnimationMixer(cloneScene);
    const actions = {};
    for (const clip of template.animations || []) {
      actions[clip.name] = mixer.clipAction(clip);
    }

    const inst = {
      entry: item.entry,
      item,
      wrapper,
      cloneScene,
      skeletons,
      mixer,
      actions,
      state: 'idle'
    };

    if (reduced) {
      actions.idle?.play();
      mixer.setTime(0);
    } else if (item.entry.walkT < 1) {
      actions.walk?.play();
      inst.state = 'walk';
    } else {
      actions.idle?.play();
      inst.state = 'idle';
    }

    mixer.addEventListener('finished', e => {
      if (inst.state === 'hop' && (!actions.hop || e.action === actions.hop)) {
        actions.hop?.stop();
        actions.idle?.reset().play();
        inst.state = 'idle';
      }
    });

    return inst;
  }

  function dropInstance(inst) {
    inst.mixer.stopAllAction();
    inst.mixer.uncacheRoot(inst.cloneScene);
    for (const s of inst.skeletons) s.dispose();
    if (inst.wrapper.parent) inst.wrapper.parent.remove(inst.wrapper);
    instances.delete(inst.entry);
  }

  function drop(entry) {
    let inst = instances.get(entry);
    if (!inst) {
      for (const [e, v] of instances) {
        if (e === entry || e.id === entry) { inst = v; break; }
      }
    }
    if (inst) dropInstance(inst);
  }

  function sync(items, quality) {
    if (disposed || !enabled) return new Set();
    if (quality >= 2) {
      for (const inst of Array.from(instances.values())) dropInstance(inst);
      return new Set();
    }
    const eligible = (items || []).filter(it => it.entry && it.entry.mascot === 1);
    if (eligible.length) ensureLoading();
    if (!template) return new Set();
    // ponytail: cap3 owl instances max, increase when GPU tiering allows
    eligible.sort((a, b) => (b.entry.own ? 1 : 0) - (a.entry.own ? 1 : 0) || a.depth - b.depth);
    const activeItems = eligible.slice(0, 3);
    const activeEntries = new Set(activeItems.map(it => it.entry));

    for (const [e, inst] of Array.from(instances.entries())) {
      if (!activeEntries.has(e)) dropInstance(inst);
    }

    for (const it of activeItems) {
      let inst = instances.get(it.entry);
      if (!inst) {
        inst = createInstance(it);
        instances.set(it.entry, inst);
      } else {
        inst.item = it;
        inst.wrapper.scale.setScalar(it.height / origHeight);
        inst.wrapper.rotation.y = it.yaw || 0;
      }
    }

    return activeEntries;
  }

  function step(dt) {
    if (disposed || reduced || instances.size === 0) return false;
    const clampedDt = Math.min(Math.max(0, dt || 0), 0.1);
    const busy = [...instances.values()].some(inst => inst.entry.walkT < 1 || inst.state !== 'idle');
    idleElapsed += clampedDt;
    if (!busy && idleElapsed < 1 / 12) return false;
    const advance = busy ? clampedDt : idleElapsed;
    idleElapsed = 0;
    for (const inst of instances.values()) {
      const isWalking = inst.entry.walkT < 1;
      if (isWalking) {
        if (inst.state !== 'walk') {
          inst.actions.hop?.stop();
          inst.actions.idle?.stop();
          inst.actions.walk?.reset().play();
          inst.state = 'walk';
        }
      } else if (inst.state === 'walk') {
        inst.actions.walk?.stop();
        if (inst.actions.hop) {
          inst.state = 'hop';
          inst.actions.hop.reset();
          inst.actions.hop.setLoop(THREE.LoopOnce, 1);
          inst.actions.hop.clampWhenFinished = true;
          inst.actions.hop.play();
        } else {
          inst.actions.idle?.reset().play();
          inst.state = 'idle';
        }
      }
      inst.mixer.update(advance);
    }
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const inst of Array.from(instances.values())) dropInstance(inst);
    if (template) {
      disposeTemplate(template);
      template = null;
    }
  }

  function stats() {
    return { active: instances.size, loaded: !!template, loading, failed: loadError, clips: [...instances.values()].map(inst => inst.state) };
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) for (const inst of [...instances.values()]) dropInstance(inst);
    changed?.();
  }

  return { sync, step, drop, dispose, stats, setEnabled };
}
