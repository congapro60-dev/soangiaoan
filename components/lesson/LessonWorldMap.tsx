"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { resolveThemeId } from "../../lib/product-content.js";

export interface LessonMapPeer {
  id: string;
  mascot: number;
  position: number;
  name?: string;
  own?: boolean;
}

export interface LessonMapProjection {
  totalPosition: number;
  peers: LessonMapPeer[];
}

/** What the die on the map is doing. The map draws it; the page decides when it rolls and what it shows. */
export interface LessonMapDice {
  phase: "idle" | "rolling" | "landed";
  face?: number | null;
  steps?: number | null;
  /** True when the pupil may roll now: the die then floats beside their mascot and can be tapped. */
  canRoll?: boolean;
  /** Changes with every roll so the map never mistakes two rolls of the same number for one. */
  seq?: number;
}

export interface LessonMapExamJourney {
  stations: { id: string; label: string; answered: boolean }[];
  selectedStationId?: string | null;
  phase: "submitted" | "review";
}

interface LessonWorldMapProps {
  map?: LessonMapProjection | null;
  /** Theme key from the approved game plan; the first world when the room has no plan yet. */
  themeKey?: string;
  /** Identifies the session so the map keeps its camera between updates. */
  sessionKey: string;
  height?: number;
  /** Extra class for the frame, for example to fill the whole screen. */
  className?: string;
  /** Pixels at the top of the map kept free for the page's own bar. */
  topInset?: number;
  dice?: LessonMapDice;
  /** The pupil tapped the die on the map. */
  onRollRequest?: () => void;
  /** The die has landed and its result has been shown. */
  onDiceDone?: () => void;
  examJourney?: {
    stations: { id: string; label: string; answered: boolean }[];
    selectedStationId?: string | null;
    phase: 'submitted' | 'review';
  };
  onExamStationSelect?: (qid: string) => void;
  onPeerSelect?: (peerId: string) => void;
}

/**
 * The campaign map every pupil, the teacher and the TV look at: the original game's terrain,
 * mascots and gates, drawn by public/lesson-map.html and fed from the lesson session.
 */
export function LessonWorldMap({ map, themeKey, sessionKey, height, className, topInset = 0, dice, onRollRequest, onDiceDone, examJourney, onExamStationSelect, onPeerSelect }: LessonWorldMapProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const latest = useRef<{ payload: { map: LessonMapProjection; world: string; sessionKey: string; topInset: number; dice?: LessonMapDice; examJourney?: LessonMapExamJourney; peerSelection: boolean } } | null>(null);
  const handlers = useRef({ onRollRequest, onDiceDone, onExamStationSelect, onPeerSelect });
  useEffect(() => {
    handlers.current = { onRollRequest, onDiceDone, onExamStationSelect, onPeerSelect };
  });

  const world = resolveThemeId(themeKey || "modern") || "modern";

  const send = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || !readyRef.current || !latest.current) return;
    target.postMessage({ type: "lesson-map:update", payload: latest.current.payload }, window.location.origin);
  }, []);

  useEffect(() => {
    latest.current = map ? { payload: { map, world, sessionKey, topInset, dice, examJourney, peerSelection: typeof onPeerSelect === 'function' } } : null;
    send();
  }, [map, world, sessionKey, topInset, dice, examJourney, onPeerSelect, send]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const type = event.data?.type;
      if (type === "lesson-map:ready") {
        readyRef.current = true;
        send();
      } else if (type === "lesson-map:roll") handlers.current.onRollRequest?.();
      else if (type === "lesson-map:dice-done") handlers.current.onDiceDone?.();
      else if (type === "exam-map:select") {
        const qid = event.data?.payload?.qid;
        const journey = latest.current?.payload?.examJourney;
        if (typeof qid === "string" && journey?.phase === "review" && journey.stations.some(s => s.id === qid)) handlers.current.onExamStationSelect?.(qid);
      } else if (type === "lesson-map:peer") {
        const peerId = event.data?.payload?.peerId;
        if (handlers.current.onPeerSelect && typeof peerId === "string" && latest.current?.payload.map.peers.some(p => p.id === peerId)) handlers.current.onPeerSelect(peerId);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  if (!map) return null;

  return (
    <iframe
      ref={frameRef}
      src="/lesson-map.html"
      title="Bản đồ chiến dịch của lớp"
      className={`lesson-world-map-frame${className ? " " + className : ""}`}
      style={height ? { height } : undefined}
      allowFullScreen
    />
  );
}
