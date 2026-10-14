import { useEffect, useRef, useState } from 'react';
import type { PhotoMark, QuestionResult, SubmissionGrade } from '../../../lib/classroom/types';
import { isClarifyPending } from '../../../lib/classroom/clarification';
import { QuestionDetail, questionAppearance } from './QuestionDetail';
interface Props {
  imageUrl: string; imageUrls?: string[]; alt: string; questionResults: readonly QuestionResult[];
  teacherView?: boolean; approved?: boolean; grade?: SubmissionGrade; hideScores?: boolean;
  pending?: boolean; selectedQuestion?: string; onSelectQuestion?: (questionNumber: string) => void;
  onFeedback?: (questionNumber?: string) => void; detailHidden?: boolean;
}
const filters = [['all', 'Tất cả'], ['correct', 'Đúng'], ['partial', 'Đúng một phần'], ['wrong', 'Cần sửa'], ['uncertain', 'Cần đối chiếu']] as const;
export const validPhotoRegion = (mark: PhotoMark, urls: readonly string[]) => !!mark && urls.includes(mark.imageUrl ?? '') && Number.isInteger(mark.imageIndex) && mark.imageIndex > 0
  && [mark.x, mark.y, mark.width, mark.height, mark.confidence].every(Number.isFinite) && mark.confidence >= .85 && mark.confidence <= 1
  && mark.x >= 0 && mark.y >= 0 && mark.width > 0 && mark.height > 0 && mark.x + mark.width <= 1 && mark.y + mark.height <= 1;
/** Câu và trang liên kết bằng vùng đã xác minh; không tạo tọa độ cho bài cũ. */
export const SubmissionPhotoReview = ({ imageUrl, imageUrls, alt, questionResults, teacherView = false, approved = false, grade, hideScores = false,
  pending = false, selectedQuestion, onSelectQuestion, onFeedback, detailHidden = false }: Props) => {
  const urls = [...new Set(imageUrls?.length ? imageUrls : [imageUrl])];
  const [page, setPage] = useState(Math.max(0, urls.indexOf(imageUrl)));
  const [active, setActive] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [showMarks, setShowMarks] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
  const canRead = teacherView || approved;
  const rows = canRead || pending ? questionResults : [];
  const index = selectedQuestion ? rows.findIndex(row => row.questionNumber === selectedQuestion) : active;
  const selected = index != null && index >= 0 ? rows[index] : undefined;
  const regions = rows.flatMap((result, resultIndex) => {
    if (result.photoMarksCleared || result.ignoredByTeacherInstruction || (!pending && !isClarifyPending(result) && !result.studentAnswer?.trim())) return [];
    const uncertain = pending || isClarifyPending(result);
    const marks = uncertain ? result.readingRegions : result.photoMarks;
    return (Array.isArray(marks) ? marks : []).filter(mark => validPhotoRegion(mark, urls)).slice(0, 3).map(mark => ({ mark, result, resultIndex, uncertain }));
  });
  const choose = (resultIndex: number) => {
    setActive(resultIndex); onSelectQuestion?.(rows[resultIndex].questionNumber);
    const region = regions.find(item => item.resultIndex === resultIndex);
    if (region) setPage(urls.indexOf(region.mark.imageUrl!));
  };
  const selectedRegionUrl = regions.find(item => item.result.questionNumber === selectedQuestion)?.mark.imageUrl;
  const selectedRegionPage = selectedRegionUrl ? urls.indexOf(selectedRegionUrl) : -1;
  useEffect(() => { if (selectedRegionPage >= 0) setPage(selectedRegionPage); }, [selectedQuestion, selectedRegionUrl, selectedRegionPage]);
  const url = urls[page] ?? imageUrl;
  useEffect(() => setFailed(false), [url]);
  const visibleRegions = regions.filter(item => item.mark.imageUrl === url && (filter === 'all' || questionAppearance(item.result).kind === filter || filter === 'uncertain' && item.result.needsTeacherReview));
  const visibleRows = rows.map((result, resultIndex) => ({ result, resultIndex })).filter(item => filter === 'all' || questionAppearance(item.result).kind === filter || filter === 'uncertain' && item.result.needsTeacherReview);
  return <section className="min-w-0 rounded-xl bg-white p-2 text-slate-700" aria-label={alt}>
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
      {canRead && grade && !pending && <p className="text-lg font-black text-slate-900">{hideScores ? 'Phân tích AI · điểm chính thức trong sổ điểm' : `Tổng điểm: ${grade.score}/${grade.maxScore}`}</p>}
      {teacherView && !approved && <p className="text-xs font-bold text-amber-700">Gợi ý AI · chờ GV duyệt</p>}
      {!teacherView && !approved && !pending && <p className="text-sm font-bold text-slate-600">Chờ GV duyệt · vẫn xem được ảnh đã nộp</p>}
      {approved && <p className="text-xs font-bold text-emerald-700">Đã duyệt</p>}
      {onFeedback && approved && <button type="button" className="ml-auto min-h-11 rounded-lg border border-indigo-200 px-3 text-sm font-bold text-indigo-700" onClick={() => onFeedback(selected?.questionNumber)}>Phản hồi bài chấm</button>}
    </div>
    <div className="mb-2 flex flex-wrap gap-2">
      {urls.length > 1 && <label className="text-sm font-bold">Trang ảnh <select aria-label="Trang ảnh" value={page} onChange={event => setPage(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg border p-2">{urls.map((_, number) => <option key={number} value={number}>{number + 1}/{urls.length}</option>)}</select></label>}
      <button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-bold" aria-pressed={zoom} onClick={() => setZoom(value => !value)}>{zoom ? 'Thu về 100%' : 'Phóng to 200%'}</button>
      {!!regions.length && <button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-bold" aria-pressed={showMarks} onClick={() => setShowMarks(value => !value)}>{showMarks ? 'Ẩn dấu trên ảnh' : 'Hiện dấu trên ảnh'}</button>}
    </div>
    {!detailHidden && !!rows.length && <div className="mb-3 flex flex-wrap gap-2" aria-label="Lọc loại câu">{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-lg border px-3 text-xs font-bold ${filter === value ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200'}`}>{label}</button>)}</div>}
    <div className={`grid min-w-0 gap-3 ${!detailHidden && rows.length ? 'md:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]' : ''}`}>
      <div className="min-w-0"><div ref={photoRef} className="max-h-[70vh] overflow-auto rounded-lg">
        {failed ? <p role="status" className="p-2 text-sm">Không tải được ảnh. Thử mở bản gốc bên dưới.</p> : <div className="relative" style={{ width: zoom ? '200%' : '100%' }}>
          <img src={url} alt={alt} loading="lazy" className="block h-auto w-full rounded-lg" onError={() => setFailed(true)} />
          {showMarks && !!visibleRegions.length && <><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {visibleRegions.map(({ mark, result, resultIndex, uncertain }, number) => <ellipse key={number} cx={(mark.x + mark.width / 2) * 100} cy={(mark.y + mark.height / 2) * 100} rx={mark.width * 50} ry={mark.height * 50} fill="none" stroke={questionAppearance(result).color} strokeDasharray={uncertain ? '5 3' : undefined} strokeWidth={index === resultIndex ? 3 : 2} vectorEffect="non-scaling-stroke" />)}
          </svg>{visibleRegions.map(({ mark, result, resultIndex }, number) => <button key={number} type="button" className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus:outline focus:outline-2 focus:outline-indigo-600"
            style={{ left: `clamp(22px, ${(mark.x + mark.width) * 100}%, calc(100% - 22px))`, top: `clamp(22px, ${mark.y * 100}%, calc(100% - 22px))` }} aria-label={`Dấu ${number + 1} · ${result.questionNumber}`} aria-expanded={index === resultIndex} onClick={() => choose(resultIndex)}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-white text-xs font-black text-white shadow" style={{ backgroundColor: questionAppearance(result).color }}>{number + 1}</span></button>)}</>}
        </div>}
      </div><a href={url} target="_blank" rel="noopener noreferrer" className="block min-h-11 break-words px-2 py-3 text-sm font-bold text-indigo-700 underline">Mở bản gốc</a></div>
      {!detailHidden && !!rows.length && <div className="min-w-0 space-y-3"><div className="max-h-64 space-y-1 overflow-y-auto" aria-label="Chọn câu để xem lời giải">{visibleRows.map(({ result, resultIndex }) => {
        const appearance = questionAppearance(result);
        return <button key={resultIndex} type="button" onClick={() => choose(resultIndex)} aria-expanded={index === resultIndex} className={`flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border p-2 text-left text-xs font-bold ${appearance.className}`}><span className="min-w-0 flex-1 break-words">{result.questionNumber}</span><span>{appearance.label}</span>{!hideScores && !pending && Number.isFinite(result.score) && <span>{result.score}/{result.maxScore}</span>}</button>;
      })}</div>{selected ? <div className="rounded-xl border border-slate-200 bg-slate-50" aria-live="polite"><QuestionDetail question={selected} hideScores={hideScores} pending={pending} />
        {!regions.some(item => item.resultIndex === index) && <p className="px-3 text-xs text-slate-500">Chưa có vị trí đủ chắc trên ảnh. Chọn trang ảnh rồi phóng to để đối chiếu.</p>}
        <button type="button" className="m-3 min-h-11 rounded-lg border px-3 text-sm font-bold" onClick={() => photoRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>Quay lại ảnh</button>
      </div> : <p className="text-sm text-slate-500">Chọn một câu hoặc dấu trên ảnh để xem lời giải.</p>}</div>}
    </div>
  </section>;
};
