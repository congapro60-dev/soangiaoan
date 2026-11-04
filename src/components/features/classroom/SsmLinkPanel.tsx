import { useEffect, useState } from 'react';
import { Download, Key, Link2, Loader2, RefreshCw, Unlink, UserPlus } from 'lucide-react';
import type { Student } from '../../../types';
import {
  getStoredSsmSession,
  pingSsmBridge,
  readSsmLink,
  readSsmLinkCloud,
  saveSsmLink,
  saveSsmLinkCloud,
  ssmRequest,
  type StoredSsmSession,
} from '../../../lib/ssm/ssmBridge';
import { SsmConnectModal } from './SsmConnectModal';
import { getLinkedGoogleEmail } from '../../../lib/adminLink';
import {
  guessSsmClass,
  matchRoster,
  parseClasses,
  parseProfileEmail,
  parseStudents,
  pickCurrentSchoolYear,
  ssmAccountAllowed,
  type RosterMatch,
  type SsmClass,
} from '../../../lib/ssm/ssmModel';

interface Props {
  classId: string;
  className: string;
  students: Student[];
  userEmail: string | null;
  /** UID Firebase — để đồng bộ ghép lớp lên cloud (Hạng mục 4). */
  userId?: string | null;
  /** Callback khi bấm "Cập nhật DS học sinh từ SSM" — cha cập nhật danh sách lớp. */
  onSyncStudents?: (students: Student[]) => Promise<void>;
}

const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Có lỗi, thử lại sau.';

/**
 * Ghép lớp app với lớp SSM rồi so danh sách học sinh theo Mã HS. CHỈ ĐỌC SSM — không sửa lớp app,
 * không ghi gì lên SSM. Cần tiện ích Edge "SmartPlan ↔ SSM" (tiện ích tự nhớ phiên, không bắt mở tab SSM thủ công).
 *
 * HẠNG MỤC 4: ghép lớp đồng bộ lên Firestore (đổi máy không phải ghép lại);
 * nút "Cập nhật DS học sinh từ SSM" thêm học sinh mới từ SSM vào lớp app trong 1 click.
 */
export const SsmLinkPanel = ({ classId, className, students, userEmail, userId, onSyncStudents }: Props) => {
  const [link, setLink] = useState(() => readSsmLink(classId));
  const [choices, setChoices] = useState<SsmClass[] | null>(null);
  const [picked, setPicked] = useState<number | ''>('');
  const [roster, setRoster] = useState<RosterMatch | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [needInstall, setNeedInstall] = useState(false);
  const [workspace, setWorkspace] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ssmSession, setSsmSession] = useState<StoredSsmSession | null>(() => getStoredSsmSession());

  // HẠNG MỤC 4: lúc mở panel, thử lấy ghép lớp từ cloud (trường hợp đổi máy / xoá cache).
  useEffect(() => {
    const local = readSsmLink(classId); setLink(local); setChoices(null); setRoster(null); setPicked('');
    if (!userId || local) return;
    let cancelled = false;
    void readSsmLinkCloud(userId, classId).then(cloud => {
      if (!cancelled && cloud) { saveSsmLink(classId,cloud); setLink(cloud); }
    }).catch(error => { if(!cancelled) setError(errorText(error)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, classId]);

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
      await pingSsmBridge();
      setNeedInstall(false);
    } catch (err) {
      if (!getStoredSsmSession()) {
        setShowConnectModal(true);
      }
      setNeedInstall(true);
      throw err;
    }
    if (!userEmail) throw new Error('Đăng nhập app bằng mail trường trước khi ghép với SSM.');
    const profile = await ssmRequest('profile') as {ssmWorkspace?:string};
    const email = parseProfileEmail(profile);
    if (!profile.ssmWorkspace) throw new Error('Tiện ích SSM cần cập nhật lên 0.3.1 rồi tải lại trang.');
    setWorkspace(profile.ssmWorkspace);
    if (!ssmAccountAllowed(email, userEmail, getLinkedGoogleEmail())) {
      throw new Error(`Tab SSM đang đăng nhập ${email || 'tài khoản không rõ'}, khác tài khoản app ${userEmail || ''}. Đăng nhập SSM đúng mail trường của bạn.`);
    }
    const year = pickCurrentSchoolYear(await ssmRequest('schoolYears'));
    if (!year) throw new Error('Không tìm thấy năm học đang chạy trên SSM.');
    const classes = parseClasses(await ssmRequest('teacherClasses', { schoolYearId: year.id }));
    if (classes.length === 0) throw new Error('SSM không trả lớp nào bạn dạy trong năm học này.');
    setChoices(classes);
    setPicked(guessSsmClass(className, classes)?.id ?? '');
  });

  const confirmLink = () => run('Đang lưu ghép lớp…', async () => {
    const chosen = choices?.find(c => c.id === picked);
    if (!chosen) return;
    const newLink = { id: chosen.id, name: chosen.name, workspace };
    // HẠNG MỤC 4: lưu đồng thời lên cloud (nếu đã đăng nhập).
    if (!userId) throw new Error('Đăng nhập giáo viên trước khi ghép lớp.');
    await saveSsmLinkCloud(userId, classId, newLink);
    setLink(newLink);
    setChoices(null);
    setRoster(null);
  });

  const unlink = () => run('Đang bỏ ghép lớp…', async () => {
    if (!userId) throw new Error('Đăng nhập giáo viên trước khi bỏ ghép.');
    await saveSsmLinkCloud(userId, classId, null);
    setLink(null);
    setRoster(null);
  });

  const compareRoster = () => run('Đang so danh sách với SSM…', async () => {
    if (!link) return;
    const { students: ssmStudents, unknownKeys } = parseStudents(await ssmRequest('classStudents', { classId: link.id, expectedWorkspace: link.workspace || '__relink_required__' }));
    if (unknownKeys) throw new Error(`Chưa đọc được mã học sinh từ SSM (các ô SSM trả về: ${unknownKeys.join(', ')}). Gửi dòng này cho người làm app.`);
    setRoster(matchRoster(students, ssmStudents));
  });

  // HẠNG MỤC 4: 1-click cập nhật danh sách học sinh từ SSM về lớp app.
  const syncStudentsFromSsm = () => run('Đang cập nhật danh sách từ SSM…', async () => {
    if (!link) return;
    if (!onSyncStudents) throw new Error('Chức năng đồng bộ chưa được bật cho lớp này.');
    const { students: ssmStudents, unknownKeys } = parseStudents(await ssmRequest('classStudents', { classId: link.id, expectedWorkspace: link.workspace || '__relink_required__' }));
    if (unknownKeys) throw new Error(`Chưa đọc được mã học sinh từ SSM (các ô SSM trả về: ${unknownKeys.join(', ')}).`);
    const existingCodes = new Set(students.map(s => s.code.trim().toUpperCase()).filter(Boolean));
    const fresh: Student[] = [];
    let added = 0;
    for (const s of ssmStudents) {
      const code = (s.code || '').trim().toUpperCase();
      if (!code) continue;
      if (existingCodes.has(code)) continue; // đã có trong app — giữ nguyên (không ghi đè tên)
      existingCodes.add(code);
      fresh.push({
        id: `ssm-${link.id}-${encodeURIComponent(code)}`,
        name: s.name || code,
        code,
        progress: 0,
        status: 'active',
      });
      added++;
    }
    if (added === 0) {
      setError('');
      setRoster(matchRoster(students, ssmStudents));
      throw new Error('Danh sách đã khớp với SSM — không có học sinh mới.');
    }
    await onSyncStudents(fresh);
    setRoster(null);
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
            title="Quản lý mã kết nối SSM (Server Proxy — không cần tiện ích)"
          >
            <Key className="h-4 w-4" />
            {ssmSession ? (ssmSession.userName || 'Đã kết nối SSM') : 'Kết nối SSM'}
          </button>

          {link ? (
            <>
              <button type="button" disabled={!!busy} onClick={() => void compareRoster()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                <RefreshCw className="h-4 w-4" /> So danh sách với SSM
              </button>
              {onSyncStudents && (
                <button type="button" disabled={!!busy} onClick={() => void syncStudentsFromSsm()} title="Thêm học sinh mới từ SSM vào lớp app trong 1 click" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
                  <UserPlus className="h-4 w-4" /> Cập nhật DS từ SSM
                </button>
              )}
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

      {needInstall && !ssmSession && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black text-indigo-950">Chưa kết nối SSM — Không cần cài đặt Extension</span>
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1 font-black text-white hover:bg-indigo-700"
            >
              Kết nối ngay
            </button>
          </div>
          <p className="font-medium text-slate-600">
            Hệ thống hỗ trợ <b>Server Proxy trực tiếp</b>: bấm <b>Kết nối ngay</b> để dán mã kết nối (token) mà không cần cài thêm bất kỳ tiện ích trình duyệt nào.
          </p>
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
          <p className="text-xs font-medium text-slate-500">Nút "Cập nhật DS từ SSM" chỉ thêm học sinh mới — không xoá, không sửa học sinh đã có.</p>
        </div>
      )}

      <SsmConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={(s) => {
          setSsmSession(s);
          setNeedInstall(false);
          void loadClasses();
        }}
        showToast={() => {}}
      />
    </div>
  );
};
