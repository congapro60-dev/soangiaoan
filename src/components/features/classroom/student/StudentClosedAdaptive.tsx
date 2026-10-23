import { useState } from 'react';
import { fetchStudentAdaptiveClosed, type StudentAdaptiveClosedResult } from '../../../../services/studentPortalApi';

export const StudentClosedAdaptive = ({ assignmentId }: { assignmentId: string }) => {
  const [data, setData] = useState<StudentAdaptiveClosedResult | null>(null);
  const [error, setError] = useState('');
  const open = async () => {
    setError('');
    try { setData(await fetchStudentAdaptiveClosed(assignmentId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được nhận xét.'); }
  };
  if (!data) return <>
    <button type="button" onClick={() => void open()} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 px-3 text-xs font-black text-green-800">Xem nhận xét và BTVN</button>
    {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
  </>;
  return <div className="w-full space-y-2 text-sm">
    <p className="font-black text-slate-900">Nhận xét của em</p>
    <ul className="list-disc space-y-1 pl-5">{data.feedback.map((line, i) => <li key={i}>{line}</li>)}</ul>
    <p className="font-black text-slate-900">Bài tập về nhà</p>
    {data.homework.length === 0 ? <p>Em không có bài tập thêm.</p> : <ol className="list-decimal space-y-2 pl-5">{data.homework.map(q => <li key={q.id}>{q.prompt}{q.options && <ul className="pl-4">{q.options.map((o, i) => <li key={i}>{o}</li>)}</ul>}</li>)}</ol>}
  </div>;
};
