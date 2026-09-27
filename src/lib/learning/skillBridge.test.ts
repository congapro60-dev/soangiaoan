import { describe, expect, it } from 'vitest';
import {
  mapObjectiveToSkill,
  mapTopicToSkill,
  toSkillEvidence,
} from './skillBridge';

describe('skillBridge — nối classroom topic và adaptive objective một cách bảo thủ', () => {
  it('map topic cụ thể, giữ unknown và ambiguous để không đoán sai', () => {
    expect(mapTopicToSkill('Phương trình đường thẳng')).toMatchObject({
      kind: 'unique',
      skill: { skillId: 'math.line-equation' },
    });
    expect(mapTopicToSkill('chủ đề chưa có')).toMatchObject({ kind: 'unknown' });
    expect(mapTopicToSkill('hàm số')).toMatchObject({ kind: 'ambiguous' });
  });

  it('chỉ nối adaptive objective khi objective có skillId explicit', () => {
    const baseObjective = {
      id: 'objective-1',
      code: 'MATH-1',
      title: 'Hàm số',
      description: 'Mô tả',
    };

    expect(mapObjectiveToSkill({ ...baseObjective, skillId: 'math.linear-function' })).toMatchObject({
      kind: 'unique',
      skill: { skillId: 'math.linear-function' },
    });
    expect(mapObjectiveToSkill(baseObjective)).toEqual({
      kind: 'unlinked',
      objectiveId: 'objective-1',
    });
  });

  it('chuẩn hóa evidence và kẹp score/confidence trong khoảng 0..1', () => {
    expect(toSkillEvidence({
      evidenceId: 'submission-1',
      topic: '  Phương   trình đường thẳng ',
      source: 'homework',
      signal: 'weak',
      scoreRatio: 1.4,
      confidence: -0.3,
      assignmentId: 'assignment-1',
      submissionId: 'submission-1',
      assessedAt: '2026-08-24T10:00:00.000Z',
      approved: true,
    })).toMatchObject({
      evidenceId: 'submission-1',
      skillId: 'math.line-equation',
      scoreRatio: 1,
      confidence: 0,
      approved: true,
    });
  });

  it('AI draft chưa duyệt không tạo authoritative skill evidence', () => {
    expect(toSkillEvidence({
      evidenceId: 'submission-draft',
      topic: 'phương trình đường thẳng',
      source: 'homework',
      signal: 'weak',
      confidence: 0.8,
      assessedAt: '2026-08-24T10:00:00.000Z',
      approved: false,
    })).toBeNull();
  });
});
