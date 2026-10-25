"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  computeVisibility,
  defaultViews,
  edgeKey,
  layoutSolid,
  makeCamera,
  solids,
  type Solid,
} from "../../lib/geometry/solid";

export interface KhoiXoayProps {
  /** Khoá khối trong `solids`, ví dụ 'hop-xien'. */
  solidKey: string;
  width?: number;
  height?: number;
  /** Ẩn nút điều khiển nếu nhúng trong ngữ cảnh chật. */
  compact?: boolean;
  caption?: string;
}

/**
 * Chế độ XEM: máy tự tính nét liền/đứt theo góc nhìn, HS kéo để xoay.
 *
 * Học sinh KHÔNG chỉnh được nét ở đây — đó là điểm có chủ ý. Nét liền/đứt là
 * kết quả tính toán, không phải thuộc tính cạnh. Muốn HS tự chọn nét thì dùng
 * BangVe (chế độ Vẽ).
 */
export function KhoiXoay({
  solidKey,
  width = 380,
  height = 330,
  compact = false,
  caption,
}: KhoiXoayProps) {
  const solid: Solid | undefined = solids[solidKey];
  const preset = defaultViews[solidKey];

  const [yaw, setYaw] = useState(preset?.yaw ?? 0);
  const [pitch, setPitch] = useState(preset?.pitch ?? 20);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const reset = useCallback(() => {
    setYaw(preset?.yaw ?? 0);
    setPitch(preset?.pitch ?? 20);
  }, [preset]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, yaw, pitch };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const nextYaw = d.yaw + (e.clientX - d.x) * 0.5;
    const nextPitch = Math.max(-80, Math.min(80, d.pitch - (e.clientY - d.y) * 0.4));
    setYaw(nextYaw);
    setPitch(nextPitch);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* đã nhả */
    }
  };

  const rendered = useMemo(() => {
    if (!solid || !preset) return null;
    const cam = makeCamera(preset.target, preset.dist, yaw, pitch);

    // Chieu + auto-fit (dung chung voi che do Ve de hai che do khop kich thuoc).
    const { px: pts, toScreen } = layoutSolid(solid, cam, width, height);

    const vis = computeVisibility(solid, cam);

    const lines = solid.edges.map((e) => {
      const A = pts[e.a];
      const B = pts[e.b];
      const isSolid = vis.edgeSolid[edgeKey(e.a, e.b)];
      return { A, B, isSolid, a: e.a, b: e.b };
    });

    const extras = (solid.extraPts ?? []).map((ep) => {
      const [x, y] = toScreen(ep.p);
      return { x, y, label: ep.label };
    });

    const solidCount = lines.filter((l) => l.isSolid).length;

    return { pts, lines, extras, solidCount, total: solid.edges.length, visibleFaces: vis.visibleFaceCount };
  }, [solid, preset, yaw, pitch, width, height]);

  if (!solid || !preset || !rendered) {
    return <div style={{ color: "#b91c1c", fontSize: 13 }}>Khối “{solidKey}” không tồn tại.</div>;
  }

  const { pts, lines, extras, solidCount, total, visibleFaces } = rendered;

  return (
    <figure style={{ margin: ".75rem 0", maxWidth: width, width: "100%" }}>
      <div
        role="img"
        aria-label={`${caption ?? solidKey}. Kéo để xoay. Nét liền ${solidCount} trên ${total}, ${visibleFaces} mặt nhìn thấy.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
          background: "#fff",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          display: "block",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", height: "auto" }}
        >
          <rect width={width} height={height} fill="#fff" rx={10} />
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.A[0]}
              y1={l.A[1]}
              x2={l.B[0]}
              y2={l.B[1]}
              stroke="#0f172a"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeDasharray={l.isSolid ? undefined : "7 5"}
            />
          ))}
          {extras.map((e, i) => (
            <g key={`x${i}`}>
              <circle cx={e.x} cy={e.y} r={3.2} fill="#b91c1c" />
              <text x={e.x + 6} y={e.y - 6} fontSize={13} fill="#b91c1c" fontStyle="italic" fontFamily="Georgia, serif">
                {e.label}
              </text>
            </g>
          ))}
          {solid.labels.map((nm, i) => {
            if (!nm) return null;
            // Day nhan ra XA tam hinh theo huong tu tam toi dinh.
            // Cach nay tranh nhan de len canh cho moi goc quay, hon la
            // dich co dinh +6/-6 (da tung lam nhan A, B de len canh).
            const tx = width / 2;
            const ty = height / 2;
            const vx = pts[i][0] - tx;
            const vy = pts[i][1] - ty;
            const vlen = Math.hypot(vx, vy) || 1;
            const push = 15;
            const lx = pts[i][0] + (vx / vlen) * push;
            const ly = pts[i][1] + (vy / vlen) * push;
            return (
              <text
                key={i}
                x={lx}
                y={ly}
                fontSize={14}
                fill="#0c4a6e"
                fontStyle="italic"
                fontFamily="Georgia, serif"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {nm}
              </text>
            );
          })}
        </svg>
      </div>

      {!compact && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #94a3b8",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Về góc sách giáo khoa
          </button>
          <span style={{ fontSize: 12, color: "#475569" }}>
            yaw {Math.round(yaw)}° · pitch {Math.round(pitch)}° · nét liền {solidCount}/{total}
          </span>
        </div>
      )}

      {caption && (
        <figcaption style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{caption}</figcaption>
      )}
    </figure>
  );
}
