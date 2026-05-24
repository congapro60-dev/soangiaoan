import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AdaptiveSimulationSpec, SimulationPoint3D } from '../../lib/adaptive/simulationTypes';

interface Geometry3DSimulationProps {
  spec: AdaptiveSimulationSpec;
}

interface LabelState {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

const getPointMap = (points: SimulationPoint3D[]) => new Map(points.map(point => [point.id, point]));
const toVector = (point: SimulationPoint3D) => new THREE.Vector3(point.x, point.y, point.z);

const makeTextSprite = (text: string, color = '#0f172a') => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255,255,255,0.88)';
    context.strokeStyle = 'rgba(148,163,184,0.7)';
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(10, 10, 108, 40, 14);
    context.fill();
    context.stroke();
    context.fillStyle = color;
    context.font = 'bold 26px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 31);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.55, 0.28, 1);
  return sprite;
};

const createLine = (from: THREE.Vector3, to: THREE.Vector3, color: string, dashed?: boolean) => {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.16, gapSize: 0.1, linewidth: 2 })
    : new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
};

const createFace = (vertices: THREE.Vector3[], fill: string, opacity: number, doubleSide = true) => {
  const shapeGeometry = new THREE.BufferGeometry();
  const triangles: number[] = [];
  for (let index = 1; index < vertices.length - 1; index += 1) {
    triangles.push(0, index, index + 1);
  }
  const positions = new Float32Array(vertices.flatMap(vertex => [vertex.x, vertex.y, vertex.z]));
  shapeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  shapeGeometry.setIndex(triangles);
  shapeGeometry.computeVertexNormals();
  return new THREE.Mesh(
    shapeGeometry,
    new THREE.MeshStandardMaterial({
      color: fill,
      transparent: true,
      opacity,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
};

export const Geometry3DSimulation = ({ spec }: Geometry3DSimulationProps) => {
  const geometry = spec.geometry3d;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [labels, setLabels] = useState<LabelState[]>([]);
  const [autoRotate, setAutoRotate] = useState(Boolean(geometry?.autoRotate));
  const [showFaces, setShowFaces] = useState(true);
  const [showDashed, setShowDashed] = useState(true);

  const pointMap = useMemo(() => getPointMap(geometry?.points || []), [geometry?.points]);

  useEffect(() => {
    if (!geometry || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 760;
    const height = 520;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');

    const cameraPosition = geometry.camera || { x: 5, y: 4, z: 6 };
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight('#ffffff', 1.8));
    const directionalLight = new THREE.DirectionalLight('#ffffff', 2.2);
    directionalLight.position.set(4, 8, 5);
    scene.add(directionalLight);

    const group = new THREE.Group();
    scene.add(group);

    if (geometry.showAxes) {
      const axes = new THREE.AxesHelper(3.2);
      axes.name = 'axes';
      scene.add(axes);
    }

    const faceGroup = new THREE.Group();
    faceGroup.name = 'faces';
    (geometry.faces || []).forEach(face => {
      if (face.visible === false) return;
      const vertices = face.pointIds.map(id => pointMap.get(id)).filter(Boolean).map(point => toVector(point as SimulationPoint3D));
      if (vertices.length < 3) return;
      faceGroup.add(createFace(vertices, face.fill || '#60a5fa', face.opacity ?? 0.18, face.doubleSide ?? true));
    });
    (geometry.planes || []).forEach(plane => {
      if (plane.visible === false) return;
      const vertices = plane.pointIds.map(id => pointMap.get(id)).filter(Boolean).map(point => toVector(point as SimulationPoint3D));
      if (vertices.length < 3) return;
      faceGroup.add(createFace(vertices, plane.fill || '#f59e0b', plane.opacity ?? 0.2, true));
    });
    group.add(faceGroup);

    const solidLineGroup = new THREE.Group();
    solidLineGroup.name = 'solid-lines';
    const dashedLineGroup = new THREE.Group();
    dashedLineGroup.name = 'dashed-lines';
    (geometry.segments || []).forEach(segment => {
      const fromPoint = pointMap.get(segment.from);
      const toPoint = pointMap.get(segment.to);
      if (!fromPoint || !toPoint) return;
      const line = createLine(toVector(fromPoint), toVector(toPoint), segment.color || '#0f172a', segment.dashed);
      if (segment.dashed) dashedLineGroup.add(line);
      else solidLineGroup.add(line);
    });
    group.add(solidLineGroup);
    group.add(dashedLineGroup);

    (geometry.points || []).forEach(point => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 24, 24),
        new THREE.MeshStandardMaterial({ color: point.color || '#2563eb', roughness: 0.55 })
      );
      sphere.position.copy(toVector(point));
      group.add(sphere);

      const label = makeTextSprite(point.label, point.color || '#0f172a');
      label.position.set(point.x + 0.13, point.y + 0.18, point.z + 0.13);
      group.add(label);
    });

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    groupRef.current = group;

    const render = () => {
      if (autoRotate) group.rotation.y += 0.006;
      faceGroup.visible = showFaces;
      dashedLineGroup.visible = showDashed;
      renderer.render(scene, camera);
      animationRef.current = window.requestAnimationFrame(render);
    };
    render();

    const updateSize = () => {
      const nextWidth = container.clientWidth || width;
      camera.aspect = nextWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, height);
    };
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      scene.clear();
      container.innerHTML = '';
    };
  }, [autoRotate, geometry, pointMap, showDashed, showFaces]);

  useEffect(() => {
    const updateLabels = () => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const group = groupRef.current;
      if (!camera || !renderer || !group || !geometry) return;

      const width = renderer.domElement.clientWidth;
      const height = renderer.domElement.clientHeight;
      const nextLabels = geometry.points.map(point => {
        const vector = toVector(point).applyMatrix4(group.matrixWorld).project(camera);
        return {
          id: point.id,
          label: point.label,
          x: (vector.x * 0.5 + 0.5) * width,
          y: (-vector.y * 0.5 + 0.5) * height,
          visible: vector.z >= -1 && vector.z <= 1,
        };
      });
      setLabels(nextLabels);
    };

    const interval = window.setInterval(updateLabels, 120);
    updateLabels();
    return () => window.clearInterval(interval);
  }, [geometry]);

  if (!geometry) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-700">
        Mô phỏng 3D chưa có dữ liệu hình học.
      </div>
    );
  }

  const rotateGroup = (deltaX: number, deltaY: number) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += deltaX * 0.01;
    group.rotation.x += deltaY * 0.01;
  };

  const zoomCamera = (deltaY: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const factor = deltaY > 0 ? 1.08 : 0.92;
    camera.position.multiplyScalar(factor);
    camera.position.clampLength(2.2, 16);
    camera.lookAt(0, 0, 0);
  };

  const resetView = () => {
    const camera = cameraRef.current;
    const group = groupRef.current;
    if (!camera || !group) return;
    const cameraPosition = geometry.camera || { x: 5, y: 4, z: 6 };
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(0, 0, 0);
    group.rotation.set(0, 0, 0);
  };

  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-600">Three.js Geometry 3D</p>
          <h3 className="text-lg font-black text-slate-900">{spec.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{spec.studentTask}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAutoRotate(prev => !prev)} className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100">
            {autoRotate ? 'Dừng tự xoay' : 'Tự xoay'}
          </button>
          <button type="button" onClick={() => setShowFaces(prev => !prev)} className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
            {showFaces ? 'Ẩn mặt' : 'Hiện mặt'}
          </button>
          <button type="button" onClick={() => setShowDashed(prev => !prev)} className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100">
            {showDashed ? 'Ẩn nét khuất' : 'Hiện nét khuất'}
          </button>
          <button type="button" onClick={resetView} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
            Reset góc nhìn
          </button>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50"
        onPointerDown={event => {
          draggingRef.current = true;
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!draggingRef.current) return;
          const deltaX = event.clientX - lastPointerRef.current.x;
          const deltaY = event.clientY - lastPointerRef.current.y;
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
          rotateGroup(deltaX, deltaY);
        }}
        onPointerUp={() => { draggingRef.current = false; }}
        onPointerLeave={() => { draggingRef.current = false; }}
        onWheel={event => {
          event.preventDefault();
          zoomCamera(event.deltaY);
        }}
      >
        <div ref={containerRef} className="h-[520px] w-full" />
        <div className="pointer-events-none absolute inset-0">
          {labels.map(label => label.visible && (
            <span
              key={label.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-xs font-black text-slate-800 shadow-sm ring-1 ring-slate-200"
              style={{ left: label.x, top: label.y }}
            >
              {label.label}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl bg-white/90 px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
          Kéo để xoay · Cuộn để zoom · Bật/tắt lớp hình ở phía trên
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {spec.questions.map(question => (
          <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Câu hỏi quan sát</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{question.prompt}</p>
            <p className="mt-2 text-xs font-semibold text-violet-700">Gợi ý: {question.hint || question.expectedObservation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
