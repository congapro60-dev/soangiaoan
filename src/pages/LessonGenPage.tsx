import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useLocation, useParams } from 'react-router-dom';
import { createSourceBundle, inspectSourceBundle, type LessonSourceBundle, type LessonSourceIssue } from '../lib/lessonGen/sourceIngestion';
import { resolveBanToanTemplateGate } from '../lib/lessonGen/banToanTemplate';
import { buildSourceVerificationRecords, canFreezeSourceBundle, canMarkSourceRecordVerified,
  type SourceVerificationRecord, type TeacherCanonicalSourceApproval } from '../lib/lessonGen/sourceVerification';
import { extractDocxLessonSource } from '../lib/lessonGen/docxSource';
import { buildV821DraftPrompt } from '../lib/lessonGen/generationPrompts';
import { generateLessonPlanDraft } from '../lib/lessonGen/generationPipeline';
import { callAI } from '../lib/aiProviders';
import { callServerLessonAuthoring } from '../lib/serverLessonAuthoring';
import { V88_1_LABEL } from '../lib/lessonCompiler/v832/v88Version';
import { DEFAULT_DATA, type AppData } from '../types';
import type { LessonPlanDraft } from '../lib/lessonGen/planValidator';
import { auth } from '../lib/firebase';
import { getGeneratedRuntimeDefinition, getLessonGenDraft, saveLessonGenDraft, updateLessonGenDraft, uploadLessonGenSource } from '../services/lessonGenDraftService';
import { LessonPlanReview } from '../components/lessonGen/LessonPlanReview';
import { LiveLessonLauncher } from '../components/liveLesson/LiveLessonLauncher';
import type { LiveLessonDefinition } from '../lib/liveLesson/types';
import { compileLessonPackage } from '../lib/lessonGen/packageCompiler';
import { compileLessonPlanRuntime } from '../lib/lessonGen/runtimeCompiler';
import { saveCompiledLessonPackage } from '../services/lessonGenDraftService';
import type { AuthoredLessonIR } from '../lib/lessonCompiler/v832/authorLessonIR';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import { authorV871SourceDraft, readV871SourceAuthoringPlan, readV832StudioDraft, prepareV871StudioPreview, computeSourceSnapshotFingerprint, subscribeV871SourceInvalidation } from '../services/v832StudioService';
import { createV832PreviewRoom } from '../services/v832RoomService';
import { buildTeacherIdeaSource, type TeacherIdeaInput } from '../lib/lessonGen/teacherIdea';

const issueLabel = (issue: LessonSourceIssue): string => {
  if (issue.code === 'INPUT_DURATION_REQUIRED') return 'Cần xác nhận thời lượng.';
  if (issue.code === 'CANONICAL_SOURCE_REQUIRED') return 'Cần thêm SGK/PPCT hoặc ghi rõ phần nào do GV tự thiết kế.';
  if (issue.code === 'SOURCE_CONTENT_UNREADABLE') return 'Tệp chưa đọc được chữ. Cần bản có chữ hoặc xác nhận OCR trước khi duyệt nguồn.';
  return 'Tài liệu có câu mang tính chỉ dẫn; hệ thống chỉ coi đó là nội dung tham khảo.';
};

const readLessonGenSettings = (): AppData['settings'] => {
  if (typeof window === 'undefined') return DEFAULT_DATA.settings;
  try {
    const cached = window.localStorage.getItem('smart_lesson_plan_data');
    if (!cached) return DEFAULT_DATA.settings;
    const parsed = JSON.parse(cached) as { settings?: Partial<AppData['settings']> };
    return { ...DEFAULT_DATA.settings, ...parsed.settings };
  } catch {
    return DEFAULT_DATA.settings;
  }
};

// BrowserRouter changes history before React commits a batched navigation.
const browserRouteIdentity = () => typeof window === 'undefined' ? null
  : JSON.stringify([window.history.state?.key, window.location.pathname, window.location.search]);

const hashFileBytes = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
};

export const LessonGenPage = () => {
  const { draftId: routeDraftId } = useParams<{ draftId: string }>();
  const location = useLocation();
  const [session, setSession] = useState({ user: auth.currentUser, epoch: 0 });
  const observedUser = useRef(auth.currentUser);
  const authEpoch = useRef(0);
  useLayoutEffect(() => onAuthStateChanged(auth, user => {
    if (observedUser.current !== user) { observedUser.current = user; authEpoch.current += 1; }
    const epoch = authEpoch.current;
    setSession(previous => previous.user === user && previous.epoch === epoch ? previous : { user, epoch });
  }), []);
  if (session.user !== auth.currentUser) return null;
  return <LessonGenContent key={`${session.epoch}:${location.key}:${routeDraftId ?? ''}`} user={session.user} routeDraftId={routeDraftId}
    authEpoch={authEpoch} sessionEpoch={session.epoch} />;
};

const LessonGenContent = ({ user, routeDraftId, authEpoch, sessionEpoch }: {
  user: User | null; routeDraftId?: string; authEpoch: { current: number }; sessionEpoch: number;
}) => {
  const inputId = useId();
  const [bundle, setBundle] = useState<LessonSourceBundle | null>(null);
  const [issues, setIssues] = useState<LessonSourceIssue[]>([]);
  const [verificationRecords, setVerificationRecords] = useState<SourceVerificationRecord[]>([]);
  const [sourceApproval, setSourceApproval] = useState<TeacherCanonicalSourceApproval | null>(null);
  const [durationDraft, setDurationDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<LessonPlanDraft | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sourceRevision, setSourceRevision] = useState<number | null>(null);
  const [authoringRevision, setAuthoringRevision] = useState(0);
  const [latestPlanState, setLatestPlanState] = useState<'MAPPED' | 'REVIEW_REQUIRED' | null>(null);
  const [banToanTemplateGate, setBanToanTemplateGate] = useState<'NOT_APPLICABLE' | 'TEMPLATE_UNVERIFIED' | 'TEMPLATE_VERIFIED'>('NOT_APPLICABLE');
  const [draftStatus, setDraftStatus] = useState<'imported' | 'review_ready' | 'plan_approved' | 'design_approved' | 'compiled'>('imported');
  const [isCompiling, setIsCompiling] = useState(false);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [compiledRuntime, setCompiledRuntime] = useState<LiveLessonDefinition | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);
  const [canonicalDraftId, setCanonicalDraftId] = useState<string | null>(null);
  const [previewLinks, setPreviewLinks] = useState<Record<'presenter' | 'tv' | 'student' | 'coach', string> | null>(null);
  const [isAuthoringIR, setIsAuthoringIR] = useState(false);
  const [aiConnection, setAiConnection] = useState<'idle' | 'checking' | 'ready'>('idle');
  const isMutating = isLoading || isGenerating || isCompiling;
  const [teacherArchetypeChoice, setTeacherArchetypeChoice] = useState<'' | 'practice' | 'review_diagnostic'>('');
  const [teacherIdea, setTeacherIdea] = useState<TeacherIdeaInput>({
    subject: 'Toán', grade: '', title: '', archetype: 'knowledge_formation', durationMinutes: 40,
    must: '', should: '', could: '', content: '', interaction: '', differentiation: '',
  });
  const [inspection, setInspection] = useState<{ epoch: number; fingerprint: string;
    result: Pick<AuthoredLessonIR, 'status' | 'authoringPlan' | 'diagnostics'> } | null>(null);
  const requestEpoch = useRef(0);
  const mounted = useRef(false);
  const routeIdentity = useRef(browserRouteIdentity());
  useLayoutEffect(() => {
    mounted.current = true;
    const onPopState = () => { requestEpoch.current += 1; setInspection(null); setIsAuthoringIR(false); };
    window.addEventListener('popstate', onPopState);
    return () => { mounted.current = false; requestEpoch.current += 1; window.removeEventListener('popstate', onPopState); };
  }, []);
  const isCurrent = (epoch: number) => mounted.current && requestEpoch.current === epoch
    && authEpoch.current === sessionEpoch
    && browserRouteIdentity() === routeIdentity.current
    && Boolean(user && !user.isAnonymous && auth.currentUser === user);
  const invalidateAuthoring = () => {
    requestEpoch.current += 1;
    setInspection(null);
    setIsAuthoringIR(false);
    return requestEpoch.current;
  };
  const visibleInspection = inspection && isCurrent(inspection.epoch) ? inspection.result : null;
  useEffect(() => {
    if (!inspection || !draftId || !isCurrent(inspection.epoch)) return;
    return subscribeV871SourceInvalidation(draftId, inspection.fingerprint, authoringRevision, () => {
      if (!isCurrent(inspection.epoch)) return;
      invalidateAuthoring(); setCanonicalDraftId(null); setSourceRevision(null);
      setError('Nguồn hoặc kế hoạch đã thay đổi. Tải lại trang để xem bản mới nhất.');
    });
  }, [inspection, draftId, authoringRevision]);
  const teacherSourceApproved = Boolean(bundle && sourceApproval &&
    canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, auth.currentUser?.uid));

  useEffect(() => {
    if (!routeDraftId || !user || user.isAnonymous) return;
    let active = true;
    const epoch = requestEpoch.current;
    const current = () => active && isCurrent(epoch);
    void getLessonGenDraft(routeDraftId).then(async stored => {
      if (!current()) return;
      if (!stored || stored.id !== routeDraftId || stored.ownerUid !== user.uid) {
        setError('Không tìm thấy bản nháp hoặc bạn không có quyền mở nó.');
        return;
      }
      setBundle(stored.sourceBundle);
      setIssues(inspectSourceBundle(stored.sourceBundle));
      setVerificationRecords(stored.verificationRecords);
      setSourceApproval(stored.sourceApproval ?? null);
      setDurationDraft(stored.sourceBundle.durationMinutes?.toString() ?? '');
      setDraft(stored.planDraft ?? null);
      setDraftId(stored.id);
      setSourceRevision(stored.revision);
      setAuthoringRevision(stored.v871AuthoringRevision ?? 0);
      setBanToanTemplateGate(stored.banToanTemplateGate ?? 'NOT_APPLICABLE');
      setLatestPlanState(stored.v871ExperiencePlanDraft?.state ?? null);
      setDraftStatus(stored.status);
      setCanonicalDraftId(stored.v832DraftId ?? null);
      if (stored.v871ExperiencePlanDraft) {
        setIsLoading(true);
        const saved = await readV871SourceAuthoringPlan(stored.id);
        if (!current()) return;
        if (!saved || saved.sourceSnapshotFingerprint !== await computeSourceSnapshotFingerprint(stored)) {
          throw new Error('Nguồn hoặc kế hoạch đã đổi; tải lại trang để xem bản mới nhất.');
        }
        if (!current()) return;
        setIsLoading(false);
        setInspection({ epoch, fingerprint: saved.sourceSnapshotFingerprint,
          result: { status: saved.state, authoringPlan: saved.plan, diagnostics: saved.diagnostics } });
        setTeacherArchetypeChoice(saved.teacherArchetypeChoice ?? '');
        if (saved.state === 'MAPPED') setCanonicalDraftId(stored.v832DraftId ?? null);
      }
      if (stored.compiledPackageId) {
        setPackageId(stored.compiledPackageId);
        void getGeneratedRuntimeDefinition(stored.compiledPackageId)
          .then(runtime => { if (current()) setCompiledRuntime(runtime); })
          .catch(cause => { if (current()) setError(cause instanceof Error ? cause.message : 'Không tải được bài dạy.'); });
      }
    }).catch(loadError => {
      if (current()) { setIsLoading(false); setCanonicalDraftId(null); setSourceRevision(null); setError(loadError instanceof Error ? loadError.message : 'Không tải được bản nháp.'); }
    });
    return () => { active = false; };
  }, [routeDraftId, user]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) { setError('Đăng nhập tài khoản giáo viên để tải giáo án.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !['docx', 'pdf', 'xlsx', 'xls', 'md', 'txt'].includes(extension)) {
        throw new Error('Định dạng chưa trích xuất được chữ; dùng DOCX, PDF có chữ, XLSX, TXT hoặc MD. Ảnh/PDF scan cần OCR.');
      }
      if (file.size > 10 * 1024 * 1024) throw new Error('Tệp vượt 10 MB; hãy chia nhỏ tài liệu nguồn.');
      const content = extension === 'docx'
        ? (await extractDocxLessonSource(new Uint8Array(await file.arrayBuffer()))).text
        : extension === 'md' || extension === 'txt' ? await file.text()
          : (await (await import('../utils/fileUtils')).processUploadedFile(file, 'lesson_doc', 0, true))
            .map(item => item.content).join('\n\n');
      if (!isCurrent(epoch)) return;
      if (content.length > 150_000) throw new Error('Nội dung trích xuất vượt 150.000 ký tự; hãy chia nhỏ tài liệu nguồn.');
      const source = await createSourceBundle({
        id: `lesson-source-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        role: 'teacher_lesson',
        content,
      });
      const templateGate = resolveBanToanTemplateGate({ extension, sourceHash: await hashFileBytes(file) });
      if (!isCurrent(epoch)) return;
      const sourceIssues = inspectSourceBundle(source);
      if (sourceIssues.some(issue => issue.code === 'SOURCE_CONTENT_UNREADABLE')) {
        throw new Error('Tệp không có chữ đọc được; PDF scan/ảnh cần OCR hoặc bản tài liệu có chữ.');
      }
      const ownerUid = auth.currentUser?.uid;
      if (!ownerUid || auth.currentUser?.isAnonymous) throw new Error('Đăng nhập tài khoản giáo viên để lưu bản nháp bài học.');
      const nextVerificationRecords = buildSourceVerificationRecords(source);
      const nextDraftId = `lesson-gen-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
      const originalStoragePath = await uploadLessonGenSource(ownerUid, nextDraftId, file);
      if (!isCurrent(epoch)) return;
      await saveLessonGenDraft({
        id: nextDraftId,
        ownerUid,
        sourceHash: source.sourceHash,
        revision: 1,
        status: 'imported',
        sourceBundle: source,
        banToanTemplateGate: templateGate.status,
        ...(templateGate.templateId ? { banToanTemplateId: templateGate.templateId } : {}),
        verificationRecords: nextVerificationRecords,
        originalStoragePath,
      });
      if (!isCurrent(epoch)) return;
      setBundle(source);
      setIssues(sourceIssues);
      setVerificationRecords(nextVerificationRecords);
      setSourceApproval(null);
      setBanToanTemplateGate(templateGate.status);
      setDurationDraft(source.durationMinutes?.toString() ?? '');
      setDraft(null);
      setDraftId(nextDraftId);
      setSourceRevision(1); setAuthoringRevision(0);
      setLatestPlanState(null);
      setDraftStatus('imported');
      setCanonicalDraftId(null);
    } catch (uploadError) {
      if (!isCurrent(epoch)) return;
      setError(uploadError instanceof Error ? uploadError.message : 'Không đọc được giáo án.');
      setBundle(null);
      setIssues([]);
      setVerificationRecords([]);
      setSourceApproval(null);
      setDurationDraft('');
      setDraft(null);
      setDraftId(null);
      setSourceRevision(null); setAuthoringRevision(0);
      setDraftStatus('imported');
      setCanonicalDraftId(null);
    } finally {
      if (isCurrent(epoch)) setIsLoading(false);
    }
  };

  const createTeacherIdea = async () => {
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) { setError('Đăng nhập tài khoản giáo viên để tạo bản nháp.'); return; }
    const required = [teacherIdea.subject, teacherIdea.grade, teacherIdea.title, teacherIdea.must, teacherIdea.content];
    if (required.some(value => !value.trim()) || !Number.isInteger(teacherIdea.durationMinutes) || teacherIdea.durationMinutes < 1) {
      setError('Nhập môn, lớp, tên bài, mục tiêu MUST, nội dung và thời lượng hợp lệ.'); return;
    }
    setIsLoading(true); setError(null);
    try {
      const source = await createSourceBundle({
        id: `teacher-idea-${crypto.randomUUID()}`,
        name: `${teacherIdea.title.trim()}.teacher-idea.md`,
        mimeType: 'text/markdown', role: 'teacher_authored',
        content: buildTeacherIdeaSource(teacherIdea), durationMinutes: teacherIdea.durationMinutes,
      });
      const ownerUid = auth.currentUser?.uid;
      if (!ownerUid || auth.currentUser?.isAnonymous) throw new Error('Đăng nhập tài khoản giáo viên để lưu bản nháp bài học.');
      const nextDraftId = `lesson-gen-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
      const nextVerificationRecords = buildSourceVerificationRecords(source);
      await saveLessonGenDraft({ id: nextDraftId, ownerUid, sourceHash: source.sourceHash, revision: 1, status: 'imported',
        sourceBundle: source, verificationRecords: nextVerificationRecords, sourceApproval: null, v832DraftId: null,
        planDraft: null, approval: {}, banToanTemplateGate: 'NOT_APPLICABLE', banToanTemplateId: undefined });
      if (!isCurrent(epoch)) return;
      setBundle(source); setIssues(inspectSourceBundle(source)); setVerificationRecords(nextVerificationRecords);
      setSourceApproval(null); setDurationDraft(String(teacherIdea.durationMinutes)); setDraftId(nextDraftId); setSourceRevision(1);
      setDraft(null); setDraftStatus('imported'); setPackageId(null); setCompiledRuntime(null); setCanonicalDraftId(null);
      setBanToanTemplateGate('NOT_APPLICABLE'); setLatestPlanState(null); setInspection(null);
    } catch (cause) {
      if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không lưu được ý tưởng bài học.');
    } finally { if (isCurrent(epoch)) setIsLoading(false); }
  };

  const generateDraft = async () => {
    if (!bundle || isMutating || isAuthoringIR) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    if (inspectSourceBundle(bundle).some(issue => issue.code === 'SOURCE_CONTENT_UNREADABLE')) {
      setError('Tệp nguồn chưa có chữ đọc được. Cần OCR hoặc bản có chữ trước khi tạo kế hoạch.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const reviewedSource = canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, auth.currentUser?.uid)
        ? sourceApproval : null;
      const nextDraft = await generateLessonPlanDraft({
        prompt: buildV821DraftPrompt(bundle, reviewedSource),
        sourceHash: bundle.sourceHash,
        invoke: prompt => callAI(prompt, readLessonGenSettings()),
      });
      if (!isCurrent(epoch)) return;
      if (!draftId) throw new Error('Không tìm thấy bản nháp nguồn để lưu kết quả AI.');
      await updateLessonGenDraft(draftId, {
        revision: 2,
        status: 'review_ready',
        planDraft: nextDraft,
      });
      if (!isCurrent(epoch)) return;
      setDraft(nextDraft);
      setSourceRevision(2);
      setDraftStatus('review_ready');
    } catch (generationError) {
      if (!isCurrent(epoch)) return;
      setError(generationError instanceof Error ? generationError.message : 'Không thể tạo bản nháp bài học.');
    } finally {
      if (isCurrent(epoch)) setIsGenerating(false);
    }
  };

  const approveDraft = async (nextStatus: 'plan_approved' | 'design_approved') => {
    if (!draftId || !draft) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    if (nextStatus === 'plan_approved' && (!bundle || !canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, auth.currentUser?.uid))) {
      setError('Hoàn tất xác minh nguồn trước khi duyệt kế hoạch.');
      return;
    }
    if (nextStatus === 'design_approved' && draftStatus !== 'plan_approved') {
      setError('Cần duyệt kế hoạch trước khi duyệt thiết kế.');
      return;
    }
    try {
      const approval = nextStatus === 'plan_approved'
        ? { planApprovedAt: new Date().toISOString() }
        : { planApprovedAt: new Date().toISOString(), designApprovedAt: new Date().toISOString() };
      await updateLessonGenDraft(draftId, { status: nextStatus, approval });
      if (!isCurrent(epoch)) return;
      setDraftStatus(nextStatus);
      setError(null);
    } catch (approvalError) {
      if (!isCurrent(epoch)) return;
      setError(approvalError instanceof Error ? approvalError.message : 'Không thể lưu trạng thái duyệt.');
    }
  };

  const verifySourceRecord = async (record: SourceVerificationRecord) => {
    if (!draftId || !canMarkSourceRecordVerified(record)) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    const nextRecords = verificationRecords.map(item => item.id === record.id
      ? { ...item, status: item.status === 'verified' ? 'needs_review' as const : 'verified' as const } : item);
    setIsLoading(true); setError(null);
    try {
      await updateLessonGenDraft(draftId, { verificationRecords: nextRecords, sourceApproval: null, v832DraftId: null, v871PackageSummary: null,
        status: 'imported', planDraft: null, compiledPackageId: null, approval: {} });
      if (!isCurrent(epoch)) return;
      setVerificationRecords(nextRecords); setSourceApproval(null); setDraft(null);
      setDraftStatus('imported'); setPackageId(null); setCompiledRuntime(null);
      setCanonicalDraftId(null);
    } catch (cause) { if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không lưu được kết quả xác minh nguồn.'); }
    finally { if (isCurrent(epoch)) setIsLoading(false); }
  };

  const approveTeacherSource = async () => {
    const reviewerUid = auth.currentUser?.uid;
    const source = bundle?.sources.find(item => item.role === 'teacher_lesson' || item.role === 'teacher_authored');
    if (!bundle || !source || !draftId || !reviewerUid || auth.currentUser?.isAnonymous) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    if (verificationRecords.some(record => record.kind !== 'canonical_gap' && record.status !== 'verified')) {
      setError('Kiểm tra từng công thức và bảng/hình trước khi duyệt nguồn của giáo viên.'); return;
    }
    const approval: TeacherCanonicalSourceApproval = { sourceId: source.id, sourceHash: bundle.sourceHash,
      durationMinutes: bundle.durationMinutes ?? 0,
      reviewerUid, approvedAt: new Date().toISOString() };
    if (!canFreezeSourceBundle(bundle, verificationRecords, approval, reviewerUid)) {
      setError('Nguồn chưa đủ để xác nhận; cần tài liệu hoặc minh chứng Toán có thể kiểm tra.'); return;
    }
    setIsLoading(true); setError(null);
    try {
      await updateLessonGenDraft(draftId, { sourceApproval: approval, v832DraftId: null, v871PackageSummary: null, status: 'imported',
        planDraft: null, compiledPackageId: null, approval: {} });
      if (!isCurrent(epoch)) return;
      setSourceApproval(approval); setDraft(null); setDraftStatus('imported');
      setPackageId(null); setCompiledRuntime(null);
      setCanonicalDraftId(null);
    } catch (cause) { if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không lưu được xác nhận nguồn.'); }
    finally { if (isCurrent(epoch)) setIsLoading(false); }
  };

  const saveDuration = async () => {
    if (!bundle || !draftId) return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    const durationMinutes = Number(durationDraft);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
      setError('Thời lượng phải là số phút nguyên từ 1 đến 180.'); return;
    }
    const nextBundle = { ...bundle, durationMinutes };
    setIsLoading(true); setError(null);
    try {
      await updateLessonGenDraft(draftId, { sourceBundle: nextBundle, sourceApproval: null, v832DraftId: null, v871PackageSummary: null, status: 'imported',
        planDraft: null, compiledPackageId: null, approval: {} });
      if (!isCurrent(epoch)) return;
      setBundle(nextBundle); setIssues(inspectSourceBundle(nextBundle));
      setSourceApproval(null);
      setDraft(null); setDraftStatus('imported'); setPackageId(null); setCompiledRuntime(null);
      setCanonicalDraftId(null);
    } catch (cause) { if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không lưu được thời lượng.'); }
    finally { if (isCurrent(epoch)) setIsLoading(false); }
  };

  const generateCanonicalIR = async () => {
    const epoch = invalidateAuthoring();
    if (!bundle || !draftId || !sourceRevision || !user || !isCurrent(epoch)
      || durationDraft !== bundle.durationMinutes?.toString()
      || !canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, user.uid)) return;
    setIsAuthoringIR(true); setError(null);
    try {
      const capturedSource = structuredClone({ sourceHash: bundle.sourceHash, sourceBundle: bundle,
        verificationRecords, sourceApproval, v832DraftId: canonicalDraftId });
      const choice = teacherArchetypeChoice;
      const requireCurrent = () => { if (!isCurrent(epoch)) throw new Error('Phiên soạn bài đã thay đổi.'); };
      const fingerprint = await computeSourceSnapshotFingerprint(capturedSource);
      requireCurrent();
      const candidate = await authorV871SourceDraft({ sourceDraftId: draftId, expectedSourceRevision: sourceRevision,
        expectedAuthoringRevision: authoringRevision, expectedSourceSnapshotFingerprint: fingerprint,
        ...(choice ? { teacherArchetypeChoice: choice } : {}), assertCurrent: requireCurrent, invoke: async prompt => {
        requireCurrent();
        const response = await callServerLessonAuthoring(prompt);
        requireCurrent();
        return response;
      } });
      requireCurrent();
      setAuthoringRevision(candidate.authoringRevision);
      setLatestPlanState(candidate.status === 'DRAFT_CREATED' ? 'MAPPED' : 'REVIEW_REQUIRED');
      setInspection({ epoch, fingerprint: candidate.sourceSnapshotFingerprint, result: {
        status: candidate.status === 'DRAFT_CREATED' ? 'MAPPED' : 'REVIEW_REQUIRED',
        authoringPlan: candidate.authoringPlan, diagnostics: candidate.diagnostics,
      } });
      if (candidate.status === 'DRAFT_CREATED') setCanonicalDraftId(candidate.draftId);
    } catch (cause) {
      if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không tạo được bản nháp bài dạy.');
    } finally { if (isCurrent(epoch)) setIsAuthoringIR(false); }
  };

  const createV88Preview = async () => {
    if (!draftId || !canonicalDraftId || !user || user.isAnonymous || latestPlanState !== 'MAPPED') return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    setIsCompiling(true); setError(null); setPreviewLinks(null);
    try {
      const storedIr = await readV832StudioDraft(canonicalDraftId);
      if (!storedIr) throw new Error('Không tìm thấy bản IR đã tạo.');
      const contentHash = await computeLessonContentHash(storedIr.lessonIR);
      const prepared = await prepareV871StudioPreview(draftId, canonicalDraftId, storedIr.revision, contentHash, () => {
        if (!isCurrent(epoch)) throw new Error('Phiên soạn bài đã thay đổi.');
      });
      if (!isCurrent(epoch)) return;
      const room = await createV832PreviewRoom(prepared.manifest.packageId);
      if (!isCurrent(epoch)) return;
      setPreviewLinks(room.links);
    } catch (cause) {
      if (isCurrent(epoch)) setError(cause instanceof Error ? cause.message : 'Không tạo được phòng V8.8.');
    } finally { if (isCurrent(epoch)) setIsCompiling(false); }
  };

  const compilePackage = async () => {
    if (!draft || !draftId || draftStatus !== 'design_approved') return;
    const epoch = invalidateAuthoring();
    if (!isCurrent(epoch)) return;
    if (!bundle || !canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, auth.currentUser?.uid)) {
      setError('Nguồn chưa được xác minh theo giáo án hiện tại; hãy kiểm tra lại trước khi tạo gói.'); return;
    }
    const ownerUid = auth.currentUser?.uid;
    if (!ownerUid || auth.currentUser?.isAnonymous) {
      setError('Đăng nhập tài khoản giáo viên để compile package.');
      return;
    }
    setIsCompiling(true);
    try {
      const packageResult = await compileLessonPackage({ plan: { ...draft, status: 'plan_approved' }, lessonId: draftId, revision: 3 });
      if (!isCurrent(epoch)) return;
      const runtimeDefinition = compileLessonPlanRuntime({ draft: { ...draft, status: 'plan_approved' }, lessonId: draftId, title: bundle?.sources[0]?.name ?? 'Bài học tương tác' });
      await saveCompiledLessonPackage(ownerUid, packageResult, runtimeDefinition);
      if (!isCurrent(epoch)) return;
      await updateLessonGenDraft(draftId, { status: 'compiled', compiledPackageId: packageResult.packageId });
      if (!isCurrent(epoch)) return;
      setPackageId(packageResult.packageId);
      setCompiledRuntime(runtimeDefinition);
      setDraftStatus('compiled');
      setError(null);
    } catch (compileError) {
      if (!isCurrent(epoch)) return;
      setError(compileError instanceof Error ? compileError.message : 'Không thể compile package.');
    } finally {
      if (isCurrent(epoch)) setIsCompiling(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-[#08131F] p-6 text-white shadow-xl sm:p-9">
          <p className="text-sm font-semibold text-[#42D3D0]">{V88_1_LABEL} · Soạn bài</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Tạo bài học tương tác</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
            Tải giáo án để kiểm tra nguồn, thời lượng và nội dung trước khi hệ thống tạo kế hoạch dạy học.
          </p>
          <a href="/lesson-compiler-v832" className="mt-4 inline-flex rounded-xl border border-teal-300 px-4 py-2 text-sm font-bold text-teal-100 hover:bg-teal-900 focus-visible:outline-3 focus-visible:outline-amber-300">
            Mở phòng duyệt Lesson IR V8.3.2 (xem trước)
          </a>
        </header>

        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-6 shadow-sm">
          <h2 className="text-xl font-black text-teal-950">Tạo từ ý tưởng</h2>
          <p className="mt-2 text-sm leading-6 text-teal-900">Chưa có giáo án? Nhập thông tin cốt lõi. Hệ thống lưu thành nguồn do giáo viên cung cấp, sau đó dùng cùng quy trình kiểm tra và duyệt.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input aria-label="Môn học" value={teacherIdea.subject} onChange={event => setTeacherIdea(current => ({ ...current, subject: event.target.value }))} placeholder="Môn học" className="rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <input aria-label="Lớp học" value={teacherIdea.grade} onChange={event => setTeacherIdea(current => ({ ...current, grade: event.target.value }))} placeholder="Lớp, ví dụ 11" className="rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <input aria-label="Tên bài" value={teacherIdea.title} onChange={event => setTeacherIdea(current => ({ ...current, title: event.target.value }))} placeholder="Tên bài học" className="rounded-xl border border-teal-200 bg-white px-3 py-2 sm:col-span-2" />
            <select aria-label="Loại tiết" value={teacherIdea.archetype} onChange={event => setTeacherIdea(current => ({ ...current, archetype: event.target.value as TeacherIdeaInput['archetype'] }))} className="rounded-xl border border-teal-200 bg-white px-3 py-2">
              <option value="knowledge_formation">Hình thành kiến thức</option>
              <option value="practice_review">Luyện tập / ôn tập</option>
              <option value="application_transfer">Vận dụng / chuyển giao</option>
            </select>
            <input aria-label="Thời lượng" type="number" min="1" max="180" value={teacherIdea.durationMinutes} onChange={event => setTeacherIdea(current => ({ ...current, durationMinutes: Number(event.target.value) }))} className="rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <textarea aria-label="Mục tiêu MUST" value={teacherIdea.must} onChange={event => setTeacherIdea(current => ({ ...current, must: event.target.value }))} placeholder="MUST: cuối tiết mọi HS phải làm được gì?" className="min-h-20 rounded-xl border border-teal-200 bg-white px-3 py-2 sm:col-span-2" />
            <textarea aria-label="Mục tiêu SHOULD" value={teacherIdea.should} onChange={event => setTeacherIdea(current => ({ ...current, should: event.target.value }))} placeholder="SHOULD: mục tiêu nên đạt" className="min-h-20 rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <textarea aria-label="Mục tiêu COULD" value={teacherIdea.could} onChange={event => setTeacherIdea(current => ({ ...current, could: event.target.value }))} placeholder="COULD: thử thách mở rộng" className="min-h-20 rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <textarea aria-label="Nội dung bài" value={teacherIdea.content} onChange={event => setTeacherIdea(current => ({ ...current, content: event.target.value }))} placeholder="Khái niệm, dữ kiện, công thức, ví dụ, đáp án hoặc lưu ý sư phạm…" className="min-h-28 rounded-xl border border-teal-200 bg-white px-3 py-2 sm:col-span-2" />
            <textarea aria-label="Tương tác mong muốn" value={teacherIdea.interaction} onChange={event => setTeacherIdea(current => ({ ...current, interaction: event.target.value }))} placeholder="Ví dụ: dự đoán → thảo luận cặp đôi → mô phỏng → Exit Ticket" className="min-h-20 rounded-xl border border-teal-200 bg-white px-3 py-2" />
            <textarea aria-label="Phân hóa mong muốn" value={teacherIdea.differentiation} onChange={event => setTeacherIdea(current => ({ ...current, differentiation: event.target.value }))} placeholder="Luyện thêm / Thử thách / Khám phá" className="min-h-20 rounded-xl border border-teal-200 bg-white px-3 py-2" />
          </div>
          <button type="button" onClick={() => { void createTeacherIdea(); }} disabled={isMutating || !user || user.isAnonymous} className="mt-4 rounded-xl bg-teal-800 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
            {isLoading ? 'Đang lưu ý tưởng…' : 'Tạo bản nháp từ ý tưởng'}
          </button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Tải giáo án</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Hiện đọc DOCX, PDF có chữ, bảng tính XLSX, TXT và MD. Ảnh hoặc PDF scan cần OCR trước khi duyệt nguồn.</p>
          <label htmlFor={inputId} className="mt-5 inline-flex cursor-pointer items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
            {isLoading ? 'Đang đọc giáo án…' : 'Chọn tệp'}
          </label>
          <input
            id={inputId}
            type="file"
            accept=".docx,.pdf,.xlsx,.xls,.md,.txt"
            className="sr-only"
            disabled={isMutating}
            onChange={event => { void onUpload(event.target.files?.[0]); }}
          />
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Nguồn và kiểm tra</h2>
          {draftId && <a href={`/lesson-gen/${encodeURIComponent(draftId)}`} className="mt-2 block font-bold text-teal-800 underline">Mở lại bản nháp đã lưu</a>}
          {!bundle && <p className="mt-3 text-sm leading-6 text-slate-600">Chưa có giáo án để kiểm tra.</p>}
          {bundle && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-bold">{bundle.sources[0]?.name}</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-500">{bundle.sourceHash}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-900">
                <label htmlFor="lesson-source-duration" className="block font-bold">Thời lượng tiết học (phút)</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input id="lesson-source-duration" type="number" min="1" max="180" step="1"
                    disabled={isMutating}
                    value={durationDraft} onChange={event => { invalidateAuthoring(); setDurationDraft(event.target.value); }}
                    className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2" />
                  <button type="button" disabled={isMutating || isAuthoringIR || !draftId || !durationDraft || durationDraft === bundle.durationMinutes?.toString()}
                    onClick={() => { void saveDuration(); }}
                    className="rounded-xl border border-slate-400 bg-white px-4 py-2 font-bold disabled:opacity-50">Lưu thời lượng</button>
                </div>
              </div>
              {bundle.sources[0]?.mimeType.includes('wordprocessingml.document') && <p className="rounded-2xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-950">
                Mẫu Ban Toán: {banToanTemplateGate === 'TEMPLATE_VERIFIED' ? 'đã nhận diện đúng mẫu' : 'chưa khớp mẫu đã lưu'}.
                Bản giáo án xuất ra vẫn cần kiểm tra render và in trước khi dùng để dạy.
              </p>}
              {issues.filter(issue => issue.code !== 'CANONICAL_SOURCE_REQUIRED' || !teacherSourceApproved).length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Nguồn đã đủ điều kiện để tạo bản nháp kế hoạch.</p>
              ) : (
                <ul className="space-y-2">
                  {issues.filter(issue => issue.code !== 'CANONICAL_SOURCE_REQUIRED' || !teacherSourceApproved)
                    .map(issue => <li key={`${issue.code}-${issue.sourceId ?? 'bundle'}`} className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{issueLabel(issue)}</li>)}
                </ul>
              )}
              {teacherSourceApproved && <p className="rounded-2xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-950">
                Nguồn Toán do giáo viên duyệt; chưa xác nhận đây là SGK hoặc PPCT.
              </p>}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Vùng cần xác minh</h2>
          {!bundle && <p className="mt-3 text-sm leading-6 text-slate-600">Tải giáo án để xem công thức, bảng hoặc nguồn cần giáo viên kiểm tra.</p>}
          {bundle && verificationRecords.length === 0 && <p className="mt-3 text-sm leading-6 text-emerald-700">Không phát hiện vùng cần xác minh thêm từ nội dung đã trích xuất.</p>}
          {verificationRecords.length > 0 && <ul className="mt-4 space-y-2">
            {verificationRecords.map(record => <li key={record.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">{record.kind === 'canonical_gap'
                ? teacherSourceApproved ? 'Nguồn giáo viên đã duyệt' : 'Thiếu nguồn chuẩn'
                : record.kind === 'math_expression' ? 'Công thức cần kiểm tra' : 'Bảng/hình cần kiểm tra'}</p>
              <p className="mt-1 font-medium">{record.kind === 'canonical_gap' && teacherSourceApproved
                ? 'Giáo viên đã xác nhận nội dung của giáo án. Nguồn SGK/PPCT chưa được gắn.' : record.excerpt}</p>
              <p className="mt-2 text-xs font-semibold text-amber-800">{record.locator.value}</p>
              {canMarkSourceRecordVerified(record) ? <button type="button" disabled={isMutating || isAuthoringIR}
                onClick={() => { void verifySourceRecord(record); }}
                className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-50">
                {record.status === 'verified' ? 'Đã xác minh' : 'Đánh dấu đã xác minh'}
              </button> : !teacherSourceApproved && <p className="mt-3 text-sm font-semibold text-amber-900">
                Cần nguồn SGK/PPCT hoặc xác nhận rõ nội dung Toán trong giáo án do giáo viên cung cấp. Dòng báo thiếu này không thể tự xác minh.
              </p>}
            </li>)}
          </ul>}
          {bundle?.sources.some(source => source.role === 'teacher_lesson' || source.role === 'teacher_authored') &&
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
              <p className="font-bold">Xác nhận nguồn do giáo viên cung cấp</p>
              <p className="mt-2">Chỉ xác nhận sau khi kiểm tra từng công thức, bảng/hình và phạm vi bài. Đây là nguồn do giáo viên duyệt, không tự nhận là SGK hoặc PPCT. Chỉnh nguồn sẽ hủy xác nhận và yêu cầu tạo lại bản nháp.</p>
              {!bundle.durationMinutes && <p className="mt-2">Lưu thời lượng tiết học trước khi xác nhận nguồn.</p>}
              <button type="button" disabled={isMutating || isAuthoringIR || !draftId || !bundle.durationMinutes || teacherSourceApproved || verificationRecords.some(record =>
                record.kind !== 'canonical_gap' && record.status !== 'verified')}
                onClick={() => { void approveTeacherSource(); }}
                className="mt-3 rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">
                {teacherSourceApproved ? 'Đã xác nhận nguồn giáo viên' : 'Tôi xác nhận nguồn giáo viên'}
              </button>
            </div>}
        </section>

        <section className="rounded-3xl border border-teal-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Tạo bài dạy {V88_1_LABEL}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Hệ thống soạn kế hoạch hoạt động trước, rồi tạo bản nháp bài dạy khi kế hoạch phù hợp. Kết quả được lưu riêng tư để giáo viên kiểm tra, chưa sẵn sàng để dạy.</p>
          <button type="button" disabled={isMutating || isAuthoringIR || aiConnection === 'checking' || !user || user.isAnonymous}
            onClick={async () => {
              setAiConnection('checking'); setError(null);
              try {
                const reply = JSON.parse(await callServerLessonAuthoring('Return only this JSON: {"status":"ok"}'));
                if (reply.status !== 'ok') throw new Error('AI chưa trả lời đúng yêu cầu kiểm tra kết nối.');
                setAiConnection('ready');
              } catch (cause) { setAiConnection('idle'); setError(cause instanceof Error ? cause.message : 'Chưa kết nối được AI.'); }
            }} className="mt-3 rounded-xl border border-teal-600 px-4 py-2 font-bold text-teal-900 disabled:opacity-50">
            {aiConnection === 'checking' ? 'Đang kiểm tra kết nối AI…' : 'Kiểm tra kết nối AI'}
          </button>
          {aiConnection === 'ready' && <p role="status" className="mt-2 text-sm text-teal-800">AI đã phản hồi. Có thể bắt đầu soạn bài.</p>}
          <label htmlFor={`${inputId}-archetype`} className="mt-4 block text-sm font-bold">Nếu tiết học là luyện tập hoặc ôn tập</label>
          <select id={`${inputId}-archetype`} value={teacherArchetypeChoice}
            disabled={isMutating}
            onChange={event => { invalidateAuthoring(); setTeacherArchetypeChoice(event.target.value as typeof teacherArchetypeChoice); }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="">Chưa chọn — cần kiểm tra theo giáo án</option>
            <option value="practice">Luyện tập</option>
            <option value="review_diagnostic">Ôn tập và chẩn đoán</option>
          </select>
          <button type="button" disabled={isMutating || isAuthoringIR || !bundle || !sourceRevision
            || !user || user.isAnonymous || auth.currentUser !== user || durationDraft !== bundle.durationMinutes?.toString()
            || !canFreezeSourceBundle(bundle, verificationRecords, sourceApproval, auth.currentUser?.uid)}
            onClick={() => { void generateCanonicalIR(); }}
            className="mt-4 min-h-12 rounded-xl bg-teal-700 px-5 font-bold text-white disabled:opacity-50">
            {isAuthoringIR ? 'Đang soạn bản nháp bài dạy…' : `Soạn bản nháp ${V88_1_LABEL} từ nguồn đã duyệt`}
          </button>
          {visibleInspection && <section data-v871-inspection className="mt-5 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Kế hoạch riêng tư đã lưu">
            <h3 className="text-lg font-bold">{visibleInspection.status === 'MAPPED' ? 'Bản nháp đã được tạo để kiểm tra' : 'Kế hoạch cần được xem xét thêm'}</h3>
            <p role="status">Đã lưu riêng tư. Kế hoạch cần được kiểm tra trước khi dạy. Đổi nguồn sẽ hủy kết quả hiện tại.</p>
            <p className="font-bold">{visibleInspection.authoringPlan.subjectProfile.subject}</p>
            <p>{visibleInspection.authoringPlan.learningDesign.learningIntention.vi}</p>
            <ul className="list-disc pl-5">{visibleInspection.authoringPlan.learningDesign.successCriteria.map(criterion =>
              <li key={criterion.id}>{criterion.statement.vi} — {criterion.observableEvidence}</li>)}</ul>
            <ol className="space-y-3">{visibleInspection.authoringPlan.activities.map(activity => <li key={activity.id}>
              <details className="rounded-xl bg-white p-3">
                <summary className="cursor-pointer font-bold">{activity.order}. {activity.title.vi} · {activity.durationSec} giây</summary>
                <p className="mt-2">Giáo viên: {activity.teacherAction}</p>
                <p>Học sinh: {activity.studentAction}</p>
                <p>Sản phẩm: {activity.expectedProduct}</p>
                <p>Minh chứng: {activity.expectedEvidence}</p>
                <p>Khi mất mạng: {activity.offlineFallback}</p>
                <ol className="mt-2 list-decimal pl-5">{activity.beats.map(beat => <li key={beat.id}>{beat.instruction}</li>)}</ol>
              </details>
            </li>)}</ol>
            <details><summary className="cursor-pointer font-bold">Dữ liệu kế hoạch và ghi chú kiểm tra</summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify({
                plan: visibleInspection.authoringPlan, diagnostics: visibleInspection.diagnostics,
              }, null, 2)}</pre>
            </details>
          </section>}
          {canonicalDraftId && latestPlanState !== 'REVIEW_REQUIRED' && !isLoading && !isAuthoringIR && (!visibleInspection || visibleInspection.status === 'MAPPED') && <a href={`/lesson-compiler-v832?draft=${encodeURIComponent(canonicalDraftId)}`}
            className="mt-4 block rounded-xl border border-teal-300 bg-teal-50 p-4 font-bold text-teal-950">
            Mở bản nháp để kiểm định và xem trước ba luồng
          </a>}
          {canonicalDraftId && latestPlanState === 'MAPPED' && !isAuthoringIR && <button type="button" disabled={isCompiling}
            onClick={() => { void createV88Preview(); }} className="mt-3 block rounded-xl bg-teal-700 p-4 font-bold text-white disabled:opacity-50">
            {isCompiling ? 'Đang tạo phòng V8.8…' : 'Tạo phòng preview V8.8 ngay'}
          </button>}
          {previewLinks && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
            <p>Đã tạo phòng preview V8.8. Kiểm tra bốn luồng:</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(previewLinks).map(([role, href]) => <a key={role} className="underline" href={href}>{role}: {href}</a>)}</div>
          </div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Tạo bản nháp bằng AI</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">AI chỉ tạo bản nháp để giáo viên duyệt. Nguồn chưa xác minh sẽ được giữ cờ kiểm tra, không tự publish.</p>
          <button type="button" disabled={!bundle || isMutating || isAuthoringIR || issues.some(issue => issue.code === 'SOURCE_CONTENT_UNREADABLE')}
            onClick={() => void generateDraft()} className="mt-5 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isGenerating ? 'Đang tạo bản nháp…' : 'Tạo bản nháp bằng AI'}
          </button>
          {draft && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-black">Đã tạo bản nháp {draft.id}</p>
            <p className="mt-1">{draft.activities.length} hoạt động · {draft.questions.length} câu hỏi · trạng thái {draft.status}.</p>
          </div>}
        </section>
        {draft && !isMutating && !isAuthoringIR && !visibleInspection && <LessonPlanReview draft={draft} onChangeQuestionPrompt={(questionId, prompt) => {
          invalidateAuthoring();
          const nextDraft = { ...draft, questions: draft.questions.map(question => question.id === questionId ? { ...question, prompt } : question), status: 'review_ready' as const };
          setDraft(nextDraft);
          setDraftStatus('review_ready');
          setSourceRevision(3);
          setPackageId(null);
          setCompiledRuntime(null);
          if (draftId) void updateLessonGenDraft(draftId, { revision: 3, status: 'review_ready', planDraft: nextDraft, approval: {} });
        }} />}
        {!isAuthoringIR && !visibleInspection && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Duyệt kế hoạch</h2>
          <p className="mt-2 text-sm text-slate-600">Trạng thái hiện tại: <strong>{draftStatus}</strong>. Duyệt thiết kế mới mở cổng compiler.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={isMutating || !draft || draftStatus !== 'review_ready'} onClick={() => void approveDraft('plan_approved')} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Duyệt kế hoạch</button>
            <button type="button" disabled={isMutating || !draft || draftStatus !== 'plan_approved'} onClick={() => void approveDraft('design_approved')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Duyệt thiết kế</button>
            <button type="button" disabled={isMutating || !draft || draftStatus !== 'design_approved'} onClick={() => void compilePackage()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{isCompiling ? 'Đang compile…' : 'Compile package'}</button>
          </div>
          {packageId && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Package bất biến đã tạo: {packageId}<button type="button" onClick={() => setShowLauncher(true)} className="ml-3 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white">Mở tiết 3 luồng</button></div>}
        </section>}
        {showLauncher && compiledRuntime && packageId && !isAuthoringIR && !visibleInspection && <LiveLessonLauncher definitionOverride={compiledRuntime} definitionKeyOverride={`generated:${packageId}`} onClose={() => setShowLauncher(false)} />}
      </section>
    </main>
  );
};
