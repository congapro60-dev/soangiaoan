import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import {
  countKeyQuestions, examMarkLabels, keyFromMaterial, splitVariantSources, type ExamVariant, type VariantPageRef,
} from '../../../lib/classroom/examVariants';
import { readExamSourceFile, renderVariantPages } from '../../../lib/classroom/readExamSourceFile';
import { readSourceFile } from '../../../lib/classroom/readSourceFile';
import { loadScoreBook } from '../../../lib/classroom/teacherService';
import { extractExamVariantKeys, solveAnswerKey, suggestRubric } from '../../../services/gradingApi';

export interface PeriodicTestState {
  variants: ExamVariant[];
  sheetLabel: string;
  /** Hướng dẫn chấm chung của cả đề (cách chia điểm thành phần). */
  rubric: string;
  /** true nếu có mã nào đáp án do AI giải ra. */
  answerByAi: boolean;
  busy: boolean;
  /** Lý do chưa giao được (thiếu đáp án, trùng mã…). Rỗng = sẵn sàng. */
  problems: string[];
}

interface Props {
  classId: string;
  maxScore: number;
  /** Lệnh riêng cho AI — dùng khi AI giải đề / đề xuất hướng dẫn chấm, và lưu cùng bài giao. */
  gradingInstructions: string;
  onGradingInstructions: (value: string) => void;
  onChange: (state: PeriodicTestState) => void;
}

interface Row extends ExamVariant {
  files: string[];
  pageRefs: VariantPageRef[];
  /** Đáp án do AI giải ra (chưa ai kiểm). */
  byAi: boolean;
  /** Chỗ AI tự báo chưa chắc. */
  uncertainties: string[];
}

const O = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-blue-400';

/** Dòng đầu có nghĩa của đề (bỏ dòng tên trường/sở) — để giáo viên nhận ra đúng đề của mã. */
const firstQuestion = (text: string): string =>
  text.split('\n').find(line => /^\s*(?:câu|bài)\s*1\b/iu.test(line))?.trim().slice(0, 140) ?? text.split('\n')[0]?.slice(0, 140) ?? '';

const problemsOf = (rows: readonly Row[]): string[] => {
  if (rows.length === 0) return ['Chưa có mã đề nào — chọn file đề.'];
  const out: string[] = [];
  const codes = rows.map(row => row.code.trim());
  if (codes.some(code => !/^[0-9A-Za-z]{1,8}$/u.test(code))) out.push('Có mã đề để trống hoặc sai dạng (chỉ chữ số/chữ cái, tối đa 8 ký tự).');
  if (new Set(codes).size !== codes.length) out.push('Có hai dòng trùng mã đề.');
  const missing = rows.filter(row => !row.answerKey.trim()).map(row => row.code);
  if (missing.length > 0) out.push(`Mã ${missing.join(', ')} chưa có đáp án — dán đáp án hoặc bấm “Để AI giải đề”.`);
  return out;
};

const NutPhu = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-40">
    {children}
  </button>
);

/**
 * Bài kiểm tra định kì — cùng khuôn với giao bài tập về nhà: thả đề (một file gộp hoặc mỗi mã một file), soát đáp án từng mã
 * (có đáp án thì dán/thả file, chưa có thì "Để AI giải đề"), hướng dẫn chấm, lệnh riêng cho AI. Học sinh không nhận file đề.
 */
export const PeriodicTestSection = ({ classId, maxScore, gradingInstructions, onGradingInstructions, onChange }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [material, setMaterial] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sheetLabel, setSheetLabel] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [rubric, setRubric] = useState('');
  const [rubricNote, setRubricNote] = useState('');
  const [rubricBusy, setRubricBusy] = useState(false);
  const [open, setOpen] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rubricFileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Map<string, File>>(new Map());
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;

  useEffect(() => {
    let cancelled = false;
    loadScoreBook(classId).then(book => { if (!cancelled) setLabels(examMarkLabels(book.exams)); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [classId]);

  useEffect(() => {
    onChange({
      variants: rows.map(({ code, sourceText, answerKey }) => ({ code: code.trim(), sourceText, answerKey: answerKey.trim() })),
      sheetLabel: sheetLabel.trim(),
      rubric: rubric.trim(),
      answerByAi: rows.some(row => row.byAi),
      busy: busy !== '' || rubricBusy,
      problems: problemsOf(rows),
    });
  }, [rows, sheetLabel, rubric, busy, rubricBusy, onChange]);

  const patchRow = (code: string, patch: Partial<Row>) => setRows(previous => previous.map(row => (row.code === code ? { ...row, ...patch } : row)));

  const extractKeys = async (current: readonly Row[], answerMaterial: string) => {
    if (current.length === 0 || !answerMaterial.trim()) return;
    // Một đề + đáp án đã đúng khuôn: dùng thẳng, không qua AI (không tốn lượt, không có cơ hội bị chép sai).
    const direct = current.length === 1 ? keyFromMaterial(answerMaterial) : null;
    if (direct) {
      setRows(previous => previous.map(row => (row.answerKey.trim() ? row : { ...row, answerKey: direct })));
      return;
    }
    setBusy(`AI đang rút đáp án ${current.length} mã đề…`);
    setError('');
    try {
      const hints = Object.fromEntries(current.map(row => [row.code, firstQuestion(row.sourceText)]));
      const keys = await extractExamVariantKeys(classId, current.map(row => row.code), answerMaterial, hints);
      setRows(previous => previous.map(row => (keys[row.code] && !row.answerKey.trim() ? { ...row, answerKey: keys[row.code], byAi: false } : row)));
      const found = current.filter(row => keys[row.code]).length;
      if (found < current.length) setError(`File chỉ có đáp án của ${found}/${current.length} mã — dán đáp án hoặc bấm “Để AI giải đề” cho các mã còn lại.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI chưa rút được đáp án.');
    } finally {
      setBusy('');
    }
  };

  const readFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy('Đang đọc file…');
    setError('');
    try {
      filesRef.current = new Map(files.map(file => [file.name, file]));
      const sources = await Promise.all(files.map(file => readExamSourceFile(file).catch(() => ({ name: file.name, text: '' }))));
      const plan = splitVariantSources(sources);
      const next: Row[] = plan.variants.map(variant => ({
        code: variant.code, sourceText: variant.sourceText, answerKey: '', files: variant.files, pageRefs: variant.pageRefs, byAi: false, uncertainties: [],
      }));
      setRows(next);
      setMaterial(plan.answerMaterial);
      setWarnings(plan.warnings);
      setBusy('');
      await extractKeys(next, plan.answerMaterial);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đọc được file.');
      setBusy('');
    }
  };

  /**
   * AI giải đề MỘT mã. Đề PDF gửi ẢNH các trang của đúng mã đó (đề Toán nhiều hình/đồ thị — lớp chữ PDF không có hình);
   * đề Word chỉ có chữ. Kết quả đổ vào ô để giáo viên SOÁT, không dùng thẳng.
   */
  const solveRow = async (code: string): Promise<boolean> => {
    const row = rowsRef.current.find(item => item.code === code);
    if (!row) return false;
    let renderError = '';
    const { images, truncated } = await renderVariantPages(row.pageRefs, filesRef.current).catch((reason: unknown) => {
      renderError = reason instanceof Error ? reason.message : 'lỗi không rõ';
      return { images: [] as string[], truncated: false };
    });
    if (!row.sourceText.trim() && images.length === 0) {
      setError(`Mã ${code}: không đọc được nội dung đề. Dùng file Word/PDF gốc, hoặc dán đáp án tay.`);
      return false;
    }
    const result = await solveAnswerKey(classId, row.sourceText, images, maxScore, gradingInstructions, true);
    const notes = [...result.uncertainties];
    if (images.length === 0) {
      notes.push(row.pageRefs.length > 0
        ? `Không vẽ được ảnh các trang PDF${renderError ? ` (${renderError})` : ''}: AI chỉ đọc được chữ, không thấy hình/đồ thị — soát kỹ các câu có hình.`
        : 'Đề Word: AI chỉ đọc được chữ, không thấy hình/đồ thị — soát kỹ các câu có hình.');
    }
    if (truncated) notes.push('Đề dài hơn 6 trang: AI chỉ đọc 6 trang đầu — soát các câu ở trang sau.');
    patchRow(code, { answerKey: result.answerKey, byAi: true, uncertainties: notes });
    return true;
  };

  const solveMany = async (codes: string[]) => {
    setError('');
    const failed: string[] = [];
    for (let i = 0; i < codes.length; i += 1) {
      setBusy(`AI đang giải đề mã ${codes[i]} (${i + 1}/${codes.length})…`);
      try {
        if (!await solveRow(codes[i])) failed.push(codes[i]);
      } catch (reason) {
        failed.push(codes[i]);
        setError(reason instanceof Error ? `Mã ${codes[i]}: ${reason.message}` : `Mã ${codes[i]}: AI chưa giải được.`);
      }
    }
    if (failed.length > 0) setError(previous => previous || `AI chưa giải được mã ${failed.join(', ')} — thử lại hoặc dán đáp án tay.`);
    setBusy('');
  };

  const suggestRubricFromKey = async () => {
    const source = rows.find(row => row.answerKey.trim());
    if (!source) return;
    setRubricBusy(true);
    setRubricNote('');
    try {
      setRubric(await suggestRubric(classId, source.answerKey, maxScore, gradingInstructions));
      setRubricNote(`AI soạn từ đáp án mã ${source.code}. Soát lại cách chia điểm cho khớp cách thầy cô vẫn chấm — áp dụng cho mọi mã đề.`);
    } catch (reason) {
      setRubricNote(reason instanceof Error ? reason.message : 'Không soạn được hướng dẫn chấm.');
    } finally {
      setRubricBusy(false);
    }
  };

  const readRubricFile = async (file: File) => {
    try {
      const result = await readSourceFile(file, { renderPdfPages: false });
      if (result.text) setRubric(previous => (previous ? `${previous}\n\n${result.text}` : result.text));
      setRubricNote(result.note);
    } catch (reason) {
      setRubricNote(reason instanceof Error ? reason.message : 'Không đọc được file.');
    }
  };

  const update = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const problems = problemsOf(rows);
  const noKey = rows.filter(row => !row.answerKey.trim()).map(row => row.code);
  const working = busy !== '';

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border-2 border-dashed p-4 transition ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void readFiles(Array.from(event.dataTransfer.files)); }}
      >
        <p className="text-sm font-black text-slate-800">1. Đề (và đáp án nếu có) của mọi mã đề</p>
        <p className="mb-3 mt-1 text-xs font-semibold leading-5 text-slate-500">
          Khối 12: thả <b>một file gộp</b> hết các mã. Khối khác: thả <b>mỗi mã một file</b> (tên file nên có mã, vd “Mã đề 101.docx”); chỉ một đề thì không cần mã.
          Dùng file PDF (AI đọc được cả hình) hoặc Word gốc của người ra đề. Có file đáp án thì thả cùng; chưa có thì để AI giải ở mục 2.
          Học sinh không nhận các file này — các em chỉ chụp bài đã chấm nộp lên.
        </p>
        <input ref={fileRef} type="file" multiple accept=".docx,.pdf" className="hidden"
          onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles(files); }} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={working}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Chọn hoặc kéo thả file</span>
          </button>
          {rows.length > 0 && material.trim() && (
            <NutPhu disabled={working} onClick={() => { setRows(previous => previous.map(row => ({ ...row, answerKey: '', byAi: false, uncertainties: [] }))); void extractKeys(rows.map(row => ({ ...row, answerKey: '' })), material); }}>
              <RefreshCw className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Đọc lại đáp án từ file</span>
            </NutPhu>
          )}
        </div>
        {working && <p className="mt-3 flex items-center gap-2 text-xs font-black text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>}
        {error && <p className="mt-3 flex items-start gap-2 text-xs font-bold text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}</p>}
        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {warnings.map(warning => <li key={warning} className="flex items-start gap-2 text-xs font-bold text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}</li>)}
          </ul>
        )}
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-sm font-black text-slate-800">Lệnh riêng cho AI khi chấm <span className="whitespace-nowrap">(không bắt buộc)</span></p>
          <p className="mb-2 mt-1 text-xs font-semibold leading-5 text-slate-600">
            Viết rõ phạm vi: “Bỏ Bài 4”, “Phần tự luận chấm theo hướng dẫn chấm”, “Không trừ điểm trình bày”. Lệnh chỉ dành cho giáo viên, không hiện cho học sinh,
            lưu cùng bài giao và áp dụng cho mọi lần chấm. Nút “Để AI giải đề” và “Để AI đề xuất” bên dưới cũng dùng đúng lệnh này.
          </p>
          <textarea value={gradingInstructions} onChange={event => onGradingInstructions(event.target.value)} rows={3}
            placeholder="Ví dụ: Chỉ chấm Phần I và Phần II; không tự suy ra câu ngoài đề."
            className={`${O} bg-white font-normal`} />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-800">2. Đáp án từng mã đề <span className="whitespace-nowrap font-bold text-slate-500">({rows.length} mã)</span></p>
            {noKey.length > 0 && (
              <NutPhu disabled={working} onClick={() => void solveMany(noKey)}>
                <Sparkles className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">{noKey.length === rows.length ? 'Để AI giải đề' : `Để AI giải ${noKey.length} mã chưa có đáp án`}</span>
              </NutPhu>
            )}
          </div>
          <p className="mt-1 text-pretty text-xs font-semibold text-slate-500">
            Đáp án là mốc AI dùng để chấm, <b>không</b> gửi cho học sinh. Đáp án chép từ file hay do AI giải đều phải soát trước khi giao.
          </p>
          <ul className="mt-3 space-y-2">
            {rows.map((row, index) => {
              const count = countKeyQuestions(row.answerKey);
              const isOpen = open === `${index}`;
              return (
                <li key={index} className={`rounded-xl border p-3 ${row.answerKey.trim() ? 'border-slate-200' : 'border-rose-200 bg-rose-50/40'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-black text-slate-500">
                      Mã
                      <input value={row.code} onChange={event => update(index, { code: event.target.value })} aria-label={`Mã đề dòng ${index + 1}`}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm font-black text-slate-900 outline-none focus:border-blue-400" />
                    </label>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-black ${row.answerKey.trim() ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {row.answerKey.trim() ? `Đáp án: ${count} câu` : 'Chưa có đáp án'}
                    </span>
                    {row.byAi && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">AI giải — chưa kiểm</span>}
                    {row.files.map(name => (
                      <span key={name} className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11px] font-bold text-slate-500">
                        <FileText className="h-3 w-3 shrink-0" /><span className="truncate">{name}</span>
                      </span>
                    ))}
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                      <button type="button" disabled={working} onClick={() => void solveMany([row.code])}
                        title={row.answerKey.trim() ? 'Giải lại đề này (đè đáp án đang có)' : 'AI đọc đề mã này rồi giải ra đáp án nháp'}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                        <Sparkles className="h-3 w-3" /> {row.answerKey.trim() ? 'Giải lại' : 'Để AI giải đề'}
                      </button>
                      <button type="button" onClick={() => setOpen(isOpen ? '' : `${index}`)} className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-50">
                        {isOpen ? 'Thu gọn' : 'Xem / sửa đáp án'}
                      </button>
                      <button type="button" onClick={() => setRows(previous => previous.filter((_, i) => i !== index))} aria-label={`Bỏ mã ${row.code}`} title="Bỏ mã này"
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-1.5 break-words text-xs font-semibold text-slate-500">{firstQuestion(row.sourceText) || 'Chưa có chữ của đề mã này.'}</p>
                  {row.byAi && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="flex items-start gap-2 text-xs font-black text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Đáp án này do AI giải, chưa ai kiểm. Soát lại trước khi giao — sai một câu là cả lớp mã này bị chấm sai câu đó.
                      </p>
                      {row.uncertainties.length > 0 && (
                        <>
                          <p className="mt-2 text-xs font-black text-amber-900">AI tự báo chưa chắc / cần lưu ý:</p>
                          <ul className="mt-1 list-inside list-disc text-xs font-semibold text-amber-800">
                            {row.uncertainties.map(note => <li key={note}>{note}</li>)}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  {isOpen && (
                    // wrap="off": mỗi câu một dòng nguyên vẹn (cuộn ngang trong ô) — ngắt giữa "c) / Đ; d) S" là đọc sai đáp án.
                    <textarea value={row.answerKey} onChange={event => update(index, { answerKey: event.target.value })} rows={8} wrap="off"
                      placeholder={'Mỗi câu một dòng, vd:\nPhần I – Câu 1: A\nPhần II – Câu 1: a) Đ; b) S; c) Đ; d) S\nPhần III – Câu 1: -1,5'}
                      className={`${O} mt-2 font-mono text-xs font-normal`} />
                  )}
                </li>
              );
            })}
          </ul>
          {!working && problems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {problems.map(problem => <li key={problem} className="flex items-start gap-2 text-xs font-black text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {problem}</li>)}
            </ul>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-800">3. Hướng dẫn chấm <span className="whitespace-nowrap font-bold text-slate-500">(chung cho mọi mã)</span></p>
            <input ref={rubricFileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readRubricFile(file); }} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => rubricFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Tải file hướng dẫn</span>
              </button>
              <NutPhu disabled={rubricBusy || !rows.some(row => row.answerKey.trim())} onClick={() => void suggestRubricFromKey()}>
                {rubricBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span className="whitespace-nowrap">{rubricBusy ? 'AI đang soạn...' : 'Để AI đề xuất'}</span>
              </NutPhu>
            </div>
          </div>
          <p className="mb-2 mt-1 text-pretty text-xs font-semibold text-slate-500">
            Không bắt buộc — thiếu thì AI vẫn chấm, nhưng cách chia điểm thành phần của tự luận là do nó tự quyết. Có mục này thì mọi em được chia điểm
            theo cùng một cách. Cách chia điểm tự luận cũng có thể ghi ngay trong đáp án từng mã.
          </p>
          <textarea value={rubric} onChange={event => setRubric(event.target.value)} rows={4} className={`${O} font-normal`} />
          {rubricNote && <p className="mt-1 text-xs font-bold text-amber-700">{rubricNote}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-800">4. Cột điểm trong sổ điểm <span className="whitespace-nowrap font-bold text-slate-500">(không bắt buộc)</span></p>
        <p className="mb-2 mt-1 text-xs font-semibold leading-5 text-slate-500">
          Điểm thầy cô chấm tay là điểm chính thức. Chọn đúng cột để app so với tổng điểm AI chấm lại — lệch quá 0,5 điểm thì bài
          không tự duyệt, chờ thầy cô soát.
        </p>
        <input list={`cot-diem-${classId}`} value={sheetLabel} onChange={event => setSheetLabel(event.target.value)}
          placeholder={labels.length > 0 ? `Vd: ${labels[0]}` : 'Vd: Giữa học kì I'} className={O} />
        <datalist id={`cot-diem-${classId}`}>{labels.map(label => <option key={label} value={label} />)}</datalist>
        {labels.length === 0 && <p className="mt-1 text-[11px] font-bold text-slate-400">Sổ điểm của lớp chưa có cột điểm thi nào — có thể ghi trước, app đối chiếu khi đã đồng bộ điểm.</p>}
      </div>

      <p className="flex items-start gap-2 text-[11px] font-bold leading-5 text-slate-500">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        Khi chấm, AI tự đọc mã đề trên ảnh bài của từng em rồi chấm theo đúng đề + đáp án của mã đó. Bài không đọc được mã sẽ chờ thầy cô chọn mã.
      </p>
    </div>
  );
};
