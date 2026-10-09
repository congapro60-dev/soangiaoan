"use client";

import React, { useState } from "react";

interface LessonMascotPickerProps {
  /** Sprite sheet file name under /assets (4 columns x 2 rows). */
  spriteImage: string;
  /** Display names of the mascots, in sprite-sheet order. */
  mascots: string[];
  /** Index currently drawn on the map for this pupil. */
  current: number;
  /** False until the pupil has picked one; the picker then opens by itself. */
  chosen: boolean;
  disabled?: boolean;
  /** True once the lesson has started: a chosen mascot can no longer be changed. */
  locked?: boolean;
  onChoose: (mascot: number) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

export function mascotSpriteStyle(spriteImage: string, index: number): React.CSSProperties {
  return {
    backgroundImage: `url('${spriteImage.startsWith("/") ? spriteImage : "/assets/" + spriteImage}')`,
    ["--mx" as string]: `${((index % 4) * 100) / 3}%`,
    ["--my" as string]: `${Math.floor(index / 4) * 100}%`,
  };
}

/** A small round picture of one mascot, for bars and badges. */
export function LessonMascotChip({ spriteImage, mascots, mascot }: { spriteImage: string; mascots: string[]; mascot: number }) {
  return (
    <span
      className="lesson-mascot-sprite lesson-mascot-sprite-small"
      style={mascotSpriteStyle(spriteImage, mascot)}
      role="img"
      aria-label={mascots[mascot] || "Linh vật của em"}
    />
  );
}

export function LessonMascotPicker({ spriteImage, mascots, current, chosen, disabled, locked, onChoose }: LessonMascotPickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const expanded = !chosen || (open && !locked);

  const choose = async (index: number) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onChoose(index);
      if (result.ok) setOpen(false);
      else setError(result.error || "Chưa chọn được linh vật. Em thử lại nhé.");
    } finally {
      setPending(false);
    }
  };

  if (!expanded) {
    return (
      <div className="lesson-mascot-bar">
        <span className="lesson-mascot-sprite lesson-mascot-sprite-small" style={mascotSpriteStyle(spriteImage, current)} role="img" aria-label={mascots[current] || "Linh vật"} />
        <span>
          Linh vật của em: <strong>{mascots[current] || "Linh vật"}</strong>
        </span>
        {locked ? (
          <span className="lesson-mascot-locked">🔒 Đã khóa khi tiết học bắt đầu</span>
        ) : (
          <button type="button" className="lesson-button lesson-button-outline" onClick={() => setOpen(true)} disabled={disabled}>
            Đổi linh vật
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="lesson-mascot-picker" aria-label="Chọn linh vật">
      <h3 className="lesson-mascot-title">{chosen ? "Đổi linh vật" : "Chọn linh vật của em"}</h3>
      <p className="lesson-mascot-hint">Linh vật sẽ đi trên bản đồ mỗi khi em lắc xúc xắc.</p>
      <div className="lesson-mascot-grid">
        {mascots.map((name, index) => (
          <button
            key={index}
            type="button"
            className="lesson-mascot-option"
            aria-pressed={chosen && index === current}
            disabled={disabled || pending}
            onClick={() => void choose(index)}
          >
            <span className="lesson-mascot-sprite" style={mascotSpriteStyle(spriteImage, index)} role="img" aria-hidden="true" />
            <span>{name}</span>
          </button>
        ))}
      </div>
      {error && <p className="lesson-mascot-error" role="alert">{error}</p>}
      {chosen && (
        <button type="button" className="lesson-button lesson-button-outline" onClick={() => setOpen(false)}>
          Giữ nguyên
        </button>
      )}
    </section>
  );
}

export default LessonMascotPicker;
