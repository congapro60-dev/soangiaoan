import type { BuildStatus } from './lessonIR.generated';

export interface BuildGateContext {
  sourceVerified: boolean;
  qualityStatus: 'BLOCKED' | 'NEEDS_TEACHER_CONFIRMATION' | 'READY_WITH_WARNINGS' | 'READY';
  materialConfirmationsResolved: boolean;
  browserQaPassed: boolean;
  teacherApproved: boolean;
  banToanDocumentGate?: 'TEMPLATE_UNVERIFIED' | 'TEMPLATE_VERIFIED' | 'PASS';
}

const allowedNext: Record<BuildStatus, readonly BuildStatus[]> = {
  UPLOADED: ['EXTRACTED'],
  EXTRACTED: ['ANALYZED'],
  ANALYZED: ['SOURCE_REVIEW_REQUIRED', 'SOURCE_FROZEN'],
  SOURCE_REVIEW_REQUIRED: ['SOURCE_FROZEN'],
  SOURCE_FROZEN: ['PLAN_DRAFT'],
  PLAN_DRAFT: ['PLAN_VALIDATED'],
  PLAN_VALIDATED: ['PLAN_FROZEN'],
  PLAN_FROZEN: ['QUALITY_AUDIT'],
  QUALITY_AUDIT: ['QUALITY_REVIEW_REQUIRED', 'QUALITY_FROZEN'],
  QUALITY_REVIEW_REQUIRED: ['QUALITY_FROZEN'],
  QUALITY_FROZEN: ['DESIGN_DRAFT'],
  DESIGN_DRAFT: ['DESIGN_VALIDATED'],
  DESIGN_VALIDATED: ['DESIGN_FROZEN'],
  DESIGN_FROZEN: ['COMPILE_READY'],
  COMPILE_READY: ['COMPILED'],
  COMPILED: ['QA_RUNNING'],
  QA_RUNNING: ['QA_FAILED', 'READY_FOR_PREVIEW'],
  QA_FAILED: ['QA_RUNNING'],
  READY_FOR_PREVIEW: ['QA_RUNNING', 'TEACHER_APPROVED'],
  TEACHER_APPROVED: ['READY_TO_TEACH'],
  READY_TO_TEACH: ['PUBLISHED'],
  PUBLISHED: [],
};

export const transitionBuildStatus = (current: BuildStatus, next: BuildStatus, context: BuildGateContext): BuildStatus => {
  if (!allowedNext[current].includes(next)) {
    const expected = allowedNext[current].join(' hoặc ') || 'không có bước tiếp';
    throw new Error(`Không thể chuyển từ ${current} sang ${next}; bước kế tiếp: ${expected}.`);
  }
  if ((next === 'SOURCE_FROZEN' || next === 'COMPILE_READY') && !context.sourceVerified) {
    throw new Error('Gate S chưa xác minh nguồn.');
  }
  if ((next === 'QUALITY_FROZEN' || next === 'COMPILE_READY') && context.qualityStatus === 'BLOCKED') {
    throw new Error('Gate Q chưa đạt.');
  }
  if ((next === 'TEACHER_APPROVED' || next === 'READY_TO_TEACH' || next === 'PUBLISHED') && !context.browserQaPassed) {
    throw new Error('Browser QA chưa đạt.');
  }
  if ((next === 'TEACHER_APPROVED' || next === 'READY_TO_TEACH' || next === 'PUBLISHED') && !context.teacherApproved) {
    throw new Error('GV chưa duyệt lesson.');
  }
  if ((next === 'READY_TO_TEACH' || next === 'PUBLISHED') && !context.materialConfirmationsResolved) {
    throw new Error('Còn xác nhận quan trọng của GV chưa giải quyết.');
  }
  if ((next === 'READY_TO_TEACH' || next === 'PUBLISHED') && context.banToanDocumentGate !== 'PASS') {
    throw new Error('Ban Toán DOCX template chưa được xác minh.');
  }
  return next;
};
