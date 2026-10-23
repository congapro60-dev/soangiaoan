import type { PublicTrigEquationVisual } from '../../../lib/lessonRuntime/v84/mathVisual/publicVisual';
import { unitCirclePosition } from '../../../lib/lessonRuntime/v84/mathVisual/unitCircle';
import { angleLatex, numberLatex } from '../../../lib/lessonRuntime/v84/mathVisual/trigNotation';
import { LiveLessonRichText } from '../LiveLessonRichText';

const labels = {
  vi: { roots: 'Nghiệm gần đúng (rad)', families: 'Họ nghiệm trên tập số thực', empty: 'Không có nghiệm trong miền đã chọn.',
    domain: 'Miền xét (rad)', poles: 'Loại các góc làm hàm số không xác định.' },
  en: { roots: 'Approximate roots (rad)', families: 'Solution families over the real numbers', empty: 'No roots in the selected interval.',
    domain: 'Interval (rad)', poles: 'Exclude angles where the function is undefined.' },
  ja: { roots: '近似解（rad）', families: '実数全体での一般解', empty: '指定した区間に解はありません。',
    domain: '区間（rad）', poles: '関数が定義されない角を除きます。' },
};

export const TrigEquationVisual = ({ visual, locale = 'vi' }: {
  visual: PublicTrigEquationVisual; locale?: keyof typeof labels;
}) => {
  const copy = labels[locale];
  const { fn, value, minAngleRad, maxAngleRad, includeMin, includeMax } = visual.model;
  const visible = new Set(visual.visibleObjects);
  const roots = visible.has('solution_points') ? visual.roots : undefined;
  const families = visible.has('solution_families') ? visual.families : undefined;
  const points = [...new Map((roots ?? []).map(root => {
    const point = unitCirclePosition(root);
    return [`${point.x.toFixed(10)}:${point.y.toFixed(10)}`, point] as const;
  })).values()];
  return <section className="v84-trig-equation" aria-label={visual.description}>
    <header className="v84-trig-equation__header">
      <LiveLessonRichText text={`$\\${fn} x = ${numberLatex(value, locale)}$`} />
      <div className="v84-trig-equation__domain"><span>{copy.domain}:</span>
        <LiveLessonRichText text={`$${includeMin ? '[' : '('}${angleLatex(minAngleRad, locale)}; ${angleLatex(maxAngleRad, locale)}${includeMax ? ']' : ')'}$`} />
      </div>
    </header>
    <svg viewBox="-122 -122 244 244" role="img" aria-label={visual.description}>
      {visible.has('axes') && <g className="v84-trig-equation__axes">
        <line x1="-110" y1="0" x2="110" y2="0" /><line x1="0" y1="-110" x2="0" y2="110" />
        <text x="111" y="-7">x</text><text x="8" y="-106">y</text><text x="5" y="16">O</text>
      </g>}
      {visible.has('circle') && <circle className="v84-trig-equation__circle" r="86" />}
      {points.map((point, index) => <g key={index}>
        <line className="v84-trig-equation__radius" x1="0" y1="0" x2={86 * point.x} y2={-86 * point.y} />
        <circle data-solution-point={index} className="v84-trig-equation__point" cx={86 * point.x} cy={-86 * point.y} r="6" />
      </g>)}
    </svg>
    {(fn === 'tan' || fn === 'cot') && <p>{copy.poles}</p>}
    {roots && <div className="v84-trig-equation__roots">
      <p>{roots.length ? copy.roots : copy.empty}</p>
      {roots.length > 0 && <ul>{roots.map(root => <li key={root}>{root.toLocaleString(locale, { maximumFractionDigits: 6 })}</li>)}</ul>}
    </div>}
    {families && families.length > 0 && <div className="v84-trig-equation__families">
      <p>{copy.families}</p>
      {families.map(family => <LiveLessonRichText key={family.offsetLatex}
        text={`$x=${locale === 'vi' ? family.offsetLatex.replaceAll('.', '{,}') : family.offsetLatex}+${family.period === Math.PI ? '' : '2'}k\\pi$`} />)}
      <LiveLessonRichText className="v84-trig-equation__integer-condition" text={'$k\\in\\mathbb{Z}$'} />
    </div>}
  </section>;
};
