const ENUM_VALUES = new Set(['not_started', 'progressing', 'achieved', 'exceeded']);

export type SelfAssessmentCriterion = {
  criterionId: string;
  responseType: 'enum' | 'text';
  value: string;
};

export type SelfAssessmentPayload = { criteria: SelfAssessmentCriterion[] };

export const validateSelfAssessment = (
  contract: { successCriteria?: Array<{ id?: unknown }> },
  input: unknown,
): SelfAssessmentPayload => {
  if (!input || typeof input !== 'object' || !Array.isArray((input as { criteria?: unknown }).criteria)) throw new Error('INVALID_ASSESSMENT');
  const criteria = (input as { criteria: unknown[] }).criteria;
  const known = new Set((contract.successCriteria ?? []).map(item => item.id).filter((id): id is string => typeof id === 'string'));
  if (criteria.length === 0 || criteria.length > 32) throw new Error('INVALID_CRITERIA_COUNT');
  const normalized = criteria.map(item => {
    if (!item || typeof item !== 'object') throw new Error('INVALID_CRITERION');
    const value = item as Record<string, unknown>;
    if (typeof value.criterionId !== 'string' || !known.has(value.criterionId)) throw new Error('UNKNOWN_CRITERION');
    if (value.responseType !== 'enum' && value.responseType !== 'text') throw new Error('INVALID_RESPONSE_TYPE');
    if (typeof value.value !== 'string') throw new Error(value.responseType === 'text' ? 'INVALID_TEXT' : 'INVALID_ENUM');
    if (value.responseType === 'enum' && !ENUM_VALUES.has(value.value)) throw new Error('INVALID_ENUM');
    if (value.responseType === 'text' && (value.value.trim().length === 0 || value.value.length > 2000)) throw new Error('INVALID_TEXT');
    return { criterionId: value.criterionId, responseType: value.responseType, value: value.value } as SelfAssessmentCriterion;
  });
  if (new Set(normalized.map(item => item.criterionId)).size !== normalized.length) throw new Error('DUPLICATE_CRITERION');
  if (normalized.length !== known.size) throw new Error('INVALID_CRITERIA_COUNT');
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 12000) throw new Error('INVALID_ASSESSMENT');
  return { criteria: normalized };
};
