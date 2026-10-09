"use client";

import React, { useEffect, useRef } from "react";

interface LessonEncounterSheetProps {
  open: boolean;
  title: string;
  /** Small line above the title, for example the activity phase. */
  kicker?: string;
  onClose: () => void;
  /** Wider centered card for short pop-ups such as picking a mascot. */
  variant?: "sheet" | "center";
  children: React.ReactNode;
}

/**
 * The pop-up that carries a task, a group activity or the mascot picker over the full-screen map.
 * It stays mounted while closed so a half-typed answer is never lost, and it slides in and out
 * unless the pupil asked for reduced motion.
 */
export function LessonEncounterSheet({ open, title, kicker, onClose, variant = "sheet", children }: LessonEncounterSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <div className={`lesson-encounter lesson-encounter-${variant}`} data-open={open ? "true" : "false"} aria-hidden={!open}>
      <div className="lesson-encounter-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="lesson-encounter-panel"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label={title}
        tabIndex={-1}
      >
        <div className="lesson-encounter-grip" aria-hidden="true" />
        <header className="lesson-encounter-head">
          <div>
            {kicker && <span className="lesson-kicker">{kicker}</span>}
            <h2 className="lesson-encounter-title">{title}</h2>
          </div>
          <button type="button" className="lesson-button lesson-button-outline lesson-encounter-close" onClick={onClose} aria-label="Đóng và xem bản đồ">
            Xem bản đồ
          </button>
        </header>
        <div className="lesson-encounter-body">{children}</div>
      </div>
    </div>
  );
}

export default LessonEncounterSheet;
