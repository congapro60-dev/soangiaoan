import { useEffect, useState } from 'react';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { LiveLessonRichText } from './LiveLessonRichText';

export type TvLiveDefinition = Pick<LiveLessonDefinition, 'title' | 'tvScreens'>;

export interface TvListenerState { publicState: LivePublicState; publicStateError: string | null; statsError: string | null; }

export const getTvListenerNotice = ({ publicState, publicStateError, statsError }: TvListenerState) => {
  if (publicState.status === 'closed') return { tone: 'warning' as const, message: 'Phiên đã đóng. TV không tiếp tục đọc dữ liệu công khai.' };
  if (publicStateError) return { tone: 'error' as const, message: 'Mất kết nối trạng thái công khai. Đang giữ màn hình cuối; phiên có thể đã đóng hoặc hết hạn.' };
  if (publicState.showStats && statsError) return { tone: 'error' as const, message: 'Mất kết nối thống kê công khai. Đang giữ số liệu cuối đã nhận.' };
  return null;
};

export const shouldSubscribeToLivePublicStats = (publicState: Pick<LivePublicState, 'showStats'>) => publicState.showStats;

export const getTvPresentation = (definition: TvLiveDefinition, state: LivePublicState | null, stats: LivePublicStats | null) => ({ screen: state ? definition.tvScreens.find(screen => screen.id === state.tvScreenId) ?? null : null, stats: state?.showStats ? stats : null });

export interface TvStatsItem { label: string; value: number; }

export const getTvStatsItems = (stats: LivePublicStats): TvStatsItem[] => [
  { label: 'Tham gia', value: stats.participantCount },
  { label: 'Đã gửi', value: stats.submittedCount },
  { label: 'Tuyến M', value: stats.routeCounts.M },
  { label: 'Tuyến S', value: stats.routeCounts.S },
  { label: 'Tuyến C', value: stats.routeCounts.C },
];

const MAX_STAT_CARDS = 4;

export const getStatCards = (stats: LivePublicStats): Array<{ label: string; value: number; accent?: boolean }> => {
  const cards: Array<{ label: string; value: number; accent?: boolean }> = [
    { label: 'Tham gia', value: stats.participantCount },
    { label: 'Đã gửi', value: stats.submittedCount },
  ];
  const routeEntries = Object.entries(stats.routeCounts);
  for (const [route, count] of routeEntries) {
    if (cards.length >= MAX_STAT_CARDS) break;
    if (count === 0) continue;
    cards.push({ label: `Tuyến ${route}`, value: count, accent: true });
  }
  return cards;
};

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
  const statsItems = presentation.stats ? getTvStatsItems(presentation.stats) : null;
  const listenerNotice = getTvListenerNotice({ publicState, publicStateError, statsError });
  return (
    <main className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-black text-white">
      <div className="mx-auto flex h-[100dvh] min-h-[100dvh] max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 px-[clamp(1rem,2vw,2.5rem)] py-[clamp(0.75rem,1.8vh,2rem)] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[clamp(0.55rem,0.9vw,0.8rem)] font-black uppercase tracking-[0.2em] text-cyan-300 sm:tracking-[0.3em]">SmartPlan · Live classroom</p>
            <h1 className="mt-1 truncate text-[clamp(1.4rem,3.2vw,3.5rem)] font-black leading-tight">{definition.title}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-400/50 px-3 py-1.5 text-[clamp(0.6rem,1vw,0.85rem)] font-black uppercase text-emerald-300">{publicState.status}</span>
        </header>

        {listenerNotice && <div className="mt-[clamp(0.5rem,1vh,1rem)] shrink-0"><LiveLessonStatus tone={listenerNotice.tone}>{listenerNotice.message}</LiveLessonStatus></div>}
        {!screen && <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-center text-[clamp(1.25rem,3vw,2.5rem)] font-black text-slate-400">Đang chờ màn hình công khai…</p></div>}
        {screen && <section className="min-h-0 flex-1 overflow-hidden py-[clamp(0.5rem,1.5vh,1.5rem)]"><div className="flex h-full min-h-0 flex-col justify-center"><p className="text-[clamp(0.75rem,1.3vw,1.25rem)] font-black uppercase tracking-[0.14em] text-cyan-300">{screen.label}</p><h2 className="mt-2 text-[clamp(2rem,6vw,6rem)] font-black leading-[0.98]">{screen.title}</h2><LiveLessonRichText text={screen.body} className="mt-3 max-w-5xl text-[clamp(1rem,2.5vw,2.5rem)] font-semibold leading-[1.2] text-slate-200" />{screen.action && <p className="mt-3 text-[clamp(1rem,2.2vw,2.25rem)] font-black leading-tight text-amber-300">{screen.action}</p>}</div></section>}
        {statsItems && <footer className="grid shrink-0 grid-cols-5 gap-[clamp(0.35rem,1vw,1rem)]">{statsItems.map((item, index) => <div key={item.label} className={`min-w-0 rounded-xl p-[clamp(0.45rem,1vw,1rem)] ${index < 2 ? 'bg-white/10' : 'bg-cyan-400/15'}`}><p className={`truncate whitespace-nowrap text-[clamp(0.5rem,1vw,0.85rem)] font-black uppercase ${index < 2 ? 'text-slate-400' : 'text-cyan-300'}`}>{item.label}</p><p className="mt-1 text-[clamp(1.4rem,3.5vw,3rem)] font-black leading-none">{item.value}</p></div>)}</footer>}
        {!presentation.stats && publicState.showStats && <p className="mt-[clamp(0.35rem,0.8vh,0.75rem)] shrink-0 text-center text-[clamp(0.75rem,1.3vw,1.1rem)] font-bold text-slate-400">Đang chờ thống kê tổng hợp…</p>}
      </div>
    </main>
  );
};
