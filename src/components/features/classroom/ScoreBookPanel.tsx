import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Link2, Loader2, NotebookPen, Pencil, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import type { ClassExamSheet } from '../../../lib/classroom/types';
import type { Student } from '../../../types';
import { examLabelKey, type StudentExamScores } from '../../../lib/classroom/examScores';
import { parseExamConversionFile, type ExamConversionRow } from '../../../lib/classroom/examConversion';
import { fetchClassExamScores, inspectExamSheet, planExamSheetWrites, writeExamSheetValues, type ExamSheetWrite } from '../../../lib/classroom/examService';
import { spreadsheetIdFromUrl } from '../../../lib/classroom/sheetsApi';
import { deleteHs1Column, linkAssignmentColumns, linkPeriodicAssignments, loadScoreBook, saveExamColumn, saveExamColumnSettings, saveExamScores, saveExamWeights, saveHs1Column, saveScoreCells, setClassExamSheet, type ScoreCellEdit } from '../../../lib/classroom/teacherService';
import { watchScoreBook } from '../../../lib/classroom/scoreBookStream';
import { applyExamColumnSettings, EXAM_SOURCE_INFO, HS1_MAX, columnScore, examColumnsNeedingSheetPush, examScoreSource, parseHs1Score, parseHs1Weight, shadowedAssignmentScore, sortedHs1Columns, studentScoreView, type ExamScoreSource, type Hs1Column, type Hs1Weight, type ScoreBookDoc } from '../../../lib/classroom/scoreBook';

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

interface ExamDraft {
  label: string;
  displayLabel: string;
  hidden: boolean;
  scores: Record<string, string>;
}

interface TwoWayPreview {
  title: string;
  scores: Record<string, StudentExamScores>;
  columns: { moet: string[]; tds: string[] };
  pulls: Array<{ studentCode: string; label: string; value: number }>;
  conflicts: Array<{ studentCode: string; label: string; sheetValue: number; smartValue: number }>;
  writes: ExamSheetWrite[];
}

const WEIGHTS: Hs1Weight[] = [1, 2, 3];

/** Ba nhóm việc của Trung tâm điểm định kỳ — thay cho 7 nút rời rạc trước đây. */
const CENTER_TABS: Array<{ id: 'sheet' | 'assign' | 'column'; label: string; hint: string; Icon: typeof FileSpreadsheet }> = [
  { id: 'sheet', label: 'Đồng bộ file điểm', hint: 'Kéo/đẩy điểm với Google Sheet, quy đổi MOET → TDS', Icon: FileSpreadsheet },
  { id: 'assign', label: 'Gán bài nộp', hint: 'Đưa điểm bài đã chấm vào cột hệ số hoặc cột định kì', Icon: Link2 },
  { id: 'column', label: 'Tạo cột điểm', hint: 'Thêm cột điểm hệ số 1 hoặc cột định kì mới', Icon: Plus },
];

/** Màu badge nguồn điểm — để thầy cô thấy ngay điểm này đến từ đâu. */
const SOURCE_TONE: Record<ExamScoreSource, string> = {
  assignment: 'bg-emerald-100 text-emerald-700',
  manual: 'bg-amber-100 text-amber-700',
  paper: 'bg-rose-100 text-rose-700',
  sheet: 'bg-slate-100 text-slate-600',
};

/** Badge nguồn điểm: chữ nhỏ cạnh số điểm, di chuột hiện giải thích. */
const SourceBadge = ({ source, shadowed }: { source?: ExamScoreSource; shadowed?: number }) => {
  if (!source) return null;
  const info = EXAM_SOURCE_INFO[source];
  const hidden = typeof shadowed === 'number' ? ` Điểm bài nộp (${shadowed}) đang bị che — xoá điểm sửa tay để lấy lại.` : '';
  return (
    <>
      <span title={info.hint} className={`ml-1 rounded px-1 py-px align-middle text-[9px] font-black uppercase tracking-wide ${SOURCE_TONE[source]}`}>{info.label}</span>
      {hidden && <span title={hidden.trim()} className="ml-0.5 align-middle text-[9px] font-black text-emerald-600">↩</span>}
    </>
  );
};

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
  for (const label of book.examColumns?.[kind] ?? []) if (!labels.some(existing => examLabelKey(existing) === examLabelKey(label))) labels.push(label);
  const visible = applyExamColumnSettings(book.exams, book.examColumnLabels, book.hiddenExamColumns);
  for (const scores of Object.values(visible)) {
    for (const mark of scores[kind]) if (!labels.some(existing => examLabelKey(existing) === examLabelKey(mark.label))) labels.push(mark.label);
  }
  if (kind === 'moet') for (const [key, rawLabel] of Object.entries(book.auto?.periodicLabels ?? {})) {
    if (book.hiddenExamColumns?.includes(key)) continue;
    const label = book.examColumnLabels?.[key] ?? rawLabel;
    if (!labels.some(existing => existing === label || examLabelKey(existing) === key)) labels.push(label);
  }
  return labels;
};

const moetLabelsForBook = (book: ScoreBookDoc): string[] => examLabels(book, 'moet');

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
  const [periodicPicker, setPeriodicPicker] = useState<Record<string, string> | null>(null);
  const [sheetPreview, setSheetPreview] = useState<ExamSheetWrite[] | null>(null);
  const [twoWayPreview, setTwoWayPreview] = useState<TwoWayPreview | null>(null);
  const [conversionRows, setConversionRows] = useState<ExamConversionRow[]>([]);
  const [conversionSource, setConversionSource] = useState('');
  const [conversionTarget, setConversionTarget] = useState('');
  const [examDraft, setExamDraft] = useState<ExamDraft | null>(null);
  const [centerTab, setCenterTab] = useState<'sheet' | 'assign' | 'column'>('sheet');
  const [cellDrafts, setCellDrafts] = useState<Record<string, Omit<ScoreCellEdit, 'score'> & { text: string }>>({});
  // Tăng mỗi lần giáo viên ghi sổ: lượt làm mới ngầm xuất phát trước đó mà về sau không được đè bản vừa lưu.
  const writeVersion = useRef(0);
  const readVersion = useRef(0);
  const currentClass = useRef(classId); currentClass.current = classId;

  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [students]);

  const reload = useCallback(async () => {
    const reading = ++readVersion.current;
    const writing = writeVersion.current;
    setLoadError('');
    try {
      const fresh = await loadScoreBook(classId);
      if (reading === readVersion.current && writing === writeVersion.current) setBook(fresh);
    } catch (err) {
      if (reading === readVersion.current) setLoadError(errorText(err));
    }
  }, [classId]);

  useEffect(() => {
    setBook(null);
    setDraft(null);
    setCellDrafts({});
    setUnmatched([]);
    setError('');
    void reload();
    return () => { readVersion.current += 1; writeVersion.current += 1; };
  }, [reload]);

  useEffect(() => watchScoreBook({
    classId,
    onInvalidate: async current => {
      const reading = ++readVersion.current;
      const writing = writeVersion.current;
      const fresh = await loadScoreBook(classId);
      if (current() && reading === readVersion.current && writing === writeVersion.current) { setBook(fresh); setLoadError(''); }
    },
    onError: err => setLoadError(errorText(err)),
  }), [classId]);

  useEffect(() => {
    if (!Object.keys(cellDrafts).length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [cellDrafts]);

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
      writeVersion.current += 1;
      setBusy('');
    }
  };

  const cellId = (kind: ScoreCellEdit['kind'], key: string, studentId: string) => JSON.stringify([kind, key, studentId]);
  const editCell = (kind: ScoreCellEdit['kind'], key: string, studentId: string, previous: number | null, text: string) => {
    const id = cellId(kind, key, studentId);
    setCellDrafts(old => {
      const next = { ...old };
      const initial = old[id] ? old[id].previous : previous;
      if (parseHs1Score(text) === initial) delete next[id];
      else next[id] = { kind, key, studentId, previous: initial, text };
      return next;
    });
  };
  const saveCells = () => {
    const cells: ScoreCellEdit[] = [];
    for (const cell of Object.values(cellDrafts)) {
      const score = parseHs1Score(cell.text);
      if (score === undefined) { setError('Điểm phải từ 0 đến 10, tối đa 2 chữ số lẻ. Ô trống = xóa điểm nhập tay.'); return; }
      const { text: _text, ...edit } = cell;
      cells.push({ ...edit, score });
    }
    if (!cells.length) return;
    void run('Đang lưu điểm…', async () => {
      const saved = await saveScoreCells(classId, cells);
      if (classId !== currentClass.current) return;
      setBook(saved);
      setCellDrafts({});
      showToast(`Đã lưu ${cells.length} ô điểm`, 'success');
    });
  };

  const scoreInput = (kind: ScoreCellEdit['kind'], key: string, student: Student, score: number | undefined, label = key) => {
    const cell = cellDrafts[cellId(kind, key, student.id)];
    const changedElsewhere = cell && cell.previous !== (score ?? null);
    return <>
      <input inputMode="decimal" aria-label={`Điểm ${label} của ${student.name}`} aria-invalid={cell ? parseHs1Score(cell.text) === undefined : undefined}
        disabled={Boolean(busy)} value={cell?.text ?? (score === undefined ? '' : String(score))} placeholder="—"
        onChange={event => editCell(kind, key, student.id, score ?? null, event.target.value)}
        className={`w-20 rounded-lg border px-2 py-1.5 text-center font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 ${cell ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`} />
      {changedElsewhere && <span className="mt-1 block text-[10px] font-semibold text-amber-700">Hiện tại: {score ?? 'trống'}</span>}
    </>;
  };

  /** Đọc file điểm MỘT lần cho cả lớp rồi thay phần điểm thi trong sổ. */
  const pullExamScores = async (spreadsheetId: string) => {
    setBusy('Đang đọc file điểm…');
    const result = await fetchClassExamScores(spreadsheetId, students.map(s => ({ id: s.id, code: s.code })));
    setBusy('Đang lưu vào sổ điểm…');
    setBook(await saveExamScores(classId, result.title, result.scores, result.columns));
    setUnmatched(students.filter(s => result.unmatched.includes(s.id)).map(s => s.name));
    showToast(`Đã đồng bộ điểm thi cho ${Object.keys(result.scores).length}/${students.length} học sinh`, 'success');
  };

  const syncExams = (spreadsheetId: string) => run('Đang đọc file điểm…', () => pullExamScores(spreadsheetId));

  const prepareTwoWaySync = () => {
    if (!book || !examSheet) return;
    void run('Đang đối chiếu SmartPlan ↔ Google Sheet…', async () => {
      const result = await fetchClassExamScores(examSheet.spreadsheetId, students.map(s => ({ id: s.id, code: s.code })));
      const columns = [
        { tab: 'MOET' as const, kind: 'moet' as const, labels: [...new Set([...result.columns.moet, ...examLabels(book, 'moet')])] },
        { tab: 'TDS' as const, kind: 'tds' as const, labels: [...new Set([...result.columns.tds, ...examLabels(book, 'tds')])] },
      ];
      const pulls: TwoWayPreview['pulls'] = [];
      const conflicts: TwoWayPreview['conflicts'] = [];
      const writes: ExamSheetWrite[] = [];
      for (const column of columns) for (const label of column.labels) {
        const sheetScores = Object.fromEntries(students.flatMap(student => {
          const mark = result.scores[student.id]?.[column.kind].find(item => examLabelKey(item.label) === examLabelKey(label));
          return mark ? [[student.id, mark.score]] : [];
        }));
        const smartScores = Object.fromEntries(students.flatMap(student => {
          const mark = studentScoreView(book, student.id).exams[column.kind].find(item => examLabelKey(item.label) === examLabelKey(label));
          return mark ? [[student.id, mark.score]] : [];
        }));
        for (const student of students) {
          const sheetValue = sheetScores[student.id];
          const smartValue = smartScores[student.id];
          if (smartValue === undefined && sheetValue !== undefined) pulls.push({ studentCode: String(student.code ?? ''), label, value: sheetValue });
          if (smartValue !== undefined && sheetValue !== smartValue) {
            const plan = await planExamSheetWrites(examSheet.spreadsheetId, column.tab, label, [{ id: student.id, code: student.code }], { [student.id]: smartValue });
            writes.push(...plan.writes);
            if (sheetValue !== undefined) conflicts.push({ studentCode: String(student.code ?? ''), label, sheetValue, smartValue });
          }
        }
      }
      if (pulls.length === 0 && writes.length === 0) { showToast('Hai bên đã khớp, không có ô cần đồng bộ', 'success'); return; }
      setTwoWayPreview({ title: result.title, scores: result.scores, columns: result.columns, pulls, conflicts, writes });
    });
  };

  const confirmTwoWaySync = () => {
    if (!twoWayPreview || !examSheet) return;
    if (!window.confirm(`Đồng bộ hai chiều: kéo ${twoWayPreview.pulls.length} điểm về SmartPlan, đẩy ${twoWayPreview.writes.length} điểm lên Google Sheet. SmartPlan thắng ${twoWayPreview.conflicts.length} xung đột. Tiếp tục?`)) return;
    void run('Đang đồng bộ hai chiều…', async () => {
      setBook(await saveExamScores(classId, twoWayPreview.title, twoWayPreview.scores, twoWayPreview.columns));
      if (twoWayPreview.writes.length > 0) {
        await writeExamSheetValues(examSheet.spreadsheetId, twoWayPreview.writes);
        const verify = await Promise.all(twoWayPreview.writes.map(write => planExamSheetWrites(examSheet.spreadsheetId, write.tab, write.label, [{ id: write.studentId, code: write.studentCode }], { [write.studentId]: write.value })));
        const failed = verify.flatMap(item => item.writes).filter(write => Number(String(write.previous).replace(',', '.')) !== write.value);
        if (failed.length > 0) throw new Error(`Đã ghi nhưng đọc lại còn ${failed.length} ô chưa khớp.`);
      }
      showToast(`Đã đồng bộ hai chiều: kéo ${twoWayPreview.pulls.length}, đẩy ${twoWayPreview.writes.length}, xung đột SmartPlan thắng ${twoWayPreview.conflicts.length}`, 'success');
      setTwoWayPreview(null);
    });
  };

  const prepareSheetWrite = () => {
    if (!book || !examSheet) return;
    void run('Đang đối chiếu ô Google Sheet…', async () => {
      const writes: ExamSheetWrite[] = [];
      for (const label of moetLabelsForBook(book)) {
        const scores = Object.fromEntries(students.flatMap(student => {
          const mark = studentScoreView(book, student.id).exams.moet.find(item => examLabelKey(item.label) === examLabelKey(label));
          return mark ? [[student.id, mark.score]] : [];
        }));
        const plan = await planExamSheetWrites(examSheet.spreadsheetId, 'MOET', label, students.map(s => ({ id: s.id, code: s.code })), scores);
        writes.push(...plan.writes);
      }
      if (writes.length === 0) throw new Error('Chưa có điểm định kì nào để ghi lên Google Sheet.');
      setSheetPreview(writes);
    });
  };

  const confirmSheetWrite = () => {
    if (!sheetPreview || !examSheet) return;
    if (!window.confirm(`Sắp ghi ${sheetPreview.length} ô điểm vào Google Sheet "${examSheet.spreadsheetTitle}". Tiếp tục?`)) return;
    void run('Đang ghi điểm lên Google Sheet…', async () => {
      await writeExamSheetValues(examSheet.spreadsheetId, sheetPreview);
      const verify = await Promise.all(sheetPreview.map(write => planExamSheetWrites(examSheet.spreadsheetId, write.tab, write.label, [{ id: write.studentId, code: write.studentCode }], { [write.studentId]: write.value })));
      const failed = verify.flatMap(item => item.writes).filter(write => Number(String(write.previous).replace(',', '.')) !== write.value);
      if (failed.length > 0) throw new Error(`Đã ghi nhưng đọc lại còn ${failed.length} ô chưa khớp. Không báo hoàn tất.`);
      showToast(`Đã ghi và xác minh ${sheetPreview.length} ô điểm trên Google Sheet`, 'success');
      setSheetPreview(null);
    });
  };

  const loadConversionFile = async (file: File) => {
    try { setConversionRows(await parseExamConversionFile(file)); showToast('Đã đọc file quy đổi MOET → TDS', 'success'); }
    catch (error) { setError(errorText(error)); }
  };

  const prepareConversionWrite = () => {
    if (!book || !examSheet || !conversionSource || !conversionTarget || conversionRows.length === 0) return;
    void run('Đang đối chiếu file quy đổi…', async () => {
      const byCode = new Map(students.map(student => [String(student.code ?? '').trim(), student.id]));
      const sourceKey = examLabelKey(conversionSource);
      const mismatches = conversionRows.flatMap(row => {
        const id = byCode.get(row.studentCode);
        const smart = id ? studentScoreView(book, id).exams.moet.find(mark => examLabelKey(mark.label) === sourceKey)?.score : undefined;
        return id && row.moet !== undefined && smart !== undefined && Math.abs(row.moet - smart) > 0.001
          ? [`${row.studentCode}: file MOET ${row.moet}, sổ ${smart}`] : [];
      });
      if (mismatches.length > 0) throw new Error(`File quy đổi không khớp cột MOET “${conversionSource}” (${mismatches.slice(0, 3).join('; ')}). Chọn đúng file của bài thi.`);
      const scores = Object.fromEntries(conversionRows.flatMap(row => {
        const id = byCode.get(row.studentCode);
        return id && row.tds !== undefined ? [[id, row.tds]] : [];
      }));
      const plan = await planExamSheetWrites(examSheet.spreadsheetId, 'TDS', conversionTarget, students.map(s => ({ id: s.id, code: s.code })), scores);
      if (plan.writes.length === 0) throw new Error('Không có Mã HS nào trong file quy đổi khớp danh sách lớp.');
      setSheetPreview(plan.writes);
    });
  };

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

  const openNewExamColumn = () => {
    setError('');
    setExamDraft({ label: '', displayLabel: '', hidden: false, scores: {} });
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

  const openExam = (label: string) => {
    if (!book) return;
    const sourceKey = Object.entries(book.examColumnLabels ?? {}).find(([, shown]) => shown === label)?.[0];
    const markLabel = sourceKey
      ? Object.values(book.exams).flatMap(row => [...row.moet, ...row.tds]).find(mark => examLabelKey(mark.label) === sourceKey)?.label ?? label
      : label;
    const scores: Record<string, string> = {};
    for (const student of students) {
      const mark = book.exams[student.id]?.moet.find(item => examLabelKey(item.label) === examLabelKey(markLabel));
      if (mark) scores[student.id] = String(mark.score);
    }
    setError('');
    setExamDraft({ label: markLabel, displayLabel: label, hidden: false, scores });
  };

  const saveExamDraft = () => {
    if (!examDraft) return;
    if (!examDraft.displayLabel.trim()) { setError('Nhập tên cột định kì trước khi lưu.'); return; }
    const scores = Object.fromEntries(students.map(student => [student.id, examDraft.scores[student.id]?.trim() ? Number(examDraft.scores[student.id].replace(',', '.')) : null]));
    if (Object.values(scores).some(value => value !== null && (!Number.isFinite(value) || value < 0 || value > 10))) {
      setError('Điểm thi phải từ 0 đến 10. Ô trống = xóa điểm trong sổ.');
      return;
    }
    void run('Đang lưu điểm thi…', async () => {
      setBook(await saveExamColumn(classId, examDraft.label || examDraft.displayLabel, scores, examDraft.label ? undefined : 'both'));
      showToast('Đã cập nhật điểm thi trong sổ', 'success');
      setExamDraft(null);
    });
  };

  const saveExamSettings = (hidden: boolean) => {
    if (!examDraft) return;
    void run(hidden ? 'Đang xóa cột khỏi sổ…' : 'Đang lưu tên cột…', async () => {
      setBook(await saveExamColumnSettings(classId, examDraft.label, { newLabel: examDraft.displayLabel, hidden }));
      showToast(hidden ? 'Đã xóa cột khỏi sổ điểm' : 'Đã cập nhật tên cột', 'success');
      setExamDraft({ ...examDraft, hidden });
    });
  };

  const restoreExamColumn = (key: string) => {
    if (!book) return;
    const label = Object.values(book.exams).flatMap(row => [...row.moet, ...row.tds]).find(mark => examLabelKey(mark.label) === key)?.label;
    if (!label) return;
    void run('Đang khôi phục cột…', async () => {
      setBook(await saveExamColumnSettings(classId, label, { hidden: false }));
      showToast('Đã khôi phục cột điểm', 'success');
    });
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

  const savePeriodicPicker = () => {
    if (!periodicPicker) return;
    const items = Object.entries(periodicPicker).filter(([, examKey]) => examKey).map(([assignmentId, examKey]) => ({ assignmentId, examKey }));
    if (items.length === 0) { setError('Chọn bài đã nộp và cột định kì.'); return; }
    void run('Đang gán bài vào cột định kì…', async () => {
      setBook(await linkPeriodicAssignments(classId, items));
      showToast(`Đã gán ${items.length} bài vào cột định kì`, 'success');
      setPeriodicPicker(null);
    });
  };

  const changeExamWeight = (label: string, value: string) => {
    if (!book) return;
    const weights: Record<string, Hs1Weight> = { ...(book.examWeights ?? {}) };
    const weight = parseHs1Weight(value);
    const key = examLabelKey(label);
    for (const existing of Object.keys(weights)) if (examLabelKey(existing) === key) delete weights[existing];
    if (weight) weights[key] = weight;
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
  const pendingPush = book ? examColumnsNeedingSheetPush(book) : [];

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Sổ điểm</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">Điểm thi định kì &amp; điểm có hệ số</h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Học sinh xem được điểm của mình ở cổng học sinh; báo cáo gửi phụ huynh lấy điểm từ sổ này. Cột bài giao tự cập nhật theo bài nộp mới nhất; chuyên cần và TB BTVN luôn tự tính.</p>
        </div>
        <div />
      </div>

      {/* Gợi ý sau khi duyệt chấm bài: sổ đã có điểm mới mà file điểm chưa có. */}
      {pendingPush.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold leading-5 text-amber-950">
            <span className="font-black">Có điểm mới chưa lên Google Sheet:</span>{' '}
            {pendingPush.map(item => `${item.label} (${item.studentIds.length} em)`).join(', ')}. Học sinh và phụ huynh đã thấy điểm trong Sổ điểm; file điểm của trường thì chưa.
          </p>
          {examSheet ? (
            <button type="button" onClick={prepareSheetWrite} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> Xem trước &amp; đẩy lên Sheet
            </button>
          ) : (
            <p className="text-xs font-bold text-amber-800">Chưa nối file điểm — nối ở Trung tâm điểm định kỳ bên dưới.</p>
          )}
        </div>
      )}

      {/* Trung tâm điểm định kỳ: một chỗ cho mọi việc liên quan điểm thi — Sheet, gán bài, tạo cột. */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-slate-900"><FileSpreadsheet className="h-4 w-4 text-violet-600" /> Trung tâm điểm định kỳ</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Đồng bộ với file điểm, gán bài đã nộp vào mốc định kì, và tạo cột — tất cả ở đây.</p>
          </div>
          {examSheet && <p className="text-xs font-semibold text-slate-500">File: <span className="font-black text-slate-700">{examSheet.spreadsheetTitle || examSheet.spreadsheetId}</span></p>}
        </div>
        <div role="tablist" aria-label="Việc cần làm với điểm định kỳ" className="mt-3 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
          {CENTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={centerTab === tab.id}
              onClick={() => { setError(''); setCenterTab(tab.id); }}
              title={tab.hint}
              className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${centerTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {centerTab === 'sheet' && (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-semibold leading-5 text-slate-600">
              <span className="font-black text-slate-800">Hai chiều:</span> kéo điểm mới trong file về sổ, đẩy điểm sổ lên file. Xung đột thì <b>sổ SmartPlan thắng</b>. Luôn xem trước rồi mới ghi.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={prepareTwoWaySync} disabled={!book || !examSheet || Boolean(busy)} title={examSheet ? 'Đồng bộ hai chiều: SmartPlan ↔ Google Sheet, SmartPlan thắng xung đột' : 'Nối file điểm MOET/TDS bên dưới trước'} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none">
                <RefreshCw className="h-4 w-4" /> Đồng bộ hai chiều
              </button>
              <button type="button" onClick={prepareSheetWrite} disabled={!book || !examSheet || Boolean(busy)} title="Chỉ đẩy điểm định kì từ sổ lên các ô MOET trên Google Sheet" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50 sm:flex-none">
                <Upload className="h-4 w-4" /> Chỉ đẩy lên Sheet
              </button>
            </div>
            {!examSheet && (
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-[11px] font-semibold leading-5 text-violet-900">Chưa nối file điểm. Dán link file <b>“26-27-&lt;lớp&gt;”</b> trong folder “Lộ trình Toán THPT” (khác file đồng bộ BTVN).</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={linkInput} onChange={event => setLinkInput(event.target.value)} placeholder="Dán link Google Sheet điểm của lớp (file có tab MOET/TDS)" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-400" />
                  <button type="button" onClick={() => void linkAndSync()} disabled={Boolean(busy) || !linkInput.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-50">
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Nối file &amp; đồng bộ
                  </button>
                </div>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-500">
              {examSheet
                ? <>Lần đồng bộ gần nhất: <span className="font-black text-slate-700">{book?.examsSyncedAt ? new Date(book.examsSyncedAt).toLocaleString('vi-VN') : 'chưa có'}</span></>
                : 'Sau khi nối file, các nút đồng bộ ở trên sẽ mở khóa.'}
            </p>
            {unmatched.length > 0 && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                <span className="font-black">Chưa có điểm thi trong file (hoặc Mã HS không khớp):</span> {unmatched.join(', ')}
              </p>
            )}
            {examSheet && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <p className="text-xs font-black text-indigo-900">Quy đổi điểm cho bài thi đang chọn</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Mỗi file áp dụng cho <b>một bài thi</b>. File cần có `Mã HS`, điểm `MOET`, điểm `TDS`. Chọn cột MOET nguồn và cột TDS đích trước khi xem trước ghi.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Chọn file<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void loadConversionFile(file); }} /></label>
                  <select value={conversionSource} onChange={event => setConversionSource(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700"><option value="">Chọn bài thi MOET</option>{moetLabels.map(label => <option key={examLabelKey(label)} value={label}>{label}</option>)}</select>
                  <select value={conversionTarget} onChange={event => setConversionTarget(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black text-slate-700"><option value="">Chọn cột TDS đích</option>{tdsLabels.map(label => <option key={examLabelKey(label)} value={label}>{label}</option>)}</select>
                  <button type="button" onClick={prepareConversionWrite} disabled={!conversionRows.length || !conversionSource || !conversionTarget || Boolean(busy)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Xem trước ghi TDS</button>
                </div>
                {conversionRows.length > 0 && <p className="mt-1 text-[11px] font-bold text-indigo-700">Đã đọc {conversionRows.length} dòng cho bài thi {conversionSource || 'chưa chọn'}.</p>}
              </div>
            )}
          </div>
        )}

        {centerTab === 'assign' && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="text-xs font-black text-emerald-900">Gán bài nộp / BTVN vào cột hệ số</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">Chọn bài, đặt hệ số 1–3. Điểm bài nộp vào đúng cột đó.</p>
              <button type="button" onClick={() => { setError(''); setPicker({}); }} disabled={!book || Boolean(busy)} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                <Link2 className="h-3.5 w-3.5" /> Liên kết bài nộp/BTVN
              </button>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <p className="text-xs font-black text-violet-900">Gán bài nộp vào cột định kì</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">Bài kiểm tra trên lớp → mốc GHKI/CK… Bài nộp chỉ điền ô trống, không đè điểm thầy cô đã sửa.</p>
              <button type="button" onClick={() => { setError(''); setPeriodicPicker({}); }} disabled={!book || Boolean(busy) || examLabels(book, 'moet').length === 0} title="Chọn bài đã nộp, gán thẳng vào cột định kì từ file MOET/TDS" className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">
                <Link2 className="h-3.5 w-3.5" /> Gán vào cột định kì
              </button>
            </div>
          </div>
        )}

        {centerTab === 'column' && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              <p className="text-xs font-black text-blue-900">Cột điểm hệ số 1</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">Điểm kiểm tra miệng, 15 phút, BTVN có hệ số.</p>
              <button type="button" onClick={openNewColumn} disabled={!book || Boolean(busy)} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Thêm cột hệ số
              </button>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
              <p className="text-xs font-black text-violet-900">Cột điểm định kì</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">Mốc thi chưa có trong file điểm. Cột nhập tay chỉ vào nhóm MOET, không tạo cột kép.</p>
              <button type="button" onClick={openNewExamColumn} disabled={!book || Boolean(busy)} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Thêm cột định kì
              </button>
            </div>
          </div>
        )}
      </div>

      {sheetPreview && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-950">Xem trước ghi Google Sheet: {sheetPreview.length} ô ({[...new Set(sheetPreview.map(write => write.tab))].join(', ')})</p>
          <p className="mt-1 text-xs font-semibold text-amber-900">Kiểm tra `Mã HS → cột → giá trị cũ → giá trị mới`. Chỉ bấm ghi khi danh sách đúng.</p>
          <div className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-white text-xs"><table className="min-w-full"><thead><tr className="border-b text-left"><th className="px-2 py-1">Mã HS</th><th className="px-2 py-1">Cột</th><th className="px-2 py-1">Cũ</th><th className="px-2 py-1">Mới</th></tr></thead><tbody>{sheetPreview.map(write => <tr key={write.range} className="border-b"><td className="px-2 py-1">{write.studentCode}</td><td className="px-2 py-1">{write.label}</td><td className="px-2 py-1">{String(write.previous || 'trống')}</td><td className="px-2 py-1 font-black">{write.value}</td></tr>)}</tbody></table></div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={confirmSheetWrite} disabled={Boolean(busy)} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Xác nhận ghi</button><button type="button" onClick={() => setSheetPreview(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600">Hủy</button></div>
        </div>
      )}

      {twoWayPreview && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-950">Preview đồng bộ hai chiều</p>
          <p className="mt-1 text-xs font-semibold text-emerald-900">Kéo về SmartPlan: {twoWayPreview.pulls.length} · Đẩy lên Sheet: {twoWayPreview.writes.length} · Xung đột: {twoWayPreview.conflicts.length} (SmartPlan thắng).</p>
          {twoWayPreview.conflicts.length > 0 && <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-white p-2 text-xs">{twoWayPreview.conflicts.map(item => <p key={`${item.studentCode}-${item.label}`}>{item.studentCode} · {item.label}: Sheet {item.sheetValue} → SmartPlan {item.smartValue}</p>)}</div>}
          <div className="mt-3 flex gap-2"><button type="button" onClick={confirmTwoWaySync} disabled={Boolean(busy)} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Xác nhận đồng bộ</button><button type="button" onClick={() => setTwoWayPreview(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600">Hủy</button></div>
        </div>
      )}

      {book && (book.hiddenExamColumns ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Cột đã xóa khỏi sổ:</span>
          {book.hiddenExamColumns!.map(key => {
            const label = (book.examColumnLabels ?? {})[key] ?? Object.values(book.exams).flatMap(row => [...row.moet, ...row.tds]).find(mark => examLabelKey(mark.label) === key)?.label ?? key;
            return <button key={key} type="button" onClick={() => restoreExamColumn(key)} disabled={Boolean(busy)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-black text-violet-700">Khôi phục {label}</button>;
          })}
        </div>
      )}

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

      {periodicPicker && book && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-violet-950"><Link2 className="h-4 w-4" /> Gán bài đã nộp vào cột định kì</p>
            <button type="button" onClick={() => setPeriodicPicker(null)} aria-label="Đóng" className="rounded-full p-1.5 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">Chọn bài đã có học sinh nộp, rồi chọn đúng cột lấy từ file MOET/TDS. Điểm bài thắng theo từng học sinh; Sheet chỉ bổ sung em chưa có điểm. Bài không biến thành cột BTVN.</p>
          <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
            {(book.auto?.examAssignments ?? []).map(item => {
              const current = periodicPicker[item.id] ?? (item.periodicKey ? item.periodicKey : '');
              return <li key={item.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                <input type="checkbox" checked={Boolean(current)} onChange={event => setPeriodicPicker(previous => ({ ...(previous ?? {}), [item.id]: event.target.checked ? (current || examLabelKey(examLabels(book, 'moet')[0] ?? '')) : '' }))} aria-label={`Chọn ${item.title}`} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-800">{item.title}</span><span className="text-[11px] font-semibold text-slate-400">{item.graded}/{item.submitted} bài đã có điểm{item.periodicKey ? ` · đang gán ${item.periodicKey}` : ''}</span></span>
                <select value={current} disabled={!current} onChange={event => setPeriodicPicker(previous => ({ ...(previous ?? {}), [item.id]: event.target.value }))} aria-label={`Cột định kì của ${item.title}`} className="max-w-52 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-700 disabled:opacity-40">
                  <option value="">Chọn cột định kì</option>
                  {examLabels(book, 'moet').map(label => <option key={examLabelKey(label)} value={examLabelKey(label)}>{label}</option>)}
                </select>
              </li>;
            })}
          </ul>
          <div className="mt-4 flex gap-2"><button type="button" onClick={savePeriodicPicker} disabled={Boolean(busy)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50">Lưu liên kết định kì</button><button type="button" onClick={() => setPeriodicPicker(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600">Hủy</button></div>
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

      {examDraft && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black text-violet-950"><Pencil className="h-4 w-4" /> Quản lý cột thi định kì</p>
            <button type="button" onClick={() => setExamDraft(null)} aria-label="Đóng" className="rounded-full p-1.5 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
          </div>
          <label className="mt-2 block text-xs font-bold text-slate-600">Tên cột hiển thị
            <input value={examDraft.displayLabel} onChange={event => setExamDraft({ ...examDraft, displayLabel: event.target.value })} maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-violet-400" />
          </label>
          <p className="mt-2 text-xs font-bold text-slate-500">Chỉnh sửa chỉ trong sổ SmartPlan, không ghi ngược Google Sheet. Ô điểm trống = xóa điểm của học sinh đó.</p>
          <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStudents.map(student => (
              <label key={student.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{student.name}</span>
                <input inputMode="decimal" value={examDraft.scores[student.id] ?? ''} onChange={event => setExamDraft({ ...examDraft, scores: { ...examDraft.scores, [student.id]: event.target.value } })} aria-label={`Điểm ${examDraft.label} của ${student.name}`} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-black outline-none focus:border-violet-400" />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={saveExamDraft} disabled={Boolean(busy)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50">Lưu điểm</button>
            <button type="button" onClick={() => saveExamSettings(false)} disabled={Boolean(busy) || !examDraft.displayLabel.trim()} className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-black text-violet-700 disabled:opacity-50">Lưu tên cột</button>
            <button type="button" onClick={() => saveExamSettings(!examDraft.hidden)} disabled={Boolean(busy)} className="ml-auto rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-700 disabled:opacity-50">{examDraft.hidden ? 'Khôi phục cột' : 'Xóa cột khỏi sổ'}</button>
            <button type="button" onClick={() => setExamDraft(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600">Hủy</button>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {loadError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Không tải được sổ điểm: {loadError} <button type="button" onClick={() => void reload()} className="font-black underline">Thử lại</button></p>}

      {!book && !loadError ? (
        <p className="py-8 text-center text-sm font-semibold text-slate-400">Đang tải sổ điểm…</p>
      ) : book && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <div className="sticky left-0 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
            <span className="text-xs font-semibold text-slate-500">Điền trực tiếp vào ô, rồi bấm Lưu. {Object.keys(cellDrafts).length > 0 ? `${Object.keys(cellDrafts).length} ô chưa lưu.` : ''}</span>
            <button type="button" onClick={saveCells} disabled={Boolean(busy) || Object.keys(cellDrafts).length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Lưu</button>
            {Object.keys(cellDrafts).length > 0 && <button type="button" disabled={Boolean(busy)} onClick={() => setCellDrafts({})} className="text-xs font-bold text-slate-500 underline">Hủy thay đổi</button>}
          </div>
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
                    <button type="button" onClick={() => openExam(label)} title="Sửa/xóa điểm mốc này trong sổ" className="group inline-flex items-center gap-1 font-black text-violet-700 hover:text-violet-900"><span>{label}</span><Pencil className="h-3 w-3 opacity-50 group-hover:opacity-100" /></button>
                    <select value={Object.entries(book.examWeights ?? {}).find(([key]) => examLabelKey(key) === examLabelKey(label))?.[1] ?? ''} disabled={Boolean(busy)} onChange={event => changeExamWeight(label, event.target.value)} aria-label={`Hệ số của ${label}`} title="Chọn hệ số để tính mốc này vào điểm trung bình" className="mt-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[11px] font-black text-slate-600">
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
                    {moetLabels.map((label, i) => {
                      const mark = moet.get(label);
                      const source = examScoreSource(book, student.id, label);
                      // Điểm thầy cô xác nhận từ ảnh bài chấm tay (chưa có trong file điểm): tô đỏ nhạt để phân biệt.
                      return <td key={label} title={source ? EXAM_SOURCE_INFO[source].hint : undefined} className={`whitespace-nowrap px-3 py-2.5 text-center font-black ${mark?.source === 'paper' ? 'text-rose-700' : 'text-slate-800'} ${i === 0 ? 'border-l border-slate-100' : ''}`}>{scoreInput('moet', label, student, mark?.score)}{mark ? <SourceBadge source={source} shadowed={shadowedAssignmentScore(book, student.id, label)} /> : null}</td>;
                    })}
                    {tdsLabels.map((label, i) => {
                      const mark = tds.get(label);
                      const source = examScoreSource(book, student.id, label);
                      return <td key={label} title={source ? EXAM_SOURCE_INFO[source].hint : undefined} className={`whitespace-nowrap px-3 py-2.5 text-center font-black text-slate-800 ${i === 0 ? 'border-l border-slate-100' : ''}`}>{mark ? <>{mark.score}{mark.letter && <span className="ml-1 rounded bg-indigo-50 px-1.5 text-[11px] text-indigo-700">{mark.letter}</span>}<SourceBadge source={source} shadowed={shadowedAssignmentScore(book, student.id, label)} /></> : <span className="text-slate-300">—</span>}</td>;
                    })}
                    {hs1Columns.map((column, i) => {
                      const score = columnScore(book, column, student.id);
                      const overridden = column.assignmentId && typeof book.hs1[student.id]?.[column.id] === 'number';
                      return <td key={column.id} title={overridden ? 'Đã ghi đè tay' : undefined} className={`px-3 py-2.5 text-center font-black ${overridden ? 'text-amber-700' : 'text-slate-800'} ${i === 0 ? 'border-l border-slate-100' : ''}`}>{scoreInput('hs1', column.id, student, score, column.label)}</td>;
                    })}
                    <td className="border-l border-slate-100 px-3 py-2.5 text-center font-black text-blue-700">{view.average ?? <span className="text-slate-300">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center font-black text-emerald-700" title={homework ? `${homework.submitted}/${homework.total} bài đã nộp` : undefined}>{homework?.attendance ?? <span className="text-slate-300">—</span>}{homework && homework.total > 0 && <span className="ml-1 text-[10px] font-semibold text-slate-400">{homework.submitted}/{homework.total}</span>}</td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-700">{homework?.average ?? <span className="text-slate-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500">
            <span className="font-black text-slate-600">Nguồn điểm:</span>
            {(Object.keys(EXAM_SOURCE_INFO) as ExamScoreSource[]).map(source => (
              <span key={source} className="inline-flex items-center gap-1">
                <span className={`rounded px-1 py-px text-[9px] font-black uppercase tracking-wide ${SOURCE_TONE[source]}`}>{EXAM_SOURCE_INFO[source].label}</span>
                <span>{EXAM_SOURCE_INFO[source].hint}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span className="text-[9px] font-black text-emerald-600">↩</span>
              <span>Điểm bài nộp đang bị điểm sửa tay che (xoá điểm sửa tay để lấy lại).</span>
            </span>
          </p>
        </div>
      )}
      {busy && <p className="flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>}
    </div>
  );
};
