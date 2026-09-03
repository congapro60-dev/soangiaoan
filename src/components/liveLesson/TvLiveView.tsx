import { useEffect, useRef, useState } from 'react';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats, LiveSessionStatus } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { LiveLessonRichText } from './LiveLessonRichText';
import { lookupTvMedia, type TvMediaEntry } from '../../lib/liveLesson/v4/mediaManifest';

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

export interface TvMediaPlaybackState {
  media: TvMediaEntry | null;
  shouldPlay: boolean;
  showPosterFallback: boolean;
}

export const getTvMediaPlaybackState = ({
  definitionKey,
  screenId,
  status,
  mediaError,
}: {
  definitionKey: string | undefined;
  screenId: string;
  status: LiveSessionStatus;
  mediaError: boolean;
}): TvMediaPlaybackState => {
  const media = (screenId === 'S1' && definitionKey) ? lookupTvMedia(definitionKey, screenId) : null;
  if (!media) return { media: null, shouldPlay: false, showPosterFallback: false };
  const shouldPlay = status === 'running' && !mediaError;
  const showPosterFallback = mediaError || status === 'paused' || status === 'closed';
  return { media, shouldPlay, showPosterFallback };
};

export interface TvLiveViewProps { definition: TvLiveDefinition; sessionId: string; publicState: LivePublicState; publicStateError?: string | null; definitionKey?: string; }

export const TvLiveView = ({ definition, sessionId, publicState, publicStateError = null, definitionKey }: TvLiveViewProps) => {
  const [stats, setStats] = useState<LivePublicStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);

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

  const playbackState = getTvMediaPlaybackState({
    definitionKey,
    screenId: screen?.id ?? '',
    status: publicState.status,
    mediaError,
  });
  const { media, shouldPlay, showPosterFallback } = playbackState;

  useEffect(() => {
    setMediaError(false);
  }, [media?.videoSrc, screen?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media) return;
    if (shouldPlay) {
      video.play().catch(() => { setMediaError(true); });
    } else {
      video.pause();
    }
  }, [media, shouldPlay]);

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
        {screen && (
          <section className="min-h-0 flex-1 overflow-hidden py-[clamp(0.5rem,1.5vh,1.5rem)]">
            <div className="flex h-full min-h-0 flex-col">
              <p className="shrink-0 text-[clamp(0.75rem,1.3vw,1.25rem)] font-black uppercase tracking-[0.14em] text-cyan-300">{screen.label}</p>
              <h2 className={`mt-2 shrink-0 font-black leading-[0.98] ${media ? 'text-[clamp(1.2rem,3.5vw,3.5rem)]' : 'text-[clamp(2rem,6vw,6rem)]'}`}>{screen.title}</h2>
              {media && (
                <div className="mt-3 flex shrink-0 justify-center">
                  {showPosterFallback ? (
                    <img src={media.posterSrc} alt={media.altText} className="max-h-[42vh] w-auto rounded-xl object-contain" />
                  ) : (
                    <video
                      ref={videoRef}
                      src={media.videoSrc}
                      poster={media.posterSrc}
                      muted
                      playsInline
                      onError={() => setMediaError(true)}
                      onLoadedData={() => { if (publicState.status === 'running' && videoRef.current) { videoRef.current.play().catch(() => setMediaError(true)); } }}
                      className="max-h-[42vh] w-auto rounded-xl object-contain"
                      aria-label={media.altText}
                    />
                  )}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <LiveLessonRichText text={screen.body} className={`mt-3 max-w-5xl font-semibold leading-[1.2] text-slate-200 ${media ? 'text-[clamp(0.85rem,1.8vw,1.6rem)]' : 'text-[clamp(1rem,2.5vw,2.5rem)]'}`} />
                {screen.action && <p className={`mt-3 font-black leading-tight text-amber-300 ${media ? 'text-[clamp(0.85rem,1.6vw,1.4rem)]' : 'text-[clamp(1rem,2.2vw,2.25rem)]'}`}>{screen.action}</p>}
              </div>
            </div>
          </section>
        )}
        {statsItems && <footer className="grid shrink-0 grid-cols-5 gap-[clamp(0.35rem,1vw,1rem)]">{statsItems.map((item, index) => <div key={item.label} className={`min-w-0 rounded-xl p-[clamp(0.45rem,1vw,1rem)] ${index < 2 ? 'bg-white/10' : 'bg-cyan-400/15'}`}><p className={`truncate whitespace-nowrap text-[clamp(0.5rem,1vw,0.85rem)] font-black uppercase ${index < 2 ? 'text-slate-400' : 'text-cyan-300'}`}>{item.label}</p><p className="mt-1 text-[clamp(1.4rem,3.5vw,3rem)] font-black leading-none">{item.value}</p></div>)}</footer>}
        {!presentation.stats && publicState.showStats && <p className="mt-[clamp(0.35rem,0.8vh,0.75rem)] shrink-0 text-center text-[clamp(0.75rem,1.3vw,1.1rem)] font-bold text-slate-400">Đang chờ thống kê tổng hợp…</p>}
      </div>
    </main>
  );
};
