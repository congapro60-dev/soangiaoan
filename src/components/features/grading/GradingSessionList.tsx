import { useState } from 'react';
import { History, Plus, Clock, Trash2, FolderOpen } from 'lucide-react';
import { GradingSession } from '../../../types';
import { ConfirmDialog } from '../../modals/ConfirmDialog';

interface Props {
  sessions: GradingSession[];
  selectedSessionId: string | null;
  isNewMode: boolean;
  masterFileCount: number;
  studentFileCount: number;
  onSelectSession: (session: GradingSession) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

export const GradingSessionList = ({
  sessions, selectedSessionId, isNewMode,
  masterFileCount, studentFileCount,
  onSelectSession, onDeleteSession, onNewSession,
}: Props) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessionStats = (s: GradingSession) => {
    const done = s.results.filter(r => r.status === 'completed');
    const avg = done.length
      ? (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(1)
      : '—';
    return { avg, count: s.results.length };
  };

  return (
    <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl border border-[#c0c7d3] flex flex-col overflow-hidden shadow-[0_4px_12px_rgba(49,130,206,0.08)]">
      <div className="p-6 border-b border-[#c0c7d3] flex items-center justify-between bg-[#f9f9ff]">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#3182ce]" />
          <span className="text-lg font-black text-[#121c2c]">Lịch sử chấm</span>
        </div>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#3182ce] text-white rounded-full text-xs font-bold hover:bg-[#2c5282] transition-all"
        >
          <Plus className="w-3 h-3" /> Mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {isNewMode && (
          <div className="p-3 bg-[#e7eeff] border border-[#3182ce]/20 rounded-xl">
            <p className="text-xs font-bold text-[#005ea1] flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Phiên chấm mới
            </p>
            <p className="text-[10px] text-blue-500 mt-0.5">
              {masterFileCount > 0
                ? `${masterFileCount} đề · ${studentFileCount} bài làm`
                : 'Chưa có file nào'}
            </p>
          </div>
        )}

        {sessions.length === 0 && !isNewMode && (
          <div className="flex flex-col items-center justify-center h-48 opacity-40">
            <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400 text-center">
              Chưa có phiên nào.<br />Tạo phiên mới để bắt đầu.
            </p>
          </div>
        )}

        {sessions.map(session => {
          const { avg, count } = sessionStats(session);
          const isSelected = selectedSessionId === session.id;
          return (
            <div
              key={session.id}
              className={`p-3 rounded-xl border cursor-pointer transition-all group ${
                isSelected
                  ? 'bg-[#e7eeff] border-[#3182ce]/30'
                  : 'bg-white border-[#c0c7d3]/70 hover:border-[#3182ce]/40 hover:bg-[#ebf8ff]'
              }`}
              onClick={() => onSelectSession(session)}
            >
              <div className="flex items-start justify-between gap-2">
                 <p className={`text-xs font-bold truncate flex-1 ${isSelected ? 'text-[#005ea1]' : 'text-slate-700'}`}>
                  📋 {session.title}
                </p>
                <button
                  onClick={e => { e.stopPropagation(); setDeletingId(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <span className="text-[10px] text-slate-400">{count} HS</span>
                <span className={`text-[10px] font-bold ${avg !== '—' && parseFloat(avg) >= 5 ? 'text-green-600' : 'text-red-500'}`}>
                  TB: {avg}đ
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Xóa phiên chấm này?"
        description="Dữ liệu điểm và nhận xét của tất cả học sinh sẽ bị xóa vĩnh viễn."
        onConfirm={() => { if (deletingId) onDeleteSession(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
