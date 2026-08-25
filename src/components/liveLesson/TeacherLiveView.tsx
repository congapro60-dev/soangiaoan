import { useEffect, useMemo, useState } from 'react';
import type { LiveCue } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';
import type { LiveLessonDefinition, LiveLessonSession, LivePublicStats, LiveResponse } from '../../lib/liveLesson/types';
import { aggregateLiveResponses } from '../../lib/liveLesson/aggregate';
import { closeLiveLessonSession, publishLivePublicStats, subscribeToTeacherResponses, updateLiveLessonState } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';

export type CueDirection = 'previous' | 'next';
export type TeacherControl = 'running' | 'paused' | 'closed';

const findCue = (definition: LiveLessonDefinition, cueId: string): LiveCue => definition.cues.find(cue => cue.id === cueId) ?? definition.cues[0];

export const getCueNavigation = (definition: LiveLessonDefinition, cueId: string, direction: CueDirection) => {
  const index = Math.max(0, definition.cues.findIndex(cue => cue.id === cueId));
  const nextIndex = direction === 'next' ? Math.min(definition.cues.length - 1, index + 1) : Math.max(0, index - 1);
  const cue = definition.cues[nextIndex];
  return { cueId: cue.id, tvScreenId: cue.tvScreenId };
};

export const getTimerSnapshot = (definition: LiveLessonDefinition, cueId: string, nowMs?: number, status: LiveLessonSession['status'] = 'paused', anchorMs?: number) => {
  const cueSeconds = findCue(definition, cueId).atSeconds;
  const liveSeconds = nowMs !== undefined && status === 'running' && anchorMs !== undefined
    ? Math.floor(Math.max(0, nowMs - anchorMs) / 1000)
    : 0;
  const elapsedSeconds = Math.min(definition.durationSeconds, cueSeconds + liveSeconds);
  return { elapsedSeconds, remainingSeconds: Math.max(0, definition.durationSeconds - elapsedSeconds) };
};

export const buildTeacherStatePatch = (definition: LiveLessonDefinition, cueId: string, control: TeacherControl) => {
  if (control === 'closed') return null;
  if (control === 'paused') return { status: 'running' as const };
  const cue = findCue(definition, cueId);
  return { currentCueId: cue.id, currentTvScreenId: cue.tvScreenId };
};

const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export interface TeacherLiveViewProps { definition: LiveLessonDefinition; session: LiveLessonSession; onSessionChange: (session: LiveLessonSession) => void; }

export const TeacherLiveView = ({ definition, session, onSessionChange }: TeacherLiveViewProps) => {
  const [responses, setResponses] = useState<LiveResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setClock] = useState(0);
  const cue = findCue(definition, session.currentCueId);
  const timer = getTimerSnapshot(definition, session.currentCueId, Date.now(), session.status, session.updatedAt);
  const responseStepId = cue.responseStepId;
  const stats = useMemo<LivePublicStats | null>(() => responseStepId ? aggregateLiveResponses(responses, responseStepId) : null, [responses, responseStepId]);

  useEffect(() => { const timerId = window.setInterval(() => setClock(value => value + 1), 1000); return () => window.clearInterval(timerId); }, []);
  useEffect(() => {
    if (!responseStepId || session.status === 'closed') { setResponses([]); return undefined; }
    return subscribeToTeacherResponses(session.id, responseStepId, setResponses, nextError => setError(nextError.message));
  }, [responseStepId, session.id, session.status]);
  useEffect(() => {
    if (!stats || !session.publicStatsEnabled) return;
    void publishLivePublicStats(session.id, stats).catch(nextError => setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật thống kê công khai.'));
  }, [session.id, session.publicStatsEnabled, stats]);

  const applyPatch = async (patch: Parameters<typeof updateLiveLessonState>[1]) => {
    if (session.status === 'closed') return;
    try { await updateLiveLessonState(session.id, patch); onSessionChange({ ...session, ...patch, updatedAt: Date.now() }); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật phiên.'); }
  };
  const close = async () => {
    if (session.status === 'closed') return;
    try { await closeLiveLessonSession(session.id); onSessionChange({ ...session, status: 'closed', publicStateEnabled: false, publicStatsEnabled: false, updatedAt: Date.now() }); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể đóng phiên.'); }
  };
  const isClosed = session.status === 'closed';
  const index = definition.cues.findIndex(item => item.id === cue.id);
  const navigate = (direction: CueDirection) => applyPatch(getCueNavigation(definition, session.currentCueId, direction));

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6"><div className="mx-auto max-w-6xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 p-5 text-white"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Giáo viên · G10 pilot</p><h1 className="mt-1 text-2xl font-black">{session.title}</h1></div><div className="text-right"><p className="text-xs font-bold uppercase text-slate-400">Mốc timeline</p><p className="text-3xl font-black tabular-nums">{formatDuration(timer.elapsedSeconds)} <span className="text-base text-slate-400">/ còn {formatDuration(timer.remainingSeconds)}</span></p></div></header>
    {error && <LiveLessonStatus tone="error">Lỗi giáo viên: {error}</LiveLessonStatus>}{isClosed && <LiveLessonStatus tone="warning">Phiên đã đóng. Các nút điều khiển đã khóa.</LiveLessonStatus>}
    <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><article className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">{cue.id} · {cue.label}</p><h2 className="mt-1 text-2xl font-black">Cue hiện tại</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{session.status}</span></div><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs font-black uppercase text-indigo-700">GV nói/làm</p><p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{cue.teacher}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-700">HS trên thiết bị</p><p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{cue.student}</p></div><div className="rounded-xl bg-slate-900 p-4 text-white"><p className="text-xs font-black uppercase text-slate-300">Bảng lớn / bảng phụ</p><p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{cue.boardLarge}{'\n'}{cue.boardSide}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">Vở & minh chứng</p><p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{cue.notebook}{'\n'}{cue.observerEvidence}</p></div></div></article>
    <aside className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Điều khiển phiên</p><div className="grid grid-cols-2 gap-2"><button disabled={index <= 0 || isClosed} onClick={() => void navigate('previous')} className="rounded-xl border px-3 py-3 text-sm font-black disabled:opacity-40">← Trước</button><button disabled={index >= definition.cues.length - 1 || isClosed} onClick={() => void navigate('next')} className="rounded-xl border px-3 py-3 text-sm font-black disabled:opacity-40">Sau →</button></div><div className="grid gap-2"><button disabled={isClosed} onClick={() => void applyPatch({ status: session.status === 'running' ? 'paused' : 'running' })} className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-black text-white disabled:opacity-40">{session.status === 'running' ? 'Tạm dừng' : 'Bắt đầu / tiếp tục'}</button><button disabled={isClosed} onClick={() => void applyPatch({ publicStatsEnabled: !session.publicStatsEnabled })} className="rounded-xl border px-3 py-3 text-sm font-black disabled:opacity-40">{session.publicStatsEnabled ? 'Ẩn thống kê TV' : 'Hiện thống kê TV'}</button><button disabled={isClosed} onClick={() => void close()} className="rounded-xl bg-rose-600 px-3 py-3 text-sm font-black text-white disabled:opacity-40">Đóng phiên</button></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Bước phản hồi</p><p className="mt-1 font-black">{responseStepId ?? 'Không có'}</p><p className="mt-3 text-xs font-black uppercase text-slate-500">Đã gửi / tham gia</p><p className="mt-1 text-3xl font-black">{stats?.submittedCount ?? 0}</p></div></aside></section>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm" aria-label="Timeline cues">{definition.cues.map(item => <button key={item.id} type="button" onClick={() => void applyPatch({ currentCueId: item.id, currentTvScreenId: item.tvScreenId })} disabled={isClosed} className={`min-w-14 rounded-lg px-2 py-2 text-xs font-black ${item.id === cue.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'} disabled:opacity-40`}>{item.id}</button>)}</nav>
  </div></main>;
};
