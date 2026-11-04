import type { PublicMathVisual } from '../../../lib/lessonRuntime/v84/mathVisual/publicVisual';
import { UnitCircleVisual } from './UnitCircleVisual';
import { TrigEquationVisual } from './TrigEquationVisual';
import { LiveLessonRichText } from '../LiveLessonRichText';

export const Geometry2DVisual = ({ visual }: { visual: Extract<PublicMathVisual, { renderer: 'geometry_2d' }> }) => {
  const points = Object.entries(visual.points);
  if (!points.length) return <p role="status">Chưa có đối tượng hình học ở bước này.</p>;
  const xs = points.map(([, point]) => point.x);
  const ys = points.map(([, point]) => -point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const padding = span * 0.18;
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + 2 * padding} ${maxY - minY + 2 * padding}`;
  return <svg className="v84-geometry2d" viewBox={viewBox} role="img" aria-label={visual.description}>
    {Object.entries(visual.segments).map(([id, segment]) => <line key={id}
      x1={segment.from.x} y1={-segment.from.y} x2={segment.to.x} y2={-segment.to.y}
      className="v84-geometry2d__segment" />)}
    {points.map(([id, point]) => <g key={id}>
      <circle cx={point.x} cy={-point.y} r={span * 0.018} className="v84-geometry2d__point" />
      <text x={point.x + span * 0.025} y={-point.y - span * 0.025} fontSize={span * 0.07}>{id}</text>
    </g>)}
  </svg>;
};

const SequenceVisual = ({ visual }: { visual: Extract<PublicMathVisual, { renderer: 'sequence' }> }) => {
  const points = visual.rows.slice(0, 12);
  const values = points.map(row => row.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(1, maxValue - minValue);
  return <div className="v84-sequence" aria-label={visual.description}>
    {visual.visibleObjects.includes('rows') && <div className="v84-sequence__table-wrap"><table>
      <caption className="sr-only">Chỉ số và số hạng của dãy</caption>
      <tbody>
        <tr><th scope="row">n</th>{points.map(row => <td key={`index-${row.index}`}>{row.index}</td>)}</tr>
        <tr><th scope="row">uₙ</th>{points.map(row => <td key={`value-${row.index}`}>{row.value}</td>)}</tr>
      </tbody>
    </table></div>}
    {visual.visibleObjects.includes('points') && <svg className="v84-sequence__plot" viewBox="0 0 520 230" role="img" aria-label="Đồ thị rời rạc của các số hạng">
      <line x1="32" y1="190" x2="500" y2="190" />
      <line x1="32" y1="190" x2="32" y2="25" />
      {points.map((row, index) => {
        const x = 55 + index * (points.length > 1 ? 420 / (points.length - 1) : 0);
        const y = 170 - (row.value - minValue) / span * 125;
        return <g key={row.index}><circle cx={x} cy={y} r="7" /><text x={x - 8} y="215">{row.index}</text></g>;
      })}
    </svg>}
    {visual.formula && <div className="v84-sequence__formula"><span>Quy tắc tổng quát</span>
      <LiveLessonRichText text={`$${visual.formula}$`} mathScale="tv" />
    </div>}
    {visual.rows.length > points.length && <p>Đang hiển thị {points.length} số hạng đầu trong {visual.rows.length} số hạng.</p>}
  </div>;
};

const renderers = {
  unit_circle: (visual: Extract<PublicMathVisual, { renderer: 'unit_circle' }>, theta?: number,
    onThetaChange?: (angleRad: number) => void) =>
    <UnitCircleVisual visual={visual} theta={theta ?? visual.model.defaultAngleRad} onThetaChange={onThetaChange} />,
  geometry_2d: (visual: Extract<PublicMathVisual, { renderer: 'geometry_2d' }>) =>
    <Geometry2DVisual visual={visual} />,
  sequence: (visual: Extract<PublicMathVisual, { renderer: 'sequence' }>) =>
    <SequenceVisual visual={visual} />,
  trig_equation: (visual: Extract<PublicMathVisual, { renderer: 'trig_equation' }>, locale: 'vi' | 'en' | 'ja') =>
    <TrigEquationVisual visual={visual} locale={locale} />,
};

export const MathVisualView = ({ visual, theta, onThetaChange, locale = 'vi' }: {
  visual: PublicMathVisual; theta?: number; onThetaChange?: (angleRad: number) => void; locale?: 'vi' | 'en' | 'ja';
}) => visual.renderer === 'unit_circle'
  ? renderers.unit_circle(visual, theta, onThetaChange)
  : visual.renderer === 'geometry_2d' ? renderers.geometry_2d(visual)
    : visual.renderer === 'trig_equation' ? renderers.trig_equation(visual, locale) : renderers.sequence(visual);
