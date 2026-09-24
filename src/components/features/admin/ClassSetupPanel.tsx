import { useMemo, useState } from 'react';
import { CheckCircle2, FolderSearch, Link2, Loader2, Plus } from 'lucide-react';
import { getDriveAccessToken, listFolderFiles } from '../../../lib/googleDrive';
import { readSheetValues } from '../../../lib/classroom/sheetsApi';
import { CLASS_FILES_FOLDER_ID } from '../../../lib/admin/adminConfig';
import { findExistingClass, parseClassFileName, parseRoster, suggestTeacherUid, type ClassFileInfo } from '../../../lib/admin/classSetup';
import { createClassForTeacher, linkExamSheetToClass, type AdminOverview } from '../../../lib/admin/adminApi';

interface FileRow {
  id: string;
  title: string;
  info: ClassFileInfo;
}

interface Props {
  overview: AdminOverview;
  /** Tải lại tổng quan sau khi tạo/nối để trạng thái cập nhật. */
  onChanged: () => Promise<void>;
}

/**
 * Chuẩn bị lớp cho giáo viên từ folder Drive. Lớp đã có → CHỈ nối file điểm; lớp chưa có → tạo mới
 * cho đúng tài khoản giáo viên, danh sách học sinh lấy từ tab MOET của file lớp.
 * Đọc Drive bằng quyền Google của chủ dự án (xem được cả folder); máy chủ ghi lớp và chặn tạo trùng.
 */
export const ClassSetupPanel = ({ overview, onChanged }: Props) => {
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const teachers = useMemo(
    () => [...overview.users].sort((a, b) => String(a.displayName ?? a.email).localeCompare(String(b.displayName ?? b.email), 'vi')),
    [overview.users],
  );
  const setupClasses = useMemo(
    () => overview.classes.map(c => ({ id: c.id, name: c.name, teacherId: c.teacherId, examSheetId: c.examSheetId })),
    [overview.classes],
  );

  const scan = async () => {
    setBusy('scan');
    setError(null);
    try {
      const token = await getDriveAccessToken();
      const list = await listFolderFiles(CLASS_FILES_FOLDER_ID, token);
      const rows = list
        .filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet')
        .map(f => ({ id: f.id, title: f.name, info: parseClassFileName(f.name) }))
        .filter((f): f is FileRow => f.info !== null)
        .sort((a, b) => a.info.teacherName.localeCompare(b.info.teacherName, 'vi') || a.info.className.localeCompare(b.info.className, 'vi'));
      setFiles(rows);
      setChosen(Object.fromEntries(rows.map(f => [f.id, suggestTeacherUid(f, overview.users, setupClasses) ?? ''])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được folder Drive.');
    } finally {
      setBusy(null);
    }
  };

  const note = (fileId: string, text: string) => setMessages(m => ({ ...m, [fileId]: text }));

  const createClass = async (file: FileRow, teacherUid: string) => {
    setBusy(file.id);
    try {
      const [rows] = await readSheetValues(file.id, ["'MOET'!A1:B200"]);
      const students = parseRoster(rows);
      if (students.length === 0) { note(file.id, 'Tab MOET không có học sinh nào — chưa tạo.'); return; }
      const teacher = overview.users.find(u => u.uid === teacherUid);
      if (!window.confirm(`Tạo lớp "${file.info.className}" cho ${teacher?.displayName ?? teacher?.email} với ${students.length} học sinh (lấy từ tab MOET)?`)) return;
      const result = await createClassForTeacher({ teacherUid, name: file.info.className, students, examSheet: { spreadsheetId: file.id, spreadsheetTitle: file.title } });
      note(file.id, `Đã tạo lớp, ${result.studentCount} học sinh, đã nối file điểm.`);
      await onChanged();
    } catch (e) {
      note(file.id, e instanceof Error ? e.message : 'Không tạo được lớp.');
    } finally {
      setBusy(null);
    }
  };

  const linkClass = async (file: FileRow, classId: string) => {
    setBusy(file.id);
    try {
      await linkExamSheetToClass(classId, { spreadsheetId: file.id, spreadsheetTitle: file.title });
      note(file.id, 'Đã nối file điểm vào lớp có sẵn (không đụng học sinh/bài).');
      await onChanged();
    } catch (e) {
      note(file.id, e instanceof Error ? e.message : 'Không nối được file điểm.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800"><FolderSearch className="h-4 w-4" /> 5. Chuẩn bị lớp từ folder Drive</h2>
        <button type="button" onClick={() => void scan()} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy === 'scan' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderSearch className="h-3.5 w-3.5" />} Quét folder "Lộ trình Toán THPT"
        </button>
      </div>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
        Lớp đã có (đã nối file, hoặc trùng tên lớp của đúng giáo viên) chỉ được <b>nối file điểm</b> — không đụng học sinh, bài giao, tên lớp. Lớp chưa có thì tạo mới, danh sách học sinh lấy từ tab MOET. Kiểm tài khoản giáo viên trước khi bấm.
      </p>
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      {files && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">File lớp</th><th className="py-2 pr-3">Tài khoản giáo viên</th><th className="py-2 pr-3">Trạng thái / việc cần làm</th>
            </tr></thead>
            <tbody>
              {files.map(file => {
                const teacherUid = chosen[file.id] ?? '';
                const existing = findExistingClass(file, teacherUid || null, setupClasses);
                const linked = existing?.examSheetId === file.id;
                return (
                  <tr key={file.id} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-3"><p className="font-bold text-slate-800">{file.info.className}</p><p className="text-xs text-slate-500">{file.info.teacherName}</p></td>
                    <td className="py-2 pr-3">
                      <select value={teacherUid} onChange={e => setChosen(c => ({ ...c, [file.id]: e.target.value }))} className="w-64 rounded-xl border border-slate-200 px-2 py-1.5 text-xs">
                        <option value="">— chọn tài khoản —</option>
                        {teachers.map(u => <option key={u.uid} value={u.uid}>{u.displayName ? `${u.displayName} · ${u.email}` : u.email}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      {linked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Đã có lớp "{existing?.name}" và đã nối file điểm</span>
                      ) : existing ? (
                        <button type="button" disabled={busy !== null} onClick={() => void linkClass(file, existing.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                          {busy === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Lớp có sẵn "{existing.name}" — chỉ nối file điểm
                        </button>
                      ) : (
                        <button type="button" disabled={busy !== null || !teacherUid} onClick={() => void createClass(file, teacherUid)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40">
                          {busy === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Tạo lớp mới + nối file điểm
                        </button>
                      )}
                      {messages[file.id] && <p className="mt-1 text-xs font-semibold text-slate-600">{messages[file.id]}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
