import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { AdaptiveLesson } from '../lib/adaptive/types';
import { deleteLessonFromFirestore, listLessonsForTeacher } from '../services/adaptiveLessonService';

export const resolveAdaptiveBuilderUrl = (lessonId: string): string => `/adaptive-builder/${encodeURIComponent(lessonId)}`;
export const resolveAdaptivePortalUrl = (lessonId: string): string => `/adaptive-portal/${encodeURIComponent(lessonId)}`;

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

export const AdaptiveLessonListPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [lessons, setLessons] = useState<AdaptiveLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!window.confirm('Xóa bài học phân hoá này? Thao tác này không thể hoàn tác.')) return;
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">Bài học phân hoá</p>
              <h1 className="mt-2 text-3xl font-black">Quản lý bài học phân hoá</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-50">Tạo, chỉnh sửa, xuất bản và mở cổng học sinh cho các bài học phân hoá lưu trên Firestore.</p>
            </div>
            <button onClick={() => navigate(resolveAdaptiveBuilderUrl('new'))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-blue-900/10 transition hover:bg-blue-50">
              <Plus className="h-4 w-4" /> Tạo bài mới
            </button>
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Đang tải danh sách bài học...</div>
          ) : !error && lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <h2 className="text-lg font-black text-slate-800">Chưa có bài học phân hoá</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Bắt đầu bằng một bản nháp mới, sau đó xuất bản để học sinh truy cập.</p>
              <button onClick={() => navigate(resolveAdaptiveBuilderUrl('new'))} className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Tạo bài mới
              </button>
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
                    <tr key={lesson.id} className="bg-white align-top">
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-800">{lesson.title || 'Bài học chưa đặt tên'}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{lesson.id}</p>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-600">{lesson.grade}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass[lesson.status]}`}>{statusLabel[lesson.status]}</span></td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleString('vi-VN') : '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => navigate(resolveAdaptiveBuilderUrl(lesson.id))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Edit3 className="h-3.5 w-3.5" /> Sửa</button>
                          <button type="button" onClick={() => navigate(resolveAdaptivePortalUrl(lesson.id))} className="inline-flex items-center gap-1 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"><Eye className="h-3.5 w-3.5" /> Xem</button>
                          <button disabled={deletingId === lesson.id} onClick={() => void handleDelete(lesson.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
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
    </div>
  );
};
