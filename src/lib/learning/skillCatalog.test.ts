import { describe, expect, it } from 'vitest';
import {
  SKILL_CATALOG,
  findSkillByTopic,
  validateSkillCatalog,
} from './skillCatalog';

describe('skillCatalog — catalog pilot có định danh ổn định', () => {
  it('catalog có skillId duy nhất, alias duy nhất và không có prerequisite cycle', () => {
    expect(new Set(SKILL_CATALOG.map(skill => skill.skillId)).size).toBe(SKILL_CATALOG.length);
    expect(SKILL_CATALOG.every(skill => skill.skillId.startsWith('math.'))).toBe(true);
    expect(findSkillByTopic('phương trình đường thẳng')).toEqual({
      kind: 'unique',
      skill: expect.objectContaining({ skillId: 'math.line-equation' }),
    });
    expect(findSkillByTopic('chủ đề không có trong catalog')).toEqual({
      kind: 'unknown',
      topic: 'chủ đề không có trong catalog',
    });
    expect(validateSkillCatalog(SKILL_CATALOG)).toEqual([]);
  });

  it('topic khớp nhiều skill không bị nối mù', () => {
    expect(findSkillByTopic('hàm số')).toMatchObject({
      kind: 'ambiguous',
      topic: 'hàm số',
    });
  });

  it('mapping chuẩn hóa NFC và khoảng trắng nhưng không làm mất topic gốc', () => {
    expect(findSkillByTopic('  Phương   trình đường thẳng  ')).toMatchObject({
      kind: 'unique',
      skill: { skillId: 'math.line-equation' },
    });
  });
});
