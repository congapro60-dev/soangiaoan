import { describe, expect, it } from 'vitest';
import { buildSupportActivityDraft, getSupportActivityFocusOptions } from './supportActivityModel';
import type { ClassAssignmentReport } from './classReportModel';

const reportFixture = (overrides: Partial<ClassAssignmentReport> = {}): ClassAssignmentReport => ({
  assignment: {
    id: 'assignment-1',
    title: 'Bài kiểm tra chương I',
    type: 'Bài nộp ảnh/AI',
    maxScore: 10,
  },
  latest: [
    {
      id: 'submission-1',
      studentKey: 'student-1',
      createdAt: '2026-08-28T08:00:00.000Z',
      status: 'graded',
      score: 5,
      maxScore: 10,
      attemptCount: 1,
      official: true,
      weakTopics: ['Phương trình bậc hai'],
      questionResults: [
        { questionNumber: '3', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Nhầm công thức', weakTopics: ['Phương trình bậc hai'] },
      ],
    },
    {
      id: 'submission-2',
      studentKey: 'student-2',
      createdAt: '2026-08-28T08:01:00.000Z',
      status: 'graded',
      score: 6,
      maxScore: 10,
      attemptCount: 1,
      official: true,
      weakTopics: ['Phương trình bậc hai'],
      questionResults: [
        { questionNumber: '3', status: 'partial', score: 1, maxScore: 2, errorType: 'Nhầm công thức', weakTopics: ['Phương trình bậc hai'] },
      ],
    },
    {
      id: 'submission-3',
      studentKey: 'student-3',
      createdAt: '2026-08-28T08:02:00.000Z',
      status: 'graded',
      score: 9,
      maxScore: 10,
      attemptCount: 1,
      official: true,
      weakTopics: [],
      questionResults: [
        { questionNumber: '3', status: 'correct', score: 2, maxScore: 2, errorType: 'Không có', weakTopics: [] },
      ],
    },
  ],
  official: [],
  counters: { roster: 3, submitted: 3, graded: 3, official: 3, pending: 0, missing: 0 },
  metrics: { averagePercent: 66.7, medianPercent: 60, officialEvidenceCount: 3 },
  averagePercent: 66.7,
  medianPercent: 60,
  scoreDistribution: { '0-<5': 0, '5-<6.5': 2, '6.5-<8': 0, '8-10': 1 },
  distribution: { '0-<5': 0, '5-<6.5': 2, '6.5-<8': 0, '8-10': 1 },
  questionStats: [{ questionNumber: '3', evidenceCount: 3, correct: 1, partial: 1, incorrect: 1, unreadable: 0, notAttempted: 0, correctRate: 1 / 3, scoreRate: 0.5 }],
  errorStats: [{ label: 'Nhầm công thức', evidenceCount: 2 }],
  topicStats: [{ label: 'Phương trình bậc hai', evidenceCount: 2 }],
  recommendations: [],
  ...overrides,
});

describe('supportActivityModel', () => {
  it('builds evidence-backed focus options and targets students who need support', () => {
    const report = reportFixture();
    const options = getSupportActivityFocusOptions(report);

    expect(options[0]).toEqual(expect.objectContaining({
      kind: 'question',
      questionNumber: '3',
      evidenceCount: 3,
    }));
    expect(options.some(option => option.kind === 'error' && option.label === 'Nhầm công thức')).toBe(true);

    const draft = buildSupportActivityDraft(report, options[0]);
    expect(draft.targetStudentIds).toEqual(['student-1', 'student-2']);
    expect(draft.objective).toContain('Câu 3');
    expect(draft.teacherSteps).toHaveLength(3);
    expect(draft.questionBlueprints.length).toBeGreaterThanOrEqual(2);
    expect(draft.canPublish).toBe(true);
    expect(draft.sourceReportId).toBe('assignment-1');
  });

  it('does not present a small or non-official sample as a publishable class conclusion', () => {
    const report = reportFixture({
      latest: [],
      official: [],
      counters: { roster: 25, submitted: 1, graded: 1, official: 0, pending: 1, missing: 24 },
      metrics: { averagePercent: null, medianPercent: null, officialEvidenceCount: 0 },
      averagePercent: null,
      medianPercent: null,
      questionStats: [],
      errorStats: [{ label: 'Bỏ câu', evidenceCount: 1 }],
      topicStats: [{ label: 'Hàm số', evidenceCount: 1 }],
      recommendations: [],
    });
    const [focus] = getSupportActivityFocusOptions(report);
    const draft = buildSupportActivityDraft(report, focus);

    expect(draft.canPublish).toBe(false);
    expect(draft.blockingReasons.join(' ')).toContain('bằng chứng chính thức');
    expect(draft.evidenceSummary).toContain('chưa đủ');
  });

  it('keeps selected targets inside the report roster and records measurable recheck criteria', () => {
    const report = reportFixture();
    const focus = getSupportActivityFocusOptions(report).find(option => option.kind === 'topic');
    expect(focus).toBeDefined();

    const draft = buildSupportActivityDraft(report, focus!, {
      targetStudentIds: ['student-2', 'outside-class', 'student-2'],
      purpose: 'practice',
      durationMinutes: 15,
    });

    expect(draft.purpose).toBe('practice');
    expect(draft.targetStudentIds).toEqual(['student-2']);
    expect(draft.durationMinutes).toBe(15);
    expect(draft.successCriteria).toContain('80%');
    expect(draft.exitTicket.length).toBe(2);
  });
});
