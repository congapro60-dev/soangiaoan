import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateLessonIRSchema, type LessonIRV83 } from './lessonIRSchema';
import { prepareRuntimeBuild, validateLessonIRReferences } from './runtimePackage';
import { evaluateLearningQuality } from './qualityGate';
import { applyPresenterRoomCommand, createRoomState } from './roomState';

const candidates = [
  {
    file: '11T38.lesson-ir-v8.3.2.validated.json',
    hash: 'd265a32460dbaff3fe111dbe90082a4c5e483b5e197e01c482cc6bf1a51f4245',
    lessonId: '11T38',
    activities: 19,
    runtimeSec: 2400,
    unresolved: 23,
  },
  {
    file: 'MENELAUS_80MIN.lesson-ir-v8.3.2.validated.json',
    hash: '1a5f142b62ec232fd422ed127767735e675c24607b72a1728ef44455d4943c6b',
    lessonId: 'MENELAUS_V8_3_2_80MIN',
    activities: 25,
    runtimeSec: 4800,
    unresolved: 40,
  },
] as const;

describe('supplied V8.3.2 Golden Candidates', () => {
  for (const candidate of candidates) {
    it(`imports ${candidate.lessonId} without changing the canonical fixture`, async () => {
      const bytes = readFileSync(resolve('tests/fixtures/v832', candidate.file));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(candidate.hash);
      const lesson = JSON.parse(bytes.toString('utf8')) as LessonIRV83;
      expect(validateLessonIRSchema(lesson)).toEqual({ valid: true, issues: [] });
      expect(validateLessonIRReferences(lesson)).toEqual([]);
      expect(lesson.lesson.lessonId).toBe(candidate.lessonId);
      expect(lesson.timeline).toHaveLength(candidate.activities);
      expect(lesson.timeline.reduce((sum, activity) => sum + activity.durationSec, 0)).toBe(candidate.runtimeSec);
      expect(lesson.qualityAudit.status).toBe('NEEDS_TEACHER_CONFIRMATION');
      expect(lesson.buildStatus).toBe('READY_FOR_PREVIEW');
      expect(lesson.qualityAudit.teacherConfirmationsRequired.filter(item => item.materialForReadyToTeach && !item.resolved)).toHaveLength(candidate.unresolved);
      const quality = evaluateLearningQuality(lesson);
      expect(quality.failedRules).toEqual([]);
      expect(quality.warnings).toEqual([]);
      expect(quality.pendingRules).toEqual(['M01', 'M04', 'M05', 'M08', 'M09', 'M10', 'M13', 'M14']);
      const attestations = quality.pendingRules.map(ruleId => ({
        ruleId, verdict: 'pass' as const, evidence: 'Package Stage 2.1 semantic evidence; preview verification only',
        reviewer: 'fixture-test', reviewedAt: '2026-09-24',
      }));
      const build = await prepareRuntimeBuild(lesson, attestations);
      expect(build.manifest.lessonId).toBe(candidate.lessonId);
      expect(build.manifest.qualityStatus).toBe('NEEDS_TEACHER_CONFIRMATION');
      expect(build.manifest.qaStatus).toBe('NOT_RUN');
      expect(build.manifest.teacherApproved).toBe(false);
    }, 15_000);
  }

  it('keeps Menelaus point R hidden before its introduction', () => {
    const lesson = JSON.parse(readFileSync(resolve('tests/fixtures/v832/MENELAUS_80MIN.lesson-ir-v8.3.2.validated.json'), 'utf8')) as LessonIRV83;
    const visual = lesson.visuals.VIS_TETRA;
    expect(visual.defaultStateId).toBe('before_R');
    expect(visual.states.before_R.visibleObjects).not.toContain('R');
    expect(visual.states.abd_R.visibleObjects).toContain('R');
    expect(visual.states.bcd_R.visibleObjects).toContain('R');
  });

  it('continues all six supplied zero-switch-cost device activities without forcing a recall', () => {
    let checked = 0;
    for (const candidate of candidates) {
      const lesson = JSON.parse(readFileSync(resolve('tests/fixtures/v832', candidate.file), 'utf8')) as LessonIRV83;
      for (let index = 1; index < lesson.timeline.length; index += 1) {
        const following = lesson.timeline[index];
        const previous = lesson.timeline[index - 1];
        if (!following.questionInstances?.length || following.surfaceHandoff
          || following.threeWayOrchestration.primaryAttentionSurface !== 'student_device') continue;
        const room = createRoomState(lesson, `room-${checked}`, 'fixture-hash');
        room.started = true;
        room.activityId = previous.id;
        room.handoffState = 'DEVICE_WORK';
        room.attentionSurface = 'student_device';
        const next = applyPresenterRoomCommand(lesson, room,
          { id: `continue-${checked}`, expectedRevision: 0, type: 'NEXT_ACTIVITY' }, 'fixture-hash');
        expect(next).toMatchObject({ activityId: following.id, handoffState: 'DEVICE_WORK', attentionSurface: 'student_device' });
        checked += 1;
      }
    }
    expect(checked).toBe(6);
  });
});
