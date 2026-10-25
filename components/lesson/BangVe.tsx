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
import { gradeDrawing, DEFAULT_VERTEX_TOLERANCE, type DrawnEdge, type GradeResult } from "../../lib/geometry/grade";

export interface BangVeProps {
  solidKey: string;
  width?: number;
  height?: number;
  caption?: string;
}

interface Pt {
  x: number;
  y: number;
}

/**
 * Chế độ VẼ (Mức B): HS tự đặt đỉnh, nối cạnh, chọn nét liền/đứt; máy chấm.
 *
 * TÁCH BIỆT với chế độ Xem có chủ ý: ở đây HS được chọn nét vì đó là BÀI TẬP.
 * Trộn hai chế độ sẽ dạy sai rằng nét đứt là tuỳ ý.
 *
 * Cách dùng:
 *   1. Kéo đỉnh từ vị trí gợi ý (chấm xám) — không đặt tự do.
 *   2. Bấm đỉnh thứ nhất, rồi đỉnh thứ hai để nối cạnh.
 *   3. Bấm vào cạnh để đổi nét liền <-> đứt.
 *   4. Bấm "Chấm bài".
 */
export function BangVe({ solidKey, width = 420, height = 360, caption }: BangVeProps) {
  const solid: Solid | undefined = solids[solidKey];
  const preset = defaultViews[solidKey];

  // Vị trí gợi ý (toạ độ màn hình) cho từng đỉnh.
  // Dùng CHUNG layoutSolid với chế độ Xem -> hình hai chế độ cùng kích thước.
  const hints = useMemo<Pt[]>(() => {
    if (!solid || !preset) return [];
    const cam = makeCamera(preset.target, preset.dist, preset.yaw, preset.pitch);
    const { px } = layoutSolid(solid, cam, width, height);
    return px.map(([x, y]) => ({ x, y }));
  }, [solid, preset, width, height]);

  // Đỉnh HS đã đặt: ban đầu null (chưa đặt), HS kéo từ gợi ý
  const [placed, setPlaced] = useState<(Pt | null)[]>(() => hints.map((h) => ({ ...h })));
  const [edges, setEdges] = useState<DrawnEdge[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const posOf = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    // SVG duoc hien thi co gian theo khung, nen phai quy doi pixel thuc
    // ve toa do viewBox. Neu khong, keo dinh se lech khi man hinh khac kich thuoc.
    const sx = r.width === 0 ? 1 : width / r.width;
    const sy = r.height === 0 ? 1 : height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  const onVertexDown = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragIdx(i);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (dragIdx == null) return;
    const p = posOf(e);
    setPlaced((prev) => {
      const next = [...prev];
      next[dragIdx] = p;
      return next;
    });
    setResult(null);
  };

  const onUp = () => setDragIdx(null);

  const onVertexClick = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (picked == null) {
      setPicked(i);
      return;
    }
    if (picked === i) {
      setPicked(null);
      return;
    }
    // Nối cạnh mới, mặc định nét liền
    setEdges((prev) => {
      const exists = prev.some(
        (x) => (x.a === picked && x.b === i) || (x.a === i && x.b === picked)
      );
      if (exists) return prev;
      return [...prev, { a: picked, b: i, solid: true }];
    });
    setPicked(null);
    setResult(null);
  };

  const toggleEdge = (idx: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((prev) => prev.map((x, i) => (i === idx ? { ...x, solid: !x.solid } : x)));
    setResult(null);
  };

  const buildExpected = useCallback(() => {
    if (!solid || !preset) return [];
    const cam = makeCamera(preset.target, preset.dist, preset.yaw, preset.pitch);
    const vis = computeVisibility(solid, cam);
    return solid.edges.map((e) => ({
      from: solid.labels[e.a],
      to: solid.labels[e.b],
      solid: vis.edgeSolid[edgeKey(e.a, e.b)],
    }));
  }, [solid, preset]);

  const doGrade = () => {
    if (!solid) return;
    const drawnVerts = placed.filter((p): p is Pt => p !== null);
    // Cần ánh xạ chỉ số: placed có thể null -> dựng lại mapping thủ công
    const idxToDrawn = new Map<number, number>();
    let k = 0;
    placed.forEach((p, i) => {
      if (p) idxToDrawn.set(i, k++);
    });
    const drawnEdges = edges
      .filter((e) => idxToDrawn.has(e.a) && idxToDrawn.has(e.b))
      .map((e) => ({ a: idxToDrawn.get(e.a)!, b: idxToDrawn.get(e.b)!, solid: e.solid }));
    const hintVerts = hints.filter((_, i) => placed[i] !== null);
    const labels = solid.labels.filter((_, i) => placed[i] !== null);

    setResult(
      gradeDrawing({
        drawnVerts,
        hintVerts,
        labels,
        drawnEdges,
        expectedEdges: buildExpected(),
        tolerance: DEFAULT_VERTEX_TOLERANCE,
      })
    );
  };

  const resetAll = () => {
    setPlaced(hints.map((h) => ({ ...h })));
    setEdges([]);
    setPicked(null);
    setResult(null);
  };

  if (!solid || !preset) {
    return <div style={{ color: "#b91c1c", fontSize: 13 }}>Khối “{solidKey}” không tồn tại.</div>;
  }

  return (
    <figure style={{ margin: ".75rem 0", maxWidth: width, width: "100%" }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Bài tập vẽ ${caption ?? solidKey}. Kéo đỉnh, bấm hai đỉnh để nối cạnh, bấm cạnh để đổi nét.`}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, touchAction: "none", userSelect: "none", display: "block", height: "auto" }}
      >
        <rect width={width} height={height} fill="#fff" rx={10} />

        {/* Gợi ý đỉnh: vòng lớn hơn điểm đã đặt để HS thấy vị trí gợi ý */}
        {hints.map((h, i) => (
          <circle key={`h${i}`} cx={h.x} cy={h.y} r={13} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
        ))}

        {/* Cạnh HS đã vẽ */}
        {edges.map((e, i) => {
          const A = placed[e.a];
          const B = placed[e.b];
          if (!A || !B) return null;
          return (
            <line
              key={`e${i}`}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke={e.solid ? "#0f172a" : "#64748b"}
              strokeWidth={14}
              strokeOpacity={0.001}
              strokeDasharray={undefined}
              onClick={toggleEdge(i)}
              style={{ cursor: "pointer", pointerEvents: "stroke" }}
            >
              <title>{e.solid ? "Nét liền — bấm để đổi thành nét đứt" : "Nét đứt — bấm để đổi thành nét liền"}</title>
            </line>
          );
        })}
        {edges.map((e, i) => {
          const A = placed[e.a];
          const B = placed[e.b];
          if (!A || !B) return null;
          return (
            <line
              key={`v${i}`}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="#0f172a"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={e.solid ? undefined : "7 5"}
              style={{ pointerEvents: "none" }}
            />
          );
        })}

        {/* Đỉnh HS đặt */}
        {placed.map((p, i) =>
          p ? (
            <g key={`p${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={7}
                fill={picked === i ? "#f59e0b" : "#1d4ed8"}
                onPointerDown={onVertexDown(i)}
                onClick={onVertexClick(i)}
                style={{ cursor: "grab" }}
              />
              {/* Nhãn đẩy ra xa tâm hình, KHÔNG dùng lệch cố định +9/-9:
                  ở đỉnh C (76,241) lệch +9/-9 vẫn nằm trong vòng gợi ý r=13
                  và đè lên chấm xanh. Cùng công thức với KhoiXoay. */}
              {(() => {
                const vx = p.x - width / 2;
                const vy = p.y - height / 2;
                const vlen = Math.hypot(vx, vy) || 1;
                const push = 16;
                const lx = p.x + (vx / vlen) * push;
                const ly = p.y + (vy / vlen) * push;
                return (
                  <text x={lx} y={ly} fontSize={13} fill="#1d4ed8" fontStyle="italic" fontFamily="Georgia, serif" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>
                    {solid.labels[i]}
                  </text>
                );
              })()}
            </g>
          ) : null
        )}
      </svg>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={doGrade} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "none", background: "#1d4ed8", color: "#fff", cursor: "pointer" }}>
          Chấm bài
        </button>
        <button type="button" onClick={resetAll} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 6, border: "1px solid #94a3b8", background: "#f8fafc", cursor: "pointer" }}>
          Làm lại
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Bấm 2 đỉnh để nối cạnh · bấm cạnh để đổi nét
        </span>
      </div>

      {result && (
        <div
          role="status"
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            fontSize: 13,
            background: result.ok ? "#dcfce7" : "#fef3c7",
            border: `1px solid ${result.ok ? "#86efac" : "#fcd34d"}`,
          }}
        >
          <strong>{result.ok ? "Đúng rồi!" : "Chưa đúng."}</strong> {result.summary}
          {result.wrongDash.length > 0 && (
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              {result.wrongDash.map((x, i) => (
                <li key={i}>{x.detail}</li>
              ))}
            </ul>
          )}
          {result.missing.length > 0 && (
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              {result.missing.map((x, i) => (
                <li key={i}>{x.detail}</li>
              ))}
            </ul>
          )}
          {result.extra.length > 0 && (
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              {result.extra.map((x, i) => (
                <li key={i}>{x.detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {caption && <figcaption style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{caption}</figcaption>}
    </figure>
  );
}
