"use client";

import React, { useState } from "react";

export type TaskVisualKind =
  | "dataset-table"
  | "bar-chart"
  | "function-graph"
  | "coordinate-plane"
  | "probability-tree";

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface GraphSegment {
  from: [number, number];
  to: [number, number];
  label?: string;
  dashed?: boolean;
  color?: string;
}

export interface GraphRegion {
  polygon: [number, number][];
  label?: string;
  color?: string;
}

/** Đường tròn đúng tâm — KHÔNG dùng `radarRings` (vòng đó luôn tâm O). */
export interface GraphCircle {
  center: [number, number];
  r: number;
  label?: string;
  color?: string;
}

export interface TreeNode {
  id: string;
  label: string;
  prob?: string;
  children?: TreeNode[];
}

export interface TaskVisual {
  kind: TaskVisualKind;
  title: string;
  // dataset-table & bar-chart
  headers?: string[];
  rows?: (string | number)[][];
  highlight?: number;
  // function-graph
  fnType?: "quadratic" | "cubic" | "rational" | "sin" | "cos" | "exponential";
  /**
   * Tham số hàm. Ý nghĩa theo `fnType`:
   * - quadratic: a·x² + b·x + c
   * - cubic:     a·x³ + b·x² + c·x + d
   * - rational:  (a·x + b)/(c·x + d)
   * - sin/cos:   a·sin(b·x + c)
   * - exponential: b^(x − c) * a  (c là dịch ngang, xem `expVerticalShift`)
   */
  fnParams?: Record<string, number>;
  /** Dịch dọc của hàm mũ: y = a·b^(x−fnParams.c) + expVerticalShift. */
  expVerticalShift?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  points?: GraphPoint[];
  asymptotes?: { vertical?: number[]; horizontal?: number[]; slant?: [number, number] };
  // coordinate-plane (radar / vectors / linear programming)
  segments?: GraphSegment[];
  regions?: GraphRegion[];
  circles?: GraphCircle[];
  radarRings?: number[];
  // probability-tree
  tree?: TreeNode;
}

export function taskVisualOf(task: unknown): TaskVisual | undefined {
  if (!task || typeof task !== "object") return undefined;
  const t = task as { visual?: unknown };
  if (!t.visual || typeof t.visual !== "object") return undefined;
  const v = t.visual as Partial<TaskVisual>;
  if (
    typeof v.title === "string" &&
    (((v.kind === "dataset-table" || v.kind === "bar-chart") &&
      Array.isArray(v.headers) &&
      Array.isArray(v.rows)) ||
      v.kind === "function-graph" ||
      v.kind === "coordinate-plane" ||
      v.kind === "probability-tree")
  ) {
    return v as TaskVisual;
  }
  return undefined;
}

/* -------------------------------------------------------------------------
 * 1. Bảng dữ liệu (Data Table)
 * ------------------------------------------------------------------------- */
function DataTable({ visual }: { visual: TaskVisual }) {
  if (!visual.headers || !visual.rows) return null;
  return (
    <div style={{ overflowX: "auto", margin: "0 auto", textAlign: "center" }}>
      <table
        style={{
          borderCollapse: "collapse",
          margin: "0 auto",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      >
        <caption style={{ captionSide: "top", fontWeight: 600, padding: "0 0 6px" }}>
          {visual.title}
        </caption>
        <thead>
          <tr>
            {visual.headers.map((h, i) => (
              <th
                key={i}
                style={{
                  border: "1px solid #94a3b8",
                  background: "#e2e8f0", color: "#0f172a",
                  padding: "4px 10px",
                  textAlign: "center",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visual.rows.map((row, r) => (
            <tr
              key={r}
              style={
                visual.highlight === r
                  ? { background: "#fef3c7", fontWeight: 600 }
                  : { background: "#ffffff" }
              }
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    border: "1px solid #94a3b8",
                    padding: "3px 10px", color: "#0f172a",
                    textAlign: c === 0 ? "left" : "center",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 2. Biểu đồ cột (Bar Chart)
 * ------------------------------------------------------------------------- */
function BarChart({ visual }: { visual: TaskVisual }) {
  if (!visual.headers || !visual.rows) return null;
  const values = visual.rows.map((row) =>
    row.slice(1).map((x) => Number(x) || 0),
  );
  const max = Math.max(1, ...values.flat().map(Math.abs));
  const groupW = 64;
  const barW = Math.max(8, Math.floor(44 / Math.max(1, visual.headers.length - 1)));
  const width = Math.max(320, visual.rows.length * groupW + 60);
  const height = 190;
  const baseY = height - 34;
  const scale = (height - 70) / max;
  const colors = ["#2563eb", "#f97316", "#16a34a", "#9333ea"];

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 4 }}>{visual.title}</figcaption>
      <svg
        role="img"
        aria-label={visual.title}
        width={width}
        height={height}
        style={{ maxWidth: "100%" }}
      >
        <line x1={30} y1={baseY} x2={width - 10} y2={baseY} stroke="#334155" />
        <text x={8} y={baseY + 4} fontSize={11} fill="#334155">
          {max}
        </text>
        {visual.rows.map((row, r) => {
          const gx = 40 + r * groupW;
          return (
            <g key={r}>
              {row.slice(1).map((_, c) => {
                const v = values[r][c];
                const h = Math.abs(v) * scale;
                return (
                  <rect
                    key={c}
                    x={gx + c * (barW + 4)}
                    y={baseY - h}
                    width={barW}
                    height={h}
                    fill={colors[c % colors.length]}
                    opacity={0.9}
                  />
                );
              })}
              <text
                x={gx + ((visual.headers!.length - 1) * (barW + 4)) / 2}
                y={baseY + 14}
                fontSize={11}
                textAnchor="middle"
                fill="#334155"
              >
                {String(row[0])}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 12, color: "#475569" }}>
        {visual.headers.slice(1).map((h, i) => (
          <span key={i} style={{ margin: "0 8px" }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                background: colors[i % colors.length],
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            {h}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------
 * 3. Đồ thị hàm số 2D (Function Graph)
 * ------------------------------------------------------------------------- */
function FunctionGraph({ visual }: { visual: TaskVisual }) {
  const [hoveredPoint, setHoveredPoint] = useState<GraphPoint | null>(null);

  const width = 360;
  const height = 240;
  const padding = 28;

  const [xMin, xMax] = visual.xDomain || [-4, 4];
  const [yMin, yMax] = visual.yDomain || [-4, 4];

  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toSvgY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Tính đường cong hàm số
  const points: [number, number][] = [];
  const p = visual.fnParams || {};
  const a = p.a ?? 1;
  const b = p.b ?? 0;
  const c = p.c ?? 0;
  const d = p.d ?? 1;

  const steps = 120;
  const dx = (xMax - xMin) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    let y = 0;
    if (visual.fnType === "quadratic") {
      y = a * x * x + b * x + c;
    } else if (visual.fnType === "cubic") {
      y = a * x * x * x + b * x * x + c * x + d;
    } else if (visual.fnType === "rational") {
      const denom = c * x + d;
      if (Math.abs(denom) < 0.05) continue;
      y = (a * x + b) / denom;
    } else if (visual.fnType === "sin") {
      y = a * Math.sin(b * x + c);
    } else if (visual.fnType === "cos") {
      y = a * Math.cos(b * x + c);
    } else if (visual.fnType === "exponential") {
      // y = a·b^(x − c) + expVerticalShift  (mặc định dịch = 0)
      y = a * Math.pow(Math.max(1e-9, b), x - c) + (visual.expVerticalShift ?? 0);
    } else {
      y = a * x + b;
    }

    if (y >= yMin - 2 && y <= yMax + 2) {
      points.push([toSvgX(x), toSvgY(y)]);
    }
  }

  // Chuyển mảng điểm thành SVG path (có ngắt đoạn nếu tiệm cận)
  let pathD = "";
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i];
    if (i === 0 || Math.abs(py - points[i - 1][1]) > 80) {
      pathD += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
    } else {
      pathD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
        {visual.title}
      </figcaption>
      <svg
        role="img"
        aria-label={visual.title}
        width={width}
        height={height}
        style={{
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          maxWidth: "100%",
        }}
      >
        {/* Lưới tọa độ */}
        <line x1={padding} y1={originY} x2={width - padding} y2={originY} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={originX} y1={padding} x2={originX} y2={height - padding} stroke="#94a3b8" strokeWidth={1.5} />
        
        {/* Mũi tên trục */}
        <polygon points={`${width - padding},${originY - 3} ${width - padding + 6},${originY} ${width - padding},${originY + 3}`} fill="#64748b" />
        <polygon points={`${originX - 3},${padding} ${originX},${padding - 6} ${originX + 3},${padding}`} fill="#64748b" />
        
        {/* Nhãn trục */}
        <text x={width - padding + 4} y={originY + 14} fontSize={11} fill="#64748b">x</text>
        <text x={originX - 12} y={padding - 2} fontSize={11} fill="#64748b">y</text>
        <text x={originX - 10} y={originY + 14} fontSize={10} fill="#64748b">O</text>

        {/* Tiệm cận nếu có */}
        {visual.asymptotes?.vertical?.map((vx, i) => (
          <line
            key={`va-${i}`}
            x1={toSvgX(vx)}
            y1={padding}
            x2={toSvgX(vx)}
            y2={height - padding}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.2}
          />
        ))}
        {visual.asymptotes?.horizontal?.map((hy, i) => (
          <line
            key={`ha-${i}`}
            x1={padding}
            y1={toSvgY(hy)}
            x2={width - padding}
            y2={toSvgY(hy)}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.2}
          />
        ))}

        {/* Đường cong đồ thị */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2.2} strokeLinecap="round" />

        {/* Điểm đặc biệt */}
        {visual.points?.map((pt, i) => {
          const cx = toSvgX(pt.x);
          const cy = toSvgY(pt.y);
          const isHovered = hoveredPoint === pt;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4}
                fill={pt.color || "#e11d48"}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              {pt.label && (
                <text
                  x={cx + 6}
                  y={cy - 6}
                  fontSize={11}
                  fontWeight={600}
                  fill={pt.color || "#e11d48"}
                >
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hoveredPoint && (
        <div style={{ fontSize: 12, color: "#1e293b", marginTop: 2, fontWeight: 500 }}>
          {hoveredPoint.label ? `${hoveredPoint.label}: ` : ""}
          ({hoveredPoint.x.toFixed(1)}; {hoveredPoint.y.toFixed(1)})
        </div>
      )}
    </figure>
  );
}

/* -------------------------------------------------------------------------
 * 4. Mặt phẳng tọa độ 2D / Radar / Miền nghiệm (Coordinate Plane)
 * ------------------------------------------------------------------------- */
function CoordinatePlane({ visual }: { visual: TaskVisual }) {
  const width = 360;
  const height = 240;
  const padding = 28;

  const [xMin, xMax] = visual.xDomain || [-5, 5];
  const [yMin, yMax] = visual.yDomain || [-5, 5];

  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toSvgY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
        {visual.title}
      </figcaption>
      <svg
        role="img"
        aria-label={visual.title}
        width={width}
        height={height}
        style={{
          background: "#0f172a",
          borderRadius: 8,
          border: "1px solid #334155",
          maxWidth: "100%",
        }}
      >
        {/* Vòng radar đồng tâm O (dùng cho biểu đồ radar, KHÔNG cho đường tròn tâm bất kỳ) */}
        {visual.radarRings?.map((r, i) => (
          <ellipse
            key={`ring-${i}`}
            cx={originX}
            cy={originY}
            rx={Math.abs(toSvgX(r) - originX)}
            ry={Math.abs(toSvgY(r) - originY)}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1}
          />
        ))}

        {/* Đường tròn đúng tâm: dùng ellipse theo hai tỉ lệ trục để bảo toàn hình học */}
        {visual.circles?.map((cir, i) => {
          const cx = toSvgX(cir.center[0]);
          const cy = toSvgY(cir.center[1]);
          const color = cir.color || "#38bdf8";
          return (
            <g key={`cir-${i}`}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={Math.abs(toSvgX(cir.center[0] + cir.r) - cx)}
                ry={Math.abs(toSvgY(cir.center[1] + cir.r) - cy)}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
              {cir.label && (
                <text x={cx + 4} y={cy + cir.r * 0 + 4} fontSize={10} fill={color} fontWeight={600}>
                  {cir.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Trục Oxy */}
        <line x1={padding} y1={originY} x2={width - padding} y2={originY} stroke="#475569" strokeWidth={1} />
        <line x1={originX} y1={padding} x2={originX} y2={height - padding} stroke="#475569" strokeWidth={1} />

        {/* Miền nghiệm / Vùng đa giác */}
        {visual.regions?.map((reg, i) => {
          const polyStr = reg.polygon.map(([x, y]) => `${toSvgX(x)},${toSvgY(y)}`).join(" ");
          return (
            <polygon
              key={`reg-${i}`}
              points={polyStr}
              fill={reg.color || "#0284c7"}
              fillOpacity={0.25}
              stroke={reg.color || "#0284c7"}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Đoạn thẳng / Vectơ / Cạnh */}
        {visual.segments?.map((seg, i) => {
          const x1 = toSvgX(seg.from[0]);
          const y1 = toSvgY(seg.from[1]);
          const x2 = toSvgX(seg.to[0]);
          const y2 = toSvgY(seg.to[1]);
          return (
            <g key={`seg-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={seg.color || "#38bdf8"}
                strokeWidth={2}
                strokeDasharray={seg.dashed ? "4 4" : undefined}
              />
              {seg.label && (
                <text
                  x={(x1 + x2) / 2 + 4}
                  y={(y1 + y2) / 2 - 4}
                  fontSize={10}
                  fill={seg.color || "#38bdf8"}
                  fontWeight={600}
                >
                  {seg.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Điểm / Vị trí trạm */}
        {visual.points?.map((pt, i) => {
          const cx = toSvgX(pt.x);
          const cy = toSvgY(pt.y);
          return (
            <g key={`pt-${i}`}>
              <circle cx={cx} cy={cy} r={4.5} fill={pt.color || "#f43f5e"} />
              {pt.label && (
                <text x={cx + 6} y={cy - 4} fontSize={11} fill="#f8fafc" fontWeight={600}>
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/* -------------------------------------------------------------------------
 * 5. Cây xác suất phân nhánh (Probability Tree)
 * ------------------------------------------------------------------------- */
function ProbabilityTree({ visual }: { visual: TaskVisual }) {
  if (!visual.tree) return null;
  const root = visual.tree;
  const width = 360;
  const height = 180;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
        {visual.title}
      </figcaption>
      <svg
        role="img"
        aria-label={visual.title}
        width={width}
        height={height}
        style={{
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          maxWidth: "100%",
        }}
      >
        {/* Nút gốc */}
        <circle cx={40} cy={height / 2} r={16} fill="#3b82f6" />
        <text x={40} y={height / 2 + 4} fontSize={10} fill="#ffffff" textAnchor="middle" fontWeight={600}>
          {root.label}
        </text>

        {/* Các nhánh cấp 1 */}
        {root.children?.map((child, i) => {
          const childY = (i + 1) * (height / ((root.children?.length || 1) + 1));
          return (
            <g key={`c1-${i}`}>
              <line x1={56} y1={height / 2} x2={140} y2={childY} stroke="#64748b" strokeWidth={1.5} />
              {child.prob && (
                <text
                  x={95}
                  y={(height / 2 + childY) / 2 - 4}
                  fontSize={10}
                  fill="#0369a1"
                  fontWeight={600}
                >
                  {child.prob}
                </text>
              )}
              <circle cx={156} cy={childY} r={15} fill="#10b981" />
              <text x={156} y={childY + 4} fontSize={10} fill="#ffffff" textAnchor="middle" fontWeight={600}>
                {child.label}
              </text>

              {/* Các nhánh cấp 2 nếu có */}
              {child.children?.map((sub, j) => {
                const subY = childY + (j === 0 ? -24 : 24);
                return (
                  <g key={`c2-${i}-${j}`}>
                    <line x1={171} y1={childY} x2={260} y2={subY} stroke="#94a3b8" strokeWidth={1.2} />
                    {sub.prob && (
                      <text x={212} y={(childY + subY) / 2 - 3} fontSize={9} fill="#b45309" fontWeight={600}>
                        {sub.prob}
                      </text>
                    )}
                    <circle cx={276} cy={subY} r={14} fill="#8b5cf6" />
                    <text x={276} y={subY + 4} fontSize={9} fill="#ffffff" textAnchor="middle" fontWeight={600}>
                      {sub.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/* -------------------------------------------------------------------------
 * Component điều hướng chính
 * ------------------------------------------------------------------------- */
export default function DataVisual({ visual }: { visual: TaskVisual }) {
  if (visual.kind === "bar-chart") return <BarChart visual={visual} />;
  if (visual.kind === "function-graph") return <FunctionGraph visual={visual} />;
  if (visual.kind === "coordinate-plane") return <CoordinatePlane visual={visual} />;
  if (visual.kind === "probability-tree") return <ProbabilityTree visual={visual} />;
  return <DataTable visual={visual} />;
}
