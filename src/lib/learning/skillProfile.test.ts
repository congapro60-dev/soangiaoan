import { describe, expect, it } from 'vitest';
import {
  buildHomeworkSkillEvidence,
  buildOnlineSkillEvidence,
  buildPracticeSkillEvidence,
  buildSkillSummary,
} from './skillProfile';

describe('skillProfile — chuẩn hóa evidence trước khi ghi ledger', () => {
  it('approved homework tạo một evidence cho skill yếu, giữ source/assignment và bỏ topic unknown', () => {
    const evidence = buildHomeworkSkillEvidence({
      submissionId: 'submission-1',
      assignmentId: 'assignment-1',
      grade: {
        score: 6,
        maxScore: 10,
        weakTopics: ['phương trình đường thẳng', 'chủ đề chưa có'],
        strengths: [],
        teacherApproved: true,
        gradedAt: '2026-08-24T10:00:00.000Z',
      },
    });

    expect(evidence).toEqual([
      expect.objectContaining({
        evidenceId: 'submission-1:math.line-equation',
        skillId: 'math.line-equation',
        source: 'homework',
        signal: 'weak',
        assignmentId: 'assignment-1',
        submissionId: 'submission-1',
        approved: true,
      }),
    ]);
  });

  it('homework chưa duyệt không tạo authoritative evidence', () => {
    expect(buildHomeworkSkillEvidence({
      submissionId: 'submission-draft',
      grade: {
        score: 10,
        maxScore: 10,
        weakTopics: [],
        strengths: ['phương trình đường thẳng'],
        teacherApproved: false,
        gradedAt: '2026-08-24T10:00:00.000Z',
      },
    })).toEqual([]);
  });

  it('practice dùng skillIds đã kiểm chứng hoặc alias unique, không nâng thành evidence homework', () => {
    const evidence = buildPracticeSkillEvidence({
      attemptId: 'attempt-1',
      setId: 'set-1',
      skillIds: ['math.line-equation'],
      topics: ['phương trình đường thẳng'],
      score: 1,
      maxScore: 2,
      updatedAt: '2026-08-24T11:00:00.000Z',
      status: 'graded',
    });

    expect(evidence).toEqual([
      expect.objectContaining({
        evidenceId: 'attempt-1:math.line-equation',
        attemptId: 'attempt-1',
        source: 'practice',
        signal: 'partial',
        confidence: 0.5,
      }),
    ]);
  });

  it('summary luôn có đủ skill catalog để UI phân biệt not_seen với developing', () => {
    const states = buildSkillSummary(buildPracticeSkillEvidence({
      attemptId: 'attempt-1',
      setId: 'set-1',
      skillIds: ['math.line-equation'],
      topics: [],
      score: 2,
      maxScore: 2,
      updatedAt: '2026-08-24T11:00:00.000Z',
      status: 'graded',
    }));

    expect(states).toHaveLength(5);
    expect(states.find(state => state.skillId === 'math.line-equation')?.status).toBe('developing');
    expect(states.find(state => state.skillId === 'math.quadratic-function')?.status).toBe('not_seen');
  });

  it('online chỉ tạo minh chứng homework khi điểm đã chính thức và không nhận skill lạ', () => {
    expect(buildOnlineSkillEvidence({
      attemptId: 'attempt-online-1',
      assignmentId: 'assignment-online-1',
      skillIds: ['math.line-equation', 'skill-khong-ton-tai'],
      score: 8,
      maxScore: 10,
      teacherApproved: true,
      gradedAt: '2026-08-24T12:00:00.000Z',
    })).toEqual([expect.objectContaining({
      evidenceId: 'attempt-online-1:math.line-equation',
      skillId: 'math.line-equation',
      source: 'homework',
      signal: 'strong',
      assignmentId: 'assignment-online-1',
      submissionId: 'attempt-online-1',
      approved: true,
    })]);

    expect(buildOnlineSkillEvidence({
      attemptId: 'attempt-draft',
      skillIds: ['math.line-equation'],
      score: 10,
      maxScore: 10,
      teacherApproved: false,
      gradedAt: '2026-08-24T12:00:00.000Z',
    })).toEqual([]);
  });
});
