import { useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import {
  countKeyQuestions, keyFromMaterial, MAX_EXAM_VARIANTS, splitVariantSources, type VariantPageRef,
} from '../../../lib/classroom/examVariants';
import { aiErrorText, describeChange, diffVariants, gradedByCode, solveEach, type VariantChange } from '../../../lib/classroom/examVariantDiff';
import { readExamSourceFile, renderVariantPages } from '../../../lib/classroom/readExamSourceFile';
import { updateAssignmentContent } from '../../../lib/classroom/submissionService';
import { extractExamVariantKeys, solveAnswerKey, suggestRubric } from '../../../services/gradingApi';

interface Draft {
  code: string;
  sourceText: string;
  answerKey: string;
  files: string[];
  pageRefs: VariantPageRef[];
  byAi: boolean;
  uncertainties: string[];
}

const blank = (patch: Partial<Draft>): Draft => ({ code: '', sourceText: '', answerKey: '', files: [], pageRefs: [], byAi: false, uncertainties: [], ...patch });

const firstQuestion = (text: string): string =>
  text.split('\n').find(line => /^\s*(?:câu|bài)\s*1\b/iu.test(line))?.trim().slice(0, 140) ?? text.split('\n')[0]?.slice(0, 140) ?? '';

/** Mã đã lưu mà bản đang sửa không còn, nhưng còn bài đã chấm theo mã đó — cảnh báo SỚM, bài không bị xóa. */
export const removedWithGraded = (saved: readonly { code: string }[], drafts: readonly { code: string }[], submissions: readonly SubmissionDoc[]) => {
  const kept = new Set(drafts.map(draft => draft.code.trim()));
  return saved.map(variant => variant.code.trim()).filter(code => code && !kept.has(code))
    .map(code => ({ code, count: gradedByCode(submissions, code).ai.length + gradedByCode(submissions, code).edited }))
    .filter(item => item.count > 0);
};

/** Bảng gợi ý chấm lại THEO MÃ sau khi Lưu. Chỉ đếm bài đã chấm bằng AI; không tự chấm lại. */
export const RegradeSuggestions = ({ changes, submissions, busyCode = '', onRegrade }: {
  changes: readonly VariantChange[];
  submissions: readonly SubmissionDoc[];
  busyCode?: string;
  onRegrade?: (code: string) => void;
}) => {
  if (changes.length === 0) return null;
  const rows = changes.map(change => ({ change, graded: gradedByCode(submissions, change.code) }));
  const total = rows.filter(row => row.change.kind === 'changed').reduce((sum, row) => sum + row.graded.ai.length, 0);
  const lost = rows.filter(row => row.change.kind === 'removed' && row.graded.ai.length + row.graded.edited > 0);
  return <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-2" aria-label="Gợi ý chấm lại theo mã">
    <p className="text-xs font-black text-indigo-900">Gợi ý chấm lại theo mã — máy không tự chấm lại, thầy cô bấm từng mã.</p>
    {lost.map(row => (
      <p key={row.change.code} role="alert" className="mt-1 flex items-start gap-1 text-xs font-black text-red-700">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Mã {row.change.code} đã bỏ nhưng còn {row.graded.ai.length + row.graded.edited} bài đã chấm theo mã này — bài KHÔNG bị xóa; chọn lại mã đề cho từng bài rồi chấm lại.
      </p>
    ))}
    <table className="mt-2 w-full text-left text-xs">
      <thead><tr className="font-black text-slate-500"><th className="py-1 pr-2">Mã</th><th className="pr-2">Thay đổi</th><th className="pr-2">Số bài đã chấm bằng AI</th><th /></tr></thead>
      <tbody>
        {rows.map(({ change, graded }) => (
          <tr key={change.code} className="border-t border-indigo-100 font-semibold text-slate-700">
            <td className="py-1 pr-2 font-black">{change.code}</td>
            <td className="pr-2">{describeChange(change)}</td>
            <td className="pr-2">
              {change.kind === 'removed' ? `${graded.ai.length + graded.edited} bài` : graded.ai.length === 0 && graded.edited === 0 ? '0 (chưa có bài chấm)' : `${graded.ai.length} bài`}
              {graded.edited > 0 && change.kind !== 'removed' && <span className="text-slate-500"> (+{graded.edited} bài sửa tay, giữ nguyên)</span>}
            </td>
            <td>
              {change.kind === 'changed' && graded.ai.length > 0 && onRegrade
                ? <button type="button" onClick={() => onRegrade(change.code)} disabled={busyCode !== ''}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2 font-black text-indigo-700 disabled:opacity-50">
                  {busyCode === change.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Chấm lại mã {change.code}
                </button>
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-1 text-xs font-bold text-slate-600">{total} bài AI sẽ chấm lại theo mã đã chọn. Bài thầy cô sửa tay giữ nguyên.</p>
  </div>;
};

/**
 * Sửa / thêm / bỏ MÃ ĐỀ + ĐÁP ÁN của bài kiểm tra định kì — sau khi đã giao.
 *
 * Dùng cùng bộ máy với lúc Giao bài (thả file đề/đáp án, AI giải đề, AI đề xuất hướng dẫn chấm). Lưu xong, web tự so
 * từng mã với bản cũ và gợi ý chấm lại THEO MÃ (chỉ bài đã chấm bằng AI) — không tự chấm lại.
 */
export const ExamVariantsEditor = ({ assignment, submissions = [], initialChanges = [], onSaved, onRegradeCode }: {
  assignment: AssignmentDoc;
  submissions?: readonly SubmissionDoc[];
  /** Bảng gợi ý của lần Lưu gần nhất — panel giữ hộ vì danh sách bài giao tải lại sẽ dựng lại màn này. */
  initialChanges?: readonly VariantChange[];
  onSaved?: (changes: VariantChange[]) => void;
  /** Chấm lại các bài đã chấm bằng AI của đúng một mã (đường "Chấm lại" của AssignmentPanel). */
  onRegradeCode?: (code: string) => Promise<void>;
}) => {
  const [drafts, setDrafts] = useState<Draft[]>(() => (assignment.examVariants || []).map(variant => blank({
    code: variant.code, sourceText: variant.sourceText || '', answerKey: variant.answerKey || '',
  })));
  const [rubric, setRubric] = useState(assignment.rubric || '');
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [changes, setChanges] = useState<VariantChange[]>([...initialChanges]);
  const [regradeCode, setRegradeCode] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Map<string, File>>(new Map());
  const draftsRef = useRef<Draft[]>(drafts);
  draftsRef.current = drafts;
  const maxScore = assignment.maxScore ?? 10;
  const gradingInstructions = assignment.gradingInstructions || '';
  const idle = !busy && working === '';

  const capNhat = (index: number, patch: Partial<Draft>) => setDrafts(values => values.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const patchByCode = (code: string, patch: Partial<Draft>) => setDrafts(values => values.map(row => (row.code.trim() === code ? { ...row, ...patch } : row)));
  const themMa = () => {
    setDrafts(values => {
      if (values.length >= MAX_EXAM_VARIANTS) return values;
      const ma = String(values.length + 1).padStart(3, '0');
      const nguon = values[0];
      return [...values, blank({ code: ma, sourceText: nguon?.sourceText || '' })];
    });
  };
  const boMa = (index: number) => setDrafts(values => values.filter((_, i) => i !== index));

  const extractKeys = async (current: readonly Draft[], material: string) => {
    if (current.length === 0 || !material.trim()) return;
    const direct = current.length === 1 ? keyFromMaterial(material) : null;
    if (direct) {
      patchByCode(current[0].code.trim(), { answerKey: direct, byAi: false, uncertainties: [] });
      return;
    }
    setWorking(`AI đang rút đáp án ${current.length} mã đề…`);
    try {
      const codes = current.map(row => row.code.trim());
      const hints = Object.fromEntries(current.map(row => [row.code.trim(), firstQuestion(row.sourceText)]));
      const keys = await extractExamVariantKeys(assignment.classId, codes, material, hints);
      setDrafts(values => values.map(row => (keys[row.code.trim()] ? { ...row, answerKey: keys[row.code.trim()], byAi: false, uncertainties: [] } : row)));
      const found = codes.filter(code => keys[code]).length;
      if (found < codes.length) setError(`File chỉ có đáp án của ${found}/${codes.length} mã — dán đáp án hoặc bấm “Để AI giải đề” cho các mã còn lại.`);
    } catch (reason) {
      setError(aiErrorText(reason));
    }
  };

  const readFiles = async (files: File[]) => {
    if (files.length === 0 || !idle) return;
    setWorking('Đang đọc file…'); setError(''); setMessage('');
    try {
      files.forEach(file => filesRef.current.set(file.name, file));
      const sources = await Promise.all(files.map(file => readExamSourceFile(file).catch(() => ({ name: file.name, text: '' }))));
      const plan = splitVariantSources(sources);
      setWarnings(plan.warnings);
      const merged = draftsRef.current.slice();
      for (const variant of plan.variants) {
        const at = variant.code ? merged.findIndex(row => row.code.trim() === variant.code) : -1;
        const patch = { sourceText: variant.sourceText || (at >= 0 ? merged[at].sourceText : ''), files: variant.files, pageRefs: variant.pageRefs };
        if (at >= 0) merged[at] = { ...merged[at], ...patch };
        else if (merged.length < MAX_EXAM_VARIANTS) merged.push(blank({ code: variant.code, ...patch }));
      }
      setDrafts(merged);
      await extractKeys(merged.filter(row => row.code.trim() && plan.variants.some(variant => variant.code === row.code.trim())), plan.answerMaterial);
    } catch (reason) {
      setError(aiErrorText(reason));
    } finally { setWorking(''); }
  };

  /** AI giải đề MỘT mã — đề PDF gửi ẢNH trang của mã đó; kết quả là bản NHÁP để thầy cô soát rồi mới Lưu. */
  const solveRow = async (code: string) => {
    const row = draftsRef.current.find(item => item.code.trim() === code);
    if (!row) return;
    let renderError = '';
    const { images, truncated } = await renderVariantPages(row.pageRefs, filesRef.current).catch((reason: unknown) => {
      renderError = reason instanceof Error ? reason.message : 'lỗi không rõ';
      return { images: [] as string[], truncated: false };
    });
    if (!row.sourceText.trim() && images.length === 0) throw new Error('không đọc được nội dung đề. Thả lại file Word/PDF gốc của mã này, hoặc dán đáp án tay.');
    const result = await solveAnswerKey(assignment.classId, row.sourceText, images, maxScore, gradingInstructions, true);
    const notes = [...result.uncertainties];
    if (images.length === 0) {
      notes.push(row.pageRefs.length > 0
        ? `Không vẽ được ảnh các trang PDF${renderError ? ` (${renderError})` : ''}: AI chỉ đọc được chữ — soát kỹ các câu có hình.`
        : 'AI chỉ đọc được chữ của đề, không thấy hình/đồ thị — soát kỹ các câu có hình.');
    }
    if (truncated) notes.push('Đề dài hơn 6 trang: AI chỉ đọc 6 trang đầu — soát các câu ở trang sau.');
    patchByCode(code, { answerKey: result.answerKey, byAi: true, uncertainties: notes });
  };

  const solveMany = async (codes: string[]) => {
    setError(''); setMessage('');
    const { failed, errors } = await solveEach(codes, solveRow, (code, index, total) => setWorking(`AI đang giải đề mã ${code} (${index + 1}/${total})…`));
    if (failed.length > 0) setError(`${errors.join(' ')} Thử lại hoặc dán đáp án tay.`);
    setWorking('');
  };

  const suggestRubricFromKey = async () => {
    const source = drafts.find(row => row.answerKey.trim());
    if (!source) return;
    setWorking('AI đang soạn hướng dẫn chấm…'); setError('');
    try {
      setRubric(await suggestRubric(assignment.classId, source.answerKey, maxScore, gradingInstructions));
      setMessage(`AI soạn hướng dẫn chấm từ đáp án mã ${source.code}. Soát lại cho khớp cách thầy cô chấm rồi Lưu.`);
    } catch (reason) {
      setError(aiErrorText(reason));
    } finally { setWorking(''); }
  };

  const luu = async () => {
    if (!idle) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const variants = drafts.map(draft => ({ code: draft.code.trim(), sourceText: draft.sourceText, answerKey: draft.answerKey.trim() }))
        .filter(draft => draft.code);
      if (variants.length === 0) throw new Error('Cần ít nhất một mã đề.');
      const thieu = variants.filter(variant => !variant.answerKey).map(variant => variant.code);
      if (thieu.length) throw new Error(`Mã đề ${thieu.join(', ')} chưa có đáp án.`);
      const rubricChanged = rubric.trim() !== (assignment.rubric || '').trim();
      const diff = diffVariants(assignment.examVariants || [], variants, rubricChanged);
      await updateAssignmentContent(assignment.id, { examVariants: variants, ...(rubricChanged ? { rubric: rubric.trim() } : {}) });
      setChanges(diff);
      setMessage(diff.some(change => change.kind !== 'same') ? 'Đã lưu mã đề + đáp án. Xem gợi ý chấm lại theo mã bên dưới.' : 'Đã lưu — không mã nào đổi nên không cần chấm lại.');
      onSaved?.(diff);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được. Thử lại sau ít phút.');
    } finally { setBusy(false); }
  };

  const regrade = async (code: string) => {
    if (!onRegradeCode || regradeCode) return;
    setRegradeCode(code);
    try { await onRegradeCode(code); } catch (reason) { setError(aiErrorText(reason, code)); } finally { setRegradeCode(''); }
  };

  const noKey = drafts.filter(row => !row.answerKey.trim() && row.code.trim()).map(row => row.code.trim());
  const lost = removedWithGraded(assignment.examVariants || [], drafts, submissions);

  return <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sửa mã đề &amp; đáp án</p>
    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
      Đáp án mỗi câu một dòng, ví dụ “Phần I – Câu 1: A”. Thêm mã mới thì đề được lấy theo mã đã có —
      nếu thứ tự câu khác thì sửa nhãn câu trong đáp án cho khớp.
    </p>
    <div
      className={`mt-2 rounded-xl border-2 border-dashed p-2 ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); void readFiles(Array.from(event.dataTransfer.files)); }}
    >
      <p className="text-xs font-semibold leading-5 text-slate-500">
        Thả file đề / file đáp án (Word, PDF, ảnh) để thay đề và đáp án theo mã. Đề gộp thì tách theo dòng “Mã đề …”; mỗi mã một file thì mã lấy theo tên file.
      </p>
      <input ref={fileRef} type="file" multiple accept=".docx,.pdf,image/*" className="hidden" aria-label="Chọn file đề hoặc đáp án"
        onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles(files); }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={!idle}
        className="mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 disabled:opacity-50"><Upload className="h-3.5 w-3.5" />Chọn hoặc kéo thả file</button>
      {noKey.length > 0 && <button type="button" onClick={() => void solveMany(noKey)} disabled={!idle}
        className="ml-2 mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{noKey.length === drafts.length ? 'Để AI giải đề' : `Để AI giải ${noKey.length} mã chưa có đáp án`}</button>}
      {working && <p className="mt-1 flex items-center gap-1 text-xs font-black text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />{working}</p>}
      {warnings.map(warning => <p key={warning} className="mt-1 flex items-start gap-1 text-xs font-bold text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{warning}</p>)}
    </div>
    {lost.map(item => (
      <p key={item.code} role="alert" className="mt-2 flex items-start gap-1 text-xs font-black text-red-700">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Bỏ / đổi mã {item.code}: còn {item.count} bài đã chấm theo mã này. Lưu xong các bài này KHÔNG bị xóa nhưng sẽ không còn mã đề khớp.
      </p>
    ))}
    <div className="mt-3 space-y-3">
      {drafts.map((draft, index) => (
        <div key={index} className="rounded-xl border border-slate-200 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs font-black text-slate-600">Mã
              <input value={draft.code} onChange={event => capNhat(index, { code: event.target.value })} aria-label={`Mã đề ${index + 1}`}
                className="min-h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm font-black" />
            </label>
            <span className="text-xs font-semibold text-slate-500">{countKeyQuestions(draft.answerKey)} câu có đáp án</span>
            {draft.byAi && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">AI giải — chưa kiểm</span>}
            {draft.files.map(name => <span key={name} className="inline-flex max-w-full items-center gap-1 text-[11px] font-bold text-slate-500"><FileText className="h-3 w-3 shrink-0" /><span className="truncate">{name}</span></span>)}
            <div className="ml-auto flex items-center gap-1">
              <button type="button" disabled={!idle || !draft.code.trim()} onClick={() => void solveMany([draft.code.trim()])}
                title={draft.answerKey.trim() ? 'Giải lại đề này (đè đáp án đang soạn)' : 'AI đọc đề mã này rồi giải ra đáp án nháp'}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-black text-blue-700 hover:bg-blue-50 disabled:opacity-40"><Sparkles className="h-3 w-3" />{draft.answerKey.trim() ? 'Giải lại' : 'Để AI giải đề'}</button>
              {drafts.length > 1 && <button type="button" onClick={() => boMa(index)} aria-label={`Bỏ mã đề ${draft.code}`}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-2 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" />Bỏ mã</button>}
            </div>
          </div>
          {draft.byAi && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
            <p className="flex items-start gap-1 text-xs font-black text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Đáp án này do AI giải, chưa ai kiểm. Soát lại trước khi Lưu — sai một câu là cả mã này bị chấm sai câu đó.</p>
            {draft.uncertainties.length > 0 && <ul className="mt-1 list-inside list-disc text-xs font-semibold text-amber-800">{draft.uncertainties.map(note => <li key={note}>{note}</li>)}</ul>}
          </div>}
          <textarea value={draft.answerKey} onChange={event => capNhat(index, { answerKey: event.target.value, byAi: false })} aria-label={`Đáp án mã ${draft.code}`}
            placeholder={'Phần I – Câu 1: A\nPhần I – Câu 2: C'} rows={4}
            className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800" />
        </div>
      ))}
    </div>
    <div className="mt-3 rounded-xl border border-slate-200 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-600">Hướng dẫn chấm <span className="font-bold text-slate-400">(chung cho mọi mã, không bắt buộc)</span></p>
        <button type="button" onClick={() => void suggestRubricFromKey()} disabled={!idle || !drafts.some(row => row.answerKey.trim())}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />Để AI đề xuất</button>
      </div>
      <textarea value={rubric} onChange={event => setRubric(event.target.value)} aria-label="Hướng dẫn chấm" rows={3}
        className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800" />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={themMa} disabled={!idle || drafts.length >= MAX_EXAM_VARIANTS}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Thêm mã đề</button>
      <button type="button" onClick={() => void luu()} disabled={!idle}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />{busy ? 'Đang lưu…' : 'Lưu mã đề + đáp án'}</button>
      {error && <p role="alert" className="flex w-full items-start gap-1 text-xs font-bold text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      {message && <p role="status" className="w-full text-xs font-semibold text-slate-700">{message}</p>}
    </div>
    <RegradeSuggestions changes={changes} submissions={submissions} busyCode={regradeCode} onRegrade={onRegradeCode ? code => void regrade(code) : undefined} />
  </div>;
};
