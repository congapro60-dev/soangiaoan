/**
 * Sequential publication gate for 48 Ban Toán V4 lesson packages.
 *
 * Pure module — no Firebase, no AI calls. The UI calls this module and then
 * persists via the existing `saveLessonToFirestore` callback.
 *
 * Flow per sourceKey:
 *   1. Resolve existing AdaptiveLesson by sourceKey (via curriculumRef.lessonCode).
 *   2. If missing → create canonical draft from source (no AI).
 *   3. Audit the draft against the exact V4 contract.
 *   4. Only if audit passes → set status='published' and call save callback.
 *   5. Move to next sourceKey.
 *
 * Guards:
 *   - Never overwrites an already-published lesson.
 *   - Never overwrites a lesson whose curriculum/source identity differs from canonical.
 *   - Never overwrites content that was manually edited without audit proof.
 *   - Logs per-lesson errors; one failure does not abort the batch.
 */

import type { AdaptiveLesson } from '../../adaptive/types';
import {
  getBanToanV4Contract,
  getBanToanV4DisplayTitle,
  getBanToanV4PackageMetadata,
} from './lessonAdapter';
import { buildBanToanV4AdaptiveLessonDraft } from './adaptiveDraft';
import { validateV4Contract } from './validateContract';
import type { LiveLessonV4Contract } from './types';

// ── Audit result types ──────────────────────────────────────────────────

export interface AuditIssue {
  code: string;
  message: string;
  path?: string;
}

export interface AuditResult {
  sourceKey: string;
  packageId: string;
  passed: boolean;
  issues: AuditIssue[];
}

export interface PublicationReport {
  sourceKey: string;
  status: 'published' | 'skipped_already_published' | 'audit_failed' | 'error';
  issues: AuditIssue[];
  lessonId?: string;
}

export type SaveCallback = (lesson: AdaptiveLesson) => Promise<void>;

// ── Helpers ─────────────────────────────────────────────────────────────

const PLACEHOLDER_RE =
  /(đáp án đúng|phương án nhiễu|phương án đúng|giáo viên\s+(rà soát|bổ sung|cập nhật|kiểm tra)|bổ sung lời giải|câu hỏi đang được chuẩn bị|placeholder|lorem ipsum|sample answer|generic answer|câu hỏi đang được|đáp án sẽ được)/i;

/**
 * Reject truly placeholder/generic text. Short math answers from source
 * (like "$5$", "$1$", "$0$", "Có.") are valid — they come from the snapshot
 * and should NOT be flagged. Only reject when the content is clearly generic
 * placeholder text or empty.
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return PLACEHOLDER_RE.test(trimmed);
}

function isBlankOrGeneric(value: string | undefined): boolean {
  if (!value) return true;
  return value.trim().length < 3;
}

// ── Contract-level audit ────────────────────────────────────────────────

function auditContract(contract: LiveLessonV4Contract): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Contract validation (schema, timeline, steps, glossary, projection, offline, source content)
  const validation = validateV4Contract(contract);
  if (!validation.ok) {
    for (const err of validation.errors) {
      issues.push({ code: `CONTRACT_${err.code}`, message: err.message, path: err.path });
    }
  }

  // 2. Duration must be exactly 2400s
  if (contract.durationSeconds !== 2400) {
    issues.push({
      code: 'DURATION_NOT_2400',
      message: `durationSeconds phải là 2400, nhận ${contract.durationSeconds}.`,
    });
  }

  // 3. Five-step flow must sum to 40 minutes (2400s)
  const timelineSum = contract.timeline.reduce(
    (sum, b) => sum + (b.endSeconds - b.startSeconds),
    0,
  );
  if (timelineSum !== 2400) {
    issues.push({
      code: 'TIMELINE_SUM_NOT_2400',
      message: `Timeline tổng ${timelineSum}s, phải đúng 2400.`,
    });
  }

  // 4. Exactly 3 routes M/S/C
  const routes = contract.taskVariants.map((v) => v.route);
  const routeSet = new Set(routes);
  if (routes.length !== 3 || routeSet.size !== 3 || !routeSet.has('M') || !routeSet.has('S') || !routeSet.has('C')) {
    issues.push({
      code: 'ROUTES_NOT_MSC',
      message: `Cần đúng 3 tuyến M/S/C, nhận ${routes.join(',')}.`,
    });
  }

  // 5. Common post-check present
  const postCheck = contract.checkpoints.find((c) => c.kind === 'post_check');
  if (!postCheck) {
    issues.push({
      code: 'MISSING_POST_CHECK',
      message: 'Thiếu checkpoint post_check chung.',
    });
  }

  // 6. Diagnostic: 5 questions (via sourceContent exercises)
  if (!contract.sourceContent || contract.sourceContent.exercises.length !== 6) {
    issues.push({
      code: 'SOURCE_EXERCISES_NOT_6',
      message: `sourceContent.exercises cần 6 bài, nhận ${contract.sourceContent?.exercises.length ?? 0}.`,
    });
  }

  // 7. Quick-check: 2 questions
  if (!contract.sourceContent || contract.sourceContent.quickChecks.length !== 2) {
    issues.push({
      code: 'SOURCE_QUICK_NOT_2',
      message: `sourceContent.quickChecks cần 2 câu, nhận ${contract.sourceContent?.quickChecks.length ?? 0}.`,
    });
  }

  // 8. Examples: 2
  if (!contract.sourceContent || contract.sourceContent.examples.length !== 2) {
    issues.push({
      code: 'SOURCE_EXAMPLES_NOT_2',
      message: `sourceContent.examples cần 2 ví dụ, nhận ${contract.sourceContent?.examples.length ?? 0}.`,
    });
  }

  // 9. AI Error fully present
  const aiError = contract.aiError;
  if (!aiError) {
    issues.push({ code: 'MISSING_AI_ERROR', message: 'Thiếu AI Error of the Week.' });
  } else {
    if (isBlankOrGeneric(aiError.faultyStatement)) issues.push({ code: 'AI_ERROR_EMPTY_FAULTY', message: 'AI Error faultyStatement rỗng.' });
    if (isBlankOrGeneric(aiError.correction)) issues.push({ code: 'AI_ERROR_EMPTY_CORRECTION', message: 'AI Error correction rỗng.' });
    if (isBlankOrGeneric(aiError.proof)) issues.push({ code: 'AI_ERROR_EMPTY_PROOF', message: 'AI Error proof rỗng.' });
    if (!aiError.category) issues.push({ code: 'AI_ERROR_NO_CATEGORY', message: 'AI Error thiếu category.' });
  }

  // 10. Glossary: vi/en/ja/ko/zh approved
  const glossaryItems = contract.glossary ?? [];
  if (glossaryItems.length === 0) {
    issues.push({ code: 'GLOSSARY_EMPTY', message: 'Glossary rỗng.' });
  }
  for (const item of glossaryItems) {
    if (item.status !== 'approved') {
      issues.push({
        code: 'GLOSSARY_UNAPPROVED',
        message: `Thuật ngữ "${item.vietnamese}" có status "${item.status}", cần approved.`,
        path: `glossary.${item.id}`,
      });
    }
    const translations = item.translations;
    if (!translations.en || !translations.ja || !translations.ko || !translations.zh) {
      const missing = ['en', 'ja', 'ko', 'zh'].filter((lang) => !translations[lang as keyof typeof translations]);
      issues.push({
        code: 'GLOSSARY_MISSING_TRANSLATION',
        message: `Thuật ngữ "${item.vietnamese}" thiếu bản dịch: ${missing.join(', ')}.`,
        path: `glossary.${item.id}.translations`,
      });
    }
  }

  return issues;
}

// ── Adaptive lesson audit (against canonical source) ────────────────────

function auditAdaptiveLesson(
  lesson: AdaptiveLesson,
  contract: LiveLessonV4Contract,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. curriculumRef.lessonCode must match sourceKey exactly
  if (lesson.curriculumRef?.lessonCode !== contract.sourceKey) {
    issues.push({
      code: 'SOURCE_KEY_MISMATCH',
      message: `curriculumRef.lessonCode "${lesson.curriculumRef?.lessonCode}" không khớp sourceKey "${contract.sourceKey}".`,
    });
  }

  // 2. Duration must be 40 minutes
  if (lesson.durationMinutes !== 40) {
    issues.push({
      code: 'DURATION_NOT_40',
      message: `durationMinutes phải 40, nhận ${lesson.durationMinutes}.`,
    });
  }

  // 3. Five-step flow: 5 steps, total = 40 minutes
  const steps = lesson.fiveStepFlow?.steps ?? [];
  if (steps.length !== 5) {
    issues.push({
      code: 'FIVE_STEP_NOT_5',
      message: `fiveStepFlow cần 5 bước, nhận ${steps.length}.`,
    });
  }
  const stepSum = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  if (stepSum !== 40) {
    issues.push({
      code: 'FIVE_STEP_SUM_NOT_40',
      message: `fiveStepFlow tổng ${stepSum} phút, phải đúng 40.`,
    });
  }

  // 4. Diagnostic: 5 questions
  const diagCount = lesson.diagnosticTest?.questions?.length ?? 0;
  if (diagCount < 5) {
    issues.push({
      code: 'DIAGNOSTIC_UNDER_5',
      message: `diagnosticTest cần ≥5 câu, nhận ${diagCount}.`,
    });
  }
  // Check diagnostic questions are not placeholder
  const sourceExercises = contract.sourceContent?.exercises ?? [];
  for (const [index, q] of (lesson.diagnosticTest?.questions ?? []).entries()) {
    if (isPlaceholder(q.prompt)) {
      issues.push({ code: 'DIAGNOSTIC_PLACEHOLDER', message: `Câu hỏi diagnostic "${q.id}" là placeholder.` });
    }
    if (isPlaceholder(q.correctAnswer)) {
      issues.push({ code: 'DIAGNOSTIC_ANSWER_PLACEHOLDER', message: `Đáp án diagnostic "${q.id}" là placeholder.` });
    }
    const expected = sourceExercises[index];
    if (expected && (q.prompt !== expected.question || q.correctAnswer !== expected.answer)) {
      issues.push({ code: 'DIAGNOSTIC_NOT_FROM_SOURCE', message: `Câu diagnostic ${index + 1} không khớp nội dung nguồn.` });
    }
  }

  // 5. Quick-check: 2 questions per unit
  const unit = lesson.knowledgeUnits?.[0];
  if (!unit) {
    issues.push({ code: 'KNOWLEDGE_UNIT_MISSING', message: 'Bài học phải có ít nhất một mảnh kiến thức.' });
  }
  for (const unit of lesson.knowledgeUnits ?? []) {
    const qcCount = unit.quickCheck?.questions?.length ?? 0;
    if (qcCount < 2) {
      issues.push({
        code: 'QUICK_CHECK_UNDER_2',
        message: `knowledgeUnit "${unit.id}" quickCheck cần ≥2 câu, nhận ${qcCount}.`,
      });
    }
  }
  if (unit) {
    const sourceQuickChecks = contract.sourceContent?.quickChecks ?? [];
    for (const [index, question] of unit.quickCheck.questions.entries()) {
      const expected = sourceQuickChecks[index];
      if (expected && (question.prompt !== expected.question || question.correctAnswer !== expected.solution)) {
        issues.push({ code: 'QUICK_CHECK_NOT_FROM_SOURCE', message: `Quick-check ${index + 1} không khớp nội dung nguồn.` });
      }
    }
    for (const formula of contract.sourceContent?.formulas ?? []) {
      if (!unit.knowledgeConclusion.includes(formula)) {
        issues.push({ code: 'KNOWLEDGE_CONCLUSION_NOT_FROM_SOURCE', message: `Mảnh kiến thức thiếu công thức nguồn: ${formula}.` });
      }
    }
  }

  // 6. Exit-ticket: 3 questions
  const etCount = lesson.exitTicket?.questions?.length ?? 0;
  if (etCount < 3) {
    issues.push({
      code: 'EXIT_TICKET_UNDER_3',
      message: `exitTicket cần ≥3 câu, nhận ${etCount}.`,
    });
  }
  const expectedExitQuestions: Array<{ question: string; answer: string } | undefined> = [
    sourceExercises[3] ? { question: sourceExercises[3].question, answer: sourceExercises[3].answer } : undefined,
    contract.sourceContent?.quickChecks[0]
      ? { question: contract.sourceContent.quickChecks[0].question, answer: contract.sourceContent.quickChecks[0].solution }
      : undefined,
    sourceExercises[4] ? { question: sourceExercises[4].question, answer: sourceExercises[4].answer } : undefined,
  ];
  for (const [index, question] of (lesson.exitTicket?.questions ?? []).entries()) {
    const expected = expectedExitQuestions[index];
    if (expected && (question.prompt !== expected.question || question.correctAnswer !== expected.answer)) {
      issues.push({ code: 'EXIT_TICKET_NOT_FROM_SOURCE', message: `Exit ticket ${index + 1} không khớp nội dung nguồn.` });
    }
  }

  // 7. Three routes M/S/C present in knowledge unit
  if (unit) {
    const unitRoutes = unit.routes.map((r) => r.route);
    const unitRouteSet = new Set(unitRoutes);
    if (!unitRouteSet.has('foundation') || !unitRouteSet.has('standard') || !unitRouteSet.has('challenge')) {
      issues.push({
        code: 'UNIT_MISSING_ROUTES',
        message: `knowledgeUnit cần đủ 3 tuyến foundation/standard/challenge, nhận ${unitRoutes.join(',')}.`,
      });
    }

    // 8. Each route must have worked example with real content (not placeholder)
    for (const route of unit.routes) {
      const expectedExample = route.route === 'challenge'
        ? contract.sourceContent?.examples[1]
        : contract.sourceContent?.examples[0];
      for (const ex of route.workedExamples) {
        if (isPlaceholder(ex.problem) || isPlaceholder(ex.solution)) {
          issues.push({
            code: 'WORKED_EXAMPLE_PLACEHOLDER',
            message: `Ví dụ tuyến ${route.route} "${ex.id}" là placeholder.`,
          });
        }
        if (!expectedExample || ex.problem !== expectedExample.question || ex.solution !== expectedExample.solution) {
          issues.push({
            code: 'WORKED_EXAMPLE_NOT_FROM_SOURCE',
            message: `Ví dụ tuyến ${route.route} không khớp đúng ví dụ nguồn của ${contract.sourceKey}.`,
          });
        }
      }
      // 9. Each route practice task must have real expectedAnswer from source
      for (const task of route.practiceTasks) {
        if (isPlaceholder(task.expectedAnswer)) {
          issues.push({
            code: 'PRACTICE_TASK_PLACEHOLDER',
            message: `Bài tập tuyến ${route.route} "${task.id}" expectedAnswer là placeholder.`,
          });
        }
        const expectedLevel = route.route === 'foundation' ? 'NB' : route.route === 'standard' ? 'TH' : 'VD';
        const expectedExercise = (contract.sourceContent?.exercises ?? []).find((exercise) => exercise.level === expectedLevel);
        if (!expectedExercise || task.prompt !== expectedExercise.question || task.expectedAnswer !== expectedExercise.answer) {
          issues.push({
            code: 'PRACTICE_TASK_NOT_FROM_SOURCE',
            message: `Bài tập tuyến ${route.route} không khớp đúng bài nguồn theo mức ${expectedLevel}.`,
          });
        }
      }
    }
  }

  // 10. Source-specific answers: exercises in unit must match source exercises
  if (unit) {
    for (const route of unit.routes) {
      for (const task of route.practiceTasks) {
        const matchingSource = sourceExercises.find((se) => se.answer === task.expectedAnswer);
        if (!matchingSource && sourceExercises.length > 0) {
          // Allow if expectedAnswer is genuinely derived (contains source answer as substring)
          const derivedFromSource = sourceExercises.some(
            (se) => se.answer && task.expectedAnswer && task.expectedAnswer.includes(se.answer.substring(0, 20)),
          );
          if (!derivedFromSource) {
            issues.push({
              code: 'ANSWER_NOT_FROM_SOURCE',
              message: `expectedAnswer cho tuyến ${route.route} không truy nguyên được từ nguồn.`,
            });
          }
        }
      }
    }
  }

  // 11. AI Error must be present and retain the canonical correction/proof.
  const misconceptions = lesson.objectives?.flatMap((objective) => objective.commonMisconceptions ?? []) ?? [];
  const canonicalAiError = contract.aiError;
  const hasCanonicalAiError = misconceptions.some((item) => (
    item.description === canonicalAiError.faultyStatement
    && item.remediationHint.includes(canonicalAiError.correction)
    && item.remediationHint.includes(canonicalAiError.proof)
  ));
  if (!hasCanonicalAiError) {
    issues.push({ code: 'AI_ERROR_CONTENT_MISMATCH', message: 'AI Error trong AdaptiveLesson không khớp faulty statement, correction và proof nguồn.' });
  }

  // 12. generationWarnings should not mask real content issues
  // (generationWarnings with "candidate" is expected, not an issue)

  return issues;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Audit a single AdaptiveLesson against its canonical V4 contract.
 * Pure function — does not write to any store.
 */
export function auditLesson(
  lesson: AdaptiveLesson,
  sourceKey: string,
): AuditResult {
  const contract = getBanToanV4Contract(sourceKey);
  const packageId = `g${contract.source?.grade}_w${contract.source?.week}_p${contract.source?.period}_v4`;
  const issues: AuditIssue[] = [];

  // Contract-level audit
  issues.push(...auditContract(contract));

  // Adaptive lesson audit
  issues.push(...auditAdaptiveLesson(lesson, contract));

  return {
    sourceKey,
    packageId,
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Build a canonical draft for a sourceKey (no AI, deterministic from source).
 * This is the same as `buildBanToanV4AdaptiveLessonDraft` but with a canonical
 * teacherId placeholder and status='draft'.
 */
export function buildCanonicalDraft(
  sourceKey: string,
  teacherId: string,
): AdaptiveLesson {
  return buildBanToanV4AdaptiveLessonDraft(sourceKey, teacherId);
}

export interface SequentialPublicationOptions {
  /** Existing lessons indexed by sourceKey (curriculumRef.lessonCode). */
  existingLessons: Map<string, AdaptiveLesson>;
  /** Teacher ID for new canonical drafts. */
  teacherId: string;
  /** Callback to persist each lesson. Called once per lesson before moving on. */
  save: SaveCallback;
  /** Optional: only publish these sourceKeys (default: all 48). */
  sourceKeys?: string[];
}

/**
 * Publish lessons sequentially by sourceKey order.
 * One lesson at a time: audit → save → next.
 * Errors on one lesson do not abort the batch.
 */
export async function publishSequentially(
  options: SequentialPublicationOptions,
): Promise<PublicationReport[]> {
  const {
    existingLessons,
    teacherId,
    save,
    sourceKeys,
  } = options;

  const allMetadata = getBanToanV4PackageMetadata();
  const keys = sourceKeys ?? allMetadata.map((m) => m.sourceKey);
  const reports: PublicationReport[] = [];

  for (const sourceKey of keys) {
    const meta = allMetadata.find((m) => m.sourceKey === sourceKey);
    if (!meta) {
      reports.push({
        sourceKey,
        status: 'error',
        issues: [{ code: 'UNKNOWN_SOURCE_KEY', message: `Không tìm thấy metadata cho sourceKey "${sourceKey}".` }],
      });
      continue;
    }

    const existing = existingLessons.get(sourceKey);
    const contract = getBanToanV4Contract(sourceKey);

    // Skip already published
    if (existing?.status === 'published') {
      reports.push({
        sourceKey,
        status: 'skipped_already_published',
        issues: [],
        lessonId: existing.id,
      });
      continue;
    }

    // If existing lesson has different source identity, block
    if (existing && existing.curriculumRef?.lessonCode !== sourceKey) {
      reports.push({
        sourceKey,
        status: 'audit_failed',
        issues: [{
          code: 'FOREIGN_SOURCE_IDENTITY',
          message: `Bài học "${existing.id}" có curriculumRef.lessonCode "${existing.curriculumRef?.lessonCode}", không khớp "${sourceKey}".`,
        }],
        lessonId: existing.id,
      });
      continue;
    }

    if (existing && existing.teacherId !== teacherId) {
      reports.push({
        sourceKey,
        status: 'audit_failed',
        issues: [{
          code: 'FOREIGN_TEACHER_IDENTITY',
          message: `Bài học "${existing.id}" thuộc giáo viên khác; không được ghi đè.`,
        }],
        lessonId: existing.id,
      });
      continue;
    }

    // Build or use existing draft
    let lessonToPublish: AdaptiveLesson;
    if (existing) {
      lessonToPublish = {
        ...existing,
        // V4 list titles are the teacher-facing lookup key; repair legacy
        // technical suffixes without changing the lesson content.
        title: getBanToanV4DisplayTitle(sourceKey),
      };
    } else {
      // Create canonical draft from source (no AI)
      lessonToPublish = buildCanonicalDraft(sourceKey, teacherId);
    }

    // Audit
    const audit = auditLesson(lessonToPublish, sourceKey);

    if (!audit.passed) {
      reports.push({
        sourceKey,
        status: 'audit_failed',
        issues: audit.issues,
        lessonId: lessonToPublish.id,
      });
      continue;
    }

    // Publish: set status and persist
    const publishedLesson: AdaptiveLesson = {
      ...lessonToPublish,
      status: 'published',
      updatedAt: new Date().toISOString(),
    };

    try {
      await save(publishedLesson);
      reports.push({
        sourceKey,
        status: 'published',
        issues: [],
        lessonId: publishedLesson.id,
      });
    } catch (saveError) {
      reports.push({
        sourceKey,
        status: 'error',
        issues: [{
          code: 'SAVE_FAILED',
          message: `Lỗi lưu bài "${sourceKey}": ${saveError instanceof Error ? saveError.message : String(saveError)}`,
        }],
        lessonId: lessonToPublish.id,
      });
    }
  }

  return reports;
}

/**
 * Get all 48 source keys in canonical order.
 */
export function getAllSourceKeys(): string[] {
  return getBanToanV4PackageMetadata().map((m) => m.sourceKey);
}

/**
 * Count statistics from a batch of publication reports.
 */
export function summarizeReports(reports: PublicationReport[]): {
  total: number;
  published: number;
  skipped: number;
  failed: number;
  errors: number;
} {
  return {
    total: reports.length,
    published: reports.filter((r) => r.status === 'published').length,
    skipped: reports.filter((r) => r.status === 'skipped_already_published').length,
    failed: reports.filter((r) => r.status === 'audit_failed').length,
    errors: reports.filter((r) => r.status === 'error').length,
  };
}
