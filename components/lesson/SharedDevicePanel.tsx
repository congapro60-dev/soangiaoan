"use client";

import React, { useState } from "react";

export function SharedDevicePanel({ members, actingLearnerId, onActingLearner, disabled = false }: {
  members: { learnerId: string; name: string }[];
  actingLearnerId?: string | null;
  onActingLearner: (learnerId: string) => void;
  disabled?: boolean;
}) {
  return <section className="lesson-card" style={{ padding: "1rem" }} aria-label="Chọn người đang dùng thiết bị nhóm">
    <h2>Ai đang làm bài?</h2>
    <p>Mỗi em bấm tên mình trước khi nhập câu trả lời.</p>
    <div role="group" aria-label="Thành viên trên thiết bị" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {members.map(member => <button key={member.learnerId} type="button" className="lesson-button lesson-button-outline" style={{ minHeight: 44 }}
        aria-pressed={actingLearnerId === member.learnerId} disabled={disabled} onClick={() => onActingLearner(member.learnerId)}>{member.name}</button>)}
    </div>
    {!actingLearnerId && <p role="status">Chọn tên trước khi mở nhiệm vụ.</p>}
  </section>;
}

export function BoardResponsePanel({ members, taskId, onRecordResponse, disabled = false }: {
  members: { learnerId: string; name: string }[];
  taskId: string;
  onRecordResponse: (learnerId: string, taskId: string, answer: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [learnerId, setLearnerId] = useState(""), [answer, setAnswer] = useState(""), [busy, setBusy] = useState(false);
  return <section className="lesson-card" style={{ padding: "1rem" }} aria-label="Giáo viên ghi câu trả lời trên bảng cá nhân">
    <h2>Ghi câu trả lời em đã giơ bảng</h2>
    <form onSubmit={async event => { event.preventDefault(); if (!learnerId || !answer.trim() || busy || disabled) return;
      setBusy(true); try { await onRecordResponse(learnerId, taskId, answer.trim()); setAnswer(""); } finally { setBusy(false); } }}>
      <label htmlFor="board-response-learner">Học sinh</label>
      <select id="board-response-learner" className="lesson-input" value={learnerId} disabled={disabled || busy} onChange={event => setLearnerId(event.target.value)}>
        <option value="">Chọn em đã trả lời</option>{members.map(member => <option key={member.learnerId} value={member.learnerId}>{member.name}</option>)}
      </select>
      <label htmlFor="board-response-answer">Nội dung em đã viết</label>
      <textarea id="board-response-answer" className="lesson-input" value={answer} maxLength={8000} disabled={disabled || busy} onChange={event => setAnswer(event.target.value)} />
      <button type="submit" className="lesson-button lesson-button-outline" style={{ minHeight: 44 }} disabled={disabled || busy || !learnerId || !answer.trim()}>{busy ? "Đang ghi..." : "Ghi câu trả lời"}</button>
    </form>
  </section>;
}
