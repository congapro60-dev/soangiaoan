"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MEDIA_CATALOG,
  MEDIA_SETTINGS_KEY,
  DEFAULT_MEDIA_SETTINGS,
  normalizeMediaSettings,
  readMediaSettings,
  mediaReaction,
  createMediaGate,
  mediaEvents,
} from "../../lib/media-catalog.js";

export const QUIET_PHASES = ["formation", "recheck", "reflection", "exit"] as const;
export type QuietPhase = (typeof QUIET_PHASES)[number];

export const BLOCKING_STATUSES = ["paused", "concluded", "waiting"] as const;

export interface LessonMediaSettings {
  master: boolean;
  sfx: boolean;
  music?: boolean;
  meme: boolean;
  effects: boolean;
  reducedMotion: boolean;
  volume: number;
}

export interface CanPlayLessonMediaParams {
  phase?: string | null;
  status?: string | null;
  locked?: boolean | null;
  handoff?: boolean | null;
  hidden?: boolean | null;
  settings?: Partial<LessonMediaSettings> | null;
  gesture?: boolean | null;
  isUnlocked?: boolean | null;
  channel?: "sound" | "meme" | "effects" | "text";
}

/**
 * Pure policy checker for whether media (sound, meme, effects, text) can play.
 * Never equates speed or game score with mastery.
 *
 * Rules:
 * - Hidden tab (document.hidden) immediately drops/blocks all media.
 * - Quiet phases ('formation', 'recheck', 'reflection', 'exit') block sound and meme.
 * - Teacher handoff, pause, concluded, waiting, or locked session status block sound and meme.
 * - Sound channel requires trusted user gesture (gesture / isUnlocked === true) and settings (master && sfx && volume > 0).
 * - Reduced motion disables visual pulses and effects.
 * - Experience / practice phases allow short accessible text and optional sfx after gesture.
 */
export function canPlayLessonMedia(
  paramsOrPhase: CanPlayLessonMediaParams | string | null | undefined,
  statusArg?: string | null,
  settingsArg?: Partial<LessonMediaSettings> | null,
  isUnlockedArg?: boolean | null,
  channelArg: "sound" | "meme" | "effects" | "text" = "sound",
  hiddenArg?: boolean | null
): boolean {
  let phase: string | null = null;
  let status: string | null = null;
  let locked = false;
  let handoff = false;
  let hidden = false;
  let settings: Partial<LessonMediaSettings> = DEFAULT_MEDIA_SETTINGS;
  let isUnlocked = false;
  let channel: "sound" | "meme" | "effects" | "text" = "sound";

  if (typeof paramsOrPhase === "object" && paramsOrPhase !== null) {
    phase = paramsOrPhase.phase ?? null;
    status = paramsOrPhase.status ?? null;
    locked = Boolean(paramsOrPhase.locked);
    handoff = Boolean(paramsOrPhase.handoff);
    hidden = Boolean(paramsOrPhase.hidden);
    settings = paramsOrPhase.settings ?? DEFAULT_MEDIA_SETTINGS;
    isUnlocked = Boolean(paramsOrPhase.gesture ?? paramsOrPhase.isUnlocked);
    channel = paramsOrPhase.channel ?? "sound";
  } else {
    phase = typeof paramsOrPhase === "string" ? paramsOrPhase : null;
    status = statusArg ?? null;
    settings = settingsArg ?? DEFAULT_MEDIA_SETTINGS;
    isUnlocked = Boolean(isUnlockedArg);
    channel = channelArg ?? "sound";
    hidden = Boolean(hiddenArg);
  }

  // Hidden tab stops/drops everything
  if (hidden) return false;

  const normalizedPhase = phase ? phase.toLowerCase().trim() : "";
  const isQuietPhase = Boolean(normalizedPhase && QUIET_PHASES.includes(normalizedPhase as QuietPhase));
  const isBlockedStatus =
    status === "paused" ||
    status === "concluded" ||
    status === "waiting" ||
    locked ||
    handoff;

  // Quiet phases and teacher pause/handoff/concluded strictly block sound, meme, and effects
  if (isQuietPhase || isBlockedStatus) {
    if (channel === "sound" || channel === "meme" || channel === "effects") {
      return false;
    }
    // Quiet phases and blocked statuses suppress text announcements
    if (channel === "text") {
      return false;
    }
  }

  const masterEnabled = settings.master !== false;

  if (channel === "sound") {
    if (!masterEnabled || settings.sfx === false) return false;
    if ((settings.volume ?? 70) <= 0) return false;
    // AudioContext requires explicit trusted gesture (no autoplay at load)
    if (!isUnlocked) return false;
    return true;
  }

  if (channel === "meme") {
    if (!masterEnabled || settings.meme === false) return false;
    return true;
  }

  if (channel === "effects") {
    if (!masterEnabled || settings.effects === false) return false;
    // Reduced motion strictly disables visual pulses
    if (settings.reducedMotion === true) return false;
    return true;
  }

  if (channel === "text") {
    // Experience and practice may show short accessible text
    return true;
  }

  return false;
}

export interface LessonMediaEvent {
  id: string;
  category: string;
  phase?: string;
  revision?: number;
  round?: number;
  at?: number;
}

export interface SingleLessonMediaEventParams {
  category: string;
  id?: string;
  phase?: string;
  revision?: number;
  round?: number;
  at?: number;
}

interface PartialTaskView {
  id?: string;
  openedHints?: unknown[];
  advertisedHints?: Array<{ id?: string; opened?: boolean }>;
}

interface PartialSubmissionView {
  submissionId?: string;
  taskId?: string;
  ok?: boolean;
  assessmentStatus?: string;
  at?: number;
}

export interface PartialLessonView {
  id?: string;
  round?: number;
  revision?: number;
  status?: string;
  timeline?: { activityIndex?: number; currentActivityId?: string; locked?: boolean } | null;
  currentActivity?: { phase?: string; [key: string]: unknown } | null;
  gamePlan?: { theme?: string; [key: string]: unknown } | null;
  submissions?: unknown;
  diceTrack?: { position?: number; rolls?: number; [key: string]: unknown } | null;
  tasks?: unknown;
  events?: Array<{ type?: string; id?: string }> | null;
  [key: string]: unknown;
}

/**
 * Pure model to create stable lesson media event(s).
 * - Can be called with a single event specification object: lessonMediaEvent({ category, id, phase, revision, round })
 * - Can be called with previous and next view snapshots to diff deterministically: lessonMediaEvent(prevView, nextView)
 * Never leaks private answers, steps, or source references.
 */
export function lessonMediaEvent(
  params: SingleLessonMediaEventParams
): LessonMediaEvent;
export function lessonMediaEvent(
  previousView: PartialLessonView | null | undefined,
  nextView: PartialLessonView | null | undefined,
  now?: number
): LessonMediaEvent[];
export function lessonMediaEvent(
  first: SingleLessonMediaEventParams | PartialLessonView | null | undefined,
  second?: PartialLessonView | null,
  now: number = Date.now()
): LessonMediaEvent | LessonMediaEvent[] {
  if (!first) {
    return second !== undefined ? [] : { id: `lesson:event:${now}`, category: "dice", at: now };
  }

  // 1. Single event specification call: { category, id, phase, revision, round }
  if ("category" in first && typeof (first as SingleLessonMediaEventParams).category === "string") {
    const p = first as SingleLessonMediaEventParams;
    const cat = p.category;
    const rev = p.revision ?? 1;
    const rnd = p.round ?? 1;
    const rawId = p.id || `${rnd}:${rev}`;
    const stableId = rawId.startsWith(`${cat}:`) ? rawId : `${cat}:${rawId}`;
    return {
      id: stableId,
      category: cat,
      phase: p.phase,
      revision: rev,
      round: rnd,
      at: p.at ?? now,
    };
  }

  // 2. Diff between previous snapshot (first) and next snapshot (second)
  const previousView = first as PartialLessonView;
  const nextView = second as PartialLessonView;

  if (!previousView || !nextView) return [];
  if (previousView.id !== nextView.id || previousView.round !== nextView.round) return [];

  const events: LessonMediaEvent[] = [];
  const prefix = `${nextView.id || "sess"}:${nextView.round || 1}:`;
  const currentPhase = nextView.currentActivity?.phase;
  const currentRev = nextView.revision ?? 1;
  const currentRnd = nextView.round ?? 1;

  // 2a. Dice rolls
  const prevRolls = (previousView.diceTrack as { rolls?: number } | null | undefined)?.rolls || 0;
  const nextRolls = (nextView.diceTrack as { rolls?: number } | null | undefined)?.rolls || 0;
  if (nextRolls > prevRolls) {
    events.push({
      id: `${prefix}dice:${nextRolls}`,
      category: "dice",
      phase: currentPhase,
      revision: currentRev,
      round: currentRnd,
      at: now,
    });
  }

  // 2b. Dice movement
  const prevPos = (previousView.diceTrack as { position?: number } | null | undefined)?.position || 0;
  const nextPos = (nextView.diceTrack as { position?: number } | null | undefined)?.position || 0;
  if (nextPos > prevPos) {
    events.push({
      id: `${prefix}move:${nextPos}`,
      category: "move",
      phase: currentPhase,
      revision: currentRev,
      round: currentRnd,
      at: now,
    });
  }

  // 2c. Submissions (only ok/wrong status is inspected; private answer is NEVER touched)
  const prevSubs = Array.isArray(previousView.submissions) ? (previousView.submissions as PartialSubmissionView[]) : [];
  const nextSubs = Array.isArray(nextView.submissions) ? (nextView.submissions as PartialSubmissionView[]) : [];
  const prevSubKeys = new Set(prevSubs
    .filter((submission) => submission.assessmentStatus !== "pending")
    .map((s) => `${s.submissionId || s.taskId}:${s.ok}`));

  for (const sub of nextSubs) {
    if (sub.assessmentStatus === "pending") continue;
    const key = `${sub.submissionId || sub.taskId}:${sub.ok}`;
    if (!prevSubKeys.has(key) && typeof sub.ok === "boolean") {
      events.push({
        id: `${prefix}sub:${sub.submissionId || sub.taskId}:${sub.ok ? "ok" : "err"}:${sub.at || currentRev}`,
        category: sub.ok ? "correct" : "wrong",
        phase: currentPhase,
        revision: currentRev,
        round: currentRnd,
        at: now,
      });
    }
  }

  // 2d. Hints opened
  const countHints = (tasks?: unknown) => {
    if (!Array.isArray(tasks)) return 0;
    return (tasks as PartialTaskView[]).reduce((sum, t) => {
      const openedAdv = (t.advertisedHints || []).filter((h) => h.opened).length;
      const openedDirect = (t.openedHints || []).length;
      return sum + Math.max(openedAdv, openedDirect);
    }, 0);
  };

  const prevHintCount = countHints(previousView.tasks);
  const nextHintCount = countHints(nextView.tasks);
  if (nextHintCount > prevHintCount) {
    events.push({
      id: `${prefix}hint:${nextHintCount}`,
      category: "hint",
      phase: currentPhase,
      revision: currentRev,
      round: currentRnd,
      at: now,
    });
  }

  // 2e. Timeline activity movement
  const prevAct = previousView.timeline?.activityIndex ?? -1;
  const nextAct = nextView.timeline?.activityIndex ?? -1;
  if (nextAct > prevAct && prevAct >= 0) {
    events.push({
      id: `${prefix}act:${nextAct}`,
      category: "move",
      phase: currentPhase,
      revision: currentRev,
      round: currentRnd,
      at: now,
    });
  }

  // 2f. Concluded status
  if (nextView.status === "concluded" && previousView.status !== "concluded") {
    events.push({
      id: `${prefix}finish:concluded`,
      category: "finish",
      phase: currentPhase,
      revision: currentRev,
      round: currentRnd,
      at: now,
    });
  }

  // 2g. Delegate to lib/media-catalog mediaEvents for explicit events safely if present
  if (Array.isArray(nextView.events) && nextView.events.length > 0) {
    try {
      const catalogEvts = mediaEvents(previousView, nextView, undefined, now);
      for (const ce of catalogEvts) {
        if (!events.some((e) => e.category === ce.category)) {
          events.push({
            id: ce.id,
            category: ce.category,
            phase: currentPhase,
            revision: currentRev,
            round: currentRnd,
            at: now,
          });
        }
      }
    } catch {
      // safe fallback
    }
  }

  // Deduplicate by category within same snapshot diff
  return events.filter((e, i, arr) => arr.findIndex((other) => other.category === e.category) === i);
}

function loadSafeSettings(): LessonMediaSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MEDIA_SETTINGS };
  }
  try {
    const osReduced = Boolean(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    const raw = localStorage.getItem(MEDIA_SETTINGS_KEY);
    return readMediaSettings(raw, osReduced) as LessonMediaSettings;
  } catch {
    return { ...DEFAULT_MEDIA_SETTINGS };
  }
}

function persistSafeSettings(settings: LessonMediaSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEDIA_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // safely ignore quota or security errors
  }
}

export interface ActiveMediaReaction {
  category: string;
  text: string;
  reaction: string;
  id: string;
}

export interface UseLessonMediaOptions {
  view?: PartialLessonView | null;
  role?: "student" | "presenter";
}

export interface UseLessonMediaReturn {
  settings: LessonMediaSettings;
  isUnlocked: boolean;
  unlockAudio: () => void;
  updateSettings: (partial: Partial<LessonMediaSettings>) => void;
  toggleMaster: () => void;
  activeReaction: ActiveMediaReaction | null;
  clearReaction: () => void;
  canPlay: (channel?: "sound" | "meme" | "effects" | "text") => boolean;
  triggerReaction: (category: string, explicitId?: string) => void;
}

/**
 * useLessonMedia hook
 * - No autoplay at load
 * - AudioContext only created/resumed after explicit trusted gesture ("Bật phản hồi" button)
 * - Safe localStorage persistence for master/sfx/meme/effects/reducedMotion/volume
 * - Hidden tab stops queue, closes sounds, and clears active reaction
 * - Deduplicates event ids
 * - Quiet phases and teacher pause/handoff block sound and meme
 * - Experience/practice allows short accessible text and optionally sound after gesture
 * - Reduced motion disables visual pulses
 * - Never equates speed/game score with mastery
 */
export function useLessonMedia({
  view,
}: UseLessonMediaOptions = {}): UseLessonMediaReturn {
  const [settings, setSettings] = useState<LessonMediaSettings>(loadSafeSettings);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activeReaction, setActiveReaction] = useState<ActiveMediaReaction | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gateRef = useRef(createMediaGate());
  const prevViewRef = useRef<PartialLessonView | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync settings with OS prefers-reduced-motion listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      setSettings((prev) => {
        const updated = normalizeMediaSettings(
          { ...prev, reducedMotion: e.matches },
          e.matches
        ) as LessonMediaSettings;
        persistSafeSettings(updated);
        return updated;
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Hidden tab stops queue and clears active reactions
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.hidden) {
        if (reactionTimerRef.current) {
          clearTimeout(reactionTimerRef.current);
          reactionTimerRef.current = null;
        }
        setActiveReaction(null);
        if (audioCtxRef.current && audioCtxRef.current.state === "running") {
          void audioCtxRef.current.suspend().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const clearReaction = useCallback(() => {
    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
    setActiveReaction(null);
  }, []);

  const updateSettings = useCallback((partial: Partial<LessonMediaSettings>) => {
    setSettings((prev) => {
      const updated = normalizeMediaSettings(
        { ...prev, ...partial },
        partial.reducedMotion ?? prev.reducedMotion
      ) as LessonMediaSettings;
      persistSafeSettings(updated);
      return updated;
    });
  }, []);

  const toggleMaster = useCallback(() => {
    updateSettings({ master: !settings.master });
  }, [settings.master, updateSettings]);

  // Explicit user gesture unlock via "Bật phản hồi" button
  const unlockAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      type AudioContextCtor = new () => AudioContext;
      const AudioClass: AudioContextCtor | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;

      if (!audioCtxRef.current && AudioClass) {
        audioCtxRef.current = new AudioClass();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
      setIsUnlocked(true);
      updateSettings({ master: true });
    } catch {
      // safe fallback
    }
  }, [updateSettings]);

  // CanPlay policy evaluator using current state
  const canPlay = useCallback(
    (channel: "sound" | "meme" | "effects" | "text" = "sound") => {
      const isHidden = typeof document !== "undefined" && document.hidden;
      return canPlayLessonMedia({
        phase: view?.currentActivity?.phase,
        status: view?.status,
        locked: view?.timeline?.locked,
        hidden: isHidden,
        settings,
        gesture: isUnlocked,
        isUnlocked,
        channel,
      });
    },
    [view, settings, isUnlocked]
  );

  // Synthesize category tone via Web Audio API without external audio assets
  const playTone = useCallback(
    (category: string) => {
      if (!isUnlocked || !audioCtxRef.current) return;
      if (!canPlay("sound")) return;

      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        const item = MEDIA_CATALOG[category];
        if (!item || !item.sound) return;

        const { notes, wave, duration } = item.sound;
        const vol = Math.max(0, Math.min(1, (settings.volume / 100) * 0.12));
        const startTime = ctx.currentTime;

        notes.forEach((freq: number, i: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = (wave as OscillatorType) || "sine";
          osc.frequency.setValueAtTime(freq, startTime + i * 0.04);

          gain.gain.setValueAtTime(vol, startTime + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + i * 0.04 + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime + i * 0.04);
          osc.stop(startTime + i * 0.04 + duration + 0.02);
        });
      } catch {
        // audio synthesis is safe and non-blocking
      }
    },
    [isUnlocked, canPlay, settings.volume]
  );

  // Trigger media reaction visually and optionally acoustically
  const triggerReaction = useCallback(
    (category: string, explicitId?: string) => {
      const eventId = explicitId || `${view?.id || "evt"}:${category}:${Date.now()}`;
      const isHidden = typeof document !== "undefined" && document.hidden;

      // Gate deduplication and hidden tab drop
      if (!gateRef.current.accept({ id: eventId, category }, isHidden)) {
        return;
      }

      const theme = view?.gamePlan?.theme || "modern";
      const reactionData = mediaReaction(category, theme);
      if (!reactionData) return;

      if (canPlay("text") || canPlay("meme")) {
        clearReaction();
        setActiveReaction({
          category,
          text: reactionData.text,
          reaction: reactionData.reaction,
          id: eventId,
        });

        if (typeof window !== "undefined") {
          reactionTimerRef.current = setTimeout(() => {
            setActiveReaction(null);
          }, 3200);
        }
      }

      if (canPlay("sound")) {
        playTone(category);
      }
    },
    [view?.id, view?.gamePlan?.theme, canPlay, clearReaction, playTone]
  );

  // Reactive diff when lesson view updates
  useEffect(() => {
    if (!view) return;
    if (prevViewRef.current) {
      const diffEvents = lessonMediaEvent(prevViewRef.current, view) as LessonMediaEvent[];
      for (const ev of diffEvents) {
        triggerReaction(ev.category, ev.id);
      }
    }
    prevViewRef.current = view;
  }, [view, triggerReaction]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    settings,
    isUnlocked,
    unlockAudio,
    updateSettings,
    toggleMaster,
    activeReaction,
    clearReaction,
    canPlay,
    triggerReaction,
  };
}
