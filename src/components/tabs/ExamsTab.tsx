import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, Link as LinkIcon, Power, PowerOff, Trash2, Users, Clock,
  Copy, Loader2, FileText, BarChart3, CheckCircle2, X, ChevronRight,
  History, Download, Brain, RefreshCw, Upload, QrCode, ArrowRight,
  Edit3, AlertTriangle, Pencil,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppData, Exam, ExamSubmission, ExamQuestion, StudentAnswer } from '../../types';
import { useExams, updateSubmission, updateExam, getSubmissions } from '../../hooks/useExams';
import { computeAutoScore, recalcTotalScore } from '../../utils/examScoring';
import { generateExamCode, calculateMaxScore } from '../../lib/examParser';
import { parseMarkdownToOnlineExam } from '../../utils/examOnlineParser';
import { callAI, getActiveApiKey } from '../../lib/aiProviders';
import { parseLooseJson } from '../../utils/jsonRepair';
import { ImportExamModal } from '../features/testing/ImportExamModal';
import { ExamEditorView } from '../features/testing/ExamEditorView';

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

const buildEssayGradingPrompt = (question: ExamQuestion, answer: string): string => `
BẠN LÀ GIÁO VIÊN CHẤM BÀI CHUYÊN NGHIỆP.
NHIỆM VỤ: Chấm điểm câu tự luận sau đây.

CÂU HỎI (${question.points} điểm):
${question.content}

${question.explanation ? `GỢI Ý ĐÁP ÁN:\n${question.explanation}\n` : ''}
BÀI LÀM HỌC SINH:
${answer || '(bỏ trống)'}

YÊU CẦU:
- Chấm điểm từ 0 đến ${question.points}, có thể cho điểm lẻ 0.25
- Nhận xét ngắn gọn (1-2 câu) bằng tiếng Việt

CHỈ TRẢ VỀ JSON THUẦN:
{"score": 0.0, "feedback": "Nhận xét..."}
`.trim();

const gradeEssays = async (
  exam: Exam,
  submission: ExamSubmission,
  settings: AppData['settings']
): Promise<ExamSubmission> => {
  const updatedAnswers: StudentAnswer[] = [...submission.answers];

  for (let i = 0; i < updatedAnswers.length; i++) {
    const ans = updatedAnswers[i];
    const question = exam.questions.find(q => q.id === ans.questionId);
    if (!question || question.type !== 'essay') continue;
    if (ans.aiScore !== undefined) continue;

    const prompt = buildEssayGradingPrompt(question, ans.answer);
    const raw = await callAI(prompt, settings);

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = parseLooseJson(jsonMatch[0]);
        const score = Math.min(question.points, Math.max(0, Number(parsed.score) || 0));
        updatedAnswers[i] = { ...ans, aiScore: score, aiFeedback: parsed.feedback || '' };
      }
    } catch {
      updatedAnswers[i] = { ...ans, aiScore: 0, aiFeedback: 'AI không chấm được câu này.' };
    }
  }

  const totalScore = updatedAnswers.reduce((sum, a) => {
    if (a.autoScore !== undefined) return sum + a.autoScore;
    if (a.aiScore !== undefined) return sum + a.aiScore;
    return sum;
  }, 0);

  const hasUngraded = updatedAnswers.some(a => {
    const q = exam.questions.find(q => q.id === a.questionId);
    return q?.type === 'essay' && a.aiScore === undefined;
  });

  return {
    ...submission,
    answers: updatedAnswers,
    totalScore: Math.round(totalScore * 100) / 100,
    status: hasUngraded ? 'submitted' : 'graded',
  };
};

const exportToExcel = (exam: Exam, submissions: ExamSubmission[]) => {
  const completed = submissions.filter(s => s.status !== 'in_progress');

  const rows = completed.map((s, idx) => ({
    'STT': idx + 1,
    'Họ và tên': s.studentName,
    'Lớp': s.studentClass || '',
    'Bắt đầu': new Date(s.startedAt).toLocaleString('vi-VN'),
    'Nộp lúc': s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : '',
    'Trạng thái': s.status === 'graded' ? 'Đã chấm' : 'Đã nộp',
    'Điểm': s.totalScore !== undefined ? s.totalScore.toFixed(2) : '',
    'Tổng điểm': s.maxScore,
    'Đổi tab': s.tabSwitches || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 20 },
    { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
  XLSX.writeFile(wb, `KetQua_${exam.title}_${exam.code}.xlsx`);
};

// ─────────────────────────────────────────────
type CreateView = 'picker' | 'editor' | null;

export const ExamsTab = ({ user, data, showToast }: ExamsTabProps) => {
  const { exams, loading, saveExam, deleteExam, toggleActive, fetchMyExams } = useExams(user);
  const [creating, setCreating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [createView, setCreateView] = useState<CreateView>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'draft'>('all');

  const subjectNameById = useMemo(() => {
    return Object.fromEntries(data.subjects.map(subject => [subject.id, subject.name]));
  }, [data.subjects]);

  const visibleExams = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const now = Date.now();

    return exams
      .filter(exam => {
        const startsAt = exam.startAt ? new Date(exam.startAt).getTime() : null;
        const isScheduled = !exam.isActive && startsAt !== null && startsAt > now;
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'active' && exam.isActive)
          || (statusFilter === 'scheduled' && isScheduled)
          || (statusFilter === 'draft' && !exam.isActive && !isScheduled);

        if (!matchesStatus) return false;
        if (!keyword) return true;

        const subjectName = subjectNameById[exam.subjectId] || '';
        return [exam.title, exam.code, exam.grade, subjectName]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [exams, searchTerm, statusFilter, subjectNameById]);

  const activeExamCount = exams.filter(exam => exam.isActive).length;
  const scheduledExamCount = exams.filter(exam => !exam.isActive && exam.startAt && new Date(exam.startAt).getTime() > Date.now()).length;
  const draftExamCount = exams.length - activeExamCount - scheduledExamCount;
  const missingApiKey = !getActiveApiKey(data.settings);

  const reloadSubmissions = useCallback(async (exam: Exam) => {
    setLoadingSubs(true);
    try {
      const subs = await getSubmissions(exam.id);
      setSubmissions(subs);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedExam) { setSubmissions([]); return; }
    reloadSubmissions(selectedExam);
  }, [selectedExam, reloadSubmissions]);

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
      const questions = await parseMarkdownToOnlineExam(entry.content, data.settings);
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

  const [pageImages, setPageImages] = useState<string[]>([]);

  const handleImportExam = async (questions: ExamQuestion[], title: string, imgs?: string[]) => {
    if (imgs) setPageImages(imgs);
    const { value: formValues } = await Swal.fire({
      title: 'Thông tin phòng thi',
      html: `
        <input id="e-title" class="swal2-input" placeholder="Tiêu đề" value="${title.replace(/"/g, '&quot;')}">
        <select id="e-subject" class="swal2-input">${data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
        <input id="e-grade" class="swal2-input" placeholder="Khối (VD: 12)" value="12">
        <input id="e-duration" class="swal2-input" type="number" placeholder="Thời gian (phút)" value="90">
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-top:8px;">
          <input id="e-shuffle" type="checkbox"> Đảo thứ tự câu hỏi
        </label>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;">
          <input id="e-review" type="checkbox" checked> Cho xem đáp án sau khi nộp
        </label>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tạo phòng thi',
      cancelButtonText: 'Hủy',
      preConfirm: () => ({
        title: (document.getElementById('e-title') as HTMLInputElement).value,
        subjectId: (document.getElementById('e-subject') as HTMLSelectElement).value,
        grade: (document.getElementById('e-grade') as HTMLInputElement).value,
        duration: parseInt((document.getElementById('e-duration') as HTMLInputElement).value) || 90,
        shuffle: (document.getElementById('e-shuffle') as HTMLInputElement).checked,
        review: (document.getElementById('e-review') as HTMLInputElement).checked,
      }),
    });
    if (!formValues || !formValues.title) return;

    setCreating(true);
    try {
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
        maxScore: questions.reduce((s, q) => s + (q.points ?? 0), 0),
        isActive: false,
        allowReview: formValues.review,
        shuffleQuestions: formValues.shuffle,
        createdAt: now,
        updatedAt: now,
      };
      await saveExam(exam);
      showToast(`Đã tạo đề "${exam.title}" với ${questions.length} câu hỏi!`, 'success');
    } catch (err: any) {
      showToast(`Lỗi tạo đề: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/exam/${code}`;
    navigator.clipboard.writeText(url);
    showToast(`Đã sao chép: ${url}`);
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

  if (createView === 'editor') {
    return (
      <ExamEditorView
        user={user}
        data={data}
        saveExam={saveExam}
        showToast={showToast}
        pageImages={pageImages}
        onBack={() => { setCreateView(null); setPageImages([]); fetchMyExams(); }}
      />
    );
  }

  if (selectedExam) {
    return (
      <ExamDetail
        exam={selectedExam}
        submissions={submissions}
        loading={loadingSubs}
        data={data}
        showToast={showToast}
        onBack={() => setSelectedExam(null)}
        onCopy={() => copyLink(selectedExam.code)}
        onToggle={async () => {
          await toggleActive(selectedExam.id, !selectedExam.isActive);
          setSelectedExam(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
          showToast(selectedExam.isActive ? 'Đã tắt phát hành.' : 'Đã phát hành đề!');
        }}
        onSubmissionsChange={setSubmissions}
        onReload={() => reloadSubmissions(selectedExam)}
        onExamUpdate={e => { setSelectedExam(e); reloadSubmissions(e); }}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6">
      {missingApiKey && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Bạn chưa nhập API Key — AI sẽ dùng key dự phòng, có thể chậm khi phân tích đề hoặc chấm tự luận.</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Nên cấu hình trong Cài đặt</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-[#f9fbff] to-[#eff6ff] shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
              <FileText className="h-3.5 w-3.5" /> Online Exam Center
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Quản lý đề thi online</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Phát hành đề cho học sinh làm bài trực tuyến, theo dõi trạng thái mở đề, chia sẻ mã/QR và xem kết quả tự chấm trong một workspace thống nhất.
            </p>
          </div>
          <div className="grid min-w-[300px] grid-cols-2 gap-3 lg:grid-cols-4">
            <ExamSummaryTile label="Tổng đề" value={exams.length.toString()} tone="blue" />
            <ExamSummaryTile label="Đang mở" value={activeExamCount.toString()} tone="green" />
            <ExamSummaryTile label="Đã lên lịch" value={scheduledExamCount.toString()} tone="amber" />
            <ExamSummaryTile label="Nháp" value={Math.max(0, draftExamCount).toString()} tone="slate" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Danh sách kỳ thi</h2>
            <p className="mt-1 text-sm text-slate-500">Card bento theo trạng thái phát hành, lịch mở đề và mức sẵn sàng chấm bài.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ['all', 'Tất cả'],
                ['active', 'Đang mở'],
                ['scheduled', 'Đã lên lịch'],
                ['draft', 'Nháp'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${statusFilter === key ? 'border-blue-200 bg-blue-600 text-white shadow-sm shadow-blue-100' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Tìm theo tên, mã, môn, khối..."
              />
            </div>
            <button onClick={fetchMyExams} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title="Tải lại">
              <RefreshCw className="w-4 h-4" />
              Tải lại
            </button>
            <button
              onClick={() => setCreateView('picker')}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? 'AI đang phân tích...' : 'Tạo đề mới'}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white py-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Đang tải danh sách kỳ thi...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <History className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Chưa có đề thi nào</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Hãy dùng “Tạo đề mới” để import file, dùng đề đã soạn ở Bảng Kiểm tra hoặc soạn thủ công từng câu.
          </p>
        </div>
      ) : visibleExams.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Không tìm thấy đề phù hợp với “{searchTerm}”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleExams.map((exam, index) => {
            const isPublished = exam.isActive;
            const startsAt = exam.startAt ? new Date(exam.startAt) : null;
            const endsAt = exam.endAt ? new Date(exam.endAt) : null;
            const isScheduled = !isPublished && !!startsAt && startsAt.getTime() > Date.now();
            const isClosed = !isPublished && !!endsAt && endsAt.getTime() < Date.now();
            const statusTone = isPublished
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : isScheduled
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : isClosed
                  ? 'border-red-100 bg-red-50 text-red-600'
                  : 'border-slate-200 bg-slate-100 text-slate-600';
            const accent = isPublished ? 'bg-emerald-500' : isScheduled ? 'bg-amber-400' : isClosed ? 'bg-red-300' : 'bg-slate-300';
            const statusLabel = isPublished ? 'Đang diễn ra' : isScheduled ? 'Đã lên lịch' : isClosed ? 'Đã đóng' : 'Nháp / chờ mở';
            const subjectName = subjectNameById[exam.subjectId] || 'Chưa gán môn';

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.18) }}
                className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(49,130,206,0.12)]"
              >
                <div className={`absolute left-0 top-0 h-1.5 w-full ${accent}`} />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusTone}`}>
                    {isPublished && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {statusLabel}
                  </span>
                  <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={() => copyLink(exam.code)} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title="Copy link">
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => confirmDelete(exam)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mb-3 line-clamp-2 text-xl font-black leading-snug text-slate-900">{exam.title}</h3>
                <div className="mb-6 flex-1 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /><span>{subjectName} • Khối {exam.grade || '—'}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><span>{exam.durationMinutes} phút • {exam.questions.length} câu • {exam.maxScore} điểm</span></div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><span>Mã phòng: <strong className="font-mono text-blue-700">#{exam.code}</strong></span></div>
                  {(startsAt || endsAt) && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      {startsAt ? `Mở: ${startsAt.toLocaleString('vi-VN')}` : 'Chưa đặt giờ mở'}{endsAt ? ` • Đóng: ${endsAt.toLocaleString('vi-VN')}` : ''}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={async () => {
                        await toggleActive(exam.id, !exam.isActive);
                        showToast(exam.isActive ? 'Đã tắt phát hành.' : 'Đã phát hành đề!');
                        fetchMyExams();
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${exam.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {exam.isActive ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                      {exam.isActive ? 'Đang mở' : 'Mở đề'}
                    </button>
                    <button onClick={() => setSelectedExam(exam)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700">
                      <BarChart3 className="h-3.5 w-3.5" /> Xem tiến độ <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showImportModal && (
        <ImportExamModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportExam}
          data={data}
          showToast={showToast}
        />
      )}

      {/* Method picker modal */}
      {createView === 'picker' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCreateView(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-800">Tạo đề thi mới</h3>
              <button onClick={() => setCreateView(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MethodCard
                icon={<Upload className="w-6 h-6" />}
                title="AI từ file"
                desc="Upload PDF / DOCX / ảnh — AI tự parse câu hỏi"
                color="bg-purple-50 text-purple-600"
                onClick={() => { setCreateView(null); setShowImportModal(true); }}
              />
              <MethodCard
                icon={<FileText className="w-6 h-6" />}
                title="Import Excel"
                desc="Nhập đề từ file .xlsx theo mẫu có sẵn"
                color="bg-emerald-50 text-emerald-600"
                onClick={() => { setCreateView(null); setShowImportModal(true); }}
              />
              <MethodCard
                icon={<History className="w-6 h-6" />}
                title="Từ Bảng Kiểm tra"
                desc="Dùng đề đã soạn bằng AI trong tab Bảng KT"
                color="bg-blue-50 text-blue-600"
                onClick={() => { setCreateView(null); handleCreateFromHistory(); }}
              />
              <MethodCard
                icon={<Edit3 className="w-6 h-6" />}
                title="Soạn thủ công"
                desc="Tự nhập từng câu hỏi với đầy đủ loại câu"
                color="bg-amber-50 text-amber-600"
                onClick={() => setCreateView('editor')}
              />
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const ExamSummaryTile = ({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' | 'amber' | 'slate' }) => {
  const toneClass = tone === 'blue'
    ? 'bg-blue-600 text-white shadow-blue-200'
    : tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className={`rounded-2xl border p-4 text-center shadow-sm ${toneClass}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
    </div>
  );
};

// ─────────────────────────────────────────────
interface ExamDetailProps {
  exam: Exam;
  submissions: ExamSubmission[];
  loading: boolean;
  data: AppData;
  showToast: (msg: string, type?: any) => void;
  onBack: () => void;
  onCopy: () => void;
  onToggle: () => void;
  onSubmissionsChange: (subs: ExamSubmission[]) => void;
  onReload: () => void;
  onExamUpdate: (exam: Exam) => void;
}

const ExamDetail = ({
  exam, submissions, loading, data, showToast,
  onBack, onCopy, onToggle, onSubmissionsChange, onReload, onExamUpdate
}: ExamDetailProps) => {
  const navigate = useNavigate();
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'list' | 'stats'>('list');
  const [showQR, setShowQR] = useState(false);
  const [showAnswerEdit, setShowAnswerEdit] = useState(false);

  const completed = submissions.filter(s => s.status !== 'in_progress');
  const avgScore = completed.length > 0
    ? (completed.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completed.length).toFixed(2)
    : '—';
  const hasEssayQuestions = exam.questions.some(q => q.type === 'essay');
  const pendingGrade = submissions.filter(s => s.status === 'submitted');

  const handleGradeOne = async (sub: ExamSubmission) => {
    setGradingId(sub.id);
    try {
      const updated = await gradeEssays(exam, sub, data.settings);
      await updateSubmission(sub.id, {
        answers: updated.answers,
        totalScore: updated.totalScore,
        status: updated.status,
      });
      onSubmissionsChange(submissions.map(s => s.id === sub.id ? updated : s));
      showToast(`Đã chấm xong bài của ${sub.studentName}!`);
    } catch (err: any) {
      showToast(`Lỗi chấm bài: ${err.message}`, 'error');
    } finally {
      setGradingId(null);
    }
  };

  const handleGradeAll = async () => {
    if (pendingGrade.length === 0) {
      showToast('Không có bài nào cần chấm tự luận.', 'warning');
      return;
    }
    const res = await Swal.fire({
      title: `AI chấm ${pendingGrade.length} bài?`,
      text: 'Hệ thống sẽ gọi AI để chấm tất cả các câu tự luận chưa có điểm.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Bắt đầu',
      cancelButtonText: 'Hủy',
    });
    if (!res.isConfirmed) return;

    let updated = [...submissions];
    for (const sub of pendingGrade) {
      setGradingId(sub.id);
      try {
        const result = await gradeEssays(exam, sub, data.settings);
        await updateSubmission(sub.id, {
          answers: result.answers,
          totalScore: result.totalScore,
          status: result.status,
        });
        updated = updated.map(s => s.id === sub.id ? result : s);
        onSubmissionsChange([...updated]);
      } catch (err: any) {
        showToast(`Lỗi bài ${sub.studentName}: ${err.message}`, 'error');
      }
    }
    setGradingId(null);
    showToast('Hoàn thành chấm AI tất cả bài!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        ← Quay lại
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-slate-800">{exam.title}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
              <span className="font-mono font-bold text-blue-600 text-base">#{exam.code}</span>
              <span>{exam.questions.length} câu</span>
              <span>{exam.durationMinutes} phút</span>
              <span>Tổng {exam.maxScore} điểm</span>
              {hasEssayQuestions && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700">Có tự luận</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={onReload} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl" title="Tải lại">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onCopy} className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold">
              <Copy className="w-3.5 h-3.5" /> Copy link
            </button>
            <button onClick={() => setShowAnswerEdit(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold">
              <Pencil className="w-3.5 h-3.5" /> Sửa đáp án
            </button>
            <button onClick={() => setShowQR(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold">
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </button>
            {completed.length > 0 && (
              <button
                onClick={() => exportToExcel(exam, submissions)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Excel
              </button>
            )}
            {hasEssayQuestions && pendingGrade.length > 0 && (
              <button
                onClick={handleGradeAll}
                disabled={gradingId !== null}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-60"
              >
                {gradingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                AI chấm tất cả ({pendingGrade.length})
              </button>
            )}
            {hasEssayQuestions && (
              <button
                onClick={() => navigate(`/exam/${exam.id}/grade`)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
              >
                <FileText className="w-3.5 h-3.5" /> Chấm thủ công
              </button>
            )}
            <button
              onClick={() => navigate(`/exam/${exam.id}/config`)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Cài đặt
            </button>
            <button
              onClick={onToggle}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${exam.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {exam.isActive
                ? <><X className="w-3.5 h-3.5" /> Tắt phát hành</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Phát hành</>}
            </button>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Lượt làm" value={submissions.length.toString()} color="text-blue-600 bg-blue-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Đã nộp" value={completed.length.toString()} color="text-emerald-600 bg-emerald-50" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Điểm TB" value={avgScore} color="text-purple-600 bg-purple-50" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        {(['list', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setDetailTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              detailTab === t ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
            }`}>
            {t === 'list' ? '📋 Bài làm' : '📊 Thống kê'}
          </button>
        ))}
      </div>

      {detailTab === 'list' ? (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Bài làm học sinh</h3>
            {completed.length > 0 && <span className="text-xs text-slate-400">{completed.length} bài đã nộp</span>}
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">Chưa có học sinh nào làm bài.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-6 py-3 font-bold">Họ tên</th>
                    <th className="text-left px-6 py-3 font-bold">Lớp</th>
                    <th className="text-left px-6 py-3 font-bold">Bắt đầu</th>
                    <th className="text-left px-6 py-3 font-bold">Trạng thái</th>
                    <th className="text-right px-6 py-3 font-bold">Điểm</th>
                    <th className="text-center px-4 py-3 font-bold">Vi phạm</th>
                    {hasEssayQuestions && <th className="text-center px-6 py-3 font-bold">AI Chấm</th>}
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
                          s.status === 'graded' ? 'bg-blue-100 text-blue-700'
                            : s.status === 'submitted' ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.status === 'graded' ? 'Đã chấm' : s.status === 'submitted' ? 'Đã nộp' : 'Đang làm'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-800">
                        {s.totalScore !== undefined ? `${s.totalScore.toFixed(2)} / ${s.maxScore}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold">
                        {(() => {
                          const n = s.tabSwitches ?? 0;
                          if (n === 0) return <span className="text-emerald-600">🟢 OK</span>;
                          if (n <= 2) return <span className="text-amber-600">🟡 {n} lần</span>;
                          return <span className="text-red-600">🔴 {n} lần</span>;
                        })()}
                      </td>
                      {hasEssayQuestions && (
                        <td className="px-6 py-3 text-center">
                          {s.status === 'submitted' ? (
                            <button
                              onClick={() => handleGradeOne(s)}
                              disabled={gradingId !== null}
                              className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {gradingId === s.id
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang chấm...</>
                                : <><Brain className="w-3.5 h-3.5" /> AI chấm</>}
                            </button>
                          ) : s.status === 'graded' ? (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Xong
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <ExamStatsPanel exam={exam} submissions={submissions} />
      )}

      {showQR && <QRModal exam={exam} onClose={() => setShowQR(false)} />}
      {showAnswerEdit && (
        <AnswerEditModal
          exam={exam}
          submissions={submissions}
          data={data}
          showToast={showToast}
          onClose={() => setShowAnswerEdit(false)}
          onSaved={updated => {
            setShowAnswerEdit(false);
            onExamUpdate(updated);
          }}
        />
      )}
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

// ─── ExamStatsPanel ───────────────────────────────────────────────────────────

const SCORE_BINS = [
  { label: '0–2',    min: 0,    max: 2,     color: '#ef4444' },
  { label: '2–4',    min: 2,    max: 4,     color: '#f97316' },
  { label: '4–5',    min: 4,    max: 5,     color: '#eab308' },
  { label: '5–6.5',  min: 5,    max: 6.5,   color: '#84cc16' },
  { label: '6.5–8',  min: 6.5,  max: 8,     color: '#22c55e' },
  { label: '8–9',    min: 8,    max: 9,     color: '#0ea5e9' },
  { label: '9–10',   min: 9,    max: 10.01, color: '#6366f1' },
];

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'MCQ',
  true_false: 'Đ/S',
  short_answer: 'Ngắn',
  essay: 'TL',
};

const ExamStatsPanel = ({ exam, submissions }: { exam: Exam; submissions: ExamSubmission[] }) => {
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const completed = submissions.filter(s => s.status !== 'in_progress');

  const bins = useMemo(() => SCORE_BINS.map(b => ({
    ...b,
    count: completed.filter(s => {
      const pct = exam.maxScore > 0 ? ((s.totalScore || 0) / exam.maxScore) * 10 : 0;
      return pct >= b.min && pct < b.max;
    }).length,
  })), [completed, exam.maxScore]);

  const scores = completed.map(s => s.totalScore || 0);
  const hi = scores.length > 0 ? Math.max(...scores) : null;
  const lo = scores.length > 0 ? Math.min(...scores) : null;
  const passRate = completed.length > 0
    ? Math.round((completed.filter(s => exam.maxScore > 0 && (s.totalScore || 0) / exam.maxScore >= 0.5).length / completed.length) * 100)
    : null;

  const questionStats = useMemo(() => exam.questions.map((q, i) => {
    const answers = submissions.map(s => s.answers.find(a => a.questionId === q.id));
    const scorable = answers.filter(a => a?.autoScore !== undefined);
    const correct = scorable.filter(a => a!.autoScore === q.points);
    return {
      id: q.id,
      num: i + 1,
      type: q.type,
      label: q.content.replace(/\$\$?[^$]*\$\$?/g, '[CT]').replace(/[#*`]/g, '').slice(0, 65),
      correctRate: scorable.length > 0 ? correct.length / scorable.length : null,
      avgScore: scorable.length > 0
        ? scorable.reduce((s, a) => s + a!.autoScore!, 0) / scorable.length
        : null,
      points: q.points,
    };
  }), [exam.questions, submissions]);

  const drilldown = useMemo(() => {
    if (!drilldownId) return null;
    const q = exam.questions.find(q => q.id === drilldownId);
    if (!q) return null;
    const rows = completed
      .map(s => {
        const a = s.answers.find(a => a.questionId === drilldownId);
        return { name: s.studentName, answer: a?.answer || '(bỏ trống)', score: a?.autoScore };
      })
      .filter(d => d.score !== undefined && d.score < q.points);
    return { q, rows };
  }, [drilldownId, completed, exam.questions]);

  if (completed.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400">
        <BarChart3 className="w-10 h-10 mx-auto opacity-30 mb-3" />
        <p className="text-sm font-medium">Chưa có dữ liệu — cần ít nhất 1 bài đã nộp</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Extra summary pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Điểm cao nhất</p>
          <p className="text-2xl font-black text-emerald-600">{hi?.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Điểm thấp nhất</p>
          <p className="text-2xl font-black text-red-500">{lo?.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tỉ lệ đạt ≥50%</p>
          <p className="text-2xl font-black text-blue-600">{passRate !== null ? `${passRate}%` : '—'}</p>
        </div>
      </div>

      {/* Score distribution chart */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6">
        <h3 className="text-sm font-black text-slate-700 mb-4">Phân bố điểm (quy về thang 10)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
              formatter={(value) => [`${Number(value ?? 0)} bài`, 'Số lượng']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {bins.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-question stats */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-700">Thống kê từng câu hỏi</h3>
          <p className="text-xs text-slate-400 mt-0.5">Chỉ tính câu có đáp án tự động (MCQ / Đ-S / Ngắn)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-bold w-10">Câu</th>
                <th className="text-left px-4 py-3 font-bold w-14">Loại</th>
                <th className="text-left px-4 py-3 font-bold">Nội dung</th>
                <th className="text-right px-4 py-3 font-bold w-24">% Đúng</th>
                <th className="text-right px-4 py-3 font-bold w-24">Điểm TB</th>
              </tr>
            </thead>
            <tbody>
              {questionStats.map(q => (
                <tr
                  key={q.num}
                  className={`border-t border-slate-50 cursor-pointer transition-colors ${
                    drilldownId === q.id ? 'bg-blue-50' : 'hover:bg-slate-50/50'
                  }`}
                  onClick={() => setDrilldownId(drilldownId === q.id ? null : q.id)}
                  title="Nhấn để xem học sinh trả lời sai"
                >
                  <td className="px-4 py-3 font-bold text-slate-500">{q.num}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {TYPE_LABEL[q.type] || q.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs truncate max-w-xs">{q.label}</td>
                  <td className="px-4 py-3 text-right">
                    {q.correctRate !== null ? (
                      <span className={`text-xs font-black ${
                        q.correctRate >= 0.7 ? 'text-emerald-600'
                          : q.correctRate >= 0.4 ? 'text-amber-600'
                            : 'text-red-600'
                      }`}>
                        {Math.round(q.correctRate * 100)}%
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                    {q.avgScore !== null ? `${q.avgScore.toFixed(2)}/${q.points}` : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {drilldown && (
          <div className="border-t border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black text-slate-700 mb-2">
              HS trả lời sai câu {questionStats.find(q => q.id === drilldownId)?.num} — đáp án đúng:
              {' '}<span className="text-emerald-700">{drilldown.q.correctAnswer || '(tự luận)'}</span>
            </p>
            {drilldown.q.imageUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-fit">
                <img src={drilldown.q.imageUrl} alt="minh họa" className="max-h-48 object-contain bg-white" />
              </div>
            )}
            {drilldown.rows.length === 0 ? (
              <p className="text-xs text-slate-400">Không có học sinh nào trả lời sai.</p>
            ) : (
              <div className="space-y-1">
                {drilldown.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <span className="font-medium text-slate-700 flex-1">{r.name}</span>
                    <span className="text-red-600 font-bold">Chọn: {r.answer || '(bỏ trống)'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AnswerEditModal ──────────────────────────────────────────────────────────

const TYPE_LABEL_SHORT: Record<string, string> = {
  multiple_choice: 'MCQ', true_false: 'Đ/S', short_answer: 'Ngắn', essay: 'TL',
};

interface AnswerEditModalProps {
  exam: Exam;
  submissions: ExamSubmission[];
  data: AppData;
  showToast: (msg: string, type?: any) => void;
  onClose: () => void;
  onSaved: (updatedExam: Exam) => void;
}

const AnswerEditModal = ({ exam, submissions, data, showToast, onClose, onSaved }: AnswerEditModalProps) => {
  const completedSubs = submissions.filter(s => s.status !== 'in_progress');
  const hasSubmissions = completedSubs.length > 0;

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      exam.questions.filter(q => q.type !== 'essay').map(q => [q.id, q.correctAnswer ?? ''])
    )
  );
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    { questionId: string; suggestedAnswer: string; reason: string }[]
  >([]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedQuestions = exam.questions.map(q =>
        answers[q.id] !== undefined ? { ...q, correctAnswer: answers[q.id] } : q
      );
      await updateExam(exam.id, { questions: updatedQuestions });
      const updatedExam = { ...exam, questions: updatedQuestions };

      if (hasSubmissions) {
        for (const sub of completedSubs) {
          const newAnswers = sub.answers.map(a => {
            const q = updatedQuestions.find(q => q.id === a.questionId);
            if (!q || q.type === 'essay') return a;
            const autoScore = computeAutoScore(q, a.answer, exam.tfScoringMode);
            return { ...a, autoScore: autoScore ?? a.autoScore };
          });
          const totalScore = recalcTotalScore(updatedQuestions, newAnswers, exam.tfScoringMode);
          await updateSubmission(sub.id, { answers: newAnswers as StudentAnswer[], totalScore });
        }
        showToast(`Đã cập nhật đáp án và tính lại điểm cho ${completedSubs.length} bài!`);
      } else {
        showToast('Đã cập nhật đáp án!');
      }
      onSaved(updatedExam);
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAIValidate = async () => {
    const mcqQs = exam.questions.filter(q => q.type === 'multiple_choice' && q.options?.length);
    if (mcqQs.length === 0) { showToast('Không có câu MCQ để kiểm tra', 'warning'); return; }
    setValidating(true);
    try {
      const prompt = `Bạn là giáo viên chuyên môn. Kiểm tra đáp án các câu trắc nghiệm sau và phát hiện câu có đáp án nghi vấn.

${mcqQs.map((q, i) => `Câu ${i + 1} (id:${q.id}):
${q.content}
A) ${q.options![0]}  B) ${q.options![1]}  C) ${q.options![2]}  D) ${q.options![3]}
Đáp án hiện tại: ${answers[q.id] || q.correctAnswer || '?'}`).join('\n\n')}

Trả về JSON thuần (không markdown):
{"issues":[{"questionId":"<id>","suggestedAnswer":"A","reason":"Lý do ngắn gọn tiếng Việt"}]}
Nếu không có vấn đề: {"issues":[]}`;
      const raw = await callAI(prompt, data.settings);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const result = parseLooseJson(match[0]);
        const issues = result.issues ?? [];
        setAiSuggestions(issues);
        showToast(issues.length === 0 ? 'AI không phát hiện vấn đề nào!' : `AI phát hiện ${issues.length} câu cần xem lại`, issues.length > 0 ? 'warning' : 'success');
      }
    } catch (err: any) {
      showToast('Lỗi AI: ' + err.message, 'error');
    } finally {
      setValidating(false);
    }
  };

  const nonEssay = exam.questions.map((q, i) => ({ q, num: i + 1 })).filter(({ q }) => q.type !== 'essay');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800">Sửa đáp án</h3>
            <p className="text-xs text-slate-400 mt-0.5">{exam.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {hasSubmissions && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Có {completedSubs.length} bài đã nộp. Điểm sẽ được <strong>tính lại tự động</strong> khi bạn lưu.</span>
          </div>
        )}

        <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {nonEssay.map(({ q, num }) => {
            const sug = aiSuggestions.find(s => s.questionId === q.id);
            return (
              <div key={q.id} className={`border rounded-xl p-3 ${sug ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs font-black text-slate-400 shrink-0 pt-0.5">Câu {num}</span>
                  <span className="text-sm text-slate-700 flex-1 line-clamp-2">{q.content}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                    {TYPE_LABEL_SHORT[q.type]}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-bold text-slate-500 shrink-0">Đáp án:</label>
                  {q.type === 'multiple_choice' ? (
                    <div className="flex gap-1.5">
                      {['A', 'B', 'C', 'D'].map(l => (
                        <button key={l} onClick={() => setAnswers(a => ({ ...a, [q.id]: l }))}
                          className={`w-8 h-8 rounded-lg text-xs font-black border-2 transition-all ${
                            answers[q.id] === l ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                          }`}>{l}</button>
                      ))}
                    </div>
                  ) : q.type === 'true_false' ? (
                    <div className="flex gap-1.5">
                      {['Đúng', 'Sai'].map(v => (
                        <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                            answers[q.id] === v
                              ? v === 'Đúng' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}>{v}</button>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  )}
                </div>
                {sug && (
                  <div className="mt-2 p-2 bg-white border border-amber-200 rounded-lg text-xs flex items-start gap-2">
                    <span className="text-amber-700 flex-1">AI đề xuất: <strong className="text-blue-600">{sug.suggestedAnswer}</strong> — {sug.reason}</span>
                    <button onClick={() => { setAnswers(a => ({ ...a, [q.id]: sug.suggestedAnswer })); setAiSuggestions(s => s.filter(x => x.questionId !== q.id)); }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 shrink-0">Đổi</button>
                    <button onClick={() => setAiSuggestions(s => s.filter(x => x.questionId !== q.id))}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">Bỏ</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          {!hasSubmissions && (
            <button onClick={handleAIValidate} disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold disabled:opacity-60">
              {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              AI kiểm tra đáp án
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {hasSubmissions ? `Lưu & tính lại ${completedSubs.length} bài` : 'Lưu đáp án'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MethodCard ──────────────────────────────────────────────────────────────

const MethodCard = ({ icon, title, desc, color, onClick }: {
  icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-300 hover:shadow-sm transition-all group"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>{icon}</div>
    <p className="text-sm font-black text-slate-800 group-hover:text-blue-700 mb-1">{title}</p>
    <p className="text-xs text-slate-400">{desc}</p>
  </button>
);

// ─── QRModal ─────────────────────────────────────────────────────────────────

const QRModal = ({ exam, onClose }: { exam: Exam; onClose: () => void }) => {
  const url = `${window.location.origin}/exam/${exam.code}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-slate-800 mb-1">Chia sẻ phòng thi</h3>
        <p className="text-xs text-slate-400 mb-4">{exam.title}</p>
        <p className="text-4xl font-black tracking-widest text-blue-600 mb-5">#{exam.code}</p>
        <div className="flex justify-center p-4 bg-slate-50 rounded-2xl mb-4">
          <QRCodeSVG value={url} size={180} bgColor="#f8fafc" fgColor="#1e293b" />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-600 mb-4 border border-slate-100">
          <span className="truncate flex-1 text-left">{url}</span>
          <button onClick={handleCopy}
            className={`shrink-0 font-bold text-xs px-2 py-0.5 rounded-lg transition-all ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 hover:text-blue-700'}`}>
            {copied ? '✓ Đã copy' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">HS quét mã QR hoặc nhập mã #{exam.code} để vào làm bài</p>
        <button onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all">
          Đóng
        </button>
      </div>
    </div>
  );
};

