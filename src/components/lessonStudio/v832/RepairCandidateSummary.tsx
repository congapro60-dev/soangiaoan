import type { V832RepairCandidateDoc } from '../../../services/v832StudioService';
import { useId, useState } from 'react';

const fieldNames: Record<string, string> = {
  expectedProduct: 'Sản phẩm cần nộp', requiredProduct: 'Sản phẩm cần nộp', purpose: 'Mục đích hoạt động',
  studentPrompt: 'Nhiệm vụ học sinh', exactCopy: 'Nội dung hiển thị', title: 'Tiêu đề',
  prompt: 'Câu hỏi', studentAction: 'Việc học sinh làm', teacherAction: 'Việc giáo viên làm',
  recommendedTeacherAction: 'Gợi ý hành động cho giáo viên', transitionWhen: 'Điều kiện chuyển bước',
  durationSec: 'Thời lượng (giây)', estimatedWorkTimeSec: 'Thời gian trả lời (giây)',
  correctAnswer: 'Đáp án', hints: 'Gợi ý', visibleObjects: 'Đối tượng hiển thị',
};
const label = (path: string): string => {
  const parts = path.split('/');
  const field = parts.at(-1) ?? '';
  return ['vi', 'en', 'ja'].includes(field)
    ? `${fieldNames[parts.at(-2) ?? ''] ?? 'Nội dung'} (${field.toUpperCase()})`
    : fieldNames[field] ?? 'Trường dữ liệu bài học';
};
const formatValue = (value: unknown): string => value == null ? 'Chưa có'
  : typeof value === 'string' ? value : JSON.stringify(value);
const qaLabel = (value: string | undefined): string => value === 'PASS' || value === 'VALID' ? 'Đạt kiểm tra tự động'
  : value === 'NOT_APPLICABLE' ? 'Không áp dụng' : 'Chưa được kiểm chứng';

export const RepairCandidateSummary = ({ candidate, busy, onDecision }: {
  candidate: V832RepairCandidateDoc;
  busy: boolean;
  onDecision: (decision: 'REJECT' | 'REFINE', message: string) => void;
}) => {
  const [message, setMessage] = useState('');
  const fieldId = useId();
  return <section
  className="v832-repair-candidate mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
  <h3 className="font-extrabold">Ứng viên sửa</h3>
  <p className="mt-2 text-sm">{candidate.classification.rationale}</p>
  {candidate.changes?.length ? <div className="mt-3 grid gap-3">
    {candidate.changes.map(change => <div key={change.path} className="rounded-lg border border-amber-200 bg-white p-3">
      <h4 className="font-bold">{label(change.path)}</h4>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Trước</dt><dd className="whitespace-pre-wrap break-words">{formatValue(change.before)}</dd></div>
        <div><dt className="font-semibold">Sau</dt><dd className="whitespace-pre-wrap break-words">{formatValue(change.after)}</dd></div>
      </dl>
      <details className="mt-2 text-xs text-slate-600"><summary>Vị trí dữ liệu</summary><code>{change.path}</code></details>
    </div>)}
  </div> : <p className="mt-3 text-sm">Bản cũ chưa có bản ghi so sánh từng trường; cần tạo lại đề xuất để kiểm tra đầy đủ.</p>}
  <div className="mt-3 grid gap-1 text-sm">
    <div>Cấu trúc: {qaLabel(candidate.qa.schema)}</div>
    <div>Tham chiếu giữa các phần: {qaLabel(candidate.qa.references)}</div>
    <div>Ngân sách thời gian: {qaLabel(candidate.qa.budget)}</div>
    <div>Mô hình hình Toán: {qaLabel(candidate.qa.mathVisual)}</div>
    <div>Nội dung Toán và sư phạm: chưa kiểm chứng</div>
    <div>Trình duyệt, bố cục và duyệt của GV: chưa hoàn tất</div>
  </div>
  <p className="mt-3 text-sm font-semibold text-amber-950">{candidate.status === 'REJECTED'
    ? 'Đã bỏ đề xuất. Lịch sử được giữ; bản gốc không thay đổi.'
    : candidate.status === 'REFINEMENT_REQUESTED' ? 'Đã ghi yêu cầu chỉnh tiếp. Dùng nút Phân tích để tạo đề xuất kế tiếp từ ứng viên này.'
      : 'Ứng viên đang chờ kiểm định; bài học đang chạy giữ phiên bản đã ghim.'}</p>
  {candidate.status === 'QA_PENDING' && <div className="mt-3">
    <label className="block text-sm font-semibold" htmlFor={fieldId}>Yêu cầu chỉnh tiếp hoặc lý do bỏ đề xuất</label>
    <textarea id={fieldId} className="v832-candidate-message mt-2 w-full rounded-lg border-2 border-amber-300 bg-white p-3"
      rows={2} maxLength={4000} disabled={busy} value={message} onChange={event => setMessage(event.target.value)} />
    <div className="mt-2 flex flex-wrap gap-3">
      <button className="v832-candidate-refine min-h-12 rounded-xl bg-teal-800 px-4 font-bold text-white disabled:opacity-50"
        disabled={busy || !message.trim()} onClick={() => onDecision('REFINE', message)}>Chỉnh tiếp</button>
      <button className="v832-candidate-reject min-h-12 rounded-xl border-2 border-rose-700 px-4 font-bold text-rose-900 disabled:opacity-50"
        disabled={busy} onClick={() => onDecision('REJECT', message)}>Bỏ thay đổi</button>
      <button className="min-h-12 rounded-xl border-2 border-slate-300 px-4 font-bold text-slate-600" disabled
        title="Cần hoàn tất các cổng QA trước khi duyệt">Duyệt sau kiểm định</button>
    </div>
  </div>}
  <details className="mt-2 text-xs text-slate-600"><summary>Thông tin phiên bản</summary>
    <p>{candidate.parentVersion} → {candidate.version}</p>
    <p>{candidate.classification.primary} · {candidate.status}</p>
  </details>
</section>;
};
