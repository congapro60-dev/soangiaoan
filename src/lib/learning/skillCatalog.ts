import type { SkillDefinition } from './skillTypes.js';

export const SKILL_CATALOG_VERSION = 'pilot-2026-08-24-v1';

const normalizeTopic = (topic: string): string =>
  topic.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN');

export type SkillTopicMatch =
  | { kind: 'unique'; skill: SkillDefinition }
  | { kind: 'unknown'; topic: string }
  | { kind: 'ambiguous'; topic: string; candidates: SkillDefinition[] };

/**
 * Catalog pilot cố ý nhỏ và bảo thủ. Alias rộng như "hàm số" có thể xuất hiện
 * ở nhiều skill; khi đó adapter phải trả ambiguous thay vì tự đoán.
 */
export const SKILL_CATALOG: SkillDefinition[] = [
  {
    skillId: 'math.line-equation',
    domain: 'math.coordinate-geometry',
    title: 'Lập và sử dụng phương trình đường thẳng',
    description: 'Xác định vectơ pháp tuyến/hệ số và lập phương trình đường thẳng trong mặt phẳng.',
    aliases: [
      'phương trình đường thẳng',
      'phương trình tổng quát của đường thẳng',
      'vectơ pháp tuyến',
      'vector pháp tuyến',
    ],
    prerequisiteSkillIds: [],
    misconceptionCodes: ['line-sign-error', 'normal-vector-confusion'],
    masteryThreshold: 0.75,
  },
  {
    skillId: 'math.linear-function',
    domain: 'math.functions',
    title: 'Đọc và phân tích hàm số bậc nhất',
    description: 'Nhận biết hệ số, chiều biến thiên và liên hệ giữa biểu thức với đồ thị hàm số bậc nhất.',
    aliases: [
      'hàm số bậc nhất',
      'đồ thị hàm số bậc nhất',
      'hệ số góc',
      'hàm số',
    ],
    prerequisiteSkillIds: [],
    misconceptionCodes: ['slope-sign-error', 'graph-reading-error'],
    masteryThreshold: 0.75,
  },
  {
    skillId: 'math.quadratic-function',
    domain: 'math.functions',
    title: 'Phân tích hàm số bậc hai',
    description: 'Đọc hệ số, đỉnh, chiều biến thiên và bảng biến thiên của hàm số bậc hai.',
    aliases: [
      'hàm số bậc hai',
      'đồ thị hàm số bậc hai',
      'bảng biến thiên',
      'hàm số',
    ],
    prerequisiteSkillIds: ['math.linear-function'],
    misconceptionCodes: ['vertex-calculation-error', 'variation-table-error'],
    masteryThreshold: 0.8,
  },
  {
    skillId: 'math.arithmetic-sequence',
    domain: 'math.sequences',
    title: 'Nhận diện và vận dụng cấp số cộng',
    description: 'Nhận diện công sai, tính số hạng/tổng và mô hình hóa tình huống tăng giảm đều bằng cấp số cộng.',
    aliases: [
      'cấp số cộng',
      'công sai',
      'số hạng tổng quát của cấp số cộng',
      'tổng n số hạng đầu',
    ],
    prerequisiteSkillIds: [],
    misconceptionCodes: ['common-difference-error', 'term-vs-sum-confusion', 'indexing-error'],
    masteryThreshold: 0.75,
  },
  {
    skillId: 'math.quadratic-equation',
    domain: 'math.algebra',
    title: 'Giải phương trình bậc hai',
    description: 'Nhận biết hệ số, biệt thức và nghiệm của phương trình bậc hai.',
    aliases: [
      'phương trình bậc hai',
      'nghiệm phương trình bậc hai',
      'biệt thức delta',
    ],
    prerequisiteSkillIds: [],
    misconceptionCodes: ['discriminant-error', 'quadratic-root-error'],
    masteryThreshold: 0.75,
  },
];

const hasCycle = (catalog: SkillDefinition[]): boolean => {
  const byId = new Map(catalog.map(skill => [skill.skillId, skill]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (skillId: string): boolean => {
    if (visiting.has(skillId)) return true;
    if (visited.has(skillId)) return false;

    visiting.add(skillId);
    const skill = byId.get(skillId);
    if (skill?.prerequisiteSkillIds.some(visit)) return true;
    visiting.delete(skillId);
    visited.add(skillId);
    return false;
  };

  return catalog.some(skill => visit(skill.skillId));
};

export const validateSkillCatalog = (catalog: SkillDefinition[]): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const skill of catalog) {
    if (ids.has(skill.skillId)) errors.push(`duplicate skillId: ${skill.skillId}`);
    ids.add(skill.skillId);

    const aliases = skill.aliases.map(normalizeTopic);
    if (new Set(aliases).size !== aliases.length) errors.push(`duplicate alias in ${skill.skillId}`);
    if (skill.masteryThreshold < 0 || skill.masteryThreshold > 1) {
      errors.push(`invalid masteryThreshold: ${skill.skillId}`);
    }
    for (const prerequisiteId of skill.prerequisiteSkillIds) {
      if (!catalog.some(candidate => candidate.skillId === prerequisiteId)) {
        errors.push(`missing prerequisite ${prerequisiteId} for ${skill.skillId}`);
      }
    }
  }

  if (hasCycle(catalog)) errors.push('prerequisite cycle detected');
  return errors;
};

const uniqueCandidates = (topic: string, catalog: SkillDefinition): boolean =>
  catalog.aliases.some(alias => normalizeTopic(alias) === topic);

export const findSkillByTopic = (topic: string, catalog: SkillDefinition[] = SKILL_CATALOG): SkillTopicMatch => {
  const originalTopic = topic.trim();
  const normalizedTopic = normalizeTopic(originalTopic);
  if (!normalizedTopic) return { kind: 'unknown', topic: originalTopic };

  // Exact alias match wins. This keeps a specific phrase from being made
  // ambiguous merely because it contains a broad alias such as "hàm số".
  const exactCandidates = catalog.filter(skill => uniqueCandidates(normalizedTopic, skill));
  if (exactCandidates.length === 1) return { kind: 'unique', skill: exactCandidates[0] };
  if (exactCandidates.length > 1) return { kind: 'ambiguous', topic: originalTopic, candidates: exactCandidates };

  // Only use containment for sufficiently specific aliases. If it still maps
  // to more than one skill, preserve the ambiguity for human review.
  const containsCandidates = catalog.filter(skill => skill.aliases.some(alias => {
    const normalizedAlias = normalizeTopic(alias);
    return normalizedAlias.length >= 8 && normalizedTopic.includes(normalizedAlias);
  }));
  const deduped = [...new Map(containsCandidates.map(skill => [skill.skillId, skill])).values()];
  if (deduped.length === 1) return { kind: 'unique', skill: deduped[0] };
  if (deduped.length > 1) return { kind: 'ambiguous', topic: originalTopic, candidates: deduped };
  return { kind: 'unknown', topic: originalTopic };
};
