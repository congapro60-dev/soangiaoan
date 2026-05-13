import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Route,
  Send,
  Target,
  Users,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { sampleAdaptiveLesson } from '../../lib/adaptive/sampleAdaptiveLesson';
import {
  buildTeacherDashboardData,
  createProgressFromDiagnostic,
  decideNextUnitAction,
  decidePacingAction,
  gradeAssessment,
} from '../../lib/adaptive/diagnosticEngine';
import { AdaptiveLesson, AdaptiveQuestion, AssessmentAttempt, LearningRoute, PacingAction, PacingStatus, PracticeTask, StudentAdaptiveProgress } from '../../lib/adaptive/types';
import { cn } from '../../lib/utils';

const routeLabel: Record<LearningRoute, string> = {
  foundation: 'Củng cố',
  standard: 'Chuẩn',
  challenge: 'Thử thách',
};

const routeClass: Record<LearningRoute, string> = {
  foundation: 'bg-amber-50 text-amber-700 border-amber-200',
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  challenge: 'bg-purple-50 text-purple-700 border-purple-200',
};

const pacingStatusLabel: Record<PacingStatus, string> = {
  ahead: 'Nhanh hơn tiến độ',
  on_track: 'Đúng nhịp',
  behind: 'Chậm hơn tiến độ',
  stuck: 'Đang mắc kẹt',
};

const pacingActionLabel: Record<PacingAction, string> = {
  continue_core: 'Tiếp tục tuyến lõi',
  assign_enrichment: 'Giao nhiệm vụ mở rộng',
  compress_to_core: 'Rút gọn về mục tiêu lõi',
  remediate_easier: 'Chuyển sang bản dễ hơn',
  flag_teacher: 'Báo giáo viên can thiệp',
};

const pacingStatusClass: Record<PacingStatus, string> = {
  ahead: 'border-purple-200 bg-purple-50 text-purple-700',
  on_track: 'border-blue-200 bg-blue-50 text-blue-700',
  behind: 'border-amber-200 bg-amber-50 text-amber-700',
  stuck: 'border-red-200 bg-red-50 text-red-700',
};

const demoStudents = [
  {
    id: 'student-foundation',
    name: 'Minh Anh',
    answers: {
      dq1: 'Một ví dụ cụ thể',
      dq2: 'Điều kiện áp dụng',
      dq3: 'chọn công thức',
      dq4: 'Áp dụng y hệt ví dụ',
    },
  },
  {
    id: 'student-standard',
    name: 'Gia Huy',
    answers: {
      dq1: 'Một quy tắc dùng để nhận diện và xử lý bài toán',
      dq2: 'Điều kiện áp dụng',
      dq3: 'xác định dữ kiện',
      dq4: 'Áp dụng y hệt ví dụ',
    },
  },
  {
    id: 'student-challenge',
    name: 'Khánh Linh',
    answers: {
      dq1: 'Một quy tắc dùng để nhận diện và xử lý bài toán',
      dq2: 'Điều kiện áp dụng',
      dq3: 'xác định dữ kiện',
      dq4: 'Tìm dấu hiệu bản chất của dạng toán',
    },
  },
];

const getQuestionAnswer = (question: AdaptiveQuestion, answers: Record<string, string>) => answers[question.id] || '';

interface AdaptiveLearningTabProps {
  user: User | null;
}

interface AdaptiveLessonDocument {
  id: string;
  userId: string;
  teacherId: string;
  lessonId: string;
  title: string;
  lesson: AdaptiveLesson;
  portalEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const getAdaptiveLessonDocId = (userId: string) => userId;

const formatSavedTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const createDemoProgresses = (): StudentAdaptiveProgress[] => {
  return demoStudents.map(student => {
    const attempt = gradeAssessment(sampleAdaptiveLesson.diagnosticTest, student.answers, 360);
    return createProgressFromDiagnostic(sampleAdaptiveLesson, 'demo-session', student.id, attempt);
  });
};

export const AdaptiveLearningTab = ({ user }: AdaptiveLearningTabProps) => {
  const [lesson, setLesson] = useState<AdaptiveLesson>(sampleAdaptiveLesson);
  const [isTeacherEditing, setIsTeacherEditing] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [diagnosticAttempt, setDiagnosticAttempt] = useState<AssessmentAttempt | null>(null);
  const [quickCheckAnswers, setQuickCheckAnswers] = useState<Record<string, string>>({});
  const [quickCheckAttempt, setQuickCheckAttempt] = useState<AssessmentAttempt | null>(null);
  const [remediationAttempts, setRemediationAttempts] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(18);

  useEffect(() => {
    let isMounted = true;

    const loadSavedLesson = async () => {
      if (!user) {
        setIsCloudLoading(false);
        setCloudError(null);
        return;
      }

      setIsCloudLoading(true);
      setCloudError(null);

      try {
        const lessonRef = doc(db, 'adaptiveLessons', getAdaptiveLessonDocId(user.uid));
        const snapshot = await getDoc(lessonRef);

        if (!isMounted) return;

        if (snapshot.exists()) {
          const data = snapshot.data() as AdaptiveLessonDocument;
          if (data.lesson) {
            setLesson(data.lesson);
            setDraftSavedAt(`đã tải từ Firestore lúc ${formatSavedTime()}`);
          }
        }
      } catch (error) {
        console.error('Lỗi tải bài học phân hoá', error);
        if (isMounted) {
          setCloudError('Không tải được bài học đã lưu. Hệ thống đang dùng bản mẫu trong ứng dụng.');
        }
      } finally {
        if (isMounted) setIsCloudLoading(false);
      }
    };

    loadSavedLesson();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const studentPortalUrl = user ? `${window.location.origin}/adaptive/student/${user.uid}` : '';
  const demoProgresses = useMemo(createDemoProgresses, []);
  const teacherDashboard = useMemo(() => buildTeacherDashboardData(lesson, demoProgresses), [lesson, demoProgresses]);
  const recommendedRoute = diagnosticAttempt?.recommendedRoute || 'standard';
  const firstUnit = lesson.knowledgeUnits[0];
  const nextAction = quickCheckAttempt
    ? decideNextUnitAction(quickCheckAttempt, remediationAttempts, firstUnit.maxRemediationAttempts)
    : null;
  const activePacingUnit = nextAction === 'move_next'
    ? lesson.knowledgeUnits[1] || firstUnit
    : firstUnit;
  const routeContent = firstUnit.routes.find(item => item.route === recommendedRoute) || firstUnit.routes[1];
  const activePacingRouteContent = activePacingUnit.routes.find(item => item.route === recommendedRoute) || activePacingUnit.routes[1];

  const currentProgress = useMemo(() => {
    if (!diagnosticAttempt) return null;
    const progress = createProgressFromDiagnostic(lesson, 'demo-session', 'current-student', diagnosticAttempt);
    return {
      ...progress,
      assessmentAttempts: quickCheckAttempt ? [diagnosticAttempt, quickCheckAttempt] : [diagnosticAttempt],
    };
  }, [lesson, diagnosticAttempt, quickCheckAttempt]);
  const pacingDecision = currentProgress
    ? decidePacingAction(lesson, currentProgress, elapsedMinutes, activePacingUnit.id, quickCheckAttempt || undefined, remediationAttempts)
    : null;
  const pacingTasks = pacingDecision
    ? ([...(activePacingUnit.supportTasks || []), ...(activePacingUnit.enrichmentTasks || []), ...activePacingRouteContent.practiceTasks] as PracticeTask[])
        .filter(task => pacingDecision.recommendedTaskIds.includes(task.id))
    : [];

  const updateObjectiveText = (objectiveId: string, field: 'title' | 'description', value: string) => {
    setLesson(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objectives: prev.objectives.map(objective => (
        objective.id === objectiveId ? { ...objective, [field]: value } : objective
      )),
    }));
  };

  const updateObjectiveThreshold = (objectiveId: string, value: string) => {
    const threshold = Math.min(1, Math.max(0, Number(value) / 100 || 0));
    setLesson(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objectives: prev.objectives.map(objective => (
        objective.id === objectiveId ? { ...objective, masteryThreshold: threshold } : objective
      )),
    }));
  };

  const updateRouteExplanation = (unitId: string, route: LearningRoute, value: string) => {
    setLesson(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      knowledgeUnits: prev.knowledgeUnits.map(unit => (
        unit.id === unitId
          ? {
              ...unit,
              routes: unit.routes.map(routeContentItem => (
                routeContentItem.route === route ? { ...routeContentItem, explanation: value } : routeContentItem
              )),
            }
          : unit
      )),
    }));
  };

  const updateWorkedExample = (
    unitId: string,
    route: LearningRoute,
    exampleId: string,
    field: 'problem' | 'solution' | 'explanation',
    value: string
  ) => {
    setLesson(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      knowledgeUnits: prev.knowledgeUnits.map(unit => (
        unit.id === unitId
          ? {
              ...unit,
              routes: unit.routes.map(routeContentItem => (
                routeContentItem.route === route
                  ? {
                      ...routeContentItem,
                      workedExamples: routeContentItem.workedExamples.map(example => (
                        example.id === exampleId ? { ...example, [field]: value } : example
                      )),
                    }
                  : routeContentItem
              )),
            }
          : unit
      )),
    }));
  };

  const handleSaveTeacherDraft = async () => {
    if (!user) {
      setCloudError('Bạn cần đăng nhập để lưu bài học phân hoá lên Firestore.');
      return;
    }

    setIsSavingLesson(true);
    setCloudError(null);

    try {
      const now = new Date().toISOString();
      const lessonToSave: AdaptiveLesson = {
        ...lesson,
        teacherId: user.uid,
        updatedAt: now,
      };
      const documentId = getAdaptiveLessonDocId(user.uid);

      await setDoc(
        doc(db, 'adaptiveLessons', documentId),
        {
          id: documentId,
          userId: user.uid,
          teacherId: user.uid,
          lessonId: sampleAdaptiveLesson.id,
          title: lessonToSave.title,
          lesson: lessonToSave,
          portalEnabled: true,
          createdAt: lesson.createdAt || now,
          updatedAt: now,
        } satisfies AdaptiveLessonDocument,
        { merge: true }
      );

      setLesson(lessonToSave);
      setDraftSavedAt(formatSavedTime());
      setIsTeacherEditing(false);
    } catch (error) {
      console.error('Lỗi lưu bài học phân hoá', error);
      setCloudError('Không lưu được bài học lên Firestore. Vui lòng kiểm tra kết nối hoặc quyền Firestore.');
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleResetTeacherDraft = () => {
    setLesson(sampleAdaptiveLesson);
    setDraftSavedAt(null);
    setCloudError(null);
    setIsTeacherEditing(false);
  };

  const handleDiagnosticSubmit = () => {
    const attempt = gradeAssessment(lesson.diagnosticTest, studentAnswers, 360);
    setDiagnosticAttempt(attempt);
    setQuickCheckAttempt(null);
    setRemediationAttempts(0);
  };

  const handleQuickCheckSubmit = () => {
    const attempt = gradeAssessment(firstUnit.quickCheck, quickCheckAnswers, 160);
    setQuickCheckAttempt(attempt);
    const action = decideNextUnitAction(attempt, remediationAttempts, firstUnit.maxRemediationAttempts);
    if (action === 'remediate') setRemediationAttempts(prev => prev + 1);
  };

  const totalDiagnosticScore = diagnosticAttempt?.answers.reduce((sum, item) => sum + item.score, 0) || 0;
  const maxDiagnosticScore = lesson.diagnosticTest.questions.reduce((sum, item) => sum + item.points, 0);

  return (
    <motion.div
      key="adaptive-learning"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-100">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">
              <BookOpenCheck className="h-4 w-4" /> MVP học phân hoá
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{lesson.title}</h2>
              <p className="mt-2 max-w-3xl text-sm text-blue-50">
                Không gian giáo viên để soạn bài, lưu Firestore, xem mô phỏng và lấy liên kết cổng học sinh riêng.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Clock3 className="mx-auto mb-2 h-5 w-5" />
              <p className="text-2xl font-black">{lesson.durationMinutes}'</p>
              <p className="text-[10px] font-bold uppercase text-blue-100">Tiết học</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Target className="mx-auto mb-2 h-5 w-5" />
              <p className="text-2xl font-black">{lesson.objectives.length}</p>
              <p className="text-[10px] font-bold uppercase text-blue-100">Mục tiêu</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Route className="mx-auto mb-2 h-5 w-5" />
              <p className="text-2xl font-black">3</p>
              <p className="text-[10px] font-bold uppercase text-blue-100">Tuyến học</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800">0. Không gian giáo viên chỉnh bài học</h3>
            <p className="text-sm text-slate-500">Giáo viên có thể chỉnh mục tiêu, lời giải thích theo tuyến và ví dụ mẫu trước khi giao cho học sinh.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsTeacherEditing(prev => !prev)}
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              {isTeacherEditing ? 'Đóng chỉnh sửa' : 'Chỉnh nội dung'}
            </button>
            <button
              onClick={handleResetTeacherDraft}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-500 transition hover:bg-slate-50"
            >
              Khôi phục mẫu
            </button>
          </div>
        </div>

        {user && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-800">Cổng học sinh riêng</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
              Học sinh mở liên kết này, nhập mã học sinh cố định, làm test đầu giờ và học theo tuyến cá nhân. Kết quả sẽ được lưu vào tiến trình tiết học và hồ sơ học tập dài hạn.
            </p>
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
              <input
                readOnly
                value={studentPortalUrl}
                className="flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs font-bold text-slate-600 outline-none"
              />
              <a
                href={studentPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                Mở cổng học sinh
              </a>
            </div>
          </div>
        )}

        {isCloudLoading && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            Đang tải bài học phân hoá đã lưu từ Firestore...
          </div>
        )}

        {cloudError && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {cloudError}
          </div>
        )}

        {draftSavedAt && !cloudError && (
          <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            Đã đồng bộ bài học phân hoá với Firestore: {draftSavedAt}.
          </div>
        )}

        {isTeacherEditing ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Tên bài học</span>
                <input
                  value={lesson.title}
                  onChange={event => setLesson(prev => ({ ...prev, title: event.target.value, updatedAt: new Date().toISOString() }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Giải thích tuyến {routeLabel[recommendedRoute]}</span>
                <textarea
                  value={routeContent.explanation}
                  onChange={event => updateRouteExplanation(firstUnit.id, recommendedRoute, event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Mục tiêu học tập</p>
              <div className="grid gap-3 md:grid-cols-2">
                {lesson.objectives.map(objective => (
                  <div key={objective.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <input
                      value={objective.title}
                      onChange={event => updateObjectiveText(objective.id, 'title', event.target.value)}
                      className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-400"
                    />
                    <textarea
                      value={objective.description}
                      onChange={event => updateObjectiveText(objective.id, 'description', event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-600 outline-none focus:border-indigo-400"
                    />
                    <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                      Ngưỡng đạt
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(objective.masteryThreshold * 100)}
                        onChange={event => updateObjectiveThreshold(objective.id, event.target.value)}
                        className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1 font-black text-slate-700 outline-none focus:border-indigo-400"
                      />
                      %
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {routeContent.workedExamples[0] && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Ví dụ mẫu đầu tiên của tuyến {routeLabel[recommendedRoute]}</p>
                <div className="grid gap-3">
                  <textarea
                    value={routeContent.workedExamples[0].problem}
                    onChange={event => updateWorkedExample(firstUnit.id, recommendedRoute, routeContent.workedExamples[0].id, 'problem', event.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-indigo-400"
                    placeholder="Bài toán"
                  />
                  <textarea
                    value={routeContent.workedExamples[0].solution}
                    onChange={event => updateWorkedExample(firstUnit.id, recommendedRoute, routeContent.workedExamples[0].id, 'solution', event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-indigo-400"
                    placeholder="Lời giải"
                  />
                  <textarea
                    value={routeContent.workedExamples[0].explanation}
                    onChange={event => updateWorkedExample(firstUnit.id, recommendedRoute, routeContent.workedExamples[0].id, 'explanation', event.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-indigo-400"
                    placeholder="Giải thích thêm"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveTeacherDraft}
              disabled={isSavingLesson || isCloudLoading}
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSavingLesson ? 'Đang lưu lên Firestore...' : 'Lưu nháp lên Firestore'}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-700">
              <p className="text-2xl font-black">{lesson.objectives.length}</p>
              <p className="text-xs font-bold uppercase tracking-wide">Mục tiêu có thể chỉnh</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
              <p className="text-2xl font-black">3</p>
              <p className="text-xs font-bold uppercase tracking-wide">Tuyến nội dung</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-4 text-purple-700">
              <p className="text-2xl font-black">{isCloudLoading ? 'Đang tải' : draftSavedAt ? 'Đã lưu' : 'Nháp'}</p>
              <p className="text-xs font-bold uppercase tracking-wide">{draftSavedAt ? 'Firestore đã đồng bộ' : 'Chưa có bản lưu Firestore'}</p>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">1. Mục tiêu và quy trình 5 bước</h3>
                <p className="text-sm text-slate-500">Khung này chưa phụ thuộc bài cụ thể, có thể thay bằng bất kỳ bài Toán THPT nào.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Draft</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {lesson.objectives.map(objective => (
                <div key={objective.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-black text-white">{objective.code}</span>
                    <h4 className="font-bold text-slate-800">{objective.title}</h4>
                  </div>
                  <p className="text-sm text-slate-600">{objective.description}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">Bloom: {objective.bloomLevel} · Ngưỡng đạt: {Math.round(objective.masteryThreshold * 100)}%</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-5">
              {lesson.fiveStepFlow.steps.map(step => (
                <div key={step.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-xs font-black uppercase text-blue-600">{step.estimatedMinutes} phút</p>
                  <h4 className="mt-1 font-bold text-slate-800">{step.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">{step.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><Activity className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">2. Mô phỏng học sinh làm test đầu giờ</h3>
                <p className="text-sm text-slate-500">Chọn đáp án để xem engine phân tuyến bằng rule minh bạch.</p>
              </div>
            </div>

            <div className="space-y-4">
              {lesson.diagnosticTest.questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-slate-100 p-4">
                  <p className="mb-3 font-bold text-slate-800">Câu {index + 1}. {question.prompt}</p>
                  {question.options ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {question.options.map(option => (
                        <button
                          key={option}
                          onClick={() => setStudentAnswers(prev => ({ ...prev, [question.id]: option }))}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all',
                            getQuestionAnswer(question, studentAnswers) === option
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-blue-200'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={studentAnswers[question.id] || ''}
                      onChange={event => setStudentAnswers(prev => ({ ...prev, [question.id]: event.target.value }))}
                      placeholder="Nhập câu trả lời ngắn"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>Độ khó: {question.difficulty}</span>
                    <span>·</span>
                    <span>Mục tiêu: {question.objectiveIds.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleDiagnosticSubmit}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              <Send className="h-4 w-4" /> Chấm test và phân tuyến
            </button>

            {diagnosticAttempt && (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-900">Kết quả: {totalDiagnosticScore}/{maxDiagnosticScore} điểm</p>
                    <p className="mt-1 text-sm text-blue-700">{diagnosticAttempt.aiSummary}</p>
                  </div>
                  <span className={cn('rounded-full border px-4 py-2 text-sm font-black', routeClass[recommendedRoute])}>
                    Tuyến: {routeLabel[recommendedRoute]}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-purple-50 p-3 text-purple-600"><Lightbulb className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">3. Nội dung học theo tuyến</h3>
                <p className="text-sm text-slate-500">Sau test đầu giờ, học sinh nhận nội dung tương ứng.</p>
              </div>
            </div>

            <div className={cn('mb-4 inline-flex rounded-full border px-4 py-2 text-sm font-black', routeClass[recommendedRoute])}>
              {routeLabel[recommendedRoute]}
            </div>
            <h4 className="text-xl font-black text-slate-800">{firstUnit.title}</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">{routeContent.explanation}</p>

            <div className="mt-5 space-y-3">
              {routeContent.workedExamples.map(example => (
                <div key={example.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-800">{example.title}</p>
                  <p className="mt-2 text-sm text-slate-600"><b>Bài toán:</b> {example.problem}</p>
                  <p className="mt-2 text-sm text-slate-600"><b>Lời giải:</b> {example.solution}</p>
                  <p className="mt-2 text-sm text-slate-500">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-green-50 p-3 text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">4. Quick check sau mảnh kiến thức</h3>
                <p className="text-sm text-slate-500">Nếu chưa đạt, hệ thống giảng lại tối đa 2 lần rồi báo giáo viên.</p>
              </div>
            </div>

            <div className="space-y-4">
              {firstUnit.quickCheck.questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-slate-100 p-4">
                  <p className="mb-3 font-bold text-slate-800">Câu {index + 1}. {question.prompt}</p>
                  {question.options ? (
                    <div className="grid gap-2">
                      {question.options.map(option => (
                        <button
                          key={option}
                          onClick={() => setQuickCheckAnswers(prev => ({ ...prev, [question.id]: option }))}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all',
                            getQuestionAnswer(question, quickCheckAnswers) === option
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-green-200'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      value={quickCheckAnswers[question.id] || ''}
                      onChange={event => setQuickCheckAnswers(prev => ({ ...prev, [question.id]: event.target.value }))}
                      placeholder="Nhập câu trả lời ngắn"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-green-400 focus:bg-white"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleQuickCheckSubmit}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-100 transition hover:bg-green-700"
            >
              <ArrowRight className="h-4 w-4" /> Kiểm tra chuyển bước
            </button>

            {quickCheckAttempt && nextAction && (
              <div className={cn(
                'mt-5 rounded-2xl border p-4 text-sm font-semibold',
                nextAction === 'move_next' && 'border-green-200 bg-green-50 text-green-700',
                nextAction === 'remediate' && 'border-amber-200 bg-amber-50 text-amber-700',
                nextAction === 'needs_teacher' && 'border-red-200 bg-red-50 text-red-700'
              )}>
                {nextAction === 'move_next' && 'Học sinh đã đạt quick check. Hệ thống cho chuyển sang mảnh kiến thức tiếp theo.'}
                {nextAction === 'remediate' && `Học sinh chưa đạt. Hệ thống sẽ giảng lại bằng chiến lược khác. Số lần giảng lại: ${remediationAttempts}/${firstUnit.maxRemediationAttempts}.`}
                {nextAction === 'needs_teacher' && 'Học sinh đã vượt quá số lần giảng lại. Hệ thống đánh dấu cần giáo viên hỗ trợ trực tiếp.'}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Clock3 className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">5. Điều phối thời gian 40 phút</h3>
                <p className="text-sm text-slate-500">Mô phỏng hệ thống tính lại khi học sinh quá nhanh hoặc quá chậm.</p>
              </div>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Nhanh', value: 13 },
                { label: 'Đúng nhịp', value: 20 },
                { label: 'Chậm', value: 31 },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setElapsedMinutes(item.value)}
                  className={cn(
                    'rounded-2xl border px-3 py-2 text-sm font-black transition-all',
                    elapsedMinutes === item.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-indigo-200'
                  )}
                >
                  {item.label} · phút {item.value}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="7"
              max="39"
              value={elapsedMinutes}
              onChange={event => setElapsedMinutes(Number(event.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
              <span>7 phút</span>
              <span>Đã dùng: {elapsedMinutes} phút</span>
              <span>39 phút</span>
            </div>

            {!diagnosticAttempt && (
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Làm test đầu giờ trước để hệ thống có dữ liệu năng lực, sau đó panel này sẽ tính học sinh đang nhanh/chậm so với tiết 40 phút.
              </div>
            )}

            {pacingDecision && (
              <div className={cn('mt-5 rounded-2xl border p-4', pacingStatusClass[pacingDecision.status])}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide">{pacingStatusLabel[pacingDecision.status]}</p>
                    <h4 className="mt-1 text-lg font-black">{pacingActionLabel[pacingDecision.action]}</h4>
                    <p className="mt-2 text-sm font-semibold leading-6">{pacingDecision.message}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3 text-right text-xs font-bold">
                    <p>Còn lại: {pacingDecision.remainingMinutes} phút</p>
                    <p>Độ lệch: {pacingDecision.paceDeltaMinutes} phút</p>
                    <p>Làm chủ TB: {Math.round(pacingDecision.averageMastery * 100)}%</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/70 p-3 text-xs font-bold">
                    <p className="uppercase tracking-wide opacity-70">Nguyên tắc giữ tiết học</p>
                    <p className="mt-1">{pacingDecision.shouldPreserveExitTicket ? 'Vẫn giữ exit ticket cuối giờ.' : 'Cần rút gọn để còn tối thiểu cho phản tư.'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3 text-xs font-bold">
                    <p className="uppercase tracking-wide opacity-70">Mảnh ưu tiên</p>
                    <p className="mt-1">{pacingDecision.recommendedUnitIds.join(', ') || 'Không có'}</p>
                  </div>
                </div>

                {pacingTasks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-black uppercase tracking-wide opacity-70">Nhiệm vụ hệ thống giao thêm/giảm tải</p>
                    {pacingTasks.map(task => (
                      <div key={task.id} className="rounded-2xl bg-white/75 p-3 text-sm font-semibold leading-6">
                        {task.prompt}
                      </div>
                    ))}
                  </div>
                )}

                {pacingDecision.teacherNote && (
                  <div className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-bold leading-6">
                    Ghi chú cho giáo viên: {pacingDecision.teacherNote}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-black text-slate-800">6. Dashboard giáo viên từ dữ liệu mô phỏng</h3>
            <p className="text-sm text-slate-500">Dữ liệu này minh hoạ cách giáo viên nhìn thấy phân tuyến và điểm yếu của lớp.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Học sinh" value={teacherDashboard.totalStudents} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Đã chẩn đoán" value={teacherDashboard.completedDiagnostic} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Cần hỗ trợ" value={teacherDashboard.needsTeacherCount} />
          <StatCard icon={<Route className="h-5 w-5" />} label="Tuyến thử thách" value={teacherDashboard.routeCounts.challenge} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(Object.keys(teacherDashboard.routeCounts) as LearningRoute[]).map(route => (
            <div key={route} className={cn('rounded-2xl border p-4', routeClass[route])}>
              <p className="text-sm font-bold">{routeLabel[route]}</p>
              <p className="mt-2 text-3xl font-black">{teacherDashboard.routeCounts[route]}</p>
              <p className="text-xs font-semibold opacity-80">học sinh</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mục tiêu</th>
                <th className="px-4 py-3">Yếu</th>
                <th className="px-4 py-3">Gần đạt</th>
                <th className="px-4 py-3">Đạt</th>
                <th className="px-4 py-3">Vượt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teacherDashboard.objectiveInsights.map(insight => (
                <tr key={insight.objectiveId}>
                  <td className="px-4 py-3 font-bold text-slate-800">{insight.objectiveCode}. {insight.title}</td>
                  <td className="px-4 py-3 text-amber-700">{insight.weakCount}</td>
                  <td className="px-4 py-3 text-blue-700">{insight.nearMasteryCount}</td>
                  <td className="px-4 py-3 text-green-700">{insight.masteredCount}</td>
                  <td className="px-4 py-3 text-purple-700">{insight.advancedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
    <div className="mb-3 text-blue-600">{icon}</div>
    <p className="text-3xl font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
  </div>
);
