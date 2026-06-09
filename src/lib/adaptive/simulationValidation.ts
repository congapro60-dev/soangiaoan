import type {
  AdaptiveSimulationEngine,
  AdaptiveSimulationKind,
  AdaptiveSimulationSpec,
  Geometry2DSimulationSpec,
  Geometry3DSimulationSpec,
  SimulationStepPlacement,
} from './simulationTypes';

export const MAX_GEOMETRY_3D_POINTS = 1000;

export interface SimulationValidationIssue {
  path: string;
  message: string;
}

export interface SimulationValidationResult {
  valid: boolean;
  errors: SimulationValidationIssue[];
}

const validKinds: AdaptiveSimulationKind[] = ['geometry2d', 'geometry3d', 'graph2d', 'algebra', 'probability', 'physics', 'chemistry', 'htmlMiniApp'];
const validEngines: AdaptiveSimulationEngine[] = ['svg', 'threejs', 'geogebra', 'desmos', 'html'];
const validPlacements: SimulationStepPlacement[] = ['step0', 'step1', 'step2', 'step3', 'step4', 'step5'];

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const finiteNumberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

// For fields that the validator must police, preserve NaN/Infinity when the
// AI supplied a number. Missing/non-number fields still receive MVP defaults.
const numericOrPreserveInvalid = (value: unknown, fallback: number) => (
  typeof value === 'number' ? value : fallback
);

const stringOr = (value: unknown, fallback: string) => (
  typeof value === 'string' ? value : fallback
);

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const optionalNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const normalizeStringArray = (value: unknown) => (
  asArray(value)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
);

const normalizeQuestions = (value: unknown) => asArray<Record<string, unknown>>(value)
  .filter(isObject)
  .map((question, index) => ({
    id: stringOr(question.id, `q${index + 1}`).trim() || `q${index + 1}`,
    prompt: stringOr(question.prompt, '').trim(),
    expectedObservation: stringOr(question.expectedObservation, '').trim(),
    hint: optionalString(question.hint),
  }))
  .filter(question => question.prompt.length > 0 || question.expectedObservation.length > 0);

const normalizeNotebookEntries = (value: unknown) => asArray<Record<string, unknown>>(value)
  .filter(isObject)
  .map((entry, index) => ({
    id: stringOr(entry.id, `note${index + 1}`).trim() || `note${index + 1}`,
    title: stringOr(entry.title, '').trim(),
    content: stringOr(entry.content, '').trim(),
  }))
  .filter(entry => entry.title.length > 0 || entry.content.length > 0);

const normalizeGeometry2D = (value: unknown): Geometry2DSimulationSpec | undefined => {
  if (!isObject(value)) return undefined;

  const points = asArray<Record<string, unknown>>(value.points).filter(isObject).map((point, index) => ({
    id: stringOr(point.id, `P${index + 1}`).trim() || `P${index + 1}`,
    label: stringOr(point.label, stringOr(point.id, `P${index + 1}`)).trim() || `P${index + 1}`,
    x: finiteNumberOr(point.x, 0),
    y: finiteNumberOr(point.y, 0),
    draggable: optionalBoolean(point.draggable),
    color: optionalString(point.color),
  }));

  const spec: Geometry2DSimulationSpec = {
    points,
    segments: asArray<Record<string, unknown>>(value.segments).filter(isObject).map((segment, index) => ({
      id: stringOr(segment.id, `s${index + 1}`).trim() || `s${index + 1}`,
      from: stringOr(segment.from, '').trim(),
      to: stringOr(segment.to, '').trim(),
      label: optionalString(segment.label),
      dashed: optionalBoolean(segment.dashed),
      color: optionalString(segment.color),
      width: optionalNumber(segment.width),
    })),
    circles: asArray<Record<string, unknown>>(value.circles).filter(isObject).map((circle, index) => ({
      id: stringOr(circle.id, `c${index + 1}`).trim() || `c${index + 1}`,
      center: stringOr(circle.center, '').trim(),
      through: optionalString(circle.through),
      radius: optionalNumber(circle.radius),
      label: optionalString(circle.label),
      color: optionalString(circle.color),
      dashed: optionalBoolean(circle.dashed),
    })),
    polygons: asArray<Record<string, unknown>>(value.polygons).filter(isObject).map((polygon, index) => ({
      id: stringOr(polygon.id, `poly${index + 1}`).trim() || `poly${index + 1}`,
      pointIds: normalizeStringArray(polygon.pointIds),
      label: optionalString(polygon.label),
      fill: optionalString(polygon.fill),
      stroke: optionalString(polygon.stroke),
      opacity: optionalNumber(polygon.opacity),
    })),
    showGrid: optionalBoolean(value.showGrid),
  };

  if (isObject(value.viewBox)) {
    spec.viewBox = {
      minX: finiteNumberOr(value.viewBox.minX, -5),
      minY: finiteNumberOr(value.viewBox.minY, -5),
      width: finiteNumberOr(value.viewBox.width, 10),
      height: finiteNumberOr(value.viewBox.height, 10),
    };
  }

  return spec;
};

const normalizeGeometry3D = (value: unknown): Geometry3DSimulationSpec | undefined => {
  if (!isObject(value)) return undefined;

  const spec: Geometry3DSimulationSpec = {
    points: asArray<Record<string, unknown>>(value.points).filter(isObject).map((point, index) => ({
      id: stringOr(point.id, `P${index + 1}`).trim() || `P${index + 1}`,
      label: stringOr(point.label, stringOr(point.id, `P${index + 1}`)).trim() || `P${index + 1}`,
      x: numericOrPreserveInvalid(point.x, 0),
      y: numericOrPreserveInvalid(point.y, 0),
      z: numericOrPreserveInvalid(point.z, 0),
      color: optionalString(point.color),
    })),
    segments: asArray<Record<string, unknown>>(value.segments).filter(isObject).map((segment, index) => ({
      id: stringOr(segment.id, `s${index + 1}`).trim() || `s${index + 1}`,
      from: stringOr(segment.from, '').trim(),
      to: stringOr(segment.to, '').trim(),
      label: optionalString(segment.label),
      dashed: optionalBoolean(segment.dashed),
      color: optionalString(segment.color),
      radius: typeof segment.radius === 'number' ? segment.radius : undefined,
    })),
    faces: asArray<Record<string, unknown>>(value.faces).filter(isObject).map((face, index) => ({
      id: stringOr(face.id, `face${index + 1}`).trim() || `face${index + 1}`,
      pointIds: normalizeStringArray(face.pointIds),
      label: optionalString(face.label),
      fill: optionalString(face.fill),
      opacity: typeof face.opacity === 'number' ? face.opacity : undefined,
      visible: optionalBoolean(face.visible),
      doubleSide: optionalBoolean(face.doubleSide),
    })),
    planes: asArray<Record<string, unknown>>(value.planes).filter(isObject).map((plane, index) => ({
      id: stringOr(plane.id, `plane${index + 1}`).trim() || `plane${index + 1}`,
      pointIds: normalizeStringArray(plane.pointIds),
      label: optionalString(plane.label),
      fill: optionalString(plane.fill),
      opacity: typeof plane.opacity === 'number' ? plane.opacity : undefined,
      visible: optionalBoolean(plane.visible),
    })),
    projection: value.projection === 'orthographic' ? 'orthographic' : value.projection === 'perspective' ? 'perspective' : undefined,
    showAxes: optionalBoolean(value.showAxes),
    autoRotate: optionalBoolean(value.autoRotate),
    initialVisibleLayers: normalizeStringArray(value.initialVisibleLayers),
  };

  if (isObject(value.camera)) {
    spec.camera = {
      x: numericOrPreserveInvalid(value.camera.x, 5),
      y: numericOrPreserveInvalid(value.camera.y, 4),
      z: numericOrPreserveInvalid(value.camera.z, 6),
    };
  }

  return spec;
};

/**
 * Normalizes AI/user supplied simulation specs into the strict runtime contract.
 * It fills safe defaults for optional arrays (`questions = []`, etc.) and strips
 * malformed optional children instead of letting the renderer crash.
 */
export function normalizeAdaptiveSimulationSpec(input: unknown): AdaptiveSimulationSpec {
  const source = isObject(input) ? input : {};
  const kind = validKinds.includes(source.kind as AdaptiveSimulationKind) ? source.kind as AdaptiveSimulationKind : 'geometry2d';
  const engine = validEngines.includes(source.engine as AdaptiveSimulationEngine) ? source.engine as AdaptiveSimulationEngine : (kind === 'geometry3d' ? 'threejs' : 'svg');
  const placement = validPlacements.includes(source.placement as SimulationStepPlacement) ? source.placement as SimulationStepPlacement : 'step2';

  const normalized: AdaptiveSimulationSpec = {
    id: stringOr(source.id, 'simulation-draft').trim() || 'simulation-draft',
    title: stringOr(source.title, 'Mô phỏng tương tác').trim() || 'Mô phỏng tương tác',
    description: stringOr(source.description, '').trim(),
    kind,
    engine,
    placement,
    objectiveIds: normalizeStringArray(source.objectiveIds),
    studentTask: stringOr(source.studentTask, '').trim(),
    interactions: normalizeStringArray(source.interactions),
    questions: normalizeQuestions(source.questions),
    notebookEntries: normalizeNotebookEntries(source.notebookEntries),
  };

  if (isObject(source.mathModel)) {
    normalized.mathModel = {
      givens: normalizeStringArray(source.mathModel.givens),
      formulas: normalizeStringArray(source.mathModel.formulas),
      invariants: normalizeStringArray(source.mathModel.invariants),
      coordinateSystem: optionalString(source.mathModel.coordinateSystem),
      projection: source.mathModel.projection === 'cartesian2d' || source.mathModel.projection === 'orthographic3d' || source.mathModel.projection === 'perspective3d'
        ? source.mathModel.projection
        : undefined,
    };
  }

  if (isObject(source.pedagogyScript)) {
    normalized.pedagogyScript = {
      steps: normalizeStringArray(source.pedagogyScript.steps),
      realtimeReadouts: normalizeStringArray(source.pedagogyScript.realtimeReadouts),
      teacherControls: normalizeStringArray(source.pedagogyScript.teacherControls),
      modeLabels: isObject(source.pedagogyScript.modeLabels) ? {
        textbook: optionalString(source.pedagogyScript.modeLabels.textbook),
        realistic: optionalString(source.pedagogyScript.modeLabels.realistic),
      } : undefined,
    };
  }

  const geometry2d = normalizeGeometry2D(source.geometry2d);
  if (geometry2d) normalized.geometry2d = geometry2d;

  const geometry3d = normalizeGeometry3D(source.geometry3d);
  if (geometry3d) normalized.geometry3d = geometry3d;

  if (isObject(source.html)) {
    normalized.html = {
      srcDoc: stringOr(source.html.srcDoc, ''),
      height: optionalNumber(source.html.height),
      offlineSingleFile: optionalBoolean(source.html.offlineSingleFile),
      libraries: asArray(source.html.libraries).filter((item): item is any => typeof item === 'string'),
      safetyNotes: normalizeStringArray(source.html.safetyNotes),
    };
  }

  return normalized;
}

const push = (errors: SimulationValidationIssue[], path: string, message: string) => errors.push({ path, message });
const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

export function validateAdaptiveSimulationSpec(spec: AdaptiveSimulationSpec): SimulationValidationResult {
  const errors: SimulationValidationIssue[] = [];

  if (!isNonEmptyString(spec.id)) push(errors, 'id', 'Simulation id is required.');
  if (!isNonEmptyString(spec.title)) push(errors, 'title', 'Simulation title is required.');
  if (!validKinds.includes(spec.kind)) push(errors, 'kind', 'Unsupported simulation kind.');
  if (!validEngines.includes(spec.engine)) push(errors, 'engine', 'Unsupported simulation engine.');
  if (!validPlacements.includes(spec.placement)) push(errors, 'placement', 'Unsupported simulation placement.');
  if (!Array.isArray(spec.questions)) push(errors, 'questions', 'questions must be an array.');
  if (!Array.isArray(spec.notebookEntries)) push(errors, 'notebookEntries', 'notebookEntries must be an array.');

  if (spec.kind === 'geometry3d' || spec.geometry3d) {
    const geometry3d = spec.geometry3d;
    if (!geometry3d) {
      push(errors, 'geometry3d', 'geometry3d spec is required for geometry3d simulations.');
    } else {
      if (!Array.isArray(geometry3d.points)) {
        push(errors, 'geometry3d.points', '3D points must be an array.');
      } else {
        if (geometry3d.points.length > MAX_GEOMETRY_3D_POINTS) {
          push(errors, 'geometry3d.points', `3D simulations support at most ${MAX_GEOMETRY_3D_POINTS} points.`);
        }

        const pointIds = new Set<string>();
        geometry3d.points.forEach((point, index) => {
          const pointPath = `geometry3d.points[${index}]`;
          if (!isNonEmptyString(point.id)) push(errors, `${pointPath}.id`, 'Point id is required.');
          if (pointIds.has(point.id)) push(errors, `${pointPath}.id`, `Duplicate point id "${point.id}".`);
          pointIds.add(point.id);
          if (!isFiniteNumber(point.x)) push(errors, `${pointPath}.x`, 'Point x must be finite (no NaN/Infinity).');
          if (!isFiniteNumber(point.y)) push(errors, `${pointPath}.y`, 'Point y must be finite (no NaN/Infinity).');
          if (!isFiniteNumber(point.z)) push(errors, `${pointPath}.z`, 'Point z must be finite (no NaN/Infinity).');
        });

        geometry3d.segments?.forEach((segment, index) => {
          const segmentPath = `geometry3d.segments[${index}]`;
          if (!pointIds.has(segment.from)) push(errors, `${segmentPath}.from`, `Segment references missing point "${segment.from}".`);
          if (!pointIds.has(segment.to)) push(errors, `${segmentPath}.to`, `Segment references missing point "${segment.to}".`);
          if (segment.radius !== undefined && !isFiniteNumber(segment.radius)) push(errors, `${segmentPath}.radius`, 'Segment radius must be finite.');
        });

        const validatePointIdList = (pointIdsList: string[], path: string, minLength = 3) => {
          if (!Array.isArray(pointIdsList) || pointIdsList.length < minLength) {
            push(errors, path, `Must reference at least ${minLength} existing points.`);
            return;
          }
          pointIdsList.forEach((pointId, pointIndex) => {
            if (!pointIds.has(pointId)) push(errors, `${path}[${pointIndex}]`, `Missing referenced point "${pointId}".`);
          });
        };

        geometry3d.faces?.forEach((face, index) => {
          validatePointIdList(face.pointIds, `geometry3d.faces[${index}].pointIds`);
          if (face.opacity !== undefined && !isFiniteNumber(face.opacity)) push(errors, `geometry3d.faces[${index}].opacity`, 'Face opacity must be finite.');
        });

        geometry3d.planes?.forEach((plane, index) => {
          validatePointIdList(plane.pointIds, `geometry3d.planes[${index}].pointIds`);
          if (plane.opacity !== undefined && !isFiniteNumber(plane.opacity)) push(errors, `geometry3d.planes[${index}].opacity`, 'Plane opacity must be finite.');
        });
      }

      if (geometry3d.camera) {
        if (!isFiniteNumber(geometry3d.camera.x)) push(errors, 'geometry3d.camera.x', 'Camera x must be finite.');
        if (!isFiniteNumber(geometry3d.camera.y)) push(errors, 'geometry3d.camera.y', 'Camera y must be finite.');
        if (!isFiniteNumber(geometry3d.camera.z)) push(errors, 'geometry3d.camera.z', 'Camera z must be finite.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeAndValidateAdaptiveSimulationSpec(input: unknown): SimulationValidationResult & { spec: AdaptiveSimulationSpec } {
  const spec = normalizeAdaptiveSimulationSpec(input);
  return { spec, ...validateAdaptiveSimulationSpec(spec) };
}

export function assertValidAdaptiveSimulationSpec(spec: AdaptiveSimulationSpec): void {
  const result = validateAdaptiveSimulationSpec(spec);
  if (!result.valid) {
    const message = result.errors.map(error => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`Invalid AdaptiveSimulationSpec: ${message}`);
  }
}
