"use client";

import React from "react";
import { KhoiXoay } from "./KhoiXoay";

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
  // Khối 3D được ưu tiên: cho phép xoay để kiểm chứng quy ước vẽ.
  if (solidKey) {
    return <KhoiXoay solidKey={solidKey} caption={alt} width={380} height={330} />;
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
