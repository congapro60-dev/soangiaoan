import type { LessonIRV83 } from './lessonIRSchema';
import { validateLessonIRSchema } from './lessonIRSchema';
import { validateLessonIRReferences } from './runtimePackage';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';
import { parseMathVisualExtension } from '../../lessonRuntime/v84/mathVisual/extension';
import { validateV84ActivityBudgets } from '../../lessonRuntime/v84/budgetContract';
import { verifySourceBundleHash, type LessonSourceBundle } from '../../lessonGen/sourceIngestion';
import { canFreezeSourceBundle, type SourceVerificationRecord, type TeacherCanonicalSourceApproval } from '../../lessonGen/sourceVerification';
import { buildSourceModel, type SourceModel } from './sourceModel';
import { parseV871ExperienceExtension, type V871Experience } from './experienceExtension';
import { evaluateExperienceDesign, type ExperienceResult } from './experienceDesign';
import { evaluateLearningQuality, type LearningQualityResult } from './qualityGate';
import { validateExperienceAuthoringPlan, validateExperiencePlanMapping, type ExperienceAuthoringPlanV1 } from './experienceAuthoring';
import { V88_1_VERSION, V88_1_LABEL } from './v88Version';

export interface V871PackageInput {
  lessonIR: LessonIRV83;
  sourceSnapshot: {
    sourceBundle: LessonSourceBundle;
    verificationRecords: SourceVerificationRecord[];
    sourceApproval?: TeacherCanonicalSourceApproval | null;
  };
  ownerUid: string;
  authoringPlan?: ExperienceAuthoringPlanV1;
  teacherArchetypeChoice?: 'practice' | 'review_diagnostic';
}

export interface V871Artifact {
  name: string;
  mediaType: 'text/markdown' | 'application/json';
  content: string;
  sha256: string;
}

export interface V871OwnerPackage {
  access: 'OWNER_PRIVATE';
  version: typeof V88_1_VERSION;
  sourceHash: string;
  contentHash: string;
  packageHash: string;
  files: V871Artifact[];
  experience: ExperienceResult;
  quality: LearningQualityResult;
  releaseStatus: 'NOT_CERTIFIED';
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertSafeInputGraph(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (value === undefined) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error('V871_JSON_INVALID:nonfinite_or_negative_zero');
    }
    return;
  }
  if (typeof value !== 'object') {
    throw new Error(`V871_JSON_INVALID:unsafe_type:${typeof value}`);
  }
  const obj = value as object;
  if (ancestors.has(obj)) {
    throw new Error('V871_JSON_INVALID:cycle');
  }
  const isArr = Array.isArray(obj);
  const proto = Object.getPrototypeOf(obj);
  if (proto !== (isArr ? Array.prototype : Object.prototype) && !(proto === null && !isArr)) {
    throw new Error('V871_JSON_INVALID:unsafe_prototype');
  }
  ancestors.add(obj);
  try {
    const keys = Reflect.ownKeys(obj);
    if (isArr && keys.length !== (obj as unknown[]).length + 1) {
      throw new Error('V871_JSON_INVALID:invalid_array_length_or_properties');
    }
    for (const key of keys) {
      if (typeof key === 'symbol') {
        throw new Error('V871_JSON_INVALID:symbol_key');
      }
      if (isArr && key === 'length') {
        const lenDesc = Object.getOwnPropertyDescriptor(obj, 'length');
        if (!lenDesc || 'get' in lenDesc || 'set' in lenDesc || !('value' in lenDesc) || typeof lenDesc.value !== 'number') {
          throw new Error('V871_JSON_INVALID:invalid_descriptor:length');
        }
        continue;
      }
      if (UNSAFE_KEYS.has(key)) {
        throw new Error(`V871_JSON_INVALID:unsafe_key:${key}`);
      }
      if (isArr && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= (obj as unknown[]).length)) {
        throw new Error(`V871_JSON_INVALID:invalid_array_key:${key}`);
      }
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      if (!desc) {
        throw new Error(`V871_JSON_INVALID:invalid_descriptor:${key}`);
      }
      if ('get' in desc || 'set' in desc || typeof desc.get === 'function' || typeof desc.set === 'function') {
        throw new Error(`V871_JSON_INVALID:invalid_descriptor:${key}`);
      }
      if (!desc.enumerable || !('value' in desc)) {
        throw new Error(`V871_JSON_INVALID:invalid_descriptor:${key}`);
      }
      const val = desc.value;
      if (typeof val === 'function' || typeof val === 'symbol') {
        throw new Error(`V871_JSON_INVALID:invalid_descriptor:${key}`);
      }
      assertSafeInputGraph(val, ancestors);
    }
  } finally {
    ancestors.delete(obj);
  }
}

function stableStringify(value: unknown, indent?: number, ancestors = new Set<object>()): string {
  assertSafeInputGraph(value, ancestors);
  return formatStableJson(value, indent, 0, ancestors);
}

function formatStableJson(
  value: unknown,
  indent: number | undefined,
  currentIndent: number,
  ancestors: Set<object>,
): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  const obj = value as object;
  ancestors.add(obj);
  try {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.map(item => formatStableJson(item, indent, currentIndent + (indent ?? 0), ancestors));
      if (indent !== undefined) {
        const pad = ' '.repeat(currentIndent + indent);
        const endPad = ' '.repeat(currentIndent);
        return `[\n${items.map(it => `${pad}${it}`).join(',\n')}\n${endPad}]`;
      }
      return `[${items.join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    if (keys.length === 0) return '{}';
    const entries: string[] = [];
    for (const key of keys) {
      const val = (obj as Record<string, unknown>)[key];
      if (val === undefined) continue;
      const formattedVal = formatStableJson(val, indent, currentIndent + (indent ?? 0), ancestors);
      if (indent !== undefined) {
        const pad = ' '.repeat(currentIndent + indent);
        entries.push(`${pad}${JSON.stringify(key)}: ${formattedVal}`);
      } else {
        entries.push(`${JSON.stringify(key)}:${formattedVal}`);
      }
    }
    if (indent !== undefined) {
      const endPad = ' '.repeat(currentIndent);
      return `{\n${entries.join(',\n')}\n${endPad}}`;
    }
    return `{${entries.join(',')}}`;
  } finally {
    ancestors.delete(obj);
  }
}

async function sha256Utf8(content: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeContent(raw: string): string {
  let text = raw.normalize('NFC').replace(/\r\n|\r/g, '\n');
  while (text.endsWith('\n\n')) {
    text = text.slice(0, -1);
  }
  if (!text.endsWith('\n')) {
    text += '\n';
  }
  return text;
}

/**
 * Pure deterministic owner-private package exporter for V8.8.1 authoring artifacts.
 *
 * PRECONDITIONS & BOUNDED SECURITY GUARANTEES:
 * - Supported input: Native JSON / Firestore-decoded plain data graphs with standard Object/Array prototypes.
 * - Descriptors & prototypes: Validates entire accepted input graph with own property descriptors
 *   recursively before any property reads or structured cloning. Rejects accessor descriptors
 *   (getters/setters), non-plain prototypes, functions, symbols, and cycle references fail-closed.
 * - Transparent Proxy Limitation: Transparent JavaScript Proxies cannot be reliably detected
 *   trap-free in userland browser JavaScript without invoking Proxy traps. Callers must supply
 *   deserialized plain data structures, never arbitrary executable Proxy objects.
 * - Determinism: Per-file NFC normalization, LF line endings, stable JSON key ordering, and
 *   alphabetically sorted object-map entries (questions, visuals, reveal policies) while
 *   preserving authored timeline array sequences.
 */
export async function exportV871OwnerPrivatePackage(input: V871PackageInput): Promise<V871OwnerPackage> {
  // 1. Snapshot and owner validation
  if (!input || typeof input !== 'object') {
    throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  }

  // Validate entire accepted input graph with own property descriptors before any reads or clone
  assertSafeInputGraph(input);

  if (!input.sourceSnapshot || !input.sourceSnapshot.sourceBundle || !Array.isArray(input.sourceSnapshot.verificationRecords)) {
    throw new Error('V871_SOURCE_SNAPSHOT_REQUIRED');
  }
  if (!input.ownerUid || typeof input.ownerUid !== 'string' || !input.ownerUid.trim()) {
    throw new Error('V871_OWNER_CONTEXT_REQUIRED');
  }

  // Deep detached snapshot immediately before first await
  const detachedInput = structuredClone(input);
  const { lessonIR: lesson, sourceSnapshot, ownerUid } = detachedInput;
  const { sourceBundle: bundle, verificationRecords, sourceApproval } = sourceSnapshot;

  // 2. verifySourceBundleHash
  if (!await verifySourceBundleHash(bundle)) {
    throw new Error('SOURCE_HASH_MISMATCH');
  }

  // 3. canFreezeSourceBundle and buildSourceModel
  if (!canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, ownerUid)) {
    throw new Error('SOURCE_GATE_NOT_VERIFIED');
  }
  const sourceModel = buildSourceModel(bundle, verificationRecords);
  if (sourceModel.issues.length > 0) {
    throw new Error(`SOURCE_MODEL_INVALID:${sourceModel.issues.join(',')}`);
  }

  // 4. validateLessonIRSchema, references, provenance hash, duration, math, timing
  const schemaResult = validateLessonIRSchema(lesson);
  if (!schemaResult.valid) {
    throw new Error(`LESSON_IR_SCHEMA_INVALID:${schemaResult.issues.map(i => i.path).join(',')}`);
  }
  const referenceIssues = validateLessonIRReferences(lesson);
  if (referenceIssues.length > 0) {
    throw new Error(`LESSON_IR_REFERENCES_INVALID:${referenceIssues.join(',')}`);
  }
  if (!lesson.provenance?.sourceHash || lesson.provenance.sourceHash !== bundle.sourceHash) {
    throw new Error('V871_SOURCE_HASH_MISMATCH');
  }
  if (lesson.lesson.runtimeMin !== bundle.durationMinutes) {
    throw new Error('LESSON_DURATION_MISMATCH');
  }
  const mathVisualContracts = parseMathVisualExtension(lesson);
  const v84Budgets = validateV84ActivityBudgets(lesson);
  if (v84Budgets.status === 'INVALID') {
    throw new Error(`V84_BUDGET_INVALID:${v84Budgets.issues.join(',')}`);
  }

  // 5. Extensions: v871Experience
  if (!lesson.extensions || !Object.prototype.hasOwnProperty.call(lesson.extensions, 'v871Experience')) {
    throw new Error('V871_EXTENSION_REQUIRED');
  }
  // Propagates existing parser error if malformed
  const extension = parseV871ExperienceExtension(lesson.extensions);
  if (!extension) {
    throw new Error('V871_EXTENSION_REQUIRED');
  }
  let authoringPlan: ExperienceAuthoringPlanV1 | undefined;
  if (extension.version === '1.1') {
    if (!detachedInput.authoringPlan) throw new Error('V871_AUTHORING_PLAN_REQUIRED');
    const context = { sourceModel, durationMinutes: bundle.durationMinutes!,
      ...(detachedInput.teacherArchetypeChoice ? { teacherArchetypeChoice: detachedInput.teacherArchetypeChoice } : {}) };
    const accepted = validateExperienceAuthoringPlan(detachedInput.authoringPlan, context);
    if (accepted.mapping !== 'MAPPABLE') throw new Error('V871_AUTHORING_REVIEW_REQUIRED');
    const issues = validateExperiencePlanMapping(accepted.plan, lesson, context);
    if (issues.length) throw new Error(`V871_STAGE2_MAPPING_INVALID:${issues.join(',')}`);
    authoringPlan = accepted.plan;
  } else if (detachedInput.authoringPlan !== undefined) throw new Error('V871_AUTHORING_VERSION_CONFLICT');
  const experience = evaluateExperienceDesign(lesson, sourceModel);
  if (experience.status === 'BLOCKED') {
    throw new Error(`V871_EXPERIENCE_BLOCKED:${experience.issues.join(',')}`);
  }

  // 6. Quality gate
  const quality = evaluateLearningQuality(lesson);

  // 7. Required Vietnamese copy & handoff/fallback completeness
  if (!lesson.learningDesign?.learningIntention?.vi?.trim()) {
    throw new Error('V871_PACKAGE_INPUT_MISSING:learningDesign.learningIntention.vi');
  }
  if (!lesson.lesson?.title?.vi?.trim()) {
    throw new Error('V871_PACKAGE_INPUT_MISSING:lesson.title.vi');
  }
  for (const act of lesson.timeline) {
    if (!act.title?.vi?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.title.vi`);
    }
    if (!act.studentAction?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.studentAction`);
    }
    if (!act.teacherAction?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.teacherAction`);
    }
    if (!act.expectedEvidence?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.expectedEvidence`);
    }
    if (!act.student?.exactCopy?.vi?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.student.exactCopy.vi`);
    }
    if (!act.presenter?.exactCopy?.vi?.trim()) {
      throw new Error(`V871_PACKAGE_INPUT_MISSING:timeline.${act.id}.presenter.exactCopy.vi`);
    }
  }

  // 8. Unsafe rubric/solution validation
  for (const q of Object.values(lesson.questions)) {
    if (q.rubric !== undefined && q.rubric !== null) {
      assertSafeInputGraph(q.rubric);
    }
    if (q.workedSolution !== undefined && q.workedSolution !== null) {
      assertSafeInputGraph(q.workedSolution);
    }
  }

  // Content hash using existing computeLessonContentHash
  const contentHash = await computeLessonContentHash(lesson);

  // Generate 14 files in exact order
  const files: V871Artifact[] = [];

  const addFile = async (name: string, mediaType: 'text/markdown' | 'application/json', rawContent: string): Promise<void> => {
    const content = normalizeContent(rawContent);
    const sha256 = await sha256Utf8(content);
    files.push({ name, mediaType, content, sha256 });
  };

  // Helper for source matching on questions
  const matchCanonicalSource = (promptVi: string): string => {
    const compactPrompt = promptVi.replace(/\s+/g, ' ').trim();
    for (const block of sourceModel.blocks) {
      if (block.text.replace(/\s+/g, ' ').trim().includes(compactPrompt) || compactPrompt.includes(block.text.replace(/\s+/g, ' ').trim())) {
        return `Nguồn: ${block.locator.value}, dòng ${block.locator.line}`;
      }
    }
    return 'Cần đối chiếu nguồn';
  };

  // 00_READ_ME.md
  const file00 = `# Hướng dẫn gói bài dạy ${V88_1_LABEL} (Bản riêng tư giáo viên)

## Gói riêng tư
- Tiêu đề bài học: ${lesson.lesson.title.vi}
- Phiên bản giáo án: ${lesson.lesson.lessonVersion}
- Thời lượng: ${lesson.lesson.runtimeMin} phút
- Chế độ truy cập: OWNER_PRIVATE (Chỉ giáo viên sở hữu được truy cập)
- Lưu ý bảo mật: Toàn bộ nội dung gói bài học được lưu trữ bảo mật cho giáo viên, không phân phối trực tiếp cho học sinh hoặc môi trường public runtime.

## Tình trạng bản nháp
- Trạng thái phát hành: NOT_CERTIFIED
- Trạng thái thiết kế trải nghiệm: ${experience.status}
- Trạng thái chất lượng sư phạm: ${quality.status}
- Kiểm thử môi trường runtime và trình duyệt: NOT_RUN
- Lưu ý: Bản xuất là tài liệu sư phạm phục vụ đối chiếu và kiểm duyệt của giáo viên, chưa được chứng nhận hoàn tất quy trình kiểm thử tự động.

## Nguồn
- Mã băm tài liệu nguồn (sourceHash): ${bundle.sourceHash}
- Số lượng tài liệu nguồn: ${bundle.sources.length}
${bundle.sources.map(s => `- Tệp ${s.name} (${s.role}, ${s.mimeType})`).join('\n')}
- Tình trạng phê duyệt nguồn: ${sourceApproval ? 'Đã phê duyệt' : 'Chưa có phê duyệt chính thức trong bản nháp'}

## Danh sách 14 file
1. 00_READ_ME.md: Hướng dẫn gói bài dạy, tình trạng bản nháp và danh sách các tệp.
2. 01_OFFICIAL_LESSON_PLAN.md: Kế hoạch bài dạy chính thức theo chuẩn sư phạm cho giáo viên.
3. 02_TEACHING_ANNEX.md: Phụ lục sư phạm gồm câu hỏi, đáp án, rubric, gợi ý và phương án dự phòng.
4. 03_V871_TECHNICAL_MANIFEST.md: Bản kê kỹ thuật ${V88_1_LABEL} về vai trò, cầu nối, tiến trình và chẩn đoán.
5. 04_RUNTIME_TEST_CASES.md: Danh mục kịch bản kiểm thử dự kiến cho runtime (NOT_RUN).
6. 05_MACHINE_SUMMARY.json: Bản tóm tắt máy chuẩn hóa an toàn, không chứa thông tin định danh cá nhân.
7. 06_PRESENTER_STORYBOARD.md: Kịch bản trình chiếu của giáo viên qua từng hoạt động.
8. 07_VISUAL_CONTRACTS.md: Hợp đồng mô phỏng trực quan và các bất biến toán học.
9. 08_COLLABORATION_ORCHESTRATION.md: Điều phối hoạt động nhóm và tính phù hợp sư phạm.
10. 09_PEER_REVIEW_CONTRACTS.md: Hợp đồng đánh giá đồng đẳng và hướng dẫn học sinh.
11. 10_SCAFFOLD_CHALLENGE_MAP.md: Bản đồ thang trợ giúp phân hóa và thử thách nâng cao.
12. 11_TIMING_PROTECTION.md: Phân bổ và bảo vệ ngân sách thời gian cốt lõi.
13. 12_LESSON_EXPERIENCE_MAP.md: Bản đồ trải nghiệm học tập và chuỗi nhịp điệu sư phạm.
14. 13_ATTENTION_HANDOFF_MAP.md: Bản đồ điều phối bề mặt chú ý và chuyển tiếp thiết bị.

## Việc cần duyệt
- Chẩn đoán trải nghiệm (${experience.diagnostics.length}):
${experience.diagnostics.length ? experience.diagnostics.map(d => `  - ${d}`).join('\n') : '  - Không có chẩn đoán cần can thiệp.'}
- Quy tắc chất lượng cần xem xét (${quality.pendingRules.length}):
${quality.pendingRules.length ? quality.pendingRules.map(r => `  - ${r}`).join('\n') : '  - Không có quy tắc chất lượng đang chờ.'}
- Xác nhận của giáo viên (${quality.teacherConfirmationsRequired.length}):
${quality.teacherConfirmationsRequired.length ? quality.teacherConfirmationsRequired.map(c => `  - ${c.reason}`).join('\n') : '  - Chưa có yêu cầu xác nhận bổ sung.'}
- Lưu ý chuyên môn: Giáo viên cần rà soát văn phong lớp học tự nhiên và tính chính xác của các bước dạy trước khi lên lớp.`;
  await addFile('00_READ_ME.md', 'text/markdown', file00);

  // 01_OFFICIAL_LESSON_PLAN.md
  // Human official plan contains no schemaVersion, activityId, sourceHash, validator IDs, implementation API identifiers or raw teacher-only diagnosis.
  const file01 = `# Kế hoạch bài dạy: ${lesson.lesson.title.vi}

## Tên bài/Môn/Lớp/Thời lượng
- Tên bài: ${lesson.lesson.title.vi}
- Môn học: ${lesson.lesson.subject}
- Lớp: ${lesson.lesson.grade ? lesson.lesson.grade : 'Chưa có thông tin khối lớp trong bản nháp'}
- Thời lượng: ${lesson.lesson.runtimeMin} phút

## Mục tiêu
- Yêu cầu cần đạt / Mục tiêu bài học: ${lesson.learningDesign.learningIntention.vi}

## Dấu hiệu thành công
${lesson.learningDesign.successCriteria.map((sc, idx) => `${idx + 1}. ${sc.statement.vi} (Minh chứng: ${sc.observableEvidence})`).join('\n')}

## Chuẩn bị
- Thiết bị và học liệu: ${lesson.timeline.some(a => a.materials?.length) ? [...new Set(lesson.timeline.flatMap(a => a.materials ?? []))].join(', ') : 'Chưa có danh mục thiết bị, đồ dùng trong bản nháp'}

## Tiến trình
${lesson.timeline.map((act, idx) => {
  const durationMin = Math.round(act.durationSec / 60);
  const board = act.boardAction || 'Chưa có ghi bảng trong bản nháp';
  const notebook = act.notebookAction || 'Chưa có ghi vở trong bản nháp';
  const fallback = act.fallback || extension.activities[act.id]?.handoff.fallback || 'Chưa có phương án dự phòng trong bản nháp';
  const successSign = act.successLookFor || 'Chưa có tiêu chí chốt trong bản nháp';
  return `### Hoạt động ${idx + 1}: ${act.title.vi}
- Thời gian: ${durationMin} phút (${act.durationSec} giây)
- Mục đích: ${extension.experienceArc[idx]?.purpose || 'Hình thành và phát triển năng lực'}
- Giao việc:
  - Giáo viên: ${act.teacherAction}
  - Học sinh: ${act.studentAction}
- Sản phẩm: ${act.coach?.studentMirror?.expectedProduct || act.expectedEvidence}
- Minh chứng: ${act.expectedEvidence}
- Chốt kiến thức / Dấu hiệu thành công: ${successSign}
- Ghi bảng: ${board}
- Ghi vở: ${notebook}
- Phương án dự phòng: ${fallback}`;
}).join('\n\n')}

## Đánh giá
- Phương pháp đánh giá: Đánh giá quá trình dựa trên quan sát hoạt động học sinh và sản phẩm làm việc.
- Minh chứng thu thập: Sản phẩm bài làm, phiếu học tập và câu trả lời của học sinh theo từng hoạt động.

## Phân hóa
${lesson.timeline.map((act, idx) => {
  const common = act.differentiation?.commonCoreLearning || 'Chưa có mô tả cốt lõi trong bản nháp';
  const challenge = act.differentiation?.challenge?.description || 'Chưa có thử thách mở rộng trong bản nháp';
  return `- Hoạt động ${idx + 1}: Trọng tâm cốt lõi là "${common}"; thử thách nâng cao: "${challenge}".`;
}).join('\n')}

## Nhìn lại/Bước tiếp
- Học sinh nhìn lại: ${lesson.reflectionContract?.studentReflection || 'Chưa có nội dung nhìn lại trong bản nháp'}
- Bước tiếp theo: ${lesson.reflectionContract?.nextStep || 'Chưa có bước tiếp theo trong bản nháp'}

---
Nguồn đã đối chiếu.
Kiểm tra văn phong và ngữ cảnh lớp học: Đang chờ duyệt (NOT_RUN).`;
  await addFile('01_OFFICIAL_LESSON_PLAN.md', 'text/markdown', file01);

  // 02_TEACHING_ANNEX.md
  const questionsList = Object.keys(lesson.questions).sort().map(k => {
    const q = lesson.questions[k];
    let sourceRef = 'Bản thảo giáo viên / hệ thống';
    if (q.authoredSource === 'canonical') {
      sourceRef = matchCanonicalSource(q.prompt.vi);
    }
    const answer = q.correctAnswer !== undefined && q.correctAnswer !== null
      ? (typeof q.correctAnswer === 'object' ? stableStringify(q.correctAnswer) : String(q.correctAnswer))
      : 'Chưa có đáp án chính thức trong bản nháp (Cần duyệt)';
    const solution = q.workedSolution !== undefined && q.workedSolution !== null
      ? (typeof q.workedSolution === 'object' ? stableStringify(q.workedSolution) : String(q.workedSolution))
      : 'Chưa có lời giải chi tiết trong bản nháp';
    const rubric = q.rubric !== undefined && q.rubric !== null
      ? (typeof q.rubric === 'object' ? stableStringify(q.rubric) : String(q.rubric))
      : 'Chưa có rubric trong bản nháp';
    const hints = q.hints && q.hints.length
      ? q.hints.map(h => typeof h === 'string' ? h : (h as { content?: { vi?: string } })?.content?.vi || JSON.stringify(h)).join('; ')
      : 'Chưa có gợi ý trong bản nháp';

    return `### Câu hỏi ${q.id}
- Lệnh hỏi: ${q.prompt.vi}
- Nguồn câu hỏi: ${sourceRef}
- Đáp án: ${answer}
- Lời giải chi tiết: ${solution}
- Rubric chấm điểm: ${rubric}
- Gợi ý: ${hints}`;
  }).join('\n\n');

  const revealStepsByActivity = lesson.timeline.map((act, idx) => {
    const revealSteps = act.questionBuild?.steps?.filter(s => s.type === 'reveal');
    if (!revealSteps || revealSteps.length === 0) return null;
    const items = revealSteps.map(s => {
      const stepLabel = s.label?.vi || s.id;
      const stepContent = s.content?.vi || 'Chưa có nội dung công bố trong bản nháp';
      return `- Bước ${s.id} (${stepLabel}): ${stepContent}`;
    }).join('\n');
    return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})\n${items}`;
  }).filter(Boolean).join('\n\n');

  const file02 = `# Phụ lục sư phạm và chỉ dẫn giáo viên

## Câu hỏi/Đáp án hoặc cần duyệt/Rubric
${questionsList || 'Chưa có câu hỏi cụ thể trong bản nháp.'}

## Nội dung công bố từng bước (Reveal Steps)
${revealStepsByActivity || 'Chưa có bước công bố đáp án riêng theo tiến trình.'}

## Quan sát/Chuyển bước
${lesson.timeline.map((act, idx) => `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Điểm cần quan sát: ${act.coach?.observe?.join(', ') || 'Quan sát mức độ tiếp thu và tiến độ của học sinh'}
- Điều kiện chuyển bước: ${act.coach?.transitionWhen || 'Theo sự điều phối của giáo viên'}
- Xử trí khi nhiều học sinh lúng túng: ${act.coach?.ifManyStruggle || 'Chưa có chỉ dẫn khi gặp khó khăn trong bản nháp'}`).join('\n\n')}

## Gợi ý/Thử thách
${lesson.timeline.map((act, idx) => `### Hoạt động ${idx + 1}: ${act.title.vi}
- Thang trợ giúp (Scaffolds): ${act.differentiation?.scaffolds?.length ? act.differentiation.scaffolds.map(s => `${s.id} (${s.type}): ${s.content} (Rút dần: ${s.fadeCondition})`).join('; ') : 'Chưa có thang trợ giúp trong bản nháp'}
- Thử thách nâng cao (Challenge): ${act.differentiation?.challenge?.description || 'Chưa có thử thách trong bản nháp'}`).join('\n\n')}

## Ghi vở
${lesson.timeline.map((act, idx) => `- Hoạt động ${idx + 1} (${act.title.vi}): ${act.notebookAction || 'Chưa có yêu cầu ghi vở trong bản nháp'}`).join('\n')}

## Dạy khi mất mạng
${lesson.timeline.map((act, idx) => `- Hoạt động ${idx + 1} (${act.title.vi}): ${act.fallback || extension.activities[act.id]?.handoff.fallback || 'Sử dụng bảng phụ, phấn viết bảng hoặc phiếu học tập in sẵn'}`).join('\n')}`;
  await addFile('02_TEACHING_ANNEX.md', 'text/markdown', file02);

  // 03_V871_TECHNICAL_MANIFEST.md
  const file03 = `# ${V88_1_LABEL} Technical Manifest

## Version
- schemaVersion: ${lesson.schemaVersion}
- packageVersion: ${V88_1_VERSION}
- masterSpecVersion: ${lesson.compatibility.masterSpecVersion}
- qualityStandardVersion: ${lesson.compatibility.qualityStandardVersion}

## Hashes/source
- sourceHash: ${bundle.sourceHash}
- contentHash: ${contentHash}
- claims:
${sourceModel.claims.map(c => `  - claimId: ${c.id}, blockId: ${c.sourceBlockId}, kind: ${c.kind}, status: ${c.status}`).join('\n')}

## Choreography/control/read roles
${lesson.timeline.map(act => {
  const meta = extension.activities[act.id];
  return `### Activity ${act.id}
- primaryAttentionSurface: ${act.threeWayOrchestration.primaryAttentionSurface}
- presenterRole: ${act.threeWayOrchestration.presenterRole}
- studentRole: ${act.threeWayOrchestration.studentRole}
- coachRole: ${act.threeWayOrchestration.coachRole}
- revealPolicy: ${act.revealPolicy}
- signature:
  - attentionTarget: ${meta?.signature.attentionTarget}
  - participationMode: ${meta?.signature.participationMode}
  - interactionPattern: ${meta?.signature.interactionPattern}
  - responseMode: ${meta?.signature.responseMode}
  - visualMode: ${meta?.signature.visualMode}
  - physicalAction: ${meta?.signature.physicalAction}
  - evidenceType: ${meta?.signature.evidenceType}
  - transitionCue: ${meta?.signature.transitionCue}`;
}).join('\n\n')}

## Bridge
- archetype:
  - v871: ${extension.archetype.v871}
  - canonicalBase: ${extension.archetype.canonicalBase}
  - decision: ${extension.archetype.decision}
  - rationale: ${extension.archetype.rationale}
  - sourceClaimIds: ${extension.archetype.sourceClaimIds.join(', ')}
- revealPolicies:
${Object.keys(extension.reveal).sort().map(id => {
  const r = extension.reveal[id];
  return `  - ${id}: v871Policy=${r.v871Policy}, canonicalPolicy=${r.canonicalPolicy}, decision=${r.decision}`;
}).join('\n')}

## Timing
- slotDurationSec: ${extension.timing.slotDurationSec}
- coreBudgetSec: ${extension.timing.coreBudgetSec}
- reserveBudgetSec: ${extension.timing.reserveBudgetSec}
- activities:
${lesson.timeline.map(act => {
  const meta = extension.activities[act.id];
  return `  - ${act.id}: duration=${act.durationSec}s, core=${meta?.coreBudgetSec}s, recovery=${meta?.recoveryBudgetSec}s, cuttable=${meta?.fastPath.cuttable}, protected=[${meta?.protectedEvidence.join(', ')}]`;
}).join('\n')}

## Evidence/capability decisions
- collaboration:
  - lessonDecision: ${extension.capabilities.collaboration.lessonDecision}
  - rationale: ${extension.capabilities.collaboration.rationale}
  - sourceClaimIds: [${extension.capabilities.collaboration.sourceClaimIds.join(', ')}]
- peerReview:
  - lessonDecision: ${extension.capabilities.peerReview.lessonDecision}
  - rationale: ${extension.capabilities.peerReview.rationale}
  - sourceClaimIds: [${extension.capabilities.peerReview.sourceClaimIds.join(', ')}]
- visualOpportunityAudit:
  - decision: ${extension.visualOpportunityAudit.decision}
  - rationale: ${extension.visualOpportunityAudit.rationale}
  - flags: spatial=${extension.visualOpportunityAudit.spatial}, parameter=${extension.visualOpportunityAudit.parameter}, representation=${extension.visualOpportunityAudit.representation}, invariant=${extension.visualOpportunityAudit.invariant}, errorTrace=${extension.visualOpportunityAudit.errorTrace}, stepwiseReveal=${extension.visualOpportunityAudit.stepwiseReveal}

## Gates/open diagnostics
- experienceStatus: ${experience.status}
- experienceIssues: [${experience.issues.join(', ')}]
- experienceDiagnostics: [${experience.diagnostics.join(', ')}]
- qualityStatus: ${quality.status}
- qualityFailedRules: [${quality.failedRules.join(', ')}]
- qualityPendingRules: [${quality.pendingRules.join(', ')}]
- futureQAStatus: NOT_RUN`;
  await addFile('03_V871_TECHNICAL_MANIFEST.md', 'text/markdown', file03);

  const revealExpectation = (activityId: string): string => {
    const policy = extension.reveal[activityId]?.v871Policy;
    if (policy === 'NO_REVEAL') return 'Không gửi hoặc hiển thị đáp án trong hoạt động này, kể cả sau khi thu bài.';
    if (policy === 'TEACHER_MANUAL') return 'Đáp án chỉ xuất hiện sau khi giáo viên bấm xác nhận công bố trên giao diện điều khiển.';
    return `Chính sách đã soạn: ${policy ?? 'chưa xác định'}. Cầu nối runtime chưa được xác nhận; cần duyệt trước khi dạy.`;
  };
  // 04_RUNTIME_TEST_CASES.md
  const file04 = `# Runtime Test Cases (Planned — NOT_RUN)

> Toàn bộ các trường hợp kiểm thử dưới đây là kỳ vọng theo hợp đồng authoring, chưa được chạy thực tế trong môi trường runtime trình duyệt.

## Functional Test Cases (NOT_RUN)
${lesson.timeline.map((act, i) => `### TC-FUNC-${i + 1}: Kích hoạt và hiển thị Hoạt động ${act.id}
- Mục tiêu: Kiểm tra chuyển đổi trạng thái sang hoạt động ${act.id}.
- Dữ liệu vào: Chuyển hoạt động theo lệnh điều khiển của giáo viên.
- Kỳ vọng: Presenter hiển thị đúng nội dung exactCopy, Student đồng bộ trạng thái ${act.student.state}.
- Trạng thái kiểm thử: NOT_RUN`).join('\n\n')}

## Privacy Test Cases (NOT_RUN)
- TC-PRIV-01: Không để lộ đáp án đúng hoặc rubric sang màn hình học sinh khi chưa công bố.
  - Kỳ vọng: Dữ liệu câu hỏi trên màn hình Student chỉ chứa đề bài, không chứa correctAnswer hay rubric.
  - Trạng thái kiểm thử: NOT_RUN
- TC-PRIV-02: Không gửi thông tin định danh cá nhân (PII) trong gói công khai.
  - Kỳ vọng: Public snapshots không chứa danh sách học sinh hay ownerUid.
  - Trạng thái kiểm thử: NOT_RUN

## Reveal Policy Test Cases (NOT_RUN)
${lesson.timeline.map((act, i) => `### TC-REV-${i + 1}: Cơ chế công bố đáp án Hoạt động ${act.id}
- Chính sách: ${act.revealPolicy} (${extension.reveal[act.id]?.v871Policy || 'N/A'})
- Kỳ vọng: ${revealExpectation(act.id)}
- Trạng thái kiểm thử: NOT_RUN`).join('\n\n')}

## Timing & Budget Test Cases (NOT_RUN)
- TC-TIME-01: Đảm bảo thời gian phân bổ không vượt slotDurationSec (${extension.timing.slotDurationSec}s).
  - Kỳ vọng: Tổng coreBudgetSec (${extension.timing.coreBudgetSec}s) + reserveBudgetSec (${extension.timing.reserveBudgetSec}s) <= ${extension.timing.slotDurationSec}s.
  - Trạng thái kiểm thử: NOT_RUN
- TC-TIME-02: Bảo vệ các hoạt động có protectedEvidence khi thiếu thời gian.
  - Kỳ vọng: Các hoạt động protected không thể bị cắt giảm bởi fastPath cuttable.
  - Trạng thái kiểm thử: NOT_RUN

## Draft & Reconnect Test Cases (NOT_RUN)
- TC-REC-01: Khôi phục phiên làm việc sau khi mất kết nối mạng.
  - Kỳ vọng: restoreRoom=${lesson.runtimePolicy.reconnect.restoreRoom}, restoreDraft=${lesson.runtimePolicy.reconnect.restoreDraft}.
  - Trạng thái kiểm thử: NOT_RUN

## Locale & Typography Test Cases (NOT_RUN)
- TC-LOC-01: Hiển thị văn bản tiếng Việt đúng chuẩn không bị lỗi xuống dòng đơn lẻ hoặc đứt từ.
  - Kỳ vọng: Phù hợp tiêu chuẩn văn phong lớp học tiếng Việt 76A.
  - Trạng thái kiểm thử: NOT_RUN

## Visual Simulation Test Cases (NOT_RUN)
- TC-VIS-01: Đảm bảo hình ảnh và mô phỏng tuân thủ bất biến toán học và không lộ spoiler trước trạng thái cho phép.
  - Kỳ vọng: Không có spoiler trong taskState.
  - Trạng thái kiểm thử: NOT_RUN

## Recheck & Formative Cycles Test Cases (NOT_RUN)
- TC-FORM-01: Chu trình ra quyết định sư phạm thu thập minh chứng và thực hiện điều chỉnh.
  - Kỳ vọng: Quyết định phân nhánh dựa trên tiêu chí thành công rõ ràng.
  - Trạng thái kiểm thử: NOT_RUN`;
  await addFile('04_RUNTIME_TEST_CASES.md', 'text/markdown', file04);

  // 05_MACHINE_SUMMARY.json
  const machineSummaryData = {
    access: 'OWNER_PRIVATE',
    experience: {
      archetype: extension.archetype,
      capabilities: extension.capabilities,
      diagnostics: experience.diagnostics,
      issues: experience.issues,
      status: experience.status,
      timing: extension.timing,
      visualOpportunityAudit: extension.visualOpportunityAudit,
      warnings: experience.warnings,
    },
    learningDesign: {
      learningIntention: lesson.learningDesign.learningIntention,
      successCriteria: lesson.learningDesign.successCriteria.map(sc => ({
        id: sc.id,
        observableEvidence: sc.observableEvidence,
        statement: sc.statement,
      })),
    },
    metadata: {
      lessonId: lesson.lesson.lessonId,
      lessonVersion: lesson.lesson.lessonVersion,
      runtimeMin: lesson.lesson.runtimeMin,
      subject: lesson.lesson.subject,
      title: lesson.lesson.title,
    },
    provenance: {
      contentHash,
      sourceClaims: sourceModel.claims.map(c => ({
        id: c.id,
        kind: c.kind,
        sourceBlockId: c.sourceBlockId,
        sourceId: c.sourceId,
        status: c.status,
      })),
      sourceHash: bundle.sourceHash,
    },
    quality: {
      failedRules: quality.failedRules,
      passedRules: quality.passedRules,
      pendingRules: quality.pendingRules,
      status: quality.status,
      warnings: quality.warnings,
    },
    releaseStatus: 'NOT_CERTIFIED',
    runtimeQA: 'NOT_RUN',
    timeline: lesson.timeline.map(act => ({
      cognitiveDemand: act.cognitiveDemand,
      durationSec: act.durationSec,
      expectedEvidence: act.expectedEvidence,
      id: act.id,
      order: act.order,
      phase: act.phase,
      primaryAttentionSurface: act.threeWayOrchestration.primaryAttentionSurface,
      revealPolicy: act.revealPolicy,
      studentAction: act.studentAction,
      successCriteriaRefs: act.successCriteriaRefs,
      teacherAction: act.teacherAction,
      title: act.title,
    })),
    version: V88_1_VERSION,
  };
  const file05 = stableStringify(machineSummaryData, 2);
  await addFile('05_MACHINE_SUMMARY.json', 'application/json', file05);

  // 06_PRESENTER_STORYBOARD.md
  const file06 = `# Presenter Storyboard (Kịch bản trình chiếu của giáo viên)

> Đây là kịch bản trình chiếu phục vụ giáo viên chuẩn bị bài, không phải DTO công khai phát tới trình duyệt. Không chứa đáp án hay thông tin định danh học sinh.

## Tiến trình trình chiếu theo hoạt động
${lesson.timeline.map((act, idx) => {
  const steps = act.questionBuild?.steps?.map(s => {
    if (s.type === 'question') return `- Câu hỏi: ${s.content.vi}`;
    if (s.type === 'reveal') return extension.reveal[act.id]?.v871Policy === 'NO_REVEAL'
      ? '- Không công bố đáp án trong hoạt động này.'
      : `- Công bố: ${s.label.vi} (${revealExpectation(act.id)} · Xem nội dung chi tiết tại 02_TEACHING_ANNEX.md)`;
    return `- Điểm nhấn: ${s.visualStateId}`;
  }).join('\n') || '- Hiển thị nội dung hướng dẫn của hoạt động';
  return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Tiêu đề màn hình Presenter: ${act.presenter.title.vi}
- Lời dẫn xuất hiện trên màn hình: ${act.presenter.exactCopy.vi}
- Đèn tín hiệu chú ý (Attention Beacon): ${act.attentionBeacon.mode} — "${act.attentionBeacon.copy.vi}"
- Bề mặt chú ý chính: ${act.threeWayOrchestration.primaryAttentionSurface}
- Ghi bảng song song: ${act.boardAction || 'Không ghi bảng đặc biệt'}
- Tiến trình câu hỏi / Reveal:
${steps}
- Thao tác điều khiển khả dụng: ${act.presenter.controls.join(', ')}`;
}).join('\n\n')}`;
  await addFile('06_PRESENTER_STORYBOARD.md', 'text/markdown', file06);

  // 07_VISUAL_CONTRACTS.md
  let visualContractsSection = 'Chưa có hợp đồng mô phỏng hình ảnh trong bản nháp.';
  const visualKeys = Object.keys(lesson.visuals).sort();
  if (visualKeys.length > 0) {
    visualContractsSection = visualKeys.map(k => {
      const v = lesson.visuals[k];
      const contract = mathVisualContracts[k];
      return `### Mô phỏng trực quan: ${v.id}
- Loại hình: ${v.type}
- Mục đích sư phạm: ${v.semanticPurpose || 'Hỗ trợ trực quan hóa khái niệm'}
- Trạng thái mặc định: ${v.defaultStateId}
- Danh sách đối tượng: ${v.objects.join(', ')}
- Trạng thái khả dụng: ${Object.keys(v.states).sort().join(', ')}
- Hợp đồng thực thi: ${contract ? contract.renderer : 'Chưa có; cần kiểm tra'}
${contract ? `- Căn cứ toán học: ${contract.mathematicalAuthority}
- Mô hình đã soạn:
${stableStringify(contract.model, 2)}
- Bất biến toán học:
${contract.invariants.map(invariant => typeof invariant === 'string' ? invariant : stableStringify(invariant, 2)).join('\n')}
- Trạng thái làm việc: ${contract.taskStateId}
- Trạng thái công bố: ${contract.revealStateIds.join(', ') || 'Không có'}
- Đối tượng mang đáp án: ${contract.answerBearingObjectIds.join(', ') || 'Không có'}
- Hỗ trợ tiếp cận: ${contract.accessibility.description}; thao tác bàn phím: ${contract.accessibility.keyboardAlternative}
- Phương án dự phòng: ${contract.fallback.description}` : `- Bất biến đã soạn: ${v.mathematicalInvariants?.join('; ') || 'Chưa xác định'}
- Phương án dự phòng: ${v.fallback || 'Chưa xác định'}`}
- Nguyên tắc cấm (No-go): Cấm sử dụng hình ảnh AI tạo sai lệch toán học; cấm hiển thị đáp án trước khi học sinh thao tác.`;
    }).join('\n\n');
  }

  const file07 = `# Hợp đồng mô phỏng trực quan (Visual Contracts)

## Kiểm định cơ hội trực quan (Visual Opportunity Audit)
- Quyết định: ${extension.visualOpportunityAudit.decision}
- Lý do sư phạm: ${extension.visualOpportunityAudit.rationale}
- Phân tích các tiêu chí:
  - Trực quan không gian (Spatial): ${extension.visualOpportunityAudit.spatial ? 'Có' : 'Không'}
  - Tham số biến thiên (Parameter): ${extension.visualOpportunityAudit.parameter ? 'Có' : 'Không'}
  - Biểu diễn đa dạng (Representation): ${extension.visualOpportunityAudit.representation ? 'Có' : 'Không'}
  - Bất biến toán học (Invariant): ${extension.visualOpportunityAudit.invariant ? 'Có' : 'Không'}
  - Dấu vết sai lầm (Error Trace): ${extension.visualOpportunityAudit.errorTrace ? 'Có' : 'Không'}
  - Mở rộng từng bước (Stepwise Reveal): ${extension.visualOpportunityAudit.stepwiseReveal ? 'Có' : 'Không'}

## Danh mục mô phỏng toán học
${visualContractsSection}

---
Không công bố hình ảnh toán học chưa được thẩm định chuyên môn.`;
  await addFile('07_VISUAL_CONTRACTS.md', 'text/markdown', file07);

  // 08_COLLABORATION_ORCHESTRATION.md
  const collabDecision = extension.capabilities.collaboration.lessonDecision;
  const collabRationale = extension.capabilities.collaboration.rationale;
  const groupWorkFeature = lesson.conditionalFeatures.groupWork;

  const file08 = `# Điều phối hoạt động nhóm (Collaboration Orchestration)

## Tính phù hợp với bài dạy và lý do sư phạm
- Quyết định bài dạy: ${collabDecision}
- Lý do chuyên môn: ${collabRationale}

## Chính sách nhóm thực tế
- Trạng thái kích hoạt trong thiết kế: ${groupWorkFeature.triggered ? 'Đã kích hoạt' : 'Không kích hoạt'}
${groupWorkFeature.triggered ? `- Lý do kích hoạt: ${groupWorkFeature.triggerReason}
- Giá trị học tập: ${groupWorkFeature.learningValue}
- Hành động của học sinh: ${groupWorkFeature.studentAction}
- Minh chứng kỳ vọng: ${groupWorkFeature.expectedEvidence}` : '- Không tổ chức chia nhóm trong bài dạy này.'}

## Trạng thái năng lực runtime
- Khả năng thực thi tự động: Đang chờ hoàn thiện runtime (Chưa kiểm thử)
- Bằng chứng cá nhân / Tái kiểm tra: Đang chờ duyệt (Pending review)

---
Chỉ áp dụng hoạt động nhóm khi có mục đích học tập rõ ràng, không áp đặt hình thức máy móc.`;
  await addFile('08_COLLABORATION_ORCHESTRATION.md', 'text/markdown', file08);

  // 09_PEER_REVIEW_CONTRACTS.md
  const peerDecision = extension.capabilities.peerReview.lessonDecision;
  const peerRationale = extension.capabilities.peerReview.rationale;
  const peerFeature = lesson.conditionalFeatures.peerAssessment;

  const file09 = `# Hợp đồng đánh giá đồng đẳng (Peer Review Contracts)

## Tính phù hợp với bài dạy và lý do sư phạm
- Quyết định bài dạy: ${peerDecision}
- Lý do chuyên môn: ${peerRationale}

## Hướng dẫn đánh giá đồng đẳng
- Trạng thái kích hoạt trong thiết kế: ${peerFeature.triggered ? 'Đã kích hoạt' : 'Không kích hoạt'}
${peerFeature.triggered ? `- Lý do kích hoạt: ${peerFeature.triggerReason}
- Giá trị học tập: ${peerFeature.learningValue}
- Hành động của học sinh: ${peerFeature.studentAction}
- Minh chứng kỳ vọng: ${peerFeature.expectedEvidence}` : '- Không áp dụng đánh giá đồng đẳng trong tiết học này.'}

## Trạng thái runtime
- Nhận xét của bạn không tự động biến thành điểm số chính thức.
- Bảo mật danh tính: Giữ bí mật danh tính nếu chính sách tiết học yêu cầu.
- Trạng thái thực thi runtime: Đang chờ duyệt (Actual runtime pending)`;
  await addFile('09_PEER_REVIEW_CONTRACTS.md', 'text/markdown', file09);

  // 10_SCAFFOLD_CHALLENGE_MAP.md
  const file10 = `# Bản đồ thang trợ giúp và thử thách (Scaffold & Challenge Map)

## Thang trợ giúp và thử thách theo hoạt động
${lesson.timeline.map((act, idx) => {
  const common = act.differentiation?.commonCoreLearning || 'Chưa có mô tả cốt lõi trong bản nháp';
  const scaffolds = act.differentiation?.scaffolds?.length
    ? act.differentiation.scaffolds.map(s => `- Tầng ${s.id} (${s.type}): ${s.content} (Chiến lược rút dần: ${s.fadeCondition})`).join('\n')
    : '- Chưa có thang trợ giúp cụ thể trong bản nháp';
  const challenge = act.differentiation?.challenge?.description || 'Chưa có thử thách trong bản nháp';
  const hints = act.questionInstances?.map(qi => {
    const q = lesson.questions[qi.questionId];
    return q?.hints?.length
      ? `- Gợi ý cho câu ${q.id}: ${q.hints.map(h => typeof h === 'string' ? h : (h as { content?: { vi?: string } })?.content?.vi || JSON.stringify(h)).join('; ')}`
      : null;
  }).filter(Boolean).join('\n') || '- Không có gợi ý câu hỏi riêng';

  return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Trọng tâm học tập cốt lõi: ${common}
- Thang trợ giúp (Scaffolds):
${scaffolds}
- Gợi ý câu hỏi:
${hints}
- Thử thách đào sâu (Challenge): ${challenge}
- Thứ tự cắt giảm khi thiếu thời gian: ${authoringPlan
    ? authoringPlan.fastPathOrder.includes(act.id) ? `Vị trí ${authoringPlan.fastPathOrder.indexOf(act.id) + 1} trong thứ tự đã soạn.` : 'Hoạt động này không được cắt.'
    : 'Chưa có thứ tự cắt giảm được duyệt; xem 11_TIMING_PROTECTION.md.'}`;
}).join('\n\n')}`;
  await addFile('10_SCAFFOLD_CHALLENGE_MAP.md', 'text/markdown', file10);

  // 11_TIMING_PROTECTION.md
  const slackSec = extension.timing.slotDurationSec - extension.timing.coreBudgetSec - extension.timing.reserveBudgetSec;
  const file11 = `# Bảo vệ ngân sách thời gian (Timing Protection)

## Tổng quan ngân sách tiết học
- Tổng thời lượng tiết học (Slot Duration): ${extension.timing.slotDurationSec} giây (${extension.timing.slotDurationSec / 60} phút)
- Ngân sách cốt lõi (Core Budget): ${extension.timing.coreBudgetSec} giây
- Ngân sách dự phòng (Reserve Budget): ${extension.timing.reserveBudgetSec} giây
- Thời gian đệm chưa phân bổ (Slack): ${slackSec} giây

## Thứ tự cắt giảm đã soạn
${authoringPlan ? authoringPlan.fastPathOrder.length ? authoringPlan.fastPathOrder.map((id, index) => `${index + 1}. ${id}`).join('\n')
    : 'Không có hoạt động được phép cắt.' : 'Chưa có thứ tự cắt giảm được duyệt; cần kiểm tra trước khi dạy.'}

## Phân bổ ngân sách từng hoạt động
${lesson.timeline.map((act, idx) => {
  const meta = extension.activities[act.id];
  const switchCost = act.timingPolicy?.surfaceSwitchCostSec ?? 0;
  const handoffCost = act.surfaceHandoff ? (act.surfaceHandoff.entry.durationSec + act.surfaceHandoff.recall.durationSec) : 0;
  return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Thời lượng kế hoạch: ${act.durationSec} giây
- Ngân sách cốt lõi: ${meta?.coreBudgetSec ?? 0} giây
- Ngân sách phục hồi: ${meta?.recoveryBudgetSec ?? 0} giây
- Có thể cắt giảm khi cháy giờ (Cuttable): ${meta?.fastPath.cuttable ? 'Có' : 'Không'}
- Minh chứng cần bảo vệ (Protected): ${meta?.protectedEvidence.length ? meta.protectedEvidence.join(', ') : 'Không'}
- Chi phí chuyển đổi bề mặt: ${switchCost} giây
- Chi phí chuyển giao chú ý (Handoff): ${handoffCost} giây`;
}).join('\n\n')}`;
  await addFile('11_TIMING_PROTECTION.md', 'text/markdown', file11);

  // 12_LESSON_EXPERIENCE_MAP.md
  const file12 = `# Bản đồ trải nghiệm học tập (Lesson Experience Map)

## Tiến trình trải nghiệm (Experience Arc)
${extension.experienceArc.map((arc, idx) => `${idx + 1}. Hoạt động ${arc.activityId}: ${arc.purpose}`).join('\n')}

## Chi tiết chữ ký trải nghiệm từng hoạt động
${lesson.timeline.map((act, idx) => {
  const meta = extension.activities[act.id];
  const planned = authoringPlan?.activities.find(activity => activity.id === act.id);
  return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Mục đích sư phạm: ${extension.experienceArc[idx]?.purpose || 'N/A'}
- Chữ ký trải nghiệm:
  - Bề mặt chú ý (Attention Target): ${meta?.signature.attentionTarget}
  - Hình thức tham gia (Participation Mode): ${meta?.signature.participationMode}
  - Mô hình tương tác (Interaction Pattern): ${meta?.signature.interactionPattern}
  - Hình thức phản hồi (Response Mode): ${meta?.signature.responseMode}
  - Chế độ trực quan (Visual Mode): ${meta?.signature.visualMode}
  - Hành động vật lý (Physical Action): ${meta?.signature.physicalAction}
  - Loại minh chứng (Evidence Type): ${meta?.signature.evidenceType}
  - Căn cứ chuyển bước (Transition Cue): ${meta?.signature.transitionCue}
- Hành động học sinh: ${act.studentAction}
- Minh chứng kỳ vọng: ${act.expectedEvidence}
- Thời gian hoạt động: ${act.durationSec} giây${planned ? `
- Sản phẩm: ${planned.expectedProduct}
- Phương án mất mạng: ${planned.offlineFallback}
- Căn cứ nguồn: ${planned.sourceRefs.sourceBlockIds.join(', ')}
- Các nhịp học đã soạn:
${planned.beats.map(beat => `  - ${beat.id} (${beat.roles.join(', ')}), ${beat.durationSec} giây: ${beat.instruction}\n    Minh chứng: ${beat.expectedEvidence ?? 'Không yêu cầu nộp riêng'}`).join('\n')}` : ''}`;
}).join('\n\n')}

${authoringPlan ? `## Mở đầu và kết thúc đã soạn
- Mục tiêu học tập: ${authoringPlan.learningDesign.learningIntention.vi}
- Mở đầu: ${authoringPlan.opening.refs.map(ref => `${ref.role}: ${ref.activityId}/${ref.beatId}`).join('; ')}
- Kết thúc: ${authoringPlan.closing.refs.map(ref => `${ref.role}: ${ref.activityId}/${ref.beatId}`).join('; ')}
### Việc tiếp theo
${authoringPlan.closing.nextStepOptions.map(option => `- ${option.label.vi}: ${option.action}`).join('\n')}` : ''}

## Chẩn đoán chống lặp (Anti-repeat Diagnostics)
${experience.warnings.length ? experience.warnings.map(w => `- Cảnh báo: ${w}`).join('\n') : '- Nhịp điệu trải nghiệm đa dạng, không ghi nhận trùng lặp đơn điệu.'}

## Kiểm định cơ hội trực quan
- Quyết định: ${extension.visualOpportunityAudit.decision}
- Lý do: ${extension.visualOpportunityAudit.rationale}

## Đánh giá chuyên môn
- Thiết kế trải nghiệm bài dạy đang ở trạng thái "${experience.status}". Cần giáo viên trực tiếp xác nhận trước khi đưa vào giảng dạy thực tế.`;
  await addFile('12_LESSON_EXPERIENCE_MAP.md', 'text/markdown', file12);

  // 13_ATTENTION_HANDOFF_MAP.md
  const file13 = `# Bản đồ chuyển giao chú ý (Attention Handoff Map)

## Điều phối bề mặt chú ý qua các hoạt động
${lesson.timeline.map((act, idx) => {
  const meta = extension.activities[act.id];
  const planned = authoringPlan?.activities.find(activity => activity.id === act.id);
  return `### Hoạt động ${idx + 1}: ${act.title.vi} (${act.id})
- Bề mặt chú ý trung tâm: ${act.threeWayOrchestration.primaryAttentionSurface}
- Bề mặt đích chuyển giao (Handoff Target): ${meta?.handoff.target}
- Tín hiệu vào (Entry Cue): ${meta?.handoff.entryCue}
- Trạng thái thiết bị (Device State): ${meta?.handoff.deviceState}
- Tín hiệu ra (Exit Cue): ${meta?.handoff.exitCue}
- Phương án dự phòng (Fallback): ${meta?.handoff.fallback}${planned ? `
- Dự phòng mất mạng của hoạt động: ${planned.offlineFallback}
- Chuyển sang hoạt động tiếp theo: ${planned.transitionToNext}
- Thời gian vào / tổ chức / chuyển bước: ${planned.entrySec} / ${planned.organizationSec} / ${planned.transitionSec} giây` : ''}`;
}).join('\n\n')}

## Nguyên tắc quản lý bề mặt
- Không tồn tại hai bề mặt chỉ đạo đồng thời (No parallel authority/state).
- Khi học sinh cần quan sát màn hình trung tâm hoặc lắng nghe hướng dẫn, thiết bị cá nhân ở trạng thái khóa hoặc chỉ xem để bảo toàn sự chú ý.`;
  await addFile('13_ATTENTION_HANDOFF_MAP.md', 'text/markdown', file13);

  // Calculate packageHash: SHA256 of stable JSON manifest of files (sorted by name)
  const manifest = files.map(f => ({
    mediaType: f.mediaType,
    name: f.name,
    sha256: f.sha256,
  }));
  const manifestJson = stableStringify(manifest);
  const packageHash = await sha256Utf8(manifestJson);

  return {
    access: 'OWNER_PRIVATE',
    version: V88_1_VERSION,
    sourceHash: bundle.sourceHash,
    contentHash,
    packageHash,
    files,
    experience,
    quality,
    releaseStatus: 'NOT_CERTIFIED',
  };
}
