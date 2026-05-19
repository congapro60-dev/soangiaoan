import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  AlertTriangle,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Loader2,
  Route,
  Send,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { ExternalToolWidget } from '../components/adaptive/ExternalToolWidget';
import { LessonSimulationViewer } from '../components/adaptive/LessonSimulationViewer';
import { getToolsByIds } from '../data/externalTools';
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
import {
  saveAdaptiveProgressOffline,
  saveAdaptiveProgressViaApi,
  syncOfflineAdaptiveProgress,
} from '../services/adaptiveProgressApi';
import { classifyFallbackError, logFallbackEvent, syncQueuedFallbackEvents } from '../services/telemetry';
import { ensureMathWrapped } from '../utils/examScoring';

type PortalStage = 'loading' | 'not_found' | 'identify' | 'diagnostic' | 'lesson' | 'quick_check' | 'exit_ticket' | 'complete';
type NoticeTone = 'info' | 'warning' | 'error';
type WorkedExample = AdaptiveLesson['knowledgeUnits'][number]['routes'][number]['workedExamples'][number];

interface WorkedExampleInteraction {
  answer: string;
  submitted: boolean;
  hintRevealed: boolean;
  imageName?: string;
  imagePreviewUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageStoragePath?: string;
  imageDownloadUrl?: string;
  aiFeedback?: string;
  isGrading?: boolean;
  gradingError?: string;
  submittedAt?: string;
  durationSeconds?: number;
}

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

const noticeClass: Record<NoticeTone, string> = {
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  error: 'border-red-100 bg-red-50 text-red-700',
};

const normalizeStudentCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-');
const buildStudentId = (teacherId: string, studentCode: string) => `${teacherId}_${normalizeStudentCode(studentCode)}`;
const buildProgressId = (teacherId: string, lessonId: string, studentCode: string) => `${teacherId}_${lessonId}_${normalizeStudentCode(studentCode)}`;

const getQuestionAnswer = (questionId: string, answers: Record<string, string>) => answers[questionId] || '';
const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const improveLongMathText = (text: string) => ensureMathWrapped(text)
  .replace(/\.\s+(?=(Ta|Vậy|Suy ra|Do đó|Các|Điểm|Không|Câu hỏi|Từ)\b)/g, '.\n\n');

const MathText = ({ children, className }: { children: string; className?: string }) => (
  <span className={cn('adaptive-math-text break-words', className)}>
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children: paragraphChildren }) => <span>{paragraphChildren}</span> }}
    >
      {ensureMathWrapped(children)}
    </ReactMarkdown>
  </span>
);

const MathBlock = ({ children, className }: { children: string; className?: string }) => (
  <div className={cn('adaptive-math-block space-y-3 break-words text-sm font-semibold leading-7 text-slate-600 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2 [&_p]:mb-3 [&_p:last-child]:mb-0', className)}>
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {improveLongMathText(children)}
    </ReactMarkdown>
  </div>
);

const buildExampleKey = (unitId: string, exampleId: string) => `example-${unitId}-${exampleId}`;
const getExamplePlannedSeconds = (example: WorkedExample, unitSeconds: number, exampleCount: number) => (
  example.timeLimitSeconds || Math.max(90, Math.floor(unitSeconds / Math.max(exampleCount + 2, 3)))
);
const getExampleHintDelaySeconds = (example: WorkedExample, plannedSeconds: number) => (
  example.hintDelaySeconds || Math.min(90, Math.max(45, Math.floor(plannedSeconds / 2)))
);

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Không đọc được ảnh bài làm.'));
  reader.readAsDataURL(file);
});

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const hashStudentCode = async (studentCode: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(studentCode.toUpperCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const uploadWorkedExampleImage = async ({
  teacherId,
  studentCode,
  imageDataUrl,
  imageMimeType,
}: {
  teacherId: string;
  studentCode: string;
  imageDataUrl: string;
  imageMimeType: string;
}) => {
  const extension = imageMimeType.includes('png') ? 'png' : imageMimeType.includes('webp') ? 'webp' : 'jpg';
  const uploadedAt = Date.now();
  const studentHash = await hashStudentCode(studentCode);
  const path = `student-uploads/${teacherId}/${studentHash}/${uploadedAt}.${extension}`;
  const imageRef = ref(storage, path);

  await uploadString(imageRef, imageDataUrl, 'data_url', { contentType: imageMimeType });
  const downloadUrl = await getDownloadURL(imageRef);

  return { downloadUrl, path };
};

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

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error || 'unknown');

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
  const [exitTicketAnswers, setExitTicketAnswers] = useState<Record<string, string>>({});
  const [workedExampleInteractions, setWorkedExampleInteractions] = useState<Record<string, WorkedExampleInteraction>>({});
  const [diagnosticAttempt, setDiagnosticAttempt] = useState<AssessmentAttempt | null>(null);
  const [quickCheckAttempts, setQuickCheckAttempts] = useState<AssessmentAttempt[]>([]);
  const [exitTicketAttempt, setExitTicketAttempt] = useState<AssessmentAttempt | null>(null);
  const [remediationAttemptsByUnit, setRemediationAttemptsByUnit] = useState<Record<string, number>>({});
  const [needsTeacherSupport, setNeedsTeacherSupport] = useState(false);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [sectionStarts, setSectionStarts] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(Date.now());

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

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const runSync = async () => {
      void syncQueuedFallbackEvents();

      const result = await syncOfflineAdaptiveProgress();
      if (result.synced > 0) {
        setNotice({
          tone: 'info',
          message: `Đã đồng bộ ${result.synced} kết quả học tập lưu tạm lên hệ thống.`,
        });
      }
    };

    runSync();
    window.addEventListener('online', runSync);
    window.addEventListener('storage', runSync);
    const intervalId = window.setInterval(runSync, 60_000);
    return () => {
      window.removeEventListener('online', runSync);
      window.removeEventListener('storage', runSync);
      window.clearInterval(intervalId);
    };
  }, []);

  const activeSectionKey = useMemo(() => {
    if (stage === 'diagnostic') return 'diagnostic';
    if (stage === 'lesson') return `learn-${currentUnitIndex}`;
    if (stage === 'quick_check') return `quick-${currentUnitIndex}`;
    if (stage === 'exit_ticket') return 'exit-ticket';
    return null;
  }, [currentUnitIndex, stage]);

  useEffect(() => {
    if (!activeSectionKey) return;
    setSectionStarts(prev => (prev[activeSectionKey] ? prev : { ...prev, [activeSectionKey]: Date.now() }));
  }, [activeSectionKey]);

  const currentUnit = lesson?.knowledgeUnits[currentUnitIndex] || null;
  const recommendedRoute = diagnosticAttempt?.recommendedRoute || 'standard';
  const routeContent = currentUnit?.routes.find(item => item.route === recommendedRoute) || currentUnit?.routes[1] || currentUnit?.routes[0];
  const totalDiagnosticScore = diagnosticAttempt?.answers.reduce((sum, item) => sum + item.score, 0) || 0;
  const maxDiagnosticScore = lesson?.diagnosticTest.questions.reduce((sum, item) => sum + item.points, 0) || 0;
  const totalRemediationAttempts = Object.values(remediationAttemptsByUnit).reduce((sum, value) => sum + value, 0);
  const currentWorkedExamplesReady = currentUnit && routeContent
    ? routeContent.workedExamples.every(example => workedExampleInteractions[buildExampleKey(currentUnit.id, example.id)]?.submitted)
    : true;

  const elapsedSecondsFor = (key: string) => {
    const startedAt = sectionStarts[key];
    return startedAt ? Math.max(0, Math.floor((nowTick - startedAt) / 1000)) : 0;
  };

  const remainingSecondsFor = (key: string, plannedSeconds: number) => Math.max(0, plannedSeconds - elapsedSecondsFor(key));
  const measuredDurationFor = (key: string, fallbackSeconds: number) => Math.max(1, elapsedSecondsFor(key) || fallbackSeconds);
  const timestampFor = (key: string) => new Date(sectionStarts[key] || Date.now()).toISOString();

  const learnerSummary = useMemo(() => {
    if (!profile) return null;
    const weakest = [...profile.objectiveMemory]
      .sort((a, b) => a.masteryEstimate - b.masteryEstimate)
      .slice(0, 2);
    return { weakest };
  }, [profile]);

  const handleIdentify = async () => {
    if (!teacherId || !studentName.trim() || !studentCode.trim()) {
      setNotice({ tone: 'error', message: 'Em cần nhập họ tên và mã học sinh để hệ thống lưu đúng hồ sơ học tập.' });
      return;
    }

    setNotice(null);
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

  const updateWorkedExampleInteraction = (key: string, patch: Partial<WorkedExampleInteraction>) => {
    setWorkedExampleInteractions(prev => {
      const current = prev[key] || { answer: '', submitted: false, hintRevealed: false };
      return {
        ...prev,
        [key]: { ...current, ...patch },
      };
    });
  };

  const handleWorkedExampleImage = async (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      updateWorkedExampleInteraction(key, { gradingError: 'Tệp được chọn không phải ảnh. Em hãy chụp hoặc tải ảnh bài làm.' });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      updateWorkedExampleInteraction(key, {
        gradingError: `Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 5MB.`,
      });
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const [, base64 = ''] = dataUrl.split(',');
      updateWorkedExampleInteraction(key, {
        imageName: file.name,
        imagePreviewUrl: dataUrl,
        imageBase64: base64,
        imageMimeType: file.type,
        gradingError: undefined,
        aiFeedback: undefined,
      });
    } catch (error) {
      console.error('Không đọc được ảnh bài làm tự luận', error);
      updateWorkedExampleInteraction(key, { gradingError: 'Không đọc được ảnh bài làm. Em thử chụp lại rõ hơn hoặc chọn ảnh khác.' });
    }
  };

  const handleWorkedExampleSubmit = (key: string, durationSeconds: number) => {
    updateWorkedExampleInteraction(key, {
      submitted: true,
      submittedAt: new Date().toISOString(),
      durationSeconds,
      gradingError: undefined,
    });
  };

  const handleGradeWorkedExampleImage = async (key: string, example: WorkedExample) => {
    const interaction = workedExampleInteractions[key];
    if (!interaction?.imageBase64 || !interaction.imageMimeType || !interaction.imagePreviewUrl) {
      updateWorkedExampleInteraction(key, { gradingError: 'Em cần tải ảnh bài làm trước khi nhờ AI chấm tham khảo.' });
      return;
    }

    if (!teacherId || !studentCode.trim()) {
      updateWorkedExampleInteraction(key, { gradingError: 'Thiếu thông tin học sinh để lưu ảnh bài làm. Em hãy nhập mã học sinh rồi thử lại.' });
      return;
    }

    updateWorkedExampleInteraction(key, { isGrading: true, gradingError: undefined });

    try {
      const uploadedImage = interaction.imageDownloadUrl && interaction.imageStoragePath
        ? { downloadUrl: interaction.imageDownloadUrl, path: interaction.imageStoragePath }
        : await uploadWorkedExampleImage({
          teacherId,
          studentCode,
          imageDataUrl: interaction.imagePreviewUrl,
          imageMimeType: interaction.imageMimeType,
        });

      updateWorkedExampleInteraction(key, {
        imageDownloadUrl: uploadedImage.downloadUrl,
        imageStoragePath: uploadedImage.path,
      });
      const prompt = [
        'Bạn là trợ lý chấm bài Toán phổ thông. Hãy chấm ảnh bài làm của học sinh theo hướng phản hồi học tập, không chỉ cho điểm.',
        `Đề bài: ${example.problem}`,
        `Đáp án/lời giải chuẩn: ${example.solution}`,
        `Tiêu chí riêng: ${example.aiRubric || example.explanation}`,
        'Trả lời ngắn gọn bằng tiếng Việt theo 4 dòng: Điểm tham khảo / Nhận xét đúng / Lỗi cần sửa / Gợi ý bước tiếp theo. Nếu ảnh mờ hoặc thiếu dữ kiện, nói rõ không đủ cơ sở chấm.',
      ].join('\n');

      const response = await fetch('/api/gemini-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: interaction.imageBase64,
          imageMimeType: interaction.imageMimeType,
          model: 'gemini-1.5-flash',
        }),
      });

      if (!response.ok) throw new Error(`AI trả về lỗi ${response.status}`);
      const data = await response.json();
      const aiFeedback = typeof data.text === 'string' && data.text.trim()
        ? data.text.trim()
        : 'AI chưa trả về nhận xét rõ ràng. Em hãy đối chiếu lời giải chuẩn bên dưới.';

      updateWorkedExampleInteraction(key, {
        aiFeedback,
        imageDownloadUrl: uploadedImage.downloadUrl,
        imageStoragePath: uploadedImage.path,
        isGrading: false,
      });
    } catch (error) {
      console.error('Không chấm được ảnh bài làm bằng AI', error);
      updateWorkedExampleInteraction(key, {
        isGrading: false,
        gradingError: 'AI chưa chấm được ảnh lúc này. Em vẫn có thể xem lời giải chuẩn và báo giáo viên kiểm tra bài viết tay.',
      });
    }
  };

  const handleDiagnosticSubmit = () => {
    if (!lesson) return;
    const plannedSeconds = lesson.diagnosticTest.durationMinutes * 60;
    const attempt = gradeAssessment(lesson.diagnosticTest, diagnosticAnswers, measuredDurationFor('diagnostic', plannedSeconds));
    setDiagnosticAttempt(attempt);
    setQuickCheckAttempts([]);
    setQuickCheckAttemptStateForNextUnit(0);
    setExitTicketAttempt(null);
    setNeedsTeacherSupport(false);
    setRemediationAttemptsByUnit({});
    setCurrentUnitIndex(0);
    setNotice({ tone: 'info', message: `Hệ thống đã xếp em vào tuyến ${routeLabel[attempt.recommendedRoute || 'standard']}. Tiếp theo em học lần lượt các mảnh kiến thức của tiết học.` });
    setStage('lesson');
  };

  const setQuickCheckAttemptStateForNextUnit = (nextIndex: number) => {
    setCurrentUnitIndex(nextIndex);
    setQuickCheckAnswers({});
  };

  const handleQuickCheckSubmit = () => {
    if (!currentUnit) return;

    const sectionKey = `quick-${currentUnitIndex}`;
    const plannedSeconds = currentUnit.quickCheck.durationMinutes * 60;
    const attempt = gradeAssessment(currentUnit.quickCheck, quickCheckAnswers, measuredDurationFor(sectionKey, plannedSeconds));
    const currentRemediationAttempts = remediationAttemptsByUnit[currentUnit.id] || 0;
    const action = decideNextUnitAction(attempt, currentRemediationAttempts, currentUnit.maxRemediationAttempts);
    const nextAttempts = [...quickCheckAttempts, attempt];
    setQuickCheckAttempts(nextAttempts);

    if (action === 'remediate') {
      setRemediationAttemptsByUnit(prev => ({ ...prev, [currentUnit.id]: currentRemediationAttempts + 1 }));
      setQuickCheckAnswers({});
      setNotice({ tone: 'warning', message: 'Em cần quay lại phần hỗ trợ/luyện tập thêm trước khi làm lại quick check. Đây là nhánh điều chỉnh, không phải lỗi hệ thống.' });
      setStage('lesson');
      return;
    }

    if (action === 'needs_teacher') {
      setNeedsTeacherSupport(true);
      setNotice({ tone: 'warning', message: 'Hệ thống đã ghi nhận em cần giáo viên hỗ trợ thêm ở mảnh này. Em vẫn tiếp tục hoàn thành phần phản tư cuối tiết.' });
      setStage('exit_ticket');
      return;
    }

    const nextUnitIndex = currentUnitIndex + 1;
    if (lesson && nextUnitIndex < lesson.knowledgeUnits.length) {
      setQuickCheckAttemptStateForNextUnit(nextUnitIndex);
      setNotice({ tone: 'info', message: 'Em đã qua mảnh kiến thức này. Chuyển sang mảnh tiếp theo để tiết học đủ nội dung.' });
      setStage('lesson');
      return;
    }

    setNotice({ tone: 'info', message: 'Em đã hoàn thành các mảnh kiến thức chính. Bước cuối là exit ticket/phản tư để chốt bài.' });
    setStage('exit_ticket');
  };

  const handleExitTicketSubmit = async () => {
    if (!lesson || !teacherId || !diagnosticAttempt) return;

    const plannedSeconds = lesson.exitTicket.durationMinutes * 60;
    const finalExitTicketAttempt = gradeAssessment(lesson.exitTicket, exitTicketAnswers, measuredDurationFor('exit-ticket', plannedSeconds));
    setExitTicketAttempt(finalExitTicketAttempt);

    const attempts = [diagnosticAttempt, ...quickCheckAttempts, finalExitTicketAttempt];
    const studentId = buildStudentId(teacherId, studentCode);
    const progressId = buildProgressId(teacherId, lesson.id, studentCode);
    const now = new Date().toISOString();
    const progress = createProgressFromDiagnostic(lesson, `lesson-${lesson.id}`, studentId, diagnosticAttempt);
    const uploadedImageUrls = Array.from(new Set(Object.values(workedExampleInteractions)
      .map(interaction => interaction.imageDownloadUrl)
      .filter((url): url is string => Boolean(url))));
    const workedExampleProgress = Object.fromEntries(Object.entries(workedExampleInteractions).map(([key, interaction]) => [key, {
      answer: interaction.answer,
      submitted: interaction.submitted,
      hintRevealed: interaction.hintRevealed,
      imageName: interaction.imageName,
      imageStoragePath: interaction.imageStoragePath,
      imageDownloadUrl: interaction.imageDownloadUrl,
      hasImage: Boolean(interaction.imageBase64 || interaction.imageDownloadUrl),
      aiFeedback: interaction.aiFeedback,
      submittedAt: interaction.submittedAt,
      durationSeconds: interaction.durationSeconds,
    }]));
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
      status: needsTeacherSupport ? 'needs_support' : 'completed',
      diagnosticAttempt,
      quickCheckAttempts,
      exitTicketAttempt: finalExitTicketAttempt,
      objectiveStates: progress.objectiveStates,
      remediationAttempts: totalRemediationAttempts,
      completedUnitIds: lesson.knowledgeUnits.slice(0, currentUnitIndex + 1).map(unit => unit.id),
      uploadedImageUrls,
      timings: {
        diagnostic: {
          startedAt: timestampFor('diagnostic'),
          completedAt: diagnosticAttempt.submittedAt,
          durationSeconds: diagnosticAttempt.durationSeconds,
          plannedSeconds: lesson.diagnosticTest.durationMinutes * 60,
        },
        ...Object.fromEntries(lesson.knowledgeUnits.map((unit, index) => {
          const learnKey = `learn-${index}`;
          const quickKey = `quick-${index}`;
          return [unit.id, {
            learnStartedAt: timestampFor(learnKey),
            learnDurationSeconds: elapsedSecondsFor(learnKey),
            learnPlannedSeconds: unit.estimatedMinutes * 60,
            quickCheckDurationSeconds: quickCheckAttempts.find(attempt => attempt.assessmentId === unit.quickCheck.id)?.durationSeconds || 0,
            quickCheckPlannedSeconds: unit.quickCheck.durationMinutes * 60,
            quickCheckStartedAt: timestampFor(quickKey),
          }];
        })),
        workedExamples: workedExampleProgress,
        exitTicket: {
          startedAt: timestampFor('exit-ticket'),
          completedAt: finalExitTicketAttempt.submittedAt,
          durationSeconds: finalExitTicketAttempt.durationSeconds,
          plannedSeconds: lesson.exitTicket.durationMinutes * 60,
        },
      },
      startedAt: timestampFor('diagnostic'),
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
    setNotice(null);

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
      void logFallbackEvent({
        teacherId,
        studentId,
        lessonId: lesson.id,
        stage: 'api',
        timestamp: new Date().toISOString(),
        errorCode: classifyFallbackError(apiError),
        source: 'student_portal',
      });

      try {
        await setDoc(doc(db, 'adaptiveSessionProgress', progressId), progressRecord, { merge: true });

        try {
          await setDoc(doc(db, 'studentLearningProfiles', studentId), nextProfile, { merge: true });
        } catch (profileError) {
          console.warn('Không lưu được hồ sơ dài hạn bằng client, nhưng đã lưu tiến trình tiết học', profileError);
        }

        setProfile(nextProfile);
        setStage('complete');
        setNotice({ tone: 'warning', message: 'Kết quả đã lưu qua kênh dự phòng. Nếu thông báo này xuất hiện nhiều lần, giáo viên cần kiểm tra biến môi trường Firebase Admin của API.' });
      } catch (firestoreError) {
        console.error('Không lưu được tiến trình học sinh bằng cả API và Firestore client', firestoreError);
        void logFallbackEvent({
          teacherId,
          studentId,
          lessonId: lesson.id,
          stage: 'firestore',
          timestamp: new Date().toISOString(),
          errorCode: classifyFallbackError(firestoreError),
          source: 'student_portal',
        });

        try {
          saveAdaptiveProgressOffline({
            teacherId,
            lessonId: lesson.id,
            progressId,
            studentId,
            progressRecord,
            profileRecord: nextProfile,
          }, getErrorMessage(firestoreError), now);
          void logFallbackEvent({
            teacherId,
            studentId,
            lessonId: lesson.id,
            stage: 'localStorage',
            timestamp: new Date().toISOString(),
            errorCode: classifyFallbackError(firestoreError),
            source: 'student_portal',
          });
          setProfile(nextProfile);
          setStage('complete');
          setNotice({ tone: 'warning', message: 'Kết quả đã được lưu tạm trên thiết bị này. API lưu kết quả hoặc kết nối mạng chưa đồng bộ được lên hệ thống.' });
        } catch (fallbackError) {
          console.error('Không lưu được cả bản dự phòng tiến trình học sinh', fallbackError);
          setNotice({ tone: 'error', message: 'Không lưu được kết quả học tập. Em hãy báo giáo viên kiểm tra kết nối hoặc quyền Firestore.' });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (stage === 'loading') return <FullPageState icon={<Loader2 className="h-8 w-8 animate-spin text-blue-600" />} title="Đang mở lớp học phân hoá" message="Hệ thống đang tải bài học giáo viên đã phát." />;
  if (stage === 'not_found' || !lesson) return <FullPageState icon={<AlertTriangle className="h-8 w-8 text-amber-500" />} title="Chưa tìm thấy bài học" message="Liên kết này chưa có bài học phân hoá đã lưu hoặc giáo viên chưa phát bài." />;

  const stepNames = lesson.fiveStepFlow.steps.map(step => step.name);
  const activeStepIndex = stage === 'identify'
    ? 0
    : stage === 'diagnostic'
      ? 1
      : stage === 'lesson'
        ? 2
        : stage === 'quick_check'
          ? 3
          : 4;

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
                Em học theo quy trình 5 bước: kết nối, chẩn đoán, hình thành kiến thức, luyện tập điều chỉnh và phản tư. Mỗi phần có đồng hồ để ghi tốc độ học tập.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat icon={<Clock3 className="h-5 w-5" />} value={`${lesson.durationMinutes}'`} label="Tiết học" />
              <MiniStat icon={<Target className="h-5 w-5" />} value={lesson.objectives.length} label="Mục tiêu" />
              <MiniStat icon={<Route className="h-5 w-5" />} value="3" label="Tuyến học" />
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-5">
            {stepNames.map((stepName, index) => (
              <div key={stepName} className={cn('rounded-2xl px-3 py-2 text-xs font-black', index <= activeStepIndex ? 'bg-white text-indigo-700' : 'bg-white/10 text-blue-50')}>
                <span className="block text-[10px] uppercase tracking-widest opacity-70">Bước {index + 1}</span>
                {stepName}
              </div>
            ))}
          </div>
        </section>

        {notice && (
          <div className={cn('rounded-2xl border px-4 py-3 text-sm font-bold', noticeClass[notice.tone])}>
            {notice.message}
          </div>
        )}

        {stage === 'identify' && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><UserRound className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Bước 1. Kết nối và nhập thông tin học sinh</h2>
                <p className="text-sm text-slate-500">Mã học sinh giúp hệ thống nối kết quả hôm nay với hồ sơ học tập các tiết sau.</p>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-700">Câu hỏi khởi động</p>
              <div className="mt-2 grid gap-2 text-sm font-semibold text-blue-900 md:grid-cols-2">
                {lesson.preparation.guidingQuestions.slice(0, 4).map(question => (
                  <div key={question} className="rounded-xl bg-white/70 p-3"><MathText>{question}</MathText></div>
                ))}
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
            title="Bước 2. Test đầu giờ"
            description={`Hoàn thành trong khoảng ${lesson.diagnosticTest.durationMinutes} phút để hệ thống xác định tuyến học phù hợp.`}
            questions={lesson.diagnosticTest.questions}
            answers={diagnosticAnswers}
            setAnswers={setDiagnosticAnswers}
            submitLabel="Nộp test và nhận tuyến học"
            onSubmit={handleDiagnosticSubmit}
            timer={{
              plannedSeconds: lesson.diagnosticTest.durationMinutes * 60,
              elapsedSeconds: elapsedSecondsFor('diagnostic'),
              remainingSeconds: remainingSecondsFor('diagnostic', lesson.diagnosticTest.durationMinutes * 60),
            }}
          />
        )}

        {stage === 'lesson' && currentUnit && routeContent && diagnosticAttempt && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Bước 3. Hình thành kiến thức theo tuyến</h2>
                  <p className="mt-1 text-sm text-slate-500">Điểm test đầu giờ: {totalDiagnosticScore}/{maxDiagnosticScore}. Mảnh {currentUnitIndex + 1}/{lesson.knowledgeUnits.length}: {currentUnit.title}.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={cn('w-fit rounded-full border px-4 py-2 text-sm font-black', routeClass[recommendedRoute])}>{routeLabel[recommendedRoute]}</span>
                  <SectionTimer plannedSeconds={currentUnit.estimatedMinutes * 60} elapsedSeconds={elapsedSecondsFor(`learn-${currentUnitIndex}`)} remainingSeconds={remainingSecondsFor(`learn-${currentUnitIndex}`, currentUnit.estimatedMinutes * 60)} compact />
                </div>
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
              <p className="text-xs font-black uppercase tracking-wide text-blue-500">{currentUnit.title}</p>
              <h3 className="mt-1 text-2xl font-black text-slate-800">Nội dung học theo tuyến {routeLabel[recommendedRoute]}</h3>
              <MathBlock className="mt-3">{routeContent.explanation}</MathBlock>
              <LessonSimulationViewer
                lessonId={lesson.id}
                unitId={currentUnit.id}
                unitTitle={currentUnit.title}
              />
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {routeContent.workedExamples.map((example, index) => {
                  const exampleKey = buildExampleKey(currentUnit.id, example.id);
                  const plannedSeconds = getExamplePlannedSeconds(example, currentUnit.estimatedMinutes * 60, routeContent.workedExamples.length);
                  const hintDelaySeconds = getExampleHintDelaySeconds(example, plannedSeconds);
                  return (
                    <InteractiveWorkedExampleCard
                      key={example.id}
                      example={example}
                      index={index}
                      interaction={workedExampleInteractions[exampleKey]}
                      plannedSeconds={plannedSeconds}
                      hintDelaySeconds={hintDelaySeconds}
                      elapsedSeconds={elapsedSecondsFor(exampleKey)}
                      remainingSeconds={remainingSecondsFor(exampleKey, plannedSeconds)}
                      onStart={() => setSectionStarts(prev => (prev[exampleKey] ? prev : { ...prev, [exampleKey]: Date.now() }))}
                      onAnswerChange={(answer) => updateWorkedExampleInteraction(exampleKey, { answer })}
                      onRevealHint={() => updateWorkedExampleInteraction(exampleKey, { hintRevealed: true })}
                      onImageChange={(event) => handleWorkedExampleImage(exampleKey, event)}
                      onSubmit={() => handleWorkedExampleSubmit(exampleKey, measuredDurationFor(exampleKey, plannedSeconds))}
                      onGradeImage={() => handleGradeWorkedExampleImage(exampleKey, example)}
                    />
                  );
                })}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <TaskPanel title="Nhiệm vụ tuyến học" tasks={routeContent.practiceTasks} tone="blue" />
                <TaskPanel title="Hỗ trợ nếu còn lúng túng" tasks={currentUnit.supportTasks} tone="amber" />
                <TaskPanel title="Mở rộng cho học sinh nhanh" tasks={currentUnit.enrichmentTasks} tone="purple" />
              </div>
              {currentUnit.externalToolIds && currentUnit.externalToolIds.length > 0 && (
                <ExternalToolWidget tools={getToolsByIds(currentUnit.externalToolIds)} />
              )}
              <button
                onClick={() => {
                  if (!currentWorkedExamplesReady) {
                    setNotice({ tone: 'warning', message: 'Em cần nộp ý tưởng/lời giải cho tất cả ví dụ tương tác trong mảnh này trước khi chuyển sang quick check.' });
                    return;
                  }
                  setNotice(null);
                  setSectionStarts(prev => ({ ...prev, [`quick-${currentUnitIndex}`]: Date.now() }));
                  setStage('quick_check');
                }}
                disabled={!currentWorkedExamplesReady}
                className="mt-5 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {currentWorkedExamplesReady ? 'Em đã học xong mảnh này, chuyển sang quick check' : 'Nộp đủ ví dụ tương tác trước khi làm quick check'}
              </button>
            </div>
          </motion.section>
        )}

        {stage === 'quick_check' && currentUnit && (
          <StudentAssessmentCard
            title={`Bước 4. Quick check mảnh ${currentUnitIndex + 1}`}
            description="Kết quả này quyết định em chuyển sang mảnh tiếp theo, học lại phần hỗ trợ, hoặc cần giáo viên can thiệp."
            questions={currentUnit.quickCheck.questions}
            answers={quickCheckAnswers}
            setAnswers={setQuickCheckAnswers}
            submitLabel="Nộp quick check"
            onSubmit={handleQuickCheckSubmit}
            timer={{
              plannedSeconds: currentUnit.quickCheck.durationMinutes * 60,
              elapsedSeconds: elapsedSecondsFor(`quick-${currentUnitIndex}`),
              remainingSeconds: remainingSecondsFor(`quick-${currentUnitIndex}`, currentUnit.quickCheck.durationMinutes * 60),
            }}
          />
        )}

        {stage === 'exit_ticket' && (
          <StudentAssessmentCard
            title="Bước 5. Exit ticket và phản tư cuối tiết"
            description="Phần này giúp chốt lại bài học và lưu đủ dữ liệu tốc độ/độ thành thạo cho các tiết sau."
            questions={lesson.exitTicket.questions}
            answers={exitTicketAnswers}
            setAnswers={setExitTicketAnswers}
            submitLabel={isSaving ? 'Đang lưu kết quả...' : 'Nộp exit ticket và lưu hồ sơ'}
            disabled={isSaving}
            onSubmit={handleExitTicketSubmit}
            timer={{
              plannedSeconds: lesson.exitTicket.durationMinutes * 60,
              elapsedSeconds: elapsedSecondsFor('exit-ticket'),
              remainingSeconds: remainingSecondsFor('exit-ticket', lesson.exitTicket.durationMinutes * 60),
            }}
          />
        )}

        {stage === 'complete' && diagnosticAttempt && exitTicketAttempt && (
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

const InteractiveWorkedExampleCard = ({
  example,
  index,
  interaction,
  plannedSeconds,
  hintDelaySeconds,
  elapsedSeconds,
  remainingSeconds,
  onStart,
  onAnswerChange,
  onRevealHint,
  onImageChange,
  onSubmit,
  onGradeImage,
}: {
  example: WorkedExample;
  index: number;
  interaction?: WorkedExampleInteraction;
  plannedSeconds: number;
  hintDelaySeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  onStart: () => void;
  onAnswerChange: (answer: string) => void;
  onRevealHint: () => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onGradeImage: () => void;
}) => {
  const state = interaction || { answer: '', submitted: false, hintRevealed: false };
  const hasStarted = elapsedSeconds > 0;
  const canShowTimedHint = elapsedSeconds >= hintDelaySeconds || remainingSeconds <= 0;
  const shouldShowHint = state.hintRevealed || canShowTimedHint;
  const isImageMode = example.responseMode === 'image_upload';
  const hasResponse = isImageMode ? Boolean(state.imageBase64 || state.answer.trim()) : Boolean(state.answer.trim());
  const hints = example.hints?.length ? example.hints : [example.explanation];

  return (
    <div className="flex h-full flex-col rounded-3xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Ví dụ tương tác {index + 1}</p>
          <h4 className="mt-1 text-base font-black text-slate-800">{example.title}</h4>
        </div>
        <SectionTimer plannedSeconds={plannedSeconds} elapsedSeconds={elapsedSeconds} remainingSeconds={remainingSeconds} compact />
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold leading-7 text-slate-800">
        <MathBlock className="text-slate-800">{example.problem}</MathBlock>
      </div>

      {!hasStarted ? (
        <button onClick={onStart} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 sm:w-fit">
          <Clock3 className="h-4 w-4" /> Bắt đầu suy nghĩ
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Ý tưởng/lời giải nháp của em</span>
            <textarea
              value={state.answer}
              onChange={event => onAnswerChange(event.target.value)}
              disabled={state.submitted}
              rows={isImageMode ? 3 : 5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-blue-400 disabled:bg-slate-100"
              placeholder="Viết cách làm của em trước. Hệ thống chỉ hiện lời giải sau khi em nộp."
            />
          </label>

          {isImageMode && (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-4 text-center text-sm font-black text-blue-700 transition hover:bg-blue-100">
                <Camera className="h-5 w-5" /> Chụp/tải ảnh bài làm viết tay
                <input type="file" accept="image/*" capture="environment" onChange={onImageChange} className="hidden" disabled={state.submitted} />
              </label>
              {state.imagePreviewUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={state.imagePreviewUrl} alt={state.imageName || 'Ảnh bài làm'} className="max-h-64 w-full object-contain" />
                </div>
              )}
              {state.imageName && <p className="mt-2 text-xs font-bold text-slate-500"><UploadCloud className="mr-1 inline h-3 w-3" />{state.imageName}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              onClick={onRevealHint}
              disabled={state.submitted || !hasStarted || !canShowTimedHint}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lightbulb className="h-4 w-4" /> {canShowTimedHint ? 'Xem gợi ý' : `Gợi ý mở sau ${formatDuration(Math.max(0, hintDelaySeconds - elapsedSeconds))}`}
            </button>
            <button
              onClick={onSubmit}
              disabled={!hasResponse || state.submitted}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <Send className="h-4 w-4" /> Nộp để xem lời giải
            </button>
          </div>

          {!shouldShowHint && !state.submitted && (
            <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs font-bold text-slate-500">
              Em hãy tự thử trước. Gợi ý sẽ tự mở khi hết thời gian chờ, lúc đó em mới có thể bấm xem gợi ý.
            </p>
          )}

          {shouldShowHint && !state.submitted && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-amber-600">Gợi ý</p>
              <ul className="list-disc space-y-2 pl-4">
                {hints.map(hint => <li key={hint}><MathBlock className="text-amber-900">{hint}</MathBlock></li>)}
              </ul>
            </div>
          )}

          {state.submitted && (
            <div className="space-y-3 rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-green-700"><CheckCircle2 className="h-4 w-4" /> Đã nộp sau {formatDuration(state.durationSeconds || elapsedSeconds)}</p>
              <div>
                <p className="text-sm font-black text-slate-800">Lời giải chuẩn</p>
                <MathBlock className="mt-2 text-slate-700">{example.solution}</MathBlock>
              </div>
              <div>
                <p className="text-sm font-black text-blue-800">Chữa/gợi ý đối chiếu</p>
                <MathBlock className="mt-2 text-blue-800">{example.explanation}</MathBlock>
              </div>
              {isImageMode && (
                <div className="rounded-2xl border border-purple-100 bg-white p-4">
                  <button
                    onClick={onGradeImage}
                    disabled={state.isGrading || !state.imageBase64}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-fit"
                  >
                    <Sparkles className="h-4 w-4" /> {state.isGrading ? 'AI đang chấm ảnh...' : 'Nhờ AI chấm ảnh tham khảo'}
                  </button>
                  {state.imageDownloadUrl && (
                    <a href={state.imageDownloadUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-2xl bg-blue-50 p-3 text-xs font-black text-blue-700 underline">
                      Ảnh gốc đã lưu để giáo viên phúc khảo
                    </a>
                  )}
                  {state.aiFeedback && <MathBlock className="mt-3 rounded-2xl bg-purple-50 p-3 text-purple-900">{state.aiFeedback}</MathBlock>}
                </div>
              )}
            </div>
          )}

          {state.gradingError && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{state.gradingError}</p>}
        </div>
      )}
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
  timer,
}: {
  title: string;
  description: string;
  questions: AdaptiveLesson['diagnosticTest']['questions'];
  answers: Record<string, string>;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: () => void;
  timer?: {
    plannedSeconds: number;
    elapsedSeconds: number;
    remainingSeconds: number;
  };
}) => (
  <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {timer && <SectionTimer {...timer} />}
    </div>
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-bold text-slate-800">
            Câu {index + 1}. <MathBlock className="mt-1 text-slate-800">{question.prompt}</MathBlock>
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

const SectionTimer = ({ plannedSeconds, elapsedSeconds, remainingSeconds, compact = false }: { plannedSeconds: number; elapsedSeconds: number; remainingSeconds: number; compact?: boolean }) => {
  const isOvertime = remainingSeconds <= 0;
  return (
    <div className={cn(
      'rounded-2xl border px-4 py-3 text-sm font-black',
      isOvertime ? 'border-red-100 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-700',
      compact && 'px-3 py-2 text-xs'
    )}>
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4" />
        <span>{isOvertime ? 'Quá giờ' : 'Còn lại'}: {formatDuration(remainingSeconds)}</span>
      </div>
      {!compact && (
        <p className="mt-1 text-xs font-bold opacity-75">Đã dùng {formatDuration(elapsedSeconds)} / dự kiến {formatDuration(plannedSeconds)}</p>
      )}
    </div>
  );
};

const TaskPanel = ({ title, tasks = [], tone }: { title: string; tasks?: AdaptiveLesson['knowledgeUnits'][number]['supportTasks']; tone: 'blue' | 'amber' | 'purple' }) => {
  const toneClass = {
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    purple: 'border-purple-100 bg-purple-50 text-purple-800',
  }[tone];

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <p className="text-xs font-black uppercase tracking-wide">{title}</p>
      <div className="mt-3 space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="rounded-xl bg-white/70 p-3 text-sm font-semibold leading-6">
            <MathText>{task.prompt}</MathText>
            {task.hints.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-bold opacity-80">
                {task.hints.slice(0, 2).map(hint => <li key={hint}><MathText>{hint}</MathText></li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

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
