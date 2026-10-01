import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { ClipboardCopy, FileSpreadsheet, KeyRound, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { listParentPublished, issueParentPins, resetParentPin, unpublishParentReports } from '../../../lib/classroom/teacherService';
import { DEFAULT_PARENT_MESSAGE, parentPortalLink, renderParentMessage, type PublishedParentGroup } from '../../../lib/classroom/parentAccess';
import { REPORT_KINDS } from '../../../lib/classroom/reportKinds';
import { SSM_MERGE_MESSAGE, buildSsmMergeWorkbook, missingCodeCount } from '../../../lib/classroom/ssmMailMerge';
import type { Student } from '../../../types';

interface Props {
  classId: string;
  className: string;
  /** Danh sách lớp — lấy mã học sinh (khớp mã trên SSM) cho file Mail merge. */
  students: readonly Student[];
  /** Tăng lên mỗi khi vừa công bố báo cáo để danh sách "Đã công bố" tải lại. */
  refreshKey: number;
  showToast: (msg: string, icon?: any) => void;
}

interface PinRow { studentId: string; name: string; pin: string }

const TEMPLATE_KEY = 'smartplan.parentMessageTemplate';
const readTemplate = (): string => {
  try { return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_PARENT_MESSAGE; } catch { return DEFAULT_PARENT_MESSAGE; }
};

const copy = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

/**
 * Cổng phụ huynh phía giáo viên: cấp PIN riêng, soạn sẵn tin nhắn (link + PIN) cho từng phụ huynh để chép/Excel,
 * và danh sách kì đã công bố (gỡ được). Giáo viên chỉ phát PIN MỘT LẦN đầu năm; mỗi tháng chỉ cần bấm "Công bố".
 */
export const ClassParentAccessPanel = ({ classId, className, students, refreshKey, showToast }: Props) => {
  const [rows, setRows] = useState<PinRow[] | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [template, setTemplate] = useState(readTemplate);
  const [dangGoi, setDangGoi] = useState(false);
  const [groups, setGroups] = useState<PublishedParentGroup[]>([]);

  const link = joinCode ? parentPortalLink(window.location.origin, joinCode) : '';
  const messageOf = (row: PinRow) => renderParentMessage(template, { ten: row.name, lop: className, link, pin: row.pin });

  const taiDanhSach = useCallback(async () => {
    try { setGroups(await listParentPublished(classId)); } catch { setGroups([]); }
  }, [classId]);
  useEffect(() => { void taiDanhSach(); }, [taiDanhSach, refreshKey]);
  useEffect(() => { setRows(null); setJoinCode(''); }, [classId]);

  const capPin = async () => {
    setDangGoi(true);
    try {
      const data = await issueParentPins(classId);
      setRows(data.rows);
      setJoinCode(data.joinCode);
      if (!data.joinCode) showToast('Lớp chưa có mã lớp trên máy chủ — bấm "Đồng bộ ngay" rồi thử lại.', 'warning');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không cấp được PIN phụ huynh.', 'error');
    } finally {
      setDangGoi(false);
    }
  };

  const luuMau = (value: string) => {
    setTemplate(value);
    try { localStorage.setItem(TEMPLATE_KEY, value); } catch { /* không lưu được thì dùng tạm */ }
  };

  const chep = async (text: string, ok: string) => {
    const done = await copy(text);
    showToast(done ? ok : 'Trình duyệt không cho chép — hãy bôi đen và chép tay.', done ? 'success' : 'warning');
  };

  const capLai = async (row: PinRow) => {
    try {
      const { pin } = await resetParentPin(classId, row.studentId);
      setRows(current => current?.map(r => (r.studentId === row.studentId ? { ...r, pin } : r)) ?? null);
      showToast(`Đã cấp PIN mới cho phụ huynh ${row.name}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không cấp lại được PIN.', 'error');
    }
  };

  const taiExcel = () => {
    if (!rows) return;
    const sheet = XLSX.utils.aoa_to_sheet([
      ['STT', 'Học sinh', 'PIN phụ huynh', 'Link', 'Tin nhắn gửi phụ huynh'],
      ...rows.map((row, index) => [index + 1, row.name, row.pin, link, messageOf(row)]),
    ]);
    sheet['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 14 }, { wch: 40 }, { wch: 90 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Phụ huynh');
    XLSX.writeFile(book, `PIN phu huynh - ${className}.xlsx`.replace(/[\\/:*?"<>|]+/g, ' '));
  };

  /** File Excel Mail merge cho SSM Edufit: mỗi phụ huynh nhận tin riêng có PIN + link của con qua app Edufit Parents. */
  const taiExcelSsm = () => {
    if (!rows) return;
    const codeOf = new Map(students.map(student => [student.id, student.code ?? '']));
    const input = rows.map(row => ({ code: codeOf.get(row.studentId) ?? '', name: row.name, pin: row.pin }));
    const thieu = missingCodeCount(input);
    XLSX.writeFile(buildSsmMergeWorkbook(input, link), `Mail merge SSM - ${className}.xlsx`.replace(/[\\/:*?"<>|]+/g, ' '));
    showToast(thieu > 0
      ? `Đã tải file. ${thieu} em chưa có mã học sinh — SSM sẽ tô đỏ dòng đó, ghép lớp với SSM hoặc nhập mã rồi tải lại.`
      : 'Đã tải file Mail merge — vào SSM → Thông tin → Mail merge để tải lên.', thieu > 0 ? 'warning' : 'success');
  };

  const go = async (group: PublishedParentGroup) => {
    if (!window.confirm(`Gỡ "${group.title || group.range}" của ${group.count} em khỏi cổng phụ huynh? Phụ huynh sẽ không xem được nữa (công bố lại được).`)) return;
    try {
      const { removed } = await unpublishParentReports(classId, group);
      showToast(`Đã gỡ ${removed} báo cáo.`);
      void taiDanhSach();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không gỡ được.', 'error');
    }
  };

  const nhan = (kind: string) => REPORT_KINDS.find(item => item.kind === kind)?.label ?? kind;

  return (
    <section className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Send className="h-4 w-4 text-emerald-600" /> Phụ huynh xem báo cáo trực tuyến</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        Phụ huynh vào <b>một đường dẫn chung của lớp</b>, chọn tên con, nhập PIN riêng là xem được các báo cáo thầy cô đã công bố (không cần tải PDF). PIN cấp một lần đầu năm; mỗi tháng chỉ bấm “Công bố cho phụ huynh” ở trên.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void capPin()} disabled={dangGoi} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
          {dangGoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {rows ? 'Tải lại bảng PIN' : 'Cấp PIN phụ huynh & soạn tin nhắn'}
        </button>
        {rows && link && (
          <>
            <button type="button" onClick={() => void chep(link, 'Đã chép link lớp.')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-50"><ClipboardCopy className="h-4 w-4" /> Chép link lớp</button>
            <button type="button" onClick={() => void chep(rows.map(messageOf).join('\n\n— — —\n\n'), `Đã chép ${rows.length} tin nhắn.`)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-50"><ClipboardCopy className="h-4 w-4" /> Chép tất cả tin nhắn</button>
            <button type="button" onClick={taiExcel} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4" /> Tải Excel</button>
            <button type="button" onClick={taiExcelSsm} title="Gửi PIN + link tới từng phụ huynh qua SSM (app Edufit Parents) bằng tính năng Mail merge" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-800 hover:bg-indigo-50"><FileSpreadsheet className="h-4 w-4" /> Excel cho SSM (Mail merge)</button>
            <button type="button" onClick={() => void chep(SSM_MERGE_MESSAGE, 'Đã chép nội dung tin cho SSM — dán vào ô nội dung, giữ nguyên các chỗ {…}.')} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-800 hover:bg-indigo-50"><ClipboardCopy className="h-4 w-4" /> Chép nội dung tin SSM</button>
          </>
        )}
      </div>

      {rows && (
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-bold text-slate-500">
            Mẫu tin nhắn (dùng {'{ten}'} {'{lop}'} {'{link}'} {'{pin}'}; tự lưu trên máy này)
            <textarea value={template} onChange={event => luuMau(event.target.value)} rows={6} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800" />
          </label>
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-emerald-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Học sinh</th><th className="px-3 py-2">PIN</th><th className="px-3 py-2 text-right">Tin nhắn</th></tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.studentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold text-slate-800">{row.name}</td>
                    <td className="px-3 py-2 font-black tracking-widest text-slate-900">{row.pin}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => void chep(messageOf(row), `Đã chép tin nhắn cho phụ huynh ${row.name}.`)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700"><ClipboardCopy className="h-3.5 w-3.5" /> Chép</button>
                        <button type="button" onClick={() => void capLai(row)} title="Cấp PIN mới (quên PIN / bị khoá)" className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900">Gửi qua SSM: bấm "Excel cho SSM" → trên SSM vào <b>Thông tin → Mail merge</b>, tải file lên, bấm "Chép nội dung tin SSM" rồi dán vào ô nội dung. <b>Xem bản demo của SSM trước khi gửi</b> để chắc các chỗ {'{…}'} đã thay đúng PIN và link của từng em.</p>
          <p className="text-xs font-semibold text-slate-500">PIN là mã riêng từng em — gửi riêng cho từng phụ huynh, đừng gửi cả bảng vào nhóm chung. Chỉ link lớp mới gửi chung được.</p>
        </div>
      )}

      <div className="mt-4 border-t border-emerald-100 pt-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Đã công bố cho phụ huynh</p>
        {groups.length === 0 ? (
          <p className="mt-1 text-xs font-semibold text-slate-500">Chưa công bố kì nào.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {groups.map(group => (
              <li key={`${group.kind}|${group.from}|${group.to}`} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-emerald-100">
                <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{group.title || `${nhan(group.kind)} · ${group.range}`}</span>
                <span className="shrink-0 text-xs font-bold text-slate-500">{group.count} em</span>
                <button type="button" onClick={() => void go(group)} title="Gỡ khỏi cổng phụ huynh" className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
