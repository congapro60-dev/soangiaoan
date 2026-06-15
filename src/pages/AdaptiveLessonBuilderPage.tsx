import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Brain, CheckCircle2, Clock, FileUp, Layers3, Loader2, Plus, Save, Send, Sparkles, Target, Trash2 } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { sampleAdaptiveLesson } from '../lib/adaptive/sampleAdaptiveLesson';
import {
  buildAdaptiveContentPrompt,
  buildAdaptiveLessonFromContentJson,
  buildAdaptiveReviewPrompt,
  validateAdaptiveLessonPublishReadiness,
  type AdaptiveLessonSource,
} from '../lib/adaptive/adaptiveFromLessonPlan';
import type {
  AdaptiveAssessment,
  AdaptiveLesson,
  AdaptiveQuestion,
  BloomLevel,
  KnowledgeUnit,
  LearningRoute,
  LearningRouteContent,
  LessonStatus,
  WorkedExample,
} from '../lib/adaptive/types';
import { LessonCoverUpload } from '../components/adaptive/LessonCoverUpload';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import type { AppData, LessonPlan } from '../types';
import { getLessonFromFirestore, saveLessonToFirestore } from '../services/adaptiveLessonService';
import { extractTextFromPDF, extractTextFromWord } from '../utils/fileUtils';

const bloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const gradeOptions: AdaptiveLesson['grade'][] = ['10', '11', '12'];
const routeOptions: LearningRoute[] = ['foundation', 'standard', 'challenge'];
const defaultRewardMessage = 'Em đã học xong! Thử thách bạn cùng lớp trong Đấu Trường Tri Thức?';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50';
const textareaClass = `${inputClass} min-h-24 resize-y`;
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60';

const cloneLesson = (lesson: AdaptiveLesson): AdaptiveLesson => JSON.parse(JSON.stringify(lesson));
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeWorkedExample = (objectiveId?: string): WorkedExample => ({
  id: uid('example'),
  title: 'Ví dụ chuẩn',
  problem: '',
  solution: '',
  explanation: '',
  objectiveIds: objectiveId ? [objectiveId] : [],
  timeLimitSeconds: 180,
});

const makeQuestion = (type: AdaptiveQuestion['type'] = 'multiple_choice', objectiveId?: string): AdaptiveQuestion => ({
  id: uid('q'),
  type,
  prompt: '',
  options: type === 'multiple_choice' ? ['A', 'B', 'C', 'D'] : undefined,
  correctAnswer: type === 'multiple_choice' ? 'A' : '',
  explanation: '',
  objectiveIds: objectiveId ? [objectiveId] : [],
  difficulty: 'medium',
  points: 1,
});

const makeAssessment = (purpose: AdaptiveAssessment['purpose'], count: number, objectiveId?: string): AdaptiveAssessment => ({
  id: uid(purpose),
  title: purpose === 'diagnostic' ? 'Test đầu giờ' : purpose === 'exit_ticket' ? 'Exit ticket' : 'Quick check',
  purpose,
  durationMinutes: purpose === 'quick_check' ? 5 : 7,
  questions: Array.from({ length: count }, () => makeQuestion('multiple_choice', objectiveId)),
});

const makeRoute = (route: LearningRoute, explanation = '', objectiveId?: string): LearningRouteContent => ({
  route,
  explanation,
  workedExamples: [makeWorkedExample(objectiveId)],
  practiceTasks: [],
});

const ensureRoute = (unit: KnowledgeUnit, route: LearningRoute): LearningRouteContent => (
  unit.routes.find(item => item.route === route) || makeRoute(route, '', unit.objectiveIds[0])
);

const makeUnit = (objectiveId?: string): KnowledgeUnit => ({
  id: uid('unit'),
  title: 'Mảnh kiến thức mới',
  objectiveIds: objectiveId ? [objectiveId] : [],
  estimatedMinutes: 10,
  routes: routeOptions.map(route => makeRoute(route, '', objectiveId)),
  quickCheck: makeAssessment('quick_check', 2, objectiveId),
  maxRemediationAttempts: 2,
  supportTasks: [],
  enrichmentTasks: [],
  externalToolIds: [],
});

const makeDraftLesson = (teacherId: string): AdaptiveLesson => {
  const base = cloneLesson(sampleAdaptiveLesson);
  const firstObjectiveId = base.objectives[0]?.id || uid('obj');
  const now = new Date().toISOString();

  return {
    ...base,
    id: `adaptive-${Date.now()}`,
    title: '',
    teacherId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    coverImageRealistic: undefined,
    coverImageTextbook: undefined,
    completionReward: { toolId: 'gamedoikhang', message: defaultRewardMessage },
    objectives: base.objectives.slice(0, 1),
    diagnosticTest: makeAssessment('diagnostic', 5, firstObjectiveId),
    knowledgeUnits: [makeUnit(firstObjectiveId)],
    exitTicket: makeAssessment('exit_ticket', 3, firstObjectiveId),
  };
};

const normalizeLessonFromFirestore = (raw: AdaptiveLesson): AdaptiveLesson => ({
  ...raw,
  knowledgeUnits: raw.knowledgeUnits ?? [],
  objectives: raw.objectives ?? [],
  diagnosticTest: raw.diagnosticTest ?? makeAssessment('diagnostic', 5),
  exitTicket: raw.exitTicket ?? makeAssessment('exit_ticket', 3),
  preparation: raw.preparation ?? {
    readingInstructions: '',
    guidingQuestions: [],
    estimatedMinutes: 0,
  },
  fiveStepFlow: raw.fiveStepFlow ?? { steps: [] },
  completionReward: raw.completionReward ?? {
    toolId: 'gamedoikhang',
    message: defaultRewardMessage,
  },
});

interface AdaptiveLessonBuilderPageProps {
  embedded?: boolean;
  lessonId?: string;
  settings?: AppData['settings'];
  lessonPlans?: LessonPlan[];
  onBackToList?: () => void;
  onPreviewLesson?: (lessonId: string) => void;
  onNeedSettings?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const readUploadedLessonFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (extension === 'pdf') return extractTextFromPDF(file);
  if (extension === 'docx' || extension === 'doc') return extractTextFromWord(file);
  return file.text();
};

const makeSourceFromPlan = (plan: LessonPlan): AdaptiveLessonSource => ({
  title: plan.title || 'Giáo án đã soạn',
  content: plan.content || '',
  grade: plan.grade,
  week: plan.week,
  sourceLabel: `Thư viện giáo án: ${plan.title || plan.id}`,
});

export const AdaptiveLessonBuilderPage = ({ embedded = false, lessonId, settings, lessonPlans = [], onBackToList, onPreviewLesson, onNeedSettings, showToast }: AdaptiveLessonBuilderPageProps) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = lessonId ?? routeId;
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [lesson, setLesson] = useState<AdaptiveLesson | null>(null);
  const [step, setStep] = useState(0);
  const [authReady, setAuthReady] = useState(auth.currentUser !== null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [sharedRoutes, setSharedRoutes] = useState<Record<string, boolean>>({});
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [sourceLesson, setSourceLesson] = useState<AdaptiveLessonSource | null>(null);
  const [reviewedPlan, setReviewedPlan] = useState('');
  const [isReviewingSource, setIsReviewingSource] = useState(false);
  const [isSourceApproved, setIsSourceApproved] = useState(id !== 'new');
  const [uploadingSource, setUploadingSource] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const adaptiveReadyPlans = useMemo(() => lessonPlans.filter(plan => {
    const content = (plan.content || '').toLowerCase();
    return content.includes('ánh xạ sang bài học phân') || content.includes('pre-test') || content.includes('foundation') || content.includes('quick check');
  }), [lessonPlans]);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!authReady) return;   // Chờ Firebase persistence rehydrate

        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLesson(null);
          setError('Bạn cần đăng nhập để tạo bài học phân hoá.');
          return;
        }

        if (!id || id === 'new') {
          const draft = makeDraftLesson(currentUser.uid);
          setLesson(draft);
          setExpandedUnitId(draft.knowledgeUnits[0]?.id || null);
          setIsSourceApproved(false);
          setReviewedPlan('');
          setSourceLesson(null);
          return;
        }

        const raw = await getLessonFromFirestore(id);
        if (!raw) {
          setLesson(null);
          setError('Không tìm thấy bài học phân hoá.');
          return;
        }

        const found = normalizeLessonFromFirestore(raw);
        setLesson(found);
        setExpandedUnitId(found.knowledgeUnits[0]?.id ?? null);
        setIsSourceApproved(true);
      } catch (loadError) {
        console.error('Không tải được bài học adaptive', loadError);
        setLesson(null);
        setError('Không tải được bài học phân hoá từ Firestore.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, authReady]);

  const objectiveOptions = lesson?.objectives || [];
  const steps = ['Thông tin cơ bản', 'Mục tiêu & Chẩn đoán', 'Các mảnh kiến thức', 'Hoàn tất & Xuất bản'];
  const lessonCompleteness = lesson ? Math.min(100, Math.round((
    (lesson.title.trim() ? 20 : 0) +
    (lesson.objectives.length ? 25 : 0) +
    (lesson.diagnosticTest.questions.length ? 15 : 0) +
    (lesson.knowledgeUnits.length ? 25 : 0) +
    (lesson.exitTicket.questions.length ? 15 : 0)
  ))) : 0;

  const updateLesson = (patch: Partial<AdaptiveLesson>) => {
    setLesson(prev => prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : prev);
  };

  const updateQuestion = (assessmentKey: 'diagnosticTest' | 'exitTicket', questionId: string, patch: Partial<AdaptiveQuestion>) => {
    if (!lesson) return;
    updateLesson({
      [assessmentKey]: {
        ...lesson[assessmentKey],
        questions: lesson[assessmentKey].questions.map(question => question.id === questionId ? { ...question, ...patch } : question),
      },
    } as Partial<AdaptiveLesson>);
  };

  const updateUnit = (unitId: string, patch: Partial<KnowledgeUnit>) => {
    if (!lesson) return;
    updateLesson({ knowledgeUnits: lesson.knowledgeUnits.map(unit => unit.id === unitId ? { ...unit, ...patch } : unit) });
  };

  const updateUnitRoute = (unit: KnowledgeUnit, route: LearningRoute, patch: Partial<LearningRouteContent>) => {
    const routes = routeOptions.map(routeName => {
      const current = ensureRoute(unit, routeName);
      return routeName === route ? { ...current, ...patch, route } : current;
    });
    updateUnit(unit.id, { routes });
  };

  const updateUnitQuickQuestion = (unit: KnowledgeUnit, questionId: string, patch: Partial<AdaptiveQuestion>) => {
    updateUnit(unit.id, {
      quickCheck: {
        ...unit.quickCheck,
        questions: unit.quickCheck.questions.map(question => question.id === questionId ? { ...question, ...patch } : question),
      },
    });
  };

  const normalizeForSave = (status: LessonStatus): AdaptiveLesson | null => {
    if (!lesson) return null;
    const now = new Date().toISOString();
    const normalizedUnits = lesson.knowledgeUnits.map(unit => {
      const standard = ensureRoute(unit, 'standard');
      const routes = sharedRoutes[unit.id]
        ? routeOptions.map(route => ({ ...standard, id: standard.route === route ? standard.route : standard.route, route }))
        : routeOptions.map(route => ensureRoute(unit, route));
      return { ...unit, routes };
    });

    return {
      ...lesson,
      title: lesson.title.trim(),
      status,
      updatedAt: now,
      knowledgeUnits: normalizedUnits,
      completionReward: {
        toolId: lesson.completionReward?.toolId || 'gamedoikhang',
        message: lesson.completionReward?.message || defaultRewardMessage,
      },
    };
  };

  const goBackToList = () => {
    if (onBackToList) onBackToList();
    else navigate('/adaptive-lessons');
  };

  const reviewSourceWithAI = async (source: AdaptiveLessonSource) => {
    if (!settings) return;
    if (!source.content.trim()) {
      setError('Giáo án nguồn chưa có nội dung để kiểm tra.');
      return;
    }
    if (!getActiveApiKey(settings)) {
      setError('Cần nhập API Key AI trước khi rà soát giáo án nguồn.');
      onNeedSettings?.();
      return;
    }

    setIsReviewingSource(true);
    setError(null);
    setSourceLesson(source);
    try {
      const reviewed = await callAI(buildAdaptiveReviewPrompt(source), settings);
      setReviewedPlan(reviewed.trim());
      showToast?.('AI đã rà soát và sắp xếp giáo án nguồn để bạn duyệt.', 'success');
    } catch (reviewError) {
      console.error('Không rà soát được giáo án nguồn', reviewError);
      setError(reviewError instanceof Error ? reviewError.message : 'Không rà soát được giáo án nguồn bằng AI.');
    } finally {
      setIsReviewingSource(false);
    }
  };

  const reviewSelectedSavedPlan = async () => {
    const plan = lessonPlans.find(item => item.id === selectedPlanId);
    if (!plan) {
      setError('Vui lòng chọn một giáo án đã lưu để tạo bài học phân hoá.');
      return;
    }
    await reviewSourceWithAI(makeSourceFromPlan(plan));
  };

  const handleUploadSource = async (file?: File) => {
    if (!file) return;
    setUploadingSource(true);
    setError(null);
    try {
      const content = await readUploadedLessonFile(file);
      const source: AdaptiveLessonSource = {
        title: file.name.replace(/\.[^.]+$/, ''),
        content,
        grade: lesson?.grade || '10',
        week: lesson?.curriculumRef?.week || '',
        sourceLabel: `Tệp tải lên: ${file.name}`,
      };
      await reviewSourceWithAI(source);
    } catch (uploadError) {
      console.error('Không đọc được giáo án tải lên', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Không đọc được giáo án tải lên.');
    } finally {
      setUploadingSource(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const approveReviewedSource = async () => {
    if (!user || !sourceLesson || !reviewedPlan.trim()) return;
    if (!settings || !getActiveApiKey(settings)) {
      setError('Cần nhập API Key AI trước khi tạo nội dung bài học thật từ giáo án đã duyệt.');
      onNeedSettings?.();
      return;
    }

    setIsGeneratingContent(true);
    setError(null);
    try {
      const contentJson = await callAI(buildAdaptiveContentPrompt(sourceLesson, reviewedPlan), settings);
      const nextLesson = buildAdaptiveLessonFromContentJson(sourceLesson, reviewedPlan, contentJson, user.uid);
      setLesson(nextLesson);
      setExpandedUnitId(nextLesson.knowledgeUnits[0]?.id || null);
      setIsSourceApproved(true);
      setStep(0);
      showToast?.('Đã tạo bài học phân hoá bằng JSON nội dung thật và kiểm tra chất lượng đầu ra.', 'success');
    } catch (contentErr) {
      console.warn('[AdaptiveBuilder] Không tạo được nội dung adaptive đạt chuẩn', contentErr);
      setError(contentErr instanceof Error ? contentErr.message : 'Không tạo được bài học phân hoá từ giáo án đã duyệt.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const openPreview = (targetLessonId: string) => {
    if (onPreviewLesson) onPreviewLesson(targetLessonId);
    else navigate(`/adaptive-portal/${targetLessonId}`);
  };

  const save = async (status: LessonStatus) => {
    const nextLesson = normalizeForSave(status);
    if (!nextLesson) return;
    if (!nextLesson.title) {
      setError('Tiêu đề bài học là bắt buộc.');
      setStep(0);
      return;
    }

    if (status === 'published') {
      const publishIssues = validateAdaptiveLessonPublishReadiness(nextLesson);
      const errors = publishIssues.filter(issue => issue.severity === 'error');
      if (errors.length > 0) {
        setError(`Chưa thể xuất bản vì còn ${errors.length} lỗi chất lượng nội dung. ${errors.slice(0, 4).map(issue => issue.message).join(' ')}`);
        setStep(3);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await saveLessonToFirestore(nextLesson);
      setLesson(nextLesson);
      if (status === 'published') openPreview(nextLesson.id);
      else if (!embedded) navigate(`/adaptive-builder/${nextLesson.id}`, { replace: true });
    } catch (saveError) {
      console.error('Không lưu được bài học adaptive', saveError);
      setError('Không lưu được bài học phân hoá lên Firestore.');
    } finally {
      setSaving(false);
    }
  };

  if (!authReady) return <BuilderShell embedded={embedded}><div className="rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-sm">Đang kiểm tra phiên đăng nhập...</div></BuilderShell>;
  if (loading) return <BuilderShell embedded={embedded}><div className="rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-sm">Đang tải bài học phân hoá...</div></BuilderShell>;
  if (error && !lesson) return <BuilderShell embedded={embedded}><ErrorPanel message={error} /></BuilderShell>;
  if (!lesson || !user) return <BuilderShell embedded={embedded}><ErrorPanel message="Không có dữ liệu bài học hoặc phiên đăng nhập." /></BuilderShell>;

  if ((id === 'new' || !id) && !isSourceApproved) {
    return (
      <BuilderShell embedded={embedded}>
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-sky-100 p-6 shadow-sm">
          <button onClick={goBackToList} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-black text-slate-500 shadow-sm hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
          </button>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100">
                <Sparkles className="h-3.5 w-3.5" /> Adaptive Builder
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tạo bài học phân hoá từ giáo án nguồn</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Chọn giáo án đã soạn hoặc tải giáo án lên. AI rà soát, chuẩn hoá cấu trúc và đưa giáo viên duyệt trước khi tạo tuyến học Foundation / Standard / Challenge.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Luồng hiện tại</p>
              <div className="mt-3 space-y-3 text-sm font-bold text-slate-700">
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">1</span> Rà soát giáo án nguồn</div>
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">2</span> Duyệt nội dung chuẩn hoá</div>
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">3</span> Bóc tách tuyến học</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

        <section className="space-y-5 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5 transition hover:border-blue-100 hover:bg-white hover:shadow-sm">
              <h2 className="text-lg font-black text-slate-800">1. Chọn giáo án đã soạn</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Ưu tiên các giáo án định dạng “Bài học phân hoá” đã lưu trong thư viện.</p>
              <select value={selectedPlanId} onChange={event => setSelectedPlanId(event.target.value)} className={`${inputClass} mt-4`}>
                <option value="">-- Chọn giáo án nguồn --</option>
                {(adaptiveReadyPlans.length ? adaptiveReadyPlans : lessonPlans).map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.title || 'Giáo án chưa đặt tên'} · Lớp {plan.grade || '?'}</option>
                ))}
              </select>
              <button type="button" onClick={() => void reviewSelectedSavedPlan()} disabled={isReviewingSource || uploadingSource || !selectedPlanId} className={`${primaryButtonClass} mt-4`}>
                {isReviewingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI rà soát giáo án đã chọn
              </button>
            </div>

            <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 p-5 transition hover:bg-blue-50 hover:shadow-sm">
              <h2 className="text-lg font-black text-slate-800">2. Hoặc tải giáo án lên</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Hỗ trợ .docx, .pdf, .txt, .md. AI vẫn kiểm tra lại trước khi tạo bài học.</p>
              <input ref={uploadInputRef} type="file" accept=".doc,.docx,.pdf,.txt,.md" className="hidden" onChange={event => void handleUploadSource(event.target.files?.[0])} />
              <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={isReviewingSource || uploadingSource} className={`${secondaryButtonClass} mt-4`}>
                {uploadingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {uploadingSource ? 'Đang đọc file...' : 'Tải giáo án lên & rà soát'}
              </button>
            </div>
          </div>

          {sourceLesson && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Nguồn đang rà soát: {sourceLesson.sourceLabel || sourceLesson.title}</div>}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={approveReviewedSource} disabled={!reviewedPlan.trim() || isReviewingSource || uploadingSource || isGeneratingContent} className={primaryButtonClass}>
              {isGeneratingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isGeneratingContent ? 'Đang bóc tách cấu trúc bài học...' : 'Duyệt bản rà soát & tạo cấu trúc bài học'}
            </button>
          </div>

          {reviewedPlan ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-800">Bản giáo án đã được AI rà soát để tạo bài phân hoá</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">Chờ giáo viên duyệt</span>
              </div>
              <div className="max-h-[560px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white p-5 text-sm font-semibold leading-7 text-slate-700 shadow-inner">{reviewedPlan}</div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-blue-500" />
              <p className="font-black text-slate-700">Chưa có bản rà soát.</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">Chọn giáo án đã lưu hoặc tải file lên. AI sẽ sắp xếp mục tiêu, kiến thức, hình ảnh minh hoạ, câu hỏi và bài tập để bạn kiểm tra trước.</p>
            </div>
          )}
        </section>
      </BuilderShell>
    );
  }

  return (
    <BuilderShell embedded={embedded}>
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-sky-100 p-6 shadow-sm">
          <button onClick={goBackToList} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-black text-slate-500 shadow-sm hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
          </button>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100">
                <Brain className="h-3.5 w-3.5" /> Lesson Path Designer
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Thiết kế bài học phân hoá</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Triển khai từ giáo án nguồn đã được AI rà soát: mục tiêu, chẩn đoán, các mảnh kiến thức, tuyến học và xuất bản cổng học sinh.</p>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Mức hoàn thiện</p>
                <span className="text-lg font-black text-blue-700">{lessonCompleteness}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${lessonCompleteness}%` }} /></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-500">
                <div className="rounded-2xl bg-slate-50 p-3"><Target className="mx-auto mb-1 h-4 w-4 text-blue-600" />{lesson.objectives.length} mục tiêu</div>
                <div className="rounded-2xl bg-slate-50 p-3"><Layers3 className="mx-auto mb-1 h-4 w-4 text-blue-600" />{lesson.knowledgeUnits.length} mảnh</div>
                <div className="rounded-2xl bg-slate-50 p-3"><Clock className="mx-auto mb-1 h-4 w-4 text-blue-600" />{lesson.preparation.estimatedMinutes || 0} phút</div>
              </div>
            </div>
          </div>
        </div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        {steps.map((label, index) => (
          <button key={label} onClick={() => setStep(index)} className={`group rounded-3xl border px-4 py-4 text-left text-sm font-black transition ${step === index ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100' : 'border-slate-100 bg-white text-slate-500 shadow-sm hover:border-blue-100 hover:text-blue-600'}`}>
            <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-2xl text-xs ${step === index ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>{index + 1}</span>
            <span className="block text-xs opacity-70">Bước {index + 1}</span>{label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-2 flex items-start gap-3 rounded-3xl bg-blue-50 p-4">
            <BookOpenCheck className="mt-0.5 h-5 w-5 text-blue-600" />
            <div><h2 className="font-black text-slate-900">Thông tin nền của bài học</h2><p className="text-sm font-semibold text-slate-500">Giữ ngắn gọn để học sinh nhận diện bài học nhanh trên cổng thích ứng.</p></div>
          </div>
          <Field label="Tiêu đề bài *"><input value={lesson.title} onChange={event => updateLesson({ title: event.target.value })} className={inputClass} placeholder="VD: Toán 11 — Cấp số cộng" /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Lớp"><select aria-label="Lớp" title="Lớp" value={lesson.grade} onChange={event => updateLesson({ grade: event.target.value as AdaptiveLesson['grade'] })} className={inputClass}>{gradeOptions.map(grade => <option key={grade}>{grade}</option>)}</select></Field>
            <Field label="Tuần"><input aria-label="Tuần" title="Tuần" value={lesson.curriculumRef?.week || ''} onChange={event => updateLesson({ curriculumRef: { ...lesson.curriculumRef, week: event.target.value } })} className={inputClass} /></Field>
            <Field label="Tiết số"><input aria-label="Tiết số" title="Tiết số" type="number" value={lesson.curriculumRef?.period || 1} onChange={event => updateLesson({ curriculumRef: { ...lesson.curriculumRef, period: Number(event.target.value) } })} className={inputClass} /></Field>
          </div>
          <Field label="Hướng dẫn chuẩn bị"><textarea value={lesson.preparation.readingInstructions} onChange={event => updateLesson({ preparation: { ...lesson.preparation, readingInstructions: event.target.value } })} className={textareaClass} /></Field>
          <Field label="Thời gian chuẩn bị ước tính (phút)"><input type="number" value={lesson.preparation.estimatedMinutes} onChange={event => updateLesson({ preparation: { ...lesson.preparation, estimatedMinutes: Number(event.target.value) } })} className={inputClass} /></Field>
          <LessonCoverUpload lessonId={lesson.id} currentRealistic={lesson.coverImageRealistic} currentTextbook={lesson.coverImageTextbook} onSaved={urls => updateLesson({ coverImageRealistic: urls.realistic, coverImageTextbook: urls.textbook })} />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-800">Mục tiêu học tập</h2>
            <button onClick={() => updateLesson({ objectives: [...lesson.objectives, { id: uid('obj'), code: `OBJ-${lesson.objectives.length + 1}`, title: '', description: '', bloomLevel: 'understand', masteryThreshold: 0.7, prerequisiteObjectiveIds: [], commonMisconceptions: [] }] })} className={secondaryButtonClass}>
              <Plus className="h-4 w-4" /> Thêm mục tiêu
            </button>
          </div>
          {lesson.objectives.map(objective => (
            <div key={objective.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
              <input aria-label={`Tên mục tiêu ${objective.code || objective.id}`} title="Tên mục tiêu" value={objective.title} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, title: event.target.value, description: event.target.value } : item) })} className={inputClass} placeholder="Tên mục tiêu" />
              <select aria-label={`Cấp Bloom của ${objective.code || objective.id}`} title="Cấp Bloom" value={objective.bloomLevel} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, bloomLevel: event.target.value as BloomLevel } : item) })} className={inputClass}>{bloomLevels.map(level => <option key={level}>{level}</option>)}</select>
              <input aria-label={`Ngưỡng đạt mục tiêu ${objective.code || objective.id}`} title="Ngưỡng đạt mục tiêu" type="number" value={Math.round(objective.masteryThreshold * 100)} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, masteryThreshold: Number(event.target.value) / 100 } : item) })} className={inputClass} />
              <button aria-label={`Xóa mục tiêu ${objective.title || objective.code || objective.id}`} title="Xóa mục tiêu" onClick={() => updateLesson({ objectives: lesson.objectives.filter(item => item.id !== objective.id) })} className={dangerButtonClass}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <QuestionEditor title="Diagnostic test" questions={lesson.diagnosticTest.questions} objectives={objectiveOptions} onAdd={() => updateLesson({ diagnosticTest: { ...lesson.diagnosticTest, questions: [...lesson.diagnosticTest.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateLesson({ diagnosticTest: { ...lesson.diagnosticTest, questions: lesson.diagnosticTest.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateQuestion('diagnosticTest', questionId, patch)} />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          {lesson.knowledgeUnits.map(unit => {
            const standard = ensureRoute(unit, 'standard');
            const foundation = ensureRoute(unit, 'foundation');
            const challenge = ensureRoute(unit, 'challenge');
            const example = standard.workedExamples[0] || makeWorkedExample(unit.objectiveIds[0]);

            return (
              <div key={unit.id} className="rounded-2xl border border-slate-100">
                <button onClick={() => setExpandedUnitId(expandedUnitId === unit.id ? null : unit.id)} className="w-full px-5 py-4 text-left font-black text-slate-800">
                  {unit.title || 'Mảnh kiến thức chưa đặt tên'}
                </button>
                {expandedUnitId === unit.id && (
                  <div className="space-y-4 border-t border-slate-100 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Tên mảnh"><input aria-label={`Tên mảnh kiến thức ${unit.title || unit.id}`} title="Tên mảnh kiến thức" value={unit.title} onChange={event => updateUnit(unit.id, { title: event.target.value })} className={inputClass} /></Field>
                      <Field label="Thời gian ước tính"><input aria-label={`Thời gian ước tính cho ${unit.title || unit.id}`} title="Thời gian ước tính" type="number" value={unit.estimatedMinutes} onChange={event => updateUnit(unit.id, { estimatedMinutes: Number(event.target.value) })} className={inputClass} /></Field>
                    </div>
                    <Field label="Giải thích Standard"><textarea aria-label={`Giải thích Standard cho ${unit.title || unit.id}`} title="Giải thích Standard" value={standard.explanation} onChange={event => updateUnitRoute(unit, 'standard', { explanation: event.target.value })} className={textareaClass} /></Field>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={sharedRoutes[unit.id] ?? true} onChange={event => setSharedRoutes(prev => ({ ...prev, [unit.id]: event.target.checked }))} /> Dùng nội dung Standard cho Foundation/Challenge
                    </label>
                    {!(sharedRoutes[unit.id] ?? true) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Giải thích Foundation"><textarea aria-label={`Giải thích Foundation cho ${unit.title || unit.id}`} title="Giải thích Foundation" value={foundation.explanation} onChange={event => updateUnitRoute(unit, 'foundation', { explanation: event.target.value })} className={textareaClass} /></Field>
                        <Field label="Giải thích Challenge"><textarea aria-label={`Giải thích Challenge cho ${unit.title || unit.id}`} title="Giải thích Challenge" value={challenge.explanation} onChange={event => updateUnitRoute(unit, 'challenge', { explanation: event.target.value })} className={textareaClass} /></Field>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Worked Example — Đề bài"><textarea aria-label={`Đề bài ví dụ mẫu cho ${unit.title || unit.id}`} title="Đề bài ví dụ mẫu" value={example.problem} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, problem: event.target.value }] })} className={textareaClass} /></Field>
                      <Field label="Worked Example — Lời giải"><textarea aria-label={`Lời giải ví dụ mẫu cho ${unit.title || unit.id}`} title="Lời giải ví dụ mẫu" value={example.solution} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, solution: event.target.value }] })} className={textareaClass} /></Field>
                      <Field label="Worked Example — Giải thích"><textarea aria-label={`Giải thích ví dụ mẫu cho ${unit.title || unit.id}`} title="Giải thích ví dụ mẫu" value={example.explanation} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, explanation: event.target.value }] })} className={textareaClass} /></Field>
                    </div>
                    <QuestionEditor title="Quick Check" questions={unit.quickCheck.questions} objectives={objectiveOptions} onAdd={() => updateUnit(unit.id, { quickCheck: { ...unit.quickCheck, questions: [...unit.quickCheck.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateUnit(unit.id, { quickCheck: { ...unit.quickCheck, questions: unit.quickCheck.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateUnitQuickQuestion(unit, questionId, patch)} />
                    <button aria-label={`Xóa mảnh kiến thức ${unit.title || unit.id}`} onClick={() => updateLesson({ knowledgeUnits: lesson.knowledgeUnits.filter(item => item.id !== unit.id) })} className={dangerButtonClass}><Trash2 className="h-4 w-4" /> Xóa mảnh kiến thức</button>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => {
            const nextUnit = makeUnit(objectiveOptions[0]?.id);
            updateLesson({ knowledgeUnits: [...lesson.knowledgeUnits, nextUnit] });
            setExpandedUnitId(nextUnit.id);
          }} className={secondaryButtonClass}><Plus className="h-4 w-4" /> Thêm mảnh kiến thức</button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <QuestionEditor title="Exit Ticket" questions={lesson.exitTicket.questions} objectives={objectiveOptions} onAdd={() => updateLesson({ exitTicket: { ...lesson.exitTicket, questions: [...lesson.exitTicket.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateLesson({ exitTicket: { ...lesson.exitTicket, questions: lesson.exitTicket.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateQuestion('exitTicket', questionId, patch)} />
          <Field label="Completion Reward message"><textarea aria-label="Thông điệp thưởng hoàn thành" title="Thông điệp thưởng hoàn thành" value={lesson.completionReward?.message || defaultRewardMessage} onChange={event => updateLesson({ completionReward: { toolId: lesson.completionReward?.toolId || 'gamedoikhang', message: event.target.value } })} className={textareaClass} /></Field>
          <div className="flex flex-wrap gap-3">
            <button disabled={saving} onClick={() => void save('draft')} className={secondaryButtonClass}><Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu nháp'}</button>
            <button disabled={saving} onClick={() => void save('published')} className={primaryButtonClass}><Send className="h-4 w-4" /> Xuất bản</button>
          </div>
        </section>
      )}
    </BuilderShell>
  );
};

const BuilderShell = ({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) => (
  <div className={embedded ? 'text-slate-900' : 'min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_34%,#f8fafc_100%)] p-4 text-slate-900 sm:p-8'}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </div>
);
const ErrorPanel = ({ message }: { message: string }) => <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">{message}</div>;
const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>{children}</label>;

interface QuestionEditorProps {
  title: string;
  questions: AdaptiveQuestion[];
  objectives: AdaptiveLesson['objectives'];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onChange: (id: string, patch: Partial<AdaptiveQuestion>) => void;
}

const QuestionEditor = ({ title, questions, objectives, onAdd, onDelete, onChange }: QuestionEditorProps) => (
  <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-black text-slate-800">{title}</h3>
      <button onClick={onAdd} className={secondaryButtonClass}><Plus className="h-4 w-4" /> Thêm câu hỏi</button>
    </div>
    {questions.map((question, index) => {
      const options = question.options?.length ? question.options : ['A', 'B', 'C', 'D'];
      return (
        <div key={question.id} className="space-y-3 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-slate-700">Câu {index + 1}</p>
            <button aria-label={`Xóa câu hỏi ${index + 1} trong ${title}`} title="Xóa câu hỏi" onClick={() => onDelete(question.id)} className={dangerButtonClass}><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea aria-label={`Nội dung câu hỏi ${index + 1} trong ${title}`} title="Nội dung câu hỏi" value={question.prompt} onChange={event => onChange(question.id, { prompt: event.target.value })} className={textareaClass} placeholder="Nội dung câu hỏi" />
          <div className="grid gap-2 md:grid-cols-4">
            {options.map((option, optionIndex) => (
              <input key={optionIndex} aria-label={`Phương án ${optionIndex + 1} của câu ${index + 1} trong ${title}`} title={`Phương án ${optionIndex + 1}`} value={option} onChange={event => {
                const nextOptions = [...options];
                nextOptions[optionIndex] = event.target.value;
                onChange(question.id, { options: nextOptions });
              }} className={inputClass} placeholder={`Option ${optionIndex + 1}`} />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select aria-label={`Đáp án đúng của câu ${index + 1} trong ${title}`} title="Đáp án đúng" value={question.correctAnswer || ''} onChange={event => onChange(question.id, { correctAnswer: event.target.value })} className={inputClass}>
              {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select aria-label={`Mục tiêu liên kết của câu ${index + 1} trong ${title}`} title="Mục tiêu liên kết" value={question.objectiveIds[0] || ''} onChange={event => onChange(question.id, { objectiveIds: event.target.value ? [event.target.value] : [] })} className={inputClass}>
              <option value="">Chọn mục tiêu</option>
              {objectives.map(objective => <option key={objective.id} value={objective.id}>{objective.title || objective.code}</option>)}
            </select>
          </div>
        </div>
      );
    })}
  </div>
);
