import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats, LiveSessionStatus } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { LiveLessonRichText } from './LiveLessonRichText';
import { lookupTvMedia, type TvMediaEntry } from '../../lib/liveLesson/v4/mediaManifest';
import { TvStatsPanel } from './TvStatsPanel';

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
  const media = definitionKey ? lookupTvMedia(definitionKey, screenId) : null;
  if (!media) return { media: null, shouldPlay: false, showPosterFallback: false };
  const shouldPlay = status === 'running' && !mediaError;
  const showPosterFallback = mediaError || status === 'paused' || status === 'closed';
  return { media, shouldPlay, showPosterFallback };
};

export interface TvLiveViewProps { definition: TvLiveDefinition; sessionId: string; publicState: LivePublicState; publicStateError?: string | null; definitionKey?: string; presenterControls?: ReactNode; }

export const TvLiveView = ({ definition, sessionId, publicState, publicStateError = null, definitionKey, presenterControls = null }: TvLiveViewProps) => {
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
  const listenerNotice = getTvListenerNotice({ publicState, publicStateError, statsError });

  const playbackState = getTvMediaPlaybackState({
    definitionKey,
    screenId: screen?.id ?? '',
    status: publicState.status,
    mediaError,
  });
  const { media, shouldPlay, showPosterFallback } = playbackState;

  // Cỡ chữ theo mật độ nội dung: màn hình nhiều chữ/nhiều dòng thu nhỏ để vừa 16:9.
  const bodyText = screen?.body ?? '';
  const dense = bodyText.length > 140 || bodyText.split('\n').filter(Boolean).length > 3;
  const titleSize = media ? 'text-[clamp(1.5rem,3.8vw,3.5rem)]' : dense ? 'text-[clamp(1.8rem,4.2vw,3.8rem)]' : 'text-[clamp(2rem,6vw,5.5rem)]';
  const bodySize = media ? 'text-[clamp(1rem,2vw,1.8rem)]' : dense ? 'text-[clamp(1.2rem,2.35vw,2.4rem)]' : 'text-[clamp(1.1rem,2.4vw,2.4rem)]';
  const actionSize = media ? 'text-[clamp(1rem,1.8vw,1.6rem)]' : dense ? 'text-[clamp(1.1rem,2vw,2rem)]' : 'text-[clamp(1.05rem,2.1vw,2rem)]';

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
      <style>{'@keyframes tvCueIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.tv-cue-stage{animation:tvCueIn .28s ease-out}@media (prefers-reduced-motion: reduce){.tv-cue-stage{animation:none}}'}</style>
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
          <section key={screen.id} className="tv-cue-stage min-h-0 flex-1 overflow-hidden py-[clamp(0.5rem,1.5vh,1.5rem)]">
            <div className="flex h-full min-h-0 flex-col">
              <p className="shrink-0 text-[clamp(0.75rem,1.3vw,1.25rem)] font-black uppercase tracking-[0.14em] text-cyan-300">{screen.label}</p>
              <h2 className={`mt-2 shrink-0 font-black leading-[0.98] ${titleSize}`}>{screen.title}</h2>
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
              <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
                <LiveLessonRichText text={screen.body} className={`mt-3 max-w-5xl font-semibold leading-[1.2] text-slate-200 ${bodySize}`} />
                {screen.action && <p className={`mt-3 font-black leading-tight text-amber-300 ${actionSize}`}>{screen.action}</p>}
              </div>
            </div>
          </section>
        )}
        <div className="mt-[clamp(0.35rem,0.8vh,0.75rem)] shrink-0"><TvStatsPanel stats={presentation.stats} showStats={publicState.showStats} /></div>
      </div>
      {presenterControls}
    </main>
  );
};
