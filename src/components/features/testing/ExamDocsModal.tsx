import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, FileText, FileSpreadsheet, BookOpen } from 'lucide-react';
import { ExamQuestion, GradeLevel, ParsedExamBundle } from '../../../types';
import { parseExamMarkdown, saveBundle } from '../../../utils/examParser';
import { exportAnswerSheetPDF } from '../../../utils/answerSheetExport';
import { exportAnswerKeyWord } from '../../../utils/answerKeyExport';
import { exportGradeBookExcel } from '../../../utils/gradeBookExport';

interface ExamDocsModalProps {
  entry: { id: string; title: string; content: string } | null;
  onClose: () => void;
  settings: any;
  showToast: (msg: string, type?: string) => void;
}

type ParseStatus = 'idle' | 'parsing' | 'done' | 'error';

const GRADE_LEVELS: { value: GradeLevel; label: string }[] = [
  { value: 'cap2',   label: 'Lớp 6–9 (THCS)' },
  { value: 'lop1011', label: 'Lớp 10–11 (THPT)' },
  { value: 'lop12',  label: 'Lớp 12 – TN THPT' },
];

export const ExamDocsModal = ({ entry, onClose, settings, showToast }: ExamDocsModalProps) => {
  const [gradeLevel, setGradeLevel]       = useState<GradeLevel>('lop12');
  const [durationMinutes, setDuration]    = useState(45);
  const [schoolName, setSchoolName]       = useState('');
  const [subject, setSubject]             = useState('');
  const [parseStatus, setParseStatus]     = useState<ParseStatus>('idle');
  const [parsedQuestions, setParsed]      = useState<ExamQuestion[]>([]);
  const [parseError, setParseError]       = useState('');
  const [exportingPDF, setExportingPDF]   = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  if (!entry) return null;

  const slug = entry.title.replace(/[^a-zA-Z0-9_À-ɏḀ-ỿ]/g, '_').slice(0, 40);

  const handleParse = async () => {
    setParseStatus('parsing');
    setParseError('');
    try {
      const questions = await parseExamMarkdown(entry.content, settings);
      setParsed(questions);

      const bundle: ParsedExamBundle = {
        id: entry.id,
        title: entry.title,
        gradeLevel,
        subject: subject.trim() || undefined,
        durationMinutes,
        schoolName: schoolName.trim(),
        parsedAt: new Date().toISOString(),
        questions,
      };
      saveBundle(bundle);
      setParseStatus('done');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setParseStatus('error');
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportAnswerSheetPDF(parsedQuestions, {
        title: entry.title,
        subject: subject.trim() || undefined,
        durationMinutes,
        schoolName: schoolName.trim(),
        gradeLevel,
        filename: `Phieu_lam_bai_${slug}.pdf`,
      });
      showToast('Đã tải Phiếu làm bài PDF!', 'success');
    } catch (err) {
      showToast('Lỗi xuất PDF: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      await exportAnswerKeyWord(parsedQuestions, {
        title: entry.title,
        subject: subject.trim() || undefined,
        schoolName: schoolName.trim(),
        filename: `Dap_an_HD_cham_${slug}.docx`,
      });
      showToast('Đã tải Đáp án + HD chấm Word!', 'success');
    } catch (err) {
      showToast('Lỗi xuất Word: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setExportingWord(false);
    }
  };

  const handleExportExcel = () => {
    try {
      exportGradeBookExcel(parsedQuestions, {
        title: entry.title,
        gradeLevel,
        filename: `Bang_diem_${slug}.xlsx`,
      });
      showToast('Đã tải Bảng điểm Excel!', 'success');
    } catch (err) {
      showToast('Lỗi xuất Excel: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const mcqCount    = parsedQuestions.filter(q => q.type === 'multiple_choice').length;
  const tfCount     = parsedQuestions.filter(q => q.type === 'true_false').length;
  const saCount     = parsedQuestions.filter(q => q.type === 'short_answer').length;
  const essayCount  = parsedQuestions.filter(q => q.type === 'essay').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Sinh bộ tài liệu kiểm tra
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Exam title */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Đề thi</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{entry.title}</p>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 1 — Cài đặt</p>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Cấp lớp</label>
              <select
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GRADE_LEVELS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Thời gian (phút)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationMinutes}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Môn học (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Toán, Lý, Hóa..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Tên trường (tùy chọn)</label>
              <input
                type="text"
                placeholder="THPT Nguyễn Du..."
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Parse step */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 2 — Phân tích đề</p>

            <button
              onClick={handleParse}
              disabled={parseStatus === 'parsing'}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {parseStatus === 'parsing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích...</>
              ) : (
                <><BookOpen className="w-4 h-4" /> Phân tích đề bằng AI</>
              )}
            </button>

            {parseStatus === 'done' && (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl border border-green-100 text-xs text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">
                  Đã phân tích: {mcqCount} câu MCQ, {tfCount} câu Đúng/Sai, {saCount} câu Ngắn, {essayCount} câu Tự luận
                </span>
              </div>
            )}

            {parseStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Download step */}
          {parseStatus === 'done' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 3 — Tải xuống</p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all disabled:opacity-60"
                >
                  {exportingPDF
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <FileText className="w-5 h-5" />
                  }
                  <span>Phiếu làm bài</span>
                  <span className="font-normal text-blue-400">(PDF)</span>
                </button>

                <button
                  onClick={handleExportWord}
                  disabled={exportingWord}
                  className="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all disabled:opacity-60"
                >
                  {exportingWord
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <BookOpen className="w-5 h-5" />
                  }
                  <span>Đáp án + HD</span>
                  <span className="font-normal text-emerald-500">(Word)</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="flex flex-col items-center gap-1.5 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl font-bold text-xs hover:bg-orange-100 transition-all"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Bảng điểm</span>
                  <span className="font-normal text-orange-400">(Excel)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                Đã lưu vào thư viện chấm bài — có thể dùng tại tab Chấm bài
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
