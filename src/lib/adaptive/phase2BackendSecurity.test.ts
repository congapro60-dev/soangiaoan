import { describe, expect, it } from 'vitest';
import {
  MAX_GEOMETRY_3D_POINTS,
  normalizeAndValidateAdaptiveSimulationSpec,
  normalizeAdaptiveSimulationSpec,
  validateAdaptiveSimulationSpec,
} from './simulationValidation';
import {
  retrieveTopExternalTools,
  validateExternalToolIdsFromAi,
  type ExternalToolCatalogItem,
} from './externalToolRag';

const activeTool = (overrides: Partial<ExternalToolCatalogItem> = {}): ExternalToolCatalogItem => ({
  toolId: 'tool-geometry-1',
  title: 'GeoGebra hình học 3D',
  description: 'Mô phỏng hình chóp, mặt phẳng và tọa độ không gian.',
  url: 'https://www.geogebra.org/m/example',
  sourceDomain: 'geogebra.org',
  tags: ['hinh hoc', '3d', 'mat phang', 'hinh chop'],
  heightPreset: 'standard',
  sandboxPreset: 'geogebra',
  status: 'active',
  ...overrides,
});

describe('Phase 2 AdaptiveSimulationSpec normalizer/validator', () => {
  it('fills safe default arrays for optional collections', () => {
    const spec = normalizeAdaptiveSimulationSpec({ id: 'sim-1', title: 'Demo' });

    expect(spec.questions).toEqual([]);
    expect(spec.notebookEntries).toEqual([]);
    expect(spec.objectiveIds).toEqual([]);
    expect(spec.interactions).toEqual([]);
  });

  it('rejects invalid 3D references, non-finite numbers, and too many points', () => {
    const tooManyPoints = Array.from({ length: MAX_GEOMETRY_3D_POINTS + 1 }, (_, index) => ({
      id: `P${index}`,
      label: `P${index}`,
      x: index === 0 ? Infinity : index,
      y: 0,
      z: 0,
    }));

    const result = normalizeAndValidateAdaptiveSimulationSpec({
      id: 'bad-3d',
      title: 'Bad 3D',
      kind: 'geometry3d',
      engine: 'threejs',
      geometry3d: {
        points: tooManyPoints,
        segments: [{ id: 's1', from: 'P0', to: 'PX', radius: Number.NaN }],
        faces: [{ id: 'f1', pointIds: ['P0', 'P1', 'MISSING'], opacity: Infinity }],
        camera: { x: 1, y: Number.NaN, z: 3 },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.path)).toEqual(expect.arrayContaining([
      'geometry3d.points',
      'geometry3d.points[0].x',
      'geometry3d.segments[0].to',
      'geometry3d.segments[0].radius',
      'geometry3d.faces[0].pointIds[2]',
      'geometry3d.faces[0].opacity',
      'geometry3d.camera.y',
    ]));
  });

  it('validates a clean 3D spec', () => {
    const spec = normalizeAdaptiveSimulationSpec({
      id: 'ok-3d',
      title: 'OK 3D',
      kind: 'geometry3d',
      engine: 'threejs',
      geometry3d: {
        points: [
          { id: 'A', x: 0, y: 0, z: 0 },
          { id: 'B', x: 1, y: 0, z: 0 },
          { id: 'C', x: 0, y: 1, z: 0 },
        ],
        segments: [{ id: 'AB', from: 'A', to: 'B' }],
        faces: [{ id: 'ABC', pointIds: ['A', 'B', 'C'], opacity: 0.5 }],
      },
    });

    expect(validateAdaptiveSimulationSpec(spec).valid).toBe(true);
  });
});

describe('Phase 2 External Tool RAG', () => {
  it('retrieves only active top-k matching tools', () => {
    const matches = retrieveTopExternalTools({ lessonTitle: 'Hình chóp và mặt phẳng trong không gian', topK: 2 }, [
      activeTool(),
      activeTool({ toolId: 'disabled-tool', status: 'disabled', title: 'Hình chóp disabled' }),
      activeTool({ toolId: 'biology-tool', title: 'Sinh học tế bào', tags: ['sinh hoc'], description: 'Tế bào và ADN' }),
    ]);

    expect(matches.map(match => match.toolId)).toEqual(['tool-geometry-1']);
  });

  it('filters hallucinated AI ids outside the RAG allowlist', () => {
    const allowed = [activeTool({ toolId: 'tool-a' }), activeTool({ toolId: 'tool-b' })];

    expect(validateExternalToolIdsFromAi(['tool-a', 'fake-tool', 'tool-b', 'tool-a', 123], allowed))
      .toEqual(['tool-a', 'tool-b']);
  });
});
