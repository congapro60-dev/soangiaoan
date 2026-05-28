export type AdaptiveSimulationKind = 'geometry2d' | 'geometry3d' | 'graph2d' | 'algebra' | 'probability' | 'physics' | 'chemistry' | 'htmlMiniApp';
export type AdaptiveSimulationEngine = 'svg' | 'threejs' | 'geogebra' | 'desmos' | 'html';
export type SimulationStepPlacement = 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

export interface SimulationQuestion {
  id: string;
  prompt: string;
  expectedObservation: string;
  hint?: string;
}

export interface SimulationNotebookEntry {
  id: string;
  title: string;
  content: string;
}

export interface SimulationPoint2D {
  id: string;
  label: string;
  x: number;
  y: number;
  draggable?: boolean;
  color?: string;
}

export interface SimulationSegment2D {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  color?: string;
  width?: number;
}

export interface SimulationCircle2D {
  id: string;
  center: string;
  through?: string;
  radius?: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface SimulationPolygon2D {
  id: string;
  pointIds: string[];
  label?: string;
  fill?: string;
  stroke?: string;
  opacity?: number;
}

export interface Geometry2DSimulationSpec {
  points: SimulationPoint2D[];
  segments?: SimulationSegment2D[];
  circles?: SimulationCircle2D[];
  polygons?: SimulationPolygon2D[];
  showGrid?: boolean;
  viewBox?: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
}

export interface SimulationPoint3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  color?: string;
}

export interface SimulationSegment3D {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  color?: string;
  radius?: number;
}

export interface SimulationFace3D {
  id: string;
  pointIds: string[];
  label?: string;
  fill?: string;
  opacity?: number;
  visible?: boolean;
  doubleSide?: boolean;
}

export interface SimulationPlane3D {
  id: string;
  pointIds: string[];
  label?: string;
  fill?: string;
  opacity?: number;
  visible?: boolean;
}

export interface Geometry3DSimulationSpec {
  points: SimulationPoint3D[];
  segments?: SimulationSegment3D[];
  faces?: SimulationFace3D[];
  planes?: SimulationPlane3D[];
  camera?: {
    x: number;
    y: number;
    z: number;
  };
  projection?: 'perspective' | 'orthographic';
  showAxes?: boolean;
  autoRotate?: boolean;
  initialVisibleLayers?: string[];
}

export interface SimulationMathModel {
  givens: string[];
  formulas: string[];
  invariants?: string[];
  coordinateSystem?: string;
  projection?: 'cartesian2d' | 'orthographic3d' | 'perspective3d';
}

export interface SimulationPedagogyScript {
  modeLabels?: {
    textbook?: string;
    realistic?: string;
  };
  steps: string[];
  realtimeReadouts?: string[];
  teacherControls?: string[];
}

export interface HtmlSimulationSpec {
  /**
   * Self-contained HTML document rendered through iframe[srcdoc].
   * Must not depend on parent DOM, cookies, localStorage, or external network by default.
   */
  srcDoc: string;
  height?: number;
  offlineSingleFile?: boolean;
  libraries?: Array<'vanilla-canvas' | 'svg' | 'mathjax' | 'katex' | 'p5' | 'matterjs' | 'threejs' | 'jsxgraph' | 'geogebra' | 'desmos'>;
  safetyNotes?: string[];
}

export interface AdaptiveSimulationSpec {
  id: string;
  title: string;
  description: string;
  kind: AdaptiveSimulationKind;
  engine: AdaptiveSimulationEngine;
  placement: SimulationStepPlacement;
  objectiveIds: string[];
  studentTask: string;
  interactions: string[];
  questions: SimulationQuestion[];
  notebookEntries: SimulationNotebookEntry[];
  mathModel?: SimulationMathModel;
  pedagogyScript?: SimulationPedagogyScript;
  geometry2d?: Geometry2DSimulationSpec;
  geometry3d?: Geometry3DSimulationSpec;
  html?: HtmlSimulationSpec;
}

export const sampleGeometry3DPyramidSimulation: AdaptiveSimulationSpec = {
  id: 'sample-geometry3d-pyramid',
  title: 'Hình chóp S.ABCD xoay được',
  description: 'Mô phỏng 3D giúp học sinh xoay hình chóp, bật/tắt đường cao và quan sát quan hệ vuông góc với mặt đáy.',
  kind: 'geometry3d',
  engine: 'threejs',
  placement: 'step2',
  objectiveIds: [],
  studentTask: 'Xoay mô hình, bật đường cao SO và quan sát vì sao SO vuông góc với mặt phẳng đáy ABCD.',
  interactions: ['Xoay mô hình', 'Phóng to/thu nhỏ', 'Bật/tắt mặt đáy', 'Bật/tắt đường cao', 'Đổi góc nhìn'],
  questions: [
    {
      id: 'q1',
      prompt: 'Khi xoay hình, điểm O nằm ở vị trí nào so với đáy ABCD?',
      expectedObservation: 'O nằm trên mặt phẳng đáy và thường được chọn là tâm/hình chiếu của S xuống đáy.',
      hint: 'Bật lớp đường cao SO và nhìn từ trên xuống.',
    },
    {
      id: 'q2',
      prompt: 'Đường SO cho ta thông tin gì về khoảng cách từ S đến mặt phẳng đáy?',
      expectedObservation: 'Nếu SO vuông góc với mặt đáy thì SO là khoảng cách từ S đến mặt phẳng đáy.',
    },
  ],
  notebookEntries: [
    {
      id: 'note1',
      title: 'Khoảng cách từ điểm đến mặt phẳng',
      content: 'Khoảng cách từ điểm $S$ đến mặt phẳng $(ABCD)$ là độ dài đoạn vuông góc kẻ từ $S$ đến mặt phẳng đó, ví dụ $SO$.',
    },
  ],
  geometry3d: {
    showAxes: true,
    autoRotate: false,
    camera: { x: 5, y: 4, z: 6 },
    points: [
      { id: 'A', label: 'A', x: -2, y: 0, z: -2 },
      { id: 'B', label: 'B', x: 2, y: 0, z: -2 },
      { id: 'C', label: 'C', x: 2, y: 0, z: 2 },
      { id: 'D', label: 'D', x: -2, y: 0, z: 2 },
      { id: 'O', label: 'O', x: 0, y: 0, z: 0, color: '#f97316' },
      { id: 'S', label: 'S', x: 0, y: 3.4, z: 0, color: '#7c3aed' },
    ],
    segments: [
      { id: 'AB', from: 'A', to: 'B' },
      { id: 'BC', from: 'B', to: 'C' },
      { id: 'CD', from: 'C', to: 'D', dashed: true },
      { id: 'DA', from: 'D', to: 'A', dashed: true },
      { id: 'SA', from: 'S', to: 'A' },
      { id: 'SB', from: 'S', to: 'B' },
      { id: 'SC', from: 'S', to: 'C' },
      { id: 'SD', from: 'S', to: 'D', dashed: true },
      { id: 'SO', from: 'S', to: 'O', color: '#f97316', radius: 0.025 },
    ],
    faces: [
      { id: 'base', label: 'Đáy ABCD', pointIds: ['A', 'B', 'C', 'D'], fill: '#60a5fa', opacity: 0.18 },
      { id: 'sab', pointIds: ['S', 'A', 'B'], fill: '#a78bfa', opacity: 0.12 },
      { id: 'sbc', pointIds: ['S', 'B', 'C'], fill: '#34d399', opacity: 0.12 },
      { id: 'sac', label: 'Mặt phẳng SAC', pointIds: ['S', 'A', 'C'], fill: '#f59e0b', opacity: 0.2 },
    ],
  },
};

export const sampleGeometry2DTriangleSimulation: AdaptiveSimulationSpec = {
  id: 'sample-geometry2d-triangle',
  title: 'Tam giác ABC có điểm kéo tương tác',
  description: 'Mô phỏng SVG giúp học sinh kéo đỉnh C và quan sát sự thay đổi độ dài, góc hoặc diện tích.',
  kind: 'geometry2d',
  engine: 'svg',
  placement: 'step2',
  objectiveIds: [],
  studentTask: 'Kéo điểm C để quan sát tam giác thay đổi nhưng đáy AB giữ nguyên.',
  interactions: ['Kéo điểm C', 'Bật/tắt đường cao', 'Quan sát diện tích'],
  questions: [
    {
      id: 'q1',
      prompt: 'Khi giữ đáy AB cố định, yếu tố nào làm diện tích tam giác thay đổi?',
      expectedObservation: 'Chiều cao từ C xuống AB quyết định phần thay đổi của diện tích khi AB cố định.',
    },
  ],
  notebookEntries: [
    {
      id: 'note1',
      title: 'Diện tích tam giác',
      content: 'Diện tích tam giác có đáy $a$ và chiều cao $h$ là $S = \frac{1}{2}ah$.',
    },
  ],
  geometry2d: {
    showGrid: true,
    viewBox: { minX: 0, minY: 0, width: 640, height: 360 },
    points: [
      { id: 'A', label: 'A', x: 120, y: 290 },
      { id: 'B', label: 'B', x: 520, y: 290 },
      { id: 'C', label: 'C', x: 320, y: 80, draggable: true, color: '#7c3aed' },
      { id: 'H', label: 'H', x: 320, y: 290, color: '#f97316' },
    ],
    segments: [
      { id: 'AB', from: 'A', to: 'B', width: 3 },
      { id: 'BC', from: 'B', to: 'C', width: 3 },
      { id: 'CA', from: 'C', to: 'A', width: 3 },
      { id: 'CH', from: 'C', to: 'H', dashed: true, color: '#f97316', width: 2 },
    ],
    polygons: [
      { id: 'ABC', pointIds: ['A', 'B', 'C'], fill: '#93c5fd', stroke: '#2563eb', opacity: 0.18 },
    ],
  },
};
