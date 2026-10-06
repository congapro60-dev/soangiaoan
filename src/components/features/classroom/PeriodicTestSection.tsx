import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import {
  countKeyQuestions, examMarkLabels, splitVariantSources, type ExamVariant,
} from '../../../lib/classroom/examVariants';
import { readExamSourceFile } from '../../../lib/classroom/readExamSourceFile';
import { loadScoreBook } from '../../../lib/classroom/teacherService';
import { extractExamVariantKeys } from '../../../services/gradingApi';

export interface PeriodicTestState {
  variants: ExamVariant[];
  sheetLabel: string;
  busy: boolean;
  /** Lý do chưa giao được (thiếu đáp án, trùng mã…). Rỗng = sẵn sàng. */
  problems: string[];
}

interface Props {
  classId: string;
  onChange: (state: PeriodicTestState) => void;
}

interface Row extends ExamVariant {
  files: string[];
}

const O = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-blue-400';

/** Dòng đầu có nghĩa của đề (bỏ dòng tên trường/sở) — để giáo viên nhận ra đúng đề của mã. */
const firstQuestion = (text: string): string =>
  text.split('\n').find(line => /^\s*(?:câu|bài)\s*1\b/iu.test(line))?.trim().slice(0, 140) ?? text.split('\n')[0]?.slice(0, 140) ?? '';

const problemsOf = (rows: readonly Row[]): string[] => {
  if (rows.length === 0) return ['Chưa có mã đề nào — chọn file đề + đáp án.'];
  const out: string[] = [];
  const codes = rows.map(row => row.code.trim());
  if (codes.some(code => !/^[0-9A-Za-z]{1,8}$/u.test(code))) out.push('Có mã đề để trống hoặc sai dạng (chỉ chữ số/chữ cái, tối đa 8 ký tự).');
  if (new Set(codes).size !== codes.length) out.push('Có hai dòng trùng mã đề.');
  const missing = rows.filter(row => !row.answerKey.trim()).map(row => row.code);
  if (missing.length > 0) out.push(`Mã ${missing.join(', ')} chưa có đáp án.`);
  return out;
};

/**
 * Bài kiểm tra định kì: giáo viên thả MỌI file đề + đáp án một lần (khối 12: một file gộp; khối khác: mỗi mã một file).
 * App tách mã, AI rút đáp án từng mã, giáo viên soát/sửa trong bảng rồi mới giao. Học sinh không nhận file đề.
 */
export const PeriodicTestSection = ({ classId, onChange }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [material, setMaterial] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sheetLabel, setSheetLabel] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [open, setOpen] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadScoreBook(classId).then(book => { if (!cancelled) setLabels(examMarkLabels(book.exams)); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [classId]);

  useEffect(() => {
    onChange({
      variants: rows.map(({ code, sourceText, answerKey }) => ({ code: code.trim(), sourceText, answerKey: answerKey.trim() })),
      sheetLabel: sheetLabel.trim(),
      busy: busy !== '',
      problems: problemsOf(rows),
    });
  }, [rows, sheetLabel, busy, onChange]);

  const extractKeys = async (current: readonly Row[], answerMaterial: string) => {
    if (current.length === 0 || !answerMaterial.trim()) return;
    setBusy(`AI đang rút đáp án ${current.length} mã đề…`);
    setError('');
    try {
      const hints = Object.fromEntries(current.map(row => [row.code, firstQuestion(row.sourceText)]));
      const keys = await extractExamVariantKeys(classId, current.map(row => row.code), answerMaterial, hints);
      setRows(previous => previous.map(row => (keys[row.code] && !row.answerKey.trim() ? { ...row, answerKey: keys[row.code] } : row)));
      const found = current.filter(row => keys[row.code]).length;
      if (found < current.length) setError(`AI chỉ tìm được đáp án của ${found}/${current.length} mã — dán đáp án cho các mã còn lại.`);
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
      const sources = await Promise.all(files.map(file => readExamSourceFile(file).catch(() => ({ name: file.name, text: '' }))));
      const plan = splitVariantSources(sources);
      const next = plan.variants.map(variant => ({ code: variant.code, sourceText: variant.sourceText, answerKey: '', files: variant.files }));
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

  const update = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const problems = problemsOf(rows);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border-2 border-dashed p-4 transition ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void readFiles(Array.from(event.dataTransfer.files)); }}
      >
        <p className="text-sm font-black text-slate-800">1. Đề + đáp án của mọi mã đề</p>
        <p className="mb-3 mt-1 text-xs font-semibold leading-5 text-slate-500">
          Khối 12: thả <b>một file gộp</b> hết các mã. Khối khác: thả <b>mỗi mã một file</b> (tên file nên có mã, vd “Mã đề 101.docx”).
          Dùng file Word (.docx) hoặc PDF gốc của người ra đề. Học sinh không nhận các file này — các em chỉ chụp bài đã chấm nộp lên.
        </p>
        <input ref={fileRef} type="file" multiple accept=".docx,.pdf" className="hidden"
          onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void readFiles(files); }} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== ''}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">Chọn hoặc kéo thả file</span>
          </button>
          {rows.length > 0 && material.trim() && (
            <button type="button" onClick={() => { setRows(previous => previous.map(row => ({ ...row, answerKey: '' }))); void extractKeys(rows.map(row => ({ ...row, answerKey: '' })), material); }} disabled={busy !== ''}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">AI rút lại đáp án</span>
            </button>
          )}
        </div>
        {busy && <p className="mt-3 flex items-center gap-2 text-xs font-black text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>}
        {error && <p className="mt-3 flex items-start gap-2 text-xs font-bold text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}</p>}
        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {warnings.map(warning => <li key={warning} className="flex items-start gap-2 text-xs font-bold text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}</li>)}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-black text-slate-800">2. Soát từng mã đề <span className="whitespace-nowrap font-bold text-slate-500">({rows.length} mã)</span></p>
            <p className="text-[11px] font-bold text-slate-500">Đáp án do AI chép từ file — soát trước khi giao.</p>
          </div>
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
                    {row.files.map(name => (
                      <span key={name} className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11px] font-bold text-slate-500">
                        <FileText className="h-3 w-3 shrink-0" /><span className="truncate">{name}</span>
                      </span>
                    ))}
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={() => setOpen(isOpen ? '' : `${index}`)} className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-50">
                        {isOpen ? 'Thu gọn' : 'Xem / sửa đáp án'}
                      </button>
                      <button type="button" onClick={() => setRows(previous => previous.filter((_, i) => i !== index))} aria-label={`Bỏ mã ${row.code}`} title="Bỏ mã này"
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-1.5 break-words text-xs font-semibold text-slate-500">{firstQuestion(row.sourceText) || 'Chưa có chữ của đề mã này.'}</p>
                  {isOpen && (
                    <textarea value={row.answerKey} onChange={event => update(index, { answerKey: event.target.value })} rows={8}
                      placeholder={'Mỗi câu một dòng, vd:\nPhần I – Câu 1: A\nPhần II – Câu 1: a) Đ; b) S; c) Đ; d) S\nPhần III – Câu 1: -1,5'}
                      className={`${O} mt-2 font-mono text-xs font-normal`} />
                  )}
                </li>
              );
            })}
          </ul>
          {!busy && problems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {problems.map(problem => <li key={problem} className="flex items-start gap-2 text-xs font-black text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {problem}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-800">3. Cột điểm trong sổ điểm <span className="font-bold text-slate-500">(không bắt buộc)</span></p>
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
