"use client";

import React, { useState } from "react";
import { KhoiXoay } from "./KhoiXoay";
import { BangVe } from "./BangVe";

/**
 * Lấy ảnh minh hoạ của task (v28): ưu tiên `imageUrl` (serializer mới),
 * giữ tương thích `diagramUrl`/`image` ở dữ liệu cũ.
 */
export function taskImageOf(task: unknown): string | undefined {
  if (!task || typeof task !== "object") return undefined;
  const t = task as { imageUrl?: unknown; diagramUrl?: unknown; image?: unknown };
  for (const candidate of [t.imageUrl, t.diagramUrl, t.image]) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return undefined;
}

/**
 * Lấy khoá khối 3D của task (v30). Khi có, hình được vẽ bằng mô phỏng xoay
 * thay vì ảnh tĩnh — học sinh kiểm chứng được quy ước nét liền/nét đứt.
 */
export function taskSolidOf(task: unknown): string | undefined {
  if (!task || typeof task !== "object") return undefined;
  const t = task as { solidKey?: unknown };
  return typeof t.solidKey === "string" && t.solidKey ? t.solidKey : undefined;
}

type Mode = "xem" | "ve";

/** Slot ảnh cạnh đề bài — hiển thị dưới nhãn hoạt động, trên prompt. */
export default function TaskImage({
  image,
  solidKey,
  alt = "Hình minh hoạ đề bài",
  maxHeight = 260,
}: {
  image?: string;
  solidKey?: string;
  alt?: string;
  maxHeight?: number;
}) {
  // Mặc định là chế độ Xem: phần lớn học sinh cần THẤY hình đúng trước đã.
  // Chế độ Vẽ là bài tập, chỉ mở khi học sinh chủ động chuyển.
  const [mode, setMode] = useState<Mode>("xem");

  if (solidKey) {
    return (
      <div>
        <div
          role="tablist"
          aria-label="Chế độ xem hình"
          style={{ display: "flex", gap: 6, margin: ".5rem 0 0" }}
        >
          <TabButton active={mode === "xem"} onClick={() => setMode("xem")}>
            Xem hình
          </TabButton>
          <TabButton active={mode === "ve"} onClick={() => setMode("ve")}>
            Tự vẽ
          </TabButton>
        </div>
        {mode === "xem" ? (
          <KhoiXoay solidKey={solidKey} caption={alt} width={380} height={330} />
        ) : (
          <BangVe solidKey={solidKey} caption={alt} width={380} height={330} />
        )}
      </div>
    );
  }
  if (!image) return null;
  return (
    <div className="task-prompt-image">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        style={{ maxHeight: `${maxHeight}px` }}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        fontSize: 13,
        padding: "5px 12px",
        borderRadius: 6,
        border: `1px solid ${active ? "#1d4ed8" : "#cbd5e1"}`,
        background: active ? "#1d4ed8" : "#fff",
        color: active ? "#fff" : "#334155",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
