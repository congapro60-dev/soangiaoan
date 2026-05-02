import { useState } from 'react';
import { X, ChevronDown, ChevronUp, ShieldAlert, Shield, AlertCircle, Info } from 'lucide-react';
import { PlagiarismReport, SuspiciousPair, SharedSegment } from '../../../utils/plagiarismUtils';

interface Props {
  isOpen: boolean;
  report: PlagiarismReport | null;
  onClose: () => void;
}

// ── Pair accordion card ───────────────────────────────────────────────────────

function PairCard({ pair }: { pair: SuspiciousPair }) {
  const [expanded, setExpanded] = useState(false);
  const isRed = pair.level === 'red';

  const borderCls = isRed
    ? 'border-red-200 border-l-red-400 bg-red-50'
    : 'border-amber-200 border-l-amber-400 bg-amber-50';
  const badgeCls = isRed
    ? 'bg-red-100 text-red-700 border border-red-200'
    : 'bg-amber-100 text-amber-700 border border-amber-200';

  return (
    <div className={`rounded-xl border border-l-4 overflow-hidden ${borderCls}`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-3 text-left hover:brightness-95 transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isRed
            ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            : <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
          }
          <span className="font-bold text-sm text-slate-800 truncate">
            {pair.studentAName}
          </span>
          <span className="text-slate-400 text-xs flex-shrink-0">vs</span>
          <span className="font-bold text-sm text-slate-800 truncate">
            {pair.studentBName}
          </span>
          {!pair.hasRawText && (
            <span className="text-[10px] text-slate-400 italic flex-shrink-0">(bài ảnh)</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeCls}`}>
            {pair.similarityPercent}% trùng
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-200 bg-white p-4 space-y-4">
          {!pair.hasRawText && (
            <p className="text-[11px] text-slate-400 italic">
              Lưu ý: Bài nộp dạng ảnh, mức độ đối chiếu dựa trên phân tích lỗi sai, có thể không chính xác tuyệt đối.
            </p>
          )}

          {pair.sharedSegments.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Không có đoạn trích cụ thể.
            </p>
          ) : (
            pair.sharedSegments.map((seg, i) => (
              <SegmentBlock key={i} seg={seg} studentAName={pair.studentAName} studentBName={pair.studentBName} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SegmentBlock({
  seg,
  studentAName,
  studentBName,
}: {
  seg: SharedSegment;
  studentAName: string;
  studentBName: string;
}) {
  return (
    <div className="space-y-2">
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
            {studentAName}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed min-h-[48px]">
            {seg.textA || <span className="italic text-slate-400">—</span>}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
            {studentBName}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed min-h-[48px]">
            {seg.textB || <span className="italic text-slate-400">—</span>}
          </div>
        </div>
      </div>

      {/* AI reason */}
      <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
        seg.isWrongReasoning
          ? 'bg-red-50 border border-red-100 text-red-700'
          : 'bg-amber-50 border border-amber-100 text-amber-700'
      }`}>
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>{seg.reason}</span>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export const PlagiarismDashboard = ({ isOpen, report, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState<'red' | 'yellow'>('red');

  if (!isOpen || !report) return null;

  const totalSuspicious = report.redFlags.length + report.yellowFlags.length;
  const currentList = activeTab === 'red' ? report.redFlags : report.yellowFlags;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Báo cáo Rà soát Sao chép</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Đã quét <strong>{report.checkedPairs}</strong> cặp bài •{' '}
                <span className="text-red-600 font-semibold">{report.redFlags.length} cờ đỏ</span>
                {' · '}
                <span className="text-amber-600 font-semibold">{report.yellowFlags.length} cờ vàng</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty state */}
        {totalSuspicious === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Shield className="w-12 h-12 text-emerald-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">Không phát hiện sao chép</p>
            <p className="text-xs text-slate-400 mt-1">
              Tất cả {report.checkedPairs} cặp bài đã được kiểm tra và không có dấu hiệu đáng ngờ.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 flex-shrink-0">
              <TabButton
                active={activeTab === 'red'}
                onClick={() => setActiveTab('red')}
                count={report.redFlags.length}
                color="red"
                label="Cờ Đỏ — Lỗi sai chung"
              />
              <TabButton
                active={activeTab === 'yellow'}
                onClick={() => setActiveTab('yellow')}
                count={report.yellowFlags.length}
                color="yellow"
                label="Cờ Vàng — Trùng lặp thông thường"
              />
            </div>

            {/* Pair list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Shield className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Không có cặp nào trong danh sách này.</p>
                </div>
              ) : (
                currentList.map(pair => (
                  <PairCard key={`${pair.studentAId}-${pair.studentBId}`} pair={pair} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function TabButton({
  active, onClick, count, color, label,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  color: 'red' | 'yellow';
  label: string;
}) {
  const dotCls = color === 'red' ? 'bg-red-400' : 'bg-amber-400';
  const countCls = color === 'red'
    ? 'bg-red-50 text-red-600 border-red-200'
    : 'bg-amber-50 text-amber-600 border-amber-200';
  const activeBorderCls = color === 'red' ? 'border-red-500' : 'border-amber-500';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
        active
          ? `text-slate-800 ${activeBorderCls}`
          : 'text-slate-500 border-transparent hover:text-slate-700'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${dotCls}`} />
      {label}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${countCls}`}>
        {count}
      </span>
    </button>
  );
}
