import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Plus, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { sampleAdaptiveLesson } from '../lib/adaptive/sampleAdaptiveLesson';
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
import type { AppData } from '../types';
import { getLessonFromFirestore, saveLessonToFirestore } from '../services/adaptiveLessonService';

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
  onBackToList?: () => void;
  onPreviewLesson?: (lessonId: string) => void;
  onNeedSettings?: () => void;
  showToast?: (message: string, type?: string) => void;
}

const buildFiveStepDemoPrompt = (lesson: AdaptiveLesson, brief: string) => `Bạn là chuyên gia thiết kế bài học eLearning môn Toán.

NHIỆM VỤ: Tạo DEMO GIÁO ÁN CHI TIẾT theo đúng quy trình 5 bước trước khi triển khai thành bài học phân hoá.

THÔNG TIN BÀI HỌC:
- Tiêu đề tạm: ${lesson.title || 'Chưa đặt tên'}
- Lớp: ${lesson.grade}
- Tuần: ${lesson.curriculumRef?.week || 'Chưa rõ'}
- Tiết: ${lesson.curriculumRef?.period || 1}
- Mô tả/yêu cầu của giáo viên: ${brief || 'Thiết kế bài học Toán phù hợp chương trình phổ thông.'}

QUY TRÌNH BẮT BUỘC:
1. Kết nối
2. Chẩn đoán
3. Hình thành kiến thức
4. Luyện tập và điều chỉnh
5. Phản tư

YÊU CẦU OUTPUT:
- Viết bằng tiếng Việt.
- Trình bày như giáo án chi tiết để giáo viên duyệt.
- Mỗi bước phải có: mục tiêu, hoạt động giáo viên, hoạt động học sinh, học liệu/công cụ số, sản phẩm cần đạt, thời lượng.
- Sau phần giáo án, thêm mục "Ánh xạ sang bài học phân hoá" gồm: mục tiêu học tập, test chẩn đoán, mảnh kiến thức, 3 tuyến Foundation/Standard/Challenge, quick check, exit ticket.
- Không xuất JSON. Không viết mã. Không nói chung chung.`;

export const AdaptiveLessonBuilderPage = ({ embedded = false, lessonId, settings, onBackToList, onPreviewLesson, onNeedSettings, showToast }: AdaptiveLessonBuilderPageProps) => {
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
  const [aiDemoBrief, setAiDemoBrief] = useState('');
  const [aiDemoPlan, setAiDemoPlan] = useState('');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isDemoApproved, setIsDemoApproved] = useState(id !== 'new');

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
          setIsDemoApproved(false);
          setAiDemoPlan('');
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
        setIsDemoApproved(true);
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

  const generateFiveStepDemo = async () => {
    if (!lesson || !settings) return;
    if (!getActiveApiKey(settings)) {
      setError('Cần nhập API Key AI trước khi tạo demo giáo án 5 bước.');
      onNeedSettings?.();
      return;
    }

    setIsGeneratingDemo(true);
    setError(null);
    try {
      const demo = await callAI(buildFiveStepDemoPrompt(lesson, aiDemoBrief), settings);
      setAiDemoPlan(demo.trim());
      showToast?.('Đã tạo demo giáo án 5 bước để duyệt.', 'success');
    } catch (demoError) {
      console.error('Không tạo được demo giáo án 5 bước', demoError);
      setError(demoError instanceof Error ? demoError.message : 'Không tạo được demo giáo án 5 bước bằng AI.');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const approveFiveStepDemo = () => {
    if (!lesson || !aiDemoPlan.trim()) return;
    const titleFromBrief = lesson.title.trim() || aiDemoBrief.split('\n')[0]?.trim() || 'Bài học phân hoá mới';
    updateLesson({
      title: titleFromBrief,
      preparation: {
        ...lesson.preparation,
        readingInstructions: lesson.preparation.readingInstructions || 'Đọc trước nội dung theo giáo án demo 5 bước đã được duyệt.',
        guidingQuestions: lesson.preparation.guidingQuestions?.length ? lesson.preparation.guidingQuestions : [
          'Kiến thức nền nào học sinh cần có trước khi vào bài?',
          'Dấu hiệu nào cho thấy học sinh cần học theo tuyến hỗ trợ?',
          'Sản phẩm học tập cuối bài cần chứng minh năng lực nào?',
        ],
        estimatedMinutes: lesson.preparation.estimatedMinutes || 10,
      },
      fiveStepFlow: lesson.fiveStepFlow.steps.length ? lesson.fiveStepFlow : sampleAdaptiveLesson.fiveStepFlow,
    });
    setIsDemoApproved(true);
    setStep(0);
    showToast?.('Đã duyệt demo. Bây giờ có thể triển khai bài học phân hoá.', 'success');
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

  if ((id === 'new' || !id) && !isDemoApproved) {
    return (
      <BuilderShell embedded={embedded}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button onClick={goBackToList} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600">
              <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
            </button>
            <h1 className="text-3xl font-black text-slate-900">Tạo demo giáo án 5 bước trước</h1>
            <p className="text-sm font-semibold text-slate-500">AI phải tạo giáo án chi tiết để giáo viên duyệt trước khi triển khai bài học phân hoá.</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

        <section className="space-y-5 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tiêu đề bài học"><input value={lesson.title} onChange={event => updateLesson({ title: event.target.value })} className={inputClass} placeholder="VD: Toán 11 — Cấp số cộng" /></Field>
            <Field label="Lớp"><select value={lesson.grade} onChange={event => updateLesson({ grade: event.target.value as AdaptiveLesson['grade'] })} className={inputClass}>{gradeOptions.map(grade => <option key={grade}>{grade}</option>)}</select></Field>
            <Field label="Tiết số"><input type="number" value={lesson.curriculumRef?.period || 1} onChange={event => updateLesson({ curriculumRef: { ...lesson.curriculumRef, period: Number(event.target.value) } })} className={inputClass} /></Field>
          </div>

          <Field label="Yêu cầu / file eLearning ánh xạ / ghi chú của giáo viên">
            <textarea
              value={aiDemoBrief}
              onChange={event => setAiDemoBrief(event.target.value)}
              className={`${textareaClass} min-h-36`}
              placeholder="Nhập chủ đề, chuẩn đầu ra, nội dung từ file eLearning ánh xạ hoặc yêu cầu riêng. AI sẽ tạo demo giáo án chi tiết theo quy trình 5 bước để bạn duyệt trước."
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void generateFiveStepDemo()} disabled={isGeneratingDemo} className={primaryButtonClass}>
              {isGeneratingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGeneratingDemo ? 'AI đang tạo demo...' : 'AI tạo demo giáo án 5 bước'}
            </button>
            <button type="button" onClick={approveFiveStepDemo} disabled={!aiDemoPlan.trim() || isGeneratingDemo} className={secondaryButtonClass}>
              <CheckCircle2 className="h-4 w-4" /> Duyệt demo & triển khai bài học phân hoá
            </button>
          </div>

          {aiDemoPlan ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-800">Demo giáo án chi tiết để duyệt</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">Quy trình 5 bước</span>
              </div>
              <div className="max-h-[560px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white p-5 text-sm font-semibold leading-7 text-slate-700 shadow-inner">{aiDemoPlan}</div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-blue-500" />
              <p className="font-black text-slate-700">Chưa có demo giáo án.</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">Bấm “AI tạo demo giáo án 5 bước”, xem nội dung chi tiết, rồi mới duyệt để sang phần phân hoá.</p>
            </div>
          )}
        </section>
      </BuilderShell>
    );
  }

  return (
    <BuilderShell embedded={embedded}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={goBackToList} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
          </button>
          <h1 className="text-3xl font-black text-slate-900">Giao diện học phân hoá</h1>
          <p className="text-sm font-semibold text-slate-500">Triển khai từ demo giáo án 5 bước đã duyệt: nội dung, tuyến học, kiểm tra và xuất bản cổng học sinh.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      <div className="mb-5 grid gap-2 md:grid-cols-4">
        {steps.map((label, index) => (
          <button key={label} onClick={() => setStep(index)} className={`rounded-2xl px-4 py-3 text-left text-sm font-black ${step === index ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-500 shadow-sm hover:text-blue-600'}`}>
            <span className="block text-xs opacity-70">Bước {index + 1}</span>{label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <Field label="Tiêu đề bài *"><input value={lesson.title} onChange={event => updateLesson({ title: event.target.value })} className={inputClass} placeholder="VD: Toán 11 — Cấp số cộng" /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Lớp"><select value={lesson.grade} onChange={event => updateLesson({ grade: event.target.value as AdaptiveLesson['grade'] })} className={inputClass}>{gradeOptions.map(grade => <option key={grade}>{grade}</option>)}</select></Field>
            <Field label="Tuần"><input value={lesson.curriculumRef?.week || ''} onChange={event => updateLesson({ curriculumRef: { ...lesson.curriculumRef, week: event.target.value } })} className={inputClass} /></Field>
            <Field label="Tiết số"><input type="number" value={lesson.curriculumRef?.period || 1} onChange={event => updateLesson({ curriculumRef: { ...lesson.curriculumRef, period: Number(event.target.value) } })} className={inputClass} /></Field>
          </div>
          <Field label="Hướng dẫn chuẩn bị"><textarea value={lesson.preparation.readingInstructions} onChange={event => updateLesson({ preparation: { ...lesson.preparation, readingInstructions: event.target.value } })} className={textareaClass} /></Field>
          <Field label="Thời gian chuẩn bị ước tính (phút)"><input type="number" value={lesson.preparation.estimatedMinutes} onChange={event => updateLesson({ preparation: { ...lesson.preparation, estimatedMinutes: Number(event.target.value) } })} className={inputClass} /></Field>
          <LessonCoverUpload lessonId={lesson.id} currentRealistic={lesson.coverImageRealistic} currentTextbook={lesson.coverImageTextbook} onSaved={urls => updateLesson({ coverImageRealistic: urls.realistic, coverImageTextbook: urls.textbook })} />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-800">Mục tiêu học tập</h2>
            <button onClick={() => updateLesson({ objectives: [...lesson.objectives, { id: uid('obj'), code: `OBJ-${lesson.objectives.length + 1}`, title: '', description: '', bloomLevel: 'understand', masteryThreshold: 0.7, prerequisiteObjectiveIds: [], commonMisconceptions: [] }] })} className={secondaryButtonClass}>
              <Plus className="h-4 w-4" /> Thêm mục tiêu
            </button>
          </div>
          {lesson.objectives.map(objective => (
            <div key={objective.id} className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
              <input value={objective.title} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, title: event.target.value, description: event.target.value } : item) })} className={inputClass} placeholder="Tên mục tiêu" />
              <select value={objective.bloomLevel} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, bloomLevel: event.target.value as BloomLevel } : item) })} className={inputClass}>{bloomLevels.map(level => <option key={level}>{level}</option>)}</select>
              <input type="number" value={Math.round(objective.masteryThreshold * 100)} onChange={event => updateLesson({ objectives: lesson.objectives.map(item => item.id === objective.id ? { ...item, masteryThreshold: Number(event.target.value) / 100 } : item) })} className={inputClass} />
              <button onClick={() => updateLesson({ objectives: lesson.objectives.filter(item => item.id !== objective.id) })} className={dangerButtonClass}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <QuestionEditor title="Diagnostic test" questions={lesson.diagnosticTest.questions} objectives={objectiveOptions} onAdd={() => updateLesson({ diagnosticTest: { ...lesson.diagnosticTest, questions: [...lesson.diagnosticTest.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateLesson({ diagnosticTest: { ...lesson.diagnosticTest, questions: lesson.diagnosticTest.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateQuestion('diagnosticTest', questionId, patch)} />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
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
                      <Field label="Tên mảnh"><input value={unit.title} onChange={event => updateUnit(unit.id, { title: event.target.value })} className={inputClass} /></Field>
                      <Field label="Thời gian ước tính"><input type="number" value={unit.estimatedMinutes} onChange={event => updateUnit(unit.id, { estimatedMinutes: Number(event.target.value) })} className={inputClass} /></Field>
                    </div>
                    <Field label="Giải thích Standard"><textarea value={standard.explanation} onChange={event => updateUnitRoute(unit, 'standard', { explanation: event.target.value })} className={textareaClass} /></Field>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <input type="checkbox" checked={sharedRoutes[unit.id] ?? true} onChange={event => setSharedRoutes(prev => ({ ...prev, [unit.id]: event.target.checked }))} /> Dùng nội dung Standard cho Foundation/Challenge
                    </label>
                    {!(sharedRoutes[unit.id] ?? true) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Giải thích Foundation"><textarea value={foundation.explanation} onChange={event => updateUnitRoute(unit, 'foundation', { explanation: event.target.value })} className={textareaClass} /></Field>
                        <Field label="Giải thích Challenge"><textarea value={challenge.explanation} onChange={event => updateUnitRoute(unit, 'challenge', { explanation: event.target.value })} className={textareaClass} /></Field>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Worked Example — Đề bài"><textarea value={example.problem} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, problem: event.target.value }] })} className={textareaClass} /></Field>
                      <Field label="Worked Example — Lời giải"><textarea value={example.solution} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, solution: event.target.value }] })} className={textareaClass} /></Field>
                      <Field label="Worked Example — Giải thích"><textarea value={example.explanation} onChange={event => updateUnitRoute(unit, 'standard', { workedExamples: [{ ...example, explanation: event.target.value }] })} className={textareaClass} /></Field>
                    </div>
                    <QuestionEditor title="Quick Check" questions={unit.quickCheck.questions} objectives={objectiveOptions} onAdd={() => updateUnit(unit.id, { quickCheck: { ...unit.quickCheck, questions: [...unit.quickCheck.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateUnit(unit.id, { quickCheck: { ...unit.quickCheck, questions: unit.quickCheck.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateUnitQuickQuestion(unit, questionId, patch)} />
                    <button onClick={() => updateLesson({ knowledgeUnits: lesson.knowledgeUnits.filter(item => item.id !== unit.id) })} className={dangerButtonClass}><Trash2 className="h-4 w-4" /> Xóa mảnh kiến thức</button>
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
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <QuestionEditor title="Exit Ticket" questions={lesson.exitTicket.questions} objectives={objectiveOptions} onAdd={() => updateLesson({ exitTicket: { ...lesson.exitTicket, questions: [...lesson.exitTicket.questions, makeQuestion('multiple_choice', objectiveOptions[0]?.id)] } })} onDelete={questionId => updateLesson({ exitTicket: { ...lesson.exitTicket, questions: lesson.exitTicket.questions.filter(question => question.id !== questionId) } })} onChange={(questionId, patch) => updateQuestion('exitTicket', questionId, patch)} />
          <Field label="Completion Reward message"><textarea value={lesson.completionReward?.message || defaultRewardMessage} onChange={event => updateLesson({ completionReward: { toolId: lesson.completionReward?.toolId || 'gamedoikhang', message: event.target.value } })} className={textareaClass} /></Field>
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
  <div className={embedded ? 'text-slate-900' : 'min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8'}>
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
  <div className="space-y-3 rounded-2xl border border-slate-100 p-4">
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
            <button onClick={() => onDelete(question.id)} className={dangerButtonClass}><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea value={question.prompt} onChange={event => onChange(question.id, { prompt: event.target.value })} className={textareaClass} placeholder="Nội dung câu hỏi" />
          <div className="grid gap-2 md:grid-cols-4">
            {options.map((option, optionIndex) => (
              <input key={optionIndex} value={option} onChange={event => {
                const nextOptions = [...options];
                nextOptions[optionIndex] = event.target.value;
                onChange(question.id, { options: nextOptions });
              }} className={inputClass} placeholder={`Option ${optionIndex + 1}`} />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={question.correctAnswer || ''} onChange={event => onChange(question.id, { correctAnswer: event.target.value })} className={inputClass}>
              {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={question.objectiveIds[0] || ''} onChange={event => onChange(question.id, { objectiveIds: event.target.value ? [event.target.value] : [] })} className={inputClass}>
              <option value="">Chọn mục tiêu</option>
              {objectives.map(objective => <option key={objective.id} value={objective.id}>{objective.title || objective.code}</option>)}
            </select>
          </div>
        </div>
      );
    })}
  </div>
);
