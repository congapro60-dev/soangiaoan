import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Lightbulb,
  QrCode,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { db, removeUndefinedFields } from '../../lib/firebase';
import { sampleAdaptiveLesson } from '../../lib/adaptive/sampleAdaptiveLesson';
import {
  buildTeacherDashboardData,
  createProgressFromDiagnostic,
  decideNextUnitAction,
  decidePacingAction,
  gradeAssessment,
} from '../../lib/adaptive/diagnosticEngine';
import { AdaptiveLesson, AdaptiveQuestion, AssessmentAttempt, LearningRoute, LessonSimulation, PacingAction, PacingStatus, PracticeTask, StudentAdaptiveProgress, StudentLearningProfile, StudentSessionProgressRecord, TeacherFlag } from '../../lib/adaptive/types';
import { cn } from '../../lib/utils';
import type { FallbackErrorCode, FallbackTelemetryEvent } from '../../services/telemetry';
import { getFallbackEventsForTeacher } from '../../services/telemetry';
import { SimulationGeneratorModal } from '../teacher/SimulationGeneratorModal';

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

const fallbackErrorCodeLabel: Record<FallbackErrorCode, string> = {
  network: 'Mất mạng',
  permission_denied: 'Thiếu quyền',
  quota_exceeded: 'Vượt quota',
  not_found: 'Không tìm thấy',
  invalid_argument: 'Tham số sai',
  unauthenticated: 'Chưa đăng nhập',
  unknown: 'Lỗi khác',
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

interface FirebaseAdminHealthResponse {
  ok: boolean;
  missing?: string[];
  invalid?: string[];
  error?: string;
}

const getAdaptiveLessonDocId = (userId: string) => userId;

const PRODUCTION_STUDENT_PORTAL_ORIGIN = 'https://giaoandewey.vercel.app';

interface RealStudentDashboardRow {
  progressId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  route: LearningRoute;
  status: StudentSessionProgressRecord['status'];
  diagnosticScore: number;
  diagnosticMaxScore: number;
  quickCheckScore: number;
  quickCheckMaxScore: number;
  exitTicketScore: number | null;
  exitTicketMaxScore: number | null;
  remediationAttempts: number;
  totalSessions?: number;
  averageMastery?: number;
  completedAt?: string;
  updatedAt: string;
}

const formatSavedTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const sumAttemptScore = (attempt?: AssessmentAttempt | null) => attempt?.answers.reduce((sum, answer) => sum + answer.score, 0) || 0;

const sumAttemptMaxScore = (attempt?: AssessmentAttempt | null) => attempt?.objectiveScores.reduce((sum, objective) => sum + objective.maxScore, 0) || 0;

const formatDashboardDate = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

const statusLabel: Record<StudentSessionProgressRecord['status'], string> = {
  in_progress: 'Đang học',
  needs_support: 'Cần hỗ trợ',
  completed: 'Hoàn thành',
};

const getNeedSupport = (progress: StudentSessionProgressRecord) => (
  progress.status === 'needs_support'
  || progress.remediationAttempts > 0
  || progress.objectiveStates.some(state => state.status === 'weak' || state.status === 'near_mastery')
);

const convertRecordToProgress = (record: StudentSessionProgressRecord): StudentAdaptiveProgress => {
  const teacherFlags: TeacherFlag[] = getNeedSupport(record)
    ? [{
        id: `flag-${record.id}`,
        severity: record.status === 'needs_support' ? 'urgent' : 'warning',
        reason: record.status === 'needs_support'
          ? 'Học sinh được đánh dấu cần giáo viên hỗ trợ.'
          : 'Học sinh còn mục tiêu yếu/gần đạt hoặc đã phải học hỗ trợ.',
        objectiveIds: record.objectiveStates
          .filter(state => state.status === 'weak' || state.status === 'near_mastery')
          .map(state => state.objectiveId),
        createdAt: record.updatedAt,
      }]
    : [];

  return {
    id: record.id,
    sessionId: record.id,
    lessonId: record.lessonId,
    studentId: record.studentId,
    route: record.route,
    objectiveStates: record.objectiveStates,
    assessmentAttempts: [
      record.diagnosticAttempt,
      ...record.quickCheckAttempts,
      ...(record.exitTicketAttempt ? [record.exitTicketAttempt] : []),
    ],
    remediationEvents: [],
    teacherFlags,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
  };
};

const buildRealStudentDashboardRows = (
  records: StudentSessionProgressRecord[],
  profiles: StudentLearningProfile[]
): RealStudentDashboardRow[] => {
  const profileMap = new Map(profiles.map(profile => [profile.studentId, profile]));

  return records.map(record => {
    const profile = profileMap.get(record.studentId);
    const quickCheckScore = record.quickCheckAttempts.reduce((sum, attempt) => sum + sumAttemptScore(attempt), 0);
    const quickCheckMaxScore = record.quickCheckAttempts.reduce((sum, attempt) => sum + sumAttemptMaxScore(attempt), 0);

    return {
      progressId: record.id,
      studentId: record.studentId,
      studentCode: record.studentCode,
      studentName: record.studentName,
      studentClass: record.studentClass,
      route: record.route,
      status: record.status,
      diagnosticScore: sumAttemptScore(record.diagnosticAttempt),
      diagnosticMaxScore: sumAttemptMaxScore(record.diagnosticAttempt),
      quickCheckScore,
      quickCheckMaxScore,
      exitTicketScore: record.exitTicketAttempt ? sumAttemptScore(record.exitTicketAttempt) : null,
      exitTicketMaxScore: record.exitTicketAttempt ? sumAttemptMaxScore(record.exitTicketAttempt) : null,
      remediationAttempts: record.remediationAttempts,
      totalSessions: profile?.totalSessions,
      averageMastery: profile?.averageMastery,
      completedAt: record.completedAt,
      updatedAt: record.updatedAt,
    };
  });
};

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
  const [isCheckingAdminHealth, setIsCheckingAdminHealth] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [diagnosticAttempt, setDiagnosticAttempt] = useState<AssessmentAttempt | null>(null);
  const [quickCheckAnswers, setQuickCheckAnswers] = useState<Record<string, string>>({});
  const [quickCheckAttempt, setQuickCheckAttempt] = useState<AssessmentAttempt | null>(null);
  const [remediationAttempts, setRemediationAttempts] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(18);
  const [showTeacherPreview, setShowTeacherPreview] = useState(false);
  const [portalCopyState, setPortalCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [realProgressRecords, setRealProgressRecords] = useState<StudentSessionProgressRecord[]>([]);
  const [realProfiles, setRealProfiles] = useState<StudentLearningProfile[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [fallbackEvents, setFallbackEvents] = useState<FallbackTelemetryEvent[]>([]);
  const [simulationsByUnitId, setSimulationsByUnitId] = useState<Record<string, LessonSimulation>>({});
  const [simulationModalUnitId, setSimulationModalUnitId] = useState<string | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardClassFilter, setDashboardClassFilter] = useState('all');
  const [dashboardRouteFilter, setDashboardRouteFilter] = useState<LearningRoute | 'all'>('all');
 
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

  const studentPortalUrl = user ? `${PRODUCTION_STUDENT_PORTAL_ORIGIN}/adaptive/student/${user.uid}` : '';

  const loadRealDashboardData = useCallback(async () => {
    if (!user) {
      setRealProgressRecords([]);
      setRealProfiles([]);
      setFallbackEvents([]);
      setDashboardError(null);
      setIsDashboardLoading(false);
      return;
    }

    setIsDashboardLoading(true);
    setDashboardError(null);

    try {
      const progressQuery = query(
        collection(db, 'adaptiveSessionProgress'),
        where('teacherId', '==', user.uid)
      );
      const profileQuery = query(
        collection(db, 'studentLearningProfiles'),
        where('teacherId', '==', user.uid)
      );

      const [progressSnapshot, profileSnapshot, telemetryEvents] = await Promise.all([
        getDocs(progressQuery),
        getDocs(profileQuery),
        getFallbackEventsForTeacher(user.uid),
      ]);

      const progressRecords = progressSnapshot.docs
        .map(snapshot => snapshot.data() as StudentSessionProgressRecord)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const profiles = profileSnapshot.docs.map(snapshot => snapshot.data() as StudentLearningProfile);

      setRealProgressRecords(progressRecords);
      setRealProfiles(profiles);
      setFallbackEvents(telemetryEvents);
    } catch (error) {
      console.error('Lỗi tải dashboard học sinh thật', error);
      setDashboardError('Không tải được dữ liệu học sinh thật. Hệ thống tạm hiển thị dữ liệu mô phỏng.');
      setRealProgressRecords([]);
      setRealProfiles([]);
      setFallbackEvents([]);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRealDashboardData();
  }, [loadRealDashboardData]);

  useEffect(() => {
    let isMounted = true;

    const loadLessonSimulations = async () => {
      if (!user || lesson.knowledgeUnits.length === 0) {
        setSimulationsByUnitId({});
        return;
      }

      try {
        const simulationEntries = await Promise.all(
          lesson.knowledgeUnits.map(async unit => {
            const simulationId = unit.simulationId || `${lesson.id}_${unit.id}`;
            const snapshot = await getDoc(doc(db, 'lessonSimulations', simulationId));

            if (!snapshot.exists()) return null;

            const simulation = snapshot.data() as LessonSimulation;
            return [unit.id, simulation] as const;
          })
        );

        if (!isMounted) return;

        setSimulationsByUnitId(Object.fromEntries(simulationEntries.filter(Boolean) as [string, LessonSimulation][]));
      } catch (error) {
        console.error('Không tải được danh sách mô phỏng của bài học', error);
        if (isMounted) setSimulationsByUnitId({});
      }
    };

    loadLessonSimulations();

    return () => {
      isMounted = false;
    };
  }, [lesson.id, lesson.knowledgeUnits, user]);
 
  useEffect(() => {
    setPortalCopyState('idle');
  }, [studentPortalUrl]);

  const demoProgresses = useMemo(createDemoProgresses, []);
  const realProgresses = useMemo(() => realProgressRecords.map(convertRecordToProgress), [realProgressRecords]);
  const dashboardProgresses = realProgresses.length > 0 ? realProgresses : demoProgresses;
  const dashboardRows = useMemo(() => buildRealStudentDashboardRows(realProgressRecords, realProfiles), [realProgressRecords, realProfiles]);
  const classOptions = useMemo(() => {
    const classes = dashboardRows
      .map(row => row.studentClass?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(classes)).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [dashboardRows]);
  const filteredDashboardRows = useMemo(() => {
    const keyword = dashboardSearch.trim().toLowerCase();

    return dashboardRows.filter(row => {
      const matchesKeyword = !keyword
        || row.studentName.toLowerCase().includes(keyword)
        || row.studentCode.toLowerCase().includes(keyword)
        || (row.studentClass || '').toLowerCase().includes(keyword);
      const matchesClass = dashboardClassFilter === 'all' || row.studentClass === dashboardClassFilter;
      const matchesRoute = dashboardRouteFilter === 'all' || row.route === dashboardRouteFilter;
      return matchesKeyword && matchesClass && matchesRoute;
    });
  }, [dashboardRows, dashboardSearch, dashboardClassFilter, dashboardRouteFilter]);
  const filteredSupportCount = useMemo(() => filteredDashboardRows.filter(row => row.status === 'needs_support' || row.remediationAttempts > 0).length, [filteredDashboardRows]);
  const filteredCompletedCount = useMemo(() => filteredDashboardRows.filter(row => row.status === 'completed').length, [filteredDashboardRows]);
  const filteredAverageMastery = useMemo(() => {
    const masteryValues = filteredDashboardRows
      .map(row => row.averageMastery)
      .filter((value): value is number => typeof value === 'number');
    if (masteryValues.length === 0) return null;
    return Math.round((masteryValues.reduce((sum, value) => sum + value, 0) / masteryValues.length) * 100);
  }, [filteredDashboardRows]);
  const isUsingRealDashboard = realProgressRecords.length > 0;
  const telemetryWindowStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [fallbackEvents.length]);
  const fallbackEventsLast7Days = useMemo(() => fallbackEvents.filter(event => new Date(event.timestamp) >= telemetryWindowStart), [fallbackEvents, telemetryWindowStart]);
  const realProgressRecordsLast7Days = useMemo(() => realProgressRecords.filter(record => {
    const timestamp = record.updatedAt || record.startedAt;
    return timestamp ? new Date(timestamp) >= telemetryWindowStart : false;
  }), [realProgressRecords, telemetryWindowStart]);
  const fallbackStageCounts = useMemo(() => fallbackEventsLast7Days.reduce<Record<'api' | 'firestore' | 'localStorage', number>>((acc, event) => {
    acc[event.stage] += 1;
    return acc;
  }, { api: 0, firestore: 0, localStorage: 0 }), [fallbackEventsLast7Days]);
  const fallbackErrorCodeCounts = useMemo(() => fallbackEventsLast7Days.reduce<Partial<Record<FallbackErrorCode, number>>>((acc, event) => {
    acc[event.errorCode] = (acc[event.errorCode] || 0) + 1;
    return acc;
  }, {}), [fallbackEventsLast7Days]);
  const saveSuccessRate7Days = useMemo(() => {
    const totalSignals = realProgressRecordsLast7Days.length + fallbackEventsLast7Days.length;
    if (totalSignals === 0) return 100;
    return Math.round((realProgressRecordsLast7Days.length / totalSignals) * 100);
  }, [realProgressRecordsLast7Days.length, fallbackEventsLast7Days.length]);
  const teacherDashboard = useMemo(() => buildTeacherDashboardData(lesson, dashboardProgresses), [lesson, dashboardProgresses]);
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
  const firstWorkedExample = routeContent.workedExamples[0];
  const existingFirstUnitSimulation = simulationsByUnitId[firstUnit.id];
 
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

  const handleSimulationSaved = (simulation: LessonSimulation) => {
    setSimulationsByUnitId(prev => ({ ...prev, [simulation.unitId]: simulation }));
    setLesson(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      knowledgeUnits: prev.knowledgeUnits.map(unit => (
        unit.id === simulation.unitId ? { ...unit, simulationId: simulation.id } : unit
      )),
    }));
    setSimulationModalUnitId(null);
  };

  const verifyFirebaseAdminHealth = async () => {
    setIsCheckingAdminHealth(true);

    try {
      const response = await fetch('/api/health/firebase-admin', { method: 'GET' });
      const data = await response.json().catch(() => null) as FirebaseAdminHealthResponse | null;

      if (!response.ok || !data?.ok) {
        const missing = data?.missing?.length ? data.missing.join(', ') : null;
        const invalid = data?.invalid?.length ? data.invalid.join(', ') : null;
        const details = [
          missing ? `Thiếu: ${missing}` : null,
          invalid ? `Sai định dạng: ${invalid}` : null,
        ].filter(Boolean).join(' · ');

        throw new Error(details || data?.error || 'Endpoint health check Firebase Admin chưa sẵn sàng.');
      }
    } finally {
      setIsCheckingAdminHealth(false);
    }
  };

  const handleSaveTeacherDraft = async () => {
    void verifyFirebaseAdminHealth();

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
        removeUndefinedFields({
          id: documentId,
          userId: user.uid,
          teacherId: user.uid,
          lessonId: sampleAdaptiveLesson.id,
          title: lessonToSave.title,
          lesson: lessonToSave,
          portalEnabled: true,
          createdAt: lesson.createdAt || now,
          updatedAt: now,
        } satisfies AdaptiveLessonDocument),
        { merge: true }
      );

      setLesson(lessonToSave);
      setDraftSavedAt(formatSavedTime());
      setIsTeacherEditing(false);
      loadRealDashboardData();
    } catch (error) {
      console.error('Lỗi lưu hoặc bật cổng học sinh', error);
      const detail = error instanceof Error ? error.message : 'Không rõ nguyên nhân';
      setCloudError(`Chưa lưu được bài học lên Firestore. ${detail}. Vui lòng kiểm tra kết nối hoặc quyền Firestore.`);
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

  const handleCopyStudentPortalLink = async () => {
    if (!studentPortalUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(studentPortalUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = studentPortalUrl;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setPortalCopyState('copied');
      window.setTimeout(() => setPortalCopyState('idle'), 2200);
    } catch (error) {
      console.error('Không copy được link cổng học sinh', error);
      setPortalCopyState('failed');
    }
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
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-700">
              Bước 1 · Chuẩn bị bài
            </div>
            <h3 className="text-xl font-black text-slate-900">Lưu bài học trước khi gửi cho học sinh</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Giáo viên chỉ cần kiểm tra nội dung, bấm <b>Lưu & bật cổng học sinh</b>, sau đó gửi liên kết ở bước 2 cho lớp.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <button
              onClick={handleSaveTeacherDraft}
              disabled={isSavingLesson || isCheckingAdminHealth || isCloudLoading || !user}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSavingLesson ? 'Đang lưu...' : 'Lưu & bật cổng học sinh'}
            </button>
            <button
              onClick={() => setIsTeacherEditing(prev => !prev)}
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
            >
              {isTeacherEditing ? 'Đóng chỉnh sửa' : 'Chỉnh nội dung'}
            </button>
            <button
              onClick={handleResetTeacherDraft}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
            >
              Khôi phục mẫu
            </button>
          </div>
        </div>

        {!user && (
          <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            Bạn cần đăng nhập để lưu bài học và tạo cổng học sinh.
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

        {draftSavedAt && !cloudError ? (
          <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            Đã lưu bài học: {draftSavedAt}. Học sinh có thể vào cổng sau khi Firestore rules đã được triển khai.
          </div>
        ) : (
          !isCloudLoading && !cloudError && (
            <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
              Bài học đang là bản nháp trong trình duyệt. Hãy bấm nút “Lưu & bật cổng học sinh” trước khi gửi link.
            </div>
          )
        )}

        {isTeacherEditing ? (
          <div className="space-y-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">Chế độ chỉnh sửa nhanh</p>
                <p className="text-xs font-semibold text-slate-500">Chỉnh các phần giáo viên hay cần đổi nhất; bấm lưu ở trên hoặc cuối khung này.</p>
              </div>
              <button
                onClick={handleSaveTeacherDraft}
                disabled={isSavingLesson || isCheckingAdminHealth || isCloudLoading || !user}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSavingLesson ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Tên bài học</span>
                <input
                  value={lesson.title}
                  onChange={event => setLesson(prev => ({ ...prev, title: event.target.value, updatedAt: new Date().toISOString() }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Giải thích tuyến {routeLabel[recommendedRoute]}</span>
                <textarea
                  value={routeContent.explanation}
                  onChange={event => updateRouteExplanation(firstUnit.id, recommendedRoute, event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-indigo-400"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Mục tiêu học tập</p>
              <div className="grid gap-3 md:grid-cols-2">
                {lesson.objectives.map(objective => (
                  <div key={objective.id} className="rounded-2xl border border-slate-100 bg-white p-4">
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
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Ví dụ mẫu đầu tiên của tuyến {routeLabel[recommendedRoute]}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Dùng đề bài này để tạo simulation cho mảnh “{firstUnit.title}”.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimulationModalUnitId(firstUnit.id)}
                    disabled={!user || !firstWorkedExample}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <Sparkles className="h-4 w-4" />
                    {existingFirstUnitSimulation ? 'Sửa mô phỏng' : 'Tạo mô phỏng'}
                  </button>
                </div>
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
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-700">
              <p className="text-2xl font-black">{lesson.objectives.length}</p>
              <p className="text-xs font-bold uppercase tracking-wide">Mục tiêu học tập</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
              <p className="text-2xl font-black">3</p>
              <p className="text-xs font-bold uppercase tracking-wide">Tuyến nội dung</p>
            </div>
            <div className="rounded-2xl bg-purple-50 p-4 text-purple-700">
              <p className="text-2xl font-black">{isCloudLoading ? 'Đang tải' : draftSavedAt ? 'Đã lưu' : 'Chưa lưu'}</p>
              <p className="text-xs font-bold uppercase tracking-wide">{draftSavedAt ? 'Có thể gửi link học sinh' : 'Cần bấm lưu ở trên'}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              <QrCode className="h-4 w-4" /> Bước 2 · Gửi cho học sinh
            </div>
            <h3 className="text-xl font-black text-slate-900">Cổng học sinh riêng</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chiếu QR hoặc gửi link để học sinh vào đúng cổng học tập production, nhập mã học sinh cố định, làm test đầu giờ và học theo tuyến cá nhân.
            </p>
          </div>
          <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide', draftSavedAt ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
            <ShieldCheck className="h-4 w-4" />
            {draftSavedAt ? 'Cổng đang bật' : 'Lưu bài trước khi gửi'}
          </span>
        </div>

        {user ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-center">
              <div className="mx-auto inline-flex rounded-3xl border border-white bg-white p-4 shadow-sm">
                <QRCodeSVG value={studentPortalUrl} size={184} bgColor="#ffffff" fgColor="#1e3a8a" level="M" includeMargin />
              </div>
              <p className="mt-4 text-sm font-black text-slate-800">Quét để vào học</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                QR luôn dùng domain production đúng: <span className="font-black text-blue-700">giaoandewey.vercel.app</span>
              </p>
            </div>

            <div className="space-y-4 rounded-3xl border border-blue-100 bg-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">Link cổng học sinh</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    readOnly
                    value={studentPortalUrl}
                    onFocus={event => event.currentTarget.select()}
                    className="flex-1 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
                  />
                  <button
                    type="button"
                    onClick={handleCopyStudentPortalLink}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                  >
                    <Copy className="h-4 w-4" />
                    {portalCopyState === 'copied' ? 'Đã copy' : 'Copy link'}
                  </button>
                  <a
                    href={studentPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Mở thử
                  </a>
                </div>
                {portalCopyState === 'failed' && (
                  <p className="mt-2 text-xs font-bold text-red-600">Trình duyệt không cho copy tự động. Hãy bôi đen link và copy thủ công.</p>
                )}
              </div>

              <div className={cn(
                'rounded-2xl border p-4 text-sm font-semibold leading-6',
                draftSavedAt ? 'border-green-100 bg-green-50 text-green-700' : 'border-amber-100 bg-amber-50 text-amber-700'
              )}>
                {draftSavedAt ? (
                  <>
                    <p className="font-black">Cổng học sinh đã sẵn sàng.</p>
                    <p className="mt-1">Giáo viên có thể chiếu QR này lên màn hình lớp hoặc bấm “Copy link” để gửi qua Zalo/LMS. Học sinh chỉ cần nhập mã học sinh cố định để hệ thống lưu hồ sơ dài hạn.</p>
                  </>
                ) : (
                  <>
                    <p className="font-black">Chưa nên gửi cho học sinh.</p>
                    <p className="mt-1">Hãy bấm “Lưu & bật cổng học sinh” ở bước 1 để đảm bảo bài học mới nhất đã lên Firestore và cổng đang bật.</p>
                  </>
                )}
              </div>

              <div className="grid gap-3 text-xs font-bold text-slate-500 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-black text-slate-800">1. Chiếu QR</p>
                  <p className="mt-1 leading-5">Học sinh dùng camera điện thoại hoặc máy tính bảng để quét.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-black text-slate-800">2. Nhập mã</p>
                  <p className="mt-1 leading-5">Dùng mã học sinh cố định để nối dữ liệu qua nhiều tiết.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-black text-slate-800">3. Theo dõi</p>
                  <p className="mt-1 leading-5">Kết quả được lưu vào hồ sơ học tập dài hạn.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            Đăng nhập để hệ thống tạo link và QR cổng học sinh.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
              Bước 3 · Kiểm tra nhanh
            </div>
            <h3 className="text-xl font-black text-slate-900">Tóm tắt bài phân hoá</h3>
            <p className="mt-2 text-sm text-slate-500">Mặc định chỉ hiển thị phần giáo viên cần xem. Mô phỏng chi tiết được ẩn để giao diện đỡ rối.</p>
          </div>
          <button
            onClick={() => setShowTeacherPreview(prev => !prev)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            {showTeacherPreview ? 'Ẩn mô phỏng chi tiết' : 'Xem mô phỏng chi tiết'}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="font-black text-slate-800">Mục tiêu và quy trình 5 bước</h4>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{lesson.durationMinutes} phút</span>
            </div>
            <div className="space-y-3">
              {lesson.objectives.map(objective => (
                <div key={objective.id} className="rounded-2xl bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-black text-white">{objective.code}</span>
                    <h5 className="font-bold text-slate-800">{objective.title}</h5>
                  </div>
                  <p className="text-sm text-slate-600">{objective.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <h4 className="font-black text-slate-800">Ba tuyến học sinh sẽ nhận</h4>
            <div className="mt-4 space-y-3">
              {firstUnit.routes.map(routeItem => (
                <div key={routeItem.route} className={cn('rounded-2xl border p-4', routeClass[routeItem.route])}>
                  <p className="font-black">{routeLabel[routeItem.route]}</p>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 opacity-90">{routeItem.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showTeacherPreview && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><Activity className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Mô phỏng học sinh làm test đầu giờ</h3>
                    <p className="text-sm text-slate-500">Dành cho giáo viên kiểm thử engine phân tuyến trước khi dạy thật.</p>
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
                    <h3 className="text-lg font-black text-slate-800">Nội dung theo tuyến {routeLabel[recommendedRoute]}</h3>
                    <p className="text-sm text-slate-500">Xem trước phần học sinh sẽ nhận sau test đầu giờ.</p>
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
                    <h3 className="text-lg font-black text-slate-800">Quick check và điều phối thời gian</h3>
                    <p className="text-sm text-slate-500">Kiểm thử phản ứng của hệ thống khi học sinh đạt/chưa đạt hoặc học nhanh/chậm.</p>
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

                <div className="mt-6 border-t border-slate-100 pt-5">
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

                  {pacingDecision ? (
                    <div className={cn('rounded-2xl border p-4', pacingStatusClass[pacingDecision.status])}>
                      <p className="text-sm font-black uppercase tracking-wide">{pacingStatusLabel[pacingDecision.status]}</p>
                      <h4 className="mt-1 text-lg font-black">{pacingActionLabel[pacingDecision.action]}</h4>
                      <p className="mt-2 text-sm font-semibold leading-6">{pacingDecision.message}</p>
                      {pacingTasks.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-black uppercase tracking-wide opacity-70">Nhiệm vụ hệ thống gợi ý</p>
                          {pacingTasks.map(task => (
                            <div key={task.id} className="rounded-2xl bg-white/75 p-3 text-sm font-semibold leading-6">
                              {task.prompt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      Làm test đầu giờ trong mô phỏng để hệ thống tính nhanh/chậm theo tiết 40 phút.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="hidden rounded-2xl bg-white/10 p-3 text-blue-100 ring-1 ring-white/15 sm:block"><BarChart3 className="h-6 w-6" /></div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-100 ring-1 ring-white/15">
                  Bước 4 · Theo dõi lớp học
                </div>
                <h3 className="text-2xl font-black tracking-tight">Dashboard giáo viên từ dữ liệu thật</h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-blue-100">
                  {isUsingRealDashboard
                    ? 'Đang đọc kết quả học sinh đã nộp từ Firestore, kèm bộ lọc lớp/tuyến để giáo viên tìm nhanh học sinh cần hỗ trợ.'
                    : 'Chưa có học sinh thật nộp bài; hệ thống tạm hiển thị dữ liệu mô phỏng để giáo viên xem cấu trúc dashboard.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadRealDashboardData}
              disabled={!user || isDashboardLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Activity className="h-4 w-4" />
              {isDashboardLoading ? 'Đang tải dữ liệu...' : 'Làm mới dữ liệu thật'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {dashboardError && (
            <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
              {dashboardError}
            </div>
          )}

          <div className={cn(
            'mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6',
            isUsingRealDashboard ? 'border-green-100 bg-green-50 text-green-700' : 'border-slate-100 bg-slate-50 text-slate-500'
          )}>
            {isUsingRealDashboard
              ? `Dashboard đang dùng ${realProgressRecords.length} bản ghi học tập thật và ${realProfiles.length} hồ sơ dài hạn từ Firestore.`
              : 'Khi học sinh nộp exit ticket qua cổng QR/link, bảng này sẽ tự chuyển sang dữ liệu thật của lớp.'}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard icon={<Users className="h-5 w-5" />} label="Học sinh" value={teacherDashboard.totalStudents} />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Đã chẩn đoán" value={teacherDashboard.completedDiagnostic} />
            <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Cần hỗ trợ" value={teacherDashboard.needsTeacherCount} />
            <StatCard icon={<Route className="h-5 w-5" />} label="Tuyến thử thách" value={teacherDashboard.routeCounts.challenge} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-800">Tỷ lệ lưu thành công 7 ngày qua</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-blue-600">
                    Dựa trên {realProgressRecordsLast7Days.length} bản ghi học tập và {fallbackEventsLast7Days.length} sự kiện fallback trong 7 ngày gần nhất.
                  </p>
                </div>
                <div className="text-4xl font-black text-blue-700">{saveSuccessRate7Days}%</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${saveSuccessRate7Days}%` }} />
              </div>
              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
                <span className="rounded-xl bg-white/80 px-3 py-2">API fallback: {fallbackStageCounts.api}</span>
                <span className="rounded-xl bg-white/80 px-3 py-2">Firestore fallback: {fallbackStageCounts.firestore}</span>
                <span className="rounded-xl bg-white/80 px-3 py-2">LocalStorage fallback: {fallbackStageCounts.localStorage}</span>
              </div>
              {Object.keys(fallbackErrorCodeCounts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-blue-700">
                  {(Object.entries(fallbackErrorCodeCounts) as [FallbackErrorCode, number][]).map(([errorCode, count]) => (
                    <span key={errorCode} className="rounded-full bg-white px-3 py-1">
                      {fallbackErrorCodeLabel[errorCode] || errorCode}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-800">Tổng quan theo tuyến</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {(Object.keys(teacherDashboard.routeCounts) as LearningRoute[]).map(route => (
                  <div key={route} className={cn('flex items-center justify-between rounded-2xl border bg-white/70 p-4', routeClass[route])}>
                    <div>
                      <p className="text-sm font-black">{routeLabel[route]}</p>
                      <p className="text-xs font-semibold opacity-80">học sinh</p>
                    </div>
                    <p className="text-3xl font-black">{teacherDashboard.routeCounts[route]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isUsingRealDashboard && (
            <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-800">Danh sách học sinh thật</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Đang hiển thị {filteredDashboardRows.length}/{dashboardRows.length} học sinh · {filteredSupportCount} cần hỗ trợ · {filteredCompletedCount} đã hoàn thành · làm chủ TB {filteredAverageMastery ?? '—'}%.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[680px]">
                  <input
                    value={dashboardSearch}
                    onChange={event => setDashboardSearch(event.target.value)}
                    placeholder="Tìm tên, mã, lớp..."
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  />
                  <select
                    value={dashboardClassFilter}
                    onChange={event => setDashboardClassFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  >
                    <option value="all">Tất cả lớp</option>
                    {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
                  </select>
                  <select
                    value={dashboardRouteFilter}
                    onChange={event => setDashboardRouteFilter(event.target.value as LearningRoute | 'all')}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  >
                    <option value="all">Tất cả tuyến</option>
                    {(Object.keys(routeLabel) as LearningRoute[]).map(route => <option key={route} value={route}>{routeLabel[route]}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Học sinh</th>
                      <th className="px-4 py-3">Tuyến</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Diagnostic</th>
                      <th className="px-4 py-3">Quick check</th>
                      <th className="px-4 py-3">Exit ticket</th>
                      <th className="px-4 py-3">Hồ sơ</th>
                      <th className="px-4 py-3">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDashboardRows.map(row => (
                      <tr key={row.progressId} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-800">{row.studentName}</p>
                          <p className="text-xs font-semibold text-slate-500">{row.studentCode}{row.studentClass ? ` · ${row.studentClass}` : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', routeClass[row.route])}>{routeLabel[row.route]}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs font-black',
                            row.status === 'needs_support' ? 'bg-red-50 text-red-700' : row.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                          )}>{statusLabel[row.status]}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-700">{row.diagnosticScore}/{row.diagnosticMaxScore}</td>
                        <td className="px-4 py-3 font-bold text-indigo-700">{row.quickCheckMaxScore > 0 ? `${row.quickCheckScore}/${row.quickCheckMaxScore}` : 'Chưa có'}</td>
                        <td className="px-4 py-3 font-bold text-green-700">{row.exitTicketMaxScore ? `${row.exitTicketScore}/${row.exitTicketMaxScore}` : 'Chưa nộp'}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                          {row.totalSessions ? `${row.totalSessions} tiết · ${Math.round((row.averageMastery || 0) * 100)}% làm chủ` : 'Chưa có hồ sơ'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDashboardDate(row.completedAt || row.updatedAt)}</td>
                      </tr>
                    ))}
                    {filteredDashboardRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                          Không có học sinh khớp bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-black text-slate-800">Mức làm chủ theo mục tiêu</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Giúp giáo viên biết mục tiêu nào cần ôn tập lại cho cả lớp.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
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
                    <tr key={insight.objectiveId} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-800">{insight.objectiveCode}. {insight.title}</td>
                      <td className="px-4 py-3 font-black text-amber-700">{insight.weakCount}</td>
                      <td className="px-4 py-3 font-black text-blue-700">{insight.nearMasteryCount}</td>
                      <td className="px-4 py-3 font-black text-green-700">{insight.masteredCount}</td>
                      <td className="px-4 py-3 font-black text-purple-700">{insight.advancedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {firstWorkedExample && (
        <SimulationGeneratorModal
          isOpen={simulationModalUnitId === firstUnit.id}
          lessonId={lesson.id}
          unitId={firstUnit.id}
          unitTitle={firstUnit.title}
          exampleId={firstWorkedExample.id}
          problemText={firstWorkedExample.problem}
          existingSimulation={existingFirstUnitSimulation}
          onClose={() => setSimulationModalUnitId(null)}
          onSaved={handleSimulationSaved}
        />
      )}
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
