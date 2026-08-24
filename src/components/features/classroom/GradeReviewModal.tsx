import { useState } from 'react';
import { Loader2, Save, Sparkles, X } from 'lucide-react';
import type { SubmissionDoc } from '../../../lib/classroom/types';
import { rewriteFeedback } from '../../../services/gradingApi';
import { NhanXetMarkdown } from './NhanXetMarkdown';
import { QuestionResultsList } from './QuestionResultsList';

export interface GradeReviewValue {
  score: number;
  maxScore: number;
  feedback: string;
  weakTopics: string[];
  teacherNote: string;
}

interface Props {
  classId: string;
  studentName: string;
  submission: SubmissionDoc;
  dangLuu: boolean;
  onClose: () => void;
  onSubmit: (value: GradeReviewValue) => void;
}

const O = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white';

/** Mỗi dòng một chủ đề — gọn hơn ô chip mà thầy cô vẫn sửa nhanh được. */
const tachDong = (text: string): string[] =>
  text.split('\n').map(d => d.trim()).filter(Boolean);

/**
 * Chấm lại một bài sau khi máy đã chấm.
 *
 * Hai điều khác hẳn hộp thoại sửa điểm cũ:
 *  1. Sửa được DANH SÁCH CHỦ ĐỀ YẾU. Đây mới là thứ đi vào hồ sơ học tập lâu dài và đẻ ra bài
 *     bổ trợ — sửa mỗi điểm mà để nguyên chủ đề thì em vẫn bị luyện theo chủ đề thầy cô đã bác.
 *  2. Thầy cô viết nhận xét THEO Ý MÌNH, AI chỉ diễn đạt lại cho em dễ đọc. Lời thầy cô là nguồn,
 *     AI là người chép lại — không phải ngược lại.
 */
export const GradeReviewModal = ({ classId, studentName, submission, dangLuu, onClose, onSubmit }: Props) => {
  const g = submission.grade;
  const maxScore = g?.maxScore ?? 10;

  const [score, setScore] = useState(String(g?.score ?? ''));
  const [feedback, setFeedback] = useState(g?.feedback || '');
  const [topics, setTopics] = useState((g?.weakTopics || []).join('\n'));
  const [teacherNote, setTeacherNote] = useState(g?.teacherNote || '');

  const [dangViet, setDangViet] = useState(false);
  const [ghiChu, setGhiChu] = useState('');
  const [aiVuaViet, setAiVuaViet] = useState(false);

  const diem = Number(score);
  const diemHopLe = Number.isFinite(diem) && diem >= 0 && diem <= maxScore;

  const nhoAiVietLai = async () => {
    setDangViet(true);
    setGhiChu('');
    try {
      const ket = await rewriteFeedback({
        classId,
        teacherNote,
        currentFeedback: feedback,
        score: diemHopLe ? diem : (g?.score ?? 0),
        maxScore,
        weakTopics: tachDong(topics),
      });
      setFeedback(ket);
      setAiVuaViet(true);
    } catch (error) {
      setGhiChu(error instanceof Error ? error.message : 'Không viết lại được.');
    } finally {
      setDangViet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Chấm lại</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">{studentName}</h3>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-5">
          <QuestionResultsList results={g?.questionResults} title="Kết quả AI theo từng câu (chỉ xem)" />
          <div>
            <label className="mb-1 block text-sm font-black text-slate-700">Điểm (tối đa {maxScore})</label>
            <input type="number" min={0} max={maxScore} step={0.25} value={score}
              onChange={e => setScore(e.target.value)} className={`${O} font-semibold`} />
            {!diemHopLe && score !== '' && (
              <p className="mt-1 text-xs font-bold text-red-700">Điểm phải nằm trong khoảng 0 – {maxScore}.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-black text-slate-800">Chủ đề em còn yếu</p>
            <p className="mb-2 mt-1 text-xs font-semibold text-slate-500">
              Mỗi dòng một chủ đề. Đây là thứ đi vào <b>hồ sơ học tập lâu dài</b> và quyết định bài
              luyện thêm của em — xoá dòng nào là gỡ nhãn đó khỏi hồ sơ.
            </p>
            <textarea value={topics} onChange={e => setTopics(e.target.value)} rows={3}
              placeholder="VD: quy tắc dấu khi thay toạ độ" className={O} />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-800">Nhận xét của thầy cô</p>
              <button
                type="button"
                onClick={nhoAiVietLai}
                disabled={!teacherNote.trim() || dangViet}
                title={!teacherNote.trim() ? 'Viết nhận xét của thầy cô trước đã' : 'AI diễn đạt lại lời thầy cô cho em dễ đọc'}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
              >
                {dangViet ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {dangViet ? 'AI đang viết...' : 'Để AI viết lại cho học sinh'}
              </button>
            </div>
            <p className="mb-2 mt-1 text-xs font-semibold text-slate-500">
              Viết ngắn theo ý thầy cô, không cần trau chuốt. VD: <i>"em nhầm dấu chứ không phải
              không hiểu bài, câu 3 làm rất gọn"</i>. Ô này <b>không gửi cho học sinh</b>.
            </p>
            <textarea value={teacherNote} onChange={e => setTeacherNote(e.target.value)} rows={3} className={O} />
            {ghiChu && <p className="mt-1 text-xs font-bold text-amber-700">{ghiChu}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-black text-slate-700">Nhận xét gửi học sinh</label>
            <textarea value={feedback} onChange={e => { setFeedback(e.target.value); setAiVuaViet(false); }} rows={5} className={`${O} font-mono text-[13px]`} />
            {aiVuaViet && (
              <p className="mt-1 text-xs font-bold text-amber-700">
                AI vừa viết lại từ lời của thầy cô. Đọc lại trước khi lưu — em ấy sẽ đọc đúng những chữ này.
              </p>
            )}

            {/* XEM TRƯỚC — thầy cô sửa ở ô trên là mã thô (LaTeX, **đậm**), còn học sinh
                thấy bản đã dựng. Thiếu khung này là sửa mù: không biết công thức có hiện đúng
                không cho tới khi lưu rồi mở màn hình của em ra xem. */}
            {feedback.trim() && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-emerald-700">Học sinh sẽ thấy thế này</p>
                <NhanXetMarkdown tone="sang">{feedback}</NhanXetMarkdown>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="rounded-2xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50">Huỷ</button>
          <button
            onClick={() => onSubmit({
              score: diem,
              maxScore,
              feedback: feedback.trim(),
              weakTopics: tachDong(topics),
              teacherNote: teacherNote.trim(),
            })}
            disabled={!diemHopLe || dangLuu || dangViet}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {dangLuu ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dangLuu ? 'Đang lưu...' : 'Lưu chấm lại'}
          </button>
        </div>
      </div>
    </div>
  );
};
