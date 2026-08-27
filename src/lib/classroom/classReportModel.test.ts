import { describe, expect, it } from 'vitest';
import { buildClassAssignmentReport, type ClassReportInput } from './classReportModel';

const baseSubmission = (patch: Partial<ClassReportInput['assignment']['submissions'][number]> = {}) => ({
  id: 'submission-1',
  studentKey: 'student-1',
  createdAt: '2026-08-25T08:00:00.000Z',
  status: 'graded' as const,
  score: 8,
  maxScore: 10,
  official: true,
  questionResults: [],
  ...patch,
});

const baseInput = (submissions: ClassReportInput['assignment']['submissions']): ClassReportInput => ({
  roster: [
    { studentKey: 'student-1' },
    { studentKey: 'student-2' },
    { studentKey: 'student-3' },
    { studentKey: 'student-4' },
  ],
  assignment: {
    id: 'assignment-1',
    title: 'Hàm số bậc hai',
    type: 'exam',
    maxScore: 10,
    submissions,
  },
});

describe('buildClassAssignmentReport', () => {
  it('chỉ giữ lượt mới nhất và tách các counter theo trạng thái', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 'old', createdAt: '2026-08-24T08:00:00.000Z', score: 2 }),
      baseSubmission({ id: 'new', createdAt: '2026-08-25T08:00:00.000Z', score: 0 }),
      baseSubmission({
        id: 'pending',
        studentKey: 'student-2',
        status: 'graded',
        official: false,
        score: 7,
      }),
      baseSubmission({
        id: 'submitted',
        studentKey: 'student-3',
        status: 'submitted',
        official: false,
        score: null,
        maxScore: 10,
      }),
    ]));

    expect(report.latest.map(submission => submission.id)).toEqual(['new', 'pending', 'submitted']);
    expect(report.counters).toEqual({
      roster: 4,
      submitted: 3,
      graded: 2,
      official: 1,
      pending: 2,
      missing: 1,
    });
    expect(report.metrics.averagePercent).toBe(0);
    expect(report.official).toHaveLength(1);
  });

  it('tính điểm chính thức theo phần trăm, median và bốn khoảng thang 10', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', score: 0 }),
      baseSubmission({ id: 's2', studentKey: 'student-2', score: 5 }),
      baseSubmission({ id: 's3', studentKey: 'student-3', score: 6.5 }),
      baseSubmission({ id: 's4', studentKey: 'student-4', score: 8 }),
    ]));

    expect(report.metrics.averagePercent).toBe(48.75);
    expect(report.metrics.medianPercent).toBe(57.5);
    expect(report.scoreDistribution).toEqual({
      '0-<5': 1,
      '5-<6.5': 1,
      '6.5-<8': 1,
      '8-10': 1,
    });
  });

  it('tổng hợp câu hỏi, lỗi và chủ đề bằng nhãn chuẩn hóa', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        questionResults: [
          {
            questionNumber: '1',
            status: 'correct',
            score: 2,
            maxScore: 2,
            errorType: '  Sai   dấu ',
            weakTopics: [' Hàm số ', 'hàm   số'],
          },
          {
            questionNumber: '2',
            status: 'partial',
            score: 1,
            maxScore: 2,
            errorType: 'sai dấu',
            weakTopics: ['Biến thiên'],
          },
        ],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        questionResults: [
          {
            questionNumber: '1',
            status: 'unreadable',
            score: 0,
            maxScore: 2,
            errorType: '',
            weakTopics: ['HÀM SỐ'],
          },
        ],
      }),
      baseSubmission({
        id: 'pending',
        studentKey: 'student-3',
        official: false,
        questionResults: [{
          questionNumber: '1',
          status: 'incorrect',
          score: 0,
          maxScore: 2,
          errorType: 'Không tính',
          weakTopics: ['Không tính'],
        }],
      }),
    ]));

    expect(report.questionStats).toEqual([
      expect.objectContaining({
        questionNumber: '1',
        evidenceCount: 2,
        correct: 1,
        partial: 0,
        incorrect: 0,
        unreadable: 1,
        notAttempted: 0,
        correctRate: 0.5,
        scoreRate: 0.5,
      }),
      expect.objectContaining({
        questionNumber: '2',
        evidenceCount: 1,
        correct: 0,
        partial: 1,
        correctRate: 0,
        incorrect: 0,
        unreadable: 0,
        notAttempted: 0,
        scoreRate: 0.5,
      }),
    ]);
    expect(report.errorStats).toEqual([
      { label: 'Sai dấu', evidenceCount: 2 },
    ]);
    expect(report.topicStats).toEqual([
      { label: 'Hàm số', evidenceCount: 3 },
      { label: 'Biến thiên', evidenceCount: 1 },
    ]);
  });

  it('bỏ điểm không hợp lệ, không làm hỏng model và vẫn giữ điểm 0 hợp lệ', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 'zero', studentKey: 'student-1', score: 0 }),
      baseSubmission({ id: 'nan', studentKey: 'student-2', score: Number.NaN }),
      baseSubmission({ id: 'over', studentKey: 'student-3', score: 11 }),
      baseSubmission({ id: 'bad-max', studentKey: 'student-4', score: 4, maxScore: 0 }),
    ]));

    expect(report.metrics.averagePercent).toBe(0);
    expect(report.metrics.medianPercent).toBe(0);
    expect(report.metrics.officialEvidenceCount).toBe(1);
    expect(report.recommendations).toEqual([
      expect.objectContaining({ title: expect.stringContaining('Chưa đủ dữ liệu') }),
    ]);
    expect(JSON.stringify(report)).not.toContain('studentAnswer');
    expect(JSON.stringify(report)).not.toContain('noteForTeacher');
  });

  it('giữ điểm thiếu là null và không tính vào bằng chứng chính thức hoặc scoreRate câu', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 'missing-score',
        studentKey: 'student-1',
        score: null,
        questionResults: [{ questionNumber: '1', status: 'correct', score: null, maxScore: 2 }],
      }),
      baseSubmission({
        id: 'graded-score',
        studentKey: 'student-2',
        score: 8,
        questionResults: [{ questionNumber: '1', status: 'correct', score: 2, maxScore: 2 }],
      }),
    ]));

    expect(report.metrics).toMatchObject({
      averagePercent: 80,
      medianPercent: 80,
      officialEvidenceCount: 1,
    });
    expect(report.scoreDistribution).toEqual({
      '0-<5': 0,
      '5-<6.5': 0,
      '6.5-<8': 0,
      '8-10': 1,
    });
    expect(report.questionStats).toEqual([expect.objectContaining({
      questionNumber: '1',
      evidenceCount: 2,
      correct: 2,
      scoreRate: 1,
    })]);
    expect(report.official[0]).toMatchObject({
      id: 'missing-score',
      score: null,
      questionResults: [{ score: null }],
    });
  });

  it('không suy diễn điểm câu từ thang bài và không đếm nhãn ngoài bằng chứng câu', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        questionResults: [{
          questionNumber: '1',
          status: 'correct',
          score: 1,
          errorType: 'Cần kiểm tra',
          weakTopics: ['Đồ thị'],
        }],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        questionResults: [{
          questionNumber: '1',
          status: 'not_attempted',
          score: 0,
          maxScore: 1,
          errorType: '',
          weakTopics: [],
        }],
      }),
    ]));

    expect(report.questionStats[0].scoreRate).toBe(0);
    expect(report.errorStats).toEqual([{ label: 'Cần kiểm tra', evidenceCount: 1 }]);
    expect(report.topicStats).toEqual([{ label: 'Đồ thị', evidenceCount: 1 }]);
  });

  it('chỉ coi official đã graded là chính thức và pending gồm mọi lượt không official', () => {
    const input = baseInput([
      baseSubmission({ id: 'official-graded', studentKey: 'student-1', status: 'graded', official: true, score: 7 }),
      baseSubmission({ id: 'official-submitted', studentKey: 'student-2', status: 'submitted', official: true, score: 9 }),
      baseSubmission({ id: 'grading', studentKey: 'student-3', status: 'grading', official: false, score: null }),
      baseSubmission({ id: 'error', studentKey: 'student-4', status: 'error', official: false, score: null }),
      baseSubmission({ id: 'graded-pending', studentKey: 'student-5', status: 'graded', official: false, score: 6 }),
    ]);
    input.roster = [...input.roster, { studentKey: 'student-5' }];

    const report = buildClassAssignmentReport(input);

    expect(report.official.map(submission => submission.id)).toEqual(['official-graded']);
    expect(report.counters).toMatchObject({ graded: 2, official: 1, pending: 4, missing: 0 });
    expect(report.metrics.averagePercent).toBe(70);
  });

  it('đưa non-graded official vào pending vì không đạt official gate', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 'graded-official', studentKey: 'student-1', status: 'graded', official: true, score: 8 }),
      baseSubmission({ id: 'submitted-official', studentKey: 'student-2', status: 'submitted', official: true, score: null }),
      baseSubmission({ id: 'grading-official', studentKey: 'student-3', status: 'grading', official: true, score: null }),
      baseSubmission({ id: 'error-official', studentKey: 'student-4', status: 'error', official: true, score: null }),
    ]));

    expect(report.counters).toMatchObject({ official: 1, pending: 3 });
  });

  it('gom weakTopics ở cấp submission và cấp câu vào cùng topicStats', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        weakTopics: [' Hàm số ', 'hàm số'],
        questionResults: [{ questionNumber: '1', status: 'correct', score: 1, maxScore: 1, weakTopics: ['Đồ thị'] }],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        weakTopics: ['HÀM SỐ'],
        questionResults: [{ questionNumber: '1', status: 'partial', score: 1, maxScore: 2, weakTopics: [' đồ   thị '] }],
      }),
    ]));

    expect(report.topicStats).toEqual([
      { label: 'Hàm số', evidenceCount: 3 },
      { label: 'Đồ thị', evidenceCount: 2 },
    ]);
  });

  it('project latest và official thành bản an toàn, không trả raw submission/question', () => {
    const rawSubmission = {
      ...baseSubmission({
        studentKey: 'student-1',
        questionResults: [{
          questionNumber: '1',
          status: 'correct',
          score: 1,
          maxScore: 1,
          errorType: '',
          weakTopics: [],
          studentAnswer: 'x = 42',
        }] as unknown as ClassReportInput['assignment']['submissions'][number]['questionResults'],
      }),
      noteForTeacher: 'nội bộ',
      teacherNote: 'ghi chú thô',
      studentAnswer: 'raw answer',
    } as unknown as ClassReportInput['assignment']['submissions'][number];

    const report = buildClassAssignmentReport(baseInput([rawSubmission]));

    expect(report.latest[0]).not.toBe(rawSubmission);
    expect(Object.keys(report.latest[0]).sort()).toEqual([
      'attemptCount',
      'createdAt',
      'id',
      'maxScore',
      'official',
      'questionResults',
      'score',
      'status',
      'studentKey',
      'weakTopics',
    ]);
    expect(Object.keys(report.latest[0].questionResults[0]).sort()).toEqual([
      'errorType',
      'maxScore',
      'questionNumber',
      'score',
      'status',
      'weakTopics',
    ]);
    expect(JSON.stringify(report)).not.toContain('raw answer');
    expect(JSON.stringify(report)).not.toContain('nội bộ');
    expect(JSON.stringify(report)).not.toContain('ghi chú thô');
    expect(JSON.stringify(report)).not.toContain('studentAnswer');
    expect(JSON.stringify(report)).not.toContain('noteForTeacher');
    expect(JSON.stringify(report)).not.toContain('teacherNote');
  });

  it('tính not_attempted là evidence, nhưng bỏ status thiếu hoặc unknown', () => {
    const report = buildClassAssignmentReport(baseInput([baseSubmission({
      questionResults: [
        { questionNumber: '1', status: 'correct', score: 1, maxScore: 2 },
        { questionNumber: '1', status: 'partial', score: 1, maxScore: 2 },
        { questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2 },
        { questionNumber: '1', status: 'unreadable', score: 0, maxScore: 2 },
        { questionNumber: '1', status: 'not_attempted', score: 0, maxScore: 2, errorType: '', weakTopics: [] },
        { questionNumber: '1', status: 'unknown', score: 2, maxScore: 2 },
        { questionNumber: '1', status: undefined as unknown as string, score: 2, maxScore: 2 },
      ],
    })]));

    expect(report.questionStats).toEqual([{
      questionNumber: '1',
      evidenceCount: 5,
      correct: 1,
      partial: 1,
      incorrect: 1,
      unreadable: 1,
      notAttempted: 1,
      correctRate: 0.2,
      scoreRate: 0.2,
    }]);
  });

  it('sinh khuyến nghị deterministic khi có ít nhất ba bằng chứng chính thức', () => {
    const input = baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', score: 4, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's2', studentKey: 'student-2', score: 5, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's3', studentKey: 'student-3', score: 6, questionResults: [{ questionNumber: '1', status: 'partial', score: 1, maxScore: 2, errorType: 'Thiếu bước', weakTopics: ['Hàm số'] }] }),
    ]);

    const first = buildClassAssignmentReport(input);
    const second = buildClassAssignmentReport(input);

    expect(first.recommendations.length).toBeGreaterThan(0);
    expect(first.recommendations).toEqual(second.recommendations);
    const firstText = first.recommendations.map(recommendation => Object.values(recommendation).join(' ')).join(' ');
    expect(firstText).toMatch(/Hàm số|Sai dấu/);
    expect(firstText).not.toContain('Chưa đủ dữ liệu');
    expect(first.recommendations[0]).toEqual(expect.objectContaining({
      title: expect.any(String),
      evidence: expect.any(String),
      action: expect.any(String),
      check: expect.any(String),
    }));
  });

  it('không coi nhãn trung tính là lỗi cần sửa', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', questionResults: [{ questionNumber: '1', status: 'correct', score: 2, maxScore: 2, errorType: 'Không có', weakTopics: [] }] }),
      baseSubmission({ id: 's2', studentKey: 'student-2', questionResults: [{ questionNumber: '1', status: 'correct', score: 2, maxScore: 2, errorType: 'không có lỗi', weakTopics: [] }] }),
      baseSubmission({ id: 's3', studentKey: 'student-3', questionResults: [{ questionNumber: '1', status: 'correct', score: 2, maxScore: 2, errorType: 'N/A', weakTopics: [] }] }),
    ]));

    expect(report.errorStats).toEqual([]);
    expect(report.recommendations.map(recommendation => Object.values(recommendation).join(' ')).join(' ')).not.toMatch(/lỗi “(Không có|không có lỗi|N\/A)”/i);
  });

  it('đưa số liệu câu yếu, việc làm trên lớp và cách kiểm tra lại vào khuyến nghị', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', score: 4, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's2', studentKey: 'student-2', score: 5, questionResults: [{ questionNumber: '1', status: 'partial', score: 1, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's3', studentKey: 'student-3', score: 6, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Thiếu bước', weakTopics: ['Hàm số'] }] }),
    ]));

    const recommendationText = report.recommendations.map(recommendation => Object.values(recommendation).join(' ')).join(' ');
    expect(recommendationText).toContain('Câu 1');
    expect(recommendationText).toMatch(/0\/3|1\/3/);
    expect(recommendationText).toMatch(/phút|nhiệm vụ|phiếu thoát/i);
    expect(recommendationText).toMatch(/Kiểm tra lại|đạt ít nhất/i);
  });

  it('không kết luận câu yếu nếu question evidenceCount dưới 3', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        score: 6,
        questionResults: [
          { questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2 },
          { questionNumber: '2', status: 'correct', score: 2, maxScore: 2 },
        ],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        score: 6,
        questionResults: [
          { questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2 },
          { questionNumber: '2', status: 'correct', score: 2, maxScore: 2 },
        ],
      }),
      baseSubmission({
        id: 's3',
        studentKey: 'student-3',
        score: 6,
        questionResults: [{ questionNumber: '2', status: 'correct', score: 2, maxScore: 2 }],
      }),
    ]));

    expect(report.questionStats.find(question => question.questionNumber === '1')?.evidenceCount).toBe(2);
    expect(report.recommendations.some(recommendation => Object.values(recommendation).join(' ').includes('câu 1'))).toBe(false);
  });
});
