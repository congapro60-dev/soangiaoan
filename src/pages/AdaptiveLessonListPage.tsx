import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Edit3, Eye, Trash2, WandSparkles } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { AdaptiveLesson } from '../lib/adaptive/types';
import type { TeacherClass } from '../types';
import type { ClassDoc } from '../lib/classroom/types';
import { LiveLessonLauncher } from '../components/liveLesson/LiveLessonLauncher';
import { buildPilotAdaptiveLesson } from '../lib/liveLesson/pilotAdaptiveLesson';
import { getBanToanV4PackageForLesson } from '../lib/liveLesson/v4';
import { publishSequentially, summarizeReports, getAllSourceKeys, type PublicationReport } from '../lib/liveLesson/v4/sequentialPublication';
import { deleteLessonFromFirestore, listLessonsForTeacher, saveLessonToFirestore } from '../services/adaptiveLessonService';

export const resolveAdaptiveBuilderUrl = (lessonId: string): string => `/adaptive-builder/${encodeURIComponent(lessonId)}`;
export const resolveAdaptivePortalUrl = (lessonId: string): string => `/adaptive-portal/${encodeURIComponent(lessonId)}`;
export const getDeleteLessonConfirmation = (title: string): string => `Xóa bài học "${title.trim() || 'chưa đặt tên'}"? Thao tác này không thể hoàn tác.`;
export const shouldShowLiveLessonAction = (lesson: Pick<AdaptiveLesson, 'status'> & Partial<Pick<AdaptiveLesson, 'id' | 'grade' | 'curriculumRef'>>): boolean => {
  if (lesson.status !== 'published') return false;
  // Preserve the legacy helper contract for callers that only pass status.
  if (!lesson.id) return true;
  return lesson.id === 'tds-g10-30-pilot' || Boolean(getBanToanV4PackageForLesson(lesson));
};

const statusLabel: Record<AdaptiveLesson['status'], string> = {
  draft: 'Nháp',
  published: 'Đã xuất bản',
  archived: 'Đã lưu trữ',
};

const statusClass: Record<AdaptiveLesson['status'], string> = {
  draft: 'border-amber-100 bg-amber-50 text-amber-700',
  published: 'border-green-100 bg-green-50 text-green-700',
  archived: 'border-slate-100 bg-slate-50 text-slate-500',
};

interface AdaptiveLessonListPageProps {
  embedded?: boolean;
  onCreateLesson?: () => void;
  onOpenLesson?: (lessonId: string) => void;
  onPreviewLesson?: (lessonId: string) => void;
  onOpenLiveLesson?: (lesson: AdaptiveLesson) => void;
  classes?: Array<ClassDoc | TeacherClass>;
  onOpenLearnerStats?: () => void;
}

export const AdaptiveLessonListPage = ({ embedded = false, onCreateLesson, onOpenLesson, onPreviewLesson, onOpenLiveLesson, classes, onOpenLearnerStats }: AdaptiveLessonListPageProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [lessons, setLessons] = useState<AdaptiveLesson[]>([]);
  const [internalLiveLesson, setInternalLiveLesson] = useState<AdaptiveLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingPilot, setSeedingPilot] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [sequentialPublishing, setSequentialPublishing] = useState(false);
  const [sequentialProgress, setSequentialProgress] = useState<{ current: number; total: number; currentKey: string } | null>(null);
  const [sequentialResult, setSequentialResult] = useState<PublicationReport[] | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLessons([]);
          setError('Bạn cần đăng nhập để quản lý bài học phân hoá.');
          return;
        }
        const data = await listLessonsForTeacher(currentUser.uid);
        setLessons(data.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
      } catch (loadError) {
        console.error('Không tải được danh sách bài học adaptive', loadError);
        setError('Không tải được danh sách bài học phân hoá từ Firestore.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.uid]);

  const handleDelete = async (lessonId: string) => {
    const lesson = lessons.find(item => item.id === lessonId);
    if (!lesson || !window.confirm(getDeleteLessonConfirmation(lesson.title))) return;
    setDeletingId(lessonId);
    setError(null);
    try {
      await deleteLessonFromFirestore(lessonId);
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
    } catch (deleteError) {
      console.error('Không xóa được bài học adaptive', deleteError);
      setError('Không xóa được bài học phân hoá.');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    if (onCreateLesson) onCreateLesson();
    else navigate(resolveAdaptiveBuilderUrl('new'));
  };

  const hasPilotLesson = lessons.some(lesson => lesson.id === 'tds-g10-30-pilot' && lesson.status === 'published');

  const handleSeedPilot = async () => {
    const currentUser = auth.currentUser ?? user;
    if (!currentUser) {
      setError('Bạn cần đăng nhập để cài bài demo vào danh sách bài học.');
      return;
    }

    setSeedingPilot(true);
    setError(null);
    setSeedMessage(null);
    try {
      const pilotLesson = buildPilotAdaptiveLesson(currentUser.uid);
      await saveLessonToFirestore(pilotLesson);
      setLessons(previous => [
        ...previous.filter(lesson => lesson.id !== pilotLesson.id),
        pilotLesson,
      ].sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || '')));
      setSeedMessage('Đã cài bài demo G10 P31. Bài đã xuất bản và có thể mở cổng học sinh hoặc tiết trực tiếp.');
    } catch (seedError) {
      console.error('Không cài được bài demo G10 P31', seedError);
      const detail = seedError instanceof Error ? ` ${seedError.message}` : '';
      setError(`Không cài được bài demo vào Firestore.${detail}`);
    } finally {
      setSeedingPilot(false);
    }
  };

  const handleSequentialPublish = async () => {
    const currentUser = auth.currentUser ?? user;
    if (!currentUser) {
      setError('Bạn cần đăng nhập để xuất bản các gói V4.');
      return;
    }

    setSequentialPublishing(true);
    setError(null);
    setSequentialResult(null);

    try {
      // Build index of existing lessons by sourceKey
      const existingLessons = new Map<string, AdaptiveLesson>();
      for (const lesson of lessons) {
        const binding = getBanToanV4PackageForLesson(lesson);
        if (binding) {
          existingLessons.set(binding.sourceKey, lesson);
        }
      }

      const sourceKeys = getAllSourceKeys();
      setSequentialProgress({ current: 0, total: sourceKeys.length, currentKey: '' });
      const reports: PublicationReport[] = [];

      // Publish sequentially with progress updates
      for (let i = 0; i < sourceKeys.length; i++) {
        const key = sourceKeys[i];
        setSequentialProgress({ current: i, total: sourceKeys.length, currentKey: key });

        // Build the set with just this one key to process
        const batchResult = await publishSequentially({
          existingLessons,
          teacherId: currentUser.uid,
          save: async (lesson) => {
            await saveLessonToFirestore(lesson);
            // Update local state only if lesson changed
            setLessons((prev) => {
              const idx = prev.findIndex((l) => l.id === lesson.id);
              if (idx >= 0) {
                const next = [...prev];
                const existing = next[idx];
                // Only update if status or key fields differ
                if (
                  existing.status !== lesson.status ||
                  existing.curriculumRef?.lessonCode !== lesson.curriculumRef?.lessonCode
                ) {
                  next[idx] = lesson;
                  return next.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
                }
                return prev;
              }
              // Only add if not already in list
              const alreadyExists = prev.some((l) => l.id === lesson.id);
              if (!alreadyExists) {
                return [...prev, lesson].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
              }
              return prev;
            });
            // Update existingLessons map for subsequent iterations
            existingLessons.set(key, lesson);
          },
          sourceKeys: [key],
        });

        reports.push(...batchResult);
        setSequentialResult([...reports]);
      }

      setSequentialProgress({ current: sourceKeys.length, total: sourceKeys.length, currentKey: '' });
      const stats = summarizeReports(reports);
      setSeedMessage(
        `Xuất bản tuần tự xong: ${stats.published} xuất bản, ${stats.skipped} bỏ qua, ${stats.failed} audit fail, ${stats.errors} lỗi.`,
      );
    } catch (publishError) {
      console.error('Lỗi xuất bản tuần tự', publishError);
      const detail = publishError instanceof Error ? ` ${publishError.message}` : '';
      setError(`Xuất bản tuần tự bị gián đoạn.${detail}`);
    } finally {
      setSequentialPublishing(false);
    }
  };

  const openLesson = (lessonId: string) => {
    if (onOpenLesson) onOpenLesson(lessonId);
    else navigate(resolveAdaptiveBuilderUrl(lessonId));
  };

  const previewLesson = (lessonId: string) => {
    if (onPreviewLesson) onPreviewLesson(lessonId);
    else navigate(resolveAdaptivePortalUrl(lessonId));
  };

  const openLiveLesson = (lesson: AdaptiveLesson) => {
    if (!shouldShowLiveLessonAction(lesson)) return;
    if (onOpenLiveLesson) onOpenLiveLesson(lesson);
    else setInternalLiveLesson(lesson);
  };

  return (
    <div className={embedded ? 'text-slate-900' : 'min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8'}>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">Bài học phân hoá</p>
              <h1 className="mt-2 text-3xl font-black">Quản lý bài học phân hoá</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-50">Tạo bài học từ giáo án phân hoá đã soạn hoặc tải giáo án lên, sau đó mở giao diện học sinh để phát bài.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {onOpenLearnerStats && (
                <button onClick={onOpenLearnerStats} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/10 backdrop-blur transition hover:bg-white/25">
                  <BarChart3 className="h-4 w-4" /> Thống kê người học
                </button>
              )}
              <button disabled={hasPilotLesson || seedingPilot || !user} onClick={() => void handleSeedPilot()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/10 backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60">
                <WandSparkles className="h-4 w-4" /> {seedingPilot ? 'Đang cài bài demo...' : hasPilotLesson ? 'Đã có bài demo G10 P31' : 'Cài bài demo G10 P31'}
              </button>
              <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-blue-900/10 transition hover:bg-blue-50">
                <WandSparkles className="h-4 w-4" /> Tạo từ giáo án nguồn
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
        {seedMessage && <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{seedMessage}</div>}

        <section className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">V4 · Ban Toán W5–W6</p>
              <h2 className="mt-1 text-xl font-black text-indigo-950">48 gói bài học phân hoá</h2>
              <p className="mt-1 text-sm font-semibold text-indigo-800">Nguồn Ban Toán Khối 10–12, Tuần 5–6. Tạo và xuất bản tuần tự từng bài, cập nhật bảng bài ngay sau mỗi lần.</p>
            </div>
            <button disabled={sequentialPublishing || !user} onClick={() => void handleSequentialPublish()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><WandSparkles className="h-4 w-4" /> {sequentialPublishing ? `Đang xuất bản ${sequentialProgress?.current ?? 0}/${sequentialProgress?.total ?? 48}...` : 'Tạo và xuất bản 48 bài'}</button>
          </div>
          {sequentialProgress && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center justify-between text-sm font-bold text-emerald-800">
                <span>Tiến độ xuất bản: {sequentialProgress.current}/{sequentialProgress.total}</span>
                {sequentialProgress.currentKey && <span className="text-xs text-emerald-600">{sequentialProgress.currentKey}</span>}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(sequentialProgress.current / sequentialProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          {sequentialResult && (() => {
            const stats = summarizeReports(sequentialResult);
            return (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"><p className="text-2xl font-black text-emerald-700">{stats.published}</p><p className="text-xs font-bold text-emerald-600">Xuất bản</p></div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center"><p className="text-2xl font-black text-blue-700">{stats.skipped}</p><p className="text-xs font-bold text-blue-600">Bỏ qua</p></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center"><p className="text-2xl font-black text-amber-700">{stats.failed}</p><p className="text-xs font-bold text-amber-600">Audit fail</p></div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center"><p className="text-2xl font-black text-red-700">{stats.errors}</p><p className="text-xs font-bold text-red-600">Lỗi</p></div>
              </div>
            );
          })()}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Đang tải danh sách bài học...</div>
          ) : lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <h2 className="text-lg font-black text-slate-800">Chưa có bài học phân hoá</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Bắt đầu bằng cách chọn giáo án đã soạn hoặc tải giáo án lên để AI rà soát và chuyển thành bài học phân hoá.</p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <button disabled={seedingPilot || !user} onClick={() => void handleSeedPilot()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <WandSparkles className="h-4 w-4" /> {seedingPilot ? 'Đang cài bài demo...' : 'Cài bài demo G10 P31'}
                </button>
                <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
                  <WandSparkles className="h-4 w-4" /> Tạo từ giáo án nguồn
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bài học</th>
                    <th className="px-4 py-3">Lớp</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lessons.map(lesson => (
                    <tr key={lesson.id} onClick={() => openLesson(lesson.id)} className="cursor-pointer bg-white align-top transition hover:bg-blue-50/40">
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-800">{lesson.title || 'Bài học chưa đặt tên'}</p>
                        {(() => {
                          const binding = getBanToanV4PackageForLesson(lesson);
                          if (!binding) return <p className="mt-1 text-xs font-semibold text-slate-400">{lesson.id}</p>;
                          return <p className="mt-1 text-xs font-semibold text-slate-400">Lớp {binding.metadata.grade} · Tuần {binding.metadata.week} · Tiết {binding.metadata.period}</p>;
                        })()}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-600">{lesson.grade}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass[lesson.status]}`}>{statusLabel[lesson.status]}</span></td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleString('vi-VN') : '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={(event) => { event.stopPropagation(); openLesson(lesson.id); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Edit3 className="h-3.5 w-3.5" /> Mở bài</button>
                          <button type="button" onClick={(event) => { event.stopPropagation(); previewLesson(lesson.id); }} className="inline-flex items-center gap-1 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"><Eye className="h-3.5 w-3.5" /> Xem cổng</button>
                          {shouldShowLiveLessonAction(lesson) && <button type="button" onClick={(event) => { event.stopPropagation(); openLiveLesson(lesson); }} className="inline-flex items-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"><WandSparkles className="h-3.5 w-3.5" /> Mở tiết trực tiếp</button>}
                          <button type="button" aria-label={`Xóa ${lesson.title || 'bài học'}`} disabled={deletingId === lesson.id} onClick={(event) => { event.stopPropagation(); void handleDelete(lesson.id); }} className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {!onOpenLiveLesson && internalLiveLesson && <LiveLessonLauncher lesson={internalLiveLesson} classes={classes} onClose={() => setInternalLiveLesson(null)} />}
    </div>
  );
};
