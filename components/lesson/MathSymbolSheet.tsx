"use client";

/**
 * V28 Phase B2 — Bảng ký hiệu Toán dạng bottom-sheet (mobile-first).
 * Giữ mở sau mỗi lần chèn để thầy trò chèn liên tiếp; đóng bằng "Xong"/✕/Esc/nhấp nền.
 */

import React, { useEffect, useState } from "react";
import MathText from "./MathText";
import {
  MATH_CHIP_GROUPS,
  chipsByGroup,
  type MathChip,
  type MathChipGroupId,
} from "../../lib/lesson/math-symbols";

function isLatexChip(chip: MathChip): boolean {
  return chip.group === "composed" || chip.group === "inline";
}

export default function MathSymbolSheet({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (chip: MathChip) => void;
}) {
  const [activeGroup, setActiveGroup] = useState<MathChipGroupId>("inline");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const chips = chipsByGroup(activeGroup);
  const groupTitle = MATH_CHIP_GROUPS.find((group) => group.id === activeGroup)?.title || "";

  return (
    <div className="math-symbol-overlay" onClick={onClose}>
      <section
        className="math-symbol-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Bảng ký hiệu Toán"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="math-symbol-head">
          <h3>Bảng ký hiệu Toán</h3>
          <div className="math-symbol-head-actions">
            <button type="button" className="math-symbol-done" onClick={onClose}>
              Xong
            </button>
            <button type="button" className="math-symbol-close" aria-label="Đóng bảng ký hiệu" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>
        <p className="math-symbol-tip">Chạm ký hiệu để chèn vào vị trí con trỏ. Bảng giữ mở để chèn nhiều lần.</p>
        <div className="math-symbol-tabs" role="tablist" aria-label="Nhóm ký hiệu">
          {MATH_CHIP_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={group.id === activeGroup}
              className={`math-symbol-tab ${group.id === activeGroup ? "math-symbol-tab-active" : ""}`}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.title}
            </button>
          ))}
        </div>
        <div className="math-symbol-grid" role="tabpanel" aria-label={groupTitle}>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="math-symbol-chip"
              title={chip.name}
              aria-label={`Chèn ${chip.name}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onInsert(chip)}
            >
              {isLatexChip(chip) ? (
                <MathText text={`$${chip.label}$`} />
              ) : (
                <span aria-hidden="true">{chip.label}</span>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
