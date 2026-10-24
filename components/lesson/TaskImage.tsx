"use client";

import React from "react";

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

/** Slot ảnh cạnh đề bài — hiển thị dưới nhãn hoạt động, trên prompt. */
export default function TaskImage({
  image,
  alt = "Hình minh hoạ đề bài",
  maxHeight = 260,
}: {
  image?: string;
  alt?: string;
  maxHeight?: number;
}) {
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
