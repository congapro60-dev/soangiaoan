"use client";

import React from "react";

/**
 * Hình dữ liệu thống kê cho task (GĐ2): bảng dataset và/hoặc biểu đồ cột.
 * Nguyên tắc giống KhoiXoay: hình vẽ TỪ dữ kiện có cấu trúc của đề,
 * học sinh đối chiếu số liệu trực tiếp, không phải ảnh tĩnh.
 *
 * visual = {
 *   kind: "dataset-table" | "bar-chart",
 *   title: string,          // bối cảnh: "Lợi suất cổ phiếu A/B — 12 phiên"
 *   headers: string[],      // ["Phiên", "A (%)", "B (%)"]
 *   rows: (string|number)[][], // mỗi dòng đủ số cột headers
 *   highlight?: number      // chỉ số dòng được tô sáng (cửa sổ phiên đang hỏi)
 * }
 */

export interface TaskVisual {
  kind: "dataset-table" | "bar-chart";
  title: string;
  headers: string[];
  rows: (string | number)[][];
  highlight?: number;
}

export function taskVisualOf(task: unknown): TaskVisual | undefined {
  if (!task || typeof task !== "object") return undefined;
  const t = task as { visual?: unknown };
  if (!t.visual || typeof t.visual !== "object") return undefined;
  const v = t.visual as Partial<TaskVisual>;
  if (
    (v.kind === "dataset-table" || v.kind === "bar-chart") &&
    typeof v.title === "string" &&
    Array.isArray(v.headers) &&
    Array.isArray(v.rows)
  ) {
    return v as TaskVisual;
  }
  return undefined;
}

function DataTable({ visual }: { visual: TaskVisual }) {
  return (
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
                background: "#e2e8f0",
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
                : undefined
            }
          >
            {row.map((cell, c) => (
              <td
                key={c}
                style={{
                  border: "1px solid #94a3b8",
                  padding: "3px 10px",
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
  );
}

function BarChart({ visual }: { visual: TaskVisual }) {
  // Cột đầu = nhãn, các cột sau = giá trị (một nhóm cột mỗi dòng).
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
                x={gx + ((visual.headers.length - 1) * (barW + 4)) / 2}
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

export default function DataVisual({ visual }: { visual: TaskVisual }) {
  if (visual.kind === "bar-chart") return <BarChart visual={visual} />;
  return <DataTable visual={visual} />;
}
