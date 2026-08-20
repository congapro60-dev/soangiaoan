import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { CheckCircle2, ClipboardList, Loader2, Play, Plus, ShieldCheck } from 'lucide-react';
import {
  approveGrade,
  createAssignment,
  listAssignmentsForClass,
  listSubmissionsForAssignment,
  setAssignmentOpen,
  uploadAnswerKeyImages,
  uploadAssignmentFiles,
} from '../../../lib/classroom/submissionService';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
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

export const AssignmentPanel = ({ classId, teacherId, className, showToast }: Props) => {
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [openId, setOpenId] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const [moForm, setMoForm] = useState(false);
  const [dangGui, setDangGui] = useState(false);

  const taiBai = useCallback(async () => {
    setDangTai(true);
    try {
      setAssignments(await listAssignmentsForClass(classId));
    } catch (error) {
      console.error('Không tải được danh sách bài giao', error);
    } finally {
      setDangTai(false);
    }
  }, [classId]);

  useEffect(() => { void taiBai(); }, [taiBai]);

  const moBai = async (assignmentId: string) => {
    if (openId === assignmentId) { setOpenId(''); return; }
    setOpenId(assignmentId);
    setSubmissions(await listSubmissionsForAssignment(assignmentId).catch(() => []));
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
        setSubmissions(await listSubmissionsForAssignment(assignment.id).catch(() => []));
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
        <AssignmentFormModal className={className} dangGui={dangGui} onClose={() => setMoForm(false)} onSubmit={guiBaiMoi} />
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
                  </p>
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
                  {submissions.length === 0 ? (
                    <p className="py-4 text-center text-sm font-semibold text-slate-400">Chưa em nào nộp bài.</p>
                  ) : submissions.map(s => (
                    <div key={s.id} className="border-b border-slate-50 py-3 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${trangThai[s.status].mau}`}>
                          {trangThai[s.status].nhan}
                        </span>
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
