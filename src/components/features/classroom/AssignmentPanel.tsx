import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, FileText, Hourglass, Loader2, PenLine, Play, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, UserRound } from 'lucide-react';
import {
  approveGrade,
  createAssignment,
  listAssignmentsForClass,
  listClassRoster,
  listSubmissionsForClass,
  deleteAssignment,
  setAssignmentOpen,
  updateAssignmentContent,
  updateAssignmentDeadline,
  updateSubmissionGradeManually,
  uploadAnswerKeyImages,
  uploadAssignmentFiles,
  type RosterStudent,
} from '../../../lib/classroom/submissionService';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { laNopQuaHan } from '../../../lib/classroom/hanNop';
import { gradeAssignmentAll, gradeOneSubmission } from '../../../services/gradingApi';
import { AssignmentFormModal, type AssignmentFormValue } from './AssignmentFormModal';

interface Props {
  classId: string;
  teacherId: string;
  className: string;
  showToast: (msg: string, icon?: any) => void;
}

const trangThai: Record<SubmissionDoc['status'], { nhan: string; mau: string }> = {
  submitted: { nhan: 'Chờ chấm', mau: 'bg-amber-50 text-amber-700' },
  grading: { nhan: 'Đang chấm', mau: 'bg-blue-50 text-blue-700' },
  graded: { nhan: 'Đã chấm', mau: 'bg-emerald-50 text-emerald-700' },
  error: { nhan: 'Lỗi', mau: 'bg-red-50 text-red-700' },
};

const denONhapNgay = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const haiSo = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${haiSo(d.getMonth() + 1)}-${haiSo(d.getDate())}T${haiSo(d.getHours())}:${haiSo(d.getMinutes())}`;
};

const dinhDangHan = (iso?: string): string => {
  if (!iso) return 'Không đặt hạn';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Không đặt hạn';
  return `Hạn: ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

interface BaiNopTheoLopProps {
  baiNop: SubmissionDoc[];
  hanNop?: string;
  lopHocSinh: RosterStudent[];
  moRongId: string;
  troMoRong: (id: string) => void;
  tienDo: string;
  chamLai: (s: SubmissionDoc, ten: string) => void | Promise<void>;
  suaDiem: (s: SubmissionDoc, ten: string) => void | Promise<void>;
  duyet: (s: SubmissionDoc) => void | Promise<void>;
}

/**
 * Danh sách ĐỦ CẢ LỚP theo một bài giao: em nào đã nộp (kèm trạng thái/điểm/hành động),
 * em nào chưa nộp — giáo viên kiểm soát một mắt nhìn thay vì đoán từ số lượng.
 */
const BaiNopTheoLop = ({ baiNop, hanNop, lopHocSinh, moRongId, troMoRong, tienDo, chamLai, suaDiem, duyet }: BaiNopTheoLopProps) => {
  const tenTheoId = new Map(lopHocSinh.map(hs => [hs.studentId, hs.name]));
  const daNopIds = new Set(baiNop.map(s => s.studentId));
  const chuaNop = lopHocSinh.filter(hs => !daNopIds.has(hs.studentId));

  // Học sinh có thể NỘP LẠI nhiều lần (nộp nhầm ảnh rồi chụp lại theo phản hồi).
  // baiNop kế thừa thứ tự mới-nhất-trước, nên lần gặp đầu của mỗi em chính là lần mới nhất.
  const conLaiTheoHs = new Map<string, number>();
  for (const s of baiNop) conLaiTheoHs.set(s.studentId, (conLaiTheoHs.get(s.studentId) ?? 0) + 1);
  const daGanMoi = new Set<string>();
  const nhanLanNop = new Map<string, string>();
  for (const s of baiNop) {
    if ((conLaiTheoHs.get(s.studentId) ?? 1) <= 1) continue;
    if (!daGanMoi.has(s.studentId)) {
      daGanMoi.add(s.studentId);
      nhanLanNop.set(s.id, 'Lần nộp mới nhất');
    } else {
      nhanLanNop.set(s.id, 'Lần nộp trước');
    }
  }

  if (baiNop.length === 0 && lopHocSinh.length === 0) {
    return <p className="py-4 text-center text-sm font-semibold text-slate-400">Chưa có danh sách học sinh trên máy chủ cho lớp này.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      {baiNop.map(s => {
        const ten = tenTheoId.get(s.studentId) || `HS …${s.studentId.slice(-4)}`;
        const dangMo = moRongId === s.id;
        return (
          <div key={s.id} className="border-b border-slate-100 last:border-b-0">
            <button onClick={() => troMoRong(dangMo ? '' : s.id)} className="flex w-full flex-wrap items-center gap-2 px-3 py-3 text-left transition hover:bg-slate-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-blue-700">{ten.charAt(0)}</span>
              <span className="font-black text-slate-900">{ten}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${trangThai[s.status].mau}`}>{trangThai[s.status].nhan}</span>
              {hanNop && (
                laNopQuaHan(s.createdAt, hanNop)
                  ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">Muộn</span>
                  : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Đúng hạn</span>
              )}
              {s.grade?.editedByTeacher && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">GV sửa điểm</span>
              )}
              {nhanLanNop.get(s.id) && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  nhanLanNop.get(s.id) === 'Lần nộp mới nhất' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {nhanLanNop.get(s.id)}
                </span>
              )}
              <span className="flex-1" />
              {s.grade && <span className="text-sm font-black text-slate-900">{s.grade.score}/{s.grade.maxScore}</span>}
              <span className="text-[11px] font-semibold text-slate-400">
                {new Date(s.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {s.fileUrls.length} ảnh
              </span>
            </button>

            {dangMo && (
              <div className="space-y-3 rounded-2xl bg-slate-50 mx-3 mb-3 p-3">
                {s.fileUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {s.fileUrls.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" title={`Mở ảnh ${i + 1} cỡ lớn`} className="block h-24 w-24 overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-blue-400">
                        <img src={url} alt={`Bài làm ${ten} - ảnh ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">Không có ảnh đính kèm.</p>
                )}

                {s.grade?.feedback && <p className="text-sm font-semibold leading-6 text-slate-600">{s.grade.feedback}</p>}
                {s.grade?.gradedWithoutAnswerKey && (
                  <p className="text-xs font-bold text-amber-700">Bài chấm khi chưa đối chiếu đáp án chuẩn — nên soát lại giúp.</p>
                )}
                {s.status === 'error' && <p className="text-sm font-semibold text-red-700">{s.errorMessage}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void chamLai(s, ten)}
                    disabled={tienDo !== ''}
                    className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Chấm lại bằng AI
                  </button>
                  <button
                    onClick={() => void suaDiem(s, ten)}
                    className="inline-flex items-center gap-1 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <PenLine className="h-3.5 w-3.5" /> Sửa điểm
                  </button>
                  {s.grade && (
                    <button
                      onClick={() => void duyet(s)}
                      className={`inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-black transition ${
                        s.grade.teacherApproved ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.grade.teacherApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {s.grade.teacherApproved ? 'Đã duyệt' : 'Duyệt điểm'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {chuaNop.map(hs => (
        <div key={hs.studentId} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0">
          <Hourglass className="h-4 w-4 shrink-0 text-slate-300" />
          <span className="text-sm font-bold text-slate-400">{hs.name}</span>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">Chưa nộp</span>
        </div>
      ))}
    </div>
  );
};

export const AssignmentPanel = ({ classId, teacherId, className, showToast }: Props) => {
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [openId, setOpenId] = useState('');
  // Nạp MỘT lần toàn bộ bài nộp của lớp: đếm "x/y đã nộp" trên từng bài, lọc khi mở bài,
  // và liệt kê em nào CHƯA nộp — không phải bấm vào từng bài mới biết.
  const [tatCaBaiNop, setTatCaBaiNop] = useState<SubmissionDoc[]>([]);
  const [lopHocSinh, setLopHocSinh] = useState<RosterStudent[]>([]);
  const [moRongId, setMoRongId] = useState('');
  const [dangTai, setDangTai] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const [moForm, setMoForm] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loiTai, setLoiTai] = useState('');
  // Lỗi riêng cho việc tải BÀI NỘP: nếu nuốt thành mảng rỗng thì bảng hiện "0/x đã nộp",
  // giáo viên tưởng chưa ai nộp và nút Xoá bài lọt qua guard → xoá mất bài có bài nộp thật.
  const [loiBaiNop, setLoiBaiNop] = useState<string | null>(null);
  // Bản nháp đang sửa của bài đang mở. Rỗng = chưa sửa gì.
  const [nhap, setNhap] = useState<{ answerKey: string; rubric: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  const taiBai = useCallback(async () => {
    setDangTai(true);
    setLoiTai('');
    try {
      const dsBai = await listAssignmentsForClass(classId, teacherId);
      // Lỗi tải bài nộp phải TÁCH RIÊNG: giữ danh sách cũ (nếu có) và gắn cờ lỗi,
      // tuyệt đối không biến thành mảng rỗng y hệt "chưa ai nộp".
      let dsNop: SubmissionDoc[] = [];
      try {
        dsNop = await listSubmissionsForClass(classId, teacherId);
        setLoiBaiNop(null);
      } catch (error) {
        console.error('Không tải được bài nộp của lớp', error);
        setLoiBaiNop(error instanceof Error ? error.message : 'Không tải được bài nộp của lớp.');
      }
      let dsHocSinh: RosterStudent[] = [];
      try {
        dsHocSinh = await listClassRoster(classId);
      } catch (error) {
        console.error('Không tải được danh sách học sinh trên máy chủ', error);
      }
      setAssignments(dsBai);
      setTatCaBaiNop(dsNop);
      setLopHocSinh(dsHocSinh);
    } catch (error) {
      // Nuốt lỗi vào console là kiểu hỏng khó lần nhất: giáo viên giao bài xong, mở ra thấy
      // bảng trống, tưởng bài không được lưu. Phải hiện ra màn hình.
      console.error('Không tải được danh sách bài giao', error);
      setLoiTai(error instanceof Error ? error.message : 'Không tải được danh sách bài giao.');
    } finally {
      setDangTai(false);
    }
  }, [classId, teacherId]);

  useEffect(() => { void taiBai(); }, [taiBai]);

  const moBai = (assignmentId: string) => {
    if (openId === assignmentId) { setOpenId(''); setNhap(null); return; }
    setOpenId(assignmentId);
    setNhap(null);
  };

  /** Bài nộp thuộc một bài giao, sắp theo tên học sinh để đối chiếu danh sách cho nhanh. */
  const baiNopCua = useCallback((assignmentId: string): SubmissionDoc[] => {
    const tenTheoId = new Map(lopHocSinh.map(hs => [hs.studentId, hs.name]));
    return tatCaBaiNop
      .filter(s => s.assignmentId === assignmentId)
      .sort((a, b) => (tenTheoId.get(a.studentId) || '').localeCompare(tenTheoId.get(b.studentId) || '', 'vi'));
  }, [tatCaBaiNop, lopHocSinh]);

  const guiBaiMoi = async (value: AssignmentFormValue) => {
    if (!value.answerKey && value.answerKeyImages.length === 0) {
      const { isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Giao bài không kèm đáp án?',
        html: 'AI sẽ phải tự đọc đề trong ảnh từng em rồi tự giải. Kết quả kém chắc chắn hơn và tốn nhiều chi phí hơn.<br/><br/>Bài chấm kiểu này sẽ được gắn nhãn <b>"chưa đối chiếu đáp án chuẩn"</b>.',
        showCancelButton: true,
        confirmButtonText: 'Vẫn giao',
        cancelButtonText: 'Quay lại thêm đáp án',
        confirmButtonColor: '#d97706',
        focusCancel: true,
      });
      if (!isConfirmed) return;
    }

    setDangGui(true);
    try {
      const [attachments, answerKeyImageUrls] = await Promise.all([
        value.deFiles.length > 0 ? uploadAssignmentFiles(teacherId, value.deFiles) : Promise.resolve([]),
        value.answerKeyImages.length > 0 ? uploadAnswerKeyImages(teacherId, value.answerKeyImages) : Promise.resolve([]),
      ]);

      await createAssignment({
        teacherId,
        classId,
        title: value.title,
        answerKey: value.answerKey,
        rubric: value.rubric,
        maxScore: value.maxScore,
        dueAt: value.dueAt ? new Date(value.dueAt).toISOString() : undefined,
        attachments,
        answerKeyImageUrls,
        answerKeyByAi: value.answerKeyByAi,
      });
      setMoForm(false);
      showToast(`Đã giao "${value.title}" cho ${className}.`, 'success');
      await taiBai();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Không giao được bài',
        text: error instanceof Error ? error.message : 'Thử lại sau.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setDangGui(false);
    }
  };

  const chamCaLop = async (assignment: AssignmentDoc) => {
    setTienDo('Đang bắt đầu...');
    try {
      const result = await gradeAssignmentAll(
        assignment.id,
        (xong, conLai) => setTienDo(`Đã chấm ${xong} bài, còn ${conLai}...`),
      );
      const loi = result.failed > 0 ? `, ${result.failed} bài lỗi cần chấm lại` : '';
      showToast(`Chấm xong ${result.graded} bài${loi}.`, result.failed > 0 ? 'warning' : 'success');
      try {
        setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
        setLoiBaiNop(null);
      } catch (error) {
        console.error('Không tải lại được bài nộp sau khi chấm', error);
        setLoiBaiNop('Đã chấm xong nhưng chưa tải lại được danh sách mới. Bấm "Làm mới" để cập nhật.');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chấm bài thất bại',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setTienDo('');
    }
  };

  const luuNoiDung = async (a: AssignmentDoc) => {
    if (!nhap) return;
    setDangLuu(true);
    try {
      await updateAssignmentContent(a.id, nhap);
      setNhap(null);
      showToast('Đã lưu đáp án và hướng dẫn chấm.', 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không lưu được.');
    } finally {
      setDangLuu(false);
    }
  };

  /**
   * Đổi hạn nộp sau khi đã giao. Nhãn sớm/muộn của học sinh tính ĐỘNG từ hạn này
   * nên đổi xong là mọi bài nộp cũ tự phân loại lại, không phải quét sửa dữ liệu.
   */
  const suaHanNop = async (a: AssignmentDoc) => {
    const { isConfirmed } = await Swal.fire({
      title: `Đổi hạn nộp "${a.title}"`,
      html: `
        <input id="swal-han" type="datetime-local" class="swal2-input" value="${denONhapNgay(a.dueAt)}">
        <label style="display:flex;align-items:center;gap:6px;justify-content:center;font-size:13px;color:#64748b;">
          <input id="swal-xoa-han" type="checkbox"> Bỏ hẳn hạn nộp
        </label>
        <p style="font-size:12px;color:#94a3b8;margin-top:6px;">Nhãn "đúng hạn / nộp muộn" của mọi bài nộp sẽ tự cập nhật theo hạn mới.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Lưu hạn mới',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#3085d6',
      focusConfirm: false,
    });
    if (!isConfirmed) return;

    const boHan = (document.getElementById('swal-xoa-han') as HTMLInputElement | null)?.checked;
    let moi: string | null = null;
    if (!boHan) {
      const raw = (document.getElementById('swal-han') as HTMLInputElement | null)?.value;
      if (!raw) {
        Swal.fire({
          icon: 'warning',
          title: 'Chưa chọn ngày giờ',
          text: 'Chọn hạn nộp mới, hoặc tick "Bỏ hẳn hạn nộp".',
          confirmButtonColor: '#3085d6',
        });
        return;
      }
      moi = new Date(raw).toISOString();
    }

    try {
      await updateAssignmentDeadline(a.id, moi);
      showToast('Đã cập nhật hạn nộp.', 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không đổi được hạn nộp.');
    }
  };

  const xoaBai = async (a: AssignmentDoc) => {
    // Chặn khi đã có bài nộp: xoá bài giao mà để bài nộp nằm lại là tạo ra dữ liệu mồ côi,
    // điểm của học sinh trỏ vào một bài không còn tồn tại.
    // Khi KHÔNG CHẮC số bài nộp (lỗi tải) thì cũng chặn — 0 trên màn hình chưa chắc là 0 trên server.
    if (loiBaiNop !== null) {
      Swal.fire({
        icon: 'warning',
        title: 'Chưa xoá được — chưa chắc chắn số bài nộp',
        text: 'Đang có lỗi tải danh sách bài nộp. Số "0 đã nộp" trên màn hình chưa đáng tin. Bấm "Làm mới" để thử tải lại trước.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    const soBaiNop = baiNopCua(a.id).length;
    if (soBaiNop > 0) {
      Swal.fire({
        icon: 'info',
        title: 'Không xoá được',
        text: `Đã có ${soBaiNop} bài nộp cho bài này. Dùng "Đóng bài" để học sinh không nộp thêm.`,
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xoá "${a.title}"?`,
      text: 'Bài giao và đáp án sẽ mất hẳn. File đề đã tải lên vẫn còn trên máy chủ.',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    try {
      await deleteAssignment(a.id);
      setOpenId('');
      showToast('Đã xoá bài giao.', 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không xoá được.');
    }
  };

  /** Chạy lại AI cho ĐÚNG MỘT bài nộp — giáo viên xem thấy chấm sai thì không phải đợi cả lớp. */
  const chamLaiMotBai = async (s: SubmissionDoc, tenHocSinh: string) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: `Chấm lại bằng AI cho ${tenHocSinh}?`,
      text: 'Điểm và nhận xét cũ sẽ bị thay bằng kết quả mới.',
      showCancelButton: true,
      confirmButtonText: 'Chấm lại',
      cancelButtonText: 'Thôi',
      confirmButtonColor: '#3085d6',
    });
    if (!isConfirmed) return;

    setTienDo(`Đang chấm lại bài của ${tenHocSinh}...`);
    try {
      await gradeOneSubmission(s.id);
      showToast(`Đã chấm lại bài của ${tenHocSinh}.`, 'success');
      try {
        setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
        setLoiBaiNop(null);
      } catch (error) {
        console.error('Không tải lại được bài nộp sau khi chấm lại', error);
        setLoiBaiNop('Đã chấm lại xong nhưng chưa tải lại được danh sách mới. Bấm "Làm mới" để cập nhật.');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chấm lại thất bại',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setTienDo('');
    }
  };

  /** Sửa tay điểm + nhận xét — máy chấm sai mà AI chấm lại vẫn sai thì người phải can thiệp được. */
  const suaDiem = async (s: SubmissionDoc, tenHocSinh: string) => {
    const maxHienTai = s.grade?.maxScore ?? 10;
    const { value: form } = await Swal.fire({
      title: `Sửa điểm · ${tenHocSinh}`,
      html: `
        <input id="swal-diem" type="number" min="0" max="${maxHienTai}" step="0.25" class="swal2-input" placeholder="Điểm (tối đa ${maxHienTai})" value="${s.grade?.score ?? ''}">
        <textarea id="swal-nhan-xet" class="swal2-textarea" placeholder="Nhận xét gửi học sinh">${s.grade?.feedback || ''}</textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Lưu điểm',
      cancelButtonText: 'Huỷ',
      confirmButtonColor: '#3085d6',
      focusConfirm: false,
      preConfirm: () => {
        const diem = Number((document.getElementById('swal-diem') as HTMLInputElement | null)?.value);
        if (!Number.isFinite(diem) || diem < 0 || diem > maxHienTai) {
          Swal.showValidationMessage(`Điểm phải nằm trong khoảng 0 – ${maxHienTai}.`);
          return null;
        }
        return { diem, nhanXet: String((document.getElementById('swal-nhan-xet') as HTMLTextAreaElement | null)?.value || '').trim() };
      },
    });
    if (!form) return;

    try {
      await updateSubmissionGradeManually(s.id, { score: form.diem, maxScore: maxHienTai, feedback: form.nhanXet });
      showToast(`Đã lưu điểm mới cho ${tenHocSinh}.`, 'success');
      setTatCaBaiNop(prev => prev.map(x => {
        if (x.id !== s.id) return x;
        return {
          ...x,
          status: 'graded' as const,
          // Dựng lại grade ĐẦY ĐỦ: bài chưa được máy chấm thì grade undefined, spread rỗng là
          // mất các trường bắt buộc (strengths/weaknesses) và tsc đỏ.
          grade: {
            score: form.diem,
            maxScore: maxHienTai,
            feedback: form.nhanXet,
            strengths: [],
            weaknesses: [],
            gradedAt: new Date().toISOString(),
            teacherApproved: false,
            noteForTeacher: x.grade?.noteForTeacher,
            weakTopics: x.grade?.weakTopics,
          },
        };
      }));
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không lưu được điểm.');
    }
  };

  const duyet = async (submission: SubmissionDoc) => {
    const dangDuyet = !submission.grade?.teacherApproved;
    try {
      await approveGrade(submission, dangDuyet);
      setTatCaBaiNop(prev => prev.map(s => s.id === submission.id
        ? { ...s, grade: s.grade ? { ...s.grade, teacherApproved: dangDuyet } : s.grade }
        : s));
      showToast(dangDuyet ? 'Đã duyệt điểm — kết luận sẽ vào hồ sơ tích luỹ của em.' : 'Đã bỏ duyệt.', 'success');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Duyệt điểm thất bại',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {moForm && (
        <AssignmentFormModal classId={classId} className={className} dangGui={dangGui} onClose={() => setMoForm(false)} onSubmit={guiBaiMoi} />
      )}

      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Bài tập nộp ảnh</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">Giao bài & chấm bằng AI</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void taiBai()} disabled={dangTai} title="Làm mới danh sách bài nộp" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${dangTai ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button onClick={() => setMoForm(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Giao bài mới
          </button>
        </div>
      </div>

      {loiTai && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{loiTai}</p>
      )}

      {loiBaiNop && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
          <p className="flex items-start gap-2 text-sm font-bold text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loiBaiNop}
          </p>
          <button
            onClick={() => void taiBai()}
            disabled={dangTai}
            className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-red-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dangTai ? 'animate-spin' : ''}`} /> Tải lại bài nộp
          </button>
        </div>
      )}

      {dangTai ? (
        <p className="py-8 text-center text-sm font-semibold text-slate-400">Đang tải...</p>
      ) : assignments.length === 0 ? (
        <div className="py-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa giao bài nào cho lớp này.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="rounded-3xl border border-slate-100">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <button onClick={() => moBai(a.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-black text-slate-900">{a.title}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {a.isOpen ? 'Đang mở' : 'Đã đóng'} · {a.answerKey ? 'có đáp án chuẩn' : 'không có đáp án'}
                    {(a.attachments?.length ?? 0) > 0 ? ` · ${a.attachments!.length} file đề` : ' · chưa đính kèm đề'}
                    {a.answerKeyByAi ? ' · đáp án do AI giải' : ''}
                  </p>
                </button>
                {(() => {
                  // Đếm THEO HỌC SINH (distinct), không đếm số submission: một em nộp lại 2 lần
                  // là 2 document nhưng chỉ là 1/30 đã nộp, không thể hiện "2/1".
                  const soHsDaNop = new Set(baiNopCua(a.id).map(s => s.studentId)).size;
                  const du = lopHocSinh.length > 0 && soHsDaNop >= lopHocSinh.length;
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-black ${
                      soHsDaNop === 0 ? 'bg-slate-100 text-slate-400' : du ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      <UserRound className="h-3.5 w-3.5" /> {soHsDaNop}/{lopHocSinh.length} đã nộp
                    </span>
                  );
                })()}
                <button
                  onClick={() => suaHanNop(a)}
                  title="Đổi hạn nộp — nhãn đúng hạn/muộn của học sinh tự cập nhật theo"
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                >
                  <CalendarClock className="h-3.5 w-3.5" /> {dinhDangHan(a.dueAt)}
                </button>
                <button
                  onClick={() => setAssignmentOpen(a.id, !a.isOpen).then(taiBai)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  {a.isOpen ? 'Đóng bài' : 'Mở lại'}
                </button>
                <button
                  onClick={() => chamCaLop(a)}
                  disabled={tienDo !== ''}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {tienDo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {tienDo || 'Chấm cả lớp'}
                </button>
              </div>

              {openId === a.id && (
                <div className="border-t border-slate-100 p-4">
                  {/* NỘI DUNG ĐÃ GIAO — phải xem lại và sửa được. Đáp án AI giải ra mà không mở
                      lại được thì lời hứa "thầy cô soát trước khi chấm" chỉ đúng đúng một lần. */}
                  <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Nội dung đã giao</p>

                    <div className="mt-3">
                      <p className="text-sm font-black text-slate-700">Đề gửi học sinh</p>
                      {(a.attachments || []).length === 0 ? (
                        <p className="text-sm font-semibold text-slate-400">Không đính kèm file — đề phát bản giấy.</p>
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-3">
                          {(a.attachments || []).map(f => (
                            <a key={f.url} href={f.url} target="_blank" rel="noreferrer"
                               className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 underline">
                              <FileText className="h-3.5 w-3.5" /> {f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-sm font-black text-slate-700">Đáp án chuẩn</p>
                        {a.answerKeyByAi && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            do AI giải — soát lại giúp
                          </span>
                        )}
                        {(a.answerKeyImageUrls || []).length > 0 && (
                          <span className="text-[11px] font-bold text-slate-500">
                            + {(a.answerKeyImageUrls || []).length} ảnh đáp án
                          </span>
                        )}
                      </div>
                      <textarea
                        value={nhap ? nhap.answerKey : (a.answerKey || '')}
                        onChange={e => setNhap({
                          answerKey: e.target.value,
                          rubric: nhap ? nhap.rubric : (a.rubric || ''),
                        })}
                        rows={8}
                        placeholder="Chưa có đáp án. AI sẽ phải tự đọc đề trong ảnh từng em rồi tự giải."
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-black text-slate-700">Hướng dẫn chấm</p>
                      <textarea
                        value={nhap ? nhap.rubric : (a.rubric || '')}
                        onChange={e => setNhap({
                          answerKey: nhap ? nhap.answerKey : (a.answerKey || ''),
                          rubric: e.target.value,
                        })}
                        rows={4}
                        placeholder="Chưa có. Thiếu thì AI tự quyết cách chia điểm thành phần, mỗi em một kiểu."
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => luuNoiDung(a)}
                        disabled={!nhap || dangLuu}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-40"
                      >
                        {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {dangLuu ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      {nhap && (
                        <button onClick={() => setNhap(null)}
                                className="rounded-2xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100">
                          Bỏ sửa
                        </button>
                      )}
                      <span className="flex-1" />
                      <button
                        onClick={() => xoaBai(a)}
                        className="inline-flex items-center gap-1 rounded-2xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xoá bài
                      </button>
                    </div>
                  </div>

                  <BaiNopTheoLop
                    baiNop={baiNopCua(a.id)}
                    hanNop={a.dueAt}
                    lopHocSinh={lopHocSinh}
                    moRongId={moRongId}
                    troMoRong={setMoRongId}
                    tienDo={tienDo}
                    chamLai={chamLaiMotBai}
                    suaDiem={suaDiem}
                    duyet={duyet}
                  />
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                    Điểm chỉ vào hồ sơ học tập của học sinh sau khi thầy cô bấm <b>Duyệt điểm</b>. Máy chấm không tự duyệt cho mình.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
