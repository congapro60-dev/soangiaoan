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
  Edit3,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppData, Exam, ExamSubmission, ExamQuestion, StudentAnswer } from '../../types';
import { useExams, updateSubmission } from '../../hooks/useExams';
import { parseMarkdownToQuestions, generateExamCode, calculateMaxScore } from '../../lib/examParser';
import { callAI } from '../../lib/aiProviders';
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
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
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
  const { exams, loading, saveExam, deleteExam, toggleActive, getSubmissions, fetchMyExams } = useExams(user);
  const [creating, setCreating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [createView, setCreateView] = useState<CreateView>(null);

  const reloadSubmissions = useCallback(async (exam: Exam) => {
    setLoadingSubs(true);
    try {
      const subs = await getSubmissions(exam.id);
      setSubmissions(subs);
    } finally {
      setLoadingSubs(false);
    }
  }, [getSubmissions]);

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
        <div className="flex items-center gap-2">
          <button onClick={fetchMyExams} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl" title="Tải lại">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreateView('picker')}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'AI đang phân tích...' : 'Tạo đề mới'}
          </button>
        </div>
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
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Đang mở
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
                    fetchMyExams();
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

      {showImportModal && (
        <ImportExamModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportExam}
          settings={data.settings}
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
}

const ExamDetail = ({
  exam, submissions, loading, data, showToast,
  onBack, onCopy, onToggle, onSubmissionsChange, onReload
}: ExamDetailProps) => {
  const navigate = useNavigate();
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'list' | 'stats'>('list');
  const [showQR, setShowQR] = useState(false);

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
              formatter={(v: number) => [`${v} bài`, 'Số lượng']}
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
