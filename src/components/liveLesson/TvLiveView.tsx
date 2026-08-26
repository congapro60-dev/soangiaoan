import { useEffect, useState } from 'react';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';

export type TvLiveDefinition = Pick<LiveLessonDefinition, 'title' | 'tvScreens'>;

export interface TvListenerState { publicState: LivePublicState; publicStateError: string | null; statsError: string | null; }

export const getTvListenerNotice = ({ publicState, publicStateError, statsError }: TvListenerState) => {
  if (publicState.status === 'closed') return { tone: 'warning' as const, message: 'Phiên đã đóng. TV không tiếp tục đọc dữ liệu công khai.' };
  if (publicStateError) return { tone: 'error' as const, message: 'Mất kết nối trạng thái công khai. Đang giữ màn hình cuối; phiên có thể đã đóng hoặc hết hạn.' };
  if (statsError) return { tone: 'error' as const, message: 'Mất kết nối thống kê công khai. Đang giữ số liệu cuối đã nhận.' };
  return null;
};

export const shouldSubscribeToLivePublicStats = (publicState: Pick<LivePublicState, 'showStats'>) => publicState.showStats;

export const getTvPresentation = (definition: TvLiveDefinition, state: LivePublicState | null, stats: LivePublicStats | null) => ({ screen: state ? definition.tvScreens.find(screen => screen.id === state.tvScreenId) ?? null : null, stats: state?.showStats ? stats : null });

export interface TvLiveViewProps { definition: TvLiveDefinition; sessionId: string; publicState: LivePublicState; publicStateError?: string | null; }

export const TvLiveView = ({ definition, sessionId, publicState, publicStateError = null }: TvLiveViewProps) => {
  const [stats, setStats] = useState<LivePublicStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  useEffect(() => {
    if (!shouldSubscribeToLivePublicStats(publicState)) {
      setStats(null);
      setStatsError(null);
      return undefined;
    }
    return subscribeToLivePublicStats(sessionId, nextStats => { setStats(nextStats); setStatsError(null); }, nextError => setStatsError(nextError.message));
  }, [publicState, sessionId]);
  const presentation = getTvPresentation(definition, publicState, stats);
  const screen = presentation.screen;
  const listenerNotice = getTvListenerNotice({ publicState, publicStateError, statsError });
  return <main className="min-h-screen bg-black p-5 text-white sm:p-10"><div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col justify-between rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-2xl sm:p-14"><header className="flex items-center justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">SmartPlan · Live classroom</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">{definition.title}</h1></div><span className="rounded-full border border-emerald-400/50 px-4 py-2 text-sm font-black uppercase text-emerald-300">{publicState.status}</span></header>
    {listenerNotice && <LiveLessonStatus tone={listenerNotice.tone}>{listenerNotice.message}</LiveLessonStatus>}{!screen && <div className="flex flex-1 items-center justify-center"><p className="text-3xl font-black text-slate-400">Đang chờ màn hình công khai…</p></div>}{screen && <section className="flex flex-1 flex-col justify-center"><p className="text-xl font-black uppercase tracking-widest text-cyan-300">{screen.label}</p><h2 className="mt-5 text-5xl font-black leading-tight sm:text-8xl">{screen.title}</h2><p className="mt-8 max-w-5xl whitespace-pre-line text-2xl font-semibold leading-relaxed text-slate-200 sm:text-4xl">{screen.body}</p>{screen.action && <p className="mt-8 text-2xl font-black text-amber-300 sm:text-4xl">{screen.action}</p>}</section>}{presentation.stats && <footer className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm font-black uppercase text-slate-400">Tham gia</p><p className="mt-2 text-5xl font-black">{presentation.stats.participantCount}</p></div><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm font-black uppercase text-slate-400">Đã gửi</p><p className="mt-2 text-5xl font-black">{presentation.stats.submittedCount}</p></div>{Object.entries(presentation.stats.routeCounts).map(([route, count]) => <div key={route} className="rounded-2xl bg-cyan-400/15 p-5"><p className="text-sm font-black uppercase text-cyan-300">Tuyến {route}</p><p className="mt-2 text-5xl font-black">{count}</p></div>)}</footer>}{!presentation.stats && publicState.showStats && <p className="text-center text-lg font-bold text-slate-400">Đang chờ thống kê tổng hợp…</p>}</div></main>;
};
