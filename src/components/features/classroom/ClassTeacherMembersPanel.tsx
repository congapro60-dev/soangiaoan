import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Loader2, LogOut, MailPlus, ShieldCheck, UserMinus, X } from 'lucide-react';
import {
  inviteTeacher,
  leaveClass,
  listClassTeachers,
  removeTeacher,
  type TeacherMembersResult,
} from '../../../lib/classroom/teacherService';
import type { ClassInvitationDoc, ClassMemberDoc } from '../../../lib/classroom/types';

interface Props {
  classId: string;
  className: string;
  currentUid: string;
  onClose: () => void;
  onLeft: () => void;
  showToast: (message: string, icon?: any) => void;
}

const roleLabel = (member: ClassMemberDoc): string => member.role === 'owner' ? 'Chủ lớp hiện tại' : 'Đồng giáo viên';
const invitationRoleLabel = (role: ClassInvitationDoc['role']): string => role === 'transfer_owner' ? 'Mời nhận chuyển quyền chủ lớp' : 'Mời làm đồng giáo viên';

export const ClassTeacherMembersPanel = ({ classId, className, currentUid, onClose, onLeft, showToast }: Props) => {
  const [result, setResult] = useState<TeacherMembersResult | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'co_owner' | 'transfer_owner'>('co_owner');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await listClassTeachers(classId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách giáo viên.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submitInvite = async () => {
    const normalized = email.trim();
    if (!normalized || !normalized.includes('@')) {
      setError('Nhập đúng email mà giáo viên đó dùng để đăng nhập.');
      return;
    }
    setBusy('invite');
    setError('');
    try {
      await inviteTeacher(classId, normalized, role);
      setEmail('');
      showToast('Đã tạo lời mời. Giáo viên kia đăng nhập đúng email để chấp nhận.', 'success');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tạo được lời mời.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (member: ClassMemberDoc) => {
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: `Xóa ${member.displayName || member.email} khỏi lớp?`,
      text: 'Giáo viên này sẽ mất quyền xem, giao và chấm bài của lớp. Dữ liệu bài nộp không bị xóa.',
      showCancelButton: true,
      confirmButtonText: 'Xóa quyền',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) return;
    setBusy(`remove:${member.uid}`);
    setError('');
    try {
      await removeTeacher(classId, member.uid);
      showToast(`Đã xóa ${member.displayName || member.email} khỏi lớp.`, 'success');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được giáo viên.');
    } finally {
      setBusy('');
    }
  };

  const leave = async () => {
    const confirmation = await Swal.fire({
      icon: 'question',
      title: `Rời lớp ${className}?`,
      text: 'Bạn sẽ không còn thấy lớp này để giao hoặc theo dõi bài.',
      showCancelButton: true,
      confirmButtonText: 'Rời lớp',
      cancelButtonText: 'Ở lại',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) return;
    setBusy('leave');
    setError('');
    try {
      await leaveClass(classId);
      showToast(`Đã rời lớp ${className}.`, 'success');
      onLeft();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không rời lớp được.');
    } finally {
      setBusy('');
    }
  };

  const access = result?.access;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-members-heading"
        className="w-full max-w-3xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Cộng tác lớp học</p>
            <h2 id="teacher-members-heading" className="mt-1 text-2xl font-black text-slate-900">Giáo viên · {className}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mời bằng email tài khoản trên hệ thống. Lời mời chỉ có hiệu lực sau khi người nhận chấp nhận.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">{error}</p>}

        {loading ? (
          <div role="status" className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-semibold text-slate-500">Đang tải danh sách giáo viên...</p></div>
        ) : (
          <>
            {access?.canManageMembers && (
              <div className="mt-5 rounded-3xl bg-indigo-50 p-4 sm:p-5">
                <div className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-indigo-700" /><h3 className="font-black text-indigo-950">Mời giáo viên</h3></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <label className="sr-only" htmlFor="teacher-invite-email">Email giáo viên</label>
                  <input id="teacher-invite-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="email@truong.edu.vn" className="min-h-11 rounded-2xl border border-indigo-100 bg-white px-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                  <label className="sr-only" htmlFor="teacher-invite-role">Vai trò lời mời</label>
                  <select id="teacher-invite-role" value={role} onChange={event => setRole(event.target.value as typeof role)} className="min-h-11 rounded-2xl border border-indigo-100 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500">
                    <option value="co_owner">Đồng giáo viên</option>
                    <option value="transfer_owner">Chuyển quyền chủ lớp</option>
                  </select>
                  <button type="button" onClick={() => void submitInvite()} disabled={busy !== ''} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-50">{busy === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />} Mời</button>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-indigo-900/70">“Chuyển quyền chủ lớp” chỉ chuyển sau khi giáo viên kia chấp nhận; chủ cũ trở thành đồng giáo viên.</p>
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3"><h3 className="font-black text-slate-900">Thành viên đang hoạt động</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{result?.members.length || 0} giáo viên</span></div>
              <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100">
                {(result?.members || []).map(member => (
                  <div key={member.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">{member.displayName || member.email || member.uid}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{member.email || 'Chưa có email'} · {roleLabel(member)}{member.uid === currentUid ? ' · Bạn' : ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {member.role === 'owner' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Bảo vệ chủ lớp</span>}
                      {member.uid === currentUid && member.role === 'co_owner' && <button type="button" onClick={() => void leave()} disabled={busy !== ''} className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-50 disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> Rời lớp</button>}
                      {access?.canManageMembers && member.uid !== currentUid && member.uid !== access.originalOwnerId && member.role !== 'owner' && <button type="button" onClick={() => void remove(member)} disabled={busy !== ''} className="inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === `remove:${member.uid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />} Xóa</button>}
                    </div>
                  </div>
                ))}
                {(result?.members || []).length === 0 && <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">Chưa có dữ liệu thành viên.</p>}
              </div>
            </div>

            {(result?.invitations || []).length > 0 && (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-black text-amber-950">Lời mời đang chờ</h3>
                <ul className="mt-2 space-y-2">
                  {(result?.invitations || []).map(invitation => <li key={invitation.id} className="text-sm font-semibold text-amber-900">{invitation.inviteeEmail} · {invitationRoleLabel(invitation.role)}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
