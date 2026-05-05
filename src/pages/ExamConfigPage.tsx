import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, Save, Settings } from 'lucide-react';
import { Exam } from '../types';
import { getExamById, updateExam } from '../hooks/useExams';

export const ExamConfigPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Exam>>({});

  useEffect(() => {
    if (!examId) { setLoading(false); return; }
    getExamById(examId).then(e => {
      if (e) { setExam(e); setForm(e); }
      setLoading(false);
    });
  }, [examId]);

  const set = <K extends keyof Exam>(key: K, val: Exam[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!exam) return;
    setSaving(true);
    try {
      await updateExam(exam.id, form);
      navigate(-1);
    } catch (e: any) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center max-w-md w-full">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-slate-500">Không tìm thấy đề thi</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 font-bold">← Quay lại</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              <h1 className="text-base font-black text-slate-800">Cài đặt đề thi</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{exam.title}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu cài đặt
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">

        {/* Cơ bản */}
        <Section title="Cơ bản">
          <Field label="Tiêu đề">
            <input
              type="text"
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thời gian làm bài (phút)">
              <input
                type="number"
                min={1}
                value={form.durationMinutes ?? ''}
                onChange={e => set('durationMinutes', parseInt(e.target.value) || 45)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </Field>
            <Field label="Khối">
              <input
                type="text"
                value={form.grade ?? ''}
                onChange={e => set('grade', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="VD: 12"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mở từ (tùy chọn)">
              <input
                type="datetime-local"
                value={form.startAt ? form.startAt.slice(0, 16) : ''}
                onChange={e => set('startAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </Field>
            <Field label="Đóng lúc (tùy chọn)">
              <input
                type="datetime-local"
                value={form.endAt ? form.endAt.slice(0, 16) : ''}
                onChange={e => set('endAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </Field>
          </div>
        </Section>

        {/* Bảo mật & Truy cập */}
        <Section title="Bảo mật & Truy cập">
          <Field label="Mật khẩu vào thi (để trống = không cần mật khẩu)">
            <input
              type="text"
              value={form.password ?? ''}
              onChange={e => set('password', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              placeholder="Không có mật khẩu"
            />
          </Field>
          <Field label="Số lượt làm tối đa (0 = không giới hạn)">
            <input
              type="number"
              min={0}
              value={form.maxAttempts ?? 0}
              onChange={e => set('maxAttempts', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </Field>
          <Field label="Chế độ giám sát">
            <select
              value={form.proctorMode ?? 'off'}
              onChange={e => set('proctorMode', e.target.value as Exam['proctorMode'])}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="off">Tắt (không giám sát)</option>
              <option value="tab-exit">Ghi nhận số lần thoát tab</option>
              <option value="advanced">Nâng cao (cảnh báo + lưu lần thoát)</option>
            </select>
          </Field>
        </Section>

        {/* Hiển thị kết quả */}
        <Section title="Hiển thị kết quả">
          <Field label="Cho xem kết quả & đáp án">
            <select
              value={form.showResultWhen ?? 'submit'}
              onChange={e => set('showResultWhen', e.target.value as Exam['showResultWhen'])}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="submit">Ngay sau khi nộp bài</option>
              <option value="all_done">Sau khi tất cả HS nộp xong</option>
              <option value="never">Không cho xem</option>
            </select>
          </Field>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Cho xem lại từng câu chi tiết</p>
              <p className="text-xs text-slate-400 mt-0.5">Hiện nút "Xem lại chi tiết từng câu" trên trang kết quả</p>
            </div>
            <Toggle
              checked={form.allowReview ?? false}
              onChange={v => set('allowReview', v)}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-700">Ẩn bảng xếp hạng</p>
              <p className="text-xs text-slate-400 mt-0.5">Học sinh không thấy xếp hạng sau khi nộp</p>
            </div>
            <Toggle
              checked={form.hideLeaderboard ?? false}
              onChange={v => set('hideLeaderboard', v)}
            />
          </div>
        </Section>

        {/* Thứ tự câu hỏi */}
        <Section title="Thứ tự câu hỏi">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Đảo thứ tự câu hỏi</p>
              <p className="text-xs text-slate-400 mt-0.5">Mỗi HS làm theo thứ tự ngẫu nhiên khác nhau</p>
            </div>
            <Toggle
              checked={form.shuffleQuestions ?? false}
              onChange={v => set('shuffleQuestions', v)}
            />
          </div>
        </Section>

        {/* Chấm điểm */}
        <Section title="Chấm điểm">
          <Field label="Thang điểm câu Đúng/Sai (compound T/F)">
            <select
              value={form.tfScoringMode ?? 'all_or_nothing'}
              onChange={e => set('tfScoringMode', e.target.value as Exam['tfScoringMode'])}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all_or_nothing">Tất cả đúng mới được điểm (0% hoặc 100%)</option>
              <option value="thpt2025">THPT 2025 — 2/4 đúng: 40%, 3/4 đúng: 75%, 4/4 đúng: 100%</option>
            </select>
          </Field>
        </Section>

        {/* Thông báo trước khi thi */}
        <Section title="Thông báo trước khi vào thi">
          <Field label="Nội dung thông báo (tùy chọn)">
            <textarea
              rows={4}
              value={form.preExamNotice ?? ''}
              onChange={e => set('preExamNotice', e.target.value || undefined)}
              className="input resize-none"
              placeholder="VD: Đây là bài kiểm tra 15 phút. Nghiêm cấm sử dụng tài liệu..."
            />
          </Field>
        </Section>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
    <h2 className="text-sm font-black text-slate-700 border-b border-slate-100 pb-3">{title}</h2>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-bold text-slate-500 block mb-1.5">{label}</label>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);
