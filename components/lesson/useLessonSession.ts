"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type LessonPassportCard = { objectives: Array<{ id: string; code: string; statement: string; status: "independent" | "supported" | "next" }>; nextStep: string; hints: number };

export type LessonRole = "teacher" | "student" | "presenter";

export interface ClockState {
  startedAt: number | null;
  pausedAt: number | null;
  activityStartedAt: number | null;
  activityDeadline: number | null;
  totalPausedMs: number;
  arenaPausedAt?: number | null;
}

export interface TimelineState {
  activityIndex: number;
  currentActivityId: string;
  currentPhase: string;
  locked: boolean;
}

export interface LessonProjection {
  id?: string;
  round?: number;
  revision?: number;
  mode?: "preview" | "live";
  status?: string;
  clock?: ClockState;
  timeline?: TimelineState;
  currentActivity?: {
    id?: string;
    phase?: string;
    minutes?: number;
    participation?: string;
    studentAction?: string;
  } | null;
  tasks?: Array<Record<string, unknown>>;
  package?: {
    activities?: Array<Record<string, unknown>>;
    tasks?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  roster?: Record<string, { id: string; name: string; deviceId: string | null; present: boolean }>;
  passports?: Record<string, Record<string, unknown>>;
  groups?: Record<string, Record<string, unknown>>;
  submissions?: unknown;
  openAssessments?: Record<string, {
    submissionId: string;
    learnerId: string;
    taskId: string;
    activityId: string;
    answer: unknown;
    status: string;
    createdAt: number;
    criteriaMet?: boolean;
    feedback?: string;
    nonMastery?: boolean;
  }>;
  branches?: Record<string, Record<string, string>>;
  drafts?: Record<string, Record<string, unknown>>;
  reveals?: Record<string, { revealed: boolean; revealedAt: number }>;
  diceTrack?: Record<string, unknown>;
  map?: { totalPosition: number; gatePosition?: number; unitsPerActivity?: number; peers: { id: string; mascot: number; position: number; name?: string; own?: boolean; chosen?: boolean }[] };
  gameWallets?: {
    learners?: Record<string, { earned: number; bonus?: number }>;
    groups?: Record<string, { earned: number; bonus?: number }>;
  };
  group?: {
    id: string;
    memberIds: string[];
    roles: Record<string, string>;
    contributions: Array<{ learnerId: string; taskId: string; text: string; at: number }>;
    products: Record<string, unknown>;
    selectionDeadline: number;
  } | null;
  branch?: string;
  wallet?: { earned: number; bonus: number };
  passport?: { name?: string; [key: string]: unknown };
  passportCard?: LessonPassportCard | null;
  [key: string]: unknown;
}

export interface UseLessonSessionOptions {
  sessionId: string | null;
  role: LessonRole;
  bearerToken?: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  onConflict?: (error: Error) => void;
}

export interface CommandResult {
  ok: boolean;
  code?: string;
  revision?: number;
  error?: string;
  result?: unknown;
  replay?: boolean;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function useLessonSession({
  sessionId,
  role,
  bearerToken = null,
  enabled = true,
  pollIntervalMs = 3000,
  onConflict,
}: UseLessonSessionOptions) {
  const [view, setView] = useState<LessonProjection | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const [serverNow, setServerNow] = useState<number>(0);
  const [clientClockOffset, setClientClockOffset] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const viewRef = useRef<LessonProjection | null>(null);
  const inflightRef = useRef<boolean>(false);
  const unmountedRef = useRef<boolean>(false);

  // Synchronize ref in effect, never during render
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const fetchSession = useCallback(async () => {
    if (!sessionId || !enabled || inflightRef.current) return;
    inflightRef.current = true;

    try {
      const url = new URL("/api/lesson-sessions", window.location.origin);
      url.searchParams.set("id", sessionId);
      if (role === "presenter") {
        url.searchParams.set("kind", "presenter");
      }

      const headers: Record<string, string> = {};
      if (bearerToken) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const errCode = typeof data.error === "string" ? data.error : `HTTP_${res.status}`;
        if (res.status === 403 || res.status === 404) {
          setError(
            errCode === "NOT_FOUND"
              ? "Phòng học không tồn tại hoặc đã kết thúc."
              : "Phiên kết nối không hợp lệ hoặc đã hết hạn."
          );
        } else {
          setError(`Lỗi tải dữ liệu: ${errCode}`);
        }
        return;
      }

      let data = (await res.json()) as {
        view?: LessonProjection;
        revision?: number;
        serverNow?: number;
      };
      const arena = data.view?.arena as {id?: string; phase?: string; settled?: boolean} | undefined;
      if (role === 'teacher' && data.view?.status === 'active' && arena?.id && arena.phase === 'done' && !arena.settled) {
        const tick = await fetch('/api/lesson-sessions', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({action: 'tick', id: sessionId, round: data.view.round, revision: data.revision, eventId: `arena-finish-${arena.id}-${data.revision}`})
        });
        if (tick.ok) data = await tick.json();
      }

      if (!unmountedRef.current && data.view) {
        setView(data.view);
        setRevision(data.revision ?? data.view.revision ?? 0);
        if (typeof data.serverNow === "number") {
          setServerNow(data.serverNow);
          setClientClockOffset(Date.now() - data.serverNow);
        }
        setError(null);
      }
    } catch (err: unknown) {
      if (!unmountedRef.current) {
        const msg = err instanceof Error ? err.message : "Mất kết nối với máy chủ.";
        setError(msg);
      }
    } finally {
      inflightRef.current = false;
      if (!unmountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [sessionId, role, bearerToken, enabled]);

  // Polling loop
  useEffect(() => {
    unmountedRef.current = false;
    let timer: NodeJS.Timeout;

    const run = async () => {
      await fetchSession();
      if (!unmountedRef.current && enabled && sessionId) {
        timer = setTimeout(() => {
          void run();
        }, pollIntervalMs);
      }
    };

    void run();

    return () => {
      unmountedRef.current = true;
      clearTimeout(timer);
    };
  }, [fetchSession, enabled, sessionId, pollIntervalMs]);

  // Command envelope dispatcher
  const dispatchCommand = useCallback(
    async (
      type: string,
      payload: Record<string, unknown> = {},
      targetActivityId?: string
    ): Promise<CommandResult> => {
      if (!sessionId) {
        return { ok: false, error: "Chưa chọn phiên làm việc." };
      }
      if (isSubmitting) {
        return { ok: false, error: "Đang có thao tác đang xử lý, vui lòng chờ." };
      }

      setIsSubmitting(true);
      setError(null);

      const currentView = viewRef.current;
      const currentRound = currentView?.round ?? 1;
      const currentRevision = currentView?.revision ?? revision ?? 0;
      const currentActId =
        targetActivityId ??
        currentView?.timeline?.currentActivityId ??
        currentView?.currentActivity?.id ??
        "";

      const eventId = `${type.toLowerCase()}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const body: {
        action: string;
        id: string;
        event: {
          eventId: string;
          type: string;
          round: number;
          revision: number;
          activityId?: string;
          payload: Record<string, unknown>;
        };
      } = {
        action: "event",
        id: sessionId,
        event: {
          eventId,
          type,
          round: currentRound,
          revision: currentRevision,
          payload,
        },
      };

      if (currentActId) {
        body.event.activityId = currentActId;
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (bearerToken) {
          headers["Authorization"] = `Bearer ${bearerToken}`;
        }

        const res = await fetch("/api/lesson-sessions", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          view?: LessonProjection;
          revision?: number;
          serverNow?: number;
          result?: { ok?: boolean; replay?: boolean; [key: string]: unknown };
        };

        if (!res.ok) {
          const code = data.error || `HTTP_${res.status}`;
          if (res.status === 409 || code.includes("CONFLICT") || code === "REVISION_MISMATCH") {
            const conflictErr = new Error("Dữ liệu trên máy chủ đã thay đổi. Đang làm mới...");
            onConflict?.(conflictErr);
            void fetchSession();
            return {
              ok: false,
              code: "CONFLICT",
              error: "Dữ liệu phòng vừa cập nhật. Vui lòng thử lại với trạng thái mới.",
            };
          }
          return { ok: false, code, error: data.error || "Thao tác thất bại." };
        }

        if (data.view) {
          setView(data.view);
        }
        if (typeof data.revision === "number") {
          setRevision(data.revision);
        }
        if (typeof data.serverNow === "number") {
          setServerNow(data.serverNow);
          setClientClockOffset(Date.now() - data.serverNow);
        }

        return {
          ok: Boolean(data.result?.ok ?? true),
          revision: data.revision,
          result: data.result,
          replay: data.result?.replay,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không thể gửi lệnh lên máy chủ.";
        return {
          ok: false,
          error: msg,
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, revision, isSubmitting, bearerToken, fetchSession, onConflict]
  );

  // Teacher Tick
  const dispatchTick = useCallback(async (): Promise<CommandResult> => {
    if (!sessionId) return { ok: false, error: "Thiếu session ID." };
    const currentView = viewRef.current;
    const currentRound = currentView?.round ?? 1;
    const currentRevision = currentView?.revision ?? revision ?? 0;
    const eventId = `tick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch("/api/lesson-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tick",
          id: sessionId,
          round: currentRound,
          revision: currentRevision,
          eventId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        view?: LessonProjection;
        revision?: number;
        result?: unknown;
      };
      if (!res.ok) {
        return { ok: false, error: data.error || "Tick thất bại." };
      }
      if (data.view) setView(data.view);
      if (typeof data.revision === "number") setRevision(data.revision);
      return { ok: true, result: data.result };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tick thất bại.";
      return { ok: false, error: msg };
    }
  }, [sessionId, revision]);

  // Rotate Presenter Token (Teacher only)
  const rotatePresenterToken = useCallback(async (): Promise<{ ok: boolean; presenterToken?: string; error?: string }> => {
    if (!sessionId) return { ok: false, error: "Thiếu session ID." };
    const currentRevision = viewRef.current?.revision ?? revision ?? 0;
    const requestId = `req-rot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch("/api/lesson-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rotate-presenter",
          id: sessionId,
          revision: currentRevision,
          requestId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        presenterToken?: string;
        revision?: number;
      };
      if (!res.ok) {
        return { ok: false, error: data.error || "Không thể cấp lại token trình chiếu." };
      }
      if (typeof data.revision === "number") setRevision(data.revision);
      return { ok: true, presenterToken: data.presenterToken };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể cấp lại token.";
      return { ok: false, error: msg };
    }
  }, [sessionId, revision]);

  // Authoritative remaining time calculation
  const getRemainingMs = useCallback((): number | null => {
    if (!view?.clock) return null;
    const { activityDeadline, pausedAt } = view.clock;
    if (activityDeadline === null || activityDeadline === undefined) return null;
    const arena = view.arena as {phase?: string; resumeAt?: number} | undefined;
    if (view.clock.arenaPausedAt != null && arena) {
      if (arena.phase !== 'done') return Math.max(0, activityDeadline - view.clock.arenaPausedAt);
      const pause = Math.max(0, (arena.resumeAt || 0) - view.clock.arenaPausedAt);
      return Math.max(0, activityDeadline + pause - (Date.now() - clientClockOffset));
    }

    if (pausedAt !== null && pausedAt !== undefined) {
      return Math.max(0, activityDeadline - pausedAt);
    }

    const currentServerTime = Date.now() - clientClockOffset;
    return Math.max(0, activityDeadline - currentServerTime);
  }, [view, clientClockOffset]);

  return {
    view,
    setView,
    revision,
    serverNow,
    clientClockOffset,
    error,
    isPolling,
    isSubmitting,
    refresh: fetchSession,
    dispatchCommand,
    dispatchTick,
    rotatePresenterToken,
    getRemainingMs,
    formatDuration,
  };
}
