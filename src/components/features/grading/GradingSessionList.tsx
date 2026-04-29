import { useState, useRef } from 'react';
import { History, Plus, Clock, Trash2, FolderOpen } from 'lucide-react';
import { GradingSession } from '../../../types';

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (pendingDeleteId === id) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingDeleteId(null);
      onDeleteSession(id);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingDeleteId(id);
      timerRef.current = setTimeout(() => setPendingDeleteId(null), 3000);
    }
  };

  const sessionStats = (s: GradingSession) => {
    const done = s.results.filter(r => r.status === 'completed');
    const avg = done.length
      ? (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(1)
      : '—';
    return { avg, count: s.results.length };
  };

  return (
    <div className="w-72 flex-shrink-0 bg-white rounded-[32px] border border-slate-100 flex flex-col overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-black text-slate-800">Lịch sử chấm</span>
        </div>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
        >
          <Plus className="w-3 h-3" /> Mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isNewMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
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
              className={`p-3 rounded-2xl border cursor-pointer transition-all group ${
                isSelected
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'
              }`}
              onClick={() => onSelectSession(session)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-xs font-bold truncate flex-1 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  📋 {session.title}
                </p>
                <button
                  onClick={e => handleDeleteClick(e, session.id)}
                  className={`p-1 rounded transition-all ${
                    pendingDeleteId === session.id
                      ? 'opacity-100 text-red-600 bg-red-50 text-[9px] font-bold px-1.5'
                      : 'opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600'
                  }`}
                >
                  {pendingDeleteId === session.id ? 'Xóa?' : <Trash2 className="w-3 h-3" />}
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
    </div>
  );
};
