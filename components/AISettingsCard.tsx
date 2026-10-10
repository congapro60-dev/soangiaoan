"use client";

import React, { useEffect, useState } from "react";

// Shown only to the site owner (the API answers 403 to everyone else, and then nothing renders).
type Reply = { ai?: AIStatus; error?: string; test?: { ok: boolean; status: string } };
type AIStatus = { configured: boolean; origin: "env" | "saved" | null; model: string; endpoint: string; keyHint: string | null; updatedAt: number | null };

const MESSAGES: Record<string, string> = {
  OK: "Kết nối được, AI đã sẵn sàng.",
  NOT_CONFIGURED: "Chưa có khóa.",
  NETWORK: "Không gọi được máy chủ AI (mạng hoặc địa chỉ sai).",
  HTTP_400: "Máy chủ AI từ chối: kiểm tra tên mô hình.",
  HTTP_401: "Khóa không đúng hoặc đã bị thu hồi.",
  HTTP_403: "Khóa không có quyền dùng mô hình này.",
  HTTP_404: "Không có mô hình với tên này.",
  HTTP_429: "Hết lượt dùng miễn phí, thử lại sau.",
  INVALID_AI_KEY: "Khóa không hợp lệ (dán lại, không có dấu cách).",
  INVALID_AI_MODEL: "Tên mô hình không hợp lệ.",
  INVALID_AI_ENDPOINT: "Địa chỉ phải bắt đầu bằng https://",
};

export function AISettingsCard() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/ai-settings", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Reply>) : null))
      .then((data) => {
        if (data?.ai) {
          setStatus(data.ai);
          setModel(data.ai.model);
          setOpen(!data.ai.configured);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!status) return null;

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/ai-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await r.json()) as Reply;
      if (data.ai) setStatus(data.ai);
      if (data.error) setNote(MESSAGES[data.error] || "Không lưu được.");
      else if (data.test) setNote(MESSAGES[data.test.status] || "Lỗi " + data.test.status);
      else if (body.action === "save") {
        setKey("");
        setNote("Đã lưu. Bấm \"Kiểm tra\" để thử khóa.");
      } else if (body.action === "clear") setNote("Đã xóa khóa. AI đã tắt.");
    } catch {
      setNote("Không gửi được, thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="lesson-card ai-settings-card" aria-label="Kết nối AI">
      <div className="ai-settings-head">
        <div>
          <strong>🤖 Kết nối AI</strong>{" "}
          <span className={"lesson-badge " + (status.configured ? "lesson-badge-success" : "lesson-badge-warning")}>{status.configured ? "Đang bật" : "Chưa bật"}</span>
          <p className="lesson-muted">
            {status.configured
              ? `Mô hình ${status.model}${status.keyHint ? ` · khóa ${status.keyHint}` : status.origin === "env" ? " · cấu hình trên máy chủ" : ""}`
              : "Dán khóa Gemini để AI soạn nháp bài học và đổi số liệu đề. Chỉ gửi nội dung bài/đề, không gửi tên hay bài làm học sinh."}
          </p>
        </div>
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Thu gọn" : status.configured ? "Đổi khóa" : "Điền khóa"}
        </button>
      </div>
      {open && (
        <div className="ai-settings-form">
          <label>
            Khóa API (Google AI Studio → Get API key)
            <input className="lesson-input" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Dán khóa vào đây" />
          </label>
          <label>
            Mô hình
            <input className="lesson-input" value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <div className="ai-settings-actions">
            <button type="button" className="lesson-button" disabled={busy || !key.trim()} onClick={() => call({ action: "save", key, model })}>Lưu khóa</button>
            <button type="button" className="lesson-button lesson-button-outline" disabled={busy || !status.configured} onClick={() => call({ action: "test" })}>Kiểm tra</button>
            {status.origin === "saved" && <button type="button" className="lesson-button lesson-button-secondary" disabled={busy} onClick={() => call({ action: "clear" })}>Xóa khóa</button>}
          </div>
          <p className="lesson-muted">Khóa chỉ lưu trên máy chủ của site, không hiện lại trên trình duyệt (chỉ 4 ký tự cuối).</p>
        </div>
      )}
      {note && <p className="ai-settings-note" role="status">{note}</p>}
    </section>
  );
}
