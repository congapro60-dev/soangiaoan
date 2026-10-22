import { describe, expect, it } from 'vitest';
import { transitionBuildStatus } from './buildLifecycle';

const context = {
  sourceVerified: true,
  qualityStatus: 'READY' as const,
  materialConfirmationsResolved: true,
  browserQaPassed: true,
  teacherApproved: true,
  banToanDocumentGate: 'PASS' as const,
};

describe('V8.3.2 build lifecycle', () => {
  it('never skips Gate Q after the plan is frozen', () => {
    expect(() => transitionBuildStatus('PLAN_FROZEN', 'DESIGN_DRAFT', context)).toThrow(/QUALITY_AUDIT/);
    expect(transitionBuildStatus('PLAN_FROZEN', 'QUALITY_AUDIT', context)).toBe('QUALITY_AUDIT');
  });

  it('blocks quality freeze on a failed quality audit', () => {
    expect(() => transitionBuildStatus('QUALITY_AUDIT', 'QUALITY_FROZEN', {
      ...context, qualityStatus: 'BLOCKED',
    })).toThrow(/Gate Q/);
  });

  it('permits preview authoring while a material teacher confirmation is open', () => {
    expect(transitionBuildStatus('QUALITY_AUDIT', 'QUALITY_FROZEN', {
      ...context, qualityStatus: 'NEEDS_TEACHER_CONFIRMATION', materialConfirmationsResolved: false,
    })).toBe('QUALITY_FROZEN');
  });

  it('blocks Ready-to-Teach when a material confirmation remains unresolved', () => {
    expect(() => transitionBuildStatus('TEACHER_APPROVED', 'READY_TO_TEACH', {
      ...context, materialConfirmationsResolved: false,
    })).toThrow(/xác nhận/);
  });

  it('blocks Ready-to-Teach without true browser QA', () => {
    expect(() => transitionBuildStatus('TEACHER_APPROVED', 'READY_TO_TEACH', {
      ...context, browserQaPassed: false,
    })).toThrow(/Browser QA/);
  });

  it('blocks Ready-to-Teach when the official Ban Toan template is unverified', () => {
    expect(() => transitionBuildStatus('TEACHER_APPROVED', 'READY_TO_TEACH', {
      ...context, banToanDocumentGate: 'TEMPLATE_UNVERIFIED',
    })).toThrow(/Ban Toán/);
  });

  it('keeps Ready-to-Teach blocked until the verified template is rendered and checked', () => {
    expect(() => transitionBuildStatus('TEACHER_APPROVED', 'READY_TO_TEACH', {
      ...context, banToanDocumentGate: 'TEMPLATE_VERIFIED',
    })).toThrow(/Ban Toán/);
  });
});
