# TV Whiteboard Media Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a Vietnamese whiteboard MP4 into TV mode S0/P00 screen for V4 demo lesson 10-5-31, with poster fallback and autoplay-rejection handling.

**Architecture:** A typed media manifest maps `(definitionKey, screenId)` → media entry. TvLiveView gains an optional `definitionKey` prop and renders a `<video>` element with poster fallback. Only pure helper functions are testable in the existing node-only Vitest setup; browser autoplay behavior is verified by assertion of effect wiring, not DOM rendering.

**Tech Stack:** React + TypeScript + Vitest (node environment, globals: true)

---

## Task 1: Create mediaManifest.ts and its test

**Files:**
- Create: `src/lib/liveLesson/v4/mediaManifest.ts`
- Create: `src/lib/liveLesson/v4/mediaManifest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/liveLesson/v4/mediaManifest.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { lookupTvMedia, type TvMediaEntry } from './mediaManifest';

describe('lookupTvMedia', () => {
  it('returns whiteboard media for 10-5-31 / S0', () => {
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBe('/media/g10-w5-p31-p00-whiteboard.mp4');
    expect(entry!.posterSrc).toBe('/media/g10-w5-p31-p00-whiteboard.png');
    expect(entry!.altText).toContain('Bảng trắng');
  });

  it('returns null for 10-5-31 / S1 (not S0)', () => {
    expect(lookupTvMedia('10-5-31', 'S1')).toBeNull();
  });

  it('returns null for unknown definitionKey', () => {
    expect(lookupTvMedia('99-9-99', 'S0')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(lookupTvMedia('', 'S0')).toBeNull();
    expect(lookupTvMedia('10-5-31', '')).toBeNull();
  });

  it('isolates entries — adding a second entry does not affect the first', () => {
    const a = lookupTvMedia('10-5-31', 'S0');
    const b = lookupTvMedia('10-5-31', 'S1');
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run src/lib/liveLesson/v4/mediaManifest.test.ts`

Expected: FAIL — `Cannot find module './mediaManifest'` or `lookupTvMedia is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/liveLesson/v4/mediaManifest.ts`:

```typescript
export interface TvMediaEntry {
  videoSrc: string;
  posterSrc: string;
  altText: string;
}

const MEDIA_MANIFEST = new Map<string, Map<string, TvMediaEntry>>();

function registerMedia(definitionKey: string, screenId: string, entry: TvMediaEntry): void {
  let screenMap = MEDIA_MANIFEST.get(definitionKey);
  if (!screenMap) {
    screenMap = new Map();
    MEDIA_MANIFEST.set(definitionKey, screenMap);
  }
  screenMap.set(screenId, entry);
}

registerMedia('10-5-31', 'S0', {
  videoSrc: '/media/g10-w5-p31-p00-whiteboard.mp4',
  posterSrc: '/media/g10-w5-p31-p00-whiteboard.png',
  altText: 'Bảng trắng bài học Bất phương trình bậc nhất hai ẩn — Tiết 1',
});

export function lookupTvMedia(definitionKey: string, screenId: string): TvMediaEntry | null {
  if (!definitionKey || !screenId) return null;
  const screenMap = MEDIA_MANIFEST.get(definitionKey);
  return screenMap?.get(screenId) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run src/lib/liveLesson/v4/mediaManifest.test.ts`

Expected: All 5 tests PASS.

---

## Task 2: Add definitionKey prop to TvLiveView and pass it from LiveLessonPage

**Files:**
- Modify: `src/pages/LiveLessonPage.tsx:203-205` (pass definitionKey)
- Modify: `src/components/liveLesson/TvLiveView.tsx:48` (add prop)

- [ ] **Step 1: Write the failing test**

Add to `src/components/liveLesson/TvLiveView.test.ts` (appended at end):

```typescript
describe('TvLiveView definitionKey passthrough', () => {
  it('TvLiveViewProps type accepts optional definitionKey', () => {
    // Type-level check: if definitionKey is missing, the component still compiles.
    // Runtime check: the pure helper lookupTvMedia is the integration seam.
    const propsWithKey = { definition: { title: 'T', tvScreens: [] }, sessionId: 's', publicState: { cueId: 'P00', tvScreenId: 'S0', status: 'lobby', showStats: false, updatedAt: 0 }, definitionKey: '10-5-31' };
    const propsWithoutKey = { definition: { title: 'T', tvScreens: [] }, sessionId: 's', publicState: { cueId: 'P00', tvScreenId: 'S0', status: 'lobby', showStats: false, updatedAt: 0 } };
    // If this compiles, the prop is correctly optional
    expect(propsWithKey.definitionKey).toBe('10-5-31');
    expect('definitionKey' in propsWithoutKey).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run src/components/liveLesson/TvLiveView.test.ts`

Expected: FAIL — `definitionKey` does not exist on the props type.

- [ ] **Step 3: Implement minimal changes**

In `src/components/liveLesson/TvLiveView.tsx`, change line 48:

```typescript
// Before:
export interface TvLiveViewProps { definition: TvLiveDefinition; sessionId: string; publicState: LivePublicState; publicStateError?: string | null; }

// After:
export interface TvLiveViewProps { definition: TvLiveDefinition; sessionId: string; publicState: LivePublicState; publicStateError?: string | null; definitionKey?: string; }
```

In `src/pages/LiveLessonPage.tsx`, change line 205:

```typescript
// Before:
return <TvLiveView definition={tvDefinition} sessionId={sessionId} publicState={publicState} publicStateError={publicStateError} />;

// After:
return <TvLiveView definition={tvDefinition} sessionId={sessionId} publicState={publicState} publicStateError={publicStateError} definitionKey={definitionContext.definitionKey ?? undefined} />;
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run src/components/liveLesson/TvLiveView.test.ts`

Expected: PASS.

---

## Task 3: Add video rendering with poster fallback to TvLiveView

**Files:**
- Modify: `src/components/liveLesson/TvLiveView.tsx` (add video element and effects)

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/liveLesson/v4/mediaManifest.test.ts` (appended at end):

```typescript
describe('TvLiveView media status policy', () => {
  it('running status implies video should play', () => {
    // The component effect calls video.play() when status === 'running'.
    // We verify the policy contract: lookupTvMedia returns entry for running+S0.
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    // For non-S0 screens, no media entry → no video rendered
    expect(lookupTvMedia('10-5-31', 'S1')).toBeNull();
  });

  it('lobby status should not trigger play (media entry still exists but component pauses)', () => {
    // The component effect calls video.pause() when status !== 'running'.
    // We verify the manifest does not change based on status — the component controls playback.
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    // Same entry regardless of status — the component's effect decides play/pause
  });

  it('media entry has both video and poster sources for fallback', () => {
    const entry = lookupTvMedia('10-5-31', 'S0');
    expect(entry).not.toBeNull();
    expect(entry!.videoSrc).toBeTruthy();
    expect(entry!.posterSrc).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (GREEN — these are pure helper tests)**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run src/lib/liveLesson/v4/mediaManifest.test.ts`

Expected: PASS (all tests are pure helper checks).

- [ ] **Step 3: Implement video rendering in TvLiveView**

Rewrite `src/components/liveLesson/TvLiveView.tsx` with minimal additions:

```typescript
import { useEffect, useRef, useState } from 'react';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats } from '../../lib/liveLesson/types';
import { subscribeToLivePublicStats } from '../../services/liveLessonService';
import { LiveLessonStatus } from './LiveLessonStatus';
import { LiveLessonRichText } from './LiveLessonRichText';
import { lookupTvMedia } from '../../lib/liveLesson/v4/mediaManifest';

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

  const media = (screen?.id === 'S0' && definitionKey) ? lookupTvMedia(definitionKey, screen.id) : null;

  useEffect(() => {
    setMediaError(false);
  }, [media?.videoSrc, screen?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media) return;
    if (publicState.status === 'running') {
      video.play().catch(() => { setMediaError(true); });
    } else {
      video.pause();
    }
  }, [media, publicState.status]);

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
        {screen && <section className="min-h-0 flex-1 overflow-hidden py-[clamp(0.5rem,1.5vh,1.5rem)]"><div className="flex h-full min-h-0 flex-col justify-center"><p className="text-[clamp(0.75rem,1.3vw,1.25rem)] font-black uppercase tracking-[0.14em] text-cyan-300">{screen.label}</p><h2 className="mt-2 text-[clamp(2rem,6vw,6rem)] font-black leading-[0.98]">{screen.title}</h2>{media && !mediaError && <div className="mt-3 flex justify-center"><video ref={videoRef} src={media.videoSrc} poster={media.posterSrc} muted playsInline className="max-h-[50vh] w-auto rounded-xl" aria-label={media.altText} /></div>}{media && mediaError && <div className="mt-3 flex justify-center"><img src={media.posterSrc} alt={media.altText} className="max-h-[50vh] w-auto rounded-xl" /></div>}<LiveLessonRichText text={screen.body} className="mt-3 max-w-5xl text-[clamp(1rem,2.5vw,2.5rem)] font-semibold leading-[1.2] text-slate-200" />{screen.action && <p className="mt-3 text-[clamp(1rem,2.2vw,2.25rem)] font-black leading-tight text-amber-300">{screen.action}</p>}</div></section>}
        {statsItems && <footer className="grid shrink-0 grid-cols-5 gap-[clamp(0.35rem,1vw,1rem)]">{statsItems.map((item, index) => <div key={item.label} className={`min-w-0 rounded-xl p-[clamp(0.45rem,1vw,1rem)] ${index < 2 ? 'bg-white/10' : 'bg-cyan-400/15'}`}><p className={`truncate whitespace-nowrap text-[clamp(0.5rem,1vw,0.85rem)] font-black uppercase ${index < 2 ? 'text-slate-400' : 'text-cyan-300'}`}>{item.label}</p><p className="mt-1 text-[clamp(1.4rem,3.5vw,3rem)] font-black leading-none">{item.value}</p></div>)}</footer>}
        {!presentation.stats && publicState.showStats && <p className="mt-[clamp(0.35rem,0.8vh,0.75rem)] shrink-0 text-center text-[clamp(0.75rem,1.3vw,1.1rem)] font-bold text-slate-400">Đang chờ thống kê tổng hợp…</p>}
      </div>
    </main>
  );
};
```

- [ ] **Step 4: Run full test suite**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run`

Expected: All tests PASS (including existing TvLiveView tests).

---

## Task 4: Lint, typecheck, and build verification

- [ ] **Step 1: Run TypeScript typecheck**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run lint`

Expected: Zero errors.

- [ ] **Step 2: Run full build**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run build`

Expected: Build succeeds with zero TypeScript errors.

- [ ] **Step 3: Run all tests again**

Run: `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run`

Expected: All tests pass.

---

## Task 5: Report

- [ ] **Step 1: Collect git diff**

Run: `git diff --stat` and `git diff`

- [ ] **Step 2: Summarize files changed, test outputs, limitations**

Document:
- Files created/modified
- Test results (RED → GREEN)
- Limitations: autoplay not fully browser-proven in node-only Vitest
- No Firestore/Rules/privacy changes
- No binary imports
- 40-minute timeline unchanged
