import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Link2, Loader2, NotebookPen, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { ClassExamSheet } from '../../../lib/classroom/types';
import type { Student } from '../../../types';
import { fetchClassExamScores, inspectExamSheet } from '../../../lib/classroom/examService';
import { spreadsheetIdFromUrl } from '../../../lib/classroom/sheetsApi';
import { deleteHs1Column, linkAssignmentColumns, loadScoreBook, saveExamScores, saveExamWeights, saveHs1Column, setClassExamSheet } from '../../../lib/classroom/teacherService';
import { HS1_MAX, columnScore, parseHs1Score, parseHs1Weight, sortedHs1Columns, studentScoreView, type Hs1Column, type Hs1Weight, type ScoreBookDoc } from '../../../lib/classroom/scoreBook';

interface Props {
  classId: string;
  students: Student[];
  examSheet?: ClassExamSheet | null;
  onExamSheetChanged: () => void | Promise<void>;
  showToast: (message: string, icon?: string) => void;
}

interface ColumnDraft {
  columnId: string | null;
  label: string;
  date: string;
  weight: Hs1Weight;
  /** Cột liên kết với bài giao: ô để trống = dùng điểm tự lấy từ bài nộp. */
  linked: boolean;
  scores: Record<string, string>;
}

/** Điểm tự tính được làm mới ngầm sau chừng này để thấy bài mới nộp/chấm mà không phải bấm gì. */
const AUTO_REFRESH_MS = 30_000;

const WEIGHTS: Hs1Weight[] = [1, 2, 3];

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const ngayVn = (isoDay: string): string => {
  const [y, m, d] = isoDay.split('-');
  return d && m ? `${d}/${m}${y ? `/${y.slice(2)}` : ''}` : isoDay;
};

const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Có lỗi, thử lại sau.';

/** Tên các mốc thi theo thứ tự xuất hiện đầu tiên trong lớp. */
const examLabels = (book: ScoreBookDoc, kind: 'moet' | 'tds'): string[] => {
  const labels: string[] = [];
  for (const scores of Object.values(book.exams)) {
    for (const mark of scores[kind]) if (!labels.includes(mark.label)) labels.push(mark.label);
  }
  return labels;
};

/**
 * Sổ điểm của lớp: điểm thi định kì kéo từ file điểm (MOET/TDS) + điểm hệ số 1 giáo viên nhập.
 * Học sinh thấy phần của mình ở cổng học sinh; bản báo cáo phụ huynh đọc cùng nguồn này.
 */
export const ScoreBookPanel = ({ classId, students, examSheet, onExamSheetChanged, showToast }: Props) => {
  const [book, setBook] = useState<ScoreBookDoc | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [draft, setDraft] = useState<ColumnDraft | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [picker, setPicker] = useState<Record<string, Hs1Weight> | null>(null);
  // Tăng mỗi lần giáo viên ghi sổ: lượt làm mới ngầm xuất phát trước đó mà về sau không được đè bản vừa lưu.
  const writeVersion = useRef(0);

  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [students]);

  const reload = useCallback(async () => {
    setLoadError('');
    try {
      setBook(await loadScoreBook(classId));
    } catch (err) {
      setLoadError(errorText(err));
    }
  }, [classId]);

  useEffect(() => {
    setBook(null);
    setDraft(null);
    setUnmatched([]);
    setError('');
    void reload();
  }, [reload]);

  // Điểm tự tính theo bài nộp: làm mới ngầm khi tab đang mở, và ngay khi quay lại tab. Không đụng bản nháp đang gõ.
  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const version = writeVersion.current;
      try {
        const fresh = await loadScoreBook(classId);
        if (!stopped && version === writeVersion.current) setBook(fresh);
      } catch { /* lần sau thử lại; lỗi tải đã có nút Thử lại */ }
    };
    const timer = window.setInterval(() => void refresh(), AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [classId]);

  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    writeVersion.current += 1;
    setBusy(label);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  };

  /** Đọc file điểm MỘT lần cho cả lớp rồi thay phần điểm thi trong sổ. */
  const pullExamScores = async (spreadsheetId: string) => {
    setBusy('Đang đọc file điểm…');
    const result = await fetchClassExamScores(spreadsheetId, students.map(s => ({ id: s.id, code: s.code })));
    setBusy('Đang lưu vào sổ điểm…');
    setBook(await saveExamScores(classId, result.title, result.scores));
    setUnmatched(students.filter(s => result.unmatched.includes(s.id)).map(s => s.name));
    showToast(`Đã đồng bộ điểm thi cho ${Object.keys(result.scores).length}/${students.length} học sinh`, 'success');
  };

  const syncExams = (spreadsheetId: string) => run('Đang đọc file điểm…', () => pullExamScores(spreadsheetId));

  const linkAndSync = () => run('Đang kiểm tra file…', async () => {
    const spreadsheetId = spreadsheetIdFromUrl(linkInput);
    if (!spreadsheetId) throw new Error('Link chưa đúng. Dán link Google Sheet điểm của lớp (dạng docs.google.com/spreadsheets/d/…).');
    const info = await inspectExamSheet(spreadsheetId);
    if (!info.hasMoet && !info.hasTds) throw new Error(`File "${info.title}" không có tab MOET hay TDS — có thể dán nhầm file.`);
    await setClassExamSheet(classId, { spreadsheetId, spreadsheetTitle: info.title });
    setLinkInput('');
    await onExamSheetChanged();
    await pullExamScores(spreadsheetId);
  });

  const openNewColumn = () => {
    setError('');
    setDraft({ columnId: null, label: '', date: todayIso(), weight: 1, linked: false, scores: {} });
  };

  const openColumn = (column: Hs1Column) => {
    if (!book) return;
    setError('');
    const scores: Record<string, string> = {};
    for (const student of students) {
      // Cột liên kết chỉ nạp ô đã ghi đè tay — ô trống nghĩa là đang dùng điểm tự lấy.
      const value = book.hs1[student.id]?.[column.id];
      if (typeof value === 'number') scores[student.id] = String(value);
    }
    setDraft({ columnId: column.id, label: column.label, date: column.date, weight: column.weight, linked: Boolean(column.assignmentId), scores });
  };

  const invalidIds = useMemo(() => new Set(
    draft ? Object.entries(draft.scores).filter(([, value]) => parseHs1Score(value) === undefined).map(([id]) => id) : [],
  ), [draft]);

  const saveDraft = () => {
    if (!draft) return;
    if (invalidIds.size > 0) { setError(`Có ${invalidIds.size} ô điểm chưa đúng — nhập số từ 0 đến ${HS1_MAX}, tối đa 2 chữ số lẻ.`); return; }
    void run('Đang lưu cột điểm…', async () => {
      // Gửi đủ cả lớp: ô trống nghĩa là xoá điểm cũ của em đó ở cột này.
      const scores = Object.fromEntries(students.map(s => [s.id, draft.scores[s.id] ?? '']));
      setBook(await saveHs1Column(classId, draft.columnId, { label: draft.label, date: draft.date, weight: draft.weight }, scores));
      showToast(draft.columnId ? 'Đã cập nhật cột điểm' : 'Đã thêm cột điểm hệ số 1', 'success');
      setDraft(null);
    });
  };

  const linkedAssignmentIds = useMemo(() => new Set((book?.hs1Columns ?? []).flatMap(c => (c.assignmentId ? [c.assignmentId] : []))), [book]);

  const togglePicked = (assignmentId: string, checked: boolean) => {
    setPicker(current => {
      if (!current) return current;
      const next = { ...current };
      if (checked) next[assignmentId] = next[assignmentId] ?? 1; else delete next[assignmentId];
      return next;
    });
  };

  const savePicker = () => {
    if (!picker) return;
    const items = Object.entries(picker).map(([assignmentId, weight]) => ({ assignmentId, weight }));
    if (items.length === 0) { setError('Chọn ít nhất một bài để đưa lên sổ.'); return; }
    void run('Đang đưa bài lên sổ…', async () => {
      setBook(await linkAssignmentColumns(classId, items));
      showToast(`Đã đưa ${items.length} bài lên sổ điểm`, 'success');
      setPicker(null);
    });
  };

  const changeExamWeight = (label: string, value: string) => {
    if (!book) return;
    const weights: Record<string, Hs1Weight> = { ...(book.examWeights ?? {}) };
    const weight = parseHs1Weight(value);
    if (weight) weights[label] = weight; else delete weights[label];
    void run('Đang lưu hệ số…', async () => {
      setBook(await saveExamWeights(classId, weights));
    });
  };

  const removeColumn = () => {
    if (!draft?.columnId) return;
    if (!window.confirm(`Xoá cột "${draft.label}" và toàn bộ điểm trong cột này?`)) return;
    const columnId = draft.columnId;
    void run('Đang xoá cột…', async () => {
      setBook(await deleteHs1Column(classId, columnId));
      showToast('Đã xoá cột điểm', 'success');
      setDraft(null);
    });
  };

  const moetLabels = book ? examLabels(book, 'moet') : [];
  const tdsLabels = book ? examLabels(book, 'tds') : [];
  const hs1Columns = book ? sortedHs1Columns(book.hs1Columns) : [];

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Sổ điểm</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">Điểm thi định kì &amp; điểm có hệ số</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Học sinh xem được điểm của mình ở cổng học sinh; báo cáo gửi phụ huynh lấy điểm từ sổ này. Cột bài giao tự cập nhật theo bài nộp mới nhất; chuyên cần và TB BTVN luôn tự tính.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setError(''); setPicker({}); }} disabled={!book || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:opacity-50">
            <Link2 className="h-4 w-4" /> Đưa bài đã nộp lên sổ
          </button>
          <button type="button" onClick={openNewColumn} disabled={!book || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Thêm cột nhập tay
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-black text-violet-950"><FileSpreadsheet className="h-4 w-4" /> Điểm thi định kì (MOET + TDS)</p>
            <p className="mt-0.5 break-words text-xs font-semibold text-slate-500">
              {examSheet
                ? <>File điểm: <span className="font-black text-slate-700">{examSheet.spreadsheetTitle || examSheet.spreadsheetId}</span>{book?.examsSyncedAt ? ` · đồng bộ lần cuối ${new Date(book.examsSyncedAt).toLocaleString('vi-VN')}` : ' · chưa đồng bộ lần nào'}</>
                : 'Chưa nối file điểm. Dán link file "26-27-<lớp>" trong folder "Lộ trình Toán THPT" (khác file đồng bộ BTVN).'}
            </p>
          </div>
          {examSheet && (
            <button type="button" onClick={() => void syncExams(examSheet.spreadsheetId)} disabled={Boolean(busy) || !book} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Đồng bộ điểm thi từ Google Sheet
            </button>
          )}
        </div>
        {!examSheet && (
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={linkInput} onChange={event => setLinkInput(event.target.value)} placeholder="Dán link Google Sheet điểm của lớp (file có tab MOET/TDS)" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-400" />
            <button type="button" onClick={() => void linkAndSync()} disabled={Boolean(busy) || !linkInput.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-50">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Nối file &amp; đồng bộ
            </button>
          </div>
        )}
        {unmatched.length > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
            <span className="font-black">Chưa có điểm thi trong file (hoặc Mã HS không khớp):</span> {unmatched.join(', ')}
          </p>
        )}
      </div>

      {picker && book && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-950"><Link2 className="h-4 w-4" /> Chọn bài đã nộp để đưa lên sổ</p>
            <button type="button" onClick={() => setPicker(null)} aria-label="Đóng" className="rounded-full p-1.5 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">Điểm lấy từ bài nộp mới nhất của từng em (mọi điểm đã chấm), quy về thang 10 và tự đổi khi bạn chấm lại. Mỗi bài chọn một hệ số.</p>
          {(book.auto?.assignments ?? []).length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-400">Lớp chưa có bài giao nào (bài kiểm tra định kì lấy điểm từ file điểm nên không có ở đây).</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
              {(book.auto?.assignments ?? []).map(item => {
                const already = linkedAssignmentIds.has(item.id);
                const picked = picker[item.id];
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                    <input type="checkbox" checked={Boolean(picked)} onChange={event => togglePicked(item.id, event.target.checked)} aria-label={`Chọn ${item.title}`} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-800">{item.title}</span>
                      <span className="text-[11px] font-semibold text-slate-400">{ngayVn(item.date)} · {item.graded}/{item.submitted} bài đã có điểm{already ? ' · đã có trên sổ (chọn lại để đổi hệ số)' : ''}</span>
                    </span>
                    <select
                      value={picked ?? 1}
                      disabled={!picked}
                      onChange={event => setPicker({ ...picker, [item.id]: parseHs1Weight(event.target.value) ?? 1 })}
                      aria-label={`Hệ số của ${item.title}`}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-black text-slate-700 disabled:opacity-40"
                    >
                      {WEIGHTS.map(w => <option key={w} value={w}>HS{w}</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={savePicker} disabled={Boolean(busy) || Object.keys(picker).length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Đưa {Object.keys(picker).length || ''} bài lên sổ
            </button>
            <button type="button" onClick={() => setPicker(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Huỷ</button>
          </div>
        </div>
      )}

      {draft && (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-blue-950"><NotebookPen className="h-4 w-4" /> {draft.columnId ? (draft.linked ? 'Sửa cột liên kết bài giao' : 'Sửa cột điểm') : 'Cột điểm nhập tay mới'}</p>
            <button type="button" onClick={() => setDraft(null)} aria-label="Đóng" className="rounded-full p-1.5 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input value={draft.label} onChange={event => setDraft({ ...draft, label: event.target.value })} placeholder='Tên cột, vd "Kiểm tra 15 phút lần 1"' maxLength={80} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400" />
            <input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400" />
            <select value={draft.weight} onChange={event => setDraft({ ...draft, weight: parseHs1Weight(event.target.value) ?? 1 })} aria-label="Hệ số" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-blue-400">
              {WEIGHTS.map(w => <option key={w} value={w}>HS{w}</option>)}
            </select>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">{draft.linked
            ? `Ô để trống = dùng điểm tự lấy từ bài nộp (hiện mờ). Gõ số (thang ${HS1_MAX}) để ghi đè riêng em đó.`
            : `Điểm thang ${HS1_MAX} (vd 8 hoặc 8,5). Để trống nếu em chưa có điểm.`}</p>
          <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStudents.map(student => (
              <label key={student.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{student.name}</span>
                <input
                  inputMode="decimal"
                  value={draft.scores[student.id] ?? ''}
                  placeholder={draft.linked ? String(book?.auto?.linked[draft.columnId ?? '']?.[student.id] ?? '') : ''}
                  onChange={event => setDraft({ ...draft, scores: { ...draft.scores, [student.id]: event.target.value } })}
                  aria-label={`Điểm của ${student.name}`}
                  className={`w-16 shrink-0 rounded-lg border px-2 py-1 text-center text-sm font-black outline-none ${invalidIds.has(student.id) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 focus:border-blue-400'}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={saveDraft} disabled={Boolean(busy) || !draft.label.trim() || !draft.date} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Lưu cột điểm
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">Huỷ</button>
            {draft.columnId && (
              <button type="button" onClick={removeColumn} disabled={Boolean(busy)} className="ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Xoá cột</button>
            )}
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {loadError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Không tải được sổ điểm: {loadError} <button type="button" onClick={() => void reload()} className="font-black underline">Thử lại</button></p>}

      {!book && !loadError ? (
        <p className="py-8 text-center text-sm font-semibold text-slate-400">Đang tải sổ điểm…</p>
      ) : book && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-left">Học sinh</th>
                {moetLabels.length > 0 && <th colSpan={moetLabels.length} className="border-l border-slate-200 px-3 py-2 text-center text-violet-600">Định kì MOET (thang 10)</th>}
                {tdsLabels.length > 0 && <th colSpan={tdsLabels.length} className="border-l border-slate-200 px-3 py-2 text-center text-indigo-600">Điểm quý TDS</th>}
                <th colSpan={hs1Columns.length} className={`border-l border-slate-200 px-3 py-2 text-center text-blue-600 ${hs1Columns.length === 0 ? 'hidden' : ''}`}>Điểm có hệ số</th>
                <th colSpan={3} className="border-l border-slate-200 px-3 py-2 text-center text-emerald-600">Tổng hợp</th>
              </tr>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500">
                {moetLabels.map((label, i) => (
                  <th key={`m-${label}`} className={`whitespace-nowrap px-3 py-2 text-center ${i === 0 ? 'border-l border-slate-200' : ''}`}>
                    <span className="block">{label}</span>
                    <select value={book.examWeights?.[label] ?? ''} disabled={Boolean(busy)} onChange={event => changeExamWeight(label, event.target.value)} aria-label={`Hệ số của ${label}`} title="Chọn hệ số để tính mốc này vào điểm trung bình" className="mt-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[11px] font-black text-slate-600">
                      <option value="">Không tính</option>
                      {WEIGHTS.map(w => <option key={w} value={w}>HS{w}</option>)}
                    </select>
                  </th>
                ))}
                {tdsLabels.map((label, i) => <th key={`t-${label}`} className={`whitespace-nowrap px-3 py-2 text-center ${i === 0 ? 'border-l border-slate-200' : ''}`}>{label}</th>)}
                {hs1Columns.map((column, i) => (
                  <th key={column.id} className={`px-2 py-1.5 text-center ${i === 0 ? 'border-l border-slate-200' : ''}`}>
                    <button type="button" onClick={() => openColumn(column)} title="Sửa cột điểm này" className="group inline-flex flex-col items-center rounded-lg px-2 py-1 hover:bg-blue-50">
                      <span className="flex items-center gap-1 whitespace-nowrap text-slate-700 group-hover:text-blue-700">{column.assignmentId && <Link2 className="h-3 w-3 text-emerald-600" aria-label="Liên kết bài giao" />}{column.label} <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100" /></span>
                      <span className="text-[10px] font-semibold text-slate-400">{ngayVn(column.date)} · <span className="font-black text-blue-600">HS{column.weight}</span></span>
                    </button>
                  </th>
                ))}
                <th className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-center" title="Σ(hệ số × điểm) / Σ hệ số, gồm các cột điểm và mốc MOET đã chọn hệ số">TB có hệ số</th>
                <th className="whitespace-nowrap px-3 py-2 text-center" title="Tỉ lệ bài đã nộp trên bài đã đến hạn, ×10">Chuyên cần</th>
                <th className="whitespace-nowrap px-3 py-2 text-center" title="Trung bình mọi BTVN đã có điểm (thang 10)">TB BTVN</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 && (
                <tr><td colSpan={99} className="py-10 text-center text-sm font-semibold text-slate-400">Lớp chưa có học sinh.</td></tr>
              )}
              {sortedStudents.map(student => {
                const view = studentScoreView(book, student.id);
                const moet = new Map(view.exams.moet.map(mark => [mark.label, mark]));
                const tds = new Map(view.exams.tds.map(mark => [mark.label, mark]));
                const homework = view.homework;
                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                      <p className="whitespace-nowrap font-black text-slate-900">{student.name}</p>
                      <p className="text-[11px] font-semibold text-slate-400">{student.code}</p>
                    </td>
                    {moetLabels.map((label, i) => <td key={label} className={`px-3 py-2.5 text-center font-black text-slate-800 ${i === 0 ? 'border-l border-slate-100' : ''}`}>{moet.get(label)?.score ?? <span className="text-slate-300">—</span>}</td>)}
                    {tdsLabels.map((label, i) => {
                      const mark = tds.get(label);
                      return <td key={label} className={`whitespace-nowrap px-3 py-2.5 text-center font-black text-slate-800 ${i === 0 ? 'border-l border-slate-100' : ''}`}>{mark ? <>{mark.score}{mark.letter && <span className="ml-1 rounded bg-indigo-50 px-1.5 text-[11px] text-indigo-700">{mark.letter}</span>}</> : <span className="text-slate-300">—</span>}</td>;
                    })}
                    {hs1Columns.map((column, i) => {
                      const score = columnScore(book, column, student.id);
                      const overridden = column.assignmentId && typeof book.hs1[student.id]?.[column.id] === 'number';
                      return <td key={column.id} title={overridden ? 'Đã ghi đè tay' : undefined} className={`px-3 py-2.5 text-center font-black ${overridden ? 'text-amber-700' : 'text-slate-800'} ${i === 0 ? 'border-l border-slate-100' : ''}`}>{score ?? <span className="text-slate-300">—</span>}</td>;
                    })}
                    <td className="border-l border-slate-100 px-3 py-2.5 text-center font-black text-blue-700">{view.average ?? <span className="text-slate-300">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center font-black text-emerald-700" title={homework ? `${homework.submitted}/${homework.total} bài đã nộp` : undefined}>{homework?.attendance ?? <span className="text-slate-300">—</span>}{homework && homework.total > 0 && <span className="ml-1 text-[10px] font-semibold text-slate-400">{homework.submitted}/{homework.total}</span>}</td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-700">{homework?.average ?? <span className="text-slate-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {busy && <p className="flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>}
    </div>
  );
};
