import { Lightbulb } from 'lucide-react';
import { COMPETENCY_LEVELS, type Competency, type CompetencyLevel } from '../../../lib/classroom/competency/framework';
import { levelDescriptions } from '../../../lib/classroom/competency/levelDescriptions';
import { FIELD_GUIDE, suggestEntryText, type PortfolioTextField } from '../../../lib/classroom/competency/portfolioGuide';
import { PORTFOLIO_PROGRESS, type PortfolioEntry, type PortfolioProgress } from '../../../lib/classroom/competency/studentPortfolio';

interface Props {
  competency: Competency;
  entry: PortfolioEntry;
  role: 'student' | 'teacher';
  /** Mức app tính từ bài đã duyệt (chỉ GV thấy, làm mặc định cho mức GV). */
  suggestedLevel?: CompetencyLevel | null;
  months: readonly string[];
  onChange: (entry: PortfolioEntry) => void;
}

const TEXT_FIELDS: PortfolioTextField[] = ['goal', 'plan', 'difficulty'];
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm';

/**
 * Sửa một dòng hồ sơ năng lực — dùng chung cho HS (chỉ ô của HS) và GV (thêm mức chốt + ý kiến).
 * Mỗi ô có hướng dẫn; bảng mô tả 4 mức lấy nguyên văn file mẫu trường để HS tự đánh giá đúng.
 */
export const PortfolioEntryEditor = ({ competency, entry, role, suggestedLevel = null, months, onChange }: Props) => {
  const descriptions = levelDescriptions(competency);
  const set = (patch: Partial<PortfolioEntry>) => onChange({ ...entry, ...patch });
  const teacherLevel = entry.teacherLevel ?? suggestedLevel;

  const fillSuggestions = () => {
    const text = suggestEntryText(competency, entry, entry.timeframe || '');
    const patch: Partial<PortfolioEntry> = {};
    for (const field of TEXT_FIELDS) if (!entry[field]?.trim()) patch[field] = text[field];
    set(patch);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-black text-slate-700">{FIELD_GUIDE.selfLevel.label}{role === 'teacher' ? ' / mức GV chốt' : ''}</p>
        <p className="text-[11px] font-semibold leading-5 text-slate-500">{FIELD_GUIDE.selfLevel.hint}</p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {COMPETENCY_LEVELS.map((level, index) => {
            const self = entry.selfLevel === level;
            const gv = teacherLevel === level;
            return (
              <div key={level} className={`rounded-lg border p-2 text-left ${self ? 'border-amber-400 bg-amber-100' : 'border-slate-200 bg-white'} ${gv ? 'ring-2 ring-emerald-500' : ''}`}>
                <button type="button" className="w-full text-left" onClick={() => set({ selfLevel: self ? null : level })}
                  title={role === 'student' ? 'Bấm để chọn mức em tự đánh giá' : 'Bấm để sửa mức HS tự đánh giá'}>
                  <span className="text-xs font-black text-slate-800">{level}</span>
                  {descriptions && <span className="mt-0.5 block text-[11px] font-medium leading-4 text-slate-600">{descriptions[index]}</span>}
                </button>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-black">
                  {self && <span className="rounded bg-amber-300 px-1.5 text-amber-900">HS tự đánh giá</span>}
                  {gv && <span className="rounded bg-emerald-200 px-1.5 text-emerald-900">{entry.teacherLevel ? 'GV chốt' : 'Đề xuất từ bài đã chấm'}</span>}
                </div>
                {role === 'teacher' && (
                  <button type="button" onClick={() => set({ teacherLevel: entry.teacherLevel === level ? null : level })}
                    className={`mt-1 w-full rounded px-1.5 py-0.5 text-[10px] font-black ${entry.teacherLevel === level ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'}`}>
                    {entry.teacherLevel === level ? '✓ GV chốt mức này' : 'GV chốt mức này'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-700">Kế hoạch học tập</p>
        <button type="button" onClick={fillSuggestions} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800 hover:bg-amber-100"
          title="Điền câu mẫu vào các ô còn trống, dựa trên mức đã chọn">
          <Lightbulb className="h-3.5 w-3.5" /> Gợi ý
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEXT_FIELDS.map(field => (
          <label key={field} className={field === 'goal' ? 'sm:col-span-2' : ''}>
            <span className="text-[11px] font-black text-slate-600">{FIELD_GUIDE[field].label}</span>
            <textarea rows={2} className={inputCls} value={entry[field] ?? ''} placeholder={FIELD_GUIDE[field].placeholder}
              onChange={e => set({ [field]: e.target.value })} />
            <span className="block text-[10px] font-semibold leading-4 text-slate-400">{FIELD_GUIDE[field].hint}</span>
          </label>
        ))}
        <label>
          <span className="text-[11px] font-black text-slate-600">{FIELD_GUIDE.timeframe.label}</span>
          <select className={inputCls} value={entry.timeframe ?? ''} onChange={e => set({ timeframe: e.target.value })}>
            <option value="">— Chọn tháng —</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
            {entry.timeframe && !months.includes(entry.timeframe) && <option value={entry.timeframe}>{entry.timeframe}</option>}
          </select>
          <span className="block text-[10px] font-semibold text-slate-400">{FIELD_GUIDE.timeframe.hint}</span>
        </label>
        <label>
          <span className="text-[11px] font-black text-slate-600">{FIELD_GUIDE.progress.label}</span>
          <select className={inputCls} value={entry.progress ?? 'Chưa thực hiện'} onChange={e => set({ progress: e.target.value as PortfolioProgress })}>
            {PORTFOLIO_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="block text-[10px] font-semibold text-slate-400">{FIELD_GUIDE.progress.hint}</span>
        </label>
      </div>

      {role === 'teacher' ? (
        <label className="block">
          <span className="text-[11px] font-black text-emerald-700">Ý kiến của giáo viên hướng dẫn</span>
          <textarea rows={2} className={inputCls} value={entry.teacherComment ?? ''} placeholder="Nhận xét ngắn, cụ thể, việc em cần làm tiếp"
            onChange={e => set({ teacherComment: e.target.value })} />
        </label>
      ) : entry.teacherComment ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"><b>Ý kiến thầy cô:</b> {entry.teacherComment}</p>
      ) : null}
    </div>
  );
};
