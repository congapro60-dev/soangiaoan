import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { evaluateLearningQuality } from './qualityGate';

describe('canonical Gate Q', () => {
  it('does not trust a schema-valid lesson or authored READY badge as pedagogical proof', () => {
    const lesson = structuralLessonIR();
    lesson.qualityAudit.status = 'READY';
    lesson.qualityAudit.passedRules = Array.from({ length: 15 }, (_, index) => `M${String(index + 1).padStart(2, '0')}`);
    const result = evaluateLearningQuality(lesson);
    expect(result.status).toBe('BLOCKED');
    expect(result.failedRules).toEqual(expect.arrayContaining(['M01', 'M02', 'M06']));
  });

  it('blocks a formative cycle with no new-evidence recheck', () => {
    const lesson = structuralLessonIR();
    lesson.formativeDecisionCycles.push({
      id: 'FDC1', mappedSuccessCriteria: ['SC1'], activityRef: 'A1',
      collect: { method: 'Câu hỏi', evidenceCollected: 'Lời giải' },
      decisionRule: {
        below: { interpretation: 'Sai cách chọn', decision: 'Dừng lại', action: 'Gợi ý' },
        onTrack: { interpretation: 'Đúng', decision: 'Tiếp tục', action: 'Làm tiếp' },
        above: { interpretation: 'Vững', decision: 'Mở rộng', action: 'Thử thách' },
      },
      recheck: { method: 'Câu mới', newEvidence: '', timing: 'Sau can thiệp' },
    });
    lesson.timeline[0].formativeCycleRefs = ['FDC1'];
    expect(evaluateLearningQuality(lesson).failedRules).toContain('M07');
    expect(evaluateLearningQuality(lesson).failedRules).toContain('M06');
  });

  it('blocks observed learner evidence without provenance', () => {
    const lesson = structuralLessonIR();
    lesson.learnerContext.evidence.push({ id: 'LE1', type: 'teacher_observed', summary: 'Có lỗi', requiresTeacherConfirmation: false });
    const result = evaluateLearningQuality(lesson);
    expect(result.failedRules).toContain('SCHEMA');
    expect(result.warnings.some(issue => issue.includes('/learnerContext/evidence/0'))).toBe(true);
  });

  it('removes a decorative Digital Citizenship badge without invalidating the optional feature itself', () => {
    const lesson = structuralLessonIR();
    lesson.cisEvidenceMap.push({ pillar: 'digital_citizenship', activityRef: 'A1', studentBehavior: 'Dự đoán', observerEvidence: 'Nhìn thấy', badgeEligible: true });
    const result = evaluateLearningQuality(lesson);
    expect(result.derivedBadges.digital_citizenship).toBe(false);
    expect(result.warnings).toContain('C02_BADGE_WITHOUT_VALID_FEATURE');
    expect(result.failedRules).not.toContain('C02');
  });

  it('identifies conditional features by canonical key, not object insertion order', () => {
    const lesson = structuralLessonIR();
    lesson.conditionalFeatures.digitalCitizenship = {
      triggered: true, triggerReason: 'HS dùng công cụ', learningValue: '',
      studentAction: 'Kiểm chứng', expectedEvidence: 'Lời giải', observerEvidence: 'Bài làm',
    };
    const original = lesson.conditionalFeatures;
    lesson.conditionalFeatures = { digitalCitizenship: original.digitalCitizenship, ...original };
    expect(evaluateLearningQuality(lesson).warnings).toContain('C02_INVALID_FEATURE');
  });

  it('does not require feature-level observerEvidence when a triggered feature has a real learning contract', () => {
    const lesson = structuralLessonIR();
    lesson.conditionalFeatures.digitalCitizenship = {
      triggered: true,
      triggerReason: 'HS kiểm chứng đầu ra của công cụ số',
      learningValue: 'Phân biệt phép tính của mình và kết quả mô phỏng',
      studentAction: 'Dự đoán, kiểm tra đầu vào và giải thích chỗ lệch',
      expectedEvidence: 'Lời giải thích kiểm chứng',
    };
    lesson.cisEvidenceMap.push({
      pillar: 'digital_citizenship', activityRef: 'A1',
      studentBehavior: 'Giải thích cách kiểm chứng', observerEvidence: 'Bài làm ghi rõ đầu vào và đối chiếu', badgeEligible: true,
    });
    const result = evaluateLearningQuality(lesson);
    expect(result.warnings).not.toContain('C02_INVALID_FEATURE');
    expect(result.derivedBadges.digital_citizenship).toBe(true);
  });

  it('treats mustNotShow as a privacy prohibition, not evidence of a leak', () => {
    const lesson = structuralLessonIR();
    lesson.timeline[0].presenter.mustNotShow = ['private student name'];
    const result = evaluateLearningQuality(lesson);
    expect(result.failedRules).not.toContain('M10');
    expect(result.pendingRules).toContain('M10');
  });

  it('allows a reviewed plan to preview while a material assumption awaits teacher confirmation', () => {
    const lesson = structuralLessonIR();
    lesson.sourceVerification.status = 'VERIFIED';
    lesson.sourceVerification.unresolved = [];
    lesson.sourceVerification.canonicalSources = [{ sourceId: 'test-source', name: 'Nguồn thử trong test', kind: 'textbook' }];
    lesson.learnerContext.evidence = [{
      id: 'LE1', type: 'planning_assumption', summary: 'Giả định thử, chưa phải quan sát.',
      requiresTeacherConfirmation: true, materialForReadyToTeach: true,
    }];
    lesson.learnerContext.planningImplications = [{ id: 'PI1', evidenceRefs: ['LE1'], implication: 'Chuẩn bị hỗ trợ dự phòng' }];
    lesson.timeline[0].durationSec = 1200;
    lesson.timeline[0].timingPolicy.plannedDurationSec = 1200;
    lesson.timeline[0].formativeCycleRefs = ['FDC1'];
    lesson.timeline.push({
      ...lesson.timeline[0], id: 'A2', order: 2, phase: 'reflection',
      formativeCycleRefs: [],
    });
    lesson.formativeDecisionCycles = [{
      id: 'FDC1', mappedSuccessCriteria: ['SC1'], activityRef: 'A1',
      collect: { method: 'Câu hỏi giữa tiết', evidenceCollected: 'Lời giải đầu' },
      decisionRule: {
        below: { interpretation: 'Chưa có căn cứ', decision: 'Hỗ trợ', action: 'Cho gợi ý' },
        onTrack: { interpretation: 'Có căn cứ', decision: 'Tiếp tục', action: 'Làm câu mới' },
        above: { interpretation: 'Lập luận tốt', decision: 'Mở rộng', action: 'Giải thích cách khác' },
      },
      recheck: { method: 'Câu mới', newEvidence: 'Lời giải mới', timing: 'Sau hỗ trợ' },
    }];
    const reviewedRules = ['M01', 'M04', 'M05', 'M08', 'M09', 'M10', 'M13', 'M14'].map(ruleId => ({
      ruleId, verdict: 'pass' as const, evidence: 'Biên bản kiểm định thử', reviewer: 'test-reviewer', reviewedAt: '2026-09-23',
    }));
    const pending = evaluateLearningQuality(lesson, reviewedRules);
    expect(pending.failedRules).toEqual([]);
    expect(pending.pendingRules).toEqual([]);
    expect(pending.status).toBe('NEEDS_TEACHER_CONFIRMATION');

    lesson.learnerContext.evidence[0].confirmedByTeacher = true;
    expect(evaluateLearningQuality(lesson, reviewedRules).status).toBe('READY');
    expect(lesson.learnerContext.evidence[0].type).toBe('planning_assumption');
  });
});
