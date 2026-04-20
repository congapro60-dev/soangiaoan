import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';
import {
  Plus, Link as LinkIcon, Power, PowerOff, Trash2, Users, Clock,
  Copy, Loader2, FileText, BarChart3, CheckCircle2, X, ChevronRight, History
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppData, Exam, ExamSubmission } from '../../types';
import { useExams } from '../../hooks/useExams';
import { parseMarkdownToQuestions, generateExamCode, calculateMaxScore } from '../../lib/examParser';

interface ExamsTabProps {
  user: User;
  data: AppData;
  showToast: (msg: string, type?: any) => void;
}

interface TestingHistoryEntry {
  id: string;
  timestamp: number;
  mode: 'create' | 'audit' | 'shuffle';
  title: string;
  content: string;
}

const loadTestingHistory = (): TestingHistoryEntry[] => {
  try {
    const raw = localStorage.getItem('testing_history');
    if (!raw) return [];
    const entries: TestingHistoryEntry[] = JSON.parse(raw);
    return entries.filter(e => e.mode === 'create');
  } catch { return []; }
};

export const ExamsTab = ({ user, data, showToast }: ExamsTabProps) => {
  const { exams, loading, saveExam, deleteExam, toggleActive, getSubmissions } = useExams(user);
  const [creating, setCreating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => {
    if (!selectedExam) { setSubmissions([]); return; }
    setLoadingSubs(true);
    getSubmissions(selectedExam.id)
      .then(setSubmissions)
      .finally(() => setLoadingSubs(false));
  }, [selectedExam, getSubmissions]);

  const handleCreateFromHistory = async () => {
    const history = loadTestingHistory();
    if (history.length === 0) {
      showToast('Chưa có đề nào trong lịch sử "Soạn đề". Hãy vào tab Bảng Kiểm tra để tạo trước.', 'warning');
      return;
    }

    const options = history.reduce<Record<string, string>>((acc, h) => {
      acc[h.id] = h.title;
      return acc;
    }, {});

    const { value: selectedId } = await Swal.fire({
      title: 'Chọn đề đã soạn',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: '-- Chọn đề --',
      showCancelButton: true,
      confirmButtonText: 'Tiếp tục',
      cancelButtonText: 'Hủy',
    });
    if (!selectedId) return;

    const entry = history.find(h => h.id === selectedId);
    if (!entry) return;

    const { value: formValues } = await Swal.fire({
      title: 'Thông tin đề thi',
      html: `
        <input id="e-title" class="swal2-input" placeholder="Tiêu đề" value="${entry.title.replace(/"/g, '&quot;')}">
        <select id="e-subject" class="swal2-input">${data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
        <input id="e-grade" class="swal2-input" placeholder="Khối (VD: 10)" value="10">
        <input id="e-duration" class="swal2-input" type="number" placeholder="Thời gian (phút)" value="45">
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-top:8px;">
          <input id="e-shuffle" type="checkbox"> Đảo thứ tự câu hỏi
        </label>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;">
          <input id="e-review" type="checkbox" checked> Cho xem đáp án sau khi nộp
        </label>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'AI phân tích & Lưu',
      cancelButtonText: 'Hủy',
      preConfirm: () => ({
        title: (document.getElementById('e-title') as HTMLInputElement).value,
        subjectId: (document.getElementById('e-subject') as HTMLSelectElement).value,
        grade: (document.getElementById('e-grade') as HTMLInputElement).value,
        duration: parseInt((document.getElementById('e-duration') as HTMLInputElement).value) || 45,
        shuffle: (document.getElementById('e-shuffle') as HTMLInputElement).checked,
        review: (document.getElementById('e-review') as HTMLInputElement).checked,
      }),
    });
    if (!formValues || !formValues.title) return;

    setCreating(true);
    try {
      const questions = await parseMarkdownToQuestions(entry.content, data.settings);
      const now = new Date().toISOString();
      const exam: Exam = {
        id: `exam-${Date.now()}`,
        code: generateExamCode(),
        title: formValues.title,
        subjectId: formValues.subjectId,
        grade: formValues.grade,
        teacherId: user.uid,
        teacherName: data.authorName || user.displayName || 'Giáo viên',
        questions,
        durationMinutes: formValues.duration,
        maxScore: calculateMaxScore(questions),
        isActive: false,
        allowReview: formValues.review,
        shuffleQuestions: formValues.shuffle,
        createdAt: now,
        updatedAt: now,
      };
      await saveExam(exam);
      showToast(`Đã tạo đề "${exam.title}" với ${questions.length} câu hỏi!`);
    } catch (err: any) {
      showToast(`Lỗi tạo đề: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/exam/${code}`;
    navigator.clipboard.writeText(url);
    showToast(`Đã sao chép liên kết: ${url}`);
  };

  const confirmDelete = async (exam: Exam) => {
    const res = await Swal.fire({
      title: 'Xóa đề thi?',
      text: `Đề "${exam.title}" và toàn bộ dữ liệu liên quan sẽ bị xóa.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#dc2626',
    });
    if (res.isConfirmed) {
      await deleteExam(exam.id);
      if (selectedExam?.id === exam.id) setSelectedExam(null);
      showToast('Đã xóa đề thi.');
    }
  };

  if (selectedExam) {
    return (
      <ExamDetail
        exam={selectedExam}
        submissions={submissions}
        loading={loadingSubs}
        onBack={() => setSelectedExam(null)}
        onCopy={() => copyLink(selectedExam.code)}
        onToggle={async () => {
          await toggleActive(selectedExam.id, !selectedExam.isActive);
          setSelectedExam({ ...selectedExam, isActive: !selectedExam.isActive });
          showToast(selectedExam.isActive ? 'Đã tắt phát hành.' : 'Đã phát hành đề!');
        }}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Thi online</h1>
          <p className="text-sm text-slate-500 mt-1">Phát hành đề cho học sinh làm bài trực tuyến, hệ thống tự chấm.</p>
        </div>
        <button
          onClick={handleCreateFromHistory}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? 'AI đang phân tích...' : 'Tạo đề từ Bảng Kiểm tra'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="font-black text-slate-800 text-lg">Chưa có đề thi nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Hãy vào tab <strong>Bảng Kiểm tra</strong> để soạn đề bằng AI trước, sau đó quay lại đây để phát hành đề.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {exams.map(exam => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-lg transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${exam.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <FileText className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800 truncate">{exam.title}</h3>
                  {exam.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang mở
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 uppercase tracking-wider">Nháp</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-bold text-blue-600">#{exam.code}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{exam.questions.length} câu</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.durationMinutes} phút</span>
                  <span>Điểm: {exam.maxScore}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => copyLink(exam.code)} className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg" title="Copy link">
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await toggleActive(exam.id, !exam.isActive);
                    showToast(exam.isActive ? 'Đã tắt phát hành.' : 'Đã phát hành đề!');
                  }}
                  className={`p-2 rounded-lg ${exam.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                  title={exam.isActive ? 'Tắt phát hành' : 'Phát hành'}
                >
                  {exam.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setSelectedExam(exam)} className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                  <BarChart3 className="w-3.5 h-3.5" /> Kết quả <ChevronRight className="w-3 h-3" />
                </button>
                <button onClick={() => confirmDelete(exam)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Xóa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface ExamDetailProps {
  exam: Exam;
  submissions: ExamSubmission[];
  loading: boolean;
  onBack: () => void;
  onCopy: () => void;
  onToggle: () => void;
}

const ExamDetail = ({ exam, submissions, loading, onBack, onCopy, onToggle }: ExamDetailProps) => {
  const completed = submissions.filter(s => s.status !== 'in_progress');
  const avgScore = completed.length > 0
    ? (completed.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completed.length).toFixed(2)
    : '—';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        ← Quay lại
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800">{exam.title}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
              <span className="font-mono font-bold text-blue-600 text-base">#{exam.code}</span>
              <span>{exam.questions.length} câu</span>
              <span>{exam.durationMinutes} phút</span>
              <span>Tổng {exam.maxScore} điểm</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCopy} className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold">
              <Copy className="w-3.5 h-3.5" /> Copy link
            </button>
            <button
              onClick={onToggle}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${exam.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {exam.isActive ? <><X className="w-3.5 h-3.5" /> Tắt phát hành</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Phát hành</>}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={<Users className="w-5 h-5" />} label="Lượt làm" value={submissions.length.toString()} color="text-blue-600 bg-blue-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Đã nộp" value={completed.length.toString()} color="text-emerald-600 bg-emerald-50" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Điểm TB" value={avgScore} color="text-purple-600 bg-purple-50" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <h3 className="font-bold text-slate-800 px-6 py-4 border-b border-slate-50">Bài làm học sinh</h3>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : submissions.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">Chưa có học sinh nào làm bài.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3 font-bold">Họ tên</th>
                <th className="text-left px-6 py-3 font-bold">Lớp</th>
                <th className="text-left px-6 py-3 font-bold">Bắt đầu</th>
                <th className="text-left px-6 py-3 font-bold">Trạng thái</th>
                <th className="text-right px-6 py-3 font-bold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-medium text-slate-800">{s.studentName}</td>
                  <td className="px-6 py-3 text-slate-500">{s.studentClass || '—'}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{new Date(s.startedAt).toLocaleString('vi-VN')}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      s.status === 'submitted' ? 'bg-emerald-100 text-emerald-700'
                        : s.status === 'graded' ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {s.status === 'submitted' ? 'Đã nộp' : s.status === 'graded' ? 'Đã chấm' : 'Đang làm'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-800">
                    {s.totalScore !== undefined ? `${s.totalScore.toFixed(2)} / ${s.maxScore}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>{icon}</div>
    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
  </div>
);
