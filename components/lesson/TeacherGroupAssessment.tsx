"use client";

import React, { useState } from "react";

interface GroupProduct {
  groupId: string; taskId: string; proposalHash: string; proposalVersion?: string | number;
  answer: unknown; assessmentStatus?: string; ok: boolean | null;
  assessment?: { feedback: string; assessedBy: string; assessedAt: number };
}
interface GroupTask { id: string; prompt: string; evaluation?: { rubric?: { criteria?: string[] } } }

function ProductReview({ product, task, onCommand, disabled }: {
  product: GroupProduct; task?: GroupTask;
  onCommand: (type: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
  disabled: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function assess(criteriaMet: boolean) {
    setSaving(true); setError(null);
    try {
      const result = await onCommand("GROUP_ASSESS", { groupId: product.groupId, taskId: product.taskId, proposalHash: product.proposalHash, criteriaMet, feedback });
      if (result && typeof result === "object" && "ok" in result && result.ok === false) throw new Error("code" in result ? String(result.code) : "Đánh giá chưa được lưu.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Đánh giá chưa được lưu."); }
    finally { setSaving(false); }
  }
  return <article style={{ padding: ".75rem", border: "1px solid #cbd5e1", borderRadius: 12 }}>
    <h3>{product.groupId} · {task?.prompt || product.taskId}</h3>
    <p>{typeof product.answer === "string" ? product.answer : JSON.stringify(product.answer)}</p>
    {task?.evaluation?.rubric?.criteria?.length ? <ul>{task.evaluation.rubric.criteria.map((criterion, i) => <li key={i}>{criterion}</li>)}</ul> : <p>Đối chiếu tiêu chí nhiệm vụ trước khi đánh giá.</p>}
    {product.assessmentStatus === "pending" ? <>
      <label style={{ display: "block" }}>Nhận xét cho nhóm<textarea value={feedback} maxLength={2000} disabled={disabled || saving} onChange={event => setFeedback(event.target.value)} style={{ display: "block", width: "100%", minHeight: 72 }} /></label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".5rem" }}>
        <button type="button" className="lesson-button" disabled={disabled || saving} onClick={() => assess(true)} style={{ minHeight: 44 }}>Đạt tiêu chí nhóm</button>
        <button type="button" className="lesson-button lesson-button-outline" disabled={disabled || saving} onClick={() => assess(false)} style={{ minHeight: 44 }}>Cần chỉnh sửa</button>
      </div>
    </> : <p>{product.ok ? "Đạt tiêu chí nhóm" : "Cần chỉnh sửa"}{product.assessment?.feedback ? ` · ${product.assessment.feedback}` : ""}</p>}
    {error && <p role="alert">{error}</p>}
  </article>;
}

export function TeacherGroupAssessment({ products, tasks, onCommand, disabled = false }: {
  products: Record<string, GroupProduct>; tasks: GroupTask[];
  onCommand: (type: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
  disabled?: boolean;
}) {
  const entries = Object.values(products).filter(product => product.assessmentStatus === "pending" || product.assessment);
  if (!entries.length) return null;
  return <section aria-label="Đánh giá sản phẩm nhóm" className="lesson-card" style={{ padding: "1rem" }}>
    <h2>Đánh giá sản phẩm nhóm</h2>
    <p className="lesson-muted">Duyệt đúng bản nhóm đã thống nhất. Kết quả nhóm mở lượt xúc xắc; kiểm tra cá nhân cung cấp bằng chứng cho hộ chiếu.</p>
    <div style={{ display: "grid", gap: ".75rem" }}>{entries.map(product => <ProductReview key={`${product.groupId}:${product.taskId}:${product.proposalHash}`} product={product} task={tasks.find(task => task.id === product.taskId)} onCommand={onCommand} disabled={disabled} />)}</div>
  </section>;
}
