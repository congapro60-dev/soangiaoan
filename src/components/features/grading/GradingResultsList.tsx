import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Users, FileText, Loader2, User, Eye, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { GradingResult } from '../../../types';

export type FilterScore = 'all' | 'above8' | '5to8' | 'below5';

interface Props {
  results: GradingResult[];
  filterScore: FilterScore;
  setFilterScore: (f: FilterScore) => void;
  onView: (result: GradingResult) => void;
  onDelete: (result: GradingResult) => void;
  onRegrade?: (result: GradingResult) => void;
  onRename?: (result: GradingResult, newName: string) => void;
}

export const GradingResultsList = ({ results, filterScore, setFilterScore, onView, onDelete, onRegrade, onRename }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEdit = (res: GradingResult) => {
    setEditingId(res.id);
    setEditingName(res.studentName);
  };
  const commitEdit = (res: GradingResult) => {
    if (editingName.trim() && editingName !== res.studentName) onRename?.(res, editingName.trim());
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    if (filterScore === 'above8') return results.filter(r => r.status === 'completed' && r.score >= 8);
    if (filterScore === '5to8') return results.filter(r => r.status === 'completed' && r.score >= 5 && r.score < 8);
    if (filterScore === 'below5') return results.filter(r => r.status === 'completed' && r.score < 5);
    return results;
  }, [results, filterScore]);

  const FILTERS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'above8', label: '≥8' },
    { value: '5to8', label: '5–8' },
    { value: 'below5', label: '<5' },
  ] as const;

  return (
    <div className="flex-1 bg-white rounded-[32px] border border-slate-100 flex flex-col overflow-hidden shadow-sm min-h-0">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          Danh sách ({filtered.length}/{results.length})
        </h3>
        <div className="flex bg-slate-100 p-0.5 rounded-xl">
          {FILTERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterScore(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                filterScore === opt.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
            <FileText className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">Chưa có bài làm nào</p>
          </div>
        ) : (
          filtered.map(res => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-blue-200/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                  res.status === 'completed'
                    ? res.score >= 8 ? 'bg-emerald-50 text-emerald-600'
                      : res.score >= 5 ? 'bg-blue-50 text-blue-600'
                      : 'bg-red-50 text-red-600'
                    : res.status === 'error' ? 'bg-amber-50 text-amber-500'
                    : 'bg-slate-50 text-slate-400'
                }`}>
                  {res.status === 'processing'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : res.status === 'completed' ? res.score
                    : res.status === 'error' ? <AlertTriangle className="w-4 h-4" />
                    : <User className="w-4 h-4" />}
                </div>
                <div>
                  {editingId === res.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => commitEdit(res)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(res); if (e.key === 'Escape') setEditingId(null); }}
                      className="text-sm font-bold text-slate-800 bg-blue-50 border border-blue-300 rounded-lg px-2 py-0.5 outline-none w-40"
                    />
                  ) : (
                    <p
                      className="text-sm font-bold text-slate-800 cursor-text hover:text-blue-600 transition-colors"
                      title="Double-click để sửa tên"
                      onDoubleClick={() => startEdit(res)}
                    >{res.studentName}</p>
                  )}
                  <p className="text-[10px] text-slate-400">{res.fileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {res.status === 'completed' && (
                  <div className="text-right mr-1">
                    <div className="text-sm font-black text-slate-700">
                      {res.score}<span className="text-[10px] text-slate-400">/10</span>
                    </div>
                    <div className={`text-[9px] font-bold uppercase ${
                      res.score >= 8 ? 'text-emerald-500'
                        : res.score >= 6.5 ? 'text-blue-500'
                        : res.score >= 5 ? 'text-amber-500'
                        : 'text-red-500'
                    }`}>
                      {res.score >= 8 ? 'Giỏi' : res.score >= 6.5 ? 'Khá' : res.score >= 5 ? 'TB' : 'Yếu'}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => onView(res)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
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
          ))
        )}
      </div>
    </div>
  );
};
