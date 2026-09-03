import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Hourglass, Loader2, PenLine, Play, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import {
  approveGrade,
  createAssignment,
  listAssignmentsForClass,
  listClassRoster,
  listSubmissionsForClass,
  xoaBaiNopHocSinh,
  xoaDiemBaiNopHocSinh,
  deleteAssignment,
  setAssignmentOpen,
  updateAssignmentContent,
  updateAssignmentDeadline,
  updateSubmissionGradeManually,
  uploadAnswerKeyImages,
  uploadAssignmentFiles,
  uploadAssignmentImages,
  type RosterStudent,
} from '../../../lib/classroom/submissionService';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import { laNopQuaHan } from '../../../lib/classroom/hanNop';
import { gradeAssignmentAll, gradeOneSubmission, solveAnswerKeyForAssignment, suggestRubric } from '../../../services/gradingApi';
import { AssignmentFormModal, type AssignmentFormValue } from './AssignmentFormModal';
import { NhanXetMarkdown } from './NhanXetMarkdown';
import { GradeReviewModal, type GradeReviewValue } from './GradeReviewModal';
import { QuestionResultsList } from './QuestionResultsList';
import { currentSubmissionsForAssignment, selectedCurrentSubmissions, selectedSubmissionsForAssignment, submissionsForHistoryMode, summarizeSelection, type SubmissionHistoryMode } from '../../../lib/classroom/submissionSelection';
import { renameAssignment } from '../../../lib/classroom/teacherService';
import { OnlineAssignmentReview } from './OnlineAssignmentReview';

interface Props {
  classId: string;
  teacherId: string;
  className: string;
  showToast: (msg: string, icon?: any) => void;
  view?: 'assignments' | 'submissions';
}

const trangThai: Record<SubmissionDoc['status'], { nhan: string; mau: string }> = {
  submitted: { nhan: 'Chờ chấm', mau: 'bg-amber-50 text-amber-700' },
  grading: { nhan: 'Đang chấm', mau: 'bg-blue-50 text-blue-700' },
  graded: { nhan: 'Đã chấm', mau: 'bg-emerald-50 text-emerald-700' },
  error: { nhan: 'Lỗi', mau: 'bg-red-50 text-red-700' },
};

const getApprovalLabel = (grade?: SubmissionDoc['grade']): { label: string; className: string } | null => {
  if (!grade?.teacherApproved) {
    if (grade) return { label: 'Chờ GV duyệt', className: 'bg-amber-50 text-amber-700' };
    return null;
  }
  if (grade.approvalSource === 'student_ai') {
    return { label: 'AI tự duyệt', className: 'bg-indigo-50 text-indigo-700' };
  }
  return { label: 'GV đã duyệt', className: 'bg-emerald-50 text-emerald-700' };
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

const TEACHER_GRADING_ERROR_COPY = 'AI gặp lỗi định dạng khi đọc kết quả chấm. Bài và ảnh vẫn được giữ nguyên; hệ thống đã tự thử phục hồi. Thầy/cô có thể chấm lại bằng AI hoặc sửa điểm bằng tay.';

interface SubmissionViewFile {
  name: string;
  url: string;
  kind?: string;
  mimeType?: string;
}

const isImageSubmissionFile = (file: SubmissionViewFile): boolean => file.kind === 'image' || file.mimeType?.startsWith('image/') === true;

const SubmissionImageViewer = ({ images, studentName }: { images: SubmissionViewFile[]; studentName: string }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedIndex(null);
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex(index => index === null ? null : Math.max(0, index - 1));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex(index => index === null ? null : Math.min(images.length - 1, index + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, selectedIndex]);

  if (images.length === 0) return null;
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setSelectedIndex(index)}
            title={`Xem ảnh ${index + 1} — có thể chuyển bằng nút Trước/Sau`}
            aria-label={`Xem ảnh ${index + 1} của ${studentName}`}
            className="relative block h-24 w-24 overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <img src={image.url} alt={`Bài làm ${studentName} - ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-black text-white">{index + 1}/{images.length}</span>
          </button>
        ))}
      </div>

      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh ${selectedIndex + 1} của bài làm ${studentName}`}
          onMouseDown={event => { if (event.target === event.currentTarget) setSelectedIndex(null); }}
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <p className="min-w-0 truncate text-sm font-black">Bài làm của {studentName} · Ảnh {selectedIndex + 1}/{images.length}</p>
              <button type="button" onClick={() => setSelectedIndex(null)} aria-label="Đóng trình xem ảnh" className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center gap-2 p-3 sm:gap-4 sm:p-5">
              <button type="button" onClick={() => setSelectedIndex(index => index === null ? null : Math.max(0, index - 1))} disabled={selectedIndex === 0} aria-label="Ảnh trước" className="shrink-0 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="h-6 w-6" /></button>
              <img src={selectedImage.url} alt={`Bài làm ${studentName} - ảnh ${selectedIndex + 1}`} className="max-h-[calc(100vh-10rem)] max-w-[calc(100vw-7rem)] object-contain" />
              <button type="button" onClick={() => setSelectedIndex(index => index === null ? null : Math.min(images.length - 1, index + 1))} disabled={selectedIndex === images.length - 1} aria-label="Ảnh sau" className="shrink-0 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-6 w-6" /></button>
            </div>
            <p className="border-t border-white/10 px-4 py-2 text-center text-xs font-semibold text-slate-400">Dùng nút Trước/Sau hoặc phím ← → · Esc để đóng</p>
          </div>
        </div>
      )}
    </>
  );
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
  xoaBaiNop: (s: SubmissionDoc, ten: string) => void | Promise<void>;
  dangXoaNop: string;
  xoaDiem: (s: SubmissionDoc, ten: string) => void | Promise<void>;
  dangXoaDiem: string;
  selectedIds: ReadonlySet<string>;
  toggleSelected: (submissionId: string, selected: boolean) => void;
  toggleAllSubmissions: (submissionIds: readonly string[], selected: boolean) => void;
  bulkCham: () => void | Promise<void>;
  bulkChamLai: () => void | Promise<void>;
  bulkDuyet: () => void | Promise<void>;
  bulkXoa: () => void | Promise<void>;
  dangBulk: string;
  retryEvidenceSync: (s: SubmissionDoc) => void | Promise<void>;
}

/**
 * Danh sách ĐỦ CẢ LỚP theo một bài giao: em nào đã nộp (kèm trạng thái/điểm/hành động),
 * em nào chưa nộp — giáo viên kiểm soát một mắt nhìn thay vì đoán từ số lượng.
 */
const BaiNopTheoLop = ({ baiNop, hanNop, lopHocSinh, moRongId, troMoRong, tienDo, chamLai, suaDiem, duyet, xoaBaiNop, dangXoaNop, xoaDiem, dangXoaDiem, selectedIds, toggleSelected, toggleAllSubmissions, bulkCham, bulkChamLai, bulkDuyet, bulkXoa, dangBulk, retryEvidenceSync }: BaiNopTheoLopProps) => {
  const [historyMode, setHistoryMode] = useState<SubmissionHistoryMode>('latest');
  const tenTheoId = new Map(lopHocSinh.map(hs => [hs.studentId, hs.name]));
  const daNopIds = new Set(baiNop.map(s => s.studentId));
  const chuaNop = lopHocSinh.filter(hs => !daNopIds.has(hs.studentId));
  const current = currentSubmissionsForAssignment(baiNop);
  const baiNopHienThi = submissionsForHistoryMode(baiNop, historyMode);
  const currentIds = new Set(current.map(s => s.id));
  const selectedCurrent = selectedCurrentSubmissions(baiNopHienThi, selectedIds);
  const selectedForDelete = selectedSubmissionsForAssignment(baiNopHienThi, selectedIds);
  const currentSummary = summarizeSelection(selectedCurrent);
  const deleteSummary = summarizeSelection(selectedForDelete);
  const allVisibleSelected = baiNopHienThi.length > 0 && baiNopHienThi.every(s => selectedIds.has(s.id));

  // Học sinh có thể NỘP LẠI nhiều lần (nộp nhầm ảnh rồi chụp lại theo phản hồi).
  // Không dựa vào thứ tự mảng để gắn nhãn — query phía giáo viên còn sort lại theo tên.
  const conLaiTheoHs = new Map<string, number>();
  for (const s of baiNop) conLaiTheoHs.set(s.studentId, (conLaiTheoHs.get(s.studentId) ?? 0) + 1);
  const nhanLanNop = new Map<string, string>();
  for (const s of baiNop) {
    if ((conLaiTheoHs.get(s.studentId) ?? 1) > 1) {
      nhanLanNop.set(s.id, currentIds.has(s.id) ? 'Lần nộp mới nhất' : 'Lần nộp trước');
    }
  }

  if (baiNop.length === 0 && lopHocSinh.length === 0) {
    return <p className="py-4 text-center text-sm font-semibold text-slate-400">Chưa có danh sách học sinh trên máy chủ cho lớp này.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-h-11 items-center gap-2 text-sm font-black text-slate-700">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={event => toggleAllSubmissions(baiNopHienThi.map(s => s.id), event.target.checked)}
            disabled={baiNopHienThi.length === 0 || dangBulk !== ''}
            className="h-4 w-4 accent-indigo-600"
          />
          Chọn lượt đang hiển thị
        </label>
        <span className="text-xs font-bold text-slate-500">
          {deleteSummary.total} đã chọn · đang xem {baiNopHienThi.length}/{baiNop.length} lượt · {current.length} lượt mới nhất được chấm/duyệt
        </span>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <div role="group" aria-label="Phạm vi lượt nộp" className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              aria-pressed={historyMode === 'latest'}
              onClick={() => setHistoryMode('latest')}
              className={`min-h-9 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${historyMode === 'latest' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Chỉ lượt mới nhất ({current.length})
            </button>
            <button
              type="button"
              aria-pressed={historyMode === 'all'}
              onClick={() => setHistoryMode('all')}
              className={`min-h-9 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${historyMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Hiện cả lịch sử ({baiNop.length})
            </button>
          </div>
          <button type="button" onClick={() => void bulkCham()} disabled={currentSummary.pending === 0 || dangBulk !== '' || tienDo !== ''} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
            {dangBulk === 'grade' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Chấm AI ({currentSummary.pending})
          </button>
          <button type="button" onClick={() => void bulkChamLai()} disabled={currentSummary.regradable === 0 || dangBulk !== '' || tienDo !== ''} title="Chấm lại các bài ĐÃ chấm bằng AI theo đáp án mới; bỏ qua bài thầy cô đã sửa tay" className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">
            {dangBulk === 'regrade' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Chấm lại ({currentSummary.regradable})
          </button>
          <button type="button" onClick={() => void bulkDuyet()} disabled={currentSummary.unapproved === 0 || dangBulk !== ''} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-40">
            {dangBulk === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Duyệt ({currentSummary.unapproved})
          </button>
          <button type="button" onClick={() => void bulkXoa()} disabled={deleteSummary.total === 0 || dangBulk !== '' || tienDo !== ''} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40">
            {dangBulk === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Xóa ({deleteSummary.total})
          </button>
        </div>
        </div>
        {historyMode === 'latest' && baiNop.length > current.length && (
          <p className="text-xs font-semibold text-slate-500">Đang ẩn {baiNop.length - current.length} lượt nộp cũ; chuyển sang “Hiện cả lịch sử” để đối chiếu hoặc xóa có chủ đích.</p>
        )}
      </div>
      {baiNopHienThi.map(s => {
        const ten = tenTheoId.get(s.studentId) || `HS …${s.studentId.slice(-4)}`;
        const dangMo = moRongId === s.id;
        return (
          <div key={s.id} className="border-b border-slate-100 last:border-b-0">
            <div className="flex items-center gap-2 px-3 py-3">
              <input
                type="checkbox"
                checked={selectedIds.has(s.id)}
                onChange={event => toggleSelected(s.id, event.target.checked)}
                disabled={dangBulk !== ''}
                title={currentIds.has(s.id) ? 'Chọn lượt nộp mới nhất để chấm, duyệt hoặc xóa' : 'Chọn lượt nộp cũ để xóa theo mong muốn'}
                className="h-4 w-4 shrink-0 accent-indigo-600 disabled:opacity-30"
              />
              <button type="button" onClick={() => troMoRong(dangMo ? '' : s.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left transition hover:bg-slate-50">
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
              {s.grade?.gradingRecovery && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">AI đã tự phục hồi định dạng</span>
              )}
              {(s.status === 'graded' && s.lastGradingError) && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700" title={s.lastGradingError}>Đã giữ điểm (lỗi chấm lại)</span>
              )}
              {s.evidenceSyncError && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700" title={s.evidenceSyncError}>Đồng bộ minh chứng đang chờ</span>
              )}
              {nhanLanNop.get(s.id) && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  nhanLanNop.get(s.id) === 'Lần nộp mới nhất' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {nhanLanNop.get(s.id)}
                </span>
              )}
              {/* Điểm + nhãn duyệt */}
              <span className="flex items-center gap-1.5">
                {s.grade && <span className="text-sm font-black text-slate-900">{s.grade.score}/{s.grade.maxScore}</span>}
                {(() => {
                  const approval = getApprovalLabel(s.grade);
                  if (!approval) return null;
                  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${approval.className}`}>{approval.label}</span>;
                })()}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {new Date(s.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {s.fileUrls.length} tệp
              </span>
              </button>
            </div>

            {dangMo && (
              <div className="space-y-3 rounded-2xl bg-slate-50 mx-3 mb-3 p-3">
                {(s.attachments && s.attachments.length > 0) || s.fileUrls.length > 0 ? (
                  (() => {
                    const files: SubmissionViewFile[] = s.attachments && s.attachments.length > 0
                      ? s.attachments
                      : s.fileUrls.map((url, i) => ({ name: `Tệp ${i + 1}`, url, kind: 'image' }));
                    const images = files.filter(isImageSubmissionFile);
                    const otherFiles = files.filter(file => !isImageSubmissionFile(file));
                    return (
                      <>
                        <SubmissionImageViewer images={images} studentName={ten} />
                        {otherFiles.length > 0 && <div className="flex flex-wrap gap-2">
                          {otherFiles.map(file => (
                            <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-slate-200">
                              <FileText className="h-4 w-4 shrink-0" /> <span className="break-all">{file.name}</span>
                            </a>
                          ))}
                        </div>}
                      </>
                    );
                  })()
                ) : (
                  <p className="text-sm font-semibold text-slate-400">Không có ảnh đính kèm.</p>
                )}

                {s.grade?.feedback && <NhanXetMarkdown>{s.grade.feedback}</NhanXetMarkdown>}
                <QuestionResultsList results={s.grade?.questionResults} />
                {s.grade?.gradedWithoutAnswerKey && (
                  <p className="text-xs font-bold text-amber-700">Bài chấm khi chưa đối chiếu đáp án chuẩn — nên soát lại giúp.</p>
                )}
                {s.status === 'error' && !s.grade && <p className="text-sm font-semibold text-red-700">{TEACHER_GRADING_ERROR_COPY}</p>}
                {s.status === 'graded' && s.grade && s.lastGradingError && (
                  <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                    <p className="text-sm font-bold text-amber-800">⚠️ Lần chấm lại chưa thành công; điểm hiện tại vẫn được giữ nguyên.</p>
                    <p className="mt-1 text-xs font-semibold text-amber-700 break-words">{s.lastGradingError}</p>
                  </div>
                )}
                {s.evidenceSyncError && (
                  <div className="rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100 flex items-center gap-2">
                    <p className="flex-1 text-sm font-bold text-violet-800">⚠️ Điểm đã duyệt nhưng đồng bộ minh chứng thất bại.</p>
                    <p className="text-xs font-semibold text-violet-700 break-words">{s.evidenceSyncError}</p>
                    <button
                      type="button"
                      onClick={() => retryEvidenceSync(s)}
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void chamLai(s, ten)}
                    disabled={s.status === 'grading' || tienDo !== ''}
                    className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Chấm lại bằng AI
                  </button>
                  <button
                    onClick={() => void suaDiem(s, ten)}
                    disabled={s.status === 'grading' || tienDo !== ''}
                    className="inline-flex items-center gap-1 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <PenLine className="h-3.5 w-3.5" /> Sửa điểm
                  </button>
                  {s.grade && (
                    <button
                      onClick={() => void duyet(s)}
                      disabled={s.status === 'grading' || tienDo !== ''}
                      className={`inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-black transition ${
                        s.grade.teacherApproved ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.grade.teacherApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      {s.grade.teacherApproved ? 'Đã duyệt' : 'Duyệt điểm'}
                    </button>
                  )}
                  {s.grade && (
                    <button
                      onClick={() => void xoaDiem(s, ten)}
                      disabled={s.status === 'grading' || tienDo !== '' || dangXoaNop !== '' || dangXoaDiem !== ''}
                      title="Xóa kết quả chấm nhưng giữ nguyên bài nộp và file"
                      className="inline-flex items-center gap-1 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                    >
                      {dangXoaDiem === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Xóa điểm
                    </button>
                  )}
                  <button
                    onClick={() => void xoaBaiNop(s, ten)}
                    disabled={s.status === 'grading' || tienDo !== '' || dangXoaNop !== ''}
                    title="Xóa lượt nộp này; lịch sử cũ (nếu có) vẫn giữ"
                    className="inline-flex items-center gap-1 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {dangXoaNop === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Xóa lượt nộp
                  </button>
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

export const AssignmentPanel = ({ classId, teacherId, className, showToast, view = 'assignments' }: Props) => {
  const submissionsOnly = view === 'submissions';
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [openId, setOpenId] = useState('');
  // Nạp MỘT lần toàn bộ bài nộp của lớp: đếm "x/y đã nộp" trên từng bài, lọc khi mở bài,
  // và liệt kê em nào CHƯA nộp — không phải bấm vào từng bài mới biết.
  const [tatCaBaiNop, setTatCaBaiNop] = useState<SubmissionDoc[]>([]);
  const [lopHocSinh, setLopHocSinh] = useState<RosterStudent[]>([]);
  const [moRongId, setMoRongId] = useState('');
  // Id bài nộp đang bị xoá — khoá nút trong lúc gọi để không bấm đúp xoá hai lần.
  const [dangXoaNop, setDangXoaNop] = useState('');
  const [dangXoaDiem, setDangXoaDiem] = useState('');
  const [dangTai, setDangTai] = useState(false);
  const [tienDo, setTienDo] = useState('');
  const [moForm, setMoForm] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loiTai, setLoiTai] = useState('');
  const [dangChamLai, setDangChamLai] = useState<{ submission: SubmissionDoc; tenHocSinh: string } | null>(null);
  const [dangLuuChamLai, setDangLuuChamLai] = useState(false);
  // Lỗi riêng cho việc tải BÀI NỘP: nếu nuốt thành mảng rỗng thì bảng hiện "0/x đã nộp",
  // giáo viên tưởng chưa ai nộp và nút Xoá bài lọt qua guard → xoá mất bài có bài nộp thật.
  const [loiBaiNop, setLoiBaiNop] = useState<string | null>(null);
  // Chỉ lưu id submission, không lưu cả object — sau khi refresh không bị dùng bản grade cũ.
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(new Set());
  const [dangBulk, setDangBulk] = useState('');
  // Bản nháp đang sửa của bài đang mở. Rỗng = chưa sửa gì.
  const [nhap, setNhap] = useState<{ answerKey: string; rubric: string; gradingInstructions: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  // AI giải lại đáp án / gợi ý lại hướng dẫn chấm ngay trong panel — kết quả ra NHÁP, GV soát rồi lưu.
  const [dangGiaiLai, setDangGiaiLai] = useState(false);
  const [dangGoiYRubric, setDangGoiYRubric] = useState(false);
  const [choChuaChac, setChoChuaChac] = useState<string[]>([]);

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
    setChoChuaChac([]);
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

  const toggleSelected = useCallback((submissionId: string, selected: boolean) => {
    setSelectedSubmissionIds(previous => {
      const next = new Set(previous);
      if (selected) next.add(submissionId); else next.delete(submissionId);
      return next;
    });
  }, []);

  const toggleAllSubmissions = useCallback((submissionIds: readonly string[], selected: boolean) => {
    setSelectedSubmissionIds(previous => {
      const next = new Set(previous);
      for (const submissionId of submissionIds) {
        if (selected) next.add(submissionId); else next.delete(submissionId);
      }
      return next;
    });
  }, []);

  const selectedCurrentForAssignment = useCallback((assignmentId: string): SubmissionDoc[] =>
    selectedCurrentSubmissions(baiNopCua(assignmentId), selectedSubmissionIds), [baiNopCua, selectedSubmissionIds]);

  const selectedForDeletion = useCallback((assignmentId: string): SubmissionDoc[] =>
    selectedSubmissionsForAssignment(baiNopCua(assignmentId), selectedSubmissionIds), [baiNopCua, selectedSubmissionIds]);

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
      const [attachments, sourceImageUrls, answerKeyImageUrls] = await Promise.all([
        value.deFiles.length > 0 ? uploadAssignmentFiles(teacherId, value.deFiles) : Promise.resolve([]),
        value.sourceImages.length > 0 ? uploadAssignmentImages(teacherId, value.sourceImages, 'nguon-de') : Promise.resolve([]),
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
        sourceText: value.sourceText,
        sourceImageUrls,
        gradingInstructions: value.gradingInstructions,
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

  /** Chấm tuần tự đúng các lượt hiện hành đã chọn, không vô tình chấm lịch sử cũ. */
  const chamDaChon = async (assignment: AssignmentDoc) => {
    const selected = selectedCurrentForAssignment(assignment.id).filter(s => s.status === 'submitted' || s.status === 'error');
    if (selected.length === 0) return;
    setDangBulk('grade');
    let ok = 0;
    let failed = 0;
    try {
      for (const submission of selected) {
        try {
          await gradeOneSubmission(submission.id);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      showToast(`Đã chấm ${ok}/${selected.length} bài đã chọn${failed > 0 ? `; ${failed} bài lỗi cần thử lại` : ''}.`, failed > 0 ? 'warning' : 'success');
      setSelectedSubmissionIds(previous => {
        const next = new Set(previous);
        selected.forEach(s => next.delete(s.id));
        return next;
      });
      try {
        setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
        setLoiBaiNop(null);
      } catch {
        setLoiBaiNop('Đã chấm xong nhưng chưa tải lại được danh sách mới. Bấm "Làm mới" để cập nhật.');
      }
    } finally {
      setDangBulk('');
    }
  };

  /**
   * Chấm LẠI loạt các bài ĐÃ chấm bằng AI sau khi giáo viên đổi đáp án/hướng dẫn/lệnh riêng.
   *
   * Bỏ đúng bài giáo viên đã sửa tay (`editedByTeacher`) để không đè lên chỉnh sửa của thầy cô —
   * bài sửa tay muốn chấm lại vẫn dùng nút "Chấm lại bằng AI" của từng em (có chủ đích). Server
   * đã lo phần còn lại: bài đã duyệt bị chấm lại sẽ về "chờ duyệt lại" và bằng chứng cũ được gỡ
   * khỏi hồ sơ tích luỹ; điểm cũ được giữ nếu lượt chấm lại lỗi.
   */
  const chamLaiDaChon = async (assignment: AssignmentDoc) => {
    const chon = selectedCurrentForAssignment(assignment.id).filter(s => s.status === 'graded' && Boolean(s.grade));
    const selected = chon.filter(s => s.grade?.editedByTeacher !== true);
    const boQuaSuaTay = chon.length - selected.length;
    if (selected.length === 0) {
      showToast(boQuaSuaTay > 0
        ? `Các bài đã chọn đều do thầy cô sửa tay — không chấm lại loạt để khỏi đè. Dùng "Chấm lại bằng AI" từng em nếu muốn.`
        : 'Chưa chọn bài đã chấm nào để chấm lại.', 'info');
      return;
    }
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: `Chấm lại ${selected.length} bài đã chấm bằng AI?`,
      html: `Điểm và nhận xét cũ do AI chấm sẽ bị thay bằng kết quả mới theo đáp án hiện tại.<br/>Bài đã <b>duyệt</b> sẽ quay về <b>chờ duyệt lại</b>.${boQuaSuaTay > 0 ? `<br/><span style="font-size:12px;color:#94a3b8;">Bỏ qua ${boQuaSuaTay} bài thầy cô đã sửa tay.</span>` : ''}`,
      showCancelButton: true,
      confirmButtonText: 'Chấm lại',
      cancelButtonText: 'Thôi',
      confirmButtonColor: '#2563eb',
    });
    if (!isConfirmed) return;

    setDangBulk('regrade');
    let ok = 0;
    let failed = 0;
    try {
      for (const submission of selected) {
        try {
          await gradeOneSubmission(submission.id);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      showToast(`Đã chấm lại ${ok}/${selected.length} bài${failed > 0 ? `; ${failed} bài lỗi cần thử lại` : ''}${boQuaSuaTay > 0 ? `; bỏ qua ${boQuaSuaTay} bài GV sửa tay` : ''}.`, failed > 0 ? 'warning' : 'success');
      setSelectedSubmissionIds(previous => {
        const next = new Set(previous);
        selected.forEach(s => next.delete(s.id));
        return next;
      });
      try {
        setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
        setLoiBaiNop(null);
      } catch {
        setLoiBaiNop('Đã chấm lại xong nhưng chưa tải lại được danh sách mới. Bấm "Làm mới" để cập nhật.');
      }
    } finally {
      setDangBulk('');
    }
  };

  /** Duyệt tuần tự để mỗi lần cập nhật hồ sơ tích lũy không ghi đè merge của em khác. */
  const duyetDaChon = async (assignment: AssignmentDoc) => {
    const selected = selectedCurrentForAssignment(assignment.id)
      .filter(s => s.status === 'graded' && s.grade && !s.grade.teacherApproved);
    if (selected.length === 0) return;
    setDangBulk('approve');
    let ok = 0;
    let failed = 0;
    try {
      for (const submission of selected) {
        try {
          await approveGrade(submission, true);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      showToast(`Đã duyệt ${ok}/${selected.length} bài đã chọn${failed > 0 ? `; ${failed} bài lỗi` : ''}.`, failed > 0 ? 'warning' : 'success');
      setSelectedSubmissionIds(previous => {
        const next = new Set(previous);
        selected.forEach(s => next.delete(s.id));
        return next;
      });
      try {
        setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
        setLoiBaiNop(null);
      } catch {
        setLoiBaiNop('Đã duyệt xong nhưng chưa tải lại được danh sách mới. Bấm "Làm mới" để cập nhật.');
      }
    } finally {
      setDangBulk('');
    }
  };

  /**
   * Xóa đúng các submission giáo viên đã chọn, bao gồm cả lượt hiện hành và lượt lịch sử cũ.
   * Các lượt không chọn vẫn giữ nguyên để đối chiếu và học sinh có thể nộp attempt mới.
   */
  const xoaDaChon = async (assignment: AssignmentDoc) => {
    if (loiBaiNop !== null) {
      await Swal.fire({ icon: 'warning', title: 'Chưa thể xóa an toàn', text: 'Danh sách bài nộp chưa tải chắc chắn. Bấm "Làm mới" trước khi xóa.', confirmButtonColor: '#3085d6' });
      return;
    }
    const selected = selectedForDeletion(assignment.id);
    if (selected.length === 0) return;
    if (selected.some(s => s.status === 'grading')) {
      await Swal.fire({ icon: 'info', title: 'Có bài đang được chấm', text: 'Chờ máy chấm xong rồi mới xóa để không tạo trạng thái đua nhau.', confirmButtonColor: '#3085d6' });
      return;
    }
    const currentIds = new Set(currentSubmissionsForAssignment(baiNopCua(assignment.id)).map(s => s.id));
    const names = selected.map(s => {
      const name = lopHocSinh.find(hs => hs.studentId === s.studentId)?.name || `HS …${s.studentId.slice(-4)}`;
      return `${name} — ${currentIds.has(s.id) ? 'lượt mới nhất' : 'lượt cũ'}`;
    });
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xóa ${selected.length} lượt nộp đã chọn?`,
       html: `<p>Phạm vi: <b>${names.join(', ')}</b>.</p><p style="margin-top:8px">Chỉ xóa đúng các lượt đã chọn của bài <b>${assignment.title}</b>; các lượt khác, kể cả lượt mới nhất hoặc lượt cũ, vẫn giữ nguyên. Điểm/nhận xét của các lượt này sẽ mất.</p><p style="margin-top:8px;font-size:12px;color:#64748b">Document bài nộp và các file Storage của từng lượt sẽ được dọn cùng nhau. Nếu máy chủ không dọn được file, lượt đó sẽ giữ lại để thử lại.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Xóa các lượt đã chọn',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    setDangBulk('delete');
    let ok = 0;
    let failed = 0;
    const deletedIds = new Set<string>();
    try {
      for (const submission of selected) {
        try {
          await xoaBaiNopHocSinh(submission);
          ok += 1;
          deletedIds.add(submission.id);
        } catch {
          failed += 1;
        }
      }
      // Chỉ xóa khỏi local list các lượt đã xác nhận thành công; không che lỗi partial failure.
      setTatCaBaiNop(previous => previous.filter(s => !deletedIds.has(s.id)));
      setSelectedSubmissionIds(previous => {
        const next = new Set(previous);
        deletedIds.forEach(id => next.delete(id));
        return next;
      });
      showToast(`Đã xóa ${ok}/${selected.length} lượt nộp${failed > 0 ? `; ${failed} lượt chưa xóa được` : ''}.`, failed > 0 ? 'warning' : 'success');
    } finally {
      setDangBulk('');
    }
  };

  const luuNoiDung = async (a: AssignmentDoc) => {
    if (!nhap) return;
    setDangLuu(true);
    try {
      await updateAssignmentContent(a.id, nhap);
      setNhap(null);
      setChoChuaChac([]);
      showToast('Đã lưu đáp án, hướng dẫn và lệnh chấm riêng.', 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không lưu được.');
    } finally {
      setDangLuu(false);
    }
  };

  /** Bản nháp hiện hành: ưu tiên nội dung GV đang sửa, chưa sửa thì lấy từ bài đã lưu. */
  const draftHienHanh = (a: AssignmentDoc) =>
    nhap ?? { answerKey: a.answerKey || '', rubric: a.rubric || '', gradingInstructions: a.gradingInstructions || '' };

  /**
   * AI giải LẠI đáp án từ đề đã lưu, theo Lệnh riêng đang gõ. Kết quả đổ vào ô NHÁP để GV soát
   * rồi mới bấm Lưu — cố ý không tự ghi, vì một đáp án sai làm cả lớp bị chấm sai.
   */
  const giaiLaiDapAn = async (a: AssignmentDoc) => {
    const base = draftHienHanh(a);
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'AI giải lại đáp án từ đề?',
      html: 'AI đọc lại đề đã lưu rồi dựng đáp án nháp mới.<br/>Nội dung ô <b>Đáp án chuẩn</b> hiện tại sẽ bị thay bằng bản nháp — <b>chưa lưu</b> cho tới khi bấm <b>Lưu thay đổi</b>.<br/><span style="font-size:12px;color:#94a3b8;">Giải theo đúng Lệnh riêng đang gõ. Tốn 1 lượt AI.</span>',
      showCancelButton: true,
      confirmButtonText: 'Giải lại',
      cancelButtonText: 'Thôi',
      confirmButtonColor: '#2563eb',
    });
    if (!isConfirmed) return;

    setDangGiaiLai(true);
    setChoChuaChac([]);
    try {
      const ket = await solveAnswerKeyForAssignment(a.id, base.gradingInstructions);
      setNhap({ ...base, answerKey: ket.answerKey });
      setChoChuaChac(Array.isArray(ket.uncertainties) ? ket.uncertainties : []);
      showToast('AI đã giải xong — soát kỹ rồi bấm Lưu thay đổi.', 'success');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chưa giải lại được',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setDangGiaiLai(false);
    }
  };

  /** AI gợi ý LẠI hướng dẫn chấm từ đáp án hiện có (nháp) + Lệnh riêng. Cũng ra nháp để GV soát. */
  const goiYLaiRubric = async (a: AssignmentDoc) => {
    const base = draftHienHanh(a);
    if (!base.answerKey.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Cần có đáp án trước',
        text: 'Hướng dẫn chấm là cách chia điểm CHO đáp án. Giải lại hoặc nhập đáp án trước đã.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    setDangGoiYRubric(true);
    try {
      const rubric = await suggestRubric(classId, base.answerKey, a.maxScore || 10, base.gradingInstructions);
      setNhap({ ...base, rubric });
      showToast('AI đã gợi ý hướng dẫn chấm — soát rồi bấm Lưu thay đổi.', 'success');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Chưa gợi ý được',
        text: error instanceof Error ? error.message : 'Thử lại sau ít phút.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setDangGoiYRubric(false);
    }
  };

  /**
   * Đổi hạn nộp sau khi đã giao. Nhãn sớm/muộn của học sinh tính ĐỘNG từ hạn này
   * nên đổi xong là mọi bài nộp cũ tự phân loại lại, không phải quét sửa dữ liệu.
   */
  const doiTenBai = async (a: AssignmentDoc) => {
    const { value: title } = await Swal.fire({
      title: 'Đổi tên bài giao',
      input: 'text',
      inputValue: a.title,
      inputPlaceholder: 'Tên bài giao',
      showCancelButton: true,
      confirmButtonText: 'Lưu tên mới',
      cancelButtonText: 'Hủy',
      inputValidator: value => value.trim() ? undefined : 'Tên bài giao không được để trống.',
    });
    const normalized = typeof title === 'string' ? title.trim() : '';
    if (!normalized || normalized === a.title) return;
    try {
      await renameAssignment(a.id, normalized);
      showToast('Đã đổi tên bài giao; ID và toàn bộ bài nộp vẫn giữ nguyên.', 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không đổi được tên bài giao.');
    }
  };

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
      text: 'Bài giao, file đề, ảnh đề và ảnh đáp án sẽ được dọn khỏi máy chủ. Chỉ xoá được khi bài chưa có bài nộp.',
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
      text: 'Kết quả cũ sẽ được lưu lịch sử. Kết quả AI mới cần giáo viên duyệt lại; nếu AI lỗi, điểm cũ vẫn được giữ.',
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

  /** Thử lại đồng bộ minh chứng sau khi duyệt điểm. */
  const retryEvidenceSync = async (s: SubmissionDoc) => {
    try {
      const { getAuth } = await import('firebase/auth');
      const currentUser = getAuth().currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';
      const res = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retryEvidenceSync', submissionId: s.id, idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Thử lại thất bại');
      }
      showToast('Đã thử đồng bộ lại minh chứng.', 'success');
      setTatCaBaiNop(await listSubmissionsForClass(classId, teacherId));
    } catch (e) {
      showToast('Thử lại thất bại: ' + (e instanceof Error ? e.message : 'Lỗi không xác định'), 'error');
    }
  };

  /** Sửa tay điểm + nhận xét — máy chấm sai mà AI chấm lại vẫn sai thì người phải can thiệp được. */
  const suaDiem = (s: SubmissionDoc, tenHocSinh: string) => {
    setDangChamLai({ submission: s, tenHocSinh });
  };

  /**
   * Lưu kết quả chấm lại. Chủ đề yếu đi kèm nên hồ sơ tích luỹ được đồng bộ luôn ở
   * `updateSubmissionGradeManually` — sửa nhãn trên màn hình mà hồ sơ giữ nhãn cũ là kiểu sai
   * âm thầm nhất: bài bổ trợ vẫn ra theo chủ đề thầy cô vừa bác bỏ.
   */
  const luuChamLai = async (value: GradeReviewValue) => {
    const dang = dangChamLai;
    if (!dang) return;
    setDangLuuChamLai(true);
    try {
      await updateSubmissionGradeManually(dang.submission, {
        score: value.score,
        maxScore: value.maxScore,
        feedback: value.feedback,
        weakTopics: value.weakTopics,
        teacherNote: value.teacherNote,
      });
      showToast(`Đã lưu chấm tay cho ${dang.tenHocSinh}; cần duyệt lại kết quả.`, 'success');
      setDangChamLai(null);
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không lưu được điểm.');
    } finally {
      setDangLuuChamLai(false);
    }
  };

  /** Xóa kết quả hiện hành nhưng giữ nguyên bài nộp, ảnh/file và cho phép chấm lại. */
  const xoaDiem = async (s: SubmissionDoc, tenHocSinh: string) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xóa điểm của ${tenHocSinh}?`,
      html: 'Chỉ xóa <b>kết quả chấm hiện hành</b>; bài nộp, ảnh, file và ghi chú của học sinh vẫn được giữ. Kết quả cũ vẫn lưu trong lịch sử để đối chiếu.',
      showCancelButton: true,
      confirmButtonText: 'Xóa điểm',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#d97706',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    setDangXoaDiem(s.id);
    try {
      await xoaDiemBaiNopHocSinh(s);
      showToast(`Đã xóa kết quả chấm của ${tenHocSinh}; bài nộp vẫn được giữ.`, 'success');
      await taiBai();
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không xóa được kết quả chấm.');
    } finally {
      setDangXoaDiem('');
    }
  };

  /**
   * Xóa HẲN một lượt nộp đang mở. Lịch sử cũ (nếu có) vẫn giữ để đối chiếu; đây không phải
   * thao tác xóa toàn bộ lịch sử của học sinh. Bài đã duyệt sẽ tự gỡ bằng chứng khỏi hồ sơ
   * tích lũy trước khi xóa.
   */
  const xoaBaiNop = async (s: SubmissionDoc, tenHocSinh: string) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Xóa lượt nộp của ${tenHocSinh}?`,
      html: 'Điểm và nhận xét lượt này <b>mất vĩnh viễn</b>. Lịch sử cũ (nếu có) vẫn giữ để đối chiếu và học sinh vẫn có thể nộp attempt mới.<br/><span style="font-size:12px;color:#64748b;">Document bài nộp và file Storage của lượt này sẽ được dọn cùng nhau. Nếu dọn file lỗi, lượt nộp vẫn giữ để thử lại.</span>',
      showCancelButton: true,
      confirmButtonText: 'Xóa lượt nộp',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    });
    if (!isConfirmed) return;

    setDangXoaNop(s.id);
    try {
      await xoaBaiNopHocSinh(s);
      showToast(`Đã xóa lượt nộp của ${tenHocSinh}.`, 'success');
      await taiBai();
      setSelectedSubmissionIds(previous => {
        const next = new Set(previous);
        next.delete(s.id);
        return next;
      });
      if (moRongId === s.id) setMoRongId('');
    } catch (error) {
      setLoiTai(error instanceof Error ? error.message : 'Không xoá được bài nộp.');
    } finally {
      setDangXoaNop('');
    }
  };

  const duyet = async (submission: SubmissionDoc) => {
    if (submission.status === 'grading') {
      showToast('Bài đang được AI chấm; chờ máy xử lý xong rồi duyệt.', 'warning');
      return;
    }
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
      {dangChamLai && (
        <GradeReviewModal
          classId={classId}
          studentName={dangChamLai.tenHocSinh}
          submission={dangChamLai.submission}
          dangLuu={dangLuuChamLai}
          onClose={() => setDangChamLai(null)}
          onSubmit={luuChamLai}
        />
      )}

      {moForm && (
        <AssignmentFormModal classId={classId} className={className} dangGui={dangGui} onClose={() => setMoForm(false)} onSubmit={guiBaiMoi} />
      )}

      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{submissionsOnly ? 'Bài nộp của lớp' : 'Bài tập nộp ảnh'}</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{submissionsOnly ? 'Theo dõi và chấm bài' : 'Giao bài & chấm bằng AI'}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void taiBai()} disabled={dangTai} title="Làm mới danh sách bài nộp" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${dangTai ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          {!submissionsOnly && <button onClick={() => setMoForm(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Giao bài mới
          </button>}
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
                    {a.isOpen ? 'Đang mở' : 'Đã đóng'} · {a.type === 'exam' ? 'bài kiểm tra online' : ((a.answerKey || (a.answerKeyImageUrls?.length ?? 0) > 0) ? 'có đáp án chuẩn' : 'không có đáp án')}
                    {(a.attachments?.length ?? 0) > 0 ? ` · ${a.attachments!.length} file đề` : ' · chưa đính kèm đề'}
                    {a.gradingInstructions ? ' · có lệnh chấm riêng' : ''}
                    {a.answerKeyByAi ? ' · đáp án do AI giải' : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void doiTenBai(a)}
                  title="Đổi tên bài giao; không đổi mã bài hoặc bài nộp"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <PenLine className="h-3.5 w-3.5" /> Đổi tên
                </button>
                {a.type === 'exam' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
                    <ClipboardList className="h-3.5 w-3.5" /> Online · xem lượt làm
                  </span>
                ) : (() => {
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
                {a.type === 'exam' ? (
                  <button
                    type="button"
                    onClick={() => moBai(a.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700"
                  >
                    <ClipboardList className="h-4 w-4" /> Xem lượt làm
                  </button>
                ) : (
                  <button
                    onClick={() => chamCaLop(a)}
                    disabled={tienDo !== ''}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {tienDo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {tienDo || 'Chấm cả lớp'}
                  </button>
                )}
              </div>

              {(submissionsOnly || openId === a.id) && (
                <div className="border-t border-slate-100 p-4">
                  {a.type === 'exam' ? (
                    <OnlineAssignmentReview classId={classId} assignment={a} showToast={showToast} />
                  ) : (
                    <>
                  {/* NỘI DUNG ĐÃ GIAO — phải xem lại và sửa được. Đáp án AI giải ra mà không mở
                      lại được thì lời hứa "thầy cô soát trước khi chấm" chỉ đúng đúng một lần. */}
                  {!submissionsOnly && <div className="mb-5 rounded-2xl bg-slate-50 p-4">
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
                        <span className="flex-1" />
                        <button
                          onClick={() => void giaiLaiDapAn(a)}
                          disabled={dangGiaiLai || dangGoiYRubric}
                          title="AI đọc lại đề đã lưu rồi dựng đáp án nháp mới theo Lệnh riêng"
                          className="inline-flex items-center gap-1 rounded-2xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
                        >
                          {dangGiaiLai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {dangGiaiLai ? 'Đang giải...' : 'AI giải lại đáp án'}
                        </button>
                      </div>
                      <textarea
                        value={nhap ? nhap.answerKey : (a.answerKey || '')}
                        onChange={e => setNhap({
                          answerKey: e.target.value,
                          rubric: nhap ? nhap.rubric : (a.rubric || ''),
                          gradingInstructions: nhap ? nhap.gradingInstructions : (a.gradingInstructions || ''),
                        })}
                        rows={8}
                        placeholder="Chưa có đáp án. AI sẽ phải tự đọc đề trong ảnh từng em rồi tự giải."
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                      />
                      {choChuaChac.length > 0 && (
                        <div className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                          <p className="text-xs font-black text-amber-800">AI báo chưa chắc ở {choChuaChac.length} chỗ — soát kỹ trước khi lưu:</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs font-semibold text-amber-800">
                            {choChuaChac.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-sm font-black text-slate-700">Hướng dẫn chấm</p>
                        <span className="flex-1" />
                        <button
                          onClick={() => void goiYLaiRubric(a)}
                          disabled={dangGiaiLai || dangGoiYRubric}
                          title="AI đề xuất cách chia điểm cho đáp án hiện tại theo Lệnh riêng"
                          className="inline-flex items-center gap-1 rounded-2xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
                        >
                          {dangGoiYRubric ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {dangGoiYRubric ? 'Đang gợi ý...' : 'AI gợi ý lại hướng dẫn chấm'}
                        </button>
                      </div>
                      <textarea
                        value={nhap ? nhap.rubric : (a.rubric || '')}
                        onChange={e => setNhap({
                          answerKey: nhap ? nhap.answerKey : (a.answerKey || ''),
                          rubric: e.target.value,
                          gradingInstructions: nhap ? nhap.gradingInstructions : (a.gradingInstructions || ''),
                        })}
                        rows={4}
                        placeholder="Chưa có. Thiếu thì AI tự quyết cách chia điểm thành phần, mỗi em một kiểu."
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-black text-slate-700">Lệnh riêng cho AI khi chấm</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Chỉ chấm Câu 1, 3; bỏ qua Bài 2; không trừ phần bị bỏ qua. Đây là lệnh nội bộ, không hiển thị trong bài học sinh.</p>
                      <textarea
                        value={nhap ? nhap.gradingInstructions : (a.gradingInstructions || '')}
                        onChange={e => setNhap({
                          answerKey: nhap ? nhap.answerKey : (a.answerKey || ''),
                          rubric: nhap ? nhap.rubric : (a.rubric || ''),
                          gradingInstructions: e.target.value,
                        })}
                        rows={3}
                        placeholder="Ví dụ: Chỉ dùng Câu 1 và Câu 3; bỏ qua phần trắc nghiệm; không tự suy ra câu ngoài đề."
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
                        <button onClick={() => { setNhap(null); setChoChuaChac([]); }}
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
                  </div>}

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
                    xoaBaiNop={xoaBaiNop}
                    dangXoaNop={dangXoaNop}
                    xoaDiem={xoaDiem}
                    dangXoaDiem={dangXoaDiem}
                    selectedIds={selectedSubmissionIds}
                    toggleSelected={toggleSelected}
                    toggleAllSubmissions={toggleAllSubmissions}
                    bulkCham={() => chamDaChon(a)}
                    bulkChamLai={() => chamLaiDaChon(a)}
                    bulkDuyet={() => duyetDaChon(a)}
                    bulkXoa={() => xoaDaChon(a)}
                    dangBulk={dangBulk}
                    retryEvidenceSync={retryEvidenceSync}
                  />
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                    Học sinh tự chấm AI thành công → tự động ghi nhận vào hồ sơ (AI tự duyệt). Chấm lại của thầy cô / sửa điểm tay → cần bấm <b>Duyệt điểm</b> mới vào hồ sơ.
                  </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
