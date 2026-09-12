import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LiveLessonDefinition, LiveLessonIntent, LivePublicState, LivePublicStats, LiveSessionStatus } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { LiveLessonRichText } from './LiveLessonRichText';
import { lookupTvMedia, type TvMediaEntry } from '../../lib/liveLesson/v4/mediaManifest';
import { TvStatsPanel } from './TvStatsPanel';
import './liveClassroom.css';

export type TvLiveDefinition = Pick<LiveLessonDefinition, 'title' | 'tvScreens'>;

/** Lịch cue rút gọn — chỉ dữ liệu công khai đủ để TV đếm giờ và vẽ thanh tiến trình. */
export interface TvCueTiming { id: string; tvScreenId: string; atSeconds: number; responseStepId?: string }

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

export interface TvPacing {
  index: number;
  total: number;
  plannedSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  overrun: boolean;
}

/**
 * Nhịp slide dùng mốc chạy và thời gian tích lũy công khai của phiên.
 * Khi tạm dừng, giữ thời gian đã dùng; bật thống kê không làm đổi mốc chạy.
 * Phiên cũ chưa có clock dùng updatedAt cho đến lần điều khiển tiếp theo.
 */
export const getTvPacing = ({
  cues,
  cueId,
  durationSeconds,
  anchorAt,
  now,
  running,
  accumulatedSeconds = 0,
}: {
  cues: TvCueTiming[];
  cueId: string;
  durationSeconds: number;
  anchorAt: number;
  now: number;
  running: boolean;
  accumulatedSeconds?: number;
}): TvPacing | null => {
  if (cues.length === 0) return null;
  const index = cues.findIndex(cue => cue.id === cueId);
  if (index < 0) return null;
  const start = cues[index].atSeconds;
  const end = cues[index + 1]?.atSeconds ?? durationSeconds;
  const plannedSeconds = Math.max(0, end - start);
  const elapsedSeconds = Math.floor(Math.max(0, accumulatedSeconds) + (running ? Math.max(0, (now - anchorAt) / 1000) : 0));
  const remainingSeconds = plannedSeconds - elapsedSeconds;
  return { index, total: cues.length, plannedSeconds, elapsedSeconds, remainingSeconds, overrun: remainingSeconds < 0 };
};

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(Math.abs(seconds)));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const STATUS_LABEL: Record<LiveSessionStatus, string> = {
  lobby: 'Chờ vào tiết',
  running: 'Đang học',
  paused: 'Tạm dừng',
  closed: 'Đã kết thúc',
};

export interface TvLiveViewProps {
  definition: TvLiveDefinition;
  sessionId: string;
  publicState: LivePublicState;
  publicStateError?: string | null;
  definitionKey?: string;
  presenterControls?: ReactNode;
  cueTimeline?: TvCueTiming[];
  durationSeconds?: number;
  intent?: LiveLessonIntent;
}

export const TvLiveView = ({ definition, sessionId, publicState, publicStateError = null, definitionKey, presenterControls = null, cueTimeline = [], durationSeconds = 0, intent }: TvLiveViewProps) => {
  const [stats, setStats] = useState<LivePublicStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldSubscribeToLivePublicStats(publicState)) {
      setStats(null);
      setStatsError(null);
      return undefined;
    }
    return subscribeToLivePublicStats(sessionId, nextStats => { setStats(nextStats); setStatsError(null); }, nextError => setStatsError(nextError.message));
  }, [publicState.showStats, sessionId]);

  // Nhịp 1 giây chỉ chạy khi tiết đang diễn ra; dừng thì không render lại vô ích.
  useEffect(() => {
    if (publicState.status !== 'running') return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [publicState.status, publicState.updatedAt]);

  const presentation = getTvPresentation(definition, publicState, stats);
  const activeStepId = cueTimeline.find(cue => cue.id === publicState.cueId)?.responseStepId;
  const currentStats = activeStepId && presentation.stats?.stepId === activeStepId ? presentation.stats : null;
  const screen = presentation.screen;
  const listenerNotice = getTvListenerNotice({ publicState, publicStateError, statsError });
  const pacing = getTvPacing({
    cues: cueTimeline,
    cueId: publicState.cueId,
    durationSeconds,
    anchorAt: publicState.cueStartedAt ?? publicState.updatedAt,
    accumulatedSeconds: publicState.cueElapsedSeconds ?? 0,
    now,
    running: publicState.status === 'running',
  });

  const playbackState = getTvMediaPlaybackState({
    definitionKey,
    screenId: screen?.id ?? '',
    status: publicState.status,
    mediaError,
  });
  const { media, shouldPlay, showPosterFallback } = playbackState;

  const bodyText = screen?.body ?? '';
  const dense = bodyText.length > 480 || bodyText.split('\n').filter(Boolean).length > 7;

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
    <main className="live-tv" data-density={dense ? 'dense' : 'normal'} data-media={Boolean(media)} data-controls={Boolean(presenterControls)} data-results={Boolean(publicState.showStats && activeStepId)}>
      <style>{'@keyframes tvCueIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.tv-cue-stage{animation:tvCueIn .28s ease-out}@media (prefers-reduced-motion: reduce){.tv-cue-stage{animation:none}}'}</style>
      <div className="tv-shell">
        <header className="tv-lesson-header">
          <div className="min-w-0">
            <p className="tv-lesson-brand">SmartPlan · Lớp học trực tiếp</p>
            <h1 className="tv-lesson-title">{definition.title}</h1>
          </div>
          <div className="tv-header-meta">
            {pacing && <span className="tv-step-counter">Chặng {pacing.index + 1}/{pacing.total}<small className="block font-normal">Kế hoạch {Math.floor(cueTimeline[pacing.index].atSeconds / 60)}–{Math.ceil((cueTimeline[pacing.index + 1]?.atSeconds ?? durationSeconds) / 60)}′ · tiết {Math.ceil(durationSeconds / 60)}′</small></span>}
            {pacing && (
              <span
                className={pacing.overrun ? 'tv-clock is-over' : 'tv-clock'}
                aria-label={pacing.overrun ? 'Đã quá thời gian dự kiến của hoạt động' : 'Thời gian còn lại của hoạt động'}
              >
                {pacing.overrun ? '+' : ''}{formatClock(pacing.remainingSeconds)}
              </span>
            )}
            <span className={`tv-status-pill is-${publicState.status}`}>{STATUS_LABEL[publicState.status]}</span>
          </div>
        </header>

        {pacing && (
          <div className="tv-progress-rail" role="presentation">
            {cueTimeline.map((cue, cueIndex) => (
              <span key={cue.id} className={`tv-progress-seg ${cueIndex < pacing.index ? 'is-done' : cueIndex === pacing.index ? 'is-current' : ''}`} />
            ))}
          </div>
        )}

        {listenerNotice && <div className="shrink-0"><LiveLessonStatus tone={listenerNotice.tone}>{listenerNotice.message}</LiveLessonStatus></div>}
        {!screen && <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-center text-[clamp(1.25rem,3vw,2.5rem)] font-black text-slate-400">Đang chờ màn hình công khai…</p></div>}
        <div className="tv-workspace">
        {screen && (
          <section key={screen.id} className="tv-cue-stage">
            <div className="tv-slide-layout">
              <p className="tv-slide-eyebrow">{screen.label}</p>
              <h2 className="tv-slide-title">{screen.title}</h2>
              {screen.action && (
                <div className="tv-action-strip">
                  <p className="tv-action-label">Cùng thực hiện</p>
                  <LiveLessonRichText text={screen.action} className="tv-action-copy" />
                </div>
              )}
              {media && (
                <div className="tv-media">
                  {showPosterFallback ? (
                    <img src={media.posterSrc} alt={media.altText} />
                  ) : (
                    <video
                      ref={videoRef}
                      src={media.videoSrc}
                      poster={media.posterSrc}
                      muted
                      playsInline
                      onError={() => setMediaError(true)}
                      onLoadedData={() => { if (publicState.status === 'running' && videoRef.current) { videoRef.current.play().catch(() => setMediaError(true)); } }}
                      aria-label={media.altText}
                    />
                  )}
                </div>
              )}
              <div className="tv-content-card">
                <LiveLessonRichText text={screen.body ?? ''} className="tv-slide-copy" />
              </div>
            </div>
          </section>
        )}
        {activeStepId && <div className="tv-stats-region"><TvStatsPanel key={`${sessionId}:${publicState.cueId}`} sessionId={sessionId} cueId={publicState.cueId} stepId={activeStepId} stats={currentStats} showStats={publicState.showStats} /></div>}
        </div>
        {intent && (
          <section className="tv-intent-frame" aria-label="Mục tiêu và tiêu chí thành công">
            <div className="tv-intent-col">
              <p className="tv-intent-tag">Mục tiêu chung</p>
              <p className="tv-intent-text">{intent.walt}</p>
              {intent.waltEn && <p className="tv-intent-en">{intent.waltEn}</p>}
            </div>
            <div className="tv-intent-col">
              <p className="tv-intent-tag">Bằng chứng thành công</p>
              <ol className="tv-intent-list">
                {intent.wilf.map((item, itemIndex) => <li key={item}>{itemIndex + 1}. {item}</li>)}
              </ol>
              {intent.wilfEn && intent.wilfEn.length > 0 && <p className="tv-intent-en">{intent.wilfEn.join(' · ')}</p>}
            </div>
          </section>
        )}
      </div>
      {presenterControls}
    </main>
  );
};
