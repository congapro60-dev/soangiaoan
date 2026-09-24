import { useState } from 'react';
import { Download, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import type { Student } from '../../../types';
import { readSsmLink, saveSsmLink, ssmRequest } from '../../../lib/ssm/ssmBridge';
import {
  emailsMatch,
  guessSsmClass,
  matchRoster,
  parseClasses,
  parseProfileEmail,
  parseStudents,
  pickCurrentSchoolYear,
  type RosterMatch,
  type SsmClass,
} from '../../../lib/ssm/ssmModel';

interface Props {
  classId: string;
  className: string;
  students: Student[];
  userEmail: string | null;
}

const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Có lỗi, thử lại sau.';

/**
 * Ghép lớp app với lớp SSM rồi so danh sách học sinh theo Mã HS. CHỈ ĐỌC SSM — không sửa lớp app,
 * không ghi gì lên SSM. Cần tiện ích Edge "SmartPlan ↔ SSM" và một tab SSM đang đăng nhập.
 */
export const SsmLinkPanel = ({ classId, className, students, userEmail }: Props) => {
  const [link, setLink] = useState(() => readSsmLink(classId));
  const [choices, setChoices] = useState<SsmClass[] | null>(null);
  const [picked, setPicked] = useState<number | ''>('');
  const [roster, setRoster] = useState<RosterMatch | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [needInstall, setNeedInstall] = useState(false);

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  };

  const loadClasses = () => run('Đang đọc lớp trên SSM…', async () => {
    try {
      await ssmRequest('ping');
      setNeedInstall(false);
    } catch (err) {
      setNeedInstall(true);
      throw err;
    }
    if (!userEmail) throw new Error('Đăng nhập app bằng mail trường trước khi ghép với SSM.');
    const email = parseProfileEmail(await ssmRequest('profile'));
    if (!emailsMatch(email, userEmail)) {
      throw new Error(`Tab SSM đang đăng nhập ${email || 'tài khoản không rõ'}, khác tài khoản app ${userEmail || ''}. Đăng nhập SSM đúng mail trường của bạn.`);
    }
    const year = pickCurrentSchoolYear(await ssmRequest('schoolYears'));
    if (!year) throw new Error('Không tìm thấy năm học đang chạy trên SSM.');
    const classes = parseClasses(await ssmRequest('teacherClasses', { schoolYearId: year.id }));
    if (classes.length === 0) throw new Error('SSM không trả lớp nào bạn dạy trong năm học này.');
    setChoices(classes);
    setPicked(guessSsmClass(className, classes)?.id ?? '');
  });

  const confirmLink = () => {
    const chosen = choices?.find(c => c.id === picked);
    if (!chosen) return;
    saveSsmLink(classId, chosen);
    setLink(chosen);
    setChoices(null);
    setRoster(null);
  };

  const unlink = () => {
    saveSsmLink(classId, null);
    setLink(null);
    setRoster(null);
  };

  const compareRoster = () => run('Đang so danh sách với SSM…', async () => {
    if (!link) return;
    const { students: ssmStudents, unknownKeys } = parseStudents(await ssmRequest('classStudents', { classId: link.id }));
    if (unknownKeys) throw new Error(`Chưa đọc được mã học sinh từ SSM (các ô SSM trả về: ${unknownKeys.join(', ')}). Gửi dòng này cho người làm app.`);
    setRoster(matchRoster(students, ssmStudents));
  });

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">SSM trường</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {link ? <>Đã ghép với lớp SSM <b>{link.name}</b></> : 'Chưa ghép lớp này với SSM.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {link ? (
            <>
              <button type="button" disabled={!!busy} onClick={() => void compareRoster()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                <RefreshCw className="h-4 w-4" /> So danh sách với SSM
              </button>
              <button type="button" disabled={!!busy} onClick={unlink} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100 disabled:opacity-60">
                <Unlink className="h-4 w-4" /> Bỏ ghép
              </button>
            </>
          ) : !choices && (
            <button type="button" disabled={!!busy} onClick={() => void loadClasses()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
              <Link2 className="h-4 w-4" /> Ghép với lớp SSM
            </button>
          )}
        </div>
      </div>

      {choices && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={picked} onChange={e => setPicked(e.target.value ? Number(e.target.value) : '')} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value="">— Chọn lớp SSM —</option>
            {choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" disabled={picked === ''} onClick={confirmLink} className="min-h-10 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">Ghép</button>
          <button type="button" onClick={() => setChoices(null)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600">Huỷ</button>
        </div>
      )}

      {busy && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</p>}
      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      {needInstall && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3 text-sm text-slate-700">
          <p className="font-black text-slate-900">Cài tiện ích SSM cho Edge (làm 1 lần, khoảng 1 phút)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 font-medium">
            <li><a href="/downloads/ssm-bridge.zip" download className="inline-flex items-center gap-1 font-black text-indigo-700 underline"><Download className="h-4 w-4" /> Tải tiện ích</a>, rồi giải nén (chuột phải → Extract All).</li>
            <li>Mở tab mới, gõ <b>edge://extensions</b>, bật <b>Chế độ nhà phát triển</b> (công tắc cạnh trái).</li>
            <li>Bấm <b>Tải tiện ích đã giải nén</b>, chọn thư mục <b>ssm-bridge</b> vừa giải nén.</li>
            <li>Mở <b>ssm.edufit.vn</b> trong một tab (đăng nhập mail trường), rồi tải lại trang này.</li>
          </ol>
        </div>
      )}

      {roster && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-bold text-emerald-700">Khớp Mã HS: {roster.matched.length} em</p>
          {roster.onlyInApp.length > 0 && (
            <p className="font-semibold text-amber-700">Có trong app, không có trên SSM ({roster.onlyInApp.length}): {roster.onlyInApp.map(s => `${s.name}${s.code ? ` (${s.code})` : ' (chưa có mã)'}`).join(', ')}</p>
          )}
          {roster.onlyInSsm.length > 0 && (
            <p className="font-semibold text-amber-700">Có trên SSM, chưa có trong app ({roster.onlyInSsm.length}): {roster.onlyInSsm.map(s => `${s.name || 'Không tên'} (${s.code})`).join(', ')}</p>
          )}
          {roster.onlyInApp.length === 0 && roster.onlyInSsm.length === 0 && <p className="font-semibold text-slate-600">Danh sách app và SSM trùng khớp.</p>}
          <p className="text-xs font-medium text-slate-500">Chỉ so sánh — app không tự thêm hay xoá học sinh.</p>
        </div>
      )}
    </div>
  );
};
