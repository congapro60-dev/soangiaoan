import { RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ParentReportPrintInput } from '../../../lib/classroom/parentReportTypes';
import type { ReportOverrides } from '../../../lib/classroom/reportOverrides';

interface Props {
  /** Báo cáo tự động (chưa áp bản chỉnh) — để biết chỗ nào đã sửa và cho phép trở về. */
  base: ParentReportPrintInput;
  value: ReportOverrides;
  onChange: (next: ReportOverrides) => void;
}

const FIELD = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300';
const INPUT = `w-full ${FIELD}`;
const LEVELS = ['Xuất sắc', 'Tốt', 'Đạt yêu cầu', 'Chưa đạt yêu cầu'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Một mục có thể sửa: tiêu đề, dấu "đã chỉnh" (chỉ thầy cô thấy) và nút về bản tự động. */
const Block = ({ title, edited, onReset, children }: { title: string; edited: boolean; onReset: () => void; children: ReactNode }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-xs font-black text-slate-800">{title}</p>
      {edited && (
        <>
          <span className="whitespace-nowrap rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-800">đã chỉnh tay</span>
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-black text-slate-500 hover:text-violet-700"><RotateCcw className="h-3 w-3" /> Về bản tự động</button>
        </>
      )}
    </div>
    {children}
  </div>
);

const NumberField = ({ label, value, onChange, allowEmpty }: { label: string; value: number | null; onChange: (value: number | null) => void; allowEmpty?: boolean }) => (
  <label className="block text-[11px] font-bold text-slate-500">
    <span className="whitespace-nowrap">{label}</span>
    <input
      type="number" min={0} step="any" value={value ?? ''} className={`${INPUT} mt-0.5`}
      onChange={event => {
        if (event.target.value === '') { if (allowEmpty) onChange(null); return; }
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
    />
  </label>
);

/**
 * Sửa bất kì chữ hoặc số nào trên báo cáo của một em. Chỉ ghi chỗ thầy cô đã sửa vào `value`; sửa lại đúng bằng bản tự động thì
 * tự bỏ khỏi bản chỉnh. Dữ liệu gốc (điểm bài, Sổ điểm) không đổi — chỉ báo cáo này.
 */
export const ReportOverridesEditor = ({ base, value, onChange }: Props) => {
  const report = base.report;
  const set = (patch: ReportOverrides) => {
    const next: Record<string, unknown> = { ...value, ...patch };
    for (const key of Object.keys(patch)) {
      const auto = key in report ? (report as unknown as Record<string, unknown>)[key]
        : key === 'moet' ? base.exams?.moet : key === 'tds' ? base.exams?.tds : key === 'hs1' ? base.hs1
          : key === 'competencyItems' ? base.competency?.items : key === 'results' ? [] : undefined;
      if (same(next[key], auto)) delete next[key];
    }
    onChange(next as ReportOverrides);
  };
  const reset = (...keys: (keyof ReportOverrides)[]) => {
    const next = { ...value };
    for (const key of keys) delete next[key];
    onChange(next);
  };
  const edited = (...keys: (keyof ReportOverrides)[]) => keys.some(key => value[key] !== undefined);

  const listField = (title: string, key: 'strengths' | 'areasToPractice' | 'parentActions' | 'teacherActions', hint: string) => (
    <Block title={title} edited={edited(key)} onReset={() => reset(key)}>
      <textarea
        rows={Math.min(8, Math.max(3, (value[key] ?? report[key]).length + 1))}
        value={(value[key] ?? report[key]).join('\n')}
        onChange={event => set({ [key]: event.target.value.split('\n') })}
        className={`${INPUT} leading-6`}
      />
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p>
    </Block>
  );

  const results = report.results;
  const resultEdit = (id: string) => value.results?.find(item => item.id === id);
  const patchResult = (id: string, patch: Partial<NonNullable<ReportOverrides['results']>[number]>) => {
    const others = (value.results ?? []).filter(item => item.id !== id);
    set({ results: [...others, { ...(resultEdit(id) ?? { id }), ...patch }] });
  };

  const marks = (title: string, key: 'moet' | 'tds', withLetter: boolean) => {
    const rows = value[key] ?? base.exams?.[key] ?? [];
    return (
      <Block title={title} edited={edited(key)} onReset={() => reset(key)}>
        <div className="space-y-1.5">
          {rows.map((mark, index) => (
            <div key={index} className={`grid items-center gap-1.5 sm:gap-2 ${withLetter ? 'grid-cols-[minmax(0,1fr)_60px_48px_auto]' : 'grid-cols-[minmax(0,1fr)_72px_auto]'}`}>
              <input value={mark.label} onChange={event => set({ [key]: rows.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)) })} className={INPUT} aria-label="Tên cột điểm" />
              <input type="number" step="any" value={mark.score} onChange={event => set({ [key]: rows.map((row, i) => (i === index ? { ...row, score: Number(event.target.value) } : row)) })} className={INPUT} aria-label="Điểm" />
              {withLetter && <input value={mark.letter ?? ''} onChange={event => set({ [key]: rows.map((row, i) => (i === index ? { ...row, letter: event.target.value || undefined } : row)) })}  className={INPUT} aria-label="Điểm chữ" placeholder="Chữ" />}
              <button type="button" onClick={() => set({ [key]: rows.filter((_, i) => i !== index) })} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Bỏ cột điểm"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ [key]: [...rows, { label: 'Điểm mới', score: 0 }] })} className="mt-2 text-xs font-black text-violet-700 hover:underline">+ Thêm cột điểm</button>
      </Block>
    );
  };

  const hs1 = value.hs1 ?? base.hs1 ?? [];
  const competency = value.competencyItems ?? base.competency?.items ?? [];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold leading-5 text-slate-500">
        Sửa bất kì chỗ nào bên dưới. Chỉ báo cáo này đổi; điểm bài và Sổ điểm giữ nguyên. Bấm <b>Lưu</b> ở trên — báo cáo đã gửi phụ huynh cập nhật ngay.
        Chỗ đã chỉnh có dấu “đã chỉnh tay” (chỉ thầy cô thấy).
      </p>

      <Block title="Nhận xét chung về con" edited={edited('overallSummary')} onReset={() => reset('overallSummary')}>
        <textarea rows={4} value={value.overallSummary ?? report.overallSummary} onChange={event => set({ overallSummary: event.target.value })} className={`${INPUT} leading-6`} />
      </Block>

      {listField('Điểm mạnh', 'strengths', 'Mỗi dòng một ý.')}
      {listField('Cần rèn thêm', 'areasToPractice', 'Mỗi dòng một ý.')}
      {listField('Phụ huynh có thể đồng hành cùng con', 'parentActions', 'Mỗi dòng một việc.')}
      {listField('Thầy cô sẽ hỗ trợ con', 'teacherActions', 'Mỗi dòng một việc.')}

      <Block title="Số liệu đầu trang" edited={edited('officialCount', 'pendingCount', 'missingCount', 'officialAveragePercent')} onReset={() => reset('officialCount', 'pendingCount', 'missingCount', 'officialAveragePercent')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NumberField label="Bài đã có kết quả" value={value.officialCount ?? report.officialCount} onChange={v => set({ officialCount: v ?? 0 })} />
          <NumberField label="Điểm trung bình (%)" value={value.officialAveragePercent !== undefined ? value.officialAveragePercent : report.officialAveragePercent} allowEmpty onChange={v => set({ officialAveragePercent: v })} />
          <NumberField label="Chờ xử lý" value={value.pendingCount ?? report.pendingCount} onChange={v => set({ pendingCount: v ?? 0 })} />
          <NumberField label="Chưa nộp" value={value.missingCount ?? report.missingCount} onChange={v => set({ missingCount: v ?? 0 })} />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">Để trống ô điểm trung bình thì báo cáo ghi “chưa đủ bài để tính”.</p>
      </Block>

      {results.length > 0 && (
        <Block title="Kết quả theo bài" edited={edited('results')} onReset={() => reset('results')}>
          <div className="space-y-1.5">
            {results.map(result => {
              const edit = resultEdit(result.assignmentId);
              const score = edit?.score !== undefined ? edit.score : result.score;
              const max = edit?.maxScore !== undefined ? edit.maxScore : result.maxScore;
              return (
                <div key={result.assignmentId} className={`flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2 ${edit?.hidden ? 'opacity-50' : ''}`}>
                  <input value={edit?.title ?? result.title} onChange={event => patchResult(result.assignmentId, { title: event.target.value })} className={`${INPUT} basis-full sm:min-w-0 sm:flex-1 sm:basis-0`} aria-label="Tên bài" />
                  <input type="number" step="any" value={score ?? ''} onChange={event => patchResult(result.assignmentId, { score: event.target.value === '' ? null : Number(event.target.value) })} className={`${FIELD} w-20`} aria-label="Điểm" />
                  <span className="text-slate-400">/</span>
                  <input type="number" step="any" value={max ?? ''} onChange={event => patchResult(result.assignmentId, { maxScore: event.target.value === '' ? null : Number(event.target.value) })} className={`${FIELD} w-20`} aria-label="Thang điểm" />
                  <button type="button" onClick={() => patchResult(result.assignmentId, { hidden: !edit?.hidden || undefined })} className="whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-black text-slate-500 hover:bg-slate-100">{edit?.hidden ? 'Hiện lại' : 'Ẩn'}</button>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Từ trái sang: tên bài, điểm, thang điểm. “Ẩn” chỉ gỡ bài khỏi báo cáo này.</p>
        </Block>
      )}

      {marks('Điểm định kì (thang 10)', 'moet', false)}
      {marks('Điểm theo quý (TDS)', 'tds', true)}

      <Block title="Điểm hệ số 1" edited={edited('hs1')} onReset={() => reset('hs1')}>
        <div className="space-y-1.5">
          {hs1.map((mark, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-1.5 sm:gap-2">
              <input value={mark.label} onChange={event => set({ hs1: hs1.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)) })} className={INPUT} aria-label="Tên cột điểm" />
              <input type="number" step="any" value={mark.score} onChange={event => set({ hs1: hs1.map((row, i) => (i === index ? { ...row, score: Number(event.target.value) } : row)) })} className={INPUT} aria-label="Điểm" />
              <button type="button" onClick={() => set({ hs1: hs1.filter((_, i) => i !== index) })} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Bỏ cột điểm"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ hs1: [...hs1, { label: 'Điểm mới', date: '', score: 0 }] })} className="mt-2 text-xs font-black text-violet-700 hover:underline">+ Thêm cột điểm</button>
      </Block>

      {base.competency && base.competency.total > 0 && (
        <Block title="Năng lực Toán học" edited={edited('competencyItems')} onReset={() => reset('competencyItems')}>
          <div className="space-y-1.5">
            {competency.map((item, index) => (
              <div key={`${item.topic}-${index}`} className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
                <input value={item.topic} onChange={event => set({ competencyItems: competency.map((row, i) => (i === index ? { ...row, topic: event.target.value } : row)) })} className={`${INPUT} basis-full sm:min-w-0 sm:flex-1 sm:basis-0`} aria-label="Tên năng lực" />
                <select value={item.level} onChange={event => set({ competencyItems: competency.map((row, i) => (i === index ? { ...row, level: event.target.value as typeof LEVELS[number] } : row)) })} className={`${INPUT} min-w-0 flex-1 sm:w-40 sm:flex-none`} aria-label="Mức năng lực">
                  {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
                <button type="button" onClick={() => set({ competencyItems: competency.filter((_, i) => i !== index) })} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Bỏ năng lực"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
};
