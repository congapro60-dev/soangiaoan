"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MathText from "../../components/lesson/MathText";
import { LessonWorldMap } from "../../components/lesson/LessonWorldMap";
import { LessonPeerInspector } from "../../components/lesson/LessonPeerInspector";
import { cockpitLearners } from "../../lib/lesson/cockpit.js";
import { useLessonSession, formatDuration, LessonProjection } from "../../components/lesson/useLessonSession";
import { buildLessonProposal } from "../../lib/lesson/proposal.js";

export interface LessonDashboardProps {
  user: {
    userId: string;
    displayName: string;
  };
}

interface PackageRecord {
  row_id: string;
  package_id: string;
  version: string;
  content_hash: string;
  status: string;
  created_at: number;
}

interface LessonSourceRef {
  id: string;
  kind?: "repo" | "external";
  hash?: string;
  locator: string;
  label: string;
  verification: string;
}

interface LessonObjective {
  id: string;
  code: string;
  level: string;
  statement: string;
  prerequisiteIds?: string[];
  requiresFiniteInfiniteDistinction?: boolean;
  requiresRepresentations?: boolean;
}

interface LessonActivity {
  id: string;
  phase: string;
  minutes: number;
  studentAction: string;
  expectedProduct?: string;
  teacherLookFor?: string;
  participation?: string;
  budgetRole?: string;
  taskIds?: string[];
  objectiveIds?: string[];
  evidenceIds?: string[];
  supportIds?: string[];
  transition?: string;
}

interface LessonTask {
  id: string;
  prompt?: string;
  branch?: string;
  type?: string;
  activityId?: string;
  objectiveIds?: string[];
  participation?: string;
  minutes?: number;
  isCore?: boolean;
  requiresFullScaffold?: boolean;
  supportRationale?: string;
  sourceRefs?: string[];
  evidenceIds?: string[];
  hintIds?: string[];
  metadata?: { numericReviewRequired?: boolean; sourceCitation?: { segmentId: string; quote: string; origin: string }; [key: string]: unknown };
  sequenceType?: string;
  sequenceTypes?: string[];
  representation?: string;
  representations?: string[];
  inputSchema?: {
    options?: Array<{ id: string; label: string }>;
    representations?: Array<{ id: string; label: string }>;
    cards?: Array<{ id: string; label: string }>;
    [key: string]: unknown;
  };
  evaluation?: {
    checkerId?: string;
    answerKey?: unknown;
    options?: string[];
    rubric?: {
      criteria?: string[];
      lookFor?: string[];
    };
  };
}

export interface LessonHint {
  id: string;
  tier: string;
  text: string;
  taskId: string;
  objectiveIds?: string[];
  order?: number;
  notAnswer?: boolean;
  penalty?: { time: number; score: number; freeze: number };
  supportRationale?: string;
}

export interface LessonEvidenceRule {
  id: string;
  kind: string;
  objectiveIds: string[];
  taskId?: string;
  individual: boolean;
  countsForMastery: boolean;
}

export function isArenaOpenEligible(view: (LessonProjection & { arena?: unknown }) | null | undefined): boolean {
  if (!view || view.status !== "active" || view.timeline?.locked) return false;
  if (view.arena) return false;
  if (["recheck", "exit"].includes(String(view.timeline?.currentPhase || ""))) return false;
  const actIndex = view.timeline?.activityIndex ?? 0;
  const activities = (view.package?.activities || []) as Array<{
    id?: string;
    arena?: { enabled?: boolean };
    arenaDescriptor?: { enabled?: boolean };
  }>;
  const act = activities[actIndex];
  const authored = act?.arena?.enabled === true || act?.arenaDescriptor?.enabled === true;
  const pkg = view.package as {
    status?: string;
    map?: string;
    gamePlan?: { map?: string; theme?: string };
  } | undefined;
  const gamePlan = view.gamePlan as {map?: string} | undefined;
  const map = gamePlan?.map || pkg?.gamePlan?.map || pkg?.map || pkg?.gamePlan?.theme;
  const historicalPlan = pkg?.status === "approved" && (map === "Long Thành" || map === "historical");
  return Boolean(authored || historicalPlan);
}

export function isArenaSettleEligible(view: (LessonProjection & { arena?: unknown }) | null | undefined): boolean {
  const arena = view?.arena as { phase?: string } | undefined;
  if (!arena) return false;
  return arena.phase === "results" || arena.phase === "done";
}

interface LessonPackage {
  id: string;
  version: string;
  status: string;
  subject?: string;
  grade?: number;
  essentialQuestion?: string;
  budget?: { slotMinutes?: number; coreMinutes?: number; reserveMinutes?: number; optionalMinutes?: number; transitionMinutes?: number };
  sourceRefs?: LessonSourceRef[];
  objectives?: LessonObjective[];
  activities?: LessonActivity[];
  tasks?: LessonTask[];
  hints?: LessonHint[];
  evidenceRules?: LessonEvidenceRule[];
  rubric?: {
    criteria?: string[];
    lookFor?: string[];
  };
  masteryPolicy?: {
    individualEvidencePerObjectiveMin?: number;
    masterySources?: string[];
    forbiddenSources?: string[];
  };
  [key: string]: unknown;
}

interface NormalizedLessonResponse {
  lesson: LessonPackage;
  row: PackageRecord | null;
}

interface DirectorDraftPlan {
  schemaVersion: string;
  id: string;
  status: string;
  package: {
    id: string;
    version: string;
    contentHash: string;
    rowId?: string;
  };
  theme: string;
  map: string;
  rule: string;
  participation: string;
  devices: string[];
  story: {
    title: string;
    premise: string;
    goal: string;
    places: string[];
  };
  activityPlans: Array<{
    id: string;
    order: number;
    phase: string;
    minutes: number;
    participation: string;
    objectiveIds: string[];
    taskIds: string[];
    evidenceIds: string[];
    budgetRole?: string;
  }>;
  checkpoints: Array<{
    id: string;
    activityId: string;
    objectiveIds: string[];
    evidenceIds: string[];
    individual: boolean;
  }>;
  policies?: {
    branch?: { allowed: string[]; default: string };
    reward?: { group: string; individual: string; once: boolean };
    skill?: { roles: string[]; evidence: string };
  };
  director?: {
    deterministic: boolean;
    seed: number;
    confidence: number;
    uncertainties: string[];
  };
  contentHash: string;
}

interface DirectorAlternative {
  rule?: string;
  participation?: string;
  reasonCode: string;
}

interface DirectorDraftData {
  package: {
    rowId: string;
    id: string;
    version: string;
    contentHash: string;
  };
  status: string;
  reasonCodes: string[];
  alternatives: DirectorAlternative[];
  uncertainties: string[];
  confidence: number;
  plan: DirectorDraftPlan | null;
  gamePlan?: unknown;
}

interface ApprovedPlanBinding {
  packageRowId: string;
  packageVersion: string;
  packageHash: string;
  planRowId: string;
  planHash: string;
  approvedAt: number;
}

interface SourceExtractionSegment {
  id: string;
  kind: string;
  text: string;
  start: number;
  end: number;
  lineStart: number;
  lineEnd: number;
  pageNumber?: number;
  pdfLocation?: unknown;
  xmlLocation?: unknown;
}

interface SourceExtractionUncertainty {
  id?: string;
  code?: string;
  kind?: string;
  type?: string;
  segmentId?: string;
  delimiter?: string;
  message?: string;
  offset?: number;
  line?: number;
  page?: number;
  pageNumber?: number;
  raw?: string;
}

interface SourceExtraction {
  schemaVersion: string;
  id: string;
  kind: "markdown" | "text" | "docx" | "pdf" | string;
  originalName: string;
  sha256: string;
  bytes: number;
  status: "needs_review" | string;
  segments: SourceExtractionSegment[];
  uncertainties: SourceExtractionUncertainty[];
  warnings: string[];
  text?: string;
}

interface LessonSourceMetadata {
  id: string;
  originalName: string;
  mime: string;
  bytes: number;
  sha256: string;
  status: "pending" | "ready" | "failed" | string;
  parserRevision?: string;
  extractionHash?: string | null;
  errorCode?: string | null;
  createdAt?: number;
  updatedAt?: number;
  extraction?: SourceExtraction;
}

interface LessonProposal {
  status: string;
  source: { id: string; sha256: string; parserRevision: string; extractionHash: string };
  detection: { subject: string; grade: number | null; topic: string; confidence: number; signals: string[] };
  recommendation: { map: string; rule: string; participation: string; alternatives: Array<{ map: string; rule: string; participation: string; reasonCode: string }> };
  proposedActivities: Array<{ id: string; phase: string; minutes: number; participation: string; purpose: string }>;
  uncertainties: string[];
  requiresTeacherReview: boolean;
  reviewReasons: string[];
}

interface LessonGenerationJob {
  id: string;
  sourceId: string;
  sourceSha256: string;
  extractionHash: string;
  status: string;
  errorCode?: string;
  result?: { package?: LessonPackage; validation?: { ok?: boolean; errors?: Array<{ code?: string; message?: string }> }; requiresTeacherReview?: boolean };
}

interface UnsupportedFormatInfo {
  status: "unsupported_format";
  code?: string;
  format?: string;
  fallback?: string;
  manualPasteFallback?: boolean;
  message: string;
  errors?: Array<{ code: string; path: string; message: string }>;
}

const THEME_INFO: Record<string, { name: string; title: string }> = {
  modern: { name: "Hiện đại", title: "Hồ Sơ Thành Phố Ẩn" },
  historical: { name: "Cổ trang", title: "Ngũ Ấn Long Thành" },
  future: { name: "Tương lai", title: "Nghịch Lý Aurora" },
  dewey: { name: "Dewey Tây Hồ Tây", title: "Bí Mật Sau Tiếng Chuông" },
  pastoral: { name: "Đồng quê", title: "Mùa Hội Bên Sông" },
  cube: { name: "Đảo Khối Lập Phương", title: "Đảo Khối Lập Phương" },
  ring: { name: "Thành Phố Vòng Bo", title: "Thành Phố Vòng Bo" },
  zones: { name: "Chiến Trường Ngũ Khu", title: "Chiến Trường Ngũ Khu" },
  academy: { name: "Học Viện Hỗn Nguyên", title: "Học Viện Hỗn Nguyên" },
  survival: { name: "Quần Đảo Sinh Tồn", title: "Quần Đảo Sinh Tồn" },
  galaxy: { name: "Đường Đua Thiên Hà", title: "Đường Đua Thiên Hà" },
  maze: { name: "Mê Cung Mật Mã", title: "Mê Cung Mật Mã" },
};

const RULE_INFO: Record<string, { label: string; desc: string }> = {
  campaign: { label: "Chiến dịch", desc: "Khám phá bản đồ tuyến tính theo từng chặng nhiệm vụ liên tục." },
  duel: { label: "Đối kháng", desc: "Thi đấu đối đầu trực tiếp với các câu hỏi so tài cân não." },
  zones: { label: "Chiếm khu", desc: "Kiểm soát và phòng thủ các vùng chiến lược trên bản đồ." },
  survival: { label: "Sinh tồn", desc: "Duy trì năng lượng và phục hồi qua các đợt bão thử thách." },
  escort: { label: "Hộ tống", desc: "Bảo vệ tài nguyên và tiếp vận đoàn xe vượt qua trở ngại." },
  treasure: { label: "Truy tìm kho báu", desc: "Giải mã các manh mối để thu thập trọn bộ mật mã ẩn." },
  relay: { label: "Tiếp sức", desc: "Phối hợp chuyền quyền điều khiển luân phiên giữa các thành viên." },
  lockdown: { label: "Phong tỏa", desc: "Giải mã liên hoàn để mở khóa phòng áp lực trước hạn định." },
  merchant: { label: "Giao thương", desc: "Giao thương và tối ưu hóa tài nguyên qua các bài toán định lượng." },
};

const PARTICIPATION_LABELS: Record<string, string> = {
  group: "Theo nhóm",
  pairs: "Theo cặp đôi",
  pair: "Theo cặp đôi",
  whole_class: "Cả lớp",
  individual: "Cá nhân độc lập",
};

const PHASE_LABELS: Record<string, string> = {
  experience: "Khởi động & Trải nghiệm",
  formation: "Hình thành kiến thức",
  guided: "Hướng dẫn mẫu & Mở đầu",
  practice: "Luyện tập & Phân nhánh",
  recheck: "Đánh giá lại độc lập",
  exit: "Vé ra cửa",
  extension: "Mở rộng",
  reflection: "Vận dụng & Suy ngẫm",
};

const REASON_LABELS: Record<string, string> = {
  PARTICIPATION_FROM_TASKS_GROUP: "Hình thức tương tác nhóm được lựa chọn dựa trên các nhiệm vụ mang tính cộng tác và chia sẻ vai trò.",
  PARTICIPATION_FROM_TASKS_PAIRS: "Hình thức tương tác cặp đôi được lựa chọn dựa trên các nhiệm vụ thảo luận đôi bạn cùng tiến.",
  PARTICIPATION_FROM_TASKS_INDIVIDUAL: "Hình thức tương tác cá nhân được lựa chọn dựa trên các nhiệm vụ giải quyết độc lập.",
  RULE_FROM_TASKS_CAMPAIGN: "Cơ chế Chiến dịch được chọn nhằm dẫn dắt học sinh khám phá tiến trình bài học theo tuyến chặng liền mạch.",
  RULE_FROM_TASKS_DUEL: "Cơ chế Đối kháng được chọn nhằm tăng tính tương tác cạnh tranh lành mạnh qua các câu hỏi so tài.",
  REQUESTED_PARTICIPATION_OVERRIDDEN_INCOMPATIBLE: "Hình thức tham gia đề xuất ban đầu không tương thích với phân bổ nhiệm vụ, đạo diễn đã tự động điều chỉnh tối ưu.",
  REQUESTED_RULE_OVERRIDDEN_INCOMPATIBLE: "Luật chơi đề xuất ban đầu không tương thích với cấu trúc hoạt động, đạo diễn đã tự động điều chỉnh phù hợp.",
  NO_INDIVIDUAL_TASKS: "Bài học chưa có nhiệm vụ cá nhân riêng lẻ; hệ thống sẽ giám sát đánh giá qua các đóng góp độc lập.",
  SOURCE_REVIEW_REQUIRED: "Yêu cầu giáo viên trực tiếp đối soát nguồn học liệu trước khi phê duyệt phương án đạo diễn.",
  TIME_BUDGET_MISSING: "Chưa xác định tổng thời lượng bài học trong cấu hình.",
  LEARNING_OBJECTIVES_MISSING: "Gói bài dạy còn thiếu chuẩn đầu ra cần đạt.",
  PACKAGE_REQUIRED: "Cần chọn gói bài học hợp lệ để đạo diễn phân tích.",
  INDIVIDUAL_CHECKPOINT_ALTERNATIVE: "Phương án bổ trợ: Đặt điểm chốt kiểm tra năng lực cá nhân tại hoạt động đánh giá.",
  REQUESTED_RULE_NOT_SELECTED: "Luật chơi yêu cầu ban đầu không được kích hoạt để đảm bảo tính khả thi sư phạm.",
  REQUESTED_PARTICIPATION_NOT_SELECTED: "Hình thức tham gia yêu cầu ban đầu không được áp dụng.",
  APPROVAL_REFUSED_UNVERIFIED_SOURCE: "Từ chối phê duyệt tự động do học liệu trích dẫn chưa có xác nhận đối soát từ giáo viên.",
  PLAN_NOT_APPROVED: "Kế hoạch bài dạy chưa được phê duyệt chính thức.",
};

const UNCERTAINTY_LABELS: Record<string, string> = {
  sourceRefs: "Nguồn học liệu trích dẫn chưa qua đối soát thực chứng của giáo viên.",
  package: "Cấu trúc dữ liệu gói bài học chưa hoàn chỉnh.",
  budget: "Thời lượng phân bổ cần được giáo viên xác nhận lại theo điều kiện thực tế của lớp.",
};

function getThemeDisplay(themeId?: string): string {
  if (!themeId) return "Chưa xác định";
  const found = THEME_INFO[themeId];
  return found ? `${found.name} (${found.title})` : themeId;
}

function getRuleDisplay(ruleId?: string): string {
  if (!ruleId) return "Chưa xác định";
  const found = RULE_INFO[ruleId];
  return found ? found.label : ruleId;
}

function getParticipationDisplay(partId?: string): string {
  if (!partId) return "Chưa xác định";
  return PARTICIPATION_LABELS[partId] || partId;
}

function getPhaseDisplay(phase?: string): string {
  if (!phase) return "Hoạt động";
  return PHASE_LABELS[phase] || phase;
}

export function getTeacherDisplay(value?: string): string {
  if (!value) return "Chưa xác định";
  return PHASE_LABELS[value] || PARTICIPATION_LABELS[value] || ({
    draft: "Bản thảo", approved: "Đã duyệt", needs_review: "Cần rà soát", ready: "Sẵn sàng",
    pending: "Đang chờ", queued: "Đã xếp hàng", running: "Đang xử lý", failed: "Thất bại", interrupted: "Bị gián đoạn",
    shared: "Dùng chung", core: "Cốt lõi", support: "Hỗ trợ", optional: "Tùy chọn", reserve: "Dự phòng",
    closed: "Tự động chấm", open: "Giáo viên chấm", math: "Toán", literature: "Ngữ văn", english: "Tiếng Anh",
    must: "Bắt buộc", should: "Nên đạt", could: "Mở rộng", countdown: "Đếm ngược", fighting: "Đang thi đấu", results: "Kết quả", done: "Hoàn tất",
    individual_recheck: "Kiểm tra lại độc lập", independent_recheck: "Đánh giá độc lập", precheck: "Kiểm tra đầu vào",
    initialThinking: "Tư duy ban đầu", individual_reasoning: "Lập luận cá nhân", group_product: "Sản phẩm nhóm",
    teacher_observation: "Quan sát của giáo viên", self_assessment: "Tự đánh giá",
    choice_exact: "Trắc nghiệm một đáp án", multi_choice_exact: "Trắc nghiệm nhiều đáp án", numeric_exact: "Số học chính xác",
    text_normalized_exact: "Văn bản chuẩn hóa", representation_match: "Ghép biểu diễn",
    verified: "Đã đối soát", unverified: "Chưa đối soát", teacher_review_required: "Cần giáo viên đối soát",
    heading: "Tiêu đề", paragraph: "Đoạn văn", list: "Danh sách", table: "Bảng", display_math: "Công thức", fenced: "Khối nội dung",
  } as Record<string, string>)[value] || value;
}

export function sourceNeedsNumericReview(tasks: LessonTask[], sourceId: string): boolean {
  return tasks.some(task => task.metadata?.numericReviewRequired === true && task.sourceRefs?.includes(sourceId));
}

export function filterCockpitRoster<T extends { name: string; present: boolean }>(roster: T[], query: string, sort: string): T[] {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi");
  return roster.filter(learner => normalize(learner.name).includes(normalize(query.trim())))
    .sort((a, b) => (sort === "absent" ? Number(a.present) - Number(b.present) : 0) || a.name.localeCompare(b.name, "vi"));
}

export function getAIConsentKey(sourceId: string | null, source: LessonSourceMetadata | null, settings: { grade: number; subject: string; slotMinutes: number }, providerHost: string): string {
  if (!providerHost || !sourceId || source?.id !== sourceId || source.status !== "ready" || !source.sha256 || !source.parserRevision || !source.extractionHash) return "";
  return JSON.stringify([sourceId, source.sha256, source.parserRevision, source.extractionHash, settings.grade, settings.subject, settings.slotMinutes, providerHost]);
}

export function LessonAIConsentPanel({ providerHost, extraction, settings, confirmed, disabled, onChange }: {
  providerHost: string;
  extraction: SourceExtraction | null;
  settings: { grade: number; subject: string; slotMinutes: number };
  confirmed: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <div className="lesson-ai-consent">
    <strong>Xác nhận gửi học liệu đến AI</strong>
    <p>Nhà cung cấp: <code>{providerHost || "Chưa cấu hình"}</code>. Gửi toàn bộ phân đoạn đã trích xuất, điểm chưa chắc chắn và cấu hình: {getTeacherDisplay(settings.subject)} · lớp {settings.grade} · {settings.slotMinutes} phút.</p>
    <p>Nếu bản nháp chưa đạt, hệ thống có thể gửi bản nháp đó kèm lỗi để yêu cầu tối đa một lần sửa. Giáo viên vẫn phải rà soát và phê duyệt.</p>
    <details>
      <summary>Xem toàn bộ nội dung sẽ gửi</summary>
      <pre>{JSON.stringify(extraction?.segments || [], null, 2)}</pre>
      <strong>Điểm chưa chắc chắn</strong>
      {(extraction?.uncertainties || []).length ? <pre>{JSON.stringify(extraction?.uncertainties, null, 2)}</pre> : <p>Không có điểm chưa chắc chắn trong bản trích xuất.</p>}
    </details>
    <label><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => onChange(event.target.checked)} /> Tôi đồng ý gửi nội dung trên đến nhà cung cấp AI đã hiển thị.</label>
  </div>;
}

function getReasonDisplay(code: string): string {
  return REASON_LABELS[code] || code;
}

function getUncertaintyDisplay(code: string): string {
  return UNCERTAINTY_LABELS[code] || code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeLessonResponse(value: unknown): NormalizedLessonResponse {
  if (!isRecord(value) || !isRecord(value.package)) {
    throw new Error("Dữ liệu bài học không đúng định dạng.");
  }

  const outer = value.package;
  const lessonCandidate = isRecord(outer.package) ? outer.package : outer;
  if (typeof lessonCandidate.id !== "string" || typeof lessonCandidate.version !== "string") {
    throw new Error("Dữ liệu bài học không đúng định dạng.");
  }

  const rowId = outer.row_id ?? outer.rowId;
  const packageId = outer.package_id ?? outer.packageId;
  const contentHash = outer.content_hash ?? outer.contentHash;
  const createdAt = outer.created_at ?? outer.createdAt;
  const row =
    typeof rowId === "string" &&
    typeof packageId === "string" &&
    typeof outer.version === "string" &&
    typeof contentHash === "string" &&
    typeof outer.status === "string" &&
    typeof createdAt === "number"
      ? {
          row_id: rowId,
          package_id: packageId,
          version: outer.version,
          content_hash: contentHash,
          status: outer.status,
          created_at: createdAt,
        }
      : null;

  return { lesson: lessonCandidate as LessonPackage, row };
}

function bumpSemverPatch(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (match) {
    const major = match[1];
    const minor = match[2];
    const patch = parseInt(match[3], 10) + 1;
    return `${major}.${minor}.${patch}`;
  }
  return "1.0.1";
}

export function syncPackageBidirectionalLinks(pkg: LessonPackage): LessonPackage {
  const clone = JSON.parse(JSON.stringify(pkg)) as LessonPackage;
  const objectives = clone.objectives || [];
  const activities = clone.activities || [];
  const tasks = clone.tasks || [];
  const hints = clone.hints || [];
  const evidenceRules = clone.evidenceRules || [];
  const objectiveIds = new Set(objectives.map((objective) => objective.id));

  for (const act of activities) {
    const actTasks = tasks.filter((t) => t.activityId === act.id);
    act.taskIds = actTasks.map((task) => task.id);

    const actEvidence = evidenceRules.filter((e) => {
      if (!e.taskId) return false;
      const t = tasks.find((task) => task.id === e.taskId);
      return t && t.activityId === act.id;
    });
    act.evidenceIds = actEvidence.map((evidence) => evidence.id);

    const actHints = hints.filter((h) => {
      const t = tasks.find((task) => task.id === h.taskId);
      return t && t.activityId === act.id;
    });
    act.supportIds = actHints.map((hint) => hint.id);

    act.objectiveIds = Array.from(new Set([
      ...(act.objectiveIds || []),
      ...actTasks.flatMap((task) => task.objectiveIds || []),
    ])).filter((id) => objectiveIds.has(id));
  }

  for (const t of tasks) {
    const taskHints = hints.filter((h) => h.taskId === t.id);
    t.hintIds = taskHints.map((hint) => hint.id);

    const taskEvidences = evidenceRules.filter((e) => e.taskId === t.id);
    t.evidenceIds = taskEvidences.map((evidence) => evidence.id);
    t.objectiveIds = (t.objectiveIds || []).filter((id) => objectiveIds.has(id));
  }

  for (const h of hints) {
    const taskObjectives = tasks.find((task) => task.id === h.taskId)?.objectiveIds || [];
    h.objectiveIds = (h.objectiveIds || []).filter((id) => objectiveIds.has(id) && taskObjectives.includes(id));
  }
  for (const evidence of evidenceRules) {
    evidence.objectiveIds = (evidence.objectiveIds || []).filter((id) => objectiveIds.has(id));
  }
  for (const objective of objectives) {
    if (objective.prerequisiteIds) {
      objective.prerequisiteIds = objective.prerequisiteIds.filter((id) => objectiveIds.has(id));
    }
  }

  return clone;
}

function escapeCsvCell(cell: unknown): string {
  const str = String(cell ?? "");
  const needsFormulaEscape = /^[=+\-@\t\r]/.test(str);
  const safeStr = needsFormulaEscape ? `'${str}` : str;
  if (/[",\n\r]/.test(safeStr)) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }
  return safeStr;
}

export function editMatchItem(task: LessonTask, field: "representations" | "cards", index: number, item: { id: string; label: string } | null): LessonTask {
  const items = [...(task.inputSchema?.[field] || [])];
  const oldId = items[index]?.id;
  if (item) items[index] = item;
  else items.splice(index, 1);
  const answerKey: Record<string, string> = {};
  for (const [key, value] of Object.entries((task.evaluation?.answerKey || {}) as Record<string, string>)) {
    if (field === "representations" && key === oldId) {
      if (item) answerKey[item.id] = value;
    } else if (field === "cards" && value === oldId) {
      if (item) answerKey[key] = item.id;
    } else answerKey[key] = value;
  }
  return { ...task, inputSchema: { ...task.inputSchema, [field]: items }, evaluation: { ...task.evaluation, answerKey } };
}

function MatchEditor({ task, onChange }: { task: LessonTask; onChange: (task: LessonTask) => void }) {
  return <div className="lesson-form-grid">
    {(["representations", "cards"] as const).map((field) => <fieldset key={field}>
      <legend>{field === "representations" ? "Biểu diễn cần ghép" : "Thẻ đáp án"}</legend>
      {(task.inputSchema?.[field] || []).map((item, index) => <div key={index} className="lesson-field-group">
        <label>Mã<input className="lesson-input" value={item.id} onChange={(e) => onChange(editMatchItem(task, field, index, { ...item, id: e.target.value }))} /></label>
        <label>Nội dung<input className="lesson-input" value={item.label} onChange={(e) => onChange(editMatchItem(task, field, index, { ...item, label: e.target.value }))} /></label>
        {field === "representations" && <label>Thẻ đúng<select className="lesson-select" value={String((task.evaluation?.answerKey as Record<string, string> | undefined)?.[item.id] || "")} onChange={(e) => {
          const answerKey = { ...(task.evaluation?.answerKey as Record<string, string> || {}) };
          if (e.target.value) answerKey[item.id] = e.target.value; else delete answerKey[item.id];
          onChange({ ...task, evaluation: { ...task.evaluation, answerKey } });
        }}><option value="">Chưa chọn</option>{(task.inputSchema?.cards || []).map((card) => <option key={card.id} value={card.id}>{card.id}: {card.label}</option>)}</select></label>}
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => onChange(editMatchItem(task, field, index, null))}>Xóa</button>
      </div>)}
      <button type="button" className="lesson-button lesson-button-outline" onClick={() => onChange(editMatchItem(task, field, task.inputSchema?.[field]?.length || 0, { id: "", label: "" }))}>Thêm {field === "representations" ? "biểu diễn" : "thẻ"}</button>
    </fieldset>)}
  </div>;
}

const SESSION_SOURCE_ID_KEY = "active_teacher_import_source_id";

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const bytes = new Uint8Array(buffer);
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${p1}${p2}${p1}${p2}`.slice(0, 64);
}

function saveImportSourceSession(sourceId: string | null) {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      if (sourceId) {
        window.sessionStorage.setItem(SESSION_SOURCE_ID_KEY, sourceId);
      } else {
        window.sessionStorage.removeItem(SESSION_SOURCE_ID_KEY);
      }
    }
  } catch {
    // sessionStorage unavailable or restricted; do not use localStorage as authority
  }
}

export default function LessonDashboard({ user }: LessonDashboardProps) {
  const draftRevisionRef = useRef(0);
  const savingRef = useRef(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // Navigation: Studio vs Cockpit
  const [activeTab, setRawActiveTab] = useState<"studio" | "cockpit">("studio");
  const setActiveTab = (tab: "studio" | "cockpit") => {
    draftRevisionRef.current++;
    setRawActiveTab(tab);
  };
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cockpitMenuOpen, setCockpitMenuOpen] = useState<boolean>(false);
  const [cockpitPanel, setCockpitPanel] = useState<"attention" | "students" | "activity">("attention");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [learnerSort, setLearnerSort] = useState("name");
  const [peerSelection, setPeerSelection] = useState<{ sessionId: string | null; learnerId: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [isSessionRestored, setIsSessionRestored] = useState<boolean>(false);

  // Studio sub-tab: Preview vs Director vs Edit vs Import
  const [studioSubTab, setRawStudioSubTab] = useState<"preview" | "director" | "edit" | "import">("preview");
  const isEditing = studioSubTab === "edit";

  // Studio state
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PackageRecord | null>(null);
  const [currentPackage, setCurrentPackage] = useState<LessonPackage | null>(null);
  const [isLoadingStudio, setIsLoadingStudio] = useState<boolean>(true);
  const [studioStatus, setStudioStatus] = useState<string>("");
  const [editedPackage, setRawEditedPackage] = useState<LessonPackage | null>(null);
  const setEditedPackage = useCallback((pkg: LessonPackage | null) => {
    draftRevisionRef.current++;
    setRawEditedPackage(pkg ? syncPackageBidirectionalLinks(pkg) : null);
  }, []);
  const [mappingJson, setRawMappingJson] = useState<string | null>(null);
  const setMappingJson = (value: string | null) => {
    draftRevisionRef.current++;
    setRawMappingJson(value);
  };
  const [mappingError, setMappingError] = useState("");
  const [draftErrors, setDraftErrors] = useState<Array<{ path: string; message: string }>>([]);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importExtraction, setImportExtraction] = useState<SourceExtraction | null>(null);
  const [unsupportedInfo, setUnsupportedInfo] = useState<UnsupportedFormatInfo | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>("");
  const [importSourceId, setImportSourceId] = useState<string | null>(null);
  const [importSourceStatus, setImportSourceStatus] = useState<string | null>(null);
  const [importSourceMeta, setImportSourceMeta] = useState<LessonSourceMetadata | null>(null);
  const [importProposal, setImportProposal] = useState<LessonProposal | null>(null);
  const [generationJob, setGenerationJob] = useState<LessonGenerationJob | null>(null);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [generationSettings, setGenerationSettings] = useState({ slotMinutes: 40, subject: "math", grade: 11 });
  const [generationProviderHost, setGenerationProviderHost] = useState("");
  const [generationConsentKey, setGenerationConsentKey] = useState("");
  const generationExtraction = importSourceMeta?.extraction?.sha256 === importSourceMeta?.sha256 ? importSourceMeta?.extraction || null : importExtraction?.sha256 === importSourceMeta?.sha256 ? importExtraction : null;
  const aiConsentKey = generationExtraction ? getAIConsentKey(importSourceId, importSourceMeta, generationSettings, generationProviderHost) : "";
  const generationBusyRef = useRef(false);
  const sourceOperationRef = useRef(0);
  const [sourceIdInput, setSourceIdInput] = useState<string>("");
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Director Plan state
  const [rawDirectorDraft, setDirectorDraft] = useState<DirectorDraftData | null>(null);
  const [isLoadingDirector, setIsLoadingDirector] = useState<boolean>(false);
  const [directorError, setDirectorError] = useState<string>("");
  const [rawApprovedPlan, setApprovedPlan] = useState<ApprovedPlanBinding | null>(null);
  const [isApprovingPlan, setIsApprovingPlan] = useState<boolean>(false);
  const [planApprovalStatus, setPlanApprovalStatus] = useState<string>("");

  // Stale fetch guard
  const activeDirectorFetchIdRef = useRef<string | null>(null);
  const activePackageFetchIdRef = useRef<string | null>(null);
  const activeListFetchIdRef = useRef<string | null>(null);

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState<boolean>(false);
  const [checkedSourceAcks, setCheckedSourceAcks] = useState<Record<string, boolean>>({});
  const [checkedNumericAcks, setCheckedNumericAcks] = useState<Record<string, boolean>>({});
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);
  const setStudioSubTab = useCallback((tab: "preview" | "director" | "edit" | "import") => {
    draftRevisionRef.current++;
    setIsApprovingPlan(false);
    setIsSubmittingApproval(false);
    setRawStudioSubTab(tab);
  }, []);

  // Launch state
  const [rawLaunchMode, setLaunchMode] = useState<"preview" | "live">("preview");
  const [launchTitle, setLaunchTitle] = useState<string>("");
  const [createdSessionData, setCreatedSessionData] = useState<{
    id: string;
    code: string;
    presenterToken?: string;
  } | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Derived effective values without setState during render
  const directorDraft =
    rawDirectorDraft &&
    selectedRecord &&
    rawDirectorDraft.package?.rowId === selectedRecord.row_id &&
    rawDirectorDraft.package?.version === selectedRecord.version &&
    rawDirectorDraft.package?.contentHash === selectedRecord.content_hash
      ? rawDirectorDraft
      : null;

  // Check if current approved plan matches selected package tuple
  const isPlanApproved = Boolean(
    rawApprovedPlan &&
    selectedRecord &&
    rawApprovedPlan.packageRowId === selectedRecord.row_id &&
    rawApprovedPlan.packageVersion === selectedRecord.version &&
    rawApprovedPlan.packageHash === selectedRecord.content_hash &&
    rawApprovedPlan.planRowId &&
    rawApprovedPlan.planHash
  );

  const approvedPlan = isPlanApproved ? rawApprovedPlan : null;
  const isPackageApproved = selectedRecord?.status === "approved";
  const canLaunchLive = isPackageApproved && isPlanApproved;
  const launchMode = rawLaunchMode === "live" && !canLaunchLive ? "preview" : rawLaunchMode;

  // Cockpit session hook
  const {
    view: cockpitView,
    revision: cockpitRevision,
    error: cockpitError,
    isSubmitting: isCockpitBusy,
    dispatchCommand,
    rotatePresenterToken,
    getRemainingMs,
  } = useLessonSession({
    sessionId: activeSessionId,
    role: "teacher",
    enabled: activeTab === "cockpit" && Boolean(activeSessionId),
    pollIntervalMs: 3000,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restoredId = sessionStorage.getItem("active_teacher_session");
      setActiveSessionId(restoredId);
      // The room code is only handed out when the room is created, so it is kept for the cockpit to show again.
      const restoredCode = sessionStorage.getItem("active_teacher_session_code");
      if (restoredId && restoredCode) setCreatedSessionData((current) => current ?? { id: restoredId, code: restoredCode });
      setIsSessionRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fetchSourceById = useCallback(async (targetId: string) => {
    const trimmedId = (targetId || "").trim();
    if (!trimmedId) return;
    sourceOperationRef.current++;
    setGenerationConsentKey("");
    setGenerationJob(null);
    setIsLoadingSource(true);
    setImportError("");
    setUnsupportedInfo(null);
    try {
      const res = await fetch(`/api/lessons/sources?id=${encodeURIComponent(trimmedId)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { source?: LessonSourceMetadata; error?: string };
      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          saveImportSourceSession(null);
        }
        const errKey = data?.error;
        const msg =
          errKey === "AUTH_REQUIRED"
            ? "Yêu cầu đăng nhập tài khoản giáo viên để truy cập nguồn học liệu."
            : errKey === "NOT_FOUND"
            ? `Không tìm thấy nguồn học liệu với mã: ${trimmedId} (hoặc bạn không có quyền sở hữu).`
            : errKey || `Lỗi tải nguồn (${res.status})`;
        throw new Error(msg);
      }
      const src = data.source;
      if (!src) {
        throw new Error("Không nhận được dữ liệu nguồn học liệu.");
      }
      setImportSourceId(src.id);
      setImportSourceStatus(src.status);
      setImportSourceMeta(src);
      setSourceIdInput(src.id);
      saveImportSourceSession(src.id);

      if (src.status === "failed") {
        setImportExtraction(null);
        setImportProposal(null);
        setImportError(
          `Nguồn học liệu không thể trích xuất (Trạng thái: failed, Mã lỗi: ${src.errorCode || "PARSE_FAILED"}).`
        );
      } else if (src.extraction) {
        setImportExtraction(src.extraction);
        setImportProposal(null);
        setStudioStatus(`✓ Đã tải nguồn học liệu: ${src.originalName || src.id}`);
      } else {
        setImportExtraction(null);
        setStudioStatus(`Nguồn học liệu đang ở trạng thái: ${getTeacherDisplay(src.status)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải nguồn học liệu.";
      setImportError(msg);
    } finally {
      setIsLoadingSource(false);
    }
  }, []);

  const handleGenerateLessonProposal = useCallback(async () => {
    if (!importSourceId || !importSourceMeta || importSourceMeta.status !== "ready") {
      setImportError("Cần nguồn DOCX/PDF đã trích xuất thành công trước khi tạo đề xuất tự động.");
      return;
    }
    setIsLoadingSource(true);
    setImportError("");
    try {
      const res = await fetch(`/api/lessons/proposal?sourceId=${encodeURIComponent(importSourceId)}`, { cache: "no-store" });
      const data = (await res.json()) as { proposal?: LessonProposal; error?: string };
      if (!res.ok || !data.proposal) throw new Error(data.error || "Không thể tạo đề xuất tổ chức tiết học.");
      setImportProposal(data.proposal);
      setStudioStatus("✓ Đã tạo đề xuất tổ chức tiết học từ nguồn đã kiểm chứng. Giáo viên cần rà soát trước khi dùng.");
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Không thể tạo đề xuất tự động.");
    } finally {
      setIsLoadingSource(false);
    }
  }, [importSourceId, importSourceMeta]);

  const handleStartAIGeneration = useCallback(async () => {
    if (generationBusyRef.current) return;
    if (!importSourceId || !importSourceMeta || importSourceStatus !== "ready") {
      setImportError("Cần nguồn học liệu đã trích xuất thành công trước khi tạo bản nháp AI.");
      return;
    }
    if (!aiConsentKey || generationConsentKey !== aiConsentKey) {
      setImportError("Cần xác nhận đồng ý gửi đúng nguồn học liệu và cấu hình đến nhà cung cấp AI.");
      return;
    }
    generationBusyRef.current = true;
    const epoch = sourceOperationRef.current;
    const current = () => sourceOperationRef.current === epoch;
    const storageKey = "lesson-generation:" + user.userId + ":" + importSourceId;
    setIsStartingGeneration(true);
    setImportError("");
    try {
      const capability = await fetch("/api/lessons/proposal?capabilities=true", { cache: "no-store" });
      const capabilityData = (await capability.json()) as { generation?: { configured?: boolean; providerHost?: string } };
      if (!capability.ok || !capabilityData.generation?.configured) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
      if (!current()) return;
      if (capabilityData.generation.providerHost !== generationProviderHost) {
        setGenerationProviderHost(capabilityData.generation.providerHost || "");
        setGenerationConsentKey("");
        throw new Error("Nhà cung cấp AI đã thay đổi. Kiểm tra và xác nhận lại trước khi gửi.");
      }
      if (!current()) return;
      let requestId = "gen_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      try {
        if (generationJob?.sourceId === importSourceId && ["failed", "needs_review", "interrupted"].includes(generationJob.status)) sessionStorage.removeItem(storageKey);
        const stored = JSON.parse(sessionStorage.getItem(storageKey) || "null") as { requestId: string; settings: string; hash: string } | null;
        if (stored?.settings === JSON.stringify(generationSettings) && stored.hash === importSourceMeta.extractionHash) requestId = stored.requestId;
        sessionStorage.setItem(storageKey, JSON.stringify({ requestId, settings: JSON.stringify(generationSettings), hash: importSourceMeta.extractionHash }));
      } catch { /* Request still works when session storage is unavailable. */ }
      const response = await fetch("/api/lessons/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          sourceId: importSourceId,
          requestId,
          settings: generationSettings,
        }),
      });
      const data = (await response.json()) as { job?: LessonGenerationJob; error?: string };
      if (!response.ok || !data.job) throw new Error(data.error || "Không thể khởi tạo lượt tạo bản nháp AI.");
      if (!current()) return;
      setGenerationJob(data.job);
      try {
        const stored = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
        sessionStorage.setItem(storageKey, JSON.stringify({ ...stored, id: data.job.id }));
      } catch { /* Polling can continue without persisted job identity. */ }
      setStudioStatus("✓ Đã xếp hàng tạo bản nháp AI. Hệ thống sẽ giữ bản nguồn và không tự phê duyệt.");
      const runResponse = await fetch("/api/lessons/proposal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run", id: data.job.id, aiConsent: {
        confirmed: true, sourceId: importSourceId, sourceSha256: importSourceMeta.sha256,
        parserRevision: importSourceMeta.parserRevision, extractionHash: importSourceMeta.extractionHash,
      } }) });
      const runData = (await runResponse.json()) as { job?: LessonGenerationJob; error?: string };
      if (!runResponse.ok || !runData.job) throw new Error(runData.error || "Không thể tạo bản nháp AI.");
      if (current()) setGenerationJob(runData.job);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể khởi tạo bản nháp AI.";
      if (current()) setImportError(message === "AI_PROVIDER_NOT_CONFIGURED" ? "Chưa bật tạo bài bằng AI. Bạn vẫn có thể dùng đề xuất tổ chức và biên tập thủ công." : message);
    } finally {
      generationBusyRef.current = false;
      setIsStartingGeneration(false);
    }
  }, [aiConsentKey, generationConsentKey, generationProviderHost, generationJob, generationSettings, importSourceId, importSourceMeta, importSourceStatus, user.userId]);

  useEffect(() => {
    if (!importProposal || importSourceStatus !== "ready") return;
    let active = true;
    void fetch("/api/lessons/proposal?capabilities=true", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then((data) => {
        const capabilities = data as { generation?: { configured?: boolean; providerHost?: string } } | null;
        if (active) {
          setGenerationProviderHost(capabilities?.generation?.configured ? capabilities.generation.providerHost || "" : "");
          setGenerationConsentKey("");
        }
      })
      .catch(() => { if (active) setGenerationProviderHost(""); });
    return () => { active = false; };
  }, [importProposal, importSourceStatus]);

  useEffect(() => {
    if (!generationJob?.id || generationJob.sourceId !== importSourceId || !["queued", "running"].includes(generationJob.status)) return;
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/lessons/proposal?jobId=" + encodeURIComponent(generationJob.id), { cache: "no-store" });
        const data = (await response.json()) as { job?: LessonGenerationJob };
        if (!active) return;
        if (!response.ok || !data.job) { timer = window.setTimeout(poll, 4000); return; }
        setGenerationJob(data.job);
        if (["queued", "running"].includes(data.job.status)) timer = window.setTimeout(poll, 2000);
      } catch {
        if (active) timer = window.setTimeout(poll, 4000);
      }
    };
    timer = window.setTimeout(poll, 500);
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [generationJob?.id, generationJob?.status, generationJob?.sourceId, importSourceId]);

  useEffect(() => {
    if (!importSourceId || !importSourceMeta) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const stored = JSON.parse(sessionStorage.getItem("lesson-generation:" + user.userId + ":" + importSourceId) || "null") as { id?: string; hash?: string } | null;
        if (!stored?.id || stored.hash !== importSourceMeta.extractionHash) return;
        const response = await fetch("/api/lessons/proposal?jobId=" + encodeURIComponent(stored.id), { cache: "no-store" });
        const data = (await response.json()) as { job?: LessonGenerationJob };
        if (active && response.ok && data.job) setGenerationJob(data.job);
      } catch { /* Manual creation also reloads a job by its saved request identity. */ }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [importSourceId, importSourceMeta, user.userId]);

  const handleApplyGenerationResult = useCallback(() => {
    const pkg = generationJob?.result?.package;
    if (!pkg || generationJob.status !== "needs_review" || pkg.status !== "needs_review" || generationJob.sourceId !== importSourceId || generationJob.extractionHash !== importSourceMeta?.extractionHash || generationJob.sourceSha256 !== importSourceMeta.sha256) return;
    activePackageFetchIdRef.current = null;
    activeDirectorFetchIdRef.current = null;
    setSelectedRecord(null);
    setDirectorDraft(null);
    setApprovedPlan(null);
    setLaunchMode("preview");
    setIsApproveOpen(false);
    setIsLaunchOpen(false);
    setCreatedSessionData(null);
    setDraftErrors([]);
    setCurrentPackage(pkg);
    setEditedPackage(pkg);
    setStudioSubTab("edit");
    setStudioStatus("✓ Đã đưa bản nháp AI vào biểu mẫu. Vẫn cần rà soát lỗi, nguồn, mục tiêu và đáp án trước khi lưu.");
  }, [generationJob, importSourceId, importSourceMeta, setEditedPackage, setStudioSubTab]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          const storedId = window.sessionStorage.getItem(SESSION_SOURCE_ID_KEY);
          if (storedId) {
            setSourceIdInput(storedId);
            setIsLoadingSource(true);
            fetch(`/api/lessons/sources?id=${encodeURIComponent(storedId)}`, { cache: "no-store" })
              .then(async (res) => {
                if (!active) return;
                if (!res.ok) {
                  if (res.status === 404 || res.status === 401) {
                    saveImportSourceSession(null);
                  }
                  return;
                }
                const data = (await res.json()) as { source?: LessonSourceMetadata };
                if (!active || !data?.source) return;
                const src = data.source;
                setImportSourceId(src.id);
                setImportSourceStatus(src.status);
                setImportSourceMeta(src);
                if (src.extraction) {
                  setImportExtraction(src.extraction);
                  setImportProposal(null);
                }
              })
              .catch(() => {})
              .finally(() => {
                if (active) setIsLoadingSource(false);
              });
          }
        }
      } catch {
        // sessionStorage unavailable; do not use localStorage
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Cockpit assessments evaluation state
  const [assessingSubId, setAssessingSubId] = useState<string | null>(null);
  const [assessCriteriaMet, setAssessCriteriaMet] = useState<boolean>(true);
  const [assessFeedback, setAssessFeedback] = useState<string>("");
  const [assessNonMastery, setAssessNonMastery] = useState<boolean>(false);

  // Load packages & pilot on mount
  const loadStudio = useCallback(async (selectInitial = false) => {
    const fetchSessionId = `load-${Date.now()}-${Math.random()}`;
    activeListFetchIdRef.current = fetchSessionId;
    const revision = draftRevisionRef.current;
    if (selectInitial) setIsLoadingStudio(true);
    try {
      const listRes = await fetch("/api/lessons?kind=list", { cache: "no-store" });
      if (!listRes.ok) throw new Error("Không thể tải danh sách bài học.");
      const listData = (await listRes.json()) as { packages?: PackageRecord[] };
      if (activeListFetchIdRef.current !== fetchSessionId) return;
      const pkgList: PackageRecord[] = listData.packages || [];
      setPackages(pkgList);
      if (!selectInitial || draftRevisionRef.current !== revision) return;
      activePackageFetchIdRef.current = fetchSessionId;

      if (pkgList.length > 0) {
        const first = pkgList[0];
        setSelectedRecord(first);
        const getRes = await fetch(`/api/lessons?kind=get&id=${first.row_id}`, { cache: "no-store" });
        if (activePackageFetchIdRef.current !== fetchSessionId || draftRevisionRef.current !== revision) return;
        if (getRes.ok) {
          const normalized = normalizeLessonResponse(await getRes.json());
          if (activePackageFetchIdRef.current !== fetchSessionId || draftRevisionRef.current !== revision) return;
          setSelectedRecord(normalized.row || first);
          setCurrentPackage(normalized.lesson);
          setEditedPackage(JSON.parse(JSON.stringify(normalized.lesson)));
          setLaunchTitle(normalized.lesson.essentialQuestion?.slice(0, 60) || normalized.lesson.id);
        }
      } else {
        // Fallback to pilot
        const pilotRes = await fetch("/api/lessons?kind=pilot", { cache: "no-store" });
        if (activePackageFetchIdRef.current !== fetchSessionId || draftRevisionRef.current !== revision) return;
        if (pilotRes.ok) {
          const normalized = normalizeLessonResponse(await pilotRes.json());
          if (activePackageFetchIdRef.current !== fetchSessionId || draftRevisionRef.current !== revision) return;
          setSelectedRecord(null);
          setCurrentPackage(normalized.lesson);
          setEditedPackage(JSON.parse(JSON.stringify(normalized.lesson)));
          setLaunchTitle(normalized.lesson.essentialQuestion?.slice(0, 60) || normalized.lesson.id);
        }
      }
    } catch (err: unknown) {
      if (activeListFetchIdRef.current === fetchSessionId && draftRevisionRef.current === revision) {
        const msg = err instanceof Error ? err.message : "Lỗi tải bài học.";
        setStudioStatus(msg);
      }
    } finally {
      if (selectInitial && (activePackageFetchIdRef.current === fetchSessionId || (activePackageFetchIdRef.current === null && activeListFetchIdRef.current === fetchSessionId))) {
        setIsLoadingStudio(false);
      }
    }
  }, [setEditedPackage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudio(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStudio]);

  // Select package from list
  const handleSelectPackage = async (rec: PackageRecord | null) => {
    const targetRowId = rec?.row_id || "";
    const requestId = `${targetRowId}-${Date.now()}-${Math.random()}`;
    activePackageFetchIdRef.current = requestId;
    activeDirectorFetchIdRef.current = null;
    setMappingJson(null);
    setMappingError("");
    setDraftErrors([]);
    setIsLoadingStudio(true);
    setSelectedRecord(rec);
    setCurrentPackage(null);
    setEditedPackage(null);
    setStudioSubTab("preview");
    const revision = draftRevisionRef.current;
    setDirectorDraft(null);
    setApprovedPlan(null);
    setDirectorError("");
    setPlanApprovalStatus("");
    setIsLoadingDirector(false);
    setIsApprovingPlan(false);
    setIsSubmittingApproval(false);
    setIsApproveOpen(false);
    setStudioStatus("");
    setLaunchMode("preview");
    try {
      const res = await fetch(targetRowId ? `/api/lessons?kind=get&id=${targetRowId}` : "/api/lessons?kind=pilot", { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải chi tiết bài học.");
      const rawData = await res.json();
      if (activePackageFetchIdRef.current !== requestId || draftRevisionRef.current !== revision) return;
      const { lesson, row } = normalizeLessonResponse(rawData);
      setSelectedRecord(row || rec);
      setCurrentPackage(lesson);
      setEditedPackage(JSON.parse(JSON.stringify(lesson)));
      setLaunchTitle(lesson.essentialQuestion?.slice(0, 60) || lesson.id);
    } catch (err: unknown) {
      if (activePackageFetchIdRef.current === requestId && draftRevisionRef.current === revision) {
        const msg = err instanceof Error ? err.message : "Lỗi tải bài học.";
        setStudioStatus(msg);
      }
    } finally {
      if (activePackageFetchIdRef.current === requestId) {
        setIsLoadingStudio(false);
      }
    }
  };

  // Fetch director draft for selected saved package
  const handleFetchDirectorDraft = async () => {
    if (!selectedRecord) {
      setDirectorError("Vui lòng chọn bài học đã lưu để tải bản thảo đạo diễn.");
      return;
    }
    const targetRowId = selectedRecord.row_id;
    const requestId = `${targetRowId}-${Date.now()}-${Math.random()}`;
    const revision = draftRevisionRef.current;
    activeDirectorFetchIdRef.current = requestId;
    setIsLoadingDirector(true);
    setDirectorError("");
    setPlanApprovalStatus("");
    try {
      const res = await fetch(`/api/lessons?kind=director&id=${encodeURIComponent(targetRowId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData?.error || "Không thể tải kế hoạch đạo diễn.");
      }
      const data = (await res.json()) as DirectorDraftData;
      // Stale fetch check: only update if active selected record still matches targetRowId
      if (activeDirectorFetchIdRef.current === requestId && draftRevisionRef.current === revision) {
        setDirectorDraft(data);
      }
    } catch (err: unknown) {
      if (activeDirectorFetchIdRef.current === requestId && draftRevisionRef.current === revision) {
        const msg = err instanceof Error ? err.message : "Lỗi tải kế hoạch đạo diễn.";
        setDirectorError(msg);
      }
    } finally {
      if (activeDirectorFetchIdRef.current === requestId) {
        setIsLoadingDirector(false);
      }
    }
  };

  // Approve director plan for verified approved package
  const handleApprovePlan = async () => {
    if (!selectedRecord || !currentPackage || !directorDraft?.plan) return;
    const revision = draftRevisionRef.current;

    if (selectedRecord.status !== "approved") {
      alert("Chưa thể phê duyệt kế hoạch đạo diễn: Gói bài dạy cần được giáo viên đối soát và phê duyệt nguồn học liệu trước.");
      return;
    }

    const sources = currentPackage.sourceRefs || [];
    const hasUnverified = sources.some((s) => s.verification !== "verified");
    if (sources.length === 0 || hasUnverified) {
      alert("Chưa thể phê duyệt kế hoạch đạo diễn: Tất cả nguồn học liệu trích dẫn phải được xác thực trước.");
      return;
    }

    setIsApprovingPlan(true);
    setPlanApprovalStatus("Đang gửi phê duyệt kế hoạch đạo diễn...");
    try {
      const sourceReview = sources.map((s) => ({
        id: s.id,
        locator: s.locator,
      }));

      const planBody = {
        action: "approve-plan",
        packageRowId: selectedRecord.row_id,
        packageVersion: selectedRecord.version,
        packageHash: selectedRecord.content_hash,
        planHash: directorDraft.plan.contentHash,
        sourceReview,
      };

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planBody),
      });

      const data = (await res.json()) as {
        error?: string;
        plan?: DirectorDraftPlan;
        row?: {
          rowId: string;
          planHash: string;
          packageRowId: string;
          packageVersion: string;
          packageHash: string;
          createdAt: number;
        };
      };

      if (draftRevisionRef.current !== revision) return;
      if (!res.ok || !data.row) {
        throw new Error(data.error || "Phê duyệt kế hoạch đạo diễn thất bại.");
      }

      setApprovedPlan({
        packageRowId: selectedRecord.row_id,
        packageVersion: selectedRecord.version,
        packageHash: selectedRecord.content_hash,
        planRowId: data.row.rowId,
        planHash: data.row.planHash,
        approvedAt: data.row.createdAt || Date.now(),
      });

      if (data.plan) {
        setDirectorDraft((prev) =>
          prev ? { ...prev, status: "approved", plan: data.plan || prev.plan } : null
        );
      }

      setPlanApprovalStatus("✓ Đã phê duyệt kế hoạch tổ chức. Sẵn sàng khởi tạo phòng học chính thức.");
    } catch (err: unknown) {
      if (draftRevisionRef.current !== revision) return;
      const msg = err instanceof Error ? err.message : "Thất bại.";
      setPlanApprovalStatus(`✕ Lỗi phê duyệt kế hoạch: ${msg}`);
      alert(`Lỗi phê duyệt kế hoạch đạo diễn: ${msg}`);
    } finally {
      if (draftRevisionRef.current === revision) setIsApprovingPlan(false);
    }
  };

  // Save new draft version
  const handleSaveDraft = async () => {
    if (!editedPackage || savingRef.current) return;
    if (mappingJson !== null) {
      setMappingError("Hãy áp dụng hoặc hủy nội dung JSON đang sửa trước khi lưu.");
      return;
    }
    const revision = draftRevisionRef.current;
    savingRef.current = true;
    setIsSavingDraft(true);
    setDraftErrors([]);
    setStudioStatus("Đang lưu bản thảo mới...");
    try {
      const syncedPackage = syncPackageBidirectionalLinks(editedPackage);
      const nextVersion = `${syncedPackage.version || "1.0.0"}-draft.${Date.now().toString().slice(-4)}`;
      const draftPkg = {
        ...syncedPackage,
        version: nextVersion,
        status: "draft",
        sourceRefs: (syncedPackage.sourceRefs || []).map((s) => ({
          ...s,
          verification: "teacher_review_required",
        })),
      };

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", package: draftPkg }),
      });

      const data = (await res.json()) as { package?: LessonPackage; row?: PackageRecord; error?: string; errors?: Array<{ path: string; message: string }> };
      if (draftRevisionRef.current !== revision) return;
      if (!res.ok) {
        if (data.errors?.length) {
          setDraftErrors(data.errors);
          setStudioStatus("Chưa thể lưu bản thảo bài dạy. Vui lòng hoàn thiện các trường dữ liệu theo thông báo lỗi bên dưới.");
          return;
        }
        throw new Error(data.error || "Không thể lưu bản thảo.");
      }

      setStudioStatus("✓ Đã lưu bản thảo bài dạy thành công!");
      if (!data.package || !data.row) throw new Error("Phản hồi lưu thiếu bài học hoặc mã bản lưu.");
      setSelectedRecord(normalizeLessonResponse({ package: { ...data.row, package: data.package } }).row);
      setCurrentPackage(data.package);
      setEditedPackage(data.package);
      setDirectorDraft(null);
      setApprovedPlan(null);
      setStudioSubTab("preview");
      await loadStudio();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu.";
      if (draftRevisionRef.current === revision) setStudioStatus(`✕ Lỗi: ${msg}`);
    } finally {
      savingRef.current = false;
      setIsSavingDraft(false);
    }
  };

  // Handle import file change
  const [typedBrief, setTypedBrief] = useState("");
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importSourceFile(file);
  };

  // Typed "what I want to teach + requirements" goes through the same source pipeline as an uploaded .txt file.
  const importTypedBrief = async () => {
    const text = typedBrief.trim();
    if (!text) return;
    await importSourceFile(new File([text], "noi-dung-bai-day.txt", { type: "text/plain" }), true);
  };

  const importSourceFile = async (file: File, typed = false) => {
    sourceOperationRef.current++;
    setGenerationConsentKey("");
    setGenerationJob(null);
    setImportFile(file);
    setImportError("");
    setUnsupportedInfo(null);
    setImportExtraction(null);
    setImportSourceId(null);
    setImportSourceStatus(null);
    setImportSourceMeta(null);
    setImportProposal(null);

    const lowerName = file.name.toLowerCase();
    const isDocx = lowerName.endsWith(".docx");
    const isPdf = lowerName.endsWith(".pdf");

    if (isDocx || isPdf || typed) {
      setIsImporting(true);
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Tệp vượt quá giới hạn 10 MiB. Chọn tệp nhỏ hơn để nhập.");
        const arrayBuffer = await file.arrayBuffer();
        const hashHex = await computeSha256Hex(arrayBuffer);
        const safeName = file.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
        const requestId = `req_${hashHex.slice(0, 32)}_${safeName}`.slice(0, 80);

        const mime = typed
          ? "text/plain"
          : isDocx
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

        const res = await fetch("/api/lessons/sources", {
          method: "POST",
          headers: {
            "Content-Type": mime,
            "x-file-name": encodeURIComponent(file.name),
            "x-request-id": requestId,
          },
          body: arrayBuffer,
        });

        const data = (await res.json()) as { source?: LessonSourceMetadata; error?: string };

        if (!res.ok) {
          const errCode = data?.error;
          let msg: string;
          switch (errCode) {
            case "AUTH_REQUIRED":
              msg = "Yêu cầu đăng nhập tài khoản giáo viên để tải lên nguồn học liệu.";
              break;
            case "BODY_TOO_LARGE":
              msg = "Dung lượng tệp vượt quá giới hạn tối đa cho phép (10 MiB).";
              break;
            case "INVALID_MIME":
            case "INVALID_SIGNATURE":
              msg = `Chữ ký hoặc định dạng tệp ${isDocx ? "DOCX" : "PDF"} không hợp lệ.`;
              break;
            case "SOURCE_QUOTA_EXCEEDED":
              msg = "Đã vượt hạn mức lưu trữ nguồn học liệu (tối đa 25 tệp hoặc 100 MiB).";
              break;
            case "REQUEST_ID_CONFLICT":
              msg = "Xung đột mã yêu cầu với nội dung tệp khác nhau.";
              break;
            case "SOURCE_STORAGE_UNAVAILABLE":
            case "SOURCE_UNAVAILABLE":
              msg = "Dịch vụ lưu trữ nguồn học liệu tạm thời không khả dụng.";
              break;
            default:
              msg = errCode || `Lỗi tải lên tệp (${res.status})`;
          }
          throw new Error(msg);
        }

        const source = data.source;
        if (!source) {
          throw new Error("Máy chủ không trả về dữ liệu nguồn học liệu.");
        }

        setImportSourceId(source.id);
        setImportSourceStatus(source.status);
        setImportSourceMeta(source);
        setSourceIdInput(source.id);
        saveImportSourceSession(source.id);

        if (source.status === "failed") {
          setImportProposal(null);
          const parseCode = source.errorCode;
          let errMsg: string;
          switch (parseCode) {
            case "ENCRYPTED_PDF":
              errMsg = "Tệp PDF đã bị mã hóa hoặc cài đặt mật khẩu bảo vệ.";
              break;
            case "CORRUPTED_PDF":
              errMsg = "Tệp PDF bị lỗi cấu trúc hoặc hỏng dữ liệu.";
              break;
            case "MAX_PAGES_EXCEEDED":
              errMsg = "Tệp PDF vượt quá giới hạn số trang cho phép (tối đa 100 trang).";
              break;
            case "MAX_PAGE_TEXT_EXCEEDED":
            case "MAX_TOTAL_TEXT_EXCEEDED":
              errMsg = "Lượng văn bản trong PDF vượt quá giới hạn trích xuất an toàn.";
              break;
            case "PARSE_FAILED":
              errMsg = `Không thể phân tích nội dung tệp ${isDocx ? "DOCX" : "PDF"}.`;
              break;
            case "EXTRACTION_TOO_LARGE":
              errMsg = "Dữ liệu trích xuất vượt quá kích thước giới hạn (8 MiB).";
              break;
            default:
              errMsg = parseCode ? `Trích xuất thất bại: ${parseCode}` : "Trích xuất thất bại.";
          }
          throw new Error(errMsg);
        }

        if (source.extraction) {
          setImportExtraction(source.extraction);
          setImportProposal(null);
          setStudioStatus(`✓ Đã tải lên và trích xuất thành công tài liệu: ${source.originalName || file.name}`);
        } else if (source.status === "pending") {
          setStudioStatus(`Tài liệu đã được tải lên và đang chờ xử lý: ${source.originalName || file.name}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi tải lên tệp.";
        setImportError(msg);
      } finally {
        setIsImporting(false);
      }
      return;
    }

    if (!lowerName.endsWith(".md") && !lowerName.endsWith(".txt")) {
      setImportError("Vui lòng chọn tệp Markdown (.md) hoặc tệp văn bản thuần túy (.txt).");
      return;
    }

    setIsImporting(true);
    try {
      if (file.size > 128 * 1024) {
        throw new Error(`Dung lượng tệp (${file.size} bytes) vượt quá giới hạn cho phép (128 KiB).`);
      }

      const text = await file.text();
      const kind = lowerName.endsWith(".txt") ? "text" : "markdown";

      const res = await fetch("/api/lessons/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          originalName: file.name,
          text,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        if (data && data.status === "unsupported_format") {
          setUnsupportedInfo(data as unknown as UnsupportedFormatInfo);
        } else {
          const errMsg =
            (typeof data?.error === "string" ? data.error : null) ||
            (Array.isArray(data?.errors) && typeof (data.errors[0] as { message?: string })?.message === "string"
              ? (data.errors[0] as { message: string }).message
              : null) ||
            "Không thể trích xuất giáo án.";
          throw new Error(errMsg);
        }
        return;
      }

      saveImportSourceSession(null);
      setImportExtraction(data as unknown as SourceExtraction);
      const textExtraction = data as unknown as SourceExtraction;
      setImportProposal(buildLessonProposal({ extraction: textExtraction, sourceId: textExtraction.id, parserRevision: "text-local-1", extractionHash: textExtraction.sha256 }));
      setStudioStatus(`✓ Đã nhập và trích xuất thành công tệp: ${file.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi đọc tệp.";
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Create draft candidate from extracted text only
  const handleUseExtractionForDraft = () => {
    if (!importExtraction) return;
    if (importSourceId && (importSourceMeta?.id !== importSourceId || importSourceMeta.status !== "ready" || !importSourceMeta.parserRevision || !importSourceMeta.extractionHash || importSourceMeta.sha256 !== importExtraction.sha256)) {
      setImportError("Tải lại nguồn học liệu để xác nhận đúng bản trích xuất trước khi tạo bài.");
      return;
    }

    const headingSeg = importExtraction.segments.find((s) => s.kind === "heading");
    const paraSeg = importExtraction.segments.find((s) => s.kind === "paragraph");
    const extractedQuestion = headingSeg
      ? headingSeg.text.replace(/^#+\s*/, "").trim()
      : paraSeg
      ? paraSeg.text.trim().slice(0, 160)
      : "Câu hỏi cốt lõi bài học (soạn theo nguồn trích xuất)";

    const activeSourceId = importSourceId || importExtraction.id;
    const sourceLocator = importSourceId && importSourceMeta
      ? `lesson-source:${importSourceId}:${importSourceMeta.parserRevision}:${importSourceMeta.extractionHash}`
      : importExtraction.originalName;

    const draftCandidate: LessonPackage = {
      schemaVersion: "1.0.0",
      id: `pkg-${importExtraction.sha256.slice(0, 8)}`,
      version: "1.0.0-draft",
      status: "draft",
      subject: "math",
      grade: 11,
      curriculumRefs: [],
      sourceRefs: [
        {
          id: activeSourceId,
          kind: "external",
          hash: importExtraction.sha256,
          locator: sourceLocator,
          label: `${importExtraction.originalName} (SHA: ${importExtraction.sha256.slice(0, 8)})`,
          verification: "teacher_review_required",
        },
      ],
      essentialQuestion: extractedQuestion,
      prerequisites: [],
      objectives: [], // strictly empty: do NOT invent LO
      budget: {
        slotMinutes: 40,
        coreMinutes: 0,
        reserveMinutes: 0,
        optionalMinutes: 0,
        transitionMinutes: 0,
      },
      activities: [], // strictly empty: do NOT invent activities
      tasks: [],
      hints: [],
      evidenceRules: [],
      rubric: {
        criteria: [],
        lookFor: [],
      },
      modePolicies: {},
      masteryPolicy: {
        individualEvidencePerObjectiveMin: 2,
        masterySources: ["individual_recheck", "exit"],
        forbiddenSources: ["group_product", "map_position", "race_position", "group_score"],
      },
    };

    activePackageFetchIdRef.current = null;
    activeDirectorFetchIdRef.current = null;
    setIsLoadingStudio(false);
    setIsApprovingPlan(false);
    setIsSubmittingApproval(false);
    setSelectedRecord(null);
    setDirectorDraft(null);
    setApprovedPlan(null);
    setDirectorError("");
    setPlanApprovalStatus("");
    setIsLoadingDirector(false);
    setLaunchMode("preview");
    setIsApproveOpen(false);
    setIsLaunchOpen(false);
    setCheckedSourceAcks({});
    setApprovalNotes("");
    setCreatedSessionData(null);
    setLaunchTitle("");
    setImportError("");
    setUnsupportedInfo(null);
    setMappingJson(null);
    setMappingError("");
    setDraftErrors([]);
    setCurrentPackage(draftCandidate);
    setEditedPackage(draftCandidate);
    setStudioSubTab("edit");
    setStudioStatus(
        `Đã khởi tạo bản nháp từ "${importExtraction.originalName}". Nguồn cần giáo viên duyệt (teacher_review_required). Vui lòng hoàn thiện ngân sách, chuẩn đầu ra, hoạt động, nhiệm vụ và minh chứng bằng biểu mẫu bên dưới trước khi lưu.`
      );
  };

  // Open approval modal
  const openApprovalModal = () => {
    if (!currentPackage || !selectedRecord) return;
    const acks: Record<string, boolean> = {};
    (currentPackage.sourceRefs || []).forEach((src) => {
      acks[`${src.id}\u0000${src.locator}`] = false;
    });
    setCheckedSourceAcks(acks);
    setCheckedNumericAcks({});
    setApprovalNotes("");
    setIsApproveOpen(true);
  };

  // Handle explicit all-source approval
  const handleApprove = async () => {
    if (!selectedRecord || !currentPackage) return;
    const revision = draftRevisionRef.current;
    const sources: LessonSourceRef[] = currentPackage.sourceRefs || [];
    const allChecked = sources.every((s) => checkedSourceAcks[`${s.id}\u0000${s.locator}`] && (!sourceNeedsNumericReview(currentPackage.tasks || [], s.id) || checkedNumericAcks[`${s.id}\u0000${s.locator}`]));
    if (!allChecked) {
      alert("Vui lòng đối soát và đánh dấu xác nhận đầy đủ tất cả các nguồn học liệu trước khi phê duyệt.");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const sourceReviewAck = sources.map((s) => ({
        id: s.id,
        locator: s.locator,
        numericReviewConfirmed: Boolean(checkedNumericAcks[`${s.id}\u0000${s.locator}`]),
      }));

      const nextVersion = bumpSemverPatch(currentPackage.version || "1.0.0");

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          id: selectedRecord.row_id,
          parentHash: selectedRecord.content_hash,
          version: nextVersion,
          sourceReviewAck,
          notes: approvalNotes.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { package?: LessonPackage; row?: PackageRecord; error?: string };
      if (draftRevisionRef.current !== revision) return;
      if (!res.ok) {
        throw new Error(data.error || "Phê duyệt bài dạy thất bại.");
      }

      setIsApproveOpen(false);
      setIsSubmittingApproval(false);
      if (!data.package || !data.row) throw new Error("Phản hồi phê duyệt thiếu bài học hoặc mã bản lưu.");
      setSelectedRecord(normalizeLessonResponse({ package: { ...data.row, package: data.package } }).row);
      setCurrentPackage(data.package);
      setEditedPackage(data.package);
      setDirectorDraft(null);
      setApprovedPlan(null);
      setStudioStatus("✓ Bài học đã được phê duyệt thành công!");
      await loadStudio();
    } catch (err: unknown) {
      if (draftRevisionRef.current !== revision) return;
      const msg = err instanceof Error ? err.message : "Thất bại.";
      alert(`Lỗi phê duyệt: ${msg}`);
    } finally {
      if (draftRevisionRef.current === revision) setIsSubmittingApproval(false);
    }
  };

  // Handle session creation (Preview or Live)
  const handleCreateSession = async () => {
    if (!selectedRecord) return;

    if (launchMode === "live" && !canLaunchLive) {
      alert("Chế độ chính thức yêu cầu cả gói bài học và kế hoạch tổ chức phải được phê duyệt hợp lệ.");
      return;
    }

    setIsCreatingSession(true);
    try {
      const requestId = `req-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const body: Record<string, string> = {
        action: "create",
        packageRowId: selectedRecord.row_id,
        mode: launchMode,
        title: launchTitle.trim() || currentPackage?.id || "Tiết học",
        requestId,
      };

      if (launchMode === "live") {
        if (!approvedPlan) throw new Error("PLAN_REQUIRED");
        body.packageVersion = selectedRecord.version;
        body.packageHash = selectedRecord.content_hash;
        body.planRowId = approvedPlan.planRowId;
        body.planHash = approvedPlan.planHash;
      } else {
        // Preview mode: package-only remains allowed; if plan approved, can attach
        if (selectedRecord.version) body.packageVersion = selectedRecord.version;
        if (selectedRecord.content_hash) body.packageHash = selectedRecord.content_hash;
        if (isPlanApproved && approvedPlan) {
          body.planRowId = approvedPlan.planRowId;
          body.planHash = approvedPlan.planHash;
        }
      }

      const res = await fetch("/api/lesson-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        error?: string;
        session: { id: string; code: string };
        presenterToken?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Không thể khởi tạo phòng học.");
      }

      const session = data.session;
      const presenterToken = data.presenterToken;

      // Persist raw presenter token scoped strictly in sessionStorage
      if (presenterToken) {
        sessionStorage.setItem(`presenter_token_${session.id}`, presenterToken);
      }
      sessionStorage.setItem("active_teacher_session", session.id);
      sessionStorage.setItem("active_teacher_session_code", session.code);

      setCreatedSessionData({
        id: session.id,
        code: session.code,
        presenterToken,
      });

      setActiveSessionId(session.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thất bại.";
      alert(`Lỗi khởi tạo phòng: ${msg}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Presenter window postMessage handshake
  const launchPresenterWithHandshake = (sessionId: string) => {
    const token = sessionStorage.getItem(`presenter_token_${sessionId}`);
    const presenterWindow = window.open(`/presenter?session=${encodeURIComponent(sessionId)}`, "_blank");
    if (!presenterWindow) {
      alert("Trình duyệt đã chặn mở tab mới. Vui lòng cho phép popup để mở màn hình TV trình chiếu.");
      return;
    }

    if (!token) return;

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "SIGNAL_PRESENTER_READY") {
        presenterWindow.postMessage(
          {
            type: "SIGNAL_PRESENTER_TOKEN",
            sessionId,
            presenterToken: token,
          },
          window.location.origin
        );
      }
      if (event.data?.type === "SIGNAL_PRESENTER_ACK") {
        window.removeEventListener("message", messageHandler);
      }
    };

    window.addEventListener("message", messageHandler);
    setTimeout(() => {
      window.removeEventListener("message", messageHandler);
    }, 30000);
  };

  // CSV Export for teacher cockpit
  const exportCockpitCsv = () => {
    if (!cockpitView) return;
    const roster = Object.values(cockpitView.roster || {}) as Array<{
      id: string;
      name: string;
      present: boolean;
    }>;
    const headers = [
      "Mã học sinh",
      "Họ và tên",
      "Có mặt",
      "Phân nhánh",
      "Vai trò nhóm",
      "Điểm ví tích lũy",
      "Điểm thưởng",
      "Chuẩn T11.18",
      "Chuẩn T11.19",
    ];

    const rows = roster.map((learner) => {
      const passportsMap = (cockpitView.passports || {}) as Record<string, {
        objectives?: Record<string, { status?: string }>;
      }>;
      const passport = passportsMap[learner.id] || {};
      const walletsMap = (cockpitView.gameWallets?.learners || {}) as Record<string, { earned: number; bonus?: number }>;
      const wallet = walletsMap[learner.id] || { earned: 0, bonus: 0 };
      const currentActId = cockpitView.timeline?.currentActivityId || "";
      const branchesMap = (cockpitView.branches?.[currentActId] || {}) as Record<string, string>;
      const branch = branchesMap[learner.id] || "core";

      let groupRole = "Thành viên";
      const activityGroups = (cockpitView.groups?.[currentActId] || {}) as {
        groups?: Array<{ memberIds: string[]; roles?: Record<string, string> }>;
      };
      const grp = activityGroups.groups?.find((g) => g.memberIds.includes(learner.id));
      if (grp?.roles) {
        for (const [rId, mId] of Object.entries(grp.roles)) {
          if (mId === learner.id) groupRole = rId;
        }
      }

      const m18 = passport.objectives?.["obj-t11-18"]?.status || "chưa_đạt";
      const m19 = passport.objectives?.["obj-t11-19"]?.status || "chưa_đạt";

      return [
        escapeCsvCell(learner.id),
        escapeCsvCell(learner.name),
        escapeCsvCell(learner.present ? "Có mặt" : "Vắng"),
        escapeCsvCell(branch),
        escapeCsvCell(groupRole),
        escapeCsvCell(wallet.earned),
        escapeCsvCell(wallet.bonus || 0),
        escapeCsvCell(m18),
        escapeCsvCell(m19),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bao-cao-lop-hoc-${cockpitView.id?.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit assessment for an open task submission
  const handleSubmitAssessment = async (submissionId: string) => {
    if (!submissionId) return;
    const res = await dispatchCommand("ASSESS", {
      submissionId,
      criteriaMet: assessCriteriaMet,
      feedback: assessFeedback.trim() || undefined,
      nonMastery: assessNonMastery,
    });
    if (res.ok) {
      setAssessingSubId(null);
      setAssessFeedback("");
      setAssessNonMastery(false);
    } else {
      alert(`Đánh giá thất bại: ${res.error}`);
    }
  };

  const currentActivities = currentPackage?.activities || [];
  const currentObjectives = currentPackage?.objectives || [];
  const currentTasks = currentPackage?.tasks || [];
  const cockpitRoster = Object.values(cockpitView?.roster || {});
  const cockpitPendingCount = Object.values(cockpitView?.openAssessments || {}).filter(item => item.status === "pending").length;
  const cockpitBranches = cockpitView?.branches?.[cockpitView.timeline?.currentActivityId || ""] || {};
  const selectLearner = (learnerId: string) => setPeerSelection({ sessionId: activeSessionId, learnerId });
  const selectPeer = (peerId: string) => {
    const learner = cockpitLearners(cockpitView).find(row => row.peerId === peerId);
    if (learner) selectLearner(learner.learnerId);
  };

  if (!isSessionRestored) {
    return (
      <main className="lesson-shell lesson-teacher-shell">
        <p>Đang khôi phục phiên giáo viên...</p>
      </main>
    );
  }

  return (
    <main className="lesson-shell lesson-teacher-shell">
      {/* Top Header */}
      <header className="lesson-header">
        <div>
          <p className="lesson-kicker">HỆ THỐNG QUẢN TRỊ BÀI DẠY VÀ LỚP HỌC</p>
          <h1 className="lesson-title">Bài học: Dãy số Toán 11</h1>
        </div>
        <div className="lesson-identity">
          <span>Giáo viên: <strong>{user.displayName}</strong></span>
          <span className="lesson-badge lesson-badge-primary">Chủ phòng</span>
          {activeTab === "studio" && <a className="lesson-button lesson-button-outline" href="/exams">Kiểm tra</a>}
          {activeSessionId && activeTab === "studio" && (
            <button
              className="lesson-button lesson-button-outline"
              onClick={() => setActiveTab("cockpit")}
            >
              Đến phòng điều hành
            </button>
          )}
        </div>
      </header>

      {/* Main Studio View */}
      {activeTab === "studio" && (
        <section className="lesson-studio">
          {/* Navigation Bar */}
          <div className="lesson-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={studioSubTab === "preview"}
              className={`lesson-tab ${studioSubTab === "preview" ? "lesson-tab-active" : ""}`}
              onClick={() => setStudioSubTab("preview")}
            >
              👁️ Cấu trúc & Xem trước giáo án
            </button>
            <button
              role="tab"
              aria-selected={studioSubTab === "director"}
              className={`lesson-tab ${studioSubTab === "director" ? "lesson-tab-active" : ""}`}
              onClick={() => setStudioSubTab("director")}
            >
              🎬 Kế hoạch tổ chức
              {isPlanApproved ? (
                <span className="lesson-badge lesson-badge-success" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                  ✓ Đã duyệt
                </span>
              ) : directorDraft ? (
                <span className="lesson-badge lesson-badge-warning" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                  Bản thảo
                </span>
              ) : null}
            </button>
            <button
              role="tab"
              aria-selected={studioSubTab === "edit"}
              className={`lesson-tab ${studioSubTab === "edit" ? "lesson-tab-active" : ""}`}
              onClick={() => setStudioSubTab("edit")}
            >
              ✏️ Biên tập nội dung
            </button>
            <button
              role="tab"
              aria-selected={studioSubTab === "import"}
              className={`lesson-tab ${studioSubTab === "import" ? "lesson-tab-active" : ""}`}
              onClick={() => setStudioSubTab("import")}
            >
              📥 Nhập giáo án (DOCX / PDF / MD)
            </button>
          </div>

          {studioStatus && (
            <div className="task-status-banner task-status-pending" style={{ marginBottom: "1rem" }}>
              {studioStatus}
            </div>
          )}

          {/* Action Header Bar */}
          <div className="cockpit-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label htmlFor="package-select" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Chọn bài học:
              </label>
              <select
                id="package-select"
                className="lesson-select"
                style={{ width: "min(260px, 100%)" }}
                value={selectedRecord?.row_id || ""}
                onChange={(e) => {
                  const target = packages.find((p) => p.row_id === e.target.value);
                  if (target || !e.target.value) void handleSelectPackage(target || null);
                }}
              >
                <option value="">Bài mẫu Dãy số — phiên bản hiện hành</option>
                {packages.map((p) => (
                  <option key={p.row_id} value={p.row_id}>
                    {p.package_id} (v{p.version}) - [{getTeacherDisplay(p.status)}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {isEditing ? (
                <>
                  <button className="lesson-button lesson-button-primary" disabled={isSavingDraft} onClick={handleSaveDraft}>
                    Lưu bản thảo mới
                  </button>
                  <button className="lesson-button lesson-button-outline" onClick={() => setStudioSubTab("preview")}>
                    Hủy chỉnh sửa
                  </button>
                </>
              ) : (
                <>
                  <details className="studio-actions-menu">
                    <summary className="lesson-button lesson-button-outline">Cài đặt bài soạn</summary>
                    <div className="studio-actions-list">
                      <button className="lesson-button lesson-button-outline" onClick={() => { setStudioSubTab("director"); void handleFetchDirectorDraft(); }} disabled={!selectedRecord || isLoadingDirector}>
                        {isLoadingDirector ? "Đang tải kế hoạch..." : "Tải kế hoạch tổ chức"}
                      </button>
                  {selectedRecord?.status !== "approved" && (
                    <button className="lesson-button lesson-button-success" onClick={openApprovalModal}>
                      ✓ Phê duyệt nguồn học liệu
                    </button>
                  )}
                    </div>
                  </details>
                  <button
                    className="lesson-button lesson-button-primary"
                    disabled={!selectedRecord}
                    onClick={() => {
                      setCreatedSessionData(null);
                      setIsLaunchOpen(true);
                    }}
                  >
                    🚀 Khởi tạo phòng học
                  </button>
                </>
              )}
            </div>
          </div>

          {!selectedRecord && currentPackage && (
            <p className="play-notice-banner" role="status">
              Đây là bài mẫu chưa được lưu. Hãy chọn “Biên tập nội dung”, rồi lưu bản thảo trước khi tạo phòng học.
            </p>
          )}

          {isLoadingStudio ? (
            <p>Đang tải dữ liệu bài dạy...</p>
          ) : studioSubTab === "import" ? (
            /* Import Subtab */
            <div className="lesson-card">
              <div className="lesson-card-header">
                <h2 className="lesson-card-title">
                  📥 Nhập nguồn học liệu giáo án (.docx, .pdf, .md, .txt)
                </h2>
                <span className="lesson-badge lesson-badge-outline">Nhập học liệu</span>
              </div>
              <p className="task-muted-block" style={{ marginBottom: "1.25rem" }}>
                Tải lên tệp tài liệu nhị phân DOCX / PDF lưu trữ bền vững qua R2/D1 hoặc tệp Markdown / văn bản thuần túy. Trích xuất phân đoạn văn bản nguyên gốc, tính toán mã băm SHA-256 bảo đảm tính toàn vẹn và đối soát công thức toán học KaTeX. Hệ thống không tự ý sinh mục tiêu bài học (LO), nhiệm vụ, đáp án hay gọi AI/lưu trữ tự động.
              </p>

              {/* Opaque Source ID Lookup & Reload Bar */}
              <div className="lesson-source-lookup-bar" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Nhập mã nguồn học liệu để tải lại..."
                  value={sourceIdInput}
                  onChange={(e) => setSourceIdInput(e.target.value)}
                  className="lesson-input"
                  style={{ flex: "1 1 280px", maxWidth: "420px", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
                  disabled={isLoadingSource || isImporting}
                />
                <button
                  type="button"
                  className="lesson-button lesson-button-secondary"
                  disabled={!sourceIdInput.trim() || isLoadingSource || isImporting}
                  onClick={() => fetchSourceById(sourceIdInput.trim())}
                  style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                >
                  {isLoadingSource ? "⏳ Đang tải..." : "📥 Tải nguồn theo ID"}
                </button>
                {importSourceId && (
                  <button
                    type="button"
                    className="lesson-button lesson-button-outline"
                    disabled={isLoadingSource || isImporting}
                    onClick={() => fetchSourceById(importSourceId)}
                    style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    🔄 Tải lại nguồn hiện tại
                  </button>
                )}
                {importSourceId && importSourceStatus === "ready" && (
                  <button
                    type="button"
                    className="lesson-button lesson-button-primary"
                    disabled={isLoadingSource || isImporting}
                    onClick={() => void handleGenerateLessonProposal()}
                    style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    🎬 Tạo đề xuất tự động
                  </button>
                )}
              </div>

              {/* File input / dropzone */}
              <div
                className="lesson-import-dropzone"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".md,.txt,.docx,.pdf"
                  onChange={handleFileInputChange}
                />
                <div style={{ fontSize: "2rem" }}>📂</div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                  {importFile ? `Đã chọn tệp: ${importFile.name}` : "Nhấn để chọn tệp giáo án (.docx, .pdf, .md, .txt)"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--lesson-text-muted)" }}>
                  Hỗ trợ tài liệu nhị phân DOCX, PDF (tối đa 10 MiB) và Markdown (.md), văn bản thuần túy (.txt) &le; 128 KiB. Nguồn tài liệu được lưu trữ bền vững và phân tích an toàn.
                </div>
              </div>

              <div className="lesson-typed-brief">
                <label htmlFor="lesson-typed-brief"><strong>✍️ Hoặc gõ nội dung muốn dạy và yêu cầu</strong></label>
                <textarea
                  id="lesson-typed-brief"
                  className="lesson-textarea"
                  rows={6}
                  maxLength={60000}
                  value={typedBrief}
                  onChange={(e) => setTypedBrief(e.target.value)}
                  placeholder={[
                    "Ví dụ: Toán 11 KNTT, Bài 6 Cấp số cộng, mục 1–2. Tiết hình thành kiến thức 45 phút, lớp 30 em, mỗi em một máy.",
                    "Yêu cầu cần đạt: nhận biết cấp số cộng, tìm số hạng tổng quát u_n = u_1 + (n-1)d.",
                    "Muốn có: 1 bài toán thực tế mở đầu, 3 mức câu hỏi, 1 phiếu kiểm tra cuối giờ.",
                  ].join("\n")}
                  disabled={isImporting || isLoadingSource}
                />
                <button type="button" className="lesson-button lesson-button-primary" disabled={!typedBrief.trim() || isImporting || isLoadingSource} onClick={() => void importTypedBrief()}>
                  📥 Nhập nội dung đã gõ
                </button>
              </div>

              {(isImporting || isLoadingSource) && (
                <div className="task-status-banner task-status-pending" style={{ marginTop: "1rem" }}>
                  ⏳ {isLoadingSource ? "Đang truy xuất nguồn học liệu từ máy chủ..." : "Đang tải lên và phân tích nguồn học liệu..."}
                </div>
              )}

              {importError && (
                <div className="task-status-banner task-status-failed" style={{ marginTop: "1rem" }}>
                  ✕ {importError}
                </div>
              )}

              {importProposal && (
                <div className="lesson-section-box" style={{ marginTop: "1.25rem", borderColor: "var(--lesson-primary)" }}>
                  <div className="lesson-card-header">
                    <h3 className="lesson-card-title">🎬 Đề xuất tổ chức tiết học</h3>
                    <span className="lesson-badge lesson-badge-warning">Cần rà soát</span>
                  </div>
                  <p className="task-muted-block">
                    Đề xuất được tính từ bản trích xuất và mã băm nguồn. Chưa sinh đáp án, chưa cấp mục tiêu chính thức, chưa mở phòng chính thức.
                  </p>
                  <div className="lesson-import-meta-grid">
                    <div className="lesson-import-meta-card"><label>Môn / lớp / chủ đề</label><div className="lesson-import-meta-value">{getTeacherDisplay(importProposal.detection.subject)} · {importProposal.detection.grade || "chưa xác định"} · {importProposal.detection.topic}</div></div>
                    <div className="lesson-import-meta-card"><label>Độ tin cậy nhận diện</label><div className="lesson-import-meta-value">{Math.round(importProposal.detection.confidence * 100)}%</div></div>
                    <div className="lesson-import-meta-card"><label>Bản đồ / luật / hình thức</label><div className="lesson-import-meta-value">{getThemeDisplay(importProposal.recommendation.map)} · {getRuleDisplay(importProposal.recommendation.rule)} · {getParticipationDisplay(importProposal.recommendation.participation)}</div></div>
                    <div className="lesson-import-meta-card"><label>Tổng thời lượng đề xuất</label><div className="lesson-import-meta-value">{importProposal.proposedActivities.reduce((sum, activity) => sum + activity.minutes, 0)} phút</div></div>
                  </div>
                  <ol className="lesson-checklist" style={{ marginTop: "0.75rem" }}>
                    {importProposal.proposedActivities.map((activity) => (
                      <li key={activity.id} className="lesson-check-item">
                        <strong>{getPhaseDisplay(activity.phase)}</strong> · {activity.minutes} phút · {getParticipationDisplay(activity.participation)} — {activity.purpose}
                      </li>
                    ))}
                  </ol>
                  {importProposal.uncertainties.length > 0 && (
                    <div className="task-status-banner task-status-pending" style={{ marginTop: "0.75rem" }}>
                      Cần rà soát: {importProposal.uncertainties.join(", ")}
                    </div>
                  )}
                  <div className="lesson-inline-actions" style={{ marginTop: "0.85rem" }}>
                    <label>Môn <select className="lesson-select" value={generationSettings.subject} disabled={isStartingGeneration} onChange={event => { setGenerationConsentKey(""); setGenerationSettings({ ...generationSettings, subject: event.target.value }); }}><option value="math">Toán</option><option value="literature">Ngữ văn</option><option value="english">Tiếng Anh</option></select></label>
                    <label>Lớp <select className="lesson-select" value={generationSettings.grade} disabled={isStartingGeneration} onChange={event => { setGenerationConsentKey(""); setGenerationSettings({ ...generationSettings, grade: Number(event.target.value) }); }}><option value={10}>10</option><option value={11}>11</option><option value={12}>12</option></select></label>
                    <label>Phút <input className="lesson-input" type="number" min={1} max={240} value={generationSettings.slotMinutes} disabled={isStartingGeneration} onChange={event => { setGenerationConsentKey(""); setGenerationSettings({ ...generationSettings, slotMinutes: Number(event.target.value) }); }} /></label>
                    <button
                      type="button"
                      className="lesson-button lesson-button-primary"
                      disabled={isStartingGeneration || !aiConsentKey || generationConsentKey !== aiConsentKey || ["queued", "running"].includes(generationJob?.status || "")}
                      onClick={() => void handleStartAIGeneration()}
                    >
                      {isStartingGeneration ? "Đang tạo bản nháp..." : ["failed", "needs_review", "interrupted"].includes(generationJob?.status || "") ? "Tạo bản khác bằng AI" : "Tạo bản nháp bằng AI"}
                    </button>
                    {generationJob?.sourceId === importSourceId && (
                      <span className="lesson-badge lesson-badge-outline">
                        {getTeacherDisplay(generationJob.status) + (generationJob.errorCode ? " · " + generationJob.errorCode : "")}
                      </span>
                    )}
                    {generationJob?.sourceId === importSourceId && generationJob.status === "needs_review" && generationJob.result?.package && (
                      <button type="button" className="lesson-button lesson-button-success" onClick={handleApplyGenerationResult}>
                        Mở bản nháp trong biểu mẫu
                      </button>
                    )}
                  </div>
                  <LessonAIConsentPanel providerHost={generationProviderHost} extraction={generationExtraction} settings={generationSettings}
                    confirmed={Boolean(aiConsentKey && generationConsentKey === aiConsentKey)} disabled={!aiConsentKey || isStartingGeneration}
                    onChange={confirmed => setGenerationConsentKey(confirmed ? aiConsentKey : "")} />
                  {generationJob?.status === "failed" && (
                    <div className="task-status-banner task-status-failed" style={{ marginTop: "0.75rem" }}>
                      AI chưa tạo được bản nháp: {generationJob.errorCode || "AI_GENERATION_FAILED"}. Nguồn gốc vẫn giữ nguyên.
                    </div>
                  )}
                  {generationJob?.status === "interrupted" && (
                    <div className="task-status-banner task-status-pending" style={{ marginTop: "0.75rem" }}>
                      Lượt tạo bản nháp bị gián đoạn; kết quả không rõ nên không tự chạy lại. Tạo lượt mới sau khi kiểm tra cấu hình AI.
                    </div>
                  )}
                  <p className="task-muted-block" style={{ marginBottom: 0 }}>
                    Bước tiếp: đối soát nguồn, bổ sung mục tiêu, nhiệm vụ, cách chấm và gợi ý trong biểu mẫu; lưu bản thảo rồi mới lấy kế hoạch tổ chức. AI không tự duyệt.
                  </p>
                </div>
              )}

              {/* Unsupported Capability Notice */}
              {unsupportedInfo && (
                <div className="lesson-unsupported-box" style={{ marginTop: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                    <strong style={{ color: "#ef4444" }}>
                      Định dạng chưa được hỗ trợ trích xuất nhị phân: {unsupportedInfo.format?.toUpperCase() || "DOCX/PDF"}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>
                    {unsupportedInfo.message}
                  </p>
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "0.75rem 1rem", borderRadius: "4px", fontSize: "0.85rem" }}>
                    <strong>Phương án dự phòng thủ công:</strong>
                    <p style={{ margin: "0.25rem 0 0 0" }}>
                      Mở tệp {unsupportedInfo.format?.toUpperCase()}, sao chép toàn bộ nội dung văn bản và lưu thành tệp <code>.md</code> hoặc <code>.txt</code> rồi nhập lại để hệ thống bảo toàn mã băm và các chỉ số trích xuất.
                    </p>
                  </div>
                </div>
              )}

              {/* Extraction Preview */}
              {importExtraction && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div className="lesson-card-header" style={{ borderBottom: "1px solid var(--lesson-border)", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                      📄 Kết quả trích xuất nguồn
                    </h3>
                    <span className="lesson-badge lesson-badge-warning">
                      needs_review
                    </span>
                  </div>

                  {/* Meta Grid */}
                  <div className="lesson-import-meta-grid" style={{ marginTop: "1rem" }}>
                    {importSourceId && (
                      <div className="lesson-import-meta-card" style={{ gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div>
                            <label>Mã nguồn học liệu</label>
                            <div className="director-hash-code">{importSourceId}</div>
                          </div>
                          <button
                            type="button"
                            className="lesson-button lesson-button-outline"
                            style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                            onClick={() => fetchSourceById(importSourceId)}
                            disabled={isLoadingSource || isImporting}
                          >
                            🔄 Tải lại nguồn
                          </button>
                        </div>
                      </div>
                    )}
                    {generationJob?.status === "needs_review" && generationJob.result?.validation?.ok === false && (
                      <div className="task-status-banner task-status-failed" style={{ marginTop: "0.75rem" }}>
                        Bản nháp AI cần sửa {generationJob.result.validation.errors?.length || 0} lỗi trước khi lưu.
                        <ul style={{ margin: "0.4rem 0 0 1rem" }}>
                          {(generationJob.result.validation.errors || []).slice(0, 8).map((issue, index) => <li key={index}><code>{issue.code || "VALIDATION"}</code>: {issue.message || "Cần rà soát"}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="lesson-import-meta-card">
                      <label>Tên tệp nguồn</label>
                      <div className="lesson-import-meta-value">{importExtraction.originalName}</div>
                    </div>
                    <div className="lesson-import-meta-card">
                      <label>Định dạng</label>
                      <div className="lesson-import-meta-value">{importExtraction.kind.toUpperCase()}</div>
                    </div>
                    <div className="lesson-import-meta-card">
                      <label>Dung lượng UTF-8</label>
                      <div className="lesson-import-meta-value">{importExtraction.bytes} bytes</div>
                    </div>
                    {importSourceStatus && (
                      <div className="lesson-import-meta-card">
                        <label>Trạng thái lưu trữ</label>
                        <div className="lesson-import-meta-value">
                          <span className={`lesson-badge ${importSourceStatus === "ready" ? "lesson-badge-success" : "lesson-badge-warning"}`}>
                            {getTeacherDisplay(importSourceStatus)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="lesson-import-meta-card" style={{ gridColumn: "1 / -1" }}>
                      <label>Mã băm toàn vẹn SHA-256</label>
                      <div className="director-hash-code">{importExtraction.sha256}</div>
                    </div>
                  </div>

                  {/* Uncertainties */}
                  <div className="lesson-section-box">
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                      ⚠️ Bất định công thức & cấu trúc ({importExtraction.uncertainties.length})
                    </h4>
                    {importExtraction.uncertainties.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--lesson-success)" }}>
                        ✓ Không phát hiện bất định cú pháp công thức toán hay khối rào mã.
                      </p>
                    ) : (
                      <div>
                        {importExtraction.uncertainties.map((unc, idx) => {
                          const uncTitle = unc.code || unc.kind || unc.type || "Cảnh báo bất định";
                          const uncLocation = (unc.pageNumber || unc.page)
                            ? `Trang ${unc.pageNumber || unc.page}${unc.line ? ` · Dòng ${unc.line}` : ""}${unc.segmentId ? ` · Phân đoạn: ${unc.segmentId}` : ""}`
                            : `Dòng ${unc.line || "?"} · Phân đoạn: ${unc.segmentId || "?"}`;
                          const uncDesc = unc.message || (unc.code === "OCR_REQUIRED" ? "Tài liệu chứa trang quét hình ảnh cần xử lý nhận diện ký tự (OCR)." : unc.code || "Phát hiện bất định");
                          return (
                            <div key={unc.id || `${unc.code || unc.kind || "unc"}-${idx}`} className="lesson-uncertainty-item">
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                <strong>{uncTitle}</strong>
                                <span className="task-muted-block">{uncLocation}</span>
                              </div>
                              <div style={{ fontSize: "0.85rem" }}>{uncDesc}</div>
                              {unc.raw && (
                                <pre style={{ margin: "0.35rem 0 0 0", padding: "0.25rem 0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "3px", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                                  {unc.raw}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Segments & Source Spans */}
                  <div className="lesson-section-box">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
                        📑 Phân đoạn trích xuất và vị trí nguồn ({importExtraction.segments.length})
                      </h4>
                      <span className="task-muted-block" style={{ fontSize: "0.8rem" }}>
                        Giữ nguyên văn bản gốc, không tự suy diễn
                      </span>
                    </div>
                    <div className="lesson-segment-list">
                      {importExtraction.segments.map((seg, idx) => (
                        <div key={seg.id || `seg-${idx}`} className="lesson-segment-card">
                          <div className="lesson-segment-card-header">
                            <div>
                              <span className="lesson-badge lesson-badge-outline" style={{ marginRight: "0.5rem" }}>
                                {getTeacherDisplay(seg.kind)}
                              </span>
                              <strong>{seg.id || `seg-${idx + 1}`}</strong>
                            </div>
                            <span className="task-muted-block" style={{ fontSize: "0.8rem" }}>
                              {seg.pageNumber ? `Trang ${seg.pageNumber} · ` : ""}Dòng {seg.lineStart}&ndash;{seg.lineEnd} · Ký tự [{seg.start}..{seg.end}] ({seg.end - seg.start} ký tự)
                            </span>
                          </div>
                          <div className="lesson-segment-text-preview">
                            {seg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Action: Tạo bản nháp có nguồn cần duyệt */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.25rem", padding: "1rem", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "var(--lesson-radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <strong style={{ color: "var(--lesson-primary)", display: "block" }}>
                          Tạo bản nháp có nguồn cần duyệt
                        </strong>
                        <small className="task-muted-block">
                          Khởi tạo bản thảo bài dạy với câu hỏi cốt lõi trích xuất, giữ trạng thái nguồn cần duyệt (needs_review), không tự sinh chuẩn đầu ra (LO) hay nhiệm vụ.
                        </small>
                      </div>
                      <button
                        type="button"
                        className="lesson-button lesson-button-primary"
                        onClick={handleUseExtractionForDraft}
                      >
                        Dùng nội dung để soạn bản nháp thủ công
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : currentPackage ? (
            studioSubTab === "edit" && editedPackage ? (
              /* Typed Editing Form (No raw JSON textarea required) */
              <div className="lesson-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <h2 className="lesson-card-title" style={{ margin: 0 }}>
                      Biên tập bài dạy
                    </h2>
                    <small className="task-muted-block">
                      Thiết lập mục tiêu, hoạt động, nhiệm vụ, đáp án và minh chứng bằng biểu mẫu có cấu trúc theo chuẩn kiểm định.
                    </small>
                  </div>
                  <div className="lesson-inline-actions">
                    <button type="button" className="lesson-button lesson-button-primary" disabled={isSavingDraft} onClick={handleSaveDraft}>
                      💾 Lưu bản thảo
                    </button>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      onClick={() => {
                        const activities = editedPackage.activities || [];
                        const coreSum = activities
                          .filter((a) => a.budgetRole === "core")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const reserveSum = activities
                          .filter((a) => a.budgetRole === "reserve")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const optionalSum = activities
                          .filter((a) => a.budgetRole === "optional")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        setEditedPackage({
                          ...editedPackage,
                          budget: {
                            slotMinutes: editedPackage.budget?.slotMinutes || 40,
                            coreMinutes: coreSum,
                            reserveMinutes: reserveSum,
                            optionalMinutes: optionalSum,
                            transitionMinutes: editedPackage.budget?.transitionMinutes || 0,
                          },
                        });
                      }}
                    >
                      ⏱️ Tự động tính thời lượng
                    </button>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      onClick={() => {
                        setEditedPackage(syncPackageBidirectionalLinks(editedPackage));
                      }}
                    >
                      🔗 Đồng bộ liên kết
                    </button>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      onClick={() => setStudioSubTab("preview")}
                    >
                      👁️ Xem trước
                    </button>
                  </div>
                </div>

                {/* Validation Errors Banner */}
                {mappingError && <p role="alert" className="task-status-error">{mappingError}</p>}
                {draftErrors.length > 0 && (
                  <div className="task-status-banner task-status-error" role="alert" style={{ marginBottom: "1.5rem" }}>
                    <strong>✕ Chưa thể lưu bản thảo. Vui lòng khắc phục các điểm không hợp lệ sau:</strong>
                    <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                      {draftErrors.map((error, index) => (
                        <li key={index} style={{ marginBottom: "0.25rem" }}>
                          <code>{error.path}</code>: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 1. Essential Question & Basic Info */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">📌 Thông tin cơ bản & Câu hỏi cốt lõi</h3>
                  </div>
                  <div className="lesson-field-group">
                    <label>Câu hỏi cốt lõi bài học:</label>
                    <textarea
                      rows={2}
                      className="lesson-textarea"
                      value={editedPackage.essentialQuestion || ""}
                      onChange={(e) =>
                        setEditedPackage({ ...editedPackage, essentialQuestion: e.target.value })
                      }
                      placeholder="Nhập câu hỏi cốt lõi hoặc định hướng bài học..."
                    />
                    {editedPackage.essentialQuestion && (
                      <div style={{ marginTop: "0.4rem" }}>
                        <small className="task-muted-block">Xem trước hiển thị KaTeX:</small>
                        <MathText text={editedPackage.essentialQuestion} />
                      </div>
                    )}
                  </div>
                  <div className="lesson-form-grid-3">
                    <div className="lesson-field-group">
                      <label>Môn học:</label>
                      <input
                        type="text"
                        className="lesson-input"
                        value={editedPackage.subject || "math"}
                        onChange={(e) => setEditedPackage({ ...editedPackage, subject: e.target.value })}
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Khối lớp:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.grade || 11}
                        onChange={(e) => setEditedPackage({ ...editedPackage, grade: parseInt(e.target.value, 10) || 11 })}
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Phiên bản:</label>
                      <input
                        type="text"
                        className="lesson-input"
                        value={editedPackage.version || "1.0.0-draft"}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Source References & Extraction Locations Viewer */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">📚 Nguồn trích dẫn và phân đoạn gốc</h3>
                  </div>
                  {(editedPackage.sourceRefs || []).length === 0 ? (
                    <p className="task-muted-block" style={{ fontSize: "0.85rem" }}>Chưa có nguồn học liệu.</p>
                  ) : (
                    <div className="lesson-meta-list" style={{ marginBottom: "1rem" }}>
                      {(editedPackage.sourceRefs || []).map((src) => (
                        <div key={src.id} className="lesson-meta-item">
                          <div>
                            <strong>{src.id}</strong>: {src.label} <code>({src.locator})</code>
                          </div>
                          <span
                            className={`lesson-badge ${
                              src.verification === "verified" || src.verification === "approved"
                                ? "lesson-badge-success"
                                : "lesson-badge-warning"
                            }`}
                          >
                            {getTeacherDisplay(src.verification)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {importExtraction && (
                    <details style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--lesson-border)", borderRadius: "var(--lesson-radius-sm)", padding: "0.75rem" }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--lesson-primary)" }}>
                        📑 Xem các đoạn trích xuất gốc & Khoảng nguồn ({importExtraction.segments.length} phân đoạn)
                      </summary>
                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ fontSize: "0.825rem", color: "var(--lesson-text-muted)", marginBottom: "0.5rem" }}>
                          Tệp: <strong>{importExtraction.originalName}</strong> (SHA: <code>{importExtraction.sha256.slice(0, 16)}...</code>, {importExtraction.bytes} bytes)
                        </div>
                        {importExtraction.uncertainties.length > 0 && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            {importExtraction.uncertainties.map((u, idx) => (
                              <div key={u.id || `${u.code || u.kind || "u"}-${idx}`} className="lesson-uncertainty-item">
                                <strong>{(u.pageNumber || u.page) ? `Trang ${u.pageNumber || u.page}` : `Dòng ${u.line || "?"}`} [{u.code || u.kind || u.type || "Bất định"}]:</strong> {u.message || u.code || "Bất định trích xuất"}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="lesson-segment-list">
                          {importExtraction.segments.map((seg, idx) => (
                            <div key={seg.id || `seg-${idx}`} className="lesson-segment-card">
                              <div className="lesson-segment-card-header">
                                <div>
                                  <span className="lesson-badge" style={{ marginRight: "0.5rem" }}>{getTeacherDisplay(seg.kind)}</span>
                                  <strong>{seg.id || `seg-${idx + 1}`}</strong>
                                </div>
                                <span className="task-muted-block" style={{ fontSize: "0.75rem" }}>
                                  {seg.pageNumber ? `Trang ${seg.pageNumber} · ` : ""}Dòng {seg.lineStart}&ndash;{seg.lineEnd} · Ký tự [{seg.start}..{seg.end}]
                                </span>
                              </div>
                              <pre className="lesson-extraction-segment-text">{seg.text}</pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>

                {/* 3. Time Budget Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">⏱️ Phân bổ thời lượng</h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const activities = editedPackage.activities || [];
                        const coreSum = activities
                          .filter((a) => a.budgetRole === "core")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const reserveSum = activities
                          .filter((a) => a.budgetRole === "reserve")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const optionalSum = activities
                          .filter((a) => a.budgetRole === "optional")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        setEditedPackage({
                          ...editedPackage,
                          budget: {
                            slotMinutes: editedPackage.budget?.slotMinutes || 40,
                            coreMinutes: coreSum,
                            reserveMinutes: reserveSum,
                            optionalMinutes: optionalSum,
                            transitionMinutes: editedPackage.budget?.transitionMinutes || 0,
                          },
                        });
                      }}
                    >
                      Đồng bộ từ các hoạt động
                    </button>
                  </div>

                  <div className="lesson-form-grid">
                    <div className="lesson-field-group">
                      <label>Tổng tiết học:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.budget?.slotMinutes ?? 40}
                        onChange={(e) =>
                          setEditedPackage({
                            ...editedPackage,
                            budget: { ...editedPackage.budget, slotMinutes: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Cốt lõi:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.budget?.coreMinutes ?? 0}
                        onChange={(e) =>
                          setEditedPackage({
                            ...editedPackage,
                            budget: { ...editedPackage.budget, coreMinutes: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Dự phòng:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.budget?.reserveMinutes ?? 0}
                        onChange={(e) =>
                          setEditedPackage({
                            ...editedPackage,
                            budget: { ...editedPackage.budget, reserveMinutes: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Chuyển giao:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.budget?.transitionMinutes ?? 0}
                        onChange={(e) =>
                          setEditedPackage({
                            ...editedPackage,
                            budget: { ...editedPackage.budget, transitionMinutes: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="lesson-field-group">
                      <label>Tùy chọn:</label>
                      <input
                        type="number"
                        className="lesson-input"
                        value={editedPackage.budget?.optionalMinutes ?? 0}
                        onChange={(e) =>
                          setEditedPackage({
                            ...editedPackage,
                            budget: { ...editedPackage.budget, optionalMinutes: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                  </div>

                  {(() => {
                    const acts = editedPackage.activities || [];
                    const coreSum = acts.filter((a) => a.budgetRole === "core").reduce((s, a) => s + (Number(a.minutes) || 0), 0);
                    const reserveSum = acts.filter((a) => a.budgetRole === "reserve").reduce((s, a) => s + (Number(a.minutes) || 0), 0);
                    const declaredCore = editedPackage.budget?.coreMinutes ?? 0;
                    const declaredReserve = editedPackage.budget?.reserveMinutes ?? 0;
                    const declaredOptional = editedPackage.budget?.optionalMinutes ?? 0;
                    const declaredSlot = editedPackage.budget?.slotMinutes ?? 40;
                    const declaredTransition = editedPackage.budget?.transitionMinutes ?? 0;
                    const totalDeclared = declaredCore + declaredReserve + declaredOptional + declaredTransition;
                    const isCoreMatch = declaredCore === coreSum;
                    const isReserveMatch = declaredReserve === reserveSum;
                    const isSlotOk = totalDeclared <= declaredSlot;

                    return (
                      <div className="lesson-budget-summary">
                        <span>
                          Tổng phân bổ: <strong>{totalDeclared}</strong> / {declaredSlot} phút
                        </span>
                        <span className={`lesson-badge ${isCoreMatch ? "lesson-badge-success" : "lesson-badge-warning"}`}>
                          Cốt lõi: {declaredCore}p (hoạt động: {coreSum}p) {isCoreMatch ? "✓" : "≠"}
                        </span>
                        <span className={`lesson-badge ${isReserveMatch ? "lesson-badge-success" : "lesson-badge-warning"}`}>
                          Dự phòng: {declaredReserve}p (hoạt động: {reserveSum}p) {isReserveMatch ? "✓" : "≠"}
                        </span>
                        {!isSlotOk && (
                          <span className="lesson-badge lesson-badge-danger">
                            ✕ Tổng khai báo ({totalDeclared}p) vượt quá slot ({declaredSlot}p)
                          </span>
                        )}
                        {isCoreMatch && isReserveMatch && isSlotOk && (
                          <span className="lesson-badge lesson-badge-success">✓ Ngân sách thời lượng hợp lệ</span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Objectives Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">
                      🎯 Chuẩn đầu ra cần đạt ({(editedPackage.objectives || []).length})
                    </h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const nextIdx = (editedPackage.objectives || []).length + 1;
                        const newObj: LessonObjective = {
                          id: `obj-${nextIdx}`,
                          code: "",
                          level: "must",
                          statement: "",
                          prerequisiteIds: [],
                        };
                        setEditedPackage({
                          ...editedPackage,
                          objectives: [...(editedPackage.objectives || []), newObj],
                        });
                      }}
                    >
                      + Thêm chuẩn đầu ra (LO)
                    </button>
                  </div>

                  {(editedPackage.objectives || []).length === 0 && (
                    <div className="task-status-banner task-status-pending">
                      ⚠️ <strong>Chưa có chuẩn đầu ra.</strong> Vui lòng nhấn &ldquo;+ Thêm chuẩn đầu ra (LO)&rdquo; để thiết lập mục tiêu bài học (không tự suy diễn bằng AI).
                    </div>
                  )}

                  {(editedPackage.objectives || []).map((obj, idx) => (
                    <div key={obj.id} className="lesson-form-card">
                      <div className="lesson-form-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong>#{idx + 1}: {obj.code || obj.id}</strong>
                          <span className={`lesson-badge ${obj.level === "must" ? "lesson-badge-primary" : "lesson-badge-outline"}`}>
                            {getTeacherDisplay(obj.level)}
                          </span>
                          <code>({obj.id})</code>
                        </div>
                        <button
                          type="button"
                          className="lesson-button lesson-button-outline"
                          style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", color: "var(--lesson-danger)" }}
                          onClick={() => {
                            const nextObjs = (editedPackage.objectives || []).filter((_, i) => i !== idx);
                            setEditedPackage({ ...editedPackage, objectives: nextObjs });
                          }}
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="lesson-form-grid-3">
                        <div className="lesson-field-group">
                          <label>Mã định danh (ID):</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={obj.id}
                            onChange={(e) => {
                              const next = [...(editedPackage.objectives || [])];
                              next[idx] = { ...next[idx], id: e.target.value };
                              setEditedPackage({ ...editedPackage, objectives: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Mã chuẩn:</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={obj.code || ""}
                            placeholder="Ví dụ: T11.18, T11.19"
                            onChange={(e) => {
                              const next = [...(editedPackage.objectives || [])];
                              next[idx] = { ...next[idx], code: e.target.value };
                              setEditedPackage({ ...editedPackage, objectives: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Mức độ:</label>
                          <select
                            className="lesson-select"
                            value={obj.level}
                            onChange={(e) => {
                              const next = [...(editedPackage.objectives || [])];
                              next[idx] = { ...next[idx], level: e.target.value };
                              setEditedPackage({ ...editedPackage, objectives: next });
                            }}
                          >
                            <option value="must">Bắt buộc phải đạt</option>
                            <option value="should">Nên đạt</option>
                            <option value="could">Có thể mở rộng</option>
                          </select>
                        </div>
                      </div>

                      <div className="lesson-field-group">
                        <label>Nội dung chuẩn đầu ra:</label>
                        <textarea
                          rows={2}
                          className="lesson-textarea"
                          value={obj.statement || ""}
                          placeholder="Mô tả cụ thể yêu cầu cần đạt kèm công thức KaTeX nếu có..."
                          onChange={(e) => {
                            const next = [...(editedPackage.objectives || [])];
                            next[idx] = { ...next[idx], statement: e.target.value };
                            setEditedPackage({ ...editedPackage, objectives: next });
                          }}
                        />
                        {obj.statement && (
                          <div style={{ marginTop: "0.3rem" }}>
                            <MathText text={obj.statement} />
                          </div>
                        )}
                      </div>

                      <div className="lesson-field-group">
                        <label>Chuẩn tiên quyết:</label>
                        {([['requiresFiniteInfiniteDistinction', 'Yêu cầu phân biệt dãy hữu hạn và vô hạn'], ['requiresRepresentations', 'Yêu cầu đủ bốn cách biểu diễn']] as const).map(([field, label]) => (
                          <label key={field} className="lesson-checkbox-label">
                            <input type="checkbox" checked={Boolean(obj[field])} onChange={(e) => {
                              const next = [...(editedPackage.objectives || [])];
                              next[idx] = { ...obj, [field]: e.target.checked };
                              setEditedPackage({ ...editedPackage, objectives: next });
                            }} />{label}
                          </label>
                        ))}
                        <div className="lesson-checkbox-group">
                          {(editedPackage.objectives || [])
                            .filter((other) => other.id !== obj.id)
                            .map((other) => {
                              const checked = (obj.prerequisiteIds || []).includes(other.id);
                              return (
                                <label key={other.id} className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.objectives || [])];
                                      const curr = new Set(obj.prerequisiteIds || []);
                                      if (e.target.checked) curr.add(other.id);
                                      else curr.delete(other.id);
                                      next[idx] = { ...next[idx], prerequisiteIds: Array.from(curr) };
                                      setEditedPackage({ ...editedPackage, objectives: next });
                                    }}
                                  />
                                  <span>{other.code || other.id}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5. Activities Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">
                      📋 Hoạt động dạy học (Activities) ({(editedPackage.activities || []).length})
                    </h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const nextIdx = (editedPackage.activities || []).length + 1;
                        const newAct: LessonActivity = {
                          id: `act-${nextIdx}`,
                          phase: "formation",
                          budgetRole: "core",
                          minutes: 5,
                          participation: "individual",
                          studentAction: "",
                          expectedProduct: "",
                          teacherLookFor: "",
                          objectiveIds: [],
                          taskIds: [],
                          evidenceIds: [],
                        };
                        setEditedPackage({
                          ...editedPackage,
                          activities: [...(editedPackage.activities || []), newAct],
                        });
                      }}
                    >
                      + Thêm hoạt động
                    </button>
                  </div>

                  {(editedPackage.activities || []).length === 0 && (
                    <div className="task-status-banner task-status-pending">
                      ⚠️ <strong>Chưa có hoạt động bài dạy.</strong> Vui lòng nhấn &ldquo;+ Thêm hoạt động&rdquo; để thiết lập tiến trình thời lượng và hành động của học sinh.
                    </div>
                  )}

                  {(editedPackage.activities || []).map((act, idx) => (
                    <div key={act.id} className="lesson-form-card">
                      <div className="lesson-form-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong>#{idx + 1}: {getPhaseDisplay(act.phase)}</strong>
                          <span className={`lesson-badge ${act.budgetRole === "core" ? "lesson-badge-primary" : "lesson-badge-warning"}`}>
                            {getTeacherDisplay(act.budgetRole)} ({act.minutes} phút)
                          </span>
                          <code>({act.id})</code>
                        </div>
                        <button
                          type="button"
                          className="lesson-button lesson-button-outline"
                          style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", color: "var(--lesson-danger)" }}
                          onClick={() => {
                            const next = (editedPackage.activities || []).filter((_, i) => i !== idx);
                            setEditedPackage({ ...editedPackage, activities: next });
                          }}
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="lesson-form-grid-4">
                        <div className="lesson-field-group">
                          <label>Mã (ID):</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={act.id}
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], id: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Pha tiến trình:</label>
                          <select
                            className="lesson-select"
                            value={act.phase}
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], phase: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          >
                            <option value="experience">Khởi động</option>
                            <option value="guided">Khám phá có hướng dẫn</option>
                            <option value="formation">Hình thành kiến thức</option>
                            <option value="practice">Luyện tập</option>
                            <option value="recheck">Kiểm tra độc lập</option>
                            <option value="exit">Vé ra cửa</option>
                            <option value="reflection">Phản tư/dự phòng</option>
                          </select>
                        </div>
                        <div className="lesson-field-group">
                          <label>Vai trò ngân sách:</label>
                          <select
                            className="lesson-select"
                            value={act.budgetRole || "core"}
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], budgetRole: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          >
                            <option value="core">Cốt lõi</option>
                            <option value="reserve">Dự phòng</option>
                            <option value="optional">Tùy chọn</option>
                          </select>
                        </div>
                        <div className="lesson-field-group">
                          <label>Thời lượng (phút):</label>
                          <input
                            type="number"
                            className="lesson-input"
                            value={act.minutes ?? 0}
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], minutes: parseInt(e.target.value, 10) || 0 };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          />
                        </div>
                      </div>

                      <div className="lesson-form-grid">
                        <div className="lesson-field-group">
                          <label>Hình thức tham gia:</label>
                          <select
                            className="lesson-select"
                            value={act.participation || "individual"}
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], participation: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          >
                            <option value="individual">Cá nhân độc lập</option>
                            <option value="whole_class">Cả lớp</option>
                            <option value="pair">Cặp đôi</option>
                            <option value="group">Nhóm</option>
                          </select>
                        </div>
                        <div className="lesson-field-group">
                          <label>Chuyển giao:</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={act.transition || ""}
                            placeholder="Lời dẫn chuyển pha..."
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], transition: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          />
                        </div>
                      </div>

                      <div className="lesson-field-group">
                        <label>Hành động của học sinh:</label>
                        <textarea
                          rows={2}
                          className="lesson-textarea"
                          value={act.studentAction || ""}
                          placeholder="Mô tả cụ thể hoạt động học sinh thực hiện..."
                          onChange={(e) => {
                            const next = [...(editedPackage.activities || [])];
                            next[idx] = { ...next[idx], studentAction: e.target.value };
                            setEditedPackage({ ...editedPackage, activities: next });
                          }}
                        />
                        {act.studentAction && (
                          <div style={{ marginTop: "0.3rem" }}>
                            <MathText text={act.studentAction} />
                          </div>
                        )}
                      </div>

                      <div className="lesson-form-grid">
                        <div className="lesson-field-group">
                          <label>Sản phẩm dự kiến:</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={act.expectedProduct || ""}
                            placeholder="Sản phẩm đầu ra của học sinh..."
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], expectedProduct: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Giáo viên quan sát:</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={act.teacherLookFor || ""}
                            placeholder="Dấu hiệu tư duy giáo viên cần đối soát..."
                            onChange={(e) => {
                              const next = [...(editedPackage.activities || [])];
                              next[idx] = { ...next[idx], teacherLookFor: e.target.value };
                              setEditedPackage({ ...editedPackage, activities: next });
                            }}
                          />
                        </div>
                      </div>

                      {/* Objective & Task Linkages */}
                      <div className="lesson-form-grid">
                        <div className="lesson-field-group">
                          <label>Chuẩn đầu ra liên kết:</label>
                          <div className="lesson-checkbox-group">
                            {(editedPackage.objectives || []).map((o) => {
                              const checked = (act.objectiveIds || []).includes(o.id);
                              return (
                                <label key={o.id} className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.activities || [])];
                                      const curr = new Set(act.objectiveIds || []);
                                      if (e.target.checked) curr.add(o.id);
                                      else curr.delete(o.id);
                                      next[idx] = { ...next[idx], objectiveIds: Array.from(curr) };
                                      setEditedPackage({ ...editedPackage, activities: next });
                                    }}
                                  />
                                  <span>{o.code || o.id}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="lesson-field-group">
                          <label>Nhiệm vụ trực thuộc:</label>
                          <div className="lesson-checkbox-group">
                            {(editedPackage.tasks || []).map((t) => {
                              const checked = (act.taskIds || []).includes(t.id);
                              return (
                                <label key={t.id} className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextActs = [...(editedPackage.activities || [])];
                                      const currTaskIds = new Set(act.taskIds || []);
                                      const nextTasks = [...(editedPackage.tasks || [])];
                                      const targetTaskIdx = nextTasks.findIndex((task) => task.id === t.id);

                                      if (e.target.checked) {
                                        currTaskIds.add(t.id);
                                        if (targetTaskIdx >= 0) nextTasks[targetTaskIdx] = { ...nextTasks[targetTaskIdx], activityId: act.id };
                                      } else {
                                        currTaskIds.delete(t.id);
                                        if (targetTaskIdx >= 0 && nextTasks[targetTaskIdx].activityId === act.id) {
                                          nextTasks[targetTaskIdx] = { ...nextTasks[targetTaskIdx], activityId: "" };
                                        }
                                      }
                                      nextActs[idx] = { ...nextActs[idx], taskIds: Array.from(currTaskIds) };
                                      setEditedPackage({ ...editedPackage, activities: nextActs, tasks: nextTasks });
                                    }}
                                  />
                                  <span>{t.id}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 6. Tasks Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">
                      📝 Nhiệm vụ học tập và đánh giá ({(editedPackage.tasks || []).length})
                    </h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const nextIdx = (editedPackage.tasks || []).length + 1;
                        const defaultAct = (editedPackage.activities || [])[0]?.id || "";
                        const defaultObj = (editedPackage.objectives || [])[0]?.id;
                        const newTask: LessonTask = {
                          id: `task-${nextIdx}`,
                          type: "closed",
                          activityId: defaultAct,
                          objectiveIds: defaultObj ? [defaultObj] : [],
                          participation: "individual",
                          branch: "shared",
                          minutes: 3,
                          prompt: "",
                          isCore: true,
                          requiresFullScaffold: false,
                          supportRationale: "Nhiệm vụ rèn luyện trực tiếp kiến thức trọng tâm.",
                          sourceRefs: (editedPackage.sourceRefs || []).map((source) => source.id),
                          evaluation: {
                            checkerId: "choice_exact",
                            options: ["opt_1", "opt_2"],
                            answerKey: "",
                          },
                          inputSchema: {
                            options: [
                              { id: "opt_1", label: "Phương án A" },
                              { id: "opt_2", label: "Phương án B" },
                            ],
                          },
                        };
                        setEditedPackage({
                          ...editedPackage,
                          tasks: [...(editedPackage.tasks || []), newTask],
                        });
                      }}
                    >
                      + Thêm nhiệm vụ
                    </button>
                  </div>

                  {(editedPackage.tasks || []).length === 0 && (
                    <div className="task-status-banner task-status-pending">
                      ⚠️ <strong>Chưa có nhiệm vụ học tập.</strong> Nhấn &ldquo;+ Thêm nhiệm vụ&rdquo; để thêm các câu hỏi trắc nghiệm, tự luận hoặc phản tư.
                    </div>
                  )}

                  {(editedPackage.tasks || []).map((t, idx) => {
                    const isClosed = t.type === "closed";
                    const isChoice = isClosed && (t.evaluation?.checkerId === "choice_exact" || t.evaluation?.checkerId === "multi_choice_exact");
                    const isRepMatch = isClosed && t.evaluation?.checkerId === "representation_match";
                    const isNumeric = isClosed && t.evaluation?.checkerId === "numeric_exact";
                    const isTextNorm = isClosed && t.evaluation?.checkerId === "text_normalized_exact";
                    const isOpenOrReflect = t.type === "open" || t.type === "reflection";

                    return (
                      <div key={t.id} className="lesson-form-card">
                        <div className="lesson-form-card-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <strong>#{idx + 1}: {t.id}</strong>
                            <span className="lesson-badge lesson-badge-primary">{getTeacherDisplay(t.type)}</span>
                            <span className="lesson-badge">{getTeacherDisplay(t.branch || "shared")}</span>
                            <span className="lesson-badge">Hoạt động: {t.activityId || "chưa gán"}</span>
                          </div>
                          <button
                            type="button"
                            className="lesson-button lesson-button-outline"
                            style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", color: "var(--lesson-danger)" }}
                            onClick={() => {
                              const next = (editedPackage.tasks || []).filter((_, i) => i !== idx);
                              setEditedPackage({ ...editedPackage, tasks: next });
                            }}
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="lesson-form-grid-4">
                          <div className="lesson-field-group">
                            <label>Mã (ID):</label>
                            <input
                              type="text"
                              className="lesson-input"
                              value={t.id}
                              onChange={(e) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = { ...next[idx], id: e.target.value };
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            />
                          </div>
                          <div className="lesson-field-group">
                            <label>Loại nhiệm vụ:</label>
                            <select
                              className="lesson-select"
                              value={t.type || "closed"}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                const next = [...(editedPackage.tasks || [])];
                                if (nextType === "closed") {
                                  next[idx] = {
                                    ...next[idx],
                                    type: "closed",
                                    evaluation: {
                                      checkerId: "choice_exact",
                                      options: ["opt_1", "opt_2"],
                                      answerKey: "",
                                    },
                                    inputSchema: {
                                      options: [
                                        { id: "opt_1", label: "Phương án A" },
                                        { id: "opt_2", label: "Phương án B" },
                                      ],
                                    },
                                  };
                                } else {
                                  next[idx] = {
                                    ...next[idx],
                                    type: nextType,
                                    evaluation: {
                                      rubric: {
                                        criteria: [""],
                                        lookFor: [""],
                                      },
                                    },
                                    inputSchema: undefined,
                                  };
                                }
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            >
                              <option value="closed">Tự động chấm - trắc nghiệm/số</option>
                              <option value="open">Giáo viên chấm - tự luận</option>
                              <option value="reflection">Phản tư cá nhân</option>
                            </select>
                          </div>
                          <div className="lesson-field-group">
                            <label>Hoạt động:</label>
                            <select
                              className="lesson-select"
                              value={t.activityId || ""}
                              onChange={(e) => {
                                const nextTasks = [...(editedPackage.tasks || [])];
                                nextTasks[idx] = { ...nextTasks[idx], activityId: e.target.value };
                                setEditedPackage({ ...editedPackage, tasks: nextTasks });
                              }}
                            >
                              <option value="">-- Chọn hoạt động --</option>
                              {(editedPackage.activities || []).map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.id} ({getPhaseDisplay(a.phase)}, {a.minutes} phút)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="lesson-field-group">
                            <label>Thời lượng (phút):</label>
                            <input
                              type="number"
                              className="lesson-input"
                              value={t.minutes ?? 3}
                              onChange={(e) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = { ...next[idx], minutes: parseInt(e.target.value, 10) || 0 };
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            />
                          </div>
                        </div>

                        <div className="lesson-form-grid-3">
                          <div className="lesson-field-group">
                            <label>Hình thức tham gia:</label>
                            <select
                              className="lesson-select"
                              value={t.participation || "individual"}
                              onChange={(e) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = { ...next[idx], participation: e.target.value };
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            >
                              <option value="individual">Cá nhân độc lập</option>
                              <option value="whole_class">Cả lớp</option>
                              <option value="pair">Cặp đôi</option>
                              <option value="group">Nhóm</option>
                            </select>
                          </div>
                          <div className="lesson-field-group">
                            <label>Phân nhánh:</label>
                            <select
                              className="lesson-select"
                              value={t.branch || "shared"}
                              onChange={(e) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = { ...next[idx], branch: e.target.value };
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            >
                              <option value="shared">Dùng chung cả lớp</option>
                              <option value="core">Nhánh cốt lõi</option>
                              <option value="support">Nhánh hỗ trợ</option>
                              <option value="extension">Nhánh mở rộng</option>
                            </select>
                          </div>
                          <div className="lesson-field-group">
                            <label>Nhiệm vụ trọng tâm:</label>
                            <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem" }}>
                              <label className="lesson-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={Boolean(t.isCore)}
                                  onChange={(e) => {
                                    const next = [...(editedPackage.tasks || [])];
                                    next[idx] = { ...next[idx], isCore: e.target.checked };
                                    setEditedPackage({ ...editedPackage, tasks: next });
                                  }}
                                />
                                <span>Cốt lõi</span>
                              </label>
                              {t.isCore && (
                                <label className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(t.requiresFullScaffold)}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.tasks || [])];
                                      next[idx] = { ...next[idx], requiresFullScaffold: e.target.checked };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  />
                                  <span>Đủ H1..H4</span>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>

                        {t.isCore && (
                          <div className="lesson-field-group">
                            <label>Lý do sư phạm hỗ trợ:</label>
                            <input
                              type="text"
                              className="lesson-input"
                              value={t.supportRationale || ""}
                              placeholder="Giải thích lý do thiết kế hỗ trợ cho nhiệm vụ này..."
                              onChange={(e) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = { ...next[idx], supportRationale: e.target.value };
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }}
                            />
                          </div>
                        )}

                        <div className="lesson-field-group">
                          <label>Đề bài / Yêu cầu nhiệm vụ:</label>
                          <textarea
                            rows={2}
                            className="lesson-textarea"
                            value={t.prompt || ""}
                            placeholder="Nhập nội dung đề bài kèm công thức KaTeX..."
                            onChange={(e) => {
                              const next = [...(editedPackage.tasks || [])];
                              next[idx] = { ...next[idx], prompt: e.target.value };
                              setEditedPackage({ ...editedPackage, tasks: next });
                            }}
                          />
                          {t.prompt && (
                            <div style={{ marginTop: "0.3rem" }}>
                              <MathText text={t.prompt} />
                            </div>
                          )}
                        </div>

                        <div className="lesson-field-group">
                          <label>Chuẩn đầu ra bao phủ:</label>
                          <div className="lesson-checkbox-group">
                            {(editedPackage.objectives || []).map((o) => {
                              const checked = (t.objectiveIds || []).includes(o.id);
                              return (
                                <label key={o.id} className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.tasks || [])];
                                      const curr = new Set(t.objectiveIds || []);
                                      if (e.target.checked) curr.add(o.id);
                                      else curr.delete(o.id);
                                      next[idx] = { ...next[idx], objectiveIds: Array.from(curr) };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  />
                                  <span>{o.code || o.id}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Closed Task Evaluation & Answer Setup */}
                        {([
                          ["sequenceType", "sequenceTypes", "Loại dãy số", [["finite", "Hữu hạn"], ["infinite", "Vô hạn"]]],
                          ["representation", "representations", "Cách biểu diễn", [["list", "Liệt kê"], ["explicit", "Công thức tổng quát"], ["recurrence", "Truy hồi"], ["verbal", "Bằng lời"]]],
                        ] as const).map(([single, multiple, label, choices]) => (
                          <fieldset key={multiple} className="lesson-field-group">
                            <legend>{label}</legend>
                            {choices.map(([value, text]) => (
                              <label key={value} className="lesson-checkbox-label">
                                <input type="checkbox" checked={(t[multiple] || [t[single]]).includes(value) || (single === "sequenceType" && t.sequenceType === "both")} onChange={(e) => {
                                  const values = new Set(t[multiple] || (t[single] === "both" ? ["finite", "infinite"] : t[single] ? [t[single]!] : []));
                                  if (e.target.checked) values.add(value); else values.delete(value);
                                  const next = [...(editedPackage.tasks || [])];
                                  next[idx] = { ...t, [single]: undefined, [multiple]: [...values] };
                                  setEditedPackage({ ...editedPackage, tasks: next });
                                }} />{text}
                              </label>
                            ))}
                          </fieldset>
                        ))}
                        {isClosed && (
                          <div className="lesson-sub-card">
                            <div className="lesson-form-section-header">
                              <strong>🎯 Bộ chấm & Đáp án tự động</strong>
                            </div>
                            <div className="lesson-form-grid">
                              <div className="lesson-field-group">
                                <label>Cơ chế chấm:</label>
                                <select
                                  className="lesson-select"
                                  value={t.evaluation?.checkerId || "choice_exact"}
                                  onChange={(e) => {
                                    const nextChecker = e.target.value;
                                    const next = [...(editedPackage.tasks || [])];
                                    if (nextChecker === "numeric_exact") {
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { checkerId: "numeric_exact" },
                                        inputSchema: undefined,
                                      };
                                    } else if (nextChecker === "text_normalized_exact") {
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { checkerId: "text_normalized_exact", answerKey: "" },
                                        inputSchema: undefined,
                                      };
                                    } else if (nextChecker === "representation_match") {
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: {
                                          checkerId: "representation_match",
                                          answerKey: {},
                                        },
                                        inputSchema: {
                                          representations: [],
                                          cards: [],
                                        },
                                      };
                                    } else {
                                      // choice or multi_choice
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: {
                                          checkerId: nextChecker,
                                          options: ["opt_1", "opt_2"],
                                          answerKey: nextChecker === "multi_choice_exact" ? [] : "",
                                        },
                                        inputSchema: {
                                          options: [
                                            { id: "opt_1", label: "Phương án A" },
                                            { id: "opt_2", label: "Phương án B" },
                                          ],
                                        },
                                      };
                                    }
                                    setEditedPackage({ ...editedPackage, tasks: next });
                                  }}
                                >
                                  <option value="choice_exact">Trắc nghiệm chọn một đáp án</option>
                                  <option value="multi_choice_exact">Trắc nghiệm chọn nhiều đáp án</option>
                                  <option value="numeric_exact">Số học chính xác</option>
                                  <option value="text_normalized_exact">Văn bản chuẩn hóa</option>
                                  <option value="representation_match">Ghép thẻ biểu diễn</option>
                                </select>
                              </div>
                            </div>

                            {/* Choice Options Editor */}
                            {isChoice && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--lesson-text-muted)" }}>
                                  Danh sách lựa chọn (inputSchema.options):
                                </label>
                                {((t.inputSchema?.options as Array<{ id: string; label: string }>) || []).map((opt, oIdx) => (
                                  <div key={opt.id || oIdx} className="lesson-option-row">
                                    <input
                                      type="text"
                                      className="lesson-input"
                                      value={opt.id}
                                      placeholder="Mã (ID)"
                                      onChange={(e) => {
                                        const next = [...(editedPackage.tasks || [])];
                                        const currentOptions = [
                                          ...((t.inputSchema?.options as Array<{ id: string; label: string }>) || []),
                                        ];
                                        currentOptions[oIdx] = { ...currentOptions[oIdx], id: e.target.value };
                                        const optIds = currentOptions.map((o) => o.id);
                                        next[idx] = {
                                          ...next[idx],
                                          inputSchema: { ...next[idx].inputSchema, options: currentOptions },
                                          evaluation: {
                                            ...next[idx].evaluation,
                                            options: optIds,
                                            answerKey: Array.isArray(t.evaluation?.answerKey)
                                              ? t.evaluation.answerKey.map((id) => id === opt.id ? e.target.value : id)
                                              : t.evaluation?.answerKey === opt.id ? e.target.value : t.evaluation?.answerKey,
                                          },
                                        };
                                        setEditedPackage({ ...editedPackage, tasks: next });
                                      }}
                                    />
                                    <div>
                                      <input
                                        type="text"
                                        className="lesson-input"
                                        value={opt.label}
                                        placeholder="Nhãn hiển thị..."
                                        onChange={(e) => {
                                          const next = [...(editedPackage.tasks || [])];
                                          const currentOptions = [
                                            ...((t.inputSchema?.options as Array<{ id: string; label: string }>) || []),
                                          ];
                                          currentOptions[oIdx] = { ...currentOptions[oIdx], label: e.target.value };
                                          next[idx] = {
                                            ...next[idx],
                                            inputSchema: { ...next[idx].inputSchema, options: currentOptions },
                                          };
                                          setEditedPackage({ ...editedPackage, tasks: next });
                                        }}
                                      />
                                      {opt.label && <MathText text={opt.label} />}
                                    </div>
                                    <button
                                      type="button"
                                      className="lesson-button lesson-button-outline"
                                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "var(--lesson-danger)" }}
                                      onClick={() => {
                                        const next = [...(editedPackage.tasks || [])];
                                        const currentOptions = (
                                          (t.inputSchema?.options as Array<{ id: string; label: string }>) || []
                                        ).filter((_, i) => i !== oIdx);
                                        const optIds = currentOptions.map((o) => o.id);
                                        next[idx] = {
                                          ...next[idx],
                                          inputSchema: { ...next[idx].inputSchema, options: currentOptions },
                                          evaluation: {
                                            ...next[idx].evaluation,
                                            options: optIds,
                                            answerKey: Array.isArray(t.evaluation?.answerKey)
                                              ? t.evaluation.answerKey.filter((id) => id !== opt.id)
                                              : t.evaluation?.answerKey === opt.id ? "" : t.evaluation?.answerKey,
                                          },
                                        };
                                        setEditedPackage({ ...editedPackage, tasks: next });
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  className="lesson-button lesson-button-outline"
                                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", marginTop: "0.25rem" }}
                                  onClick={() => {
                                    const next = [...(editedPackage.tasks || [])];
                                    const currentOptions = [
                                      ...((t.inputSchema?.options as Array<{ id: string; label: string }>) || []),
                                    ];
                                    const newOptId = `opt_${currentOptions.length + 1}`;
                                    currentOptions.push({ id: newOptId, label: `Phương án ${newOptId}` });
                                    const optIds = currentOptions.map((o) => o.id);
                                    next[idx] = {
                                      ...next[idx],
                                      inputSchema: { ...next[idx].inputSchema, options: currentOptions },
                                      evaluation: {
                                        ...next[idx].evaluation,
                                        options: optIds,
                                      },
                                    };
                                    setEditedPackage({ ...editedPackage, tasks: next });
                                  }}
                                >
                                  + Thêm phương án lựa chọn
                                </button>

                                {/* Answer Key for Choice */}
                                <div style={{ marginTop: "0.75rem" }}>
                                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--lesson-text-muted)" }}>
                                    Đáp án đúng (answerKey):
                                  </label>
                                  {t.evaluation?.checkerId === "choice_exact" ? (
                                    <select
                                      className="lesson-select"
                                      value={typeof t.evaluation?.answerKey === "string" ? t.evaluation.answerKey : ""}
                                      onChange={(e) => {
                                        const next = [...(editedPackage.tasks || [])];
                                        next[idx] = {
                                          ...next[idx],
                                          evaluation: { ...next[idx].evaluation, answerKey: e.target.value },
                                        };
                                        setEditedPackage({ ...editedPackage, tasks: next });
                                      }}
                                    >
                                      <option value="">Chưa chọn đáp án</option>
                                      {((t.inputSchema?.options as Array<{ id: string; label: string }>) || []).map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.id}: {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="lesson-checkbox-group">
                                      {((t.inputSchema?.options as Array<{ id: string; label: string }>) || []).map((o) => {
                                        const keys = Array.isArray(t.evaluation?.answerKey) ? t.evaluation.answerKey : [];
                                        const checked = keys.includes(o.id);
                                        return (
                                          <label key={o.id} className="lesson-checkbox-label">
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(e) => {
                                                const next = [...(editedPackage.tasks || [])];
                                                const currKeys = new Set(keys);
                                                if (e.target.checked) currKeys.add(o.id);
                                                else currKeys.delete(o.id);
                                                next[idx] = {
                                                  ...next[idx],
                                                  evaluation: { ...next[idx].evaluation, answerKey: Array.from(currKeys) },
                                                };
                                                setEditedPackage({ ...editedPackage, tasks: next });
                                              }}
                                            />
                                            <span>{o.id}: {o.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Numeric Exact Answer Key */}
                            {isNumeric && (
                              <div className="lesson-field-group" style={{ marginTop: "0.5rem" }}>
                                <label>Giá trị số đáp án:</label>
                                <input
                                  type="number"
                                  className="lesson-input"
                                    value={typeof t.evaluation?.answerKey === "number" ? t.evaluation.answerKey : ""}
                                  onChange={(e) => {
                                    const next = [...(editedPackage.tasks || [])];
                                    next[idx] = {
                                      ...next[idx],
                                      evaluation: {
                                        ...next[idx].evaluation,
                                        answerKey: e.target.value === "" ? undefined : Number(e.target.value),
                                      },
                                    };
                                    setEditedPackage({ ...editedPackage, tasks: next });
                                  }}
                                />
                              </div>
                            )}

                            {/* Text Normalized Exact Answer Key */}
                            {isTextNorm && (
                              <div className="lesson-field-group" style={{ marginTop: "0.5rem" }}>
                                <label>Văn bản đáp án đúng:</label>
                                <input
                                  type="text"
                                  className="lesson-input"
                                  value={typeof t.evaluation?.answerKey === "string" ? t.evaluation.answerKey : ""}
                                  placeholder="Nhập chuỗi chuẩn hóa..."
                                  onChange={(e) => {
                                    const next = [...(editedPackage.tasks || [])];
                                    next[idx] = {
                                      ...next[idx],
                                      evaluation: {
                                        ...next[idx].evaluation,
                                        answerKey: e.target.value,
                                      },
                                    };
                                    setEditedPackage({ ...editedPackage, tasks: next });
                                  }}
                                />
                              </div>
                            )}

                            {/* Representation Match Editor */}
                            {isRepMatch && (
                              <MatchEditor task={t} onChange={(task) => {
                                const next = [...(editedPackage.tasks || [])];
                                next[idx] = task;
                                setEditedPackage({ ...editedPackage, tasks: next });
                              }} />
                            )}
                          </div>
                        )}

                        {/* Open / Reflection Task Rubric Setup */}
                        {isOpenOrReflect && (
                          <div className="lesson-sub-card">
                            <div className="lesson-form-section-header">
                              <strong>📋 Tiêu chí đánh giá và biểu hiện quan sát</strong>
                            </div>
                            <div className="lesson-field-group">
                              <label>Tiêu chí:</label>
                              {(t.evaluation?.rubric?.criteria || []).map((crit, cIdx) => (
                                <div key={cIdx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                  <input
                                    type="text"
                                    className="lesson-input"
                                    value={crit}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.tasks || [])];
                                      const crits = [...(t.evaluation?.rubric?.criteria || [])];
                                      crits[cIdx] = e.target.value;
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, criteria: crits } },
                                      };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="lesson-button lesson-button-outline"
                                    style={{ padding: "0.15rem 0.4rem", color: "var(--lesson-danger)" }}
                                    onClick={() => {
                                      const next = [...(editedPackage.tasks || [])];
                                      const crits = (t.evaluation?.rubric?.criteria || []).filter((_, i) => i !== cIdx);
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, criteria: crits } },
                                      };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="lesson-button lesson-button-outline"
                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                                onClick={() => {
                                  const next = [...(editedPackage.tasks || [])];
                                  const crits = [...(t.evaluation?.rubric?.criteria || []), "Tiêu chí mới"];
                                  next[idx] = {
                                    ...next[idx],
                                    evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, criteria: crits } },
                                  };
                                  setEditedPackage({ ...editedPackage, tasks: next });
                                }}
                              >
                                + Thêm tiêu chí
                              </button>
                            </div>

                            <div className="lesson-field-group" style={{ marginTop: "0.75rem" }}>
                              <label>Biểu hiện quan sát:</label>
                              {(t.evaluation?.rubric?.lookFor || []).map((lf, lIdx) => (
                                <div key={lIdx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                  <input
                                    type="text"
                                    className="lesson-input"
                                    value={lf}
                                    onChange={(e) => {
                                      const next = [...(editedPackage.tasks || [])];
                                      const lfs = [...(t.evaluation?.rubric?.lookFor || [])];
                                      lfs[lIdx] = e.target.value;
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, lookFor: lfs } },
                                      };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="lesson-button lesson-button-outline"
                                    style={{ padding: "0.15rem 0.4rem", color: "var(--lesson-danger)" }}
                                    onClick={() => {
                                      const next = [...(editedPackage.tasks || [])];
                                      const lfs = (t.evaluation?.rubric?.lookFor || []).filter((_, i) => i !== lIdx);
                                      next[idx] = {
                                        ...next[idx],
                                        evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, lookFor: lfs } },
                                      };
                                      setEditedPackage({ ...editedPackage, tasks: next });
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="lesson-button lesson-button-outline"
                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                                onClick={() => {
                                  const next = [...(editedPackage.tasks || [])];
                                  const lfs = [...(t.evaluation?.rubric?.lookFor || []), "Dấu hiệu nhận biết"];
                                  next[idx] = {
                                    ...next[idx],
                                    evaluation: { ...next[idx].evaluation, rubric: { ...next[idx].evaluation?.rubric, lookFor: lfs } },
                                  };
                                  setEditedPackage({ ...editedPackage, tasks: next });
                                }}
                              >
                                + Thêm biểu hiện
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 7. Hints Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">
                      💡 Giàn giáo gợi ý ({(editedPackage.hints || []).length})
                    </h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const nextIdx = (editedPackage.hints || []).length + 1;
                        const defaultTask = (editedPackage.tasks || [])[0]?.id || "";
                        const newHint: LessonHint = {
                          id: `hint-${nextIdx}`,
                          tier: "H1",
                          order: 1,
                          taskId: defaultTask,
                          objectiveIds: [],
                          text: "",
                          notAnswer: true,
                          penalty: { time: 0, score: 0, freeze: 0 },
                          supportRationale: "Gợi ý định hướng phương pháp suy luận.",
                        };
                        setEditedPackage({
                          ...editedPackage,
                          hints: [...(editedPackage.hints || []), newHint],
                        });
                      }}
                    >
                      + Thêm gợi ý
                    </button>
                  </div>

                  {(editedPackage.hints || []).length === 0 && (
                    <div className="task-status-banner task-status-pending">
                      ℹ️ <strong>Chưa có gợi ý giàn giáo.</strong> Các nhiệm vụ cốt lõi cần ít nhất một gợi ý hỗ trợ sư phạm.
                    </div>
                  )}

                  {(editedPackage.hints || []).map((h, idx) => (
                    <div key={h.id} className="lesson-form-card">
                      <div className="lesson-form-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong>#{idx + 1}: {h.id}</strong>
                          <span className="lesson-badge lesson-badge-warning">{h.tier} (Bậc {h.order || 1})</span>
                          <span className="lesson-badge">Nhiệm vụ: {h.taskId || "chưa gán"}</span>
                        </div>
                        <button
                          type="button"
                          className="lesson-button lesson-button-outline"
                          style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", color: "var(--lesson-danger)" }}
                          onClick={() => {
                            const next = (editedPackage.hints || []).filter((_, i) => i !== idx);
                            setEditedPackage({ ...editedPackage, hints: next });
                          }}
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="lesson-form-grid-4">
                        <div className="lesson-field-group">
                          <label>Mã (ID):</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={h.id}
                            onChange={(e) => {
                              const next = [...(editedPackage.hints || [])];
                              next[idx] = { ...next[idx], id: e.target.value };
                              setEditedPackage({ ...editedPackage, hints: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Tầng giàn giáo:</label>
                          <select
                            className="lesson-select"
                            value={h.tier}
                            onChange={(e) => {
                              const next = [...(editedPackage.hints || [])];
                              next[idx] = { ...next[idx], tier: e.target.value };
                              setEditedPackage({ ...editedPackage, hints: next });
                            }}
                          >
                            <option value="H1">H1 (Gợi ý mở đầu)</option>
                            <option value="H2">H2 (Gợi ý phương pháp)</option>
                            <option value="H3">H3 (Gợi ý bước tính cụ thể)</option>
                            <option value="H4">H4 (Gợi ý cấu trúc giải)</option>
                          </select>
                        </div>
                        <div className="lesson-field-group">
                          <label>Thứ tự:</label>
                          <input
                            type="number"
                            className="lesson-input"
                            value={h.order ?? 1}
                            onChange={(e) => {
                              const next = [...(editedPackage.hints || [])];
                              next[idx] = { ...next[idx], order: parseInt(e.target.value, 10) || 1 };
                              setEditedPackage({ ...editedPackage, hints: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Gắn với nhiệm vụ:</label>
                          <select
                            className="lesson-select"
                            value={h.taskId || ""}
                            onChange={(e) => {
                              const next = [...(editedPackage.hints || [])];
                              next[idx] = { ...next[idx], taskId: e.target.value };
                              setEditedPackage({ ...editedPackage, hints: next });
                            }}
                          >
                            <option value="">-- Chọn nhiệm vụ --</option>
                            {(editedPackage.tasks || []).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.id} ({getTeacherDisplay(t.type)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="lesson-field-group">
                        <fieldset>
                          <legend>Mục tiêu được gợi ý</legend>
                          {(editedPackage.objectives || []).filter((o) => editedPackage.tasks?.find((task) => task.id === h.taskId)?.objectiveIds?.includes(o.id)).map((o) => (
                            <label key={o.id} className="lesson-checkbox-label">
                              <input type="checkbox" checked={h.objectiveIds?.includes(o.id) || false} onChange={(e) => {
                                const ids = new Set(h.objectiveIds || []);
                                if (e.target.checked) ids.add(o.id); else ids.delete(o.id);
                                const next = [...(editedPackage.hints || [])];
                                next[idx] = { ...h, objectiveIds: [...ids] };
                                setEditedPackage({ ...editedPackage, hints: next });
                              }} />{o.code || o.id}
                            </label>
                          ))}
                        </fieldset>
                      </div>
                      <div className="lesson-field-group">
                        <label>Nội dung gợi ý:</label>
                        <textarea
                          rows={2}
                          className="lesson-textarea"
                          value={h.text || ""}
                          placeholder="Nhập nội dung gợi ý tư duy cho học sinh (không tiết lộ trực tiếp đáp án)..."
                          onChange={(e) => {
                            const next = [...(editedPackage.hints || [])];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setEditedPackage({ ...editedPackage, hints: next });
                          }}
                        />
                        {h.text && (
                          <div style={{ marginTop: "0.3rem" }}>
                            <MathText text={h.text} />
                          </div>
                        )}
                      </div>

                      <div className="lesson-field-group">
                        <label>Lý do sư phạm:</label>
                        <input
                          type="text"
                          className="lesson-input"
                          value={h.supportRationale || ""}
                          placeholder="Mục đích hỗ trợ của tầng gợi ý này..."
                          onChange={(e) => {
                            const next = [...(editedPackage.hints || [])];
                            next[idx] = { ...next[idx], supportRationale: e.target.value };
                            setEditedPackage({ ...editedPackage, hints: next });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 8. Evidence Rules Form */}
                <div className="lesson-form-section">
                  <div className="lesson-form-section-header">
                    <h3 className="lesson-form-section-title">
                      🛡️ Quy tắc minh chứng năng lực ({(editedPackage.evidenceRules || []).length})
                    </h3>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        const nextIdx = (editedPackage.evidenceRules || []).length + 1;
                        const defaultTask = (editedPackage.tasks || [])[0]?.id || "";
                        const defaultObj = (editedPackage.objectives || [])[0]?.id;
                        const newEv: LessonEvidenceRule = {
                          id: `ev-${nextIdx}`,
                          kind: "individual_recheck",
                          taskId: defaultTask,
                          objectiveIds: defaultObj ? [defaultObj] : [],
                          individual: true,
                          countsForMastery: true,
                        };
                        setEditedPackage({
                          ...editedPackage,
                          evidenceRules: [...(editedPackage.evidenceRules || []), newEv],
                        });
                      }}
                    >
                      + Thêm quy tắc minh chứng
                    </button>
                  </div>

                  {(editedPackage.evidenceRules || []).length === 0 && (
                    <div className="task-status-banner task-status-pending">
                      ⚠️ <strong>Chưa có quy tắc minh chứng.</strong> Mỗi chuẩn đầu ra cần ít nhất 2 minh chứng cá nhân độc lập đạt yêu cầu làm chủ để được công nhận.
                    </div>
                  )}

                  {(editedPackage.evidenceRules || []).map((e, idx) => (
                    <div key={e.id} className="lesson-form-card">
                      <div className="lesson-form-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong>#{idx + 1}: {e.id}</strong>
                          <span className={`lesson-badge ${e.countsForMastery ? "lesson-badge-success" : "lesson-badge-outline"}`}>
                            {getTeacherDisplay(e.kind)} {e.countsForMastery ? "★ Làm chủ" : ""}
                          </span>
                          <span className="lesson-badge">Nhiệm vụ: {e.taskId || "chưa gán"}</span>
                        </div>
                        <button
                          type="button"
                          className="lesson-button lesson-button-outline"
                          style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", color: "var(--lesson-danger)" }}
                          onClick={() => {
                            const next = (editedPackage.evidenceRules || []).filter((_, i) => i !== idx);
                            setEditedPackage({ ...editedPackage, evidenceRules: next });
                          }}
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="lesson-form-grid-3">
                        <div className="lesson-field-group">
                          <label>Mã (ID):</label>
                          <input
                            type="text"
                            className="lesson-input"
                            value={e.id}
                            onChange={(ev) => {
                              const next = [...(editedPackage.evidenceRules || [])];
                              next[idx] = { ...next[idx], id: ev.target.value };
                              setEditedPackage({ ...editedPackage, evidenceRules: next });
                            }}
                          />
                        </div>
                        <div className="lesson-field-group">
                          <label>Loại minh chứng:</label>
                          <select
                            className="lesson-select"
                            value={e.kind}
                            onChange={(ev) => {
                              const next = [...(editedPackage.evidenceRules || [])];
                              next[idx] = { ...next[idx], kind: ev.target.value };
                              setEditedPackage({ ...editedPackage, evidenceRules: next });
                            }}
                          >
                            <option value="individual_recheck">Kiểm tra lại độc lập - tính làm chủ</option>
                            <option value="independent_recheck">Đánh giá độc lập - tính làm chủ</option>
                            <option value="exit">Vé ra cửa - tính làm chủ</option>
                            <option value="precheck">Kiểm tra đầu vào</option>
                            <option value="initialThinking">Tư duy ban đầu</option>
                            <option value="individual_reasoning">Lập luận cá nhân</option>
                            <option value="group_product">Sản phẩm nhóm</option>
                            <option value="practice">Thực hành</option>
                            <option value="teacher_observation">Quan sát của giáo viên</option>
                            <option value="self_assessment">Tự đánh giá</option>
                          </select>
                        </div>
                        <div className="lesson-field-group">
                          <label>Nhiệm vụ phát sinh:</label>
                          <select
                            className="lesson-select"
                            value={e.taskId || ""}
                            onChange={(ev) => {
                              const next = [...(editedPackage.evidenceRules || [])];
                              next[idx] = { ...next[idx], taskId: ev.target.value };
                              setEditedPackage({ ...editedPackage, evidenceRules: next });
                            }}
                          >
                            <option value="">-- Chọn nhiệm vụ --</option>
                            {(editedPackage.tasks || []).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.id} ({getTeacherDisplay(t.type)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="lesson-form-grid">
                        <div className="lesson-field-group">
                          <label>Tính chất minh chứng:</label>
                          <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem" }}>
                            <label className="lesson-checkbox-label">
                              <input
                                type="checkbox"
                                checked={Boolean(e.individual)}
                                onChange={(ev) => {
                                  const next = [...(editedPackage.evidenceRules || [])];
                                  next[idx] = { ...next[idx], individual: ev.target.checked };
                                  setEditedPackage({ ...editedPackage, evidenceRules: next });
                                }}
                              />
                              <span>Minh chứng cá nhân</span>
                            </label>
                            <label className="lesson-checkbox-label">
                              <input
                                type="checkbox"
                                checked={Boolean(e.countsForMastery)}
                                onChange={(ev) => {
                                  const next = [...(editedPackage.evidenceRules || [])];
                                  next[idx] = { ...next[idx], countsForMastery: ev.target.checked };
                                  setEditedPackage({ ...editedPackage, evidenceRules: next });
                                }}
                              />
                              <span>Tính điểm làm chủ</span>
                            </label>
                          </div>
                        </div>

                        <div className="lesson-field-group">
                          <label>Chuẩn đầu ra gắn kết:</label>
                          <div className="lesson-checkbox-group">
                            {(editedPackage.objectives || []).map((o) => {
                              const checked = (e.objectiveIds || []).includes(o.id);
                              return (
                                <label key={o.id} className="lesson-checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(ev) => {
                                      const next = [...(editedPackage.evidenceRules || [])];
                                      const curr = new Set(e.objectiveIds || []);
                                      if (ev.target.checked) curr.add(o.id);
                                      else curr.delete(o.id);
                                      next[idx] = { ...next[idx], objectiveIds: Array.from(curr) };
                                      setEditedPackage({ ...editedPackage, evidenceRules: next });
                                    }}
                                  />
                                  <span>{o.code || o.id}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Actions Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "2rem", borderTop: "1px solid var(--lesson-border)", paddingTop: "1.25rem" }}>
                  <div className="lesson-inline-actions">
                    <button type="button" className="lesson-button lesson-button-primary" disabled={isSavingDraft} onClick={handleSaveDraft}>
                      💾 Lưu bản thảo bài dạy
                    </button>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      onClick={() => {
                        const activities = editedPackage.activities || [];
                        const coreSum = activities
                          .filter((a) => a.budgetRole === "core")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const reserveSum = activities
                          .filter((a) => a.budgetRole === "reserve")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        const optionalSum = activities
                          .filter((a) => a.budgetRole === "optional")
                          .reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
                        setEditedPackage({
                          ...editedPackage,
                          budget: {
                            slotMinutes: editedPackage.budget?.slotMinutes || 40,
                            coreMinutes: coreSum,
                            reserveMinutes: reserveSum,
                            optionalMinutes: optionalSum,
                            transitionMinutes: editedPackage.budget?.transitionMinutes || 0,
                          },
                        });
                      }}
                    >
                      ⏱️ Tự động tính thời lượng
                    </button>
                    <button
                      type="button"
                      className="lesson-button lesson-button-outline"
                      onClick={() => {
                        setEditedPackage(syncPackageBidirectionalLinks(editedPackage));
                      }}
                    >
                      🔗 Đồng bộ liên kết
                    </button>
                  </div>
                  <button
                    type="button"
                    className="lesson-button lesson-button-outline"
                    onClick={() => setStudioSubTab("preview")}
                  >
                    Quay lại xem trước
                  </button>
                </div>
              </div>
            ) : studioSubTab === "director" ? (
              /* Director Plan Inspector & Approval Panel */
              <div className="director-panel">
                {/* Plan Approval Status Card */}
                <div
                  className={`director-status-card ${
                    isPlanApproved
                      ? "director-status-approved"
                      : directorDraft?.status === "draft"
                      ? "director-status-pending"
                      : ""
                  }`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <h2 className="lesson-card-title" style={{ fontSize: "1.25rem" }}>
                          🎬 Kế hoạch tổ chức tiết học
                        </h2>
                        {isPlanApproved ? (
                          <span className="lesson-badge lesson-badge-success">✓ ĐÃ PHÊ DUYỆT</span>
                        ) : directorDraft ? (
                          <span className="lesson-badge lesson-badge-warning">BẢN THẢO</span>
                        ) : (
                          <span className="lesson-badge">CHƯA TẢI</span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: "var(--lesson-text-muted)", fontSize: "0.9rem" }}>
                        Đạo diễn AI tự động phân tích cấu trúc bài học để đề xuất thế giới bối cảnh, cơ chế tương tác,
                        kịch bản câu chuyện, tiến trình thời gian và điểm chốt đánh giá năng lực phù hợp nhất.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="lesson-button lesson-button-primary"
                        onClick={handleFetchDirectorDraft}
                        disabled={!selectedRecord || isLoadingDirector}
                      >
                        {isLoadingDirector
                          ? "Đang tải kế hoạch..."
                          : directorDraft
                          ? "🔄 Tải lại bản thảo đạo diễn"
                          : "🎬 Tải kế hoạch Đạo diễn AI"}
                      </button>
                    </div>
                  </div>

                  {directorError && (
                    <div className="task-status-banner task-status-error">
                      ✕ {directorError}
                    </div>
                  )}

                  {planApprovalStatus && (
                    <div className={`task-status-banner ${planApprovalStatus.startsWith("✓") ? "task-status-success" : "task-status-pending"}`}>
                      {planApprovalStatus}
                    </div>
                  )}

                  {/* Package & Plan Binding Metadata */}
                  {selectedRecord && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", fontSize: "0.85rem", borderTop: "1px solid var(--lesson-border)", paddingTop: "0.75rem" }}>
                      <div>
                        <strong>Gói bài dạy liên kết:</strong> <code>{selectedRecord.package_id}</code> (v{selectedRecord.version})
                      </div>
                      <div>
                        <strong>Trạng thái gói:</strong>{" "}
                        <span className={`lesson-badge ${isPackageApproved ? "lesson-badge-success" : "lesson-badge-warning"}`}>
                          {isPackageApproved ? "Đã phê duyệt nguồn học liệu" : "Chưa phê duyệt"}
                        </span>
                      </div>
                      {isPlanApproved && approvedPlan && (
                        <>
                          <div>
                            <strong>Mã kế hoạch đã duyệt:</strong> <code className="director-hash-code">{approvedPlan.planRowId.slice(0, 8)}</code>
                          </div>
                          <div>
                            <strong>Mã băm kế hoạch:</strong> <code className="director-hash-code">{approvedPlan.planHash.slice(0, 16)}...</code>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Approval Action Box */}
                  {directorDraft?.plan && (
                    <div style={{ background: "rgba(15, 23, 42, 0.4)", padding: "1rem", borderRadius: "var(--lesson-radius-sm)", border: "1px solid var(--lesson-border)", marginTop: "0.5rem" }}>
                      {isPlanApproved ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div style={{ color: "var(--lesson-success)", fontWeight: 600 }}>
                            ✓ Kế hoạch tổ chức đã được phê duyệt và gắn kết với gói bài học. Sẵn sàng khởi tạo phòng học chính thức.
                          </div>
                          <button
                            className="lesson-button lesson-button-success"
                            onClick={() => {
                              setLaunchMode("live");
                              setCreatedSessionData(null);
                              setIsLaunchOpen(true);
                            }}
                          >
                            🚀 Khởi tạo phòng học chính thức
                          </button>
                        </div>
                      ) : !isPackageApproved ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div>
                            <p style={{ margin: "0 0 0.25rem 0", color: "var(--lesson-warning)", fontWeight: 600 }}>
                              ⚠️ Yêu cầu đối soát: Gói bài dạy cần được giáo viên đối soát và phê duyệt nguồn học liệu trước khi phê duyệt kế hoạch đạo diễn.
                            </p>
                            <small style={{ color: "var(--lesson-text-muted)" }}>
                              Chỉ các gói bài dạy đã được phê duyệt với nguồn trích dẫn đã xác thực mới đủ điều kiện phê duyệt kế hoạch.
                            </small>
                          </div>
                          <button className="lesson-button lesson-button-success" onClick={openApprovalModal}>
                            ✓ Phê duyệt nguồn học liệu trước
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div>
                            <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600 }}>
                              Xác nhận phê duyệt Kế hoạch Đạo diễn cho tiết học
                            </p>
                            <small style={{ color: "var(--lesson-text-muted)" }}>
                              Gói bài dạy đã đạt chuẩn xác thực nguồn. Nhấn nút bên cạnh để ký duyệt và cho phép mở phòng học chính thức.
                            </small>
                          </div>
                          <button
                            className="lesson-button lesson-button-success"
                            onClick={handleApprovePlan}
                            disabled={isApprovingPlan}
                          >
                            {isApprovingPlan ? "Đang phê duyệt..." : "✓ Phê duyệt kế hoạch tổ chức"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* If not loaded yet */}
                {!directorDraft && !isLoadingDirector && (
                  <div className="lesson-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                    <p style={{ fontSize: "1.1rem", marginBottom: "1.25rem" }}>
                      Chưa có dữ liệu kế hoạch đạo diễn cho bài học này.
                    </p>
                    <button
                      className="lesson-button lesson-button-primary"
                      onClick={handleFetchDirectorDraft}
                      disabled={!selectedRecord}
                    >
                      🎬 Tải kế hoạch Đạo diễn AI cho gói này
                    </button>
                  </div>
                )}

                {/* When loaded */}
                {directorDraft && (
                  <>
                    {/* 4 Metric / Config Cards */}
                    <div className="director-grid">
                      <div className="director-metric-card">
                        <span className="director-metric-label">Bối cảnh thế giới và bản đồ</span>
                        <span className="director-metric-value">{getThemeDisplay(directorDraft.plan?.theme)}</span>
                        <span className="director-metric-desc">
                          Bản đồ: {getThemeDisplay(directorDraft.plan?.map)}
                        </span>
                      </div>

                      <div className="director-metric-card">
                        <span className="director-metric-label">Quy tắc và cơ chế chơi</span>
                        <span className="director-metric-value">{getRuleDisplay(directorDraft.plan?.rule)}</span>
                        <span className="director-metric-desc">
                          {RULE_INFO[directorDraft.plan?.rule || ""]?.desc || "Cơ chế trò chơi tương tác"}
                        </span>
                      </div>

                      <div className="director-metric-card">
                        <span className="director-metric-label">Hình thức tương tác</span>
                        <span className="director-metric-value">{getParticipationDisplay(directorDraft.plan?.participation)}</span>
                        <span className="director-metric-desc">
                          Thiết bị: {(directorDraft.plan?.devices || []).map((d) => d === "projector" ? "Máy chiếu TV" : "Thiết bị học sinh").join(" + ")}
                        </span>
                      </div>

                      <div className="director-metric-card">
                        <span className="director-metric-label">Độ tin cậy đề xuất</span>
                        <span className="director-metric-value" style={{ color: directorDraft.confidence >= 0.8 ? "var(--lesson-success)" : "var(--lesson-warning)" }}>
                          {(directorDraft.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="director-metric-desc">
                          Mã khởi tạo cố định: {directorDraft.plan?.director?.seed ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Story Section */}
                    {directorDraft.plan?.story && (
                      <div className="lesson-card">
                        <h3 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                          📖 Kịch bản câu chuyện và hành trình
                        </h3>
                        <div className="director-story-box">
                          <div>
                            <strong>Tiêu đề cốt truyện:</strong> {directorDraft.plan.story.title}
                          </div>
                          <div>
                            <strong>Tiền đề kịch bản:</strong>
                            <p style={{ margin: "0.25rem 0 0 0", color: "var(--lesson-text)" }}>
                              {directorDraft.plan.story.premise}
                            </p>
                          </div>
                          <div>
                            <strong>Mục tiêu hành trình:</strong>
                            <p style={{ margin: "0.25rem 0 0 0", color: "var(--lesson-primary)", fontWeight: 600 }}>
                              {directorDraft.plan.story.goal}
                            </p>
                          </div>
                          {directorDraft.plan.story.places && directorDraft.plan.story.places.length > 0 && (
                            <div>
                              <strong>Các chặng dừng chân trên bản đồ:</strong>
                              <div className="director-places-chain">
                                {directorDraft.plan.story.places.map((place, idx) => (
                                  <React.Fragment key={idx}>
                                    <span className="director-place-node">
                                      <span>{idx + 1}.</span> {place}
                                    </span>
                                    {idx < (directorDraft.plan?.story?.places?.length ?? 0) - 1 && (
                                      <span className="director-place-arrow">→</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline & Activity Plans */}
                    {directorDraft.plan?.activityPlans && (
                      <div className="lesson-card">
                        <div className="lesson-card-header">
                          <h3 className="lesson-card-title">
                            ⏱️ Tiến trình hoạt động và kế hoạch thời gian
                          </h3>
                          <span className="lesson-badge lesson-badge-primary">
                            {directorDraft.plan.activityPlans.length} hoạt động
                          </span>
                        </div>

                        <div className="director-timeline-list">
                          {directorDraft.plan.activityPlans.map((act) => {
                            const linkedCheckpoint = directorDraft.plan?.checkpoints?.find(
                              (cp) => cp.activityId === act.id
                            );
                            return (
                              <div key={act.id} className="director-timeline-item">
                                <div className="director-timeline-header">
                                  <div>
                                    <strong>
                                      Pha {act.order + 1}: {getPhaseDisplay(act.phase)}
                                    </strong>{" "}
                                    <span style={{ color: "var(--lesson-text-muted)", fontSize: "0.85rem" }}>
                                      ({act.id})
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <span className="lesson-badge">{act.minutes} phút</span>
                                    <span className="lesson-badge">{getParticipationDisplay(act.participation)}</span>
                                    <span className="lesson-badge lesson-badge-primary">
                                      {act.budgetRole === "core" ? "Cốt lõi" : act.budgetRole === "reserve" ? "Dự phòng" : act.budgetRole || "Cốt lõi"}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.825rem", color: "var(--lesson-text-muted)" }}>
                                  {act.objectiveIds && act.objectiveIds.length > 0 && (
                                    <div>
                                      <strong>Chuẩn đầu ra:</strong> {act.objectiveIds.join(", ")}
                                    </div>
                                  )}
                                  {act.taskIds && act.taskIds.length > 0 && (
                                    <div>
                                      <strong>Nhiệm vụ:</strong> {act.taskIds.join(", ")}
                                    </div>
                                  )}
                                  {act.evidenceIds && act.evidenceIds.length > 0 && (
                                    <div>
                                      <strong>Minh chứng:</strong> {act.evidenceIds.join(", ")}
                                    </div>
                                  )}
                                </div>

                                {linkedCheckpoint && (
                                  <div style={{ marginTop: "0.25rem" }}>
                                    <span className="lesson-badge lesson-badge-warning" style={{ fontSize: "0.75rem" }}>
                                      🎯 Điểm chốt đánh giá ({linkedCheckpoint.id}) · {linkedCheckpoint.individual ? "Đánh giá độc lập cá nhân" : "Đánh giá chung"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3-Column Bottom Grid: Reasons, Alternatives, Uncertainties */}
                    <div className="lesson-grid">
                      {/* Reasons */}
                      <div className="lesson-card">
                        <h3 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                          💡 Lý do lựa chọn cấu hình
                        </h3>
                        <div className="director-reasons-list">
                          {directorDraft.reasonCodes && directorDraft.reasonCodes.length > 0 ? (
                            directorDraft.reasonCodes.map((code, idx) => (
                              <div key={idx} className="director-reason-card">
                                <span style={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
                                  {getReasonDisplay(code)}
                                </span>
                                <span className="lesson-badge" style={{ alignSelf: "flex-start", fontSize: "0.7rem" }}>
                                  {code}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: "var(--lesson-text-muted)" }}>Không có mã lý do nào.</p>
                          )}
                        </div>
                      </div>

                      {/* Alternatives */}
                      <div className="lesson-card">
                        <h3 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                          🔀 Phương án cấu hình thay thế
                        </h3>
                        <div className="director-alternatives-list">
                          {directorDraft.alternatives && directorDraft.alternatives.length > 0 ? (
                            directorDraft.alternatives.map((alt, idx) => (
                              <div key={idx} className="director-alt-card">
                                {alt.rule && (
                                  <div>
                                    <strong>Luật chơi đề xuất:</strong> {getRuleDisplay(alt.rule)}
                                  </div>
                                )}
                                {alt.participation && (
                                  <div>
                                    <strong>Hình thức tham gia:</strong> {getParticipationDisplay(alt.participation)}
                                  </div>
                                )}
                                <span style={{ fontSize: "0.825rem", color: "var(--lesson-text-muted)", marginTop: "0.25rem" }}>
                                  Điều kiện kích hoạt: {getReasonDisplay(alt.reasonCode)} (<code>{alt.reasonCode}</code>)
                                </span>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: "var(--lesson-text-muted)" }}>Không có phương án thay thế nào được đề xuất.</p>
                          )}
                        </div>
                      </div>

                      {/* Uncertainties */}
                      <div className="lesson-card">
                        <h3 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                          ⚠️ Điểm chưa chắc chắn và cần lưu ý
                        </h3>
                        <div className="director-uncertainties-list">
                          {directorDraft.uncertainties && directorDraft.uncertainties.length > 0 ? (
                            directorDraft.uncertainties.map((unc, idx) => (
                              <div key={idx} className="director-uncertainty-card">
                                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--lesson-warning)" }}>
                                  {getUncertaintyDisplay(unc)}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--lesson-text-muted)" }}>
                                  Mã cảnh báo: <code>{unc}</code>
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="task-status-banner task-status-success">
                              ✓ Toàn bộ các tiêu chí sư phạm đều rõ ràng và đã được xác thực đầy đủ.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Structured Preview */
              <div className="lesson-grid">
                {/* Left Column: Metadata, Sources & Objectives */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="lesson-card">
                    <div className="lesson-card-header">
                      <h2 className="lesson-card-title">Thông tin tổng quan</h2>
                      <span className="lesson-badge lesson-badge-primary">
                        v{currentPackage.version} ({getTeacherDisplay(currentPackage.status)})
                      </span>
                    </div>
                    <p><strong>Môn học:</strong> {getTeacherDisplay(currentPackage.subject)} - Lớp {currentPackage.grade}</p>
                    <div className="lesson-section-box">
                      <strong>Câu hỏi cốt lõi:</strong>
                      <p style={{ marginTop: "0.5rem" }}>
                        <MathText text={currentPackage.essentialQuestion} />
                      </p>
                    </div>
                    <div>
                      <strong>Phân bổ thời lượng:</strong> {currentPackage.budget?.slotMinutes ?? 40} phút ({currentPackage.budget?.coreMinutes ?? 36}p cốt lõi, {currentPackage.budget?.optionalMinutes ?? 0}p tùy chọn/phó bản, {currentPackage.budget?.reserveMinutes ?? 4}p dự phòng).
                    </div>
                  </div>

                  {/* Director Summary Card */}
                  <div className="lesson-card">
                    <div className="lesson-card-header">
                      <h2 className="lesson-card-title">Kế hoạch Đạo diễn AI</h2>
                      {isPlanApproved ? (
                        <span className="lesson-badge lesson-badge-success">✓ Đã phê duyệt</span>
                      ) : directorDraft ? (
                        <span className="lesson-badge lesson-badge-warning">Bản thảo</span>
                      ) : (
                        <span className="lesson-badge">Chưa tải</span>
                      )}
                    </div>
                    {directorDraft ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <div>
                          <strong>Bối cảnh:</strong> {getThemeDisplay(directorDraft.plan?.theme)}
                        </div>
                        <div>
                          <strong>Cơ chế chơi:</strong> {getRuleDisplay(directorDraft.plan?.rule)}
                        </div>
                        <div>
                          <strong>Hình thức:</strong> {getParticipationDisplay(directorDraft.plan?.participation)}
                        </div>
                        <div>
                          <strong>Độ tin cậy:</strong> {(directorDraft.confidence * 100).toFixed(0)}%
                        </div>
                        <div style={{ marginTop: "0.5rem" }}>
                          <button
                            className="lesson-button lesson-button-outline"
                            style={{ width: "100%", fontSize: "0.85rem" }}
                            onClick={() => setStudioSubTab("director")}
                          >
                            🎬 Xem chi tiết & Phê duyệt Kế hoạch Đạo diễn →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: "var(--lesson-text-muted)", fontSize: "0.875rem", margin: "0 0 0.75rem 0" }}>
                          Chưa tải kế hoạch đạo diễn cho bài học này.
                        </p>
                        <button
                          className="lesson-button lesson-button-outline"
                          style={{ width: "100%", fontSize: "0.85rem" }}
                          onClick={() => {
                            setStudioSubTab("director");
                            void handleFetchDirectorDraft();
                          }}
                          disabled={!selectedRecord || isLoadingDirector}
                        >
                          🎬 Tải kế hoạch Đạo diễn AI
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lesson-card">
                    <h2 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                      Nguồn trích dẫn học liệu ({currentPackage.sourceRefs?.length || 0})
                    </h2>
                    <div className="lesson-meta-list">
                      {(currentPackage.sourceRefs || []).map((src) => (
                        <div key={src.id} className="lesson-meta-item">
                          <div>
                            <strong>{src.label}</strong>
                            <div style={{ fontSize: "0.8rem", color: "var(--lesson-text-muted)" }}>
                              <code>{src.locator}</code>
                            </div>
                          </div>
                          <span
                            className={`lesson-badge ${
                              src.verification === "verified"
                                ? "lesson-badge-success"
                                : "lesson-badge-warning"
                            }`}
                          >
                            {src.verification === "verified" ? "Đã xác nhận" : "Cần GV duyệt"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lesson-card">
                    <h2 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
                      Chuẩn đầu ra (Yêu cầu cần đạt)
                    </h2>
                    <div className="lesson-meta-list">
                      {currentObjectives.map((obj) => (
                        <div key={obj.id} className="lesson-meta-item" style={{ flexDirection: "column" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "0.25rem" }}>
                            <strong>Mã chuẩn: {obj.code}</strong>
                            <span className="lesson-badge">{getTeacherDisplay(obj.level)}</span>
                          </div>
                          <div>
                            <MathText text={obj.statement} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Activities & Tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="lesson-card">
                    <h2 className="lesson-card-title" style={{ marginBottom: "1.25rem" }}>
                      Chuỗi hoạt động dạy học ({currentActivities.length})
                    </h2>
                    {currentActivities.map((act) => (
                      <div key={act.id} className="lesson-activity-block">
                        <div className="lesson-activity-header">
                          <strong>{getPhaseDisplay(act.phase)} ({act.minutes} phút)</strong>
                          <span className="lesson-badge">{getParticipationDisplay(act.participation)}</span>
                        </div>
                        <p style={{ margin: "0.25rem 0" }}>
                          <strong>Hành động của HS:</strong> <MathText text={act.studentAction} />
                        </p>
                        <p style={{ margin: "0.25rem 0", color: "var(--lesson-text-muted)", fontSize: "0.875rem" }}>
                          <strong>Sản phẩm kỳ vọng:</strong> {act.expectedProduct}
                        </p>
                        <p style={{ margin: "0.25rem 0", color: "var(--lesson-text-muted)", fontSize: "0.875rem" }}>
                          <strong>Tiêu chí GV quan sát:</strong> {act.teacherLookFor}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="lesson-card">
                    <h2 className="lesson-card-title" style={{ marginBottom: "1.25rem" }}>
                      Nhiệm vụ học tập & Đánh giá ({currentTasks.length})
                    </h2>
                    {currentTasks.map((task) => (
                      <div key={task.id} className="lesson-section-box">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <strong>{task.id}</strong>
                          <span className="lesson-badge">
                            Nhánh: {getTeacherDisplay(task.branch || "shared")} · {getTeacherDisplay(task.type)}
                          </span>
                        </div>
                        <div style={{ marginBottom: "0.5rem" }}>
                          <MathText text={task.prompt} />
                        </div>
                        {task.evaluation?.checkerId && (
                          <div style={{ fontSize: "0.8rem", color: "var(--lesson-primary)" }}>
                            Kiểm tra tự động: {getTeacherDisplay(task.evaluation.checkerId)}
                          </div>
                        )}
                        {task.evaluation?.rubric && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                            <strong>Tiêu chí đánh giá:</strong>
                            <ul style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}>
                              {task.evaluation.rubric.criteria?.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <p>Không có bài học nào sẵn sàng.</p>
          )}

          {/* Modal 1: Explicit All-Source Approval */}
          {isApproveOpen && (
            <div className="lesson-modal-backdrop" role="dialog" aria-modal="true">
              <div className="lesson-modal">
                <h2 className="lesson-modal-title">Đối soát & Phê duyệt nguồn học liệu</h2>
                <p style={{ color: "var(--lesson-text-muted)", fontSize: "0.9rem" }}>
                  Theo quy định giáo dục, giáo viên phải trực tiếp đối chiếu tất cả các nguồn học liệu trích dẫn
                  trước khi phê duyệt phiên bản bài dạy cho học sinh.
                </p>

                <div className="lesson-checklist">
                  {(currentPackage?.sourceRefs || []).map((src) => {
                    const key = `${src.id}\u0000${src.locator}`;
                    const isChecked = Boolean(checkedSourceAcks[key]);
                    return (
                      <div key={key}>
                      <label className="lesson-check-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedSourceAcks({
                              ...checkedSourceAcks,
                              [key]: e.target.checked,
                            });
                          }}
                        />
                        <div>
                          <strong>{src.label}</strong>
                          <div style={{ fontSize: "0.8rem", color: "var(--lesson-text-muted)" }}>
                            ID: <code>{src.id}</code> · Vị trí: <code>{src.locator}</code>
                          </div>
                        </div>
                      </label>
                      {sourceNeedsNumericReview(currentPackage?.tasks || [], src.id) && <label className="lesson-check-item">
                        <input type="checkbox" checked={Boolean(checkedNumericAcks[key])} onChange={event => setCheckedNumericAcks({ ...checkedNumericAcks, [key]: event.target.checked })} />
                        <span>Tôi đã đối chiếu số liệu thay đổi hoặc suy ra trong nhiệm vụ với nguồn trích dẫn này, kiểm tra phép biến đổi và đáp án.</span>
                      </label>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label className="task-label">Ghi chú đối soát (tùy chọn):</label>
                  <textarea
                    rows={2}
                    className="lesson-textarea"
                    placeholder="Nhập ghi chú hoặc biên bản đối soát học liệu..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    maxLength={2000}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    className="lesson-button lesson-button-outline"
                    onClick={() => setIsApproveOpen(false)}
                    disabled={isSubmittingApproval}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    className="lesson-button lesson-button-success"
                    onClick={handleApprove}
                    disabled={isSubmittingApproval}
                  >
                    {isSubmittingApproval ? "Đang phê duyệt..." : "Xác nhận & Phê duyệt"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 2: Launch Session */}
          {isLaunchOpen && (
            <div className="lesson-modal-backdrop" role="dialog" aria-modal="true">
              <div className="lesson-modal">
                <h2 className="lesson-modal-title">Khởi tạo phòng học</h2>

                {createdSessionData ? (
                  <div>
                    <div className="task-status-banner task-status-success" style={{ marginBottom: "1.5rem" }}>
                      <h3>Phòng học đã sẵn sàng!</h3>
                      <p>Mã tham gia của học sinh: <strong style={{ fontSize: "1.5rem", letterSpacing: "2px" }}>{createdSessionData.code}</strong></p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                      <button
                        className="lesson-button lesson-button-primary"
                        onClick={() => launchPresenterWithHandshake(createdSessionData.id)}
                      >
                        📺 Mở màn hình TV Trình chiếu (/presenter)
                      </button>
                      <button
                        className="lesson-button lesson-button-success"
                        onClick={() => {
                          setIsLaunchOpen(false);
                          setActiveTab("cockpit");
                        }}
                      >
                        🎛️ Vào phòng điều hành giáo viên
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label className="task-label">Chế độ phòng học:</label>
                      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="launchMode"
                            value="preview"
                            checked={launchMode === "preview"}
                            onChange={() => setLaunchMode("preview")}
                          />
                          <span><strong>Thử nghiệm</strong> - Cho phép bản thảo</span>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            cursor: canLaunchLive ? "pointer" : "not-allowed",
                            opacity: canLaunchLive ? 1 : 0.6,
                          }}
                        >
                          <input
                            type="radio"
                            name="launchMode"
                            value="live"
                            checked={launchMode === "live"}
                            onChange={() => setLaunchMode("live")}
                            disabled={!canLaunchLive}
                          />
                          <span><strong>Chính thức</strong> - Yêu cầu bài dạy và kế hoạch đã duyệt</span>
                        </label>
                      </div>
                      {launchMode === "live" && !canLaunchLive && (
                        <div className="task-status-banner task-status-pending" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                          {!isPackageApproved
                            ? "⚠️ Chưa thể tạo phòng chính thức: Gói bài dạy cần được phê duyệt nguồn học liệu trước."
                            : "⚠️ Chưa thể tạo phòng chính thức: Cần phê duyệt kế hoạch tổ chức trước. Hãy vào thẻ 'Kế hoạch tổ chức' để lấy bản thảo và phê duyệt."}
                        </div>
                      )}
                      {launchMode === "preview" && (
                        <p style={{ color: "var(--lesson-text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                          {isPlanApproved
                            ? "✓ Phòng thử nghiệm sẽ khởi chạy cùng Kế hoạch Đạo diễn đã duyệt."
                            : "Phòng thử nghiệm sẽ khởi chạy theo gói bài học."}
                        </p>
                      )}
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <label htmlFor="launch-title" className="task-label">Tiêu đề tiết học:</label>
                      <input
                        id="launch-title"
                        type="text"
                        className="lesson-input"
                        value={launchTitle}
                        onChange={(e) => setLaunchTitle(e.target.value)}
                        maxLength={120}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                      <button
                        className="lesson-button lesson-button-outline"
                        onClick={() => setIsLaunchOpen(false)}
                        disabled={isCreatingSession}
                      >
                        Đóng
                      </button>
                      <button
                        className="lesson-button lesson-button-primary"
                        onClick={handleCreateSession}
                        disabled={isCreatingSession || (launchMode === "live" && !canLaunchLive)}
                      >
                        {isCreatingSession ? "Đang tạo..." : "Bắt đầu tạo phòng"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Cockpit View */}
      {activeTab === "cockpit" && (
        <section className="lesson-cockpit">
          {cockpitError && (
            <div className="task-status-banner task-status-error" style={{ marginBottom: "1rem" }}>
              {cockpitError}
            </div>
          )}

          {/* Control bar: the clock, one primary action, and a menu for everything else */}
          {(() => {
            const status = cockpitView?.status;
            const rosterList = Object.values(cockpitView?.roster || {}) as Array<{ present?: boolean }>;
            const present = rosterList.filter((learner) => learner.present).length;
            const statusLabel = status === "active" ? "Đang diễn ra" : status === "paused" ? "Tạm dừng" : status === "concluded" ? "Đã kết thúc" : "Chờ bắt đầu";
            const closeMenu = () => setCockpitMenuOpen(false);
            return (
              <div className="cockpit-bar">
                <div className="cockpit-bar-left">
                  <div className={`cockpit-clock ${status === "paused" ? "cockpit-clock-paused" : ""}`} aria-label="Thời gian còn lại của hoạt động">
                    {formatDuration(getRemainingMs())}
                  </div>
                  <span className={`lesson-badge ${status === "active" ? "lesson-badge-success" : status === "paused" ? "lesson-badge-warning" : "lesson-badge-primary"}`}>{statusLabel}</span>
                  {createdSessionData?.code && (
                    <button
                      type="button"
                      className="cockpit-code"
                      title="Chạm để chép mã phòng"
                      onClick={() => {
                        void navigator.clipboard?.writeText(createdSessionData.code);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 1600);
                      }}
                    >
                      {codeCopied ? "Đã chép" : <>Mã phòng <strong>{createdSessionData.code}</strong></>}
                    </button>
                  )}
                  <span className="cockpit-count">{present}/{rosterList.length} em có mặt</span>
                </div>

                <div className="cockpit-bar-right">
                  {status === "active" && (
                    <button className="lesson-button lesson-button-outline" onClick={() => dispatchCommand("EXTEND", { minutes: 2 })} disabled={isCockpitBusy} title="Cộng thêm 2 phút cho hoạt động này">
                      +2 phút
                    </button>
                  )}

                  {status === "waiting" && (
                    <button className="lesson-button lesson-button-success" onClick={() => dispatchCommand("START")} disabled={isCockpitBusy}>
                      ▶️ Bắt đầu tiết học
                    </button>
                  )}
                  {status === "active" && (
                    <button className="lesson-button lesson-button-outline" onClick={() => dispatchCommand("PAUSE")} disabled={isCockpitBusy}>
                      ⏸️ Tạm dừng
                    </button>
                  )}
                  {status === "paused" && (
                    <button className="lesson-button lesson-button-primary" onClick={() => dispatchCommand("RESUME")} disabled={isCockpitBusy}>
                      ▶️ Tiếp tục
                    </button>
                  )}

                  <button
                    className="lesson-button lesson-button-primary"
                    onClick={() => dispatchCommand("NEXT", { force: true })}
                    disabled={isCockpitBusy || !["active", "paused"].includes(status || "")}
                  >
                    Tiếp theo ⏭️
                  </button>

                  {isArenaOpenEligible(cockpitView) && (
                    <button className="lesson-button arena-open-btn" onClick={() => dispatchCommand("ARENA_OPEN", {})} disabled={isCockpitBusy} title="Mở Lôi Đài Ngũ Ấn cho hoạt động hiện tại">
                      ⚔️ Mở Lôi Đài
                    </button>
                  )}
                  {isArenaSettleEligible(cockpitView) && (
                    <button className="lesson-button arena-settle-btn" onClick={() => dispatchCommand("ARENA_SETTLE", {})} disabled={isCockpitBusy} title="Chốt kết quả và trả thưởng Lôi Đài">
                      🏆 Chốt kết quả Lôi Đài
                    </button>
                  )}

                  <button className="lesson-button lesson-button-outline" onClick={() => activeSessionId && launchPresenterWithHandshake(activeSessionId)} title="Mở màn hình TV trình chiếu cho cả lớp">
                    📺 Mở TV
                  </button>

                  <div className="cockpit-more">
                    <button type="button" className="lesson-button lesson-button-outline cockpit-more-btn" aria-haspopup="menu" aria-expanded={cockpitMenuOpen} aria-label="Thêm tùy chọn" onClick={() => setCockpitMenuOpen((open) => !open)}>
                      ⋯
                    </button>
                    {cockpitMenuOpen && (
                      <div className="cockpit-more-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => { closeMenu(); setActiveTab("studio"); }}>Về bài soạn</button>
                        <a className="lesson-button lesson-button-outline" role="menuitem" href="/exams">Kiểm tra</a>
                        {cockpitView?.timeline?.locked ? (
                          <button type="button" role="menuitem" onClick={() => { closeMenu(); void dispatchCommand("UNLOCK"); }} disabled={isCockpitBusy}>
                            🔓 Mở khóa nộp bài
                          </button>
                        ) : (
                          <button type="button" role="menuitem" onClick={() => { closeMenu(); void dispatchCommand("LOCK"); }} disabled={isCockpitBusy}>
                            🔒 Khóa nộp bài
                          </button>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={async () => {
                            closeMenu();
                            const res = await rotatePresenterToken();
                            if (res.ok && res.presenterToken && activeSessionId) {
                              sessionStorage.setItem(`presenter_token_${activeSessionId}`, res.presenterToken);
                              alert("Đã cấp lại mã trình chiếu TV mới.");
                            }
                          }}
                        >
                          🔄 Đổi mã TV
                        </button>
                        <button type="button" role="menuitem" onClick={() => { closeMenu(); exportCockpitCsv(); }}>
                          📥 Xuất báo cáo CSV
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="cockpit-menu-danger"
                          onClick={() => {
                            closeMenu();
                            if (confirm("Kết thúc tiết học này?")) void dispatchCommand("CONCLUDE");
                          }}
                          disabled={isCockpitBusy}
                        >
                          ⏹️ Kết thúc tiết học
                        </button>
                        <span className="cockpit-menu-meta">Vòng {cockpitView?.round || 1} · Phiên bản {cockpitRevision}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="cockpit-workspace">
            <div className="cockpit-class-map">
              <h2 className="lesson-card-title">Bản đồ của lớp</h2>
              {cockpitView?.map && cockpitView.map.peers.length > 0 ? (() => {
                const peers = cockpitView.map.peers;
                const waiting = peers.filter(peer => !peer.chosen).length;
                const atGate = peers.filter(peer => peer.position >= (cockpitView.map?.gatePosition ?? Infinity)).length;
                return <>
                  <p className="lesson-muted">{peers.length} linh vật · {atGate} em đã tới cổng · {waiting > 0 ? `${waiting} em chưa chọn linh vật` : "Cả lớp đã chọn linh vật"}</p>
                  <LessonWorldMap map={cockpitView.map} themeKey={(cockpitView.gamePlan as { theme?: string } | undefined)?.theme} sessionKey={`cockpit-${activeSessionId || "room"}`} height={520} onPeerSelect={selectPeer} />
                </>;
              })() : <p className="lesson-muted">Bản đồ sẽ hiện khi học sinh vào phòng và chọn linh vật.</p>}
            </div>
            <aside className="cockpit-inspector">
              <LessonPeerInspector view={cockpitError ? null : cockpitView} selectedLearnerId={peerSelection?.sessionId === activeSessionId ? peerSelection.learnerId : null} onSelectLearner={selectLearner} onClose={() => setPeerSelection(null)} />
              <div className="lesson-tabs cockpit-panel-tabs" role="tablist" aria-label="Theo dõi lớp học">
                {([
                  ["attention", "Cần chú ý"], ["students", "Học sinh"], ["activity", "Hoạt động"],
                ] as const).map(([panel, label]) => <button key={panel} type="button" role="tab" id={`cockpit-tab-${panel}`} aria-controls={`cockpit-panel-${panel}`} aria-selected={cockpitPanel === panel} tabIndex={cockpitPanel === panel ? 0 : -1} className={`lesson-tab ${cockpitPanel === panel ? "lesson-tab-active" : ""}`} onClick={() => setCockpitPanel(panel)} onKeyDown={event => {
                  const panels = ["attention", "students", "activity"] as const;
                  const index = panels.indexOf(cockpitPanel);
                  const next = event.key === "ArrowRight" ? panels[(index + 1) % 3] : event.key === "ArrowLeft" ? panels[(index + 2) % 3] : event.key === "Home" ? panels[0] : event.key === "End" ? panels[2] : null;
                  if (next) { event.preventDefault(); setCockpitPanel(next); (event.currentTarget.parentElement?.querySelector(`#cockpit-tab-${next}`) as HTMLButtonElement | null)?.focus(); }
                }}>
                  {label}{panel === "attention" && cockpitPendingCount > 0 && <span className="lesson-badge lesson-badge-warning">{cockpitPendingCount}</span>}
                </button>)}
              </div>
          <div id="cockpit-panel-activity" role="tabpanel" aria-labelledby="cockpit-tab-activity" hidden={cockpitPanel !== "activity"}>
          {/* Lôi Đài Ngũ Ấn Cockpit Monitor */}
          {Boolean(cockpitView?.arena) && (
            <div className="lesson-card arena-cockpit-card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
              <div className="lesson-card-header">
                <h2 className="lesson-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>⚔️ Lôi Đài Ngũ Ấn</span>
                  <span className="lesson-badge lesson-badge-warning">
                    {getTeacherDisplay((cockpitView?.arena as { phase?: string })?.phase)}
                  </span>
                </h2>
              </div>
              <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: "var(--lesson-text-muted)" }}>
                Trận Lôi Đài đang hoạt động song song với buổi học. Đồng hồ hoạt động chính tạm dừng; kết quả thi đấu sẽ cộng thưởng riêng biệt vào ví điểm khi chốt.
              </p>
            </div>
          )}

          {/* Current Activity Progress */}
          {cockpitView?.package?.activities && (
            <div className="lesson-card" style={{ marginBottom: "1.5rem" }}>
              <div className="lesson-card-header">
                <h2 className="lesson-card-title">
                  {getPhaseDisplay(cockpitView.timeline?.currentPhase)}
                </h2>
                <span className="lesson-badge lesson-badge-primary">
                  {(cockpitView.timeline?.activityIndex || 0) + 1} / {cockpitView.package.activities.length}
                </span>
              </div>

              {(() => {
                const activities = (cockpitView.package?.activities || []) as Array<{
                  id: string;
                  studentAction?: string;
                  expectedProduct?: string;
                  phase?: string;
                  minutes?: number;
                  taskIds?: string[];
                }>;
                const tasks = (cockpitView.package?.tasks || []) as Array<{
                  id: string;
                  prompt?: string;
                  evaluation?: { answerKey?: unknown };
                }>;
                const currAct = activities[cockpitView.timeline?.activityIndex || 0];
                if (!currAct) return null;
                return (
                  <div>
                    <p><strong>Nhiệm vụ của học sinh:</strong> <MathText text={currAct.studentAction} /></p>
                    <p><strong>Sản phẩm kỳ vọng:</strong> {currAct.expectedProduct}</p>
                    {activities[(cockpitView.timeline?.activityIndex || 0) + 1] && <p className="lesson-muted"><strong>Tiếp theo:</strong> {getPhaseDisplay(activities[(cockpitView.timeline?.activityIndex || 0) + 1].phase)} · {activities[(cockpitView.timeline?.activityIndex || 0) + 1].minutes} phút</p>}
                    <details><summary>Tiến trình tiết học</summary><ol className="lesson-checklist">{activities.map((activity, index) => <li key={activity.id} aria-current={index === (cockpitView.timeline?.activityIndex || 0) ? "step" : undefined}>{getPhaseDisplay(activity.phase)} · {activity.minutes} phút</li>)}</ol></details>

                    {/* Tasks in Current Activity */}
                    <div style={{ marginTop: "1rem" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0" }}>Nhiệm vụ trong hoạt động:</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {(currAct.taskIds || []).map((tId: string) => {
                          const tObj = tasks.find((t) => t.id === tId);
                          const isRevealed = Boolean(cockpitView.reveals?.[tId]?.revealed);
                          return (
                            <div key={tId} className="lesson-section-box">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{tId}</strong>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  {isRevealed ? (
                                    <span className="lesson-badge lesson-badge-success">Đã công khai đáp án</span>
                                  ) : (
                                    <button
                                      className="lesson-button lesson-button-outline"
                                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                                      onClick={() => dispatchCommand("REVEAL", { taskId: tId })}
                                      disabled={isCockpitBusy}
                                    >
                                      Mở đáp án
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div style={{ margin: "0.5rem 0" }}>
                                <MathText text={tObj?.prompt} />
                              </div>
                              {tObj?.evaluation?.answerKey !== undefined && (
                                <small style={{ color: "var(--lesson-text-muted)" }}>
                                  Đáp án bài: {JSON.stringify(tObj.evaluation.answerKey)}
                                </small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>

          {/* Open Assessments Panel (Pending Student Submissions) */}
          <div id="cockpit-panel-attention" role="tabpanel" aria-labelledby="cockpit-tab-attention" hidden={cockpitPanel !== "attention"}>
          <div className="cockpit-attention-summary">
            <p><strong>{cockpitPendingCount} bài chờ chấm</strong> · {cockpitRoster.filter(learner => !learner.present).length} em vắng · {cockpitRoster.filter(learner => cockpitBranches[learner.id] === "support").length} em ở nhánh hỗ trợ</p>
            {(cockpitView?.map?.peers || []).some(peer => !peer.chosen) && <p>{cockpitView?.map?.peers.filter(peer => !peer.chosen).length} em chưa chọn linh vật.</p>}
          </div>
          <div className="cockpit-assess-panel">
            <h2 className="lesson-card-title" style={{ marginBottom: "1rem" }}>
              Bài tự luận và vé ra cửa
            </h2>
            {(() => {
              const openList = Object.values(cockpitView?.openAssessments || {}) as Array<{
                submissionId: string;
                learnerId: string;
                taskId: string;
                answer: unknown;
                status: string;
              }>;
              const pendingList = openList.filter((a) => a.status === "pending");

              if (pendingList.length === 0) {
                return (
                  <p style={{ color: "var(--lesson-text-muted)" }}>
                    Hiện không có bài làm tự luận nào đang chờ nhận xét.
                  </p>
                );
              }

              return (
                <div>
                  {pendingList.map((item) => {
                    const student = cockpitView?.roster?.[item.learnerId];
                    const isSelected = assessingSubId === item.submissionId;
                    return (
                      <details key={item.submissionId} className="cockpit-assess-item">
                        <summary style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", cursor: "pointer" }}>
                          <strong>
                            Học sinh: {student?.name || item.learnerId} ({item.taskId})
                          </strong>
                          <span className="lesson-badge lesson-badge-warning">Chờ chấm</span>
                        </summary>

                        <div style={{ background: "var(--lesson-surface)", padding: "0.75rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
                          <strong>Bài làm của học sinh:</strong>
                          <p style={{ margin: "0.25rem 0 0 0" }}>
                            {typeof item.answer === "object" ? JSON.stringify(item.answer) : String(item.answer ?? "")}
                          </p>
                        </div>

                        {isSelected ? (
                          <div style={{ marginTop: "1rem" }}>
                            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  checked={assessCriteriaMet === true}
                                  onChange={() => setAssessCriteriaMet(true)}
                                />
                                <span>Đạt yêu cầu</span>
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  checked={assessCriteriaMet === false}
                                  onChange={() => setAssessCriteriaMet(false)}
                                />
                                <span>Chưa đạt</span>
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.5rem" }}>
                              <textarea
                                rows={2}
                                className="lesson-textarea"
                                placeholder="Nhập nhận xét hướng dẫn cho học sinh..."
                                value={assessFeedback}
                                onChange={(e) => setAssessFeedback(e.target.value)}
                              />
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="lesson-button lesson-button-primary"
                                onClick={() => handleSubmitAssessment(item.submissionId)}
                                disabled={isCockpitBusy}
                              >
                                Lưu đánh giá
                              </button>
                              <button
                                className="lesson-button lesson-button-outline"
                                onClick={() => setAssessingSubId(null)}
                              >
                                Đóng
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="lesson-button lesson-button-outline"
                            onClick={() => {
                              setAssessingSubId(item.submissionId);
                              setAssessCriteriaMet(true);
                              setAssessFeedback("");
                            }}
                          >
                            Chấm bài học sinh này
                          </button>
                        )}
                      </details>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          </div>

          {/* Roster & Learner Progress */}
          <div id="cockpit-panel-students" role="tabpanel" aria-labelledby="cockpit-tab-students" hidden={cockpitPanel !== "students"}>
          <div className="lesson-card">
            <h2 className="lesson-card-title">
              Danh sách học sinh ({cockpitRoster.length})
            </h2>
            <div className="cockpit-roster-tools">
              <input className="lesson-input" type="search" aria-label="Tìm học sinh" placeholder="Tìm học sinh..." value={learnerSearch} onChange={event => setLearnerSearch(event.target.value)} />
              <select className="lesson-select" aria-label="Sắp xếp học sinh" value={learnerSort} onChange={event => setLearnerSort(event.target.value)}><option value="name">Theo tên</option><option value="absent">Vắng trước</option></select>
            </div>
            <div className="cockpit-table-container">
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Có mặt</th>
                    <th>Phân nhánh</th>
                    <th>Điểm tích lũy</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filterCockpitRoster(cockpitRoster, learnerSearch, learnerSort).map((learner) => {
                    const currentActId = cockpitView?.timeline?.currentActivityId || "";
                    const branchesMap = (cockpitView?.branches?.[currentActId] || {}) as Record<string, string>;
                    const learnerBranch = branchesMap[learner.id] || "core";
                    const walletsMap = (cockpitView?.gameWallets?.learners || {}) as Record<string, { earned: number }>;
                    const wallet = walletsMap[learner.id] || { earned: 0 };
                    return (
                      <tr key={learner.id}>
                        <td><strong>{learner.name}</strong></td>
                        <td>
                          <span
                            className={`lesson-badge ${
                              learner.present ? "lesson-badge-success" : "lesson-badge-danger"
                            }`}
                          >
                            {learner.present ? "Có mặt" : "Vắng"}
                          </span>
                        </td>
                        <td>
                          <select
                            className="lesson-select"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", width: "auto" }}
                            value={learnerBranch}
                            onChange={(e) => {
                              void dispatchCommand("SET_BRANCH", {
                                learnerId: learner.id,
                                branch: e.target.value,
                              });
                            }}
                          >
                            <option value="core">Cốt lõi</option>
                            <option value="support">Hỗ trợ</option>
                          </select>
                        </td>
                        <td>{wallet.earned} điểm</td>
                        <td>
                          <button
                            className="lesson-button lesson-button-outline"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => {
                              const passportsMap = (cockpitView?.passports || {}) as Record<string, { submissions?: unknown[] }>;
                              alert(`Minh chứng của ${learner.name}: ${JSON.stringify(passportsMap[learner.id]?.submissions || [])}`);
                            }}
                          >
                            Xem minh chứng
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
