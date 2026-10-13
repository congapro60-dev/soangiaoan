import { useEffect, useId, useRef, useState } from 'react';
import type { PhotoMark, QuestionResult } from '../../../lib/classroom/types';
import { isClarifyPending } from '../../../lib/classroom/clarification';
import { NhanXetMarkdown } from './NhanXetMarkdown';

interface Props {
  imageUrl: string;
  alt: string;
  questionResults: readonly QuestionResult[];
  teacherView?: boolean;
  approved?: boolean;
}

/** Tọa độ nằm trên ảnh co giãn tự nhiên, không phủ vào khoảng trắng của object-fit. */
export const SubmissionPhotoReview = ({ imageUrl, alt, questionResults, teacherView = false, approved = false }: Props) => {
  const [showMarks, setShowMarks] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const detailId = useId();
  const marks = (teacherView || approved) ? questionResults.flatMap(result => {
    if (result.photoMarksCleared || isClarifyPending(result) || result.ignoredByTeacherInstruction || !result.studentAnswer?.trim() || !['incorrect', 'partially_correct'].includes(result.status)) return [];
    return (Array.isArray(result.photoMarks) ? result.photoMarks : []).filter((mark): mark is PhotoMark =>
      !!mark && typeof mark === 'object' && mark.imageUrl === imageUrl && Number.isInteger(mark.imageIndex) && mark.imageIndex > 0
      && [mark.x, mark.y, mark.width, mark.height, mark.confidence].every(Number.isFinite)
      && mark.confidence >= .85 && mark.confidence <= 1 && mark.x >= 0 && mark.y >= 0
      && mark.width > 0 && mark.height > 0 && mark.x + mark.width <= 1 && mark.y + mark.height <= 1,
    ).slice(0, 3).map(mark => ({ mark, result }));
  }) : [];
  const selected = showMarks && !failed && active !== null ? marks[active] : undefined;
  const hasSelected = Boolean(selected);

  useEffect(() => {
    if (hasSelected && window.matchMedia('(max-width: 639px)').matches) {
      detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [active, hasSelected, imageUrl]);

  return <section className="min-w-0 rounded-xl bg-white p-2 text-slate-700" aria-label={alt}>
    {!!marks.length && !failed && <div className="mb-2 flex flex-wrap items-center gap-2">
      <button type="button" className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700"
        aria-pressed={showMarks} onClick={() => { setShowMarks(value => !value); setActive(null); }}>
        {showMarks ? 'Ẩn dấu đỏ' : 'Hiện dấu đỏ'}
      </button>
      <button type="button" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold"
        aria-pressed={zoom} onClick={() => setZoom(value => !value)}>{zoom ? 'Thu về 100%' : 'Phóng to 200%'}</button>
      {teacherView && !approved && <p className="text-xs font-bold text-amber-700">Gợi ý AI · chờ GV duyệt</p>}
    </div>}
    <div ref={photoRef} className="overflow-auto rounded-lg">
      {failed ? <p role="status" className="p-2 text-sm">Không tải được ảnh. Em thử mở bản gốc bên dưới.</p>
        : <div className="relative" style={{ width: zoom ? '200%' : '100%' }}>
          <img src={imageUrl} alt={alt} loading="lazy" className="block h-auto w-full rounded-lg" onError={() => setFailed(true)} />
          {showMarks && !!marks.length && <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {marks.map(({ mark }, index) => <ellipse key={index} cx={(mark.x + mark.width / 2) * 100} cy={(mark.y + mark.height / 2) * 100}
                rx={mark.width * 50} ry={mark.height * 50} fill="none" stroke="#dc2626" strokeWidth={active === index ? 3 : 2} vectorEffect="non-scaling-stroke" />)}
            </svg>
            {marks.map(({ mark, result }, index) => <button key={index} type="button" ref={active === index ? markerRef : undefined}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
              style={{ left: `clamp(22px, ${(mark.x + mark.width) * 100}%, calc(100% - 22px))`, top: `clamp(22px, ${mark.y * 100}%, calc(100% - 22px))` }}
              aria-label={`Dấu ${index + 1} · ${result.questionNumber}`} aria-controls={detailId} aria-expanded={active === index}
              onClick={() => setActive(index)}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-red-700 text-xs font-black text-white shadow">{index + 1}</span></button>)}
          </>}
        </div>}
    </div>
    {showMarks && !!marks.length && !failed && <div className="mt-2 flex flex-wrap gap-2" aria-label="Chọn dấu để xem lời chữa">
      {marks.map(({ result }, index) => <button key={index} type="button" aria-controls={detailId} aria-expanded={active === index}
        onClick={() => setActive(index)} className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${active === index ? 'border-red-600 bg-red-50 text-red-800' : 'border-slate-200'}`}>
        Dấu {index + 1} · {result.questionNumber}
      </button>)}
    </div>}
    {selected && <div id={detailId} ref={detailRef} className="mt-3 space-y-3 rounded-xl border border-red-200 bg-red-50 p-3" aria-live="polite">
      <p className="text-sm font-black text-red-800">{selected.result.questionNumber}</p>
      {([
        ['Bài làm của em', selected.result.studentAnswer],
        ['Vì sao cần sửa', selected.result.explanation],
        ['Cách sửa', selected.result.correction],
      ] as const).map(([label, value]) => value?.trim() && <div key={label}>
        <p className="text-xs font-bold text-red-800">{label}</p><NhanXetMarkdown>{value}</NhanXetMarkdown>
      </div>)}
      <button type="button" className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-800"
        onClick={() => (markerRef.current ?? photoRef.current)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })}>Quay lại ảnh</button>
    </div>}
    <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block min-h-11 break-words px-2 py-3 text-sm font-bold text-indigo-700 underline">Mở bản gốc</a>
  </section>;
};
