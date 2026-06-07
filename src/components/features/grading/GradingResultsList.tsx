import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Users, FileText, Loader2, User, Eye, Trash2, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { GradingResult } from '../../../types';

export type FilterScore = 'all' | 'above7' | '5to7' | 'below5';

interface Props {
  results: GradingResult[];
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  onView: (result: GradingResult) => void;
  onDelete: (result: GradingResult) => void;
  onRegrade?: (result: GradingResult) => void;
  onRename?: (result: GradingResult, newName: string) => void;
  onCheckPlagiarism?: () => void;
  isCheckingPlagiarism?: boolean;
}

// Tỷ lệ điểm quy về thang 10
const ratio10 = (r: GradingResult) =>
  r.maxScore > 0 ? (r.score / r.maxScore) * 10 : r.score;

interface BadgeConfig {
  label: string;
  badgeCls: string;
  avatarCls: string;
  borderCls: string;
}

const getBadge = (r10: number): BadgeConfig => {
  if (r10 >= 7) return {
    label: 'Đạt',
    badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    avatarCls: 'bg-emerald-50 text-emerald-700',
    borderCls: 'border-l-emerald-400',
  };
  if (r10 >= 5) return {
    label: 'T.Bình',
    badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200',
    avatarCls: 'bg-amber-50 text-amber-700',
    borderCls: 'border-l-amber-400',
  };
  return {
    label: 'Chưa đạt',
    badgeCls: 'bg-red-50 text-red-700 border border-red-200',
    avatarCls: 'bg-red-50 text-red-700',
    borderCls: 'border-l-red-400',
  };
};

export const GradingResultsList = ({
  results, filterScore, setFilterScore, onView, onDelete, onRegrade, onRename,
  onCheckPlagiarism, isCheckingPlagiarism,
}: Props) => {
  const canCheckPlagiarism =
    !!onCheckPlagiarism &&
    results.length >= 2 &&
    results.filter(r => r.status === 'completed').length >= 2 &&
    results.every(r => r.status !== 'processing');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEdit = (res: GradingResult) => { setEditingId(res.id); setEditingName(res.studentName); };
  const commitEdit = (res: GradingResult) => {
    if (editingName.trim() && editingName !== res.studentName) onRename?.(res, editingName.trim());
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    if (filterScore === 'above7') return results.filter(r => r.status === 'completed' && ratio10(r) >= 7);
    if (filterScore === '5to7')   return results.filter(r => r.status === 'completed' && ratio10(r) >= 5 && ratio10(r) < 7);
    if (filterScore === 'below5') return results.filter(r => r.status === 'completed' && ratio10(r) < 5);
    return results;
  }, [results, filterScore]);

  const FILTERS = [
    { value: 'all',    label: 'Tất cả' },
    { value: 'above7', label: '≥ 7' },
    { value: '5to7',   label: '5 – 7' },
    { value: 'below5', label: '< 5' },
  ] as const;

  return (
    <div className="flex-1 bg-white border-t border-[#c0c7d3] flex flex-col overflow-hidden min-h-0">

      {/* Header */}
      <div className="px-6 py-4 border-b border-[#c0c7d3] bg-white flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-[#121c2c] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#3182ce]" />
            Danh sách ({filtered.length}/{results.length})
          </h3>
          <div className="flex gap-2">
            {FILTERS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterScore(opt.value)}
                 className={`px-3 py-1 rounded-full border text-[11px] font-bold transition-all ${
                  filterScore === opt.value
                    ? 'bg-[#e7eeff] text-[#005ea1] border-[#3182ce]/30'
                    : 'bg-white text-slate-500 border-[#c0c7d3] hover:bg-[#ebf8ff] hover:text-[#005ea1]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {canCheckPlagiarism && (
          <button
            onClick={onCheckPlagiarism}
            disabled={isCheckingPlagiarism}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#c0c7d3] bg-[#f9f9ff] text-slate-600 text-xs font-semibold hover:bg-[#ebf8ff] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isCheckingPlagiarism ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang phân tích dữ liệu...
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                Rà soát sao chép
              </>
            )}
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-white">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#c0c7d3] rounded-xl bg-[#f9f9ff]">
            <FileText className="w-12 h-12 text-[#3182ce]/30 mb-3" />
            <p className="text-sm font-bold text-slate-500">Chưa có bài làm nào</p>
            <p className="text-xs text-slate-400 mt-1">Tải lên file ảnh/PDF/DOCX bài làm học sinh để bắt đầu.</p>
          </div>
        ) : (
          filtered.map(res => {
            const r10   = ratio10(res);
            const badge = res.status === 'completed' ? getBadge(r10) : null;

            return (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3 bg-white rounded-xl border border-[#c0c7d3]/70 border-l-4 hover:border-[#3182ce]/40 hover:shadow-sm transition-all group ${
                  badge ? badge.borderCls : 'border-l-slate-200'
                }`}
              >
                {/* Left — avatar + name */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    res.status === 'completed' && badge
                      ? badge.avatarCls
                      : res.status === 'error'
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-slate-50 text-slate-400'
                  }`}>
                    {res.status === 'processing'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : res.status === 'completed'
                        ? res.score
                        : res.status === 'error'
                          ? <AlertTriangle className="w-4 h-4" />
                          : <User className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    {editingId === res.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => commitEdit(res)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(res);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                    className="text-sm font-bold text-[#121c2c] bg-[#ebf8ff] border border-[#3182ce]/40 rounded-lg px-2 py-0.5 outline-none w-40"
                      />
                    ) : (
                      <p
                         className="text-sm font-bold text-[#121c2c] cursor-text hover:text-[#005ea1] transition-colors truncate"
                        title="Double-click để sửa tên"
                        onDoubleClick={() => startEdit(res)}
                      >
                        {res.studentName}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 truncate">{res.fileName}</p>
                  </div>
                </div>

                {/* Right — score + badge + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {res.status === 'completed' && badge && (
                    <div className="flex flex-col items-end gap-1 mr-1">
                      {/* Score */}
                      <span className="text-sm font-black text-slate-700 leading-none">
                        {res.score}
                        <span className="text-[10px] font-normal text-slate-400">/{res.maxScore}</span>
                      </span>
                      {/* Classification badge */}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide ${badge.badgeCls}`}>
                        {badge.label}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => onView(res)}
                    className="p-2 bg-[#f9f9ff] text-slate-500 rounded-xl hover:bg-[#3182ce] hover:text-white transition-all"
                    title="Xem chi tiết"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {onRegrade && res.status !== 'processing' && (
                    <button
                      onClick={() => onRegrade(res)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-amber-50 hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100"
                      title={res.status === 'error' ? 'Chấm lại (lỗi lần trước)' : res.status === 'pending' ? 'Bắt đầu chấm bài này' : 'Chấm lại'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(res)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa bài này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
