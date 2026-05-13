import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  Route,
  Send,
  Target,
  UserRound,
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  createProgressFromDiagnostic,
  decideNextUnitAction,
  gradeAssessment,
} from '../lib/adaptive/diagnosticEngine';
import {
  AdaptiveLesson,
  AssessmentAttempt,
  LearningRoute,
  MasteryStatus,
  StudentLearningProfile,
  StudentSessionProgressRecord,
} from '../lib/adaptive/types';
import { cn } from '../lib/utils';
import { saveAdaptiveProgressViaApi } from '../services/adaptiveProgressApi';
import { ensureMathWrapped } from '../utils/examScoring';

type PortalStage = 'loading' | 'not_found' | 'identify' | 'diagnostic' | 'lesson' | 'quick_check' | 'complete';

interface AdaptiveLessonDocument {
  lesson: AdaptiveLesson;
  userId: string;
  teacherId: string;
  title: string;
  updatedAt: string;
}

const routeLabel: Record<LearningRoute, string> = {
  foundation: 'Củng cố',
  standard: 'Chuẩn',
  challenge: 'Thử thách',
};

const routeClass: Record<LearningRoute, string> = {
  foundation: 'border-amber-200 bg-amber-50 text-amber-700',
  standard: 'border-blue-200 bg-blue-50 text-blue-700',
  challenge: 'border-purple-200 bg-purple-50 text-purple-700',
};

const normalizeStudentCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-');
const buildStudentId = (teacherId: string, studentCode: string) => `${teacherId}_${normalizeStudentCode(studentCode)}`;
const buildProgressId = (teacherId: string, lessonId: string, studentCode: string) => `${teacherId}_${lessonId}_${normalizeStudentCode(studentCode)}`;

const getQuestionAnswer = (questionId: string, answers: Record<string, string>) => answers[questionId] || '';

const MathText = ({ children, className }: { children: string; className?: string }) => (
  <span className={cn('adaptive-math-text', className)}>
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children: paragraphChildren }) => <span>{paragraphChildren}</span> }}
    >
      {ensureMathWrapped(children)}
    </ReactMarkdown>
  </span>
);

const averageMastery = (attempts: AssessmentAttempt[]) => {
  const scores = attempts.flatMap(attempt => attempt.objectiveScores.map(score => score.masteryEstimate));
  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
};

const buildProfile = ({
  existingProfile,
  teacherId,
  studentId,
  studentCode,
  studentName,
  studentClass,
  lesson,
  attempts,
  route,
}: {
  existingProfile: StudentLearningProfile | null;
  teacherId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  lesson: AdaptiveLesson;
  attempts: AssessmentAttempt[];
  route: LearningRoute;
}): StudentLearningProfile => {
  const now = new Date().toISOString();
  const previousMemory = existingProfile?.objectiveMemory || [];
  const objectiveMemory = lesson.objectives.map(objective => {
    const evidence = attempts.flatMap(attempt => attempt.objectiveScores.filter(score => score.objectiveId === objective.id));
    const latestEvidence = evidence[evidence.length - 1];
    const previous = previousMemory.find(item => item.objectiveId === objective.id);
    const masteryEstimate = latestEvidence?.masteryEstimate ?? previous?.masteryEstimate ?? 0;

    const lastStatus: MasteryStatus = masteryEstimate >= objective.masteryThreshold
      ? 'mastered'
      : masteryEstimate >= 0.55
        ? 'near_mastery'
        : 'weak';

    return {
      objectiveId: objective.id,
      objectiveCode: objective.code,
      title: objective.title,
      attempts: (previous?.attempts || 0) + evidence.length,
      masteryEstimate,
      lastStatus,
      lastUpdatedAt: now,
    };
  });
  const misconceptionCounts = { ...(existingProfile?.misconceptionCounts || {}) };

  attempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      (answer.detectedMisconceptionIds || []).forEach(misconceptionId => {
        misconceptionCounts[misconceptionId] = (misconceptionCounts[misconceptionId] || 0) + 1;
      });
    });
  });

  const sessionMastery = averageMastery(attempts);
  const totalSessions = (existingProfile?.totalSessions || 0) + 1;
  const previousAverage = existingProfile?.averageMastery || 0;

  return {
    id: studentId,
    teacherId,
    studentId,
    studentCode: normalizeStudentCode(studentCode),
    studentName: studentName.trim(),
    studentClass: studentClass?.trim() || undefined,
    totalSessions,
    averageMastery: Number((((previousAverage * (totalSessions - 1)) + sessionMastery) / totalSessions).toFixed(2)),
    routeHistory: [...(existingProfile?.routeHistory || []), route].slice(-20),
    objectiveMemory,
    misconceptionCounts,
    lastLessonId: lesson.id,
    lastLessonTitle: lesson.title,
    lastActiveAt: now,
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };
};

export const AdaptiveStudentPortalPage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [stage, setStage] = useState<PortalStage>('loading');
  const [lesson, setLesson] = useState<AdaptiveLesson | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [profile, setProfile] = useState<StudentLearningProfile | null>(null);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({});
  const [quickCheckAnswers, setQuickCheckAnswers] = useState<Record<string, string>>({});
  const [diagnosticAttempt, setDiagnosticAttempt] = useState<AssessmentAttempt | null>(null);
  const [quickCheckAttempt, setQuickCheckAttempt] = useState<AssessmentAttempt | null>(null);
  const [remediationAttempts, setRemediationAttempts] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLesson = async () => {
      if (!teacherId) {
        setStage('not_found');
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'adaptiveLessons', teacherId));
        if (!snapshot.exists()) {
          setStage('not_found');
          return;
        }
        const data = snapshot.data() as AdaptiveLessonDocument;
        setLesson(data.lesson);
        setStage('identify');
      } catch (err) {
        console.error('Không tải được cổng học sinh', err);
        setStage('not_found');
      }
    };

    loadLesson();
  }, [teacherId]);

  const firstUnit = lesson?.knowledgeUnits[0] || null;
  const recommendedRoute = diagnosticAttempt?.recommendedRoute || 'standard';
  const routeContent = firstUnit?.routes.find(item => item.route === recommendedRoute) || firstUnit?.routes[1] || firstUnit?.routes[0];
  const totalDiagnosticScore = diagnosticAttempt?.answers.reduce((sum, item) => sum + item.score, 0) || 0;
  const maxDiagnosticScore = lesson?.diagnosticTest.questions.reduce((sum, item) => sum + item.points, 0) || 0;

  const learnerSummary = useMemo(() => {
    if (!profile) return null;
    const weakest = [...profile.objectiveMemory]
      .sort((a, b) => a.masteryEstimate - b.masteryEstimate)
      .slice(0, 2);
    return { weakest };
  }, [profile]);

  const handleIdentify = async () => {
    if (!teacherId || !studentName.trim() || !studentCode.trim()) {
      setError('Em cần nhập họ tên và mã học sinh để hệ thống lưu đúng hồ sơ học tập.');
      return;
    }

    setError(null);
    const studentId = buildStudentId(teacherId, studentCode);

    try {
      const snapshot = await getDoc(doc(db, 'studentLearningProfiles', studentId));
      if (snapshot.exists()) setProfile(snapshot.data() as StudentLearningProfile);
      setStage('diagnostic');
    } catch (err) {
      console.warn('Chưa có hồ sơ học sinh hoặc cổng không được quyền đọc hồ sơ cũ', err);
      setProfile(null);
      setStage('diagnostic');
    }
  };

  const handleDiagnosticSubmit = () => {
    if (!lesson) return;
    const attempt = gradeAssessment(lesson.diagnosticTest, diagnosticAnswers, lesson.diagnosticTest.durationMinutes * 60);
    setDiagnosticAttempt(attempt);
    setQuickCheckAttempt(null);
    setRemediationAttempts(0);
    setStage('lesson');
  };

  const handleQuickCheckSubmit = async () => {
    if (!lesson || !firstUnit || !teacherId || !diagnosticAttempt) return;

    const attempt = gradeAssessment(firstUnit.quickCheck, quickCheckAnswers, firstUnit.quickCheck.durationMinutes * 60);
    setQuickCheckAttempt(attempt);
    const action = decideNextUnitAction(attempt, remediationAttempts, firstUnit.maxRemediationAttempts);
    if (action === 'remediate') setRemediationAttempts(prev => prev + 1);

    const attempts = [diagnosticAttempt, attempt];
    const studentId = buildStudentId(teacherId, studentCode);
    const progressId = buildProgressId(teacherId, lesson.id, studentCode);
    const now = new Date().toISOString();
    const progress = createProgressFromDiagnostic(lesson, `lesson-${lesson.id}`, studentId, diagnosticAttempt);
    const progressRecord: StudentSessionProgressRecord = {
      id: progressId,
      teacherId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      studentId,
      studentCode: normalizeStudentCode(studentCode),
      studentName: studentName.trim(),
      studentClass: studentClass.trim() || undefined,
      route: recommendedRoute,
      status: action === 'move_next' ? 'completed' : 'needs_support',
      diagnosticAttempt,
      quickCheckAttempts: [attempt],
      objectiveStates: progress.objectiveStates,
      remediationAttempts: action === 'remediate' ? remediationAttempts + 1 : remediationAttempts,
      startedAt: diagnosticAttempt.submittedAt,
      completedAt: now,
      updatedAt: now,
    };
    const nextProfile = buildProfile({
      existingProfile: profile,
      teacherId,
      studentId,
      studentCode,
      studentName,
      studentClass,
      lesson,
      attempts,
      route: recommendedRoute,
    });

    setIsSaving(true);
    setError(null);

    try {
      const result = await saveAdaptiveProgressViaApi({
        teacherId,
        lessonId: lesson.id,
        progressId,
        studentId,
        progressRecord,
        profileRecord: nextProfile,
      });
      setProfile(result.profile || nextProfile);
      setStage('complete');
    } catch (apiError) {
      console.warn('API bảo mật chưa lưu được kết quả học sinh, thử fallback Firestore client', apiError);

      try {
        await setDoc(doc(db, 'adaptiveSessionProgress', progressId), progressRecord, { merge: true });

        try {
          await setDoc(doc(db, 'studentLearningProfiles', studentId), nextProfile, { merge: true });
        } catch (profileError) {
          console.warn('Không lưu được hồ sơ dài hạn bằng client, nhưng đã lưu tiến trình tiết học', profileError);
        }

        setProfile(nextProfile);
        setStage('complete');
        setError('Kết quả đã lưu qua kênh dự phòng. Nếu thông báo này xuất hiện nhiều lần, giáo viên cần kiểm tra biến môi trường Firebase Admin của API.');
      } catch (firestoreError) {
        console.error('Không lưu được tiến trình học sinh bằng cả API và Firestore client', firestoreError);
        const offlineProgress = {
          ...progressRecord,
          pendingProfileSync: true,
          savedOfflineAt: now,
          lastSaveError: firestoreError instanceof Error ? firestoreError.message : 'unknown',
        };

        try {
          window.localStorage.setItem(`adaptive-progress-${progressId}`, JSON.stringify(offlineProgress));
          window.localStorage.setItem(`adaptive-profile-${studentId}`, JSON.stringify(nextProfile));
          setProfile(nextProfile);
          setStage('complete');
          setError('Kết quả đã được lưu tạm trên thiết bị này. Giáo viên cần kiểm tra API lưu kết quả hoặc kết nối mạng để đồng bộ lên hệ thống.');
        } catch (fallbackError) {
          console.error('Không lưu được cả bản dự phòng tiến trình học sinh', fallbackError);
          setError('Không lưu được kết quả học tập. Em hãy báo giáo viên kiểm tra kết nối hoặc quyền Firestore.');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (stage === 'loading') return <FullPageState icon={<Loader2 className="h-8 w-8 animate-spin text-blue-600" />} title="Đang mở lớp học phân hoá" message="Hệ thống đang tải bài học giáo viên đã phát." />;
  if (stage === 'not_found' || !lesson) return <FullPageState icon={<AlertTriangle className="h-8 w-8 text-amber-500" />} title="Chưa tìm thấy bài học" message="Liên kết này chưa có bài học phân hoá đã lưu hoặc giáo viên chưa phát bài." />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-100">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-widest">
                <BookOpenCheck className="h-4 w-4" /> Cổng học sinh
              </div>
              <h1 className="text-3xl font-black tracking-tight">{lesson.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-50">
                Em sẽ làm test đầu giờ, nhận tuyến học phù hợp, học nội dung chính và làm kiểm tra nhanh. Kết quả được lưu vào hồ sơ học tập dài hạn bằng mã học sinh.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat icon={<Clock3 className="h-5 w-5" />} value={`${lesson.durationMinutes}'`} label="Tiết học" />
              <MiniStat icon={<Target className="h-5 w-5" />} value={lesson.objectives.length} label="Mục tiêu" />
              <MiniStat icon={<Route className="h-5 w-5" />} value="3" label="Tuyến học" />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {stage === 'identify' && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><UserRound className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Nhập thông tin học sinh</h2>
                <p className="text-sm text-slate-500">Mã học sinh giúp hệ thống nối kết quả hôm nay với hồ sơ học tập các tiết sau.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Họ và tên</span>
                <input value={studentName} onChange={event => setStudentName(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white" placeholder="VD: Nguyễn Minh Anh" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Lớp</span>
                <input value={studentClass} onChange={event => setStudentClass(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white" placeholder="VD: 11A1" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Mã học sinh cố định</span>
                <input value={studentCode} onChange={event => setStudentCode(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-blue-400 focus:bg-white" placeholder="VD: 11A1-025" />
              </label>
            </div>
            <button onClick={handleIdentify} className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">
              Bắt đầu học
            </button>
          </motion.section>
        )}

        {stage === 'diagnostic' && (
          <StudentAssessmentCard
            title="1. Test đầu giờ"
            description={`Hoàn thành trong khoảng ${lesson.diagnosticTest.durationMinutes} phút để hệ thống xác định tuyến học phù hợp.`}
            questions={lesson.diagnosticTest.questions}
            answers={diagnosticAnswers}
            setAnswers={setDiagnosticAnswers}
            submitLabel="Nộp test và nhận tuyến học"
            onSubmit={handleDiagnosticSubmit}
          />
        )}

        {stage === 'lesson' && firstUnit && routeContent && diagnosticAttempt && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800">2. Tuyến học cá nhân hoá</h2>
                  <p className="mt-1 text-sm text-slate-500">Điểm test đầu giờ: {totalDiagnosticScore}/{maxDiagnosticScore}. Hệ thống đề xuất tuyến học phù hợp với em.</p>
                </div>
                <span className={cn('w-fit rounded-full border px-4 py-2 text-sm font-black', routeClass[recommendedRoute])}>{routeLabel[recommendedRoute]}</span>
              </div>
              {profile && learnerSummary && (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <p className="font-black">Hồ sơ học tập trước đây</p>
                  <p className="mt-1 font-semibold">Đã ghi nhận {profile.totalSessions} tiết học. Mức thành thạo trung bình: {Math.round(profile.averageMastery * 100)}%.</p>
                  {learnerSummary.weakest.length > 0 && (
                    <p className="mt-1 text-xs font-bold">Cần chú ý: {learnerSummary.weakest.map(item => item.title).join(', ')}.</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-blue-500">{firstUnit.title}</p>
              <h3 className="mt-1 text-2xl font-black text-slate-800">Nội dung học theo tuyến {routeLabel[recommendedRoute]}</h3>
              <div className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                <MathText>{routeContent.explanation}</MathText>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {routeContent.workedExamples.map(example => (
                  <div key={example.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-black uppercase text-blue-600">Ví dụ</p>
                    <div className="mt-2 font-bold text-slate-800"><MathText>{example.problem}</MathText></div>
                    <div className="mt-2 text-sm font-semibold text-slate-600"><MathText>{example.solution}</MathText></div>
                    <div className="mt-2 text-xs font-bold text-blue-700"><MathText>{example.explanation}</MathText></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStage('quick_check')} className="mt-5 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700">
                Em đã học xong, chuyển sang quick check
              </button>
            </div>
          </motion.section>
        )}

        {stage === 'quick_check' && firstUnit && (
          <StudentAssessmentCard
            title="3. Quick check sau mảnh kiến thức"
            description="Kết quả này sẽ được lưu vào tiến trình tiết học và hồ sơ dài hạn của em."
            questions={firstUnit.quickCheck.questions}
            answers={quickCheckAnswers}
            setAnswers={setQuickCheckAnswers}
            submitLabel={isSaving ? 'Đang lưu kết quả...' : 'Nộp quick check'}
            disabled={isSaving}
            onSubmit={handleQuickCheckSubmit}
          />
        )}

        {stage === 'complete' && diagnosticAttempt && quickCheckAttempt && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-green-100 bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-3 text-2xl font-black text-slate-800">Đã lưu kết quả học tập</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Kết quả tiết học đã được lưu vào tiến trình cá nhân và hồ sơ học tập dài hạn của em. Các tiết sau hệ thống có thể dùng dữ liệu này để đề xuất tuyến học phù hợp hơn.
            </p>
            <div className="mx-auto mt-5 grid max-w-2xl gap-3 md:grid-cols-3">
              <ResultTile label="Tuyến học" value={routeLabel[recommendedRoute]} />
              <ResultTile label="Test đầu giờ" value={`${totalDiagnosticScore}/${maxDiagnosticScore}`} />
              <ResultTile label="Hồ sơ đã học" value={`${profile?.totalSessions || 1} tiết`} />
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

const StudentAssessmentCard = ({
  title,
  description,
  questions,
  answers,
  setAnswers,
  submitLabel,
  disabled,
  onSubmit,
}: {
  title: string;
  description: string;
  questions: AdaptiveLesson['diagnosticTest']['questions'];
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: () => void;
}) => (
  <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="mb-5">
      <h2 className="text-xl font-black text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-bold text-slate-800">
            Câu {index + 1}. <MathText>{question.prompt}</MathText>
          </div>
          {question.options ? (
            <div className="mt-3 grid gap-2">
              {question.options.map(option => (
                <label key={option} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={getQuestionAnswer(question.id, answers) === option}
                    onChange={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                    className="mt-1"
                  />
                  <span><MathText>{option}</MathText></span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={getQuestionAnswer(question.id, answers)}
              onChange={event => setAnswers(prev => ({ ...prev, [question.id]: event.target.value }))}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400"
              placeholder="Nhập câu trả lời của em..."
            />
          )}
        </div>
      ))}
    </div>
    <button disabled={disabled} onClick={onSubmit} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
      <Send className="h-4 w-4" /> {submitLabel}
    </button>
  </motion.section>
);

const MiniStat = ({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) => (
  <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
    <div className="mx-auto mb-2 flex justify-center">{icon}</div>
    <p className="text-2xl font-black">{value}</p>
    <p className="text-[10px] font-bold uppercase text-blue-100">{label}</p>
  </div>
);

const ResultTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-lg font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
  </div>
);

const FullPageState = ({ icon, title, message }: { icon: ReactNode; title: string; message: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">{icon}</div>
      <h1 className="text-xl font-black text-slate-800">{title}</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{message}</p>
    </div>
  </div>
);
