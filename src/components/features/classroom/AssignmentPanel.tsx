import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { CalendarClock, CheckCircle2, ClipboardList, FileText, Loader2, Play, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import {
  approveGrade,
  createAssignment,
  listAssignmentsForClass,
  listSubmissionsForAssignment,
  deleteAssignment,
  setAssignmentOpen,
  updateAssignmentContent,
  updateAssignmentDeadline,
  uploadAnswerKeyImages,
  uploadAssignmentFiles,
} from '../../../lib/classroom/submissionService';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { laNopQuaHan } from '../../../lib/classroom/hanNop';
import { gradeAssignmentAll } from '../../../services/gradingApi';
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

export const AssignmentPanel = ({ classId, teacherId, className, showToast }: Props) => {
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [openId, setOpenId] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const [moForm, setMoForm] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loiTai, setLoiTai] = useState('');
  // Bản nháp đang sửa của bài đang mở. Rỗng = chưa sửa gì.
  const [nhap, setNhap] = useState<{ answerKey: string; rubric: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  const taiBai = useCallback(async () => {
    setDangTai(true);
    setLoiTai('');
    try {
      setAssignments(await listAssignmentsForClass(classId, teacherId));
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

  const moBai = async (assignmentId: string) => {
    if (openId === assignmentId) { setOpenId(''); setNhap(null); return; }
    setOpenId(assignmentId);
    setLoiTai('');
    setNhap(null);
    try {
      setSubmissions(await listSubmissionsForAssignment(assignmentId, teacherId));
    } catch (error) {
      setSubmissions([]);
      setLoiTai(error instanceof Error ? error.message : 'Không tải được danh sách bài nộp.');
    }
  };

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
      if (openId === assignment.id) {
        setSubmissions(await listSubmissionsForAssignment(assignment.id, teacherId).catch(() => []));
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
    if (submissions.length > 0) {
      Swal.fire({
        icon: 'info',
        title: 'Không xoá được',
        text: `Đã có ${submissions.length} bài nộp cho bài này. Dùng "Đóng bài" để học sinh không nộp thêm.`,
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

  const duyet = async (submission: SubmissionDoc) => {
    const dangDuyet = !submission.grade?.teacherApproved;
    await approveGrade(submission, dangDuyet);
    setSubmissions(prev => prev.map(s => s.id === submission.id
      ? { ...s, grade: s.grade ? { ...s.grade, teacherApproved: dangDuyet } : s.grade }
      : s));
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
        <button onClick={() => setMoForm(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Giao bài mới
        </button>
      </div>

      {loiTai && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{loiTai}</p>
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
                    {a.isOpen ? 'Đang mở' : 'Đã đóng'} · {(a as any).answerKey ? 'có đáp án chuẩn' : 'không có đáp án'}
                    {(a.attachments?.length ?? 0) > 0 ? ` · ${a.attachments!.length} file đề` : ' · chưa đính kèm đề'}
                    {a.answerKeyByAi ? ' · đáp án do AI giải' : ''}
                  </p>
                </button>
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
                        value={nhap ? nhap.answerKey : ((a as any).answerKey || '')}
                        onChange={e => setNhap({
                          answerKey: e.target.value,
                          rubric: nhap ? nhap.rubric : ((a as any).rubric || ''),
                        })}
                        rows={8}
                        placeholder="Chưa có đáp án. AI sẽ phải tự đọc đề trong ảnh từng em rồi tự giải."
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-black text-slate-700">Hướng dẫn chấm</p>
                      <textarea
                        value={nhap ? nhap.rubric : ((a as any).rubric || '')}
                        onChange={e => setNhap({
                          answerKey: nhap ? nhap.answerKey : ((a as any).answerKey || ''),
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

                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Bài nộp</p>
                  {submissions.length === 0 ? (
                    <p className="py-4 text-center text-sm font-semibold text-slate-400">Chưa em nào nộp bài.</p>
                  ) : submissions.map(s => (
                    <div key={s.id} className="border-b border-slate-50 py-3 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${trangThai[s.status].mau}`}>
                          {trangThai[s.status].nhan}
                        </span>
                        {a.dueAt && (
                          laNopQuaHan(s.createdAt, a.dueAt)
                            ? <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">Nộp muộn</span>
                            : <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Đúng hạn</span>
                        )}
                        {s.grade && (
                          <span className="text-sm font-black text-slate-900">{s.grade.score} / {s.grade.maxScore}</span>
                        )}
                        {s.grade?.gradedWithoutAnswerKey && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">chưa đối chiếu đáp án chuẩn</span>
                        )}
                        <span className="flex-1" />
                        {s.grade && (
                          <button
                            onClick={() => duyet(s)}
                            className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-black transition ${
                              s.grade.teacherApproved ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {s.grade.teacherApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {s.grade.teacherApproved ? 'Đã duyệt' : 'Duyệt điểm'}
                          </button>
                        )}
                      </div>
                      {s.grade?.feedback && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{s.grade.feedback}</p>}
                      {s.status === 'error' && <p className="mt-2 text-sm font-semibold text-red-700">{s.errorMessage}</p>}
                      {s.fileUrls.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {s.fileUrls.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 underline">
                              Ảnh {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
