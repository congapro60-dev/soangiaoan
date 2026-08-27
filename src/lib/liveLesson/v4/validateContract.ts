import type {
  LiveLessonV4Contract,
  PublicTvField,
  V4ValidationError,
  V4ValidationResult,
} from './types';

const TOTAL_SECONDS = 2400;

// Allowlist field TV — mọi field khác coi là rò rỉ dữ liệu riêng tư.
const PUBLIC_TV_FIELDS: ReadonlySet<PublicTvField> = new Set<PublicTvField>([
  'cueId',
  'screenId',
  'status',
  'showStats',
  'participantCount',
  'submittedCount',
  'routeCounts',
  'errorCategoryCounts',
  'groupProgress',
  'updatedAt',
]);

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validateTimeline(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  if (contract.durationSeconds !== TOTAL_SECONDS) {
    errors.push({
      code: 'TIMELINE_NOT_2400',
      message: `durationSeconds phải là ${TOTAL_SECONDS}, nhận ${contract.durationSeconds}.`,
      path: 'durationSeconds',
    });
  }

  const blocks = contract.timeline;
  if (blocks.length === 0) {
    errors.push({ code: 'TIMELINE_NOT_2400', message: 'Timeline rỗng.', path: 'timeline' });
    return;
  }

  const ordered = [...blocks].sort((a, b) => a.startSeconds - b.startSeconds);

  if (ordered[0].startSeconds !== 0) {
    errors.push({
      code: 'TIMELINE_NOT_2400',
      message: `Block đầu phải bắt đầu ở giây 0, nhận ${ordered[0].startSeconds}.`,
      path: 'timeline[0].startSeconds',
    });
  }

  let covered = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const block = ordered[i];
    if (block.endSeconds <= block.startSeconds) {
      errors.push({
        code: 'TIMELINE_NOT_2400',
        message: `Block ${block.id} có khoảng thời gian không hợp lệ (${block.startSeconds}→${block.endSeconds}).`,
        path: `timeline.${block.id}`,
      });
      continue;
    }
    if (i > 0 && block.startSeconds !== ordered[i - 1].endSeconds) {
      errors.push({
        code: 'TIMELINE_NOT_2400',
        message: `Block ${block.id} không nối liền block trước (${ordered[i - 1].endSeconds}→${block.startSeconds}): có khoảng hở hoặc chồng lấn.`,
        path: `timeline.${block.id}`,
      });
    }
    covered += block.endSeconds - block.startSeconds;
  }

  const last = ordered[ordered.length - 1];
  if (last.endSeconds !== TOTAL_SECONDS) {
    errors.push({
      code: 'TIMELINE_NOT_2400',
      message: `Block cuối phải kết thúc ở ${TOTAL_SECONDS}, nhận ${last.endSeconds}.`,
      path: 'timeline.last.endSeconds',
    });
  }
  if (covered !== TOTAL_SECONDS) {
    errors.push({
      code: 'TIMELINE_NOT_2400',
      message: `Tổng thời lượng phủ ${covered} giây, phải đúng ${TOTAL_SECONDS}.`,
      path: 'timeline',
    });
  }
}

function validateStepIds(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const block of contract.timeline) {
    if (seen.has(block.id)) {
      dup.add(block.id);
    }
    seen.add(block.id);
  }
  for (const id of dup) {
    errors.push({
      code: 'DUPLICATE_STEP_ID',
      message: `Step id trùng: ${id}.`,
      path: `timeline.${id}`,
    });
  }

  const seenCheckpoint = new Set<string>();
  for (const checkpoint of contract.checkpoints) {
    if (seenCheckpoint.has(checkpoint.id)) {
      errors.push({
        code: 'DUPLICATE_STEP_ID',
        message: `Checkpoint id trùng: ${checkpoint.id}.`,
        path: `checkpoints.${checkpoint.id}`,
      });
    }
    seenCheckpoint.add(checkpoint.id);
  }
}

function validateCheckpoints(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  for (const checkpoint of contract.checkpoints) {
    if (isBlank(checkpoint.evidenceSignal)) {
      errors.push({
        code: 'CHECKPOINT_MISSING_EVIDENCE',
        message: `Checkpoint ${checkpoint.id} không nêu bằng chứng.`,
        path: `checkpoints.${checkpoint.id}.evidenceSignal`,
      });
    }
  }
}

function validateTaskVariants(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  const postCheckIds = new Set(
    contract.checkpoints.filter((c) => c.kind === 'post_check').map((c) => c.id),
  );

  for (const variant of contract.taskVariants) {
    if (variant.successCriteria.length === 0) {
      errors.push({
        code: 'TASK_VARIANT_MISSING_SUCCESS_CRITERIA',
        message: `Task variant ${variant.id} thiếu tiêu chí thành công.`,
        path: `taskVariants.${variant.id}.successCriteria`,
      });
    }
    if (isBlank(variant.postCheckId) || !postCheckIds.has(variant.postCheckId)) {
      errors.push({
        code: 'MISSING_POST_CHECK',
        message: `Task variant ${variant.id} không gắn post-check cá nhân hợp lệ.`,
        path: `taskVariants.${variant.id}.postCheckId`,
      });
    }
  }
}

function validateGlossary(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  for (const item of contract.glossary) {
    if (isBlank(item.sourceRef) || isBlank(item.reviewer) || isBlank(item.version)) {
      errors.push({
        code: 'GLOSSARY_MISSING_METADATA',
        message: `Thuật ngữ ${item.id} thiếu nguồn/người duyệt/phiên bản.`,
        path: `glossary.${item.id}`,
      });
    }
    if (item.status !== 'approved') {
      errors.push({
        code: 'UNAPPROVED_GLOSSARY',
        message: `Thuật ngữ ${item.id} có trạng thái "${item.status}"; chỉ approved mới được xuất bản.`,
        path: `glossary.${item.id}.status`,
      });
    }
  }
}

function validateTvProjection(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  for (const field of contract.projections.tv.fields) {
    if (!PUBLIC_TV_FIELDS.has(field as PublicTvField)) {
      errors.push({
        code: 'TV_PRIVATE_FIELD',
        message: `Projection TV chứa field không thuộc allowlist công khai: "${field}".`,
        path: 'projections.tv.fields',
      });
    }
  }
}

function validateOfflinePack(contract: LiveLessonV4Contract, errors: V4ValidationError[]): void {
  const pack = contract.offline;
  const missing: string[] = [];
  if (!pack.tvCuesIncluded) missing.push('cue/hình TV');
  if (!pack.glossaryPrintIncluded) missing.push('bảng thuật ngữ in');
  if (!pack.boardPlanIncluded) missing.push('bảng phụ mục tiêu/khung câu/rubric');
  if (!pack.aiErrorAnswerKeyIncluded) missing.push('đáp án lỗi AI');
  if (!pack.manualGroupingSheet) missing.push('danh sách nhóm thủ công');
  if (!pack.paperExitTicket) missing.push('exit ticket giấy');

  const routes = new Set(pack.routeCards);
  for (const route of ['M', 'S', 'C'] as const) {
    if (!routes.has(route)) missing.push(`thẻ nhiệm vụ tuyến ${route}`);
  }

  if (missing.length > 0) {
    errors.push({
      code: 'OFFLINE_PACK_INCOMPLETE',
      message: `Gói offline thiếu: ${missing.join(', ')}.`,
      path: 'offline',
    });
  }
}

/**
 * Kiểm tra một hợp đồng bài học V4 trước khi cho phép sinh projection hoặc xuất bản.
 * Trả về tất cả lỗi tìm được (không dừng ở lỗi đầu tiên) với mã ổn định.
 */
export function validateV4Contract(contract: LiveLessonV4Contract): V4ValidationResult {
  const errors: V4ValidationError[] = [];

  if (contract.schemaVersion !== 4) {
    errors.push({
      code: 'SCHEMA_VERSION_INVALID',
      message: `schemaVersion phải là 4, nhận ${contract.schemaVersion}.`,
      path: 'schemaVersion',
    });
  }

  validateTimeline(contract, errors);
  validateStepIds(contract, errors);
  validateCheckpoints(contract, errors);
  validateTaskVariants(contract, errors);
  validateGlossary(contract, errors);
  validateTvProjection(contract, errors);
  validateOfflinePack(contract, errors);

  return { ok: errors.length === 0, errors };
}
