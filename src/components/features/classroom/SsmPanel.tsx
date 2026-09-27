import { useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { Download, Link as LinkIcon, Loader2, Sparkles, Upload } from 'lucide-react';
import type { AppData, Student } from '../../../types';

type Settings = AppData['settings'];
import { callAI } from '../../../lib/aiProviders';
import { listAssignmentsForClass, listSubmissionsForClass } from '../../../lib/classroom/submissionService';
import { asCompetencyGrade, competenciesByGrade } from '../../../lib/classroom/competency/framework';
import { SSM_SCALE_4, type LoMark } from '../../../lib/ssm/loScore';
import { readLoWorkbook, fillLoWorkbook } from '../../../lib/ssm/loWorkbook';
import { parseLoInfo, suggestGrid, type LoInfo, type LoMapping } from '../../../lib/ssm/loMapping';
import { buildLoMappingPrompt, parseLoMappingResponse } from '../../../lib/ssm/loMappingPrompt';
import { buildClassLoScores } from '../../../lib/ssm/loClassScores';
import { fetchSsmTemplateByLink } from '../../../lib/classroom/teacherService';

interface Props {
  classId: string;
  teacherId: string;
  classGrade: string;
  students: Student[];
  settings: Settings;
  showToast: (message: string, icon?: string) => void;
}

const MARK_OPTIONS: LoMark[] = ['N', ...SSM_SCALE_4];
const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Có lỗi, thử lại sau.');

/**
 * Thẻ "Điểm LO" trong tab SSM: cô tải file mẫu SSM xuất ra → app điền sẵn điểm từ bài đã duyệt
 * (AI ghép LO ↔ năng lực, cô sửa tay được) → tải file đã điền để cô tự đưa lên SSM.
 * App KHÔNG tự ghi vào SSM.
 */
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

  const loadBytes = async (bytes: ArrayBuffer, name: string) => {
    setError('');
    setNote('');
    setMapping({});
    try {
      const info = await readLoWorkbook(bytes);
      const loList = info.loHeaders.map(parseLoInfo).filter((x): x is LoInfo => x !== null);
      setFileBytes(bytes);
      setFileName(name);
      setLos(loList);
      setFileMaHS(info.maHSList);
      setGrid(emptyGrid(info.maHSList, loList));
      setNote(`Đã đọc ${loList.length} LO, ${info.maHSList.length} học sinh. Bấm "Gợi ý điểm bằng AI" hoặc tự điền.`);
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
      );
      const byMa = new Map(scores.map((s) => [s.maHS, s]));
      const suggested = suggestGrid(los, map, fileMaHS.map((ma) => byMa.get(ma) ?? { maHS: ma, scoreByCompetency: {} }));
      setMapping(map);
      setGrid(suggested);
      const mapped = Object.values(map).filter((ids) => ids.length > 0).length;
      setNote(`AI ghép được ${mapped}/${los.length} LO. Ô chưa có căn cứ để "N" — cô soát và sửa trước khi tải về.`);
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

  const mapLabel = (loCode: string): string => {
    const ids = mapping[loCode] ?? [];
    if (ids.length === 0) return '';
    const comps = grade ? competenciesByGrade(grade) : [];
    return ids.map((id) => comps.find((c) => c.id === id)?.topic ?? id).join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">SSM · Điểm LO</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Tải file điểm SSM xuất ra → app điền sẵn từ bài đã duyệt → cô tải về rồi tự đưa lên SSM. App không tự ghi vào SSM.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">
            <Upload className="h-4 w-4" /> Chọn file SSM (.xlsx)
          </button>
          <div className="flex min-w-[16rem] flex-1 items-center gap-1">
            <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="…hoặc dán link file điểm LO từ SSM"
              className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
            <button type="button" disabled={!!busy || !link.trim()} onClick={() => void onPickLink()} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              <LinkIcon className="h-4 w-4" /> Tải
            </button>
          </div>
          {los.length > 0 && (
            <button type="button" disabled={!!busy || !grade} onClick={() => void suggestWithAi()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
              <Sparkles className="h-4 w-4" /> Gợi ý điểm bằng AI
            </button>
          )}
          {los.length > 0 && (
            <button type="button" disabled={!!busy} onClick={() => void download()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
              <Download className="h-4 w-4" /> Tải file đã điền
            </button>
          )}
        </div>
        {fileName && <p className="mt-2 text-xs font-semibold text-slate-500">File: {fileName}</p>}
        {busy && <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</p>}
        {note && !error && <p className="mt-2 text-sm font-medium text-indigo-700">{note}</p>}
        {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {los.length > 0 && !grade && <p className="mt-2 text-sm font-semibold text-amber-700">Lớp chưa rõ khối (10/11/12) nên chưa gợi ý điểm được; cô vẫn điền tay và tải về được.</p>}
      </div>

      {los.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-max text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-black text-slate-700">Học sinh</th>
                {los.map((lo) => (
                  <th key={lo.loCode} className="px-2 py-2 font-bold text-slate-600" title={`${lo.loCode}: ${lo.text}`}>
                    <div className="max-w-[9rem]">
                      <div className="truncate">{lo.text}</div>
                      {mapLabel(lo.loCode) && <div className="truncate text-[11px] font-medium text-indigo-500">↳ {mapLabel(lo.loCode)}</div>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileMaHS.map((ma) => (
                <tr key={ma} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <div className="font-semibold text-slate-800">{nameByCode.get(ma) ?? '(không có trong lớp app)'}</div>
                    <div className="text-[11px] text-slate-400">{ma}</div>
                  </td>
                  {los.map((lo) => (
                    <td key={lo.loCode} className="px-2 py-1.5">
                      <select
                        value={grid.get(ma)?.get(lo.loCode) ?? 'N'}
                        onChange={(e) => setCell(ma, lo.loCode, (e.target.value === 'N' ? 'N' : Number(e.target.value)) as LoMark)}
                        className={`min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold ${(grid.get(ma)?.get(lo.loCode) ?? 'N') === 'N' ? 'text-slate-400' : 'text-slate-800'}`}
                      >
                        {MARK_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
