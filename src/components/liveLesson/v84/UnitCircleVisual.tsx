import type { PointerEvent } from 'react';
import type { PublicUnitCircleVisual } from '../../../lib/lessonRuntime/v84/mathVisual/publicVisual';
import { constrainAngle, unitCirclePosition } from '../../../lib/lessonRuntime/v84/mathVisual/unitCircle';

export const UnitCircleVisual = ({ visual, theta, onThetaChange }: {
  visual: PublicUnitCircleVisual;
  theta: number;
  onThetaChange?: (angleRad: number) => void;
}) => {
  const position = unitCirclePosition(theta);
  const visible = new Set(visual.visibleObjects);
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!onThetaChange) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rectangle.width, rectangle.height) / 240;
    if (!scale) return;
    const x = (event.clientX - rectangle.left - rectangle.width / 2) / scale;
    const y = (event.clientY - rectangle.top - rectangle.height / 2) / scale;
    onThetaChange(constrainAngle(Math.atan2(-y, x), { min: visual.model.minAngleRad, max: visual.model.maxAngleRad }));
  };
  const controlId = `${visual.visualId}-angle`;
  return <div className="v84-unit-circle" aria-label={visual.description}>
    <svg viewBox="-120 -120 240 240" role="img" aria-label={visual.description}
      onPointerDown={event => { if (!onThetaChange) return; event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerMove={event => { if (event.buttons) move(event); }}>
      {visible.has('axis_x') && <><line x1="-106" y1="0" x2="106" y2="0" className="v84-unit-circle__axis" /><text x="107" y="-6">x</text></>}
      {visible.has('axis_y') && <><line x1="0" y1="106" x2="0" y2="-106" className="v84-unit-circle__axis" /><text x="7" y="-105">y</text></>}
      {visible.has('circle') && <circle cx="0" cy="0" r="86" className="v84-unit-circle__circle" />}
      {visible.has('cos_projection') && <line x1="0" y1="0" x2={position.x * 86} y2="0" className="v84-unit-circle__projection" />}
      {visible.has('sin_projection') && <line x1={position.x * 86} y1="0" x2={position.x * 86} y2={-position.y * 86} className="v84-unit-circle__projection" />}
      {visible.has('point_P') && <>
        <line x1="0" y1="0" x2={position.x * 86} y2={-position.y * 86} className="v84-unit-circle__radius" />
        <circle cx={position.x * 86} cy={-position.y * 86} r="8" className="v84-unit-circle__point" />
        <text x={position.x * 86 + 11} y={-position.y * 86 - 9}>P</text>
      </>}
      <text x="5" y="15">O</text>
    </svg>
    {onThetaChange && <div className="v84-unit-circle__controls">
      <button type="button" onClick={() => onThetaChange(constrainAngle(theta - Math.PI / 12, { min: visual.model.minAngleRad, max: visual.model.maxAngleRad }))}>−15°</button>
      <label htmlFor={controlId}>Góc (độ)
        <input id={controlId} type="number" value={Math.round(theta * 180 / Math.PI)}
          onChange={event => { const degrees = Number(event.target.value); if (Number.isFinite(degrees)) onThetaChange(constrainAngle(degrees * Math.PI / 180, { min: visual.model.minAngleRad, max: visual.model.maxAngleRad })); }} />
      </label>
      <button type="button" onClick={() => onThetaChange(constrainAngle(theta + Math.PI / 12, { min: visual.model.minAngleRad, max: visual.model.maxAngleRad }))}>+15°</button>
    </div>}
  </div>;
};
