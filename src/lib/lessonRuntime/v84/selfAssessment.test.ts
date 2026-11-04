import { describe, expect, it } from 'vitest';
import { validateSelfAssessment } from './selfAssessment';

const contract = {
  successCriteria: [
    { id: 'SC1', statement: { vi: 'Nêu được cách giải' }, observableEvidence: 'Lời giải' },
    { id: 'SC2', statement: { vi: 'Giải thích được' }, observableEvidence: 'Giải thích' },
  ],
};

describe('V8.4 self-assessment validation', () => {
  it('accepts enum, text, and response type declared by the contract', () => {
    expect(validateSelfAssessment(contract, {
      criteria: [
        { criterionId: 'SC1', responseType: 'enum', value: 'achieved' },
        { criterionId: 'SC2', responseType: 'text', value: 'Em dùng đúng định lý.' },
      ],
    })).toEqual({
      criteria: [
        { criterionId: 'SC1', responseType: 'enum', value: 'achieved' },
        { criterionId: 'SC2', responseType: 'text', value: 'Em dùng đúng định lý.' },
      ],
    });
  });

  it('rejects unknown criteria and unsupported response types', () => {
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'NOPE', responseType: 'text', value: 'x' }] })).toThrow('UNKNOWN_CRITERION');
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC1', responseType: 'boolean', value: true }] })).toThrow('INVALID_RESPONSE_TYPE');
  });

  it('rejects invalid enum values and non-text values without inference', () => {
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC1', responseType: 'enum', value: 'maybe' }] })).toThrow('INVALID_ENUM');
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC2', responseType: 'text', value: 42 }] })).toThrow('INVALID_TEXT');
  });

  it('requires the exact non-empty goal set and rejects whitespace or oversized payloads', () => {
    expect(() => validateSelfAssessment(contract, { criteria: [] })).toThrow('INVALID_CRITERIA_COUNT');
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC1', responseType: 'text', value: '  ' }, { criterionId: 'SC2', responseType: 'enum', value: 'achieved' }] })).toThrow('INVALID_TEXT');
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC1', responseType: 'text', value: 'x'.repeat(2001) }, { criterionId: 'SC2', responseType: 'enum', value: 'achieved' }] })).toThrow('INVALID_TEXT');
    expect(() => validateSelfAssessment(contract, { criteria: [{ criterionId: 'SC1', responseType: 'enum', value: 'achieved' }, { criterionId: 'SC1', responseType: 'enum', value: 'achieved' }] })).toThrow('DUPLICATE_CRITERION');
  });
});
