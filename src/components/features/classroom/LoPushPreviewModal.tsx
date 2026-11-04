import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send, X } from 'lucide-react';
import type { LoDiff } from '../../../lib/ssm/loSsmWrite';
import type { SsmCriteriaLoad } from '../../../lib/ssm/loSsmParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  diff: LoDiff;
  load: SsmCriteriaLoad;
  assessmentName: string;
  onConfirm: () => Promise<void>;
  isBusy: boolean;
}

export const LoPushPreviewModal = ({
  isOpen,
  onClose,
  diff,
  load,
  assessmentName,
  onConfirm,
  isBusy,
}: Props) => {
  const [onlyChanged, setOnlyChanged] = useState(true);

  const studentNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of load.students) map.set(s.maHS, s.name);
    return map;
  }, [load.students]);

  const loTextByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const lo of load.los) map.set(lo.loCode, lo.text);
    return map;
  }, [load.los]);

  if (!isOpen) return null;

  const displayCells = onlyChanged ? diff.cells.filter((c) => c.changed) : diff.cells;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-black uppercase text-indigo-700">
                {assessmentName}
              </span>
              <h2 className="text-lg font-black text-slate-800">
                Xem trước thay đổi trước khi đẩy lên SSM
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Kiểm tra kĩ các mức điểm sẽ được ghi trực tiếp vào hệ thống SSM của trường.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="text-xs font-bold text-emerald-700">Điểm thêm mới</div>
              <div className="mt-1 text-2xl font-black text-emerald-800">
                {diff.changedCount - diff.overwriteCount}
              </div>
              <div className="text-[11px] text-emerald-600">Ô trước đây trống</div>
            </div>
            <div className={`rounded-xl border p-3 ${diff.overwriteCount > 0 ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-bold ${diff.overwriteCount > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                Ghi đè điểm cũ
              </div>
              <div className={`mt-1 text-2xl font-black ${diff.overwriteCount > 0 ? 'text-amber-900' : 'text-slate-700'}`}>
                {diff.overwriteCount}
              </div>
              <div className={`text-[11px] ${diff.overwriteCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {diff.overwriteCount > 0 ? 'Thay thế điểm cũ trên SSM' : 'Không có'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-600">Tổng ô cập nhật</div>
              <div className="mt-1 text-2xl font-black text-slate-800">
                {diff.changedCount}
              </div>
              <div className="text-[11px] text-slate-500">
                / {diff.cells.length} ô trên SSM
              </div>
            </div>
          </div>

          {/* Warnings */}
          {diff.overwriteCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <b>Cảnh báo ghi đè:</b> Có {diff.overwriteCount} ô điểm trên SSM đã có dữ liệu từ trước nhưng web tính ra mức khác. Điểm cũ sẽ bị thay thế trên SSM.
              </div>
            </div>
          )}

          {diff.unmappedMarks.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <b>Lỗi thang điểm:</b> Các mức điểm sau không có trong thang của SSM: {diff.unmappedMarks.join(', ')}. Không thể đẩy lên cho đến khi sửa lại.
              </div>
            </div>
          )}

          {load.isApproved && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <b>Bài đã được duyệt trên SSM:</b> Trạng thái bài đánh giá này là đã duyệt (is_approved). SSM chặn mọi thao tác sửa điểm.
              </div>
            </div>
          )}

          {/* Filter toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">
              Danh sách chi tiết ({displayCells.length} dòng):
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Chỉ hiện các ô có thay đổi
            </label>
          </div>

          {/* Diff Table */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 text-xs">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-3 py-2">Học sinh</th>
                  <th className="px-3 py-2">Mã HS</th>
                  <th className="px-3 py-2">Chuẩn đầu ra (LO)</th>
                  <th className="px-3 py-2 text-center">Điểm cũ (SSM)</th>
                  <th className="px-3 py-2 text-center">Điểm mới (Web)</th>
                  <th className="px-3 py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayCells.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400 font-semibold">
                      Không có thay đổi nào cần cập nhật.
                    </td>
                  </tr>
                ) : (
                  displayCells.map((cell) => {
                    const studentName = studentNameByCode.get(cell.maHS) || cell.maHS;
                    const loText = loTextByCode.get(cell.loCode) || cell.loCode;
                    return (
                      <tr
                        key={`${cell.maHS}_${cell.loCode}`}
                        className={cell.overwrite ? 'bg-amber-50/50' : cell.changed ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2 font-bold text-slate-800">{studentName}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{cell.maHS}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={loText}>
                          <span className="font-semibold text-slate-800">{cell.loCode}</span>: {loText}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-600">
                          {cell.existing ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-indigo-700">
                          {cell.proposed ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {cell.overwrite ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                              Ghi đè
                            </span>
                          ) : cell.changed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                              Mới
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Giữ nguyên</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isBusy || diff.changedCount === 0 || diff.unmappedMarks.length > 0 || load.isApproved}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50 shadow-md shadow-violet-200"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đẩy lên SSM & xác minh…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Xác nhận đẩy {diff.changedCount} điểm lên SSM
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
