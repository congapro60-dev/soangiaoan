import { useEffect, useRef, useState } from 'react';
import type { SubmissionActorCredentials } from '../../../services/submissionActorsApi';
import { uploadActorEvidence, submitActorSubmission, actorGradeOne } from '../../../services/submissionActorsApi';
import { nenAnhBaiLam } from '../../../utils/imageCompress';
import { pdfToImages } from '../../../utils/pdfToImages';
interface Props { credentials: SubmissionActorCredentials; assignmentId: string; locked?: boolean; supplementOf?: string; onSubmitted: () => void; onClose?: () => void }
const dataUrlFile = (data: string, name: string) => {
  const match = data.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error('Không tạo được ảnh bài làm. Chọn ảnh rồi thử lại.');
  return new File([Uint8Array.from(atob(match[2]), value => value.charCodeAt(0))], name, { type: match[1] });
};
/** ponytail: upload grants allow 12 files; keep PDF original, reject excess instead of dropping pages. */
export const prepareActorFiles = async (files: readonly File[]): Promise<File[]> => {
  if (!files.length || files.length > 12) throw new Error('Chọn từ 1 đến 12 tệp bài làm.');
  const prepared: File[] = [];
  for (const [index, file] of files.entries()) {
    if (!file.size || file.size >= 20 * 1024 * 1024) throw new Error(`${file.name} phải nhỏ hơn 20 MB.`);
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      const room = 12 - prepared.length - (files.length - index);
      if (room < 1) throw new Error('Không còn chỗ cho các trang PDF. Chọn ít tệp hơn rồi nộp tiếp.');
      const pages = await pdfToImages(file, undefined, false, undefined, { maxPages: room, rejectOverflow: true });
      if (!pages.length) throw new Error(`Không đọc được trang nào trong ${file.name}.`);
      prepared.push(...pages.map((page, number) => dataUrlFile(page, `${file.name}-trang-${number + 1}.jpg`)), new File([file], file.name, { type: 'application/pdf' }));
    } else if (file.type.startsWith('image/')) prepared.push(dataUrlFile(await nenAnhBaiLam(file), file.name));
    else throw new Error(`${file.name}: chỉ nhận ảnh hoặc PDF bài làm.`);
    if (prepared.length > 12) throw new Error('Bài vượt 12 tệp sau khi tách PDF. Tách bài thành các phần rồi nộp tiếp.');
  }
  return prepared;
};
/** Bằng chứng mới tạo revision, không ghi đè lượt cũ. */
export const ActorSubmissionUpload = ({ credentials, assignmentId, locked, supplementOf, onSubmitted, onClose }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { const urls = files.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : ''); setPreviews(urls); return () => urls.forEach(url => { if (url) URL.revokeObjectURL(url); }); }, [files]);
  const submit = async () => {
    if (busy || locked || accepted || !files.length) return;
    setBusy(true); setError('');
    try {
      const prepared = await prepareActorFiles(files);
      const grant = await uploadActorEvidence(credentials, assignmentId, prepared);
      const { submission } = await submitActorSubmission(credentials, { assignmentId, uploadGrantId: grant, supplementOf, note });
      if (alive.current) { setAccepted(true); setFiles([]); setNote(''); }
      // Bản nộp đã lưu ngay cả khi lượt đọc AI tạm lỗi.
      try { await actorGradeOne(credentials, submission.id); } catch { if (alive.current) setError('Bài đã lưu, máy chưa đọc được ngay. Theo dõi trạng thái bài; không cần nộp lại.'); }
      if (alive.current) onSubmitted();
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Chưa nộp được. Các tệp vẫn được giữ.'); }
    finally { if (alive.current) setBusy(false); }
  };
  return <section className="my-3 space-y-3 rounded-xl border border-indigo-200 bg-white p-3" aria-label="Nộp bài hộ">
    <p className="text-sm font-black">{supplementOf ? 'Bổ sung vào bài đã nộp' : 'Nộp bài hộ học sinh'}</p>
    {locked ? <p role="status" className="text-sm font-bold text-amber-800">GV đã khóa chốt. Cần mở khóa trước khi nộp hoặc bổ sung.</p> : <>
      <label className="block text-xs font-bold">Ảnh / PDF bài làm<input type="file" aria-label="Chọn tệp bài làm" accept="image/*,application/pdf" multiple disabled={busy} onChange={event => { setFiles(values => [...values, ...Array.from(event.target.files ?? [])]); event.target.value = ''; }} className="mt-2 block w-full text-sm" /></label>
      <div className="flex flex-wrap gap-2">{files.map((file, index) => <div key={index} className="max-w-32 rounded-lg border p-2">{previews[index] && <img src={previews[index]} alt={`Ảnh chuẩn bị nộp ${index + 1}`} className="h-24 w-full object-contain" />}<p className="break-all text-xs">{file.name}</p><button type="button" disabled={busy} className="min-h-11 text-xs font-bold text-red-700" onClick={() => setFiles(values => values.filter((_, i) => i !== index))}>Bỏ tệp {index + 1}</button></div>)}</div>
      <label className="block text-xs font-bold">Ghi chú<textarea maxLength={2000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <button type="button" disabled={busy || accepted || !files.length} onClick={() => void submit()} className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang nộp / đọc bài…' : 'Nộp bài'}</button>
    </>}
    {accepted && <p role="status" className="text-sm font-bold text-emerald-800">Bài đã lưu thành công. Theo dõi kết quả đọc trên bài vừa nộp.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {onClose && <button type="button" disabled={busy} onClick={onClose} className="ml-2 min-h-11 rounded-lg border px-3 text-sm font-bold">Đóng</button>}
  </section>;
};
