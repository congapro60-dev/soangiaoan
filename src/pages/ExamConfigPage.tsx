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
  CalendarClock,
  FileQuestion,
  Gauge,
  KeyRound,
  MonitorCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Exam } from '../types';
import { getExamById, updateExam } from '../hooks/useExams';

const inputClass = 'w-full rounded-lg border border-[#c0c7d3] bg-white px-3 py-2.5 text-sm text-[#121c2c] outline-none transition placeholder:text-[#717782]/70 focus:border-[#005ea1] focus:ring-2 focus:ring-[#9fcaff]/40';

const formatDateTime = (iso?: string) => {
  if (!iso) return 'Chưa đặt';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Không hợp lệ';
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

const toDateTimeLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

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

  const duration = form.durationMinutes ?? exam?.durationMinutes ?? 45;
  const questionCount = exam?.questions.length ?? 0;
  const maxScore = form.maxScore ?? exam?.maxScore ?? 0;
  const hasSchedule = Boolean(form.startAt || form.endAt);
  const resultPolicy = form.showResultWhen ?? 'submit';
  const proctorMode = form.proctorMode ?? 'off';
  const completionScore = [
    Boolean(form.title),
    duration > 0,
    questionCount > 0,
    Boolean(resultPolicy),
    Boolean(form.tfScoringMode ?? 'all_or_nothing'),
  ].filter(Boolean).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
      <div className="rounded-xl border border-[#c0c7d3]/50 bg-white p-6 shadow-[0_8px_32px_rgba(0,97,165,0.08)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#005ea1]" />
      </div>
    </div>
  );

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff] p-4">
      <div className="bg-white rounded-xl border border-red-100 p-8 text-center max-w-md w-full shadow-[0_8px_32px_rgba(0,97,165,0.08)]">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-[#121c2c]">Không tìm thấy đề thi</h1>
        <p className="mt-2 text-sm text-[#414751]">Đề có thể đã bị xoá hoặc bạn không có quyền truy cập.</p>
        <button onClick={() => navigate(-1)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#005ea1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2178c3]">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#121c2c]">
      <div className="sticky top-0 z-20 border-b border-[#c0c7d3]/40 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#c0c7d3] text-[#414751] transition hover:border-[#005ea1]/40 hover:bg-[#f0f3ff] hover:text-[#005ea1]"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-[#d2e4ff] text-[#005ea1] sm:flex">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#005ea1]">Thiết lập & cấu hình kỳ thi</p>
              <h1 className="truncate text-lg font-bold text-[#121c2c] sm:text-xl">Cài đặt đề thi Online</h1>
              <p className="truncate text-xs font-medium text-[#414751]">{exam.title}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#005ea1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition hover:bg-[#2178c3] disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Lưu cài đặt</span>
            <span className="sm:hidden">Lưu</span>
          </button>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-[#c0c7d3]/60 bg-white shadow-[0_8px_32px_rgba(0,97,165,0.06)]">
            <div className="bg-gradient-to-br from-[#005ea1] to-[#2178c3] p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Mã truy cập</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="font-mono text-3xl font-bold tracking-tight">#{exam.code}</div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isActive ? 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/30' : 'bg-white/15 text-white/80 ring-1 ring-white/20'}`}>
                  {form.isActive ? 'Đang mở' : 'Đang tắt'}
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/75">Học sinh dùng mã này hoặc link phát hành để vào bài thi.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <MiniMetric icon={<FileQuestion className="h-4 w-4" />} label="Câu hỏi" value={questionCount.toString()} />
              <MiniMetric icon={<Trophy className="h-4 w-4" />} label="Điểm" value={String(maxScore)} />
              <MiniMetric icon={<Clock3 className="h-4 w-4" />} label="Thời gian" value={`${duration}p`} />
              <MiniMetric icon={<Gauge className="h-4 w-4" />} label="Sẵn sàng" value={`${completionScore}/5`} tone={completionScore >= 5 ? 'green' : 'blue'} />
            </div>
          </div>

          <div className="rounded-xl border border-[#c0c7d3]/50 bg-[#f0f3ff] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#001d37]"><CheckCircle2 className="h-4 w-4 text-[#005ea1]" /> Tóm tắt cấu hình</h2>
            <ul className="mt-4 space-y-3 text-xs font-medium text-[#414751]">
              <SummaryItem icon={<CalendarClock className="h-4 w-4" />} text={hasSchedule ? `${formatDateTime(form.startAt)} → ${formatDateTime(form.endAt)}` : 'Chưa đặt lịch mở/đóng bài'} />
              <SummaryItem icon={<KeyRound className="h-4 w-4" />} text={form.password ? 'Yêu cầu mật khẩu vào thi' : 'Không yêu cầu mật khẩu'} />
              <SummaryItem icon={<Eye className="h-4 w-4" />} text={resultPolicy === 'submit' ? 'Hiện kết quả sau khi nộp' : resultPolicy === 'all_done' ? 'Hiện khi tất cả hoàn tất' : 'Ẩn kết quả với học sinh'} />
              <SummaryItem icon={<Shuffle className="h-4 w-4" />} text={form.shuffleQuestions ? 'Đảo thứ tự câu hỏi' : 'Giữ nguyên thứ tự câu hỏi'} />
              <SummaryItem icon={<MonitorCheck className="h-4 w-4" />} text={proctorMode === 'off' ? 'Không giám sát thoát tab' : proctorMode === 'tab-exit' ? 'Ghi nhận thoát tab' : 'Giám sát nâng cao'} />
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <p><b>Gợi ý:</b> kiểm tra thời lượng, lịch đóng và chính sách xem đáp án trước khi phát hành để tránh học sinh thấy kết quả quá sớm.</p>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-xl border border-[#c0c7d3]/50 bg-white p-4 shadow-[0_4px_12px_rgba(49,130,206,0.06)]">
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleCard icon={<ShieldCheck className="h-5 w-5" />} title="Phát hành đề" desc="Cho phép học sinh bắt đầu làm bài." checked={form.isActive ?? false} onChange={v => set('isActive', v)} />
              <ToggleCard icon={<Shuffle className="h-5 w-5" />} title="Đảo câu hỏi" desc="Giảm sao chép đáp án giữa học sinh." checked={form.shuffleQuestions ?? false} onChange={v => set('shuffleQuestions', v)} />
              <ToggleCard icon={<Users className="h-5 w-5" />} title="Ẩn xếp hạng" desc="Giữ trải nghiệm riêng tư sau nộp bài." checked={form.hideLeaderboard ?? false} onChange={v => set('hideLeaderboard', v)} />
            </div>
          </div>

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
                <input type="datetime-local" value={toDateTimeLocal(form.startAt)} onChange={e => set('startAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputClass} />
              </Field>
              <Field label="Đóng lúc (tùy chọn)">
                <input type="datetime-local" value={toDateTimeLocal(form.endAt)} onChange={e => set('endAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputClass} />
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
                <p className="mt-1.5 text-xs font-medium text-[#717782]">0 nghĩa là không giới hạn.</p>
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
            <div className="grid gap-3 lg:grid-cols-3">
              <PolicyOption title="Ngay sau khi nộp" desc="Phù hợp bài luyện tập." active={resultPolicy === 'submit'} onClick={() => set('showResultWhen', 'submit')} />
              <PolicyOption title="Khi cả lớp hoàn tất" desc="Tránh lộ đáp án sớm." active={resultPolicy === 'all_done'} onClick={() => set('showResultWhen', 'all_done')} />
              <PolicyOption title="Không cho xem" desc="Giữ đáp án cho giáo viên." active={resultPolicy === 'never'} onClick={() => set('showResultWhen', 'never')} />
            </div>
            <ToggleRow title="Cho xem lại từng câu chi tiết" desc="Hiện nút “Xem lại chi tiết từng câu” trên trang kết quả." checked={form.allowReview ?? false} onChange={v => set('allowReview', v)} />
          </Section>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section icon={<Trophy className="h-5 w-5" />} title="Chấm điểm" desc="Quy tắc tính điểm cho dạng câu hỏi đặc biệt.">
              <Field label="Thang điểm câu Đúng/Sai (compound T/F)">
                <select value={form.tfScoringMode ?? 'all_or_nothing'} onChange={e => set('tfScoringMode', e.target.value as Exam['tfScoringMode'])} className={inputClass}>
                  <option value="all_or_nothing">Tất cả đúng mới được điểm (0% hoặc 100%)</option>
                  <option value="thpt2025">THPT 2025 — 1/4: 10%, 2/4: 25%, 3/4: 50%, 4/4: 100%</option>
                </select>
              </Field>
            </Section>

            <Section icon={<MessageSquareWarning className="h-5 w-5" />} title="Thông báo trước khi vào thi" desc="Lời nhắc giúp học sinh nắm quy định trước khi bắt đầu.">
              <Field label="Nội dung thông báo (tùy chọn)">
                <textarea rows={5} value={form.preExamNotice ?? ''} onChange={e => set('preExamNotice', e.target.value || undefined)} className={`${inputClass} resize-none`} placeholder="VD: Đây là bài kiểm tra 15 phút. Nghiêm cấm sử dụng tài liệu..." />
              </Field>
            </Section>
          </div>

          <div className="flex flex-col-reverse gap-3 rounded-xl border border-[#c0c7d3]/50 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setForm(exam)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c0c7d3] px-4 py-2.5 text-sm font-semibold text-[#414751] transition hover:bg-[#f0f3ff]">
              <RotateCcw className="h-4 w-4" /> Khôi phục ban đầu
            </button>
            <div className="flex gap-3">
              <button onClick={() => navigate(-1)} className="flex-1 rounded-lg border border-[#c0c7d3] px-4 py-2.5 text-sm font-semibold text-[#414751] transition hover:bg-[#f0f3ff] sm:flex-none">Đóng</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#005ea1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2178c3] disabled:opacity-60 sm:flex-none">
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
  <section className="rounded-xl border border-[#c0c7d3]/50 bg-white p-5 shadow-[0_4px_12px_rgba(49,130,206,0.05)]">
    <div className="mb-5 flex items-start gap-3 border-b border-[#c0c7d3]/30 pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d2e4ff] text-[#005ea1]">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-[#121c2c]">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-5 text-[#414751]">{desc}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#414751]">{label}</label>
    {children}
  </div>
);

const ToggleRow = ({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[#c0c7d3]/40 bg-[#f9f9ff] p-3">
    <div>
      <p className="text-sm font-bold text-[#121c2c]">{title}</p>
      <p className="mt-0.5 text-xs font-medium leading-5 text-[#717782]">{desc}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

const ToggleCard = ({ icon, title, desc, checked, onChange }: { icon: ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${checked ? 'border-[#005ea1] bg-[#d2e4ff]/45 shadow-[0_4px_12px_rgba(49,130,206,0.10)]' : 'border-[#c0c7d3]/60 bg-white hover:border-[#005ea1]/40 hover:bg-[#f0f3ff]'}`}
  >
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${checked ? 'bg-[#005ea1] text-white' : 'bg-[#f0f3ff] text-[#005ea1]'}`}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-[#121c2c]">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-[#414751]">{desc}</span>
    </span>
    <Toggle checked={checked} onChange={onChange} />
  </button>
);

const PolicyOption = ({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg border p-4 text-left transition ${active ? 'border-[#005ea1] bg-[#d2e4ff]/45 ring-2 ring-[#9fcaff]/30' : 'border-[#c0c7d3]/60 bg-white hover:border-[#005ea1]/40 hover:bg-[#f0f3ff]'}`}
  >
    <span className="flex items-start gap-3">
      <span className={`mt-0.5 h-4 w-4 rounded-full border ${active ? 'border-[#005ea1] bg-[#005ea1] shadow-[inset_0_0_0_3px_white]' : 'border-[#717782]'}`} />
      <span>
        <span className="block text-sm font-bold text-[#121c2c]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#414751]">{desc}</span>
      </span>
    </span>
  </button>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#005ea1]' : 'bg-[#d0daf0]'}`}
    aria-pressed={checked}
  >
    <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const MiniMetric = ({ icon, label, value, tone = 'blue' }: { icon: ReactNode; label: string; value: string; tone?: 'blue' | 'green' | 'slate' }) => {
  const toneClass = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : tone === 'slate'
      ? 'bg-slate-50 text-slate-600 border-slate-100'
      : 'bg-[#f0f3ff] text-[#005ea1] border-[#d2e4ff]';

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-lg font-bold">{value}</p>
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-75">{label}</p>
    </div>
  );
};

const SummaryItem = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <li className="flex items-start gap-2">
    <span className="mt-0.5 text-[#005ea1]">{icon}</span>
    <span>{text}</span>
  </li>
);
