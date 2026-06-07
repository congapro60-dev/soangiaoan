import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Save,
  Settings,
  ShieldCheck,
  Clock3,
  Eye,
  Shuffle,
  Trophy,
  MessageSquareWarning,
  LockKeyhole,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Exam } from '../types';
import { getExamById, updateExam } from '../hooks/useExams';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300';

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

  const hasSchedule = Boolean(form.startAt || form.endAt);
  const resultPolicy = form.showResultWhen ?? 'submit';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_8px_32px_rgba(0,97,165,0.08)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </div>
  );

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff] p-4">
      <div className="bg-white rounded-3xl border border-red-100 p-8 text-center max-w-md w-full shadow-[0_8px_32px_rgba(0,97,165,0.08)]">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-lg font-black text-slate-900">Không tìm thấy đề thi</h1>
        <p className="mt-2 text-sm text-slate-500">Đề có thể đã bị xoá hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => navigate(-1)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-slate-900">
      <div className="sticky top-0 z-20 border-b border-blue-100/70 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:flex">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Thiết lập & cấu hình</p>
              <h1 className="truncate text-lg font-black text-slate-900 sm:text-xl">Cài đặt đề thi</h1>
              <p className="truncate text-xs font-semibold text-slate-500">{exam.title}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Lưu cài đặt</span>
            <span className="sm:hidden">Lưu</span>
          </button>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_8px_32px_rgba(0,97,165,0.05)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mã đề</p>
            <div className="mt-2 inline-flex rounded-2xl bg-blue-600 px-4 py-2 font-mono text-2xl font-black text-white">#{exam.code}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniMetric label="Câu hỏi" value={exam.questions.length.toString()} />
              <MiniMetric label="Điểm" value={String(exam.maxScore)} />
              <MiniMetric label="Thời gian" value={`${form.durationMinutes ?? exam.durationMinutes}p`} />
              <MiniMetric label="Trạng thái" value={form.isActive ? 'Mở' : 'Tắt'} tone={form.isActive ? 'green' : 'slate'} />
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-blue-900"><CheckCircle2 className="h-4 w-4" /> Tóm tắt cấu hình</h2>
            <ul className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
              <li className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 text-blue-600" /> {hasSchedule ? 'Có giới hạn thời gian mở/đóng' : 'Chưa đặt lịch mở/đóng bài'}</li>
              <li className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 text-blue-600" /> {form.password ? 'Yêu cầu mật khẩu vào thi' : 'Không yêu cầu mật khẩu'}</li>
              <li className="flex items-start gap-2"><Eye className="mt-0.5 h-4 w-4 text-blue-600" /> {resultPolicy === 'submit' ? 'Hiện kết quả sau khi nộp' : resultPolicy === 'all_done' ? 'Hiện khi tất cả hoàn tất' : 'Ẩn kết quả với học sinh'}</li>
              <li className="flex items-start gap-2"><Shuffle className="mt-0.5 h-4 w-4 text-blue-600" /> {form.shuffleQuestions ? 'Đảo thứ tự câu hỏi' : 'Giữ nguyên thứ tự câu hỏi'}</li>
            </ul>
          </div>
        </aside>

        <div className="space-y-5">
          <Section icon={<Settings className="h-5 w-5" />} title="Cơ bản" desc="Thông tin nhận diện, thời lượng và lịch mở/đóng bài thi.">
            <Field label="Tiêu đề đề thi">
              <input type="text" value={form.title ?? ''} onChange={e => set('title', e.target.value)} className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Thời gian làm bài (phút)">
                <input type="number" min={1} value={form.durationMinutes ?? ''} onChange={e => set('durationMinutes', parseInt(e.target.value) || 45)} className={inputClass} />
              </Field>
              <Field label="Khối / lớp áp dụng">
                <input type="text" value={form.grade ?? ''} onChange={e => set('grade', e.target.value)} className={inputClass} placeholder="VD: 12" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mở từ (tùy chọn)">
                <input type="datetime-local" value={form.startAt ? form.startAt.slice(0, 16) : ''} onChange={e => set('startAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputClass} />
              </Field>
              <Field label="Đóng lúc (tùy chọn)">
                <input type="datetime-local" value={form.endAt ? form.endAt.slice(0, 16) : ''} onChange={e => set('endAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section icon={<ShieldCheck className="h-5 w-5" />} title="Bảo mật & truy cập" desc="Kiểm soát ai được vào thi, số lượt làm và mức giám sát trong quá trình thi.">
            <Field label="Mật khẩu vào thi">
              <input type="text" value={form.password ?? ''} onChange={e => set('password', e.target.value || undefined)} className={inputClass} placeholder="Để trống nếu không cần mật khẩu" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Số lượt làm tối đa">
                <input type="number" min={0} value={form.maxAttempts ?? 0} onChange={e => set('maxAttempts', parseInt(e.target.value) || 0)} className={inputClass} />
                <p className="mt-1.5 text-xs font-semibold text-slate-400">0 nghĩa là không giới hạn.</p>
              </Field>
              <Field label="Chế độ giám sát">
                <select value={form.proctorMode ?? 'off'} onChange={e => set('proctorMode', e.target.value as Exam['proctorMode'])} className={inputClass}>
                  <option value="off">Tắt (không giám sát)</option>
                  <option value="tab-exit">Ghi nhận số lần thoát tab</option>
                  <option value="advanced">Nâng cao (cảnh báo + lưu lần thoát)</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section icon={<Eye className="h-5 w-5" />} title="Hiển thị kết quả" desc="Quy định học sinh được xem gì sau khi nộp bài.">
            <Field label="Cho xem kết quả & đáp án">
              <select value={form.showResultWhen ?? 'submit'} onChange={e => set('showResultWhen', e.target.value as Exam['showResultWhen'])} className={inputClass}>
                <option value="submit">Ngay sau khi nộp bài</option>
                <option value="all_done">Sau khi tất cả học sinh nộp xong</option>
                <option value="never">Không cho xem</option>
              </select>
            </Field>
            <ToggleRow title="Cho xem lại từng câu chi tiết" desc="Hiện nút “Xem lại chi tiết từng câu” trên trang kết quả." checked={form.allowReview ?? false} onChange={v => set('allowReview', v)} />
            <ToggleRow title="Ẩn bảng xếp hạng" desc="Học sinh không thấy xếp hạng sau khi nộp bài." checked={form.hideLeaderboard ?? false} onChange={v => set('hideLeaderboard', v)} border />
          </Section>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section icon={<Shuffle className="h-5 w-5" />} title="Thứ tự câu hỏi" desc="Giảm sao chép đáp án giữa các học sinh.">
              <ToggleRow title="Đảo thứ tự câu hỏi" desc="Mỗi học sinh làm theo một thứ tự ngẫu nhiên khác nhau." checked={form.shuffleQuestions ?? false} onChange={v => set('shuffleQuestions', v)} />
            </Section>

            <Section icon={<Trophy className="h-5 w-5" />} title="Chấm điểm" desc="Quy tắc tính điểm cho dạng câu hỏi đặc biệt.">
              <Field label="Thang điểm câu Đúng/Sai (compound T/F)">
                <select value={form.tfScoringMode ?? 'all_or_nothing'} onChange={e => set('tfScoringMode', e.target.value as Exam['tfScoringMode'])} className={inputClass}>
                  <option value="all_or_nothing">Tất cả đúng mới được điểm (0% hoặc 100%)</option>
                  <option value="thpt2025">THPT 2025 — 1/4: 10%, 2/4: 25%, 3/4: 50%, 4/4: 100%</option>
                </select>
              </Field>
            </Section>
          </div>

          <Section icon={<MessageSquareWarning className="h-5 w-5" />} title="Thông báo trước khi vào thi" desc="Lời nhắc giúp học sinh nắm quy định trước khi bắt đầu.">
            <Field label="Nội dung thông báo (tùy chọn)">
              <textarea rows={5} value={form.preExamNotice ?? ''} onChange={e => set('preExamNotice', e.target.value || undefined)} className={`${inputClass} resize-none`} placeholder="VD: Đây là bài kiểm tra 15 phút. Nghiêm cấm sử dụng tài liệu..." />
            </Field>
          </Section>

          <div className="flex flex-col-reverse gap-3 rounded-3xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setForm(exam)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" /> Khôi phục ban đầu
            </button>
            <div className="flex gap-3">
              <button onClick={() => navigate(-1)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 sm:flex-none">Đóng</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 sm:flex-none">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Section = ({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) => (
  <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_8px_32px_rgba(0,97,165,0.04)]">
    <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
      <div>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{desc}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</label>
    {children}
  </div>
);

const ToggleRow = ({ title, desc, checked, onChange, border = false }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; border?: boolean }) => (
  <div className={`flex items-center justify-between gap-4 py-2 ${border ? 'border-t border-slate-100 pt-4' : ''}`}>
    <div>
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-400">{desc}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    aria-pressed={checked}
  >
    <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const MiniMetric = ({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'green' | 'slate' }) => {
  const toneClass = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : tone === 'slate'
      ? 'bg-slate-50 text-slate-600 border-slate-100'
      : 'bg-blue-50 text-blue-700 border-blue-100';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="truncate text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
    </div>
  );
};
