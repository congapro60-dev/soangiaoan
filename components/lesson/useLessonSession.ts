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
  classEventPausedAt?: number | null;
}

export interface TimelineState {
  activityIndex: number;
  currentActivityId: string;
  currentPhase: string;
  locked: boolean;
}

export interface LessonProjection {
  roomCode?:string;
  worldTheme?:string;
  deviceMode?:"A"|"B"|"C";
  exploration?: import("./ExplorationPanel").ExplorationView;
  id?: string;
  learnerId?: string;
  learnerName?: string;
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
    phase?: string;
    roleDefinitions?: Array<{ id:string; label:string }>;
    proposal?: {hash:string;taskId:string;answer:unknown;votes:string[]};
    consent?: {approved:boolean; votes:number; required:number};
    dice?: {turnIndex:number};
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
  tutor?: import("./TutorPanel").TutorView;
  tutors?: {history:Array<{id:string;tutorId:string;recipientId:string;status:string}>};
  passportCard?: LessonPassportCard | null;
  lessonMode?: import("./LessonModePanel").LessonModeView;
  lessonModeError?: string | null;
  classEvent?: import("./ClassEventPanel").ClassEventView | null;
  practice?: import("./PracticePanel").PracticeView | null;
  revisitGates?: Array<{id: string; title: string}>;
  revisitEnabled?: boolean;
  aiPolicy?: "off"|"hints"|"check";
  integrityConfirmed?: boolean;
  lessonIntegrations?: string[];
  learningPolicyVersion?: number;
  valueReflection?: import("./ValueReflection").ValueReflectionData | null;
  storyCue?: string;
  gateStars?: Array<{ activityId: string; stars: number }>;
  levelInvite?: boolean;
  branchSwitchesLeft?: number;
  [key: string]: unknown;
}

export interface UseLessonSessionOptions {
  sessionId: string | null;
  role: LessonRole;
  bearerToken?: string | null;
  actingLearnerId?: string;
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
  actingLearnerId,
  enabled = true,
  pollIntervalMs = 3000,
  onConflict,
}: UseLessonSessionOptions) {
  const scopeKey = JSON.stringify([sessionId,role,bearerToken,actingLearnerId]);
  const [view, setViewState] = useState<LessonProjection | null>(null);
  const [viewKey,setViewKey] = useState("");
  const viewRef = useRef<LessonProjection | null>(null);
  const setView = useCallback((next: LessonProjection|null)=>{viewRef.current=next;setViewKey(scopeKey);setViewState(next);},[scopeKey]);
  const [revision, setRevision] = useState<number>(0);
  const [serverNow, setServerNow] = useState<number>(0);
  const [clientClockOffset, setClientClockOffset] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const inflightRef = useRef<boolean>(false);
  const unmountedRef = useRef<boolean>(false);
  const requestScope = useRef(0);

  useEffect(()=>{const scope=++requestScope.current;inflightRef.current=false;viewRef.current=null;Promise.resolve().then(()=>{if(scope!==requestScope.current)return;setView(null);setRevision(0);setError(null);setIsSubmitting(false);setIsPolling(false);});},[sessionId,actingLearnerId,bearerToken,role,setView]);
  // Synchronize ref in effect, never during render
  useEffect(() => {
    viewRef.current = viewKey === scopeKey ? view : null;
  }, [view,viewKey,scopeKey]);

  const fetchSession = useCallback(async () => {
    if (!sessionId || !enabled || inflightRef.current) return;
    inflightRef.current = true;
    const scope = requestScope.current;
    try {
      const url = new URL("/api/lesson-sessions", window.location.origin);
      url.searchParams.set("id", sessionId);
      if(actingLearnerId)url.searchParams.set("actingLearnerId",actingLearnerId);
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

      if(scope !== requestScope.current)return;
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if(scope !== requestScope.current)return;
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
      if(scope !== requestScope.current)return;
      const arena = data.view?.arena as {id?: string; phase?: string; settled?: boolean} | undefined;
      if (role === 'teacher' && data.view?.status === 'active' && ((arena?.id && arena.phase === 'done' && !arena.settled) || (data.view.classEvent?.status==='active' && data.view.classEvent.remainingMs<=0))) {
        const tick = await fetch('/api/lesson-sessions', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({action: 'tick', id: sessionId, round: data.view.round, revision: data.revision, eventId: `activity-event-finish-${arena?.id || data.view.classEvent?.id}-${data.revision}`})
        });
        if(scope !== requestScope.current)return;
        if (tick.ok) data = await tick.json();
      }

      if (!unmountedRef.current && scope === requestScope.current && data.view) {
        setView(data.view);
        setRevision(data.revision ?? data.view.revision ?? 0);
        if (typeof data.serverNow === "number") {
          setServerNow(data.serverNow);
          setClientClockOffset(Date.now() - data.serverNow);
        }
        setError(null);
      }
    } catch (err: unknown) {
      if (!unmountedRef.current && scope === requestScope.current) {
        const msg = err instanceof Error ? err.message : "Mất kết nối với máy chủ.";
        setError(msg);
      }
    } finally {
      if(scope === requestScope.current)inflightRef.current = false;
      if (!unmountedRef.current && scope === requestScope.current) {
        setIsPolling(false);
      }
    }
  }, [sessionId, role, bearerToken, actingLearnerId, enabled,setView]);

  // Polling loop
  useEffect(() => {
    unmountedRef.current = false;
    let timer: NodeJS.Timeout;
    let cancelled = false;

    const run = async () => {
      await fetchSession();
      if (!cancelled && !unmountedRef.current && enabled && sessionId) {
        timer = setTimeout(() => {
          void run();
        }, pollIntervalMs);
      }
    };

    void run();

    return () => {
      cancelled = true;
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

      const scope = requestScope.current;
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
        actingLearnerId?: string;
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
        ...(actingLearnerId ? { actingLearnerId } : {}),
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
          result?: { ok?: boolean; code?: string; replay?: boolean; [key: string]: unknown };
        };

        if(scope !== requestScope.current)return {ok:false,code:"STALE_DEVICE_VIEW"};
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

        if(scope !== requestScope.current)return {ok:false,code:"STALE_DEVICE_VIEW"};
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
          code: data.result?.code,
          revision: data.revision,
          result: data.result,
          replay: data.result?.replay,
        };
      } catch (err: unknown) {
        if(scope !== requestScope.current)return {ok:false,code:"STALE_DEVICE_VIEW"};
        const msg = err instanceof Error ? err.message : "Không thể gửi lệnh lên máy chủ.";
        return {
          ok: false,
          error: msg,
        };
      } finally {
        if(scope === requestScope.current)setIsSubmitting(false);
      }
    },
    [sessionId, revision, isSubmitting, bearerToken, actingLearnerId,fetchSession, onConflict,setView]
  );

  // Teacher Tick
  const dispatchTick = useCallback(async (): Promise<CommandResult> => {
    if (!sessionId) return { ok: false, error: "Thiếu session ID." };
    const scope=requestScope.current;
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
      if(scope !== requestScope.current)return {ok:false,code:"STALE_DEVICE_VIEW",error:"STALE_DEVICE_VIEW"};
      if (!res.ok) {
        return { ok: false, error: data.error || "Tick thất bại." };
      }
      if (data.view) setView(data.view);
      if (typeof data.revision === "number") setRevision(data.revision);
      return { ok: true, result: data.result };
    } catch (err: unknown) {
      if(scope !== requestScope.current)return {ok:false,error:"STALE_DEVICE_VIEW"};
      const msg = err instanceof Error ? err.message : "Tick thất bại.";
      return { ok: false, error: msg };
    }
  }, [sessionId, revision,setView]);

  // Rotate Presenter Token (Teacher only)
  const rotatePresenterToken = useCallback(async (): Promise<{ ok: boolean; presenterToken?: string; error?: string }> => {
    if (!sessionId) return { ok: false, error: "Thiếu session ID." };
    const scope=requestScope.current;
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
      if(scope !== requestScope.current)return {ok:false,error:"STALE_DEVICE_VIEW"};
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
    if(view.clock.classEventPausedAt!=null)return Math.max(0,activityDeadline-view.clock.classEventPausedAt);
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
    view: viewKey === scopeKey ? view : null,
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
