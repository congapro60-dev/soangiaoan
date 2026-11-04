import { useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Key,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { AppData, Student } from '../../../types';

type Settings = AppData['settings'];
import { callAI } from '../../../lib/aiProviders';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { asCompetencyGrade, competenciesByGrade } from '../../../lib/classroom/competency/framework';
import { SSM_SCALE_4, type LoMark } from '../../../lib/ssm/loScore';
import { readLoWorkbook, fillLoWorkbook } from '../../../lib/ssm/loWorkbook';
import {
  attachLoFileToSsm,
  getStoredSsmSession,
  readSsmLink,
  readSsmSubjects,
  readSsmEvaluationQuarters,
  readSsmClassSubjectAssessment,
  writeSsmLoGrades,
  ssmRequest,
  type StoredSsmSession,
} from '../../../lib/ssm/ssmBridge';
import {
  parseSsmCriteriaLoad,
  parseSsmQuarters,
  parseSsmSubjects,
  type SsmCriteriaLoad,
} from '../../../lib/ssm/loSsmParser';
import {
  diffLoGrid,
  buildLoWriteBody,
  withClassAndCriteria,
  verifyWritten,
  type LoDiff,
} from '../../../lib/ssm/loSsmWrite';
import { pickCurrentSchoolYear } from '../../../lib/ssm/ssmModel';
import { parseLoInfo, suggestGrid, type LoInfo, type LoMapping } from '../../../lib/ssm/loMapping';
import { buildLoMappingPrompt, parseLoMappingResponse } from '../../../lib/ssm/loMappingPrompt';
import { buildClassLoScores, type LoPeriodKey } from '../../../lib/ssm/loClassScores';
import { fetchSsmTemplateByLink } from '../../../lib/classroom/teacherService';
import { LoPushPreviewModal } from './LoPushPreviewModal';
import { SsmConnectModal } from './SsmConnectModal';

interface Props {
  classId: string;
  teacherId: string;
  classGrade: string;
  students: Student[];
  settings: Settings;
  showToast: (message: string, icon?: string) => void;
}

interface SsmFormChoice {
  quarterName: string;
  formName: string;
  formId: number;
  criteriaId: number;
  subjectId: number;
}

const MARK_OPTIONS: LoMark[] = ['N', ...SSM_SCALE_4];
const PERIOD_OPTIONS: Array<{ key: LoPeriodKey; label: string }> = [
  { key: 'F1', label: 'F1 · tháng 8–9' }, { key: 'IA1', label: 'IA1 · tháng 10' },
  { key: 'F2', label: 'F2 · tháng 11' }, { key: 'SE1', label: 'SE1 · tháng 12' },
  { key: 'F3', label: 'F3 · tháng 1' }, { key: 'IA2', label: 'IA2 · tháng 2' },
  { key: 'F4', label: 'F4 · tháng 3' }, { key: 'SE2', label: 'SE2 · tháng 4' },
];
const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Có lỗi, thử lại sau.');
const academicYearStart = (): number => { const now = new Date(); return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; };

export const SsmPanel = ({ classId, teacherId, classGrade, students, settings, showToast }: Props) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [los, setLos] = useState<LoInfo[]>([]);
  const [fileMaHS, setFileMaHS] = useState<string[]>([]);
  const [mapping, setMapping] = useState<LoMapping>({});
  const [grid, setGrid] = useState<Map<string, Map<string, LoMark>>>(new Map());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [period, setPeriod] = useState<LoPeriodKey>('F1');

  // Đợt 4: Đồng bộ trực tiếp qua Tiện ích SSM
  const ssmLink = useMemo(() => readSsmLink(classId), [classId]);
  const [ssmLoad, setSsmLoad] = useState<SsmCriteriaLoad | null>(null);
  const [availableForms, setAvailableForms] = useState<SsmFormChoice[]>([]);
  const [activeForm, setActiveForm] = useState<SsmFormChoice | null>(null);
  const [previewDiff, setPreviewDiff] = useState<LoDiff | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [writeBusy, setWriteBusy] = useState(false);
  const [showExcelSection, setShowExcelSection] = useState(() => !readSsmLink(classId));
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ssmSession, setSsmSession] = useState<StoredSsmSession | null>(() => getStoredSsmSession());

  const grade = asCompetencyGrade(Number(classGrade));
  const nameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) if (s.code.trim()) m.set(s.code.trim(), s.name);
    return m;
  }, [students]);

  const emptyGrid = (maHSList: string[], loList: LoInfo[]): Map<string, Map<string, LoMark>> => {
    const g = new Map<string, Map<string, LoMark>>();
    for (const ma of maHSList) g.set(ma, new Map(loList.map((lo) => [lo.loCode, 'N' as LoMark])));
    return g;
  };

  const loadAssessmentForm = async (target: SsmFormChoice, ssmClassId: number) => {
    setActiveForm(target);
    setBusy(`Đang tải bảng điểm ${target.formName} (${target.quarterName}) từ SSM…`);
    setError('');
    try {
      const raw = await readSsmClassSubjectAssessment(target.formId, target.criteriaId, ssmClassId);
      const parsed = parseSsmCriteriaLoad(raw);
      setSsmLoad(parsed);
      setLos(parsed.los);
      setFileBytes(null);
      setFileName(`SSM_${target.quarterName}_${target.formName}`);
      const maList = parsed.students.map((s) => s.maHS);
      setFileMaHS(maList);

      // Điền grid ban đầu từ điểm đã có trên SSM (nếu có)
      const g = new Map<string, Map<string, LoMark>>();
      for (const s of parsed.students) {
        const row = new Map<string, LoMark>();
        for (const lo of parsed.los) {
          const key = `${lo.focalPointId}_${lo.powerStandardId}_${lo.loId}`;
          const ptId = s.existingPointId.get(key);
          const rowScale = ptId !== undefined ? parsed.scale.find((sc) => sc.id === ptId) : undefined;
          let mark: LoMark = 'N';
          if (rowScale && rowScale.isNumber) {
            const numMark = Number(rowScale.point);
            if (SSM_SCALE_4.includes(numMark as never)) mark = numMark as LoMark;
          }
          row.set(lo.loCode, mark);
        }
        g.set(s.maHS, row);
      }
      setGrid(g);
      setNote(`Đã tải từ SSM: ${parsed.los.length} LO, ${parsed.students.length} học sinh. Bấm "Gợi ý điểm bằng AI" để tự tính từ bài nộp trên web.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const loadFromSsm = async () => {
    if (!getStoredSsmSession()) {
      setShowConnectModal(true);
      return;
    }
    const currentLink = readSsmLink(classId);
    if (!currentLink) {
      setError('Lớp chưa ghép với SSM. Hãy sang tab "Học sinh" → "Ghép với lớp SSM" trước.');
      return;
    }
    setBusy('Đang đọc các bài đánh giá từ SSM…');
    setError('');
    setNote('');
    try {
      const year = pickCurrentSchoolYear(await ssmRequest('schoolYears'));
      if (!year) throw new Error('Không tìm thấy năm học đang chạy trên SSM.');
      const subRes = await readSsmSubjects(currentLink.id, year.id);
      const subjects = parseSsmSubjects(subRes);
      const mathSub = subjects.find((s) => /to[aá]n/i.test(s.name)) || subjects[0];
      if (!mathSub) throw new Error('Lớp này không có môn học nào trên SSM.');

      const qRes = await readSsmEvaluationQuarters(currentLink.id, mathSub.id, year.id);
      const quarters = parseSsmQuarters(qRes);
      const forms: SsmFormChoice[] = [];
      for (const q of quarters) {
        for (const f of q.forms) {
          if (f.criteriaId) {
            forms.push({
              quarterName: q.name,
              formName: f.assessmentName,
              formId: f.id,
              criteriaId: f.criteriaId,
              subjectId: mathSub.id,
            });
          }
        }
      }
      if (forms.length === 0) throw new Error(`Môn "${mathSub.name}" chưa có bài đánh giá nào trên SSM.`);
      setAvailableForms(forms);
      const chosen = forms.find((f) => f.formName.toUpperCase().includes(period)) || forms[0];
      await loadAssessmentForm(chosen, currentLink.id);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const loadBytes = async (bytes: ArrayBuffer, name: string) => {
    setError('');
    setNote('');
    setMapping({});
    setSsmLoad(null);
    setActiveForm(null);
    try {
      const info = await readLoWorkbook(bytes);
      const loList = info.loHeaders.map(parseLoInfo).filter((x): x is LoInfo => x !== null);
      setFileBytes(bytes);
      setFileName(name);
      setLos(loList);
      setFileMaHS(info.maHSList);
      setGrid(emptyGrid(info.maHSList, loList));
      setNote(`Đã đọc ${loList.length} LO, ${info.maHSList.length} học sinh từ file Excel. Bấm "Gợi ý điểm bằng AI" hoặc tự điền.`);
    } catch (e) {
      setFileBytes(null);
      setLos([]);
      setError(errorText(e));
    }
  };

  const onPickFile = (file: File) => file.arrayBuffer().then((b) => loadBytes(b, file.name));

  const onPickLink = async () => {
    if (!link.trim()) return;
    setBusy('Đang tải file từ SSM…');
    setError('');
    try {
      const { bytes, filename } = await fetchSsmTemplateByLink(link.trim());
      await loadBytes(bytes, filename);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const suggestWithAi = async () => {
    if (!grade || los.length === 0) return;
    setBusy('Đang ghép LO và tính điểm gợi ý…');
    setError('');
    try {
      const comps = competenciesByGrade(grade);
      const raw = await callAI(buildLoMappingPrompt(grade, los, comps), settings);
      const map = parseLoMappingResponse(raw, los.map((l) => l.loCode), comps.map((c) => c.id));
      const scores = buildClassLoScores(
        grade,
        students.map((s) => ({ id: s.id, code: s.code })),
        await listSubmissionsForClass(classId, teacherId),
        await listAssignmentsForClass(classId, teacherId),
        { period, academicYear: academicYearStart() },
      );
      const byMa = new Map(scores.map((s) => [s.maHS, s]));
      const suggested = suggestGrid(los, map, fileMaHS.map((ma) => byMa.get(ma) ?? { maHS: ma, scoreByCompetency: {} }));
      setMapping(map);
      setGrid(suggested);
      const mapped = Object.values(map).filter((ids) => ids.length > 0).length;
      setNote(`AI ghép được ${mapped}/${los.length} LO. Ô chưa có căn cứ để "N" — cô soát và sửa trước khi đẩy lên SSM.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const setCell = (maHS: string, loCode: string, mark: LoMark) => {
    setGrid((prev) => {
      const next = new Map(prev);
      const row = new Map(next.get(maHS) ?? []);
      row.set(loCode, mark);
      next.set(maHS, row);
      return next;
    });
  };

  const handleOpenPreview = () => {
    if (!ssmLoad || !activeForm) return;
    const diff = diffLoGrid(ssmLoad, grid);
    setPreviewDiff(diff);
    setShowPreviewModal(true);
  };

  const handleConfirmPush = async () => {
    if (!ssmLoad || !activeForm || !previewDiff) return;
    const currentLink = readSsmLink(classId);
    if (!currentLink) {
      setError('Chưa ghép lớp SSM.');
      return;
    }
    const baseBody = buildLoWriteBody(ssmLoad, grid, previewDiff);
    if (!baseBody) {
      showToast('Không có điểm nào mới để đẩy lên.', 'ℹ️');
      return;
    }
    const fullBody = withClassAndCriteria(baseBody, ssmLoad, currentLink.id, activeForm.criteriaId);
    setWriteBusy(true);
    setError('');
    try {
      await writeSsmLoGrades(
        {
          assessmentFormId: activeForm.formId,
          resultAssessmentFormId: ssmLoad.resultAssessmentFormId ?? undefined,
          body: fullBody,
        },
        classId,
      );

      // Đọc lại để kiểm tra
      const verifyRaw = await readSsmClassSubjectAssessment(activeForm.formId, activeForm.criteriaId, currentLink.id);
      const parsedAfter = parseSsmCriteriaLoad(verifyRaw);
      const mismatches = verifyWritten(parsedAfter, fullBody);
      if (mismatches.length > 0) {
        throw new Error(`Đã ghi nhưng có ${mismatches.length} ô chưa khớp khi đọc lại: ${mismatches.slice(0, 3).join(', ')}`);
      }
      setSsmLoad(parsedAfter);
      setShowPreviewModal(false);
      setPreviewDiff(null);
      showToast(`Đã đẩy thành công ${previewDiff.changedCount} điểm LO lên SSM và xác minh khớp 100%!`, '✅');
      setNote(`Đã đẩy thành công ${previewDiff.changedCount} điểm LO lên SSM (${new Date().toLocaleTimeString('vi-VN')}).`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setWriteBusy(false);
    }
  };

  const download = async () => {
    if (!fileBytes) return;
    setBusy('Đang tạo file…');
    setError('');
    try {
      const marks = new Map<string, Map<string, LoMark>>(
        [...grid].map(([ma, row]) => [ma, new Map([...row].filter(([, mk]) => mk !== 'N'))]),
      );
      const out = await fillLoWorkbook(fileBytes.slice(0), marks);
      saveAs(new Blob([out.bytes]), fileName.replace(/\.xlsx$/i, '') + '_dien.xlsx');
      showToast(`Đã tạo file, điền ${out.written} ô điểm.`, '📄');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const sendToSsmExcel = async () => {
    if (!fileBytes) return;
    setBusy('Đang gửi file lên SSM…');
    setError('');
    try {
      const marks = new Map<string, Map<string, LoMark>>(
        [...grid].map(([ma, row]) => [ma, new Map([...row].filter(([, mk]) => mk !== 'N'))]),
      );
      const out = await fillLoWorkbook(fileBytes.slice(0), marks);
      const outName = fileName.replace(/\.xlsx$/i, '') + '_dien.xlsx';
      await attachLoFileToSsm(out.bytes, outName, classId);
      setNote(`Đã gắn file "${outName}" (${out.written} ô điểm) vào trang SSM — cô kiểm tra ô file được tô viền xanh rồi bấm Lưu trên SSM.`);
      showToast('Đã gắn file vào ô SSM; chưa bấm Lưu.', '📄');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy('');
    }
  };

  const mapLabel = (loCode: string): string => {
    const ids = mapping[loCode] ?? [];
    if (ids.length === 0) return '';
    const comps = grade ? competenciesByGrade(grade) : [];
    return ids.map((id) => comps.find((c) => c.id === id)?.topic ?? id).join(', ');
  };

  return (
    <div className="space-y-4">
      {/* KHỐI 1: Đồng bộ trực tiếp qua Server Proxy SSM */}
      <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-black uppercase text-white tracking-wider">
                SSM Server Proxy
              </span>
              <h3 className="text-base font-black text-slate-800">
                Đồng bộ điểm LO trực tiếp qua Server Proxy
              </h3>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Web tự tính điểm LO cho từng học sinh dựa trên bài nộp đã duyệt → Đẩy ngược lên SSM qua Server Proxy (không cần cài Extension).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 shadow-sm"
              title="Quản lý mã kết nối SSM (Server Proxy)"
            >
              <Key className="h-4 w-4" />
              {ssmSession ? (ssmSession.userName || 'Đã kết nối SSM') : 'Kết nối SSM'}
            </button>
            {ssmLink && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                Lớp SSM: <span className="text-indigo-600">{ssmLink.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          {ssmLink ? (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void loadFromSsm()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm shadow-indigo-200"
            >
              <RefreshCw className={`h-4 w-4 ${busy.includes('SSM') ? 'animate-spin' : ''}`} />
              Tải bảng điểm từ SSM
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              Lớp này chưa ghép với lớp SSM. Vào tab <b>Học sinh</b> → <b>Ghép với lớp SSM</b> trước để dùng tính năng đẩy điểm 1-click.
            </div>
          )}

          {availableForms.length > 0 && ssmLink && (
            <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-1.5 text-sm font-bold text-indigo-900">
              Bài đánh giá SSM:
              <select
                value={activeForm?.formId ?? ''}
                onChange={(e) => {
                  const target = availableForms.find((f) => f.formId === Number(e.target.value));
                  if (target) void loadAssessmentForm(target, ssmLink.id);
                }}
                disabled={!!busy}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-800"
              >
                {availableForms.map((f) => (
                  <option key={f.formId} value={f.formId}>
                    {f.quarterName} · {f.formName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
            Kỳ tính điểm:
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as LoPeriodKey)}
              disabled={!!busy}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {los.length > 0 && (
            <button
              type="button"
              disabled={!!busy || !grade}
              onClick={() => void suggestWithAi()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Gợi ý điểm bằng AI
            </button>
          )}

          {ssmLoad && los.length > 0 && (
            <button
              type="button"
              disabled={!!busy || ssmLoad.isApproved}
              onClick={handleOpenPreview}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-60 shadow-md shadow-violet-200"
            >
              <Send className="h-4 w-4" />
              Xem trước & Đẩy lên SSM
            </button>
          )}
        </div>

        {/* Status / Notes */}
        {busy && (
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> {busy}
          </p>
        )}
        {note && !error && (
          <p className="text-sm font-medium text-indigo-800 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2">
            {note}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        {ssmLoad?.isApproved && (
          <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800">
            Bài đánh giá này đã được duyệt (is_approved) trên SSM — bạn chỉ có thể xem, không thể ghi đè.
          </p>
        )}

        {/* KHỐI 2: Fallback dùng file Excel mẫu (accordion) */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowExcelSection((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            {showExcelSection ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Cách phụ: Nhập / Xuất qua file Excel (.xlsx) tải từ SSM
          </button>

          {showExcelSection && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Tải file điểm SSM xuất ra → app điền sẵn từ bài đã duyệt → tải file đã điền để cô tự đưa lên SSM.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickFile(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Upload className="h-3.5 w-3.5" /> Chọn file SSM (.xlsx)
                </button>
                <div className="flex min-w-[16rem] flex-1 items-center gap-1">
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="…hoặc dán link file điểm LO từ SSM"
                    className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!!busy || !link.trim()}
                    onClick={() => void onPickLink()}
                    className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Tải
                  </button>
                </div>
                {fileBytes && (
                  <>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void download()}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" /> Tải file đã điền
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void sendToSsmExcel()}
                      title="Gắn file vào ô upload trên tab SSM đang mở"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Upload className="h-3.5 w-3.5" /> Gắn file vào tab SSM
                    </button>
                  </>
                )}
              </div>
              {fileName && <p className="text-[11px] font-semibold text-slate-500">File: {fileName}</p>}
            </div>
          )}
        </div>
      </div>

      {/* KHỐI 3: Bảng điểm HS × LO */}
      {los.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-max text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-black text-slate-700">Học sinh</th>
                {los.map((lo) => (
                  <th key={lo.loCode} className="px-2 py-2 font-bold text-slate-600" title={`${lo.loCode}: ${lo.text}`}>
                    <div className="max-w-[9rem]">
                      <div className="truncate font-semibold">{lo.text}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{lo.loCode}</div>
                      {mapLabel(lo.loCode) && (
                        <div className="truncate text-[11px] font-medium text-indigo-500">↳ {mapLabel(lo.loCode)}</div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileMaHS.map((ma) => (
                <tr key={ma} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <div className="font-semibold text-slate-800">{nameByCode.get(ma) ?? '(không có trong lớp app)'}</div>
                    <div className="text-[11px] font-mono text-slate-400">{ma}</div>
                  </td>
                  {los.map((lo) => (
                    <td key={lo.loCode} className="px-2 py-1.5">
                      <select
                        value={grid.get(ma)?.get(lo.loCode) ?? 'N'}
                        onChange={(e) =>
                          setCell(ma, lo.loCode, (e.target.value === 'N' ? 'N' : Number(e.target.value)) as LoMark)
                        }
                        className={`min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold ${
                          (grid.get(ma)?.get(lo.loCode) ?? 'N') === 'N' ? 'text-slate-400' : 'text-slate-800 font-bold'
                        }`}
                      >
                        {MARK_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal xem trước & xác nhận đẩy điểm lên SSM */}
      {previewDiff && ssmLoad && activeForm && (
        <LoPushPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          diff={previewDiff}
          load={ssmLoad}
          assessmentName={`${activeForm.quarterName} · ${activeForm.formName}`}
          onConfirm={handleConfirmPush}
          isBusy={writeBusy}
        />
      )}

      {/* Modal kết nối tài khoản SSM qua Server Proxy */}
      <SsmConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={(s) => {
          setSsmSession(s);
          void loadFromSsm();
        }}
        showToast={showToast}
      />
    </div>
  );
};
