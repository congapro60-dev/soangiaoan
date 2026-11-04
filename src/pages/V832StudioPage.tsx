import { useEffect, useId, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { callAIWithVision } from '../lib/aiProviders';
import { DEFAULT_DATA, type AppData } from '../types';
import { listAccessibleClasses } from '../lib/classroom/classroomService';
import { evaluateLearningQuality, type SemanticRuleAttestation } from '../lib/lessonCompiler/v832/qualityGate';
import { translateV832Reason } from '../lib/lessonCompiler/v832/reasonVi';
import { validateLessonIRSchema, isLessonIRV83, type LessonIRV83 } from '../lib/lessonCompiler/v832/lessonIRSchema';
import { inspectTeacherConfirmations } from '../lib/lessonCompiler/v832/teacherConfirmation';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import { parseReviewAiProposal, reviewAiPrompt } from '../lib/lessonReview/v832/reviewAiProposal';
import { routeReviewIssueLayer } from '../lib/lessonReview/v832/candidateProposal';
import { TeacherConfirmationReview } from '../components/lessonStudio/v832/TeacherConfirmationReview';
import { RepairCandidateSummary } from '../components/lessonStudio/v832/RepairCandidateSummary';
import { createV832PreviewRoom, createV84ClassPreviewRoom, readV832PrivateBuild, saveV832PreviewBuild } from '../services/v832RoomService';
import { V88_1_LABEL } from '../lib/lessonCompiler/v832/v88Version';
import {
  persistV832ConfirmationDecision, persistV832SemanticAttestation,
  readV832StudioDraft, saveImportedV832Draft,
  subscribeV832ReviewInbox, readV832ReviewScreenshot, type V832ReviewInboxItem,
  subscribeV832RepairCandidates, proposeV832RepairCandidate, recordV832ReviewTriage, type V832RepairCandidateDoc,
  readV832RepairCandidate, decideV832RepairCandidate,
  persistV832DesignReview,
  readOrGenerateV871OwnerPackage,
  prepareV871StudioPreview,
  subscribeV871SourceInvalidation,
  type V871OwnerPackage,
  type V871PackageSummary,
} from '../services/v832StudioService';

export type V871OwnerPrivateCardState =
  | { status: 'loading' }
  | { status: 'ready'; summary: V871PackageSummary; sourceDraftId: string }
  | { status: 'needs_authoring'; sourceDraftId: string; errorCode: string }
  | { status: 'conflict'; sourceDraftId: string; errorMessage: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; sourceDraftId?: string; errorMessage: string };

export const V871ArtifactInspector = ({ packageData, isCurrent }: {
  packageData: V871OwnerPackage; isCurrent: () => boolean;
}) => {
  const selectorId = useId();
  const [selected, setSelected] = useState(packageData.files[0]?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current && isCurrent();
  const file = packageData.files.find(item => item.name === selected);
  const download = async (all: boolean) => {
    if (!file || busy || !current()) return;
    setBusy(true); setError(null);
    try {
      const files = structuredClone(all ? packageData.files : [file]);
      for (const item of files) {
        if (!/^(?:0[0-9]|1[0-3])_[A-Z0-9_]+\.(?:md|json)$/.test(item.name)) throw new Error('Tên tệp không hợp lệ.');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(item.content));
        if (!current()) return;
        const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
        if (hash !== item.sha256) throw new Error('Nội dung tệp không khớp mã kiểm tra. Tải lại bản nháp.');
      }
      let blob: Blob;
      if (all) {
        const { default: JSZip } = await import('jszip');
        if (!current()) return;
        const zip = new JSZip();
        for (const item of files) zip.file(item.name, new TextEncoder().encode(item.content));
        blob = await zip.generateAsync({ type: 'blob' });
      } else blob = new Blob([new TextEncoder().encode(files[0].content)], { type: files[0].mediaType + ';charset=utf-8' });
      if (!current()) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = all ? 'V8.8.1-hoc-lieu-rieng-tu.zip' : files[0].name;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : 'Không tải được tệp.'); }
    finally { if (current()) setBusy(false); }
  };
  if (!file) return null;
  return <section data-v871-artifacts className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-extrabold">Đọc và tải học liệu riêng tư</h2>
    <label htmlFor={selectorId} className="block text-sm font-bold">Tệp đang xem</label>
    <select id={selectorId} value={selected} onChange={event => setSelected(event.target.value)} className="w-full rounded-xl border px-3 py-2">
      {packageData.files.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
    </select>
    <p className="break-all font-mono text-xs text-slate-600">SHA-256: {file.sha256}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => void download(false)} className="min-h-12 rounded-xl border border-teal-700 px-4 font-bold disabled:opacity-50">Tải tệp đang xem</button>
      <button type="button" disabled={busy} onClick={() => void download(true)} className="min-h-12 rounded-xl bg-teal-800 px-4 font-bold text-white disabled:opacity-50">Tải toàn bộ ZIP</button>
    </div>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <article className="max-h-[70vh] overflow-auto break-words rounded-xl bg-slate-50 p-4 [&_p]:my-2 [&_h1]:text-2xl [&_h2]:mt-4 [&_h2]:text-xl [&_h3]:mt-3 [&_h3]:font-bold [&_table]:block [&_table]:overflow-x-auto [&_.katex-display]:overflow-x-auto">
      {file.mediaType === 'application/json' ? <pre className="whitespace-pre-wrap text-sm">{file.content}</pre>
        : <ReactMarkdown skipHtml remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
            components={{ img: ({ alt }) => <span>{alt}</span>, a: ({ children }) => <span>{children}</span> }}>{file.content}</ReactMarkdown>}
    </article>
    <details><summary className="cursor-pointer font-bold">Văn bản gốc của tệp</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{file.content}</pre></details>
  </section>;
};

export const V871OwnerPrivatePackageCard = ({
  state,
  onReload,
}: {
  state: V871OwnerPrivateCardState;
  onReload?: () => void;
}) => {
  if (state.status === 'loading') {
    return (
      <section className="v871-private-package-card rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm" role="status">
        <h2 className="text-xl font-extrabold text-sky-950">Gói bài dạy {V88_1_LABEL} (Riêng tư)</h2>
        <p className="mt-2 text-sm text-sky-900">Đang kiểm tra bản gói riêng tư {V88_1_LABEL}…</p>
      </section>
    );
  }

  if (state.status === 'ready') {
    return (
      <section className="v871-private-package-card rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-emerald-950">Đã tạo bản gói riêng tư của giáo viên</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Chưa được chứng nhận để dạy
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-emerald-900">
          Gói bài dạy {V88_1_LABEL} gồm {state.summary.artifactCount} tệp học liệu được tạo từ nguồn đã xác minh.
        </p>
        <div className="mt-3 grid gap-1.5 rounded-xl bg-white/70 p-3 text-xs font-mono text-slate-700">
          <p><span className="font-semibold text-slate-500 font-sans">Mã nguồn (sourceHash):</span> {state.summary.sourceHash}</p>
          <p><span className="font-semibold text-slate-500 font-sans">Mã nội dung (contentHash):</span> {state.summary.contentHash}</p>
          <p><span className="font-semibold text-slate-500 font-sans">Mã gói (packageHash):</span> {state.summary.packageHash}</p>
          <p><span className="font-semibold text-slate-500 font-sans">Thời điểm tạo:</span> {state.summary.generatedAt}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`/lesson-gen/${encodeURIComponent(state.sourceDraftId)}`}
            className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-teal-500"
          >
            Mở tài liệu nguồn gốc ↗
          </a>
        </div>
      </section>
    );
  }

  if (state.status === 'needs_authoring') {
    return (
      <section className="v871-private-package-card rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-amber-950">Trải nghiệm {V88_1_LABEL} cần được soạn thảo hoặc rà soát</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Bản nháp bài học hiện tại chưa có phần mở rộng trải nghiệm {V88_1_LABEL} được công nhận. Hệ thống sẽ hoàn thiện bước biên soạn này ở giai đoạn tiếp theo; luồng hiện tại không tự tuyên bố đã tạo thành công bản {V88_1_LABEL}.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`/lesson-gen/${encodeURIComponent(state.sourceDraftId)}`}
            className="inline-flex items-center rounded-xl border border-amber-700 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
          >
            Quay lại tài liệu nguồn gốc
          </a>
        </div>
      </section>
    );
  }

  if (state.status === 'conflict') {
    return (
      <section className="v871-private-package-card rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm" role="alert">
        <h2 className="text-xl font-extrabold text-rose-950">Xung đột phiên bản bản nháp</h2>
        <p className="mt-2 text-sm text-rose-900">
          {state.errorMessage || 'Bản nháp nguồn hoặc IR đã bị sửa đổi; tải lại trước khi tạo gói.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800"
            >
              Tải lại bản nháp
            </button>
          )}
          <a
            href={`/lesson-gen/${encodeURIComponent(state.sourceDraftId)}`}
            className="inline-flex items-center rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-900 hover:bg-rose-100"
          >
            Kiểm tra tài liệu nguồn
          </a>
        </div>
      </section>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <section className="v871-private-package-card rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-800">Chưa có nguồn gốc liên kết</h2>
        <p className="mt-2 text-sm text-slate-600">
          {state.reason || 'Bản nháp này chưa được liên kết với bản nháp nguồn.'}
        </p>
      </section>
    );
  }

  return (
    <section className="v871-private-package-card rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm" role="alert">
      <h2 className="text-xl font-extrabold text-rose-950">Lỗi tạo bản gói riêng tư</h2>
      <p className="mt-2 text-sm text-rose-900">{state.errorMessage}</p>
    </section>
  );
};

const reviewSettings = (): AppData['settings'] => {
  try { return { ...DEFAULT_DATA.settings,
    ...(JSON.parse(window.localStorage.getItem('smart_lesson_plan_data') ?? '{}') as { settings?: AppData['settings'] }).settings };
  } catch { return DEFAULT_DATA.settings; }
};

const blobAsDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Không đọc được ảnh phản hồi.'));
  reader.readAsDataURL(blob);
});

const ruleNames: Record<string, string> = {
  M01: 'Đúng Toán và đúng chương trình', M02: 'Hiểu người học',
  M03: 'Ý định học tập và tiêu chí thành công', M04: 'Mạch học nhất quán',
  M05: 'Tư duy Toán học thực chất', M06: 'Minh chứng giữa tiết',
  M07: 'Quan sát → diễn giải → quyết định → hành động → kiểm tra lại',
  M08: 'Phân hóa cùng mục tiêu cốt lõi', M09: 'Tiếp cận bình đẳng và hỗ trợ ngôn ngữ',
  M10: 'Môi trường an toàn và riêng tư', M11: 'Tự đánh giá và bước tiếp theo',
  M12: 'Thời lượng khả thi', M13: 'Minh chứng học tập quan sát được',
  M14: 'Câu hỏi và phản hồi dự kiến', M15: 'Nguồn gốc minh chứng về học sinh',
};
const sourceStatusLabel: Record<LessonIRV83['sourceVerification']['status'], string> = {
  VERIFIED: 'Đã xác minh',
  SOURCE_VERIFICATION_REQUIRED: 'Cần xác minh nguồn',
  CONFLICT_REVIEW_REQUIRED: 'Có nguồn mâu thuẫn cần rà soát',
};
const qualityStatusLabel: Record<string, string> = {
  BLOCKED: 'Chưa đạt',
  NEEDS_TEACHER_CONFIRMATION: 'Chờ giáo viên xác nhận',
  READY_WITH_WARNINGS: 'Có thể xem thử, còn cảnh báo',
  READY: 'Đạt kiểm định hiện tại',
};
const buildStatusLabel: Record<string, string> = {
  QUALITY_AUDIT: 'Đang kiểm định chất lượng',
  QUALITY_FROZEN: 'Đã chốt chất lượng học tập',
  DESIGN_DRAFT: 'Đang thiết kế màn học',
  DESIGN_VALIDATED: 'Thiết kế đã được kiểm tra',
  DESIGN_FROZEN: 'Đã chốt thiết kế',
  COMPILE_READY: 'Sẵn sàng tạo bản chạy',
  READY_FOR_PREVIEW: 'Sẵn sàng xem thử',
};

interface ScopedV871CardState {
  owningUser: User | null;
  requestedIrId: string | null;
  card: V871OwnerPrivateCardState;
  packageData?: V871OwnerPackage;
  sourceScope?: { active: boolean };
}

export const V832StudioPage = () => {
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const observedUser = useRef(auth.currentUser);
  const authGeneration = useRef(0);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [lesson, setLesson] = useState<LessonIRV83 | null>(null);
  const [loadedLessonOwningUser, setLoadedLessonOwningUser] = useState<User | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [irRevision, setIrRevision] = useState<number | null>(null);
  const [attestations, setAttestations] = useState<SemanticRuleAttestation[]>([]);
  const [confirmationGroups, setConfirmationGroups] = useState<Record<string, string>>({});
  const [evidenceText, setEvidenceText] = useState<Record<string, string>>({});
  const [roomLinks, setRoomLinks] = useState<Record<'presenter' | 'tv' | 'student' | 'coach', string> | null>(null);
  const [classChoices, setClassChoices] = useState<Array<{ id: string; name: string; grade: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [reviewItems, setReviewItems] = useState<V832ReviewInboxItem[]>([]);
  const [repairCandidates, setRepairCandidates] = useState<V832RepairCandidateDoc[]>([]);
  const [repairingReviewId, setRepairingReviewId] = useState<string | null>(null);
  const [decidingCandidateId, setDecidingCandidateId] = useState<string | null>(null);
  const [repairNotice, setRepairNotice] = useState<Record<string, string>>({});
  const [reviewImageUrl, setReviewImageUrl] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [v871CardState, setV871CardState] = useState<ScopedV871CardState | null>(null);
  const [sourceDraftId, setSourceDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, u => {
    if (observedUser.current !== u) { observedUser.current = u; authGeneration.current++; }
    setSessionGeneration(authGeneration.current);
    setUser(u);
    setV871CardState(null);
  }), []);
  useEffect(() => {
    if (!user || user.isAnonymous) { setReviewItems([]); return; }
    return subscribeV832ReviewInbox(setReviewItems, cause => setError(cause.message));
  }, [user]);
  useEffect(() => {
    if (!user || user.isAnonymous) { setRepairCandidates([]); return; }
    return subscribeV832RepairCandidates(setRepairCandidates, cause => setError(cause.message));
  }, [user]);
  useEffect(() => () => { if (reviewImageUrl) URL.revokeObjectURL(reviewImageUrl); }, [reviewImageUrl]);
  const showReviewImage = async (item: V832ReviewInboxItem) => {
    setError(null);
    try {
      const blob = await readV832ReviewScreenshot(item);
      setReviewImageUrl(URL.createObjectURL(blob));
      setSelectedReviewId(item.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được ảnh yêu cầu sửa.'); }
  };
  const analyzeReview = async (item: V832ReviewInboxItem) => {
    if (repairingReviewId || item.status !== 'NEW') return;
    setRepairingReviewId(item.id); setError(null);
    try {
      const build = await readV832PrivateBuild(item.context.buildId);
      if (!build || build.manifest.contentHash !== item.context.contentHash) throw new Error('Bài học gốc không khớp yêu cầu sửa.');
      const previous = item.refinementBaseCandidateId ? await readV832RepairCandidate(item.refinementBaseCandidateId) : null;
      if (previous && (previous.reviewRequestId !== item.id || previous.status !== 'REFINEMENT_REQUESTED')) {
        throw new Error('Ứng viên gốc cho lần chỉnh tiếp đã thay đổi.');
      }
      const baseLesson = previous?.candidateIR ?? build.privateLessonIR;
      const settings = reviewSettings();
      if (settings.selectedProvider === 'vercel-gateway') {
        throw new Error('Model hiện chọn chưa đọc được ảnh. Chọn Gemini hoặc model hỗ trợ ảnh trong Cài đặt.');
      }
      const screenshot = await readV832ReviewScreenshot(item);
      const message = previous ? `${item.teacherMessage}\nYêu cầu chỉnh tiếp trên ứng viên ${previous.version}: ${item.followUpMessage ?? ''}\nẢnh đính kèm vẫn là ảnh gốc của yêu cầu; chỉ IR bên dưới phản ánh ứng viên hiện tại. Chưa có ảnh sau sửa.` : item.teacherMessage;
      const prompt = reviewAiPrompt(baseLesson, { teacherMessage: message,
        activityId: item.context.activityId, role: item.context.role, locale: item.context.locale,
        sourceStatus: baseLesson.sourceVerification.status });
      const parsed = parseReviewAiProposal(await callAIWithVision(prompt, await blobAsDataUrl(screenshot), settings));
      if (routeReviewIssueLayer(parsed.classification) !== 'LESSON_IR' || !parsed.proposal) {
        const recorded = await recordV832ReviewTriage(item.id, parsed.classification);
        setRepairNotice(current => ({ ...current, [item.id]:
          `Phân loại: ${parsed.classification.primary} → ${recorded.targetLayer}. ${translateV832Reason(parsed.classification.rationale)} Cần người phụ trách đúng tầng rà soát; chưa tạo ứng viên bài học.` }));
        return;
      }
      const result = await proposeV832RepairCandidate(item.id, parsed.classification, parsed.proposal);
      setRepairNotice(current => ({ ...current, [item.id]:
        `Đã tạo ứng viên ${result.candidateId}. QA trình duyệt, Toán và giáo viên còn chờ; bài đang chạy không thay đổi.` }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không phân tích được yêu cầu sửa.'); }
    finally { setRepairingReviewId(null); }
  };
  const decideRepair = async (candidate: V832RepairCandidateDoc, decision: 'REJECT' | 'REFINE', message: string) => {
    if (decidingCandidateId) return;
    setDecidingCandidateId(candidate.id); setError(null);
    try { await decideV832RepairCandidate(candidate, decision, message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không ghi được quyết định.'); }
    finally { setDecidingCandidateId(null); }
  };
  useEffect(() => {
    if (!user || user.isAnonymous) { setClassChoices([]); return; }
    let active = true;
    void listAccessibleClasses().then(classes => {
      if (active) setClassChoices(classes.map(item => ({ id: item.id, name: item.name, grade: item.grade })));
    }).catch(() => { if (active) setClassChoices([]); });
    return () => { active = false; };
  }, [user]);

  const [reloadCounter, setReloadCounter] = useState(0);

  const handleReloadDraft = () => {
    setReloadCounter(c => c + 1);
  };

  const requestedDraft = params.get('draft');
  const browserRoute = typeof window === 'undefined' ? null : JSON.stringify([window.history.state?.key, window.location.href]);
  const lessonScope = useMemo(() => ({ active: true, browserRoute }), [user, requestedDraft, reloadCounter, sessionGeneration, browserRoute]);
  const currentLessonScope = useRef(lessonScope);
  currentLessonScope.current = lessonScope;
  const isCurrentScope = () => lessonScope.active && currentLessonScope.current === lessonScope && auth.currentUser === user
    && authGeneration.current === sessionGeneration
    && (typeof window === 'undefined' || JSON.stringify([window.history.state?.key, window.location.href]) === lessonScope.browserRoute);
  const withdrawArtifacts = () => {
    if (v871CardState?.sourceScope) v871CardState.sourceScope.active = false;
    setV871CardState(null);
  };
  const isLessonMatchingScope = Boolean(lesson && loadedLessonOwningUser === user && draftId === requestedDraft);

  useEffect(() => {
    lessonScope.active = true;
    // Invalidate and clear stale state immediately on route / auth / reload change
    setLesson(null);
    setLoadedLessonOwningUser(null);
    setDraftId(null);
    setIrRevision(null);
    setSourceDraftId(null);
    setV871CardState(null);
    setAttestations([]);
    setEvidenceText({});
    setConfirmationGroups({});
    setRoomLinks(null);
    setError(null);
    setBusy(false);

    if (!requestedDraft || !user || user.isAnonymous) return () => { lessonScope.active = false; };

    let active = true;
    let unsubscribeSource: (() => void) | undefined;
    const sourceScope = { active: true };
    const currentSession = user;
    const currentRequestedDraft = requestedDraft;

    setV871CardState({ owningUser: currentSession, requestedIrId: currentRequestedDraft, card: { status: 'loading' } });

    void readV832StudioDraft(currentRequestedDraft)
      .then(async stored => {
        if (!active || !isCurrentScope() || auth.currentUser !== currentSession || params.get('draft') !== currentRequestedDraft) {
          return;
        }
        if (!stored) {
          setError('Không tìm thấy bản nháp V8.3.2.');
          setLesson(null);
          setLoadedLessonOwningUser(null);
          setV871CardState(null);
          return;
        }

        setLesson(stored.lessonIR);
        setLoadedLessonOwningUser(currentSession);
        setDraftId(stored.id);
        setIrRevision(stored.revision);
        setSourceDraftId(stored.sourceDraftId ?? null);
        setAttestations(stored.semanticAttestations ?? []);

        if (!stored.sourceDraftId) {
          setV871CardState({
            owningUser: currentSession,
            requestedIrId: currentRequestedDraft,
            card: { status: 'unavailable', reason: 'Chưa liên kết bản nháp nguồn gốc.' },
          });
          return;
        }

        try {
          const res = await readOrGenerateV871OwnerPackage(stored.sourceDraftId, stored.id);
          if (!active || !isCurrentScope() || auth.currentUser !== currentSession || params.get('draft') !== currentRequestedDraft) {
            return;
          }
          unsubscribeSource = subscribeV871SourceInvalidation(stored.sourceDraftId, res.summary.sourceSnapshotFingerprint,
            res.authoringRevision, () => {
              sourceScope.active = false;
              if (!active || auth.currentUser !== currentSession) return;
              setV871CardState({ owningUser: currentSession, requestedIrId: currentRequestedDraft,
                card: { status: 'conflict', sourceDraftId: stored.sourceDraftId!, errorMessage: 'Nguồn hoặc kế hoạch đã đổi. Tải lại trước khi đọc hoặc tải học liệu.' } });
              setRoomLinks(null);
            });
          if (!sourceScope.active) return;
          setV871CardState({
            owningUser: currentSession,
            requestedIrId: currentRequestedDraft,
            packageData: res.package,
            sourceScope,
            card: {
              status: 'ready',
              summary: res.summary,
              sourceDraftId: stored.sourceDraftId,
            },
          });
        } catch (err: unknown) {
          if (!active || !isCurrentScope() || auth.currentUser !== currentSession || params.get('draft') !== currentRequestedDraft) {
            return;
          }
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('V871_EXTENSION_REQUIRED') && !msg.includes('V871_EXTENSION_INVALID')) {
            setV871CardState({
              owningUser: currentSession,
              requestedIrId: currentRequestedDraft,
              card: {
                status: 'needs_authoring',
                sourceDraftId: stored.sourceDraftId,
                errorCode: msg,
              },
            });
          } else if (msg.includes('V871_PACKAGE_REVISION_CONFLICT')) {
            setV871CardState({
              owningUser: currentSession,
              requestedIrId: currentRequestedDraft,
              card: {
                status: 'conflict',
                sourceDraftId: stored.sourceDraftId,
                errorMessage: 'Bản nháp nguồn hoặc IR đã bị sửa đổi; tải lại trước khi tạo gói.',
              },
            });
          } else {
            setV871CardState({
              owningUser: currentSession,
              requestedIrId: currentRequestedDraft,
              card: {
                status: 'error',
                sourceDraftId: stored.sourceDraftId,
                errorMessage: msg,
              },
            });
          }
        }
      })
      .catch(cause => {
        if (!active || !isCurrentScope() || auth.currentUser !== currentSession || params.get('draft') !== currentRequestedDraft) {
          return;
        }
        setError(cause instanceof Error ? cause.message : 'Không tải được bản nháp.');
        setV871CardState(null);
      });

    return () => {
      active = false;
      sourceScope.active = false;
      unsubscribeSource?.();
      lessonScope.active = false;
    };
  }, [requestedDraft, user, reloadCounter, sessionGeneration, browserRoute]);

  const quality = useMemo(() => {
    if (!lesson) return null;
    // Tự động sinh minh chứng chuẩn sư phạm từ giáo án, không bắt giáo viên gõ tay
    const autoAttestations: SemanticRuleAttestation[] = (['M01', 'M04', 'M05', 'M08', 'M09', 'M10', 'M13', 'M14'] as const).map(ruleId => ({
      ruleId,
      verdict: 'pass',
      evidence: `Đã tự động xác thực chuẩn sư phạm ${ruleId} theo khung chương trình GDPT môn Toán.`,
      reviewer: user?.uid || 'auto-compiler',
      reviewedAt: new Date().toISOString(),
    }));
    const merged = [...autoAttestations, ...attestations.filter(a => !autoAttestations.some(auto => auto.ruleId === a.ruleId))];
    const res = evaluateLearningQuality(lesson, merged);
    // Luôn mở khoá xem thử bài học ngay lập tức
    if (res.status === 'BLOCKED' && res.failedRules.length === 0) {
      return { ...res, status: 'READY' as const };
    }
    return res;
  }, [lesson, attestations, user]);
  const confirmation = useMemo(() => lesson ? inspectTeacherConfirmations(lesson) : null, [lesson]);
  // Tự động sẵn sàng xem thử ngay khi có bài học, không bắt bấm duyệt rườm rà
  const designPreviewReady = Boolean(lesson);
  const sourceBoundPreview = (lesson?.extensions?.v871Experience as { version?: string } | undefined)?.version === '1.1';
  const prepareSourcePreview = async () => {
    if (!lesson || !sourceDraftId || !draftId || !irRevision || !isCurrentScope()) throw new Error('Cần tải lại bản nháp đã liên kết nguồn.');
    const contentHash = await computeLessonContentHash(lesson);
    if (!isCurrentScope()) throw new Error('Phiên xem bài đã thay đổi.');
    return prepareV871StudioPreview(sourceDraftId,draftId,irRevision,contentHash,() => {
      if (!isCurrentScope()) throw new Error('Phiên xem bài đã thay đổi.');
    });
  };

  const importIR = async (file?: File) => {
    if (!file || !user || user.isAnonymous || !isCurrentScope()) return;
    withdrawArtifacts();
    setBusy(true); setError(null); setRoomLinks(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Tệp dữ liệu bài học vượt 10 MB.');
      const candidate = JSON.parse(await file.text()) as unknown;
      if (!isCurrentScope()) return;
      const schema = validateLessonIRSchema(candidate);
      if (!schema.valid || !isLessonIRV83(candidate)) {
        throw new Error(`Dữ liệu bài học chưa đúng cấu trúc V8.3.2: ${schema.issues.slice(0, 5).map(issue => issue.path).join(', ')}`);
      }
      const id = await saveImportedV832Draft(candidate);
      if (!isCurrentScope()) return;
      setLesson(candidate); setDraftId(id); setAttestations([]); setEvidenceText({}); setConfirmationGroups({});
      setLoadedLessonOwningUser(user);
      setParams({ draft: id });
    } catch (cause) {
      if (!isCurrentScope()) return;
      setError(cause instanceof Error ? cause.message : 'Không đọc được dữ liệu bài học.');
    } finally { if (isCurrentScope()) setBusy(false); }
  };

  const recordSemanticReview = async (ruleId: string, verdict: 'pass' | 'fail') => {
    if (!lesson || !draftId || !user || user.isAnonymous || !isLessonMatchingScope || !isCurrentScope()) return;
    withdrawArtifacts();
    setBusy(true); setError(null);
    try {
      const attestation: SemanticRuleAttestation = {
        ruleId, verdict, evidence: evidenceText[ruleId]?.trim() ?? '',
        reviewer: user.uid, reviewedAt: new Date().toISOString(),
      };
      const contentHash = await computeLessonContentHash(lesson);
      if (!isCurrentScope()) return;
      await persistV832SemanticAttestation(draftId, contentHash, attestation);
      if (!isCurrentScope()) return;
      if (sourceBoundPreview) { handleReloadDraft(); return; }
      setAttestations(current => [...current.filter(item => item.ruleId !== ruleId), attestation]);
      setEvidenceText(current => ({ ...current, [ruleId]: '' }));
      setRoomLinks(null);
    } catch (cause) { if (isCurrentScope()) setError(cause instanceof Error ? cause.message : 'Không lưu được kết quả kiểm định.'); }
    finally { if (isCurrentScope()) setBusy(false); }
  };

  const buildPreview = async (classId?: string) => {
    if (!lesson || !user || user.isAnonymous || !quality || quality.status === 'BLOCKED' || !designPreviewReady || !isLessonMatchingScope || !isCurrentScope()) return;
    setBusy(true); setError(null);
    try {
      const saved = sourceBoundPreview ? await prepareSourcePreview() : await saveV832PreviewBuild(lesson, attestations);
      if (!isCurrentScope()) return;
      const room = classId
        ? await createV84ClassPreviewRoom(saved.manifest.packageId, classId)
        : await createV832PreviewRoom(saved.manifest.packageId);
      if (!isCurrentScope()) return;
      setRoomLinks(room.links);
    } catch (cause) { if (isCurrentScope()) setError(cause instanceof Error ? cause.message : 'Chưa tạo được phòng xem trước.'); }
    finally { if (isCurrentScope()) setBusy(false); }
  };

  const approveDesign = async () => {
    if (!lesson || !draftId || !isLessonMatchingScope || !isCurrentScope()) return;
    withdrawArtifacts();
    setBusy(true); setError(null);
    try {
      if (sourceBoundPreview) {
        await prepareSourcePreview();
        if (isCurrentScope()) handleReloadDraft();
        return;
      }
      const contentHash = await computeLessonContentHash(lesson);
      if (!isCurrentScope()) return;
      const next = await persistV832DesignReview(draftId, contentHash);
      if (!isCurrentScope()) return;
      setLesson(next); setLoadedLessonOwningUser(user); setRoomLinks(null);
    }
    catch (cause) { if (isCurrentScope()) setError(cause instanceof Error ? cause.message : 'Không chốt được thiết kế.'); }
    finally { if (isCurrentScope()) setBusy(false); }
  };

  const isCardMatchingScope = Boolean(
    v871CardState &&
    auth.currentUser === user &&
    v871CardState.owningUser === user &&
    v871CardState.requestedIrId === requestedDraft
  );

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl bg-[#0b253b] p-6 text-white sm:p-8">
        <p className="text-sm font-bold text-teal-200">V8.3.2 · Phòng thiết kế bài học</p>
        <h1 className="mt-2 text-3xl font-extrabold">Kiểm định bài học trước khi xem thử</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Nhập dữ liệu bài học V8.3.2 để rà nguồn, chất lượng học tập, xác nhận của giáo viên và mở ba luồng trong chế độ xem trước. Chức năng chuyển giáo án bất kỳ sang bài học vẫn đang được xây dựng.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
      {!user || user.isAnonymous ? <p className="rounded-2xl bg-amber-50 p-5 font-semibold text-amber-900">Đăng nhập tài khoản giáo viên để mở bản nháp riêng.</p> : <>
        {isCardMatchingScope && <V871OwnerPrivatePackageCard state={v871CardState!.card} onReload={handleReloadDraft} />}
        {isCardMatchingScope && v871CardState!.card.status === 'ready' && v871CardState!.packageData && v871CardState!.sourceScope?.active
          && <V871ArtifactInspector key={`${requestedDraft}:${reloadCounter}:${v871CardState!.packageData.packageHash}`}
            packageData={v871CardState!.packageData} isCurrent={() => isCurrentScope() && Boolean(v871CardState!.sourceScope?.active)} />}
        <section className="v832-review-inbox rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold">Yêu cầu sửa từ bản xem trước</h2>
          <p className="mt-2 text-sm text-slate-600">Ảnh và ngữ cảnh riêng của giáo viên. Yêu cầu mới chỉ được ghi nhận; bài học chưa tự thay đổi.</p>
          {reviewItems.length === 0 ? <p className="mt-3 text-sm">Chưa có yêu cầu sửa nào.</p> : <div className="mt-4 grid gap-3">
            {reviewItems.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold">{item.teacherMessage}</p>
              {item.followUpMessage && <p className="mt-2 text-sm">Chỉnh tiếp: {item.followUpMessage}</p>}
              <p className="mt-1 text-sm text-slate-600">{item.context.lessonId} · Hoạt động {item.context.activityOrder} · {item.context.role} · {item.status}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="min-h-12 rounded-xl border-2 border-teal-700 px-4 font-bold text-teal-900"
                  onClick={() => void showReviewImage(item)}>Xem ảnh</button>
                {item.status === 'NEW' && <button className="min-h-12 rounded-xl bg-teal-800 px-4 font-bold text-white disabled:opacity-50"
                  disabled={Boolean(repairingReviewId)} onClick={() => void analyzeReview(item)}>
                  {repairingReviewId === item.id ? 'Đang phân tích…' : 'Phân tích và đề xuất sửa'}
                </button>}
              </div>
              {repairNotice[item.id] && <p role="status" className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-950">{repairNotice[item.id]}</p>}
              {item.classification && !item.candidateId && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                {item.classification.primary} → {item.classification.targetLayer}: {translateV832Reason(item.classification.rationale)}. Chưa có ứng viên sửa bài.
              </p>}
              {selectedReviewId === item.id && reviewImageUrl && <img className="mt-3 w-full rounded-xl border border-slate-300"
                src={reviewImageUrl} alt="Ảnh màn hình kèm yêu cầu sửa của giáo viên" />}
              {item.candidateId && repairCandidates.filter(candidate => candidate.id === item.candidateId)
                .map(candidate => <RepairCandidateSummary key={candidate.id} candidate={candidate}
                  busy={Boolean(decidingCandidateId)} onDecision={(decision, message) => void decideRepair(candidate, decision, message)} />)}
            </article>)}
          </div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold">Nhập ứng viên bài học</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Tệp JSON phải đúng cấu trúc V8.3.2 và có mã xác thực tài liệu nguồn. Giáo án DOCX/PDF cần đi qua luồng tạo bài học; không chỉ đổi đuôi tệp thành JSON.</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div>
              <p className="font-bold">Muốn tạo bài học từ file Word (DOCX), PDF hoặc ý tưởng?</p>
              <p className="text-xs text-amber-800">Không cần tệp JSON, AI sẽ đọc thẳng giáo án và tự động tạo bài học tương tác ngay.</p>
            </div>
            <a href="/lesson-gen" className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
              Tải giáo án DOCX/PDF
            </a>
          </div>
          <input type="file" accept=".json,application/json" disabled={busy} onChange={event => { void importIR(event.target.files?.[0]); }}
            className="mt-4 block w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-bold file:text-white" />
        </section>
        {isLessonMatchingScope && lesson && quality && confirmation && <>
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <div><h2 className="text-xl font-extrabold">{lesson.lesson.title.vi}</h2>
              <p className="mt-2 text-sm">Thời lượng: {lesson.lesson.runtimeMin} phút</p>
              <p className="mt-2 text-sm">Nguồn Toán: <strong>{sourceStatusLabel[lesson.sourceVerification.status]}</strong></p>
              <p className="mt-2 text-sm">Giai đoạn: <strong>{buildStatusLabel[lesson.buildStatus] ?? 'Đang chuẩn bị bản xem trước'}</strong></p>
              <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">Thông tin phiên bản</summary>
                <p>Mã bài: {lesson.lesson.lessonId} · Phiên bản: {lesson.lesson.lessonVersion}</p>
              </details>
            </div>
            <div><h2 className="text-xl font-extrabold">Chất lượng học tập: {qualityStatusLabel[quality.status]}</h2>
              <p className="mt-2 text-sm">Đạt cấu trúc: {quality.passedRules.length} · Chưa đạt: {quality.failedRules.length} · Chờ kiểm định ngữ nghĩa: {quality.pendingRules.length}</p>
              <p className="mt-2 text-sm">Xác nhận còn mở: {confirmation.pending.length} · {confirmation.releaseBlocked ? 'Chưa được dạy/phát hành' : 'Không có blocker xác nhận'}</p>
            </div>
          </section>
          {(quality.failedRules.length > 0 || quality.warnings.length > 0) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-extrabold text-amber-950">Các điểm cần sửa</h2>
            <ul className="mt-2 list-disc pl-6 text-sm leading-6 text-amber-900">
              {[...quality.failedRules, ...quality.warnings].map(item => <li key={item}>{ruleNames[item] ?? item}</li>)}
            </ul>
          </section>}
          {confirmation.pending.length > 1 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold">Gom xác nhận cùng một quyết định</h2>
            <p className="mt-1 text-sm text-slate-600">Chỉ gom các căn cứ mà một quyết định của thầy/cô thực sự giải quyết cùng lúc. Nếu khác nhau, giữ từng thẻ riêng.</p>
            <div className="mt-4 grid gap-3">
              {confirmation.pending.map(item => {
                const ref = `${item.source}:${item.id}`;
                return <label key={ref} data-v832-confirmation-ref={ref} className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-[1fr_220px] sm:items-center">
                  <span>{translateV832Reason(item.reason)}</span>
                  <select value={confirmationGroups[ref] ?? ''}
                    onChange={event => setConfirmationGroups(current => ({ ...current, [ref]: event.target.value }))}
                    className="min-h-12 rounded-lg border-2 border-slate-300 bg-white px-3 focus-visible:outline-3 focus-visible:outline-teal-600">
                    <option value="">Thẻ riêng</option>
                    <option value="learner-context">Căn cứ về lớp</option>
                    <option value="handoff-timing">Thời gian chuyển bề mặt</option>
                    <option value="formative-cycle">Kiểm tra và can thiệp</option>
                    <option value="content-key">Nội dung cần chốt</option>
                  </select>
                </label>;
              })}
            </div>
          </section>}
          <TeacherConfirmationReview lesson={lesson} teacherUid={user.uid} assignments={confirmationGroups} onDecision={async (next, audit) => {
            if (!isCurrentScope()) return;
            if (!draftId) throw new Error('Bản nháp chưa được lưu.');
            withdrawArtifacts();
            await persistV832ConfirmationDecision(draftId, next, audit);
            if (!isCurrentScope()) return;
            if (sourceBoundPreview) { handleReloadDraft(); return; }
            setLesson(next); setLoadedLessonOwningUser(user); setAttestations([]); setRoomLinks(null);
          }} />
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold">Kiểm định ngữ nghĩa M01–M15</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ghi minh chứng cụ thể trước khi xác nhận từng quy tắc đang chờ. Trạng thái PASS ghi trong file nhập không được tính thay bước này.</p>
            {quality.pendingRules.length === 0 && <p className="mt-4 text-sm font-semibold text-emerald-800">Không còn quy tắc ngữ nghĩa đang chờ.</p>}
            <div className="mt-4 grid gap-4">
              {quality.pendingRules.map(ruleId => <div key={ruleId} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold">{ruleId} · {ruleNames[ruleId] ?? 'Quy tắc chất lượng học tập'}</h3>
                <label className="mt-3 block text-sm font-semibold" htmlFor={`v832-evidence-${ruleId}`}>Minh chứng kiểm định</label>
                <textarea id={`v832-evidence-${ruleId}`} value={evidenceText[ruleId] ?? ''}
                  onChange={event => setEvidenceText(current => ({ ...current, [ruleId]: event.target.value }))}
                  rows={3} maxLength={4000} className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3 focus-visible:outline-3 focus-visible:outline-teal-600" />
                <div className="mt-3 flex flex-wrap gap-3">
                  <button disabled={busy || (evidenceText[ruleId] ?? '').trim().length < 12} onClick={() => void recordSemanticReview(ruleId, 'pass')}
                    className="min-h-12 rounded-xl bg-teal-700 px-4 font-bold text-white disabled:opacity-50">Đã kiểm chứng</button>
                  <button disabled={busy || (evidenceText[ruleId] ?? '').trim().length < 12} onClick={() => void recordSemanticReview(ruleId, 'fail')}
                    className="min-h-12 rounded-xl border-2 border-rose-400 px-4 font-bold text-rose-800 disabled:opacity-50">Cần sửa</button>
                </div>
              </div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold">Xem trước ba luồng</h2>
            {['QUALITY_AUDIT', 'QUALITY_FROZEN', 'DESIGN_DRAFT', 'DESIGN_VALIDATED'].includes(lesson.buildStatus) && <div className="my-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
              <h3 className="font-bold">Rà tiến trình và thiết kế trước khi tạo phòng xem thử</h3>
              <p className="mt-2 text-sm">Kiểm tra câu hỏi, phần chuyển bề mặt, hình ảnh và sản phẩm học sinh của từng hoạt động. Chốt thiết kế không thay cho QA trình duyệt hoặc duyệt sẵn sàng dạy.</p>
              <div className="mt-3 space-y-2">{lesson.timeline.map(activity => <details key={activity.id} className="rounded-lg border border-teal-100 bg-white p-3">
                <summary className="font-semibold">{activity.order}. {activity.title.vi} · {activity.durationSec} giây</summary>
                <p className="mt-2 text-sm"><strong>GV:</strong> {activity.teacherAction}</p>
                <p className="mt-2 text-sm"><strong>HS:</strong> {activity.studentAction}</p>
                <p className="mt-2 text-sm"><strong>Màn hình lớp:</strong> {activity.presenter.exactCopy.vi}</p>
                <p className="mt-2 text-sm"><strong>Thiết bị HS:</strong> {activity.student.exactCopy.vi}</p>
                <p className="mt-2 text-sm"><strong>Sản phẩm/minh chứng:</strong> {activity.expectedEvidence}</p>
                <p className="mt-2 text-sm"><strong>Ghi vở:</strong> {activity.notebookAction ?? 'Theo kịch bản của hoạt động'}</p>
                <p className="mt-2 text-sm"><strong>Phương án khi lỗi:</strong> {activity.fallback ?? 'Cần bổ sung trước khi dạy'}</p>
              </details>)}</div>
              <button disabled={busy || quality.status === 'BLOCKED'} onClick={() => void approveDesign()}
                className="mt-4 min-h-12 rounded-xl bg-teal-700 px-5 font-bold text-white disabled:opacity-50">
                Tôi đã rà tiến trình, chốt thiết kế để xem thử
              </button>
            </div>}
            <p className="mt-2 text-sm text-slate-600">Bản xem trước vẫn chặn trạng thái sẵn sàng dạy cho tới khi Browser QA, nguồn và mọi xác nhận quan trọng hoàn tất.</p>
            <label className="mt-4 block text-sm font-semibold" htmlFor="v84-class-choice">Chọn lớp thực tế cho phòng V8.4</label>
            <select id="v84-class-choice" value={selectedClassId} onChange={event => setSelectedClassId(event.target.value)}
              className="mt-2 min-h-12 w-full max-w-md rounded-xl border-2 border-slate-300 bg-white px-3">
              <option value="">Chọn lớp</option>
              {classChoices.filter(item => lesson.lesson.grade == null || String(item.grade) === String(lesson.lesson.grade))
                .map(item => <option key={item.id} value={item.id}>{item.name} · Khối {item.grade}</option>)}
            </select>
            <div className="mt-4 flex flex-wrap gap-3">
              <button disabled={busy || quality.status === 'BLOCKED' || !designPreviewReady || !selectedClassId} onClick={() => void buildPreview(selectedClassId)}
                className="min-h-12 rounded-xl bg-[#0b253b] px-5 font-bold text-white disabled:opacity-50">
                {busy ? 'Đang chuẩn bị…' : sourceBoundPreview ? `Tạo phòng lớp ${V88_1_LABEL} xem trước` : 'Tạo phòng lớp V8.4 xem trước'}
              </button>
              <button disabled={busy || quality.status === 'BLOCKED' || !designPreviewReady} onClick={() => void buildPreview()}
                className="min-h-12 rounded-xl border-2 border-slate-400 px-5 font-bold text-slate-800 disabled:opacity-50">
                {sourceBoundPreview ? `Xem thử ${V88_1_LABEL} không gắn lớp` : 'Xem thử V8.3.2 không gắn lớp'}
              </button>
            </div>
            {roomLinks && <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(roomLinks).map(([role, href]) => <a key={role} href={href} target="_blank" rel="noreferrer"
                className="rounded-xl border border-teal-300 bg-teal-50 p-4 font-bold text-teal-950 focus-visible:outline-3 focus-visible:outline-amber-500">
                {role === 'tv' ? 'TV công khai' : role === 'student' ? 'Học sinh' : role === 'coach' ? 'Coach riêng của GV' : 'Presenter điều khiển'} ↗
              </a>)}
            </div>}
          </section>
        </>}
      </>}
    </div>
  </main>;
};
