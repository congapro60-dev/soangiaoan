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
    const background:Array<{element:HTMLElement;inert:boolean}>=[];
    let branch:HTMLElement|null=panelRef.current?.parentElement||null;
    while(branch&&branch!==document.body){
      for(const sibling of Array.from(branch.parentElement?.children||[])){
        if(sibling!==branch&&sibling instanceof HTMLElement&&sibling.tagName!=="DIALOG"){
          background.push({element:sibling,inert:sibling.inert});sibling.inert=true;
        }
      }
      branch=branch.parentElement;
    }
    const onKey = (event: KeyboardEvent) => {
      if(document.querySelector("dialog[open]"))return;
      if (event.key === "Escape") {event.preventDefault();onClose();}
      if(event.key==="Tab"){
        const items=Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')||[]).filter(item=>item.getClientRects().length>0&&!item.closest('[hidden],[inert]'));
        const first=items[0],last=items.at(-1);
        if(!first){event.preventDefault();panelRef.current?.focus();}
        else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panelRef.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      for(const item of background)if(item.element.dataset.open!=="true")item.element.inert=item.inert;
      if(!document.querySelector("dialog[open]")){
        const target=(!returnFocus.current||returnFocus.current===document.body||returnFocus.current.isConnected===false)?document.querySelector<HTMLElement>("[data-encounter-trigger]"):returnFocus.current;
        target?.focus?.({ preventScroll: true });
      }
    };
  }, [open, onClose]);

  return (
    <div className={`lesson-encounter lesson-encounter-${variant}`} data-open={open ? "true" : "false"} aria-hidden={!open} inert={!open}>
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
