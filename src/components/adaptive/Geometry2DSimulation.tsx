import { useMemo, useState } from 'react';
import type { AdaptiveSimulationSpec, SimulationPoint2D } from '../../lib/adaptive/simulationTypes';

interface Geometry2DSimulationProps {
  spec: AdaptiveSimulationSpec;
}

const DEFAULT_VIEWBOX = { minX: 0, minY: 0, width: 640, height: 360 };
const POINT_RADIUS = 7;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const Geometry2DSimulation = ({ spec }: Geometry2DSimulationProps) => {
  const geometry = spec.geometry2d;
  const [points, setPoints] = useState<Record<string, SimulationPoint2D>>(() => Object.fromEntries(
    (geometry?.points || []).map(point => [point.id, point])
  ));
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [visibleHelpers, setVisibleHelpers] = useState(true);

  const viewBox = geometry?.viewBox || DEFAULT_VIEWBOX;
  const pointList = useMemo(() => Object.values(points), [points]);
  const getPoint = (id: string) => points[id];

  if (!geometry) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-700">
        Mô phỏng 2D chưa có dữ liệu hình học.
      </div>
    );
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!activePointId) return;
    const point = points[activePointId];
    if (!point?.draggable) return;

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = viewBox.minX + ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const y = viewBox.minY + ((event.clientY - rect.top) / rect.height) * viewBox.height;

    setPoints(prev => ({
      ...prev,
      [activePointId]: {
        ...prev[activePointId],
        x: clamp(x, viewBox.minX + 12, viewBox.minX + viewBox.width - 12),
        y: clamp(y, viewBox.minY + 12, viewBox.minY + viewBox.height - 12),
      },
    }));
  };

  const gridLines = [];
  if (geometry.showGrid) {
    for (let x = viewBox.minX; x <= viewBox.minX + viewBox.width; x += 40) {
      gridLines.push(<line key={`gx-${x}`} x1={x} y1={viewBox.minY} x2={x} y2={viewBox.minY + viewBox.height} stroke="#e2e8f0" strokeWidth={1} />);
    }
    for (let y = viewBox.minY; y <= viewBox.minY + viewBox.height; y += 40) {
      gridLines.push(<line key={`gy-${y}`} x1={viewBox.minX} y1={y} x2={viewBox.minX + viewBox.width} y2={y} stroke="#e2e8f0" strokeWidth={1} />);
    }
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">SVG Geometry 2D</p>
          <h3 className="text-lg font-black text-slate-900">{spec.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{spec.studentTask}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisibleHelpers(prev => !prev)}
          className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
        >
          {visibleHelpers ? 'Ẩn đường phụ' : 'Hiện đường phụ'}
        </button>
      </div>

      <svg
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        className="h-[360px] w-full touch-none rounded-2xl border border-slate-100 bg-slate-50"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setActivePointId(null)}
        onPointerLeave={() => setActivePointId(null)}
      >
        {gridLines}

        {(geometry.polygons || []).map(polygon => {
          const coords = polygon.pointIds.map(getPoint).filter(Boolean).map(point => `${point.x},${point.y}`).join(' ');
          return (
            <polygon
              key={polygon.id}
              points={coords}
              fill={polygon.fill || '#bfdbfe'}
              stroke={polygon.stroke || '#2563eb'}
              strokeWidth={2}
              opacity={polygon.opacity ?? 0.22}
            />
          );
        })}

        {(geometry.circles || []).map(circle => {
          const center = getPoint(circle.center);
          const through = circle.through ? getPoint(circle.through) : null;
          if (!center) return null;
          const radius = circle.radius ?? (through ? Math.hypot(through.x - center.x, through.y - center.y) : 50);
          return (
            <circle
              key={circle.id}
              cx={center.x}
              cy={center.y}
              r={radius}
              fill="none"
              stroke={circle.color || '#2563eb'}
              strokeWidth={2}
              strokeDasharray={circle.dashed ? '8 8' : undefined}
            />
          );
        })}

        {(geometry.segments || []).map(segment => {
          const from = getPoint(segment.from);
          const to = getPoint(segment.to);
          if (!from || !to) return null;
          const isHelper = segment.dashed;
          if (isHelper && !visibleHelpers) return null;
          return (
            <g key={segment.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={segment.color || '#1e293b'}
                strokeWidth={segment.width || 2.5}
                strokeLinecap="round"
                strokeDasharray={segment.dashed ? '9 8' : undefined}
              />
              {segment.label && (
                <text x={(from.x + to.x) / 2 + 8} y={(from.y + to.y) / 2 - 8} className="fill-slate-500 text-xs font-black">
                  {segment.label}
                </text>
              )}
            </g>
          );
        })}

        {pointList.map(point => (
          <g
            key={point.id}
            onPointerDown={event => {
              if (!point.draggable) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              setActivePointId(point.id);
            }}
            className={point.draggable ? 'cursor-grab active:cursor-grabbing' : ''}
          >
            <circle cx={point.x} cy={point.y} r={POINT_RADIUS} fill={point.color || '#2563eb'} stroke="#fff" strokeWidth={3} />
            <text x={point.x + 11} y={point.y - 11} className="select-none fill-slate-800 text-sm font-black">
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {spec.questions.map(question => (
          <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Câu hỏi quan sát</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{question.prompt}</p>
            <p className="mt-2 text-xs font-semibold text-blue-700">Gợi ý: {question.hint || question.expectedObservation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
