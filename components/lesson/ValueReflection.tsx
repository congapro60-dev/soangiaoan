"use client";
import React from "react";

export type ValueReflectionData = { integrity: boolean; usedAI: boolean; aiHelp: string; ownChanges: string; reflection: string };
type Props = { policy?: "off" | "hints" | "check"; value: ValueReflectionData; onChange: (value: ValueReflectionData) => void; onSubmit: () => void | Promise<void>; disabled?: boolean };

export function ValueReflection({ policy = "off", value, onChange, onSubmit, disabled = false }: Props) {
  const update = (patch: Partial<ValueReflectionData>) => onChange({ ...value, ...patch });
  const valid = value.integrity && value.reflection.trim().length > 0 && value.reflection.split(/\r\n?|\n/).length <= 2 && (!value.usedAI || (value.aiHelp.trim().length > 0 && value.ownChanges.trim().length > 0));
  return <fieldset className="lesson-section-box" disabled={disabled}>
    <legend>Em nhìn lại cách học</legend>
    <p>{policy === "off" ? "Nhiệm vụ này không dùng AI. Nếu đã dùng, em vẫn ghi đúng phần được giúp để giáo viên hỗ trợ." : policy === "hints" ? "AI chỉ được gợi ý; em tự kiểm tra và hoàn thiện cách làm." : "Em tự làm trước, chỉ dùng AI để kiểm tra rồi đối chiếu lại."}</p>
    <label style={{ display: "block", padding: "0.6rem 0" }}><input type="checkbox" checked={value.usedAI} onChange={event => update(event.target.checked ? { usedAI: true } : { usedAI: false, aiHelp: "", ownChanges: "" })} /> Em đã dùng AI</label>
    {value.usedAI && <>
      <label style={{ display: "block", marginBottom: "0.75rem" }}>AI giúp gì?<textarea className="lesson-textarea" rows={2} maxLength={1000} value={value.aiHelp} onChange={event => update({ aiHelp: event.target.value })} /></label>
      <label style={{ display: "block", marginBottom: "0.75rem" }}>Em kiểm tra và em sửa gì?<textarea className="lesson-textarea" rows={2} maxLength={1000} value={value.ownChanges} onChange={event => update({ ownChanges: event.target.value })} /></label>
    </>}
    <label style={{ display: "block", marginBottom: "0.75rem" }}>Trước em nghĩ… Giờ em nghĩ…<textarea className="lesson-textarea" rows={2} maxLength={1000} value={value.reflection} placeholder="Hai dòng: cách nghĩ trước đây và điều khiến em đổi ý." onChange={event => update({ reflection: event.target.value })} /></label>
    {value.reflection.split(/\r\n?|\n/).length > 2 && <p role="alert">Em viết tối đa hai dòng.</p>}
    <label style={{ display: "block", padding: "0.6rem 0" }}><input type="checkbox" checked={value.integrity} onChange={event => update({ integrity: event.target.checked })} /> Em tự làm phần kiểm tra và khai đúng trợ giúp đã dùng.</label>
    <button className="lesson-button lesson-button-primary" type="button" disabled={disabled || !valid} onClick={onSubmit}>Lưu lời nhìn lại</button>
  </fieldset>;
}
