"use client";

import React, { useState } from "react";
import { messageFor, teacherPost } from "./client";

export function AccommodationEditor({ examId, attempt, disabled, onSaved }: {
  examId: string;
  attempt: { id: string; name: string; extraMinutes: number; textScale: number; accommodationRevision: number };
  disabled: boolean;
  onSaved: () => void;
}) {
  const [extraMinutes, setExtraMinutes] = useState(String(attempt.extraMinutes));
  const [textScale, setTextScale] = useState(attempt.textScale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await teacherPost({ action: "accommodation", id: examId, attemptId: attempt.id, expectedRevision: attempt.accommodationRevision, extraMinutes: Number(extraMinutes), textScale });
      onSaved();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="exam-accommodation" aria-label={"Hỗ trợ riêng cho " + attempt.name}>
      <h3>Hỗ trợ riêng · {attempt.name}</h3>
      <p className="exam-note">Tổng phút thêm tính từ giờ kết thúc chung; chỉ áp dụng cho em này. Không mở lại bài đã nộp hoặc hết giờ.</p>
      <fieldset disabled={disabled || busy}>
        <label>Tổng phút thêm (0–60)<input className="lesson-input" type="number" min={0} max={60} step={1} value={extraMinutes} onChange={(e) => setExtraMinutes(e.target.value)} /></label>
        <label>Cỡ chữ<select className="lesson-input" value={textScale} onChange={(e) => setTextScale(Number(e.target.value))}>{[1, 1.25, 1.5, 1.75, 2].map((scale) => <option key={scale} value={scale}>{scale * 100}%</option>)}</select></label>
        <button className="lesson-button lesson-button-primary" type="button" disabled={extraMinutes.trim() === "" || !Number.isInteger(Number(extraMinutes)) || Number(extraMinutes) < 0 || Number(extraMinutes) > 60} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu hỗ trợ riêng"}</button>
      </fieldset>
      {error && <p className="exam-error" role="alert">{error}</p>}
    </section>
  );
}
