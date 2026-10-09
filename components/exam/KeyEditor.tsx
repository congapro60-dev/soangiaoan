"use client";

import React from "react";
import { ExamQuestion } from "./client";

/** Where the teacher sets the answer key of one question (the key is shown as a short, editable form). */
export function KeyEditor({ q, onChange }: { q: ExamQuestion; onChange: (patch: Partial<ExamQuestion>) => void }) {
  if (q.type === "mc") {
    const key = typeof q.key === "string" ? q.key : "";
    return (
      <div className="exam-key" role="radiogroup" aria-label="Đáp án đúng">
        <span className="exam-key-label">Đáp án</span>
        {(q.options || ["A", "B", "C", "D"]).map((letter) => (
          <button key={letter} type="button" role="radio" aria-checked={key === letter} className={"exam-key-btn" + (key === letter ? " is-on" : "")} onClick={() => onChange({ key: key === letter ? null : letter })}>
            {letter}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "tf") {
    const statements = q.statements || ["a", "b", "c", "d"];
    const key = Array.isArray(q.key) ? (q.key as Array<boolean | null>) : [];
    const set = (i: number, value: boolean) => {
      const next = statements.map((_, k) => (k === i ? value : key[k] ?? null));
      onChange({ key: next.every((v) => v === true || v === false) ? next : (next as unknown) });
    };
    return (
      <div className="exam-key">
        <span className="exam-key-label">Đáp án</span>
        {statements.map((letter, i) => (
          <span key={letter} className="exam-key-tf">
            <b>{letter})</b>
            <button type="button" aria-pressed={key[i] === true} className={"exam-key-btn" + (key[i] === true ? " is-on" : "")} onClick={() => set(i, true)}>Đ</button>
            <button type="button" aria-pressed={key[i] === false} className={"exam-key-btn" + (key[i] === false ? " is-off" : "")} onClick={() => set(i, false)}>S</button>
          </span>
        ))}
      </div>
    );
  }
  if (q.type === "short") {
    const accept = (q.key as { accept?: string[] } | null)?.accept || [];
    return (
      <label className="exam-key">
        <span className="exam-key-label">Đáp số</span>
        <input className="lesson-input" defaultValue={accept.join(" | ")} onBlur={(e) => { const list = e.target.value.split(/\s*[|;]\s*/).map((s) => s.trim()).filter(Boolean); onChange({ key: list.length ? { accept: list } : null }); }} placeholder="Ví dụ: 1,5 | 3/2 (nhiều cách viết, cách nhau bằng dấu |)" />
      </label>
    );
  }
  return (
    <label className="exam-key">
      <span className="exam-key-label">Thang chấm</span>
      <input className="lesson-input" defaultValue={q.rubric || ""} onBlur={(e) => onChange({ rubric: e.target.value })} placeholder="Ghi chú cách chấm (không bắt buộc). Tự luận do thầy/cô chấm sau khi nộp." />
    </label>
  );
}

export const keyReady = (q: ExamQuestion): boolean => {
  if (q.type === "essay") return true;
  if (q.type === "mc") return typeof q.key === "string" && q.key !== "";
  if (q.type === "tf") return Array.isArray(q.key) && q.key.length > 0 && q.key.every((v) => v === true || v === false);
  return Boolean((q.key as { accept?: string[] } | null)?.accept?.length);
};
