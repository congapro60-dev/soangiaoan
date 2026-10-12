"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LessonWorldMap, type LessonMapDice, type LessonMapProjection } from "./LessonWorldMap";

type RollResult = { ok: boolean; error?: string; die?: number };

interface LessonMapStageProps {
  map?: (LessonMapProjection & { gatePosition?: number; unitsPerActivity?: number }) | null;
  themeKey?: string;
  sessionKey: string;
  disabled: boolean;
  /** Called when the mascot reaches the gate of the current activity: time to open its task. */
  onArrive?: () => void;
  /** The primary button turns into "do the task" at the gate when this is given. */
  onOpenTask?: () => void;
  onGateSelect?: (activityId: string) => void;
  onSelectBranch?: (branch:'support'|'core'|'extension')=>void;
  onRoll: () => Promise<RollResult> | RollResult;
  /** Fill the whole screen: the map is the game, everything else floats over it. */
  fullscreen?: boolean;
  /** Pixels kept free at the top for the page's own bar. */
  topInset?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The campaign map with the dice played on it. The die is an object in the map itself (floating beside the
 * pupil's mascot, thrown onto the ground in front of it, showing its result there); this component only decides
 * when it rolls. One contextual button carries the main action. Dice move the mascot; they never gate learning.
 */
export function LessonMapStage({ map, themeKey, sessionKey, disabled, onArrive, onOpenTask, onGateSelect, onSelectBranch, onRoll, fullscreen = false, topInset = 0 }: LessonMapStageProps) {
  // While the die is in the air the map keeps its old picture; the mascot only walks once the die has landed.
  const [frozen, setFrozen] = useState<typeof map>(null);
  const shown = frozen ?? map ?? null;
  const [dice, setDice] = useState<{ phase: LessonMapDice["phase"]; face: number | null; steps: number | null; seq: number }>({ phase: "idle", face: null, steps: null, seq: 0 });
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const seq = useRef(0);
  const landed = useRef<(() => void) | null>(null);
  const previousAtGate = useRef<boolean | null>(null);

  const ownShown = shown?.peers.find((peer) => peer.own);
  const gatePosition = shown?.gatePosition ?? 0;
  const unitsPerActivity = shown?.unitsPerActivity ?? 8;
  const position = ownShown?.position ?? 0;
  const atGate = position >= gatePosition;
  const gateCount = Math.max(1, Math.ceil((shown?.totalPosition ?? unitsPerActivity) / unitsPerActivity));
  const gateNumber = Math.min(gateCount, Math.max(1, Math.ceil(gatePosition / unitsPerActivity)));
  const remaining = Math.max(0, gatePosition - position);
  const canRoll = Boolean(ownShown) && !disabled && !atGate && dice.phase === "idle";

  useEffect(() => {
    const before = previousAtGate.current;
    previousAtGate.current = atGate;
    if (before === false && atGate) onArrive?.();
  }, [atGate, onArrive]);

  const handleDiceDone = useCallback(() => {
    landed.current?.();
    landed.current = null;
  }, []);

  const roll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setFrozen(map ?? null);
    seq.current += 1;
    const mine = seq.current;
    setDice({ phase: "rolling", face: null, steps: null, seq: mine });
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const started = Date.now();
    try {
      const result = await onRoll();
      if (!result.ok || !result.die) {
        setError(result.error || "Chưa lắc được lúc này.");
        setDice({ phase: "idle", face: null, steps: null, seq: mine });
        setFrozen(null);
        return;
      }
      // Let the die be seen tumbling for a moment even when the answer comes back instantly.
      await sleep(reduced ? 0 : Math.max(0, 750 - (Date.now() - started)));
      setDice({ phase: "landed", face: result.die, steps: result.die, seq: mine });
      // Wait for the map to say the die has landed, but never longer than a safe limit.
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          landed.current = null;
          resolve();
        }, reduced ? 700 : 3400);
        landed.current = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      await sleep(reduced ? 250 : 1100); // let the pupil read the result before the mascot walks
      setDice({ phase: "idle", face: null, steps: null, seq: mine });
      setFrozen(null);
    } finally {
      busy.current = false;
    }
  }, [onRoll, map]);

  const diceForMap = useMemo<LessonMapDice>(() => ({ phase: dice.phase, face: dice.face, steps: dice.steps, seq: dice.seq, canRoll }), [dice, canRoll]);

  if (!map) return null;

  const useTask = atGate && Boolean(onOpenTask);
  const label = useTask ? "Làm nhiệm vụ" : atGate ? "Đã tới cổng" : dice.phase === "idle" ? "Lắc xúc xắc" : "Đang lắc...";
  const icon = useTask ? "📜" : "🎲";

  return (
    <div className={`lesson-map-stage${fullscreen ? " lesson-map-stage-full" : ""}`}>
      <LessonWorldMap
        onSelectBranch={disabled?undefined:onSelectBranch}
        map={shown}
        themeKey={themeKey}
        sessionKey={sessionKey}
        className={fullscreen ? "lesson-world-map-frame-full" : undefined}
        topInset={topInset}
        dice={diceForMap}
        onRollRequest={canRoll ? () => void roll() : undefined}
        onDiceDone={handleDiceDone}
      />

      {ownShown && (
        <div className="lesson-map-dock">
          <div className="lesson-map-hud" role="status">
            <span>
              ⛩ Cổng <strong>{gateNumber}</strong>/{gateCount}
            </span>
            <span>{atGate ? "Đã tới cổng" : `Còn ${remaining} bước`}</span>
          </div>
          <button
            type="button"
            className={`lesson-roll-fab${useTask ? " lesson-roll-fab-task" : ""}`}
            onClick={() => (useTask ? onOpenTask?.() : void roll())}
            disabled={useTask ? false : disabled || atGate || dice.phase !== "idle"}
            aria-label={useTask ? "Mở nhiệm vụ của cổng" : atGate ? "Linh vật đã tới cổng" : "Lắc xúc xắc"}
          >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        </div>
      )}

      {dice.phase !== "idle" && (
        <p className="lesson-visually-hidden" role="status" aria-live="polite">
          {dice.phase === "landed" && dice.steps ? `Xúc xắc ra ${dice.steps}. Linh vật đi ${dice.steps} bước.` : "Đang lắc xúc xắc."}
        </p>
      )}

      {error && (
        <p className="lesson-mascot-error lesson-map-error" role="alert">
          {error}
        </p>
      )}

      {ownShown && (
        <p className="lesson-map-caption">Xúc xắc chỉ giúp linh vật di chuyển; kết quả học tập do bài làm của em quyết định.</p>
      )}
    </div>
  );
}

export default LessonMapStage;
