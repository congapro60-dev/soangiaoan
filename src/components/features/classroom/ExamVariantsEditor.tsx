import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import type { AssignmentDoc } from '../../../lib/classroom/types';
import { countKeyQuestions, MAX_EXAM_VARIANTS } from '../../../lib/classroom/examVariants';
import { updateAssignmentContent } from '../../../lib/classroom/submissionService';

interface Draft {
  code: string;
  sourceText: string;
  answerKey: string;
}

/**
 * Sửa / thêm / bỏ MÃ ĐỀ + ĐÁP ÁN của bài kiểm tra định kì — sau khi đã giao.
 *
 * Trước đây mã đề và đáp án bị "đóng băng" lúc giao bài: thầy cô sửa đáp án sai một câu
 * thì không sửa được, phải giao lại từ đầu. Nay thầy sửa tại chỗ; các bài đã chấm theo mã
 * cũ thì bấm "Chấm lại" để tính lại (chỉ bài cùng mã đề mới tính lại).
 */
export const ExamVariantsEditor = ({ assignment, onSaved }: { assignment: AssignmentDoc; onSaved?: () => void }) => {
  const [drafts, setDrafts] = useState<Draft[]>(() => (assignment.examVariants || []).map(variant => ({
    code: variant.code,
    sourceText: variant.sourceText || '',
    answerKey: variant.answerKey || '',
  })));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const capNhat = (index: number, patch: Partial<Draft>) => setDrafts(values => values.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const themMa = () => {
    setDrafts(values => {
      if (values.length >= MAX_EXAM_VARIANTS) return values;
      const ma = String(values.length + 1).padStart(3, '0');
      const nguon = values[0];
      return [...values, { code: ma, sourceText: nguon?.sourceText || '', answerKey: '' }];
    });
  };
  const boMa = (index: number) => setDrafts(values => values.filter((_, i) => i !== index));

  const luu = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const variants = drafts.map(draft => ({ code: draft.code.trim(), sourceText: draft.sourceText, answerKey: draft.answerKey.trim() }))
        .filter(draft => draft.code);
      if (variants.length === 0) throw new Error('Cần ít nhất một mã đề.');
      const thieu = variants.filter(variant => !variant.answerKey).map(variant => variant.code);
      if (thieu.length) throw new Error(`Mã đề ${thieu.join(', ')} chưa có đáp án.`);
      await updateAssignmentContent(assignment.id, { examVariants: variants });
      setMessage('Đã lưu mã đề + đáp án. Bài đã chấm theo mã cũ thì bấm “Chấm lại” để tính lại.');
      onSaved?.();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Chưa lưu được. Thử lại sau ít phút.');
    } finally { setBusy(false); }
  };

  return <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sửa mã đề &amp; đáp án</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
      Đáp án mỗi câu một dòng, ví dụ “Phần I – Câu 1: A”. Thêm mã mới thì đề được lấy theo mã đã có —
      nếu thứ tự câu khác thì sửa nhãn câu trong đáp án cho khớp.
    </p>
    <div className="mt-3 space-y-3">
      {drafts.map((draft, index) => (
        <div key={index} className="rounded-xl border border-slate-200 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs font-black text-slate-600">Mã
              <input value={draft.code} onChange={event => capNhat(index, { code: event.target.value })} aria-label={`Mã đề ${index + 1}`}
                className="min-h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm font-black" />
            </label>
            <span className="text-xs font-semibold text-slate-500">{countKeyQuestions(draft.answerKey)} câu có đáp án</span>
            {drafts.length > 1 && <button type="button" onClick={() => boMa(index)} aria-label={`Bỏ mã đề ${draft.code}`}
              className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-2 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" />Bỏ mã</button>}
          </div>
          <textarea value={draft.answerKey} onChange={event => capNhat(index, { answerKey: event.target.value })} aria-label={`Đáp án mã ${draft.code}`}
            placeholder={'Phần I – Câu 1: A\nPhần I – Câu 2: C'} rows={4}
            className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800" />
        </div>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={themMa} disabled={busy || drafts.length >= MAX_EXAM_VARIANTS}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Thêm mã đề</button>
      <button type="button" onClick={() => void luu()} disabled={busy}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />{busy ? 'Đang lưu…' : 'Lưu mã đề + đáp án'}</button>
      {message && <p role="status" className="w-full text-xs font-semibold text-slate-700">{message}</p>}
    </div>
  </div>;
};
