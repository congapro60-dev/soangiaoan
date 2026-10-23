import { useEffect, useRef, useState } from 'react';
import type { SubmissionActorCredentials } from '../../../services/submissionActorsApi';
import { uploadActorEvidence, submitActorSubmission, actorGradeOne } from '../../../services/submissionActorsApi';
import { dataUrlToFile, nenAnhBaiLamToFile, detectAnswersFromFiles } from '../../../utils/imageCompress';
import { pdfToImages } from '../../../utils/pdfToImages';
interface Props { credentials: SubmissionActorCredentials; assignmentId: string; locked?: boolean; supplementOf?: string; handMarked?: boolean; onSubmitted: () => void; onClose?: () => void; /** Báo ra ngoài lúc đang nộp (để khoá chuyển sang em khác) và khi đã xong. */ onBusyChange?: (busy: boolean) => void }
/** Nhường khung hình cho trình duyệt vẽ giữa các tệp (điện thoại không bị "treo"). */
const choKhungHinh = () => new Promise<void>(resolve => { setTimeout(() => resolve(), 0); });

/**
 * Chuẩn bị tệp để tải lên.
 *
 * Trên điện thoại: ảnh nén THẲNG ra File (không qua base64) để không kẹt main thread;
 * PDF thì tách trang thành ảnh (pdf.js nặng nên báo tiến độ từng bước).
 */
export const prepareActorFiles = async (
  files: readonly File[],
  onProgress?: (message: string) => void,
): Promise<File[]> => {
  if (!files.length || files.length > 12) throw new Error('Chọn từ 1 đến 12 tệp bài làm.');
  const prepared: File[] = [];
  for (const [index, file] of files.entries()) {
    if (!file.size || file.size >= 20 * 1024 * 1024) throw new Error(`${file.name} phải nhỏ hơn 20 MB.`);
    onProgress?.(`Đang chuẩn bị ảnh ${index + 1}/${files.length}…`);
    await choKhungHinh();
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      const room = 12 - prepared.length - (files.length - index);
      if (room < 1) throw new Error('Không còn chỗ cho các trang PDF. Chọn ít tệp hơn rồi nộp tiếp.');
      onProgress?.(`Đang tách trang PDF ${index + 1}/${files.length}…`);
      const pages = await pdfToImages(file, undefined, false, undefined, { maxPages: room, rejectOverflow: true });
      if (!pages.length) throw new Error(`Không đọc được trang nào trong ${file.name}.`);
      prepared.push(...pages.map((page, number) => dataUrlToFile(page, `${file.name}-trang-${number + 1}.jpg`)), new File([file], file.name, { type: 'application/pdf' }));
    } else if (file.type.startsWith('image/')) prepared.push(await nenAnhBaiLamToFile(file));
    else throw new Error(`${file.name}: chỉ nhận ảnh hoặc PDF bài làm.`);
    if (prepared.length > 12) throw new Error('Bài vượt 12 tệp sau khi tách PDF. Tách bài thành các phần rồi nộp tiếp.');
  }
  return prepared;
};
/** Bằng chứng mới tạo revision, không ghi đè lượt cũ. */
export const ActorSubmissionUpload = ({ credentials, assignmentId, locked, supplementOf, handMarked, onSubmitted, onClose, onBusyChange }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const alive = useRef(true);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { const urls = files.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : ''); setPreviews(urls); return () => urls.forEach(url => { if (url) URL.revokeObjectURL(url); }); }, [files]);
  const themTep = (moi: File[]) => {
    if (!moi.length) return;
    setFiles(values => [...values, ...moi].slice(0, 12));
    setError('');
  };
  const submit = async () => {
    if (busy || locked || accepted || !files.length) return;
    setBusy(true); setError(''); setProgress('Đang chuẩn bị ảnh…');
    onBusyChange?.(true);
    try {
      const prepared = await prepareActorFiles(files, message => { if (alive.current) setProgress(message); });
      setProgress('Đang dò bóng tô…');
      await choKhungHinh();
      const detectedAnswers = await detectAnswersFromFiles(prepared);
      setProgress(`Đang tải ${prepared.length} tệp lên máy chủ…`);
      const grant = await uploadActorEvidence(credentials, assignmentId, prepared);
      setProgress('Đã tải xong — đang lưu bài nộp…');
      const payload = { assignmentId, uploadGrantId: grant, supplementOf, note, handMarked, detectedAnswers };
      const { submission } = await submitActorSubmission(credentials, payload);
      if (alive.current) { setAccepted(true); setFiles([]); setNote(''); }
      // Chấm NỀN: máy chấm sau, thầy không phải đứng chờ (điện thoại hay lag vì chờ AI).
      setProgress('Đã lưu bài. Máy đang chấm ở chế độ nền — thầy có thể đóng app, vài phút sau mở lại là thấy điểm.');
      try { await actorGradeOne(credentials, submission.id, 'quick', { background: true }); }
      catch { if (alive.current) setError('Bài đã lưu, máy chưa đọc được ngay. Theo dõi trạng thái bài; không cần nộp lại.'); }
      if (alive.current) onSubmitted();
    } catch (reason) { if (alive.current) { setError(reason instanceof Error ? reason.message : 'Chưa nộp được. Các tệp vẫn được giữ.'); setProgress(''); } }
    finally { if (alive.current) setBusy(false); onBusyChange?.(false); }
  };
  return <section className={`my-3 space-y-3 rounded-xl border p-3 ${handMarked ? 'border-emerald-200 bg-emerald-50/40' : 'border-indigo-200 bg-white'}`} aria-label={handMarked ? 'Nộp bài đã chấm tay' : 'Nộp bài hộ'}>
    <p className="text-sm font-black">{supplementOf ? 'Bổ sung vào bài đã nộp' : handMarked ? 'Nộp bài đã chấm tay của học sinh' : 'Nộp bài hộ học sinh'}</p>
    {handMarked && <p className="text-xs font-semibold text-emerald-800">Tải ảnh hoặc PDF bài làm đã có điểm/chữ đỏ của thầy cô. AI sẽ tự đọc điểm ghi tay làm điểm chính thức và tự duyệt bài.</p>}
    {locked ? <p role="status" className="text-sm font-bold text-amber-800">GV đã khóa chốt. Cần mở khóa trước khi nộp hoặc bổ sung.</p> : <>
      <div className="flex flex-wrap gap-2">
        {/* Nút CHỤP ẢNH riêng: mở thẳng camera sau trên iPhone (nút file chung chỉ mở thư viện ảnh). */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Chụp ảnh bài làm" onChange={event => { themTep(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-700 disabled:opacity-50">Chụp ảnh</button>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-700">
          Chọn ảnh / PDF
          <input type="file" aria-label="Chọn tệp bài làm" accept="image/*,application/pdf" multiple disabled={busy} onChange={event => { themTep(Array.from(event.target.files ?? [])); event.target.value = ''; }} className="sr-only" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">{files.map((file, index) => <div key={index} className="max-w-32 rounded-lg border p-2">{previews[index] && <img src={previews[index]} alt={`Ảnh chuẩn bị nộp ${index + 1}`} className="h-24 w-full object-contain" />}<p className="break-all text-xs">{file.name}</p><button type="button" disabled={busy} className="min-h-11 text-xs font-bold text-red-700" onClick={() => setFiles(values => values.filter((_, i) => i !== index))}>Bỏ tệp {index + 1}</button></div>)}</div>
      <label className="block text-xs font-bold">Ghi chú<textarea maxLength={2000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <button type="button" disabled={busy || accepted || !files.length} onClick={() => void submit()} className={`min-h-11 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50 ${handMarked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{busy ? 'Đang xử lý…' : handMarked ? 'Nộp bài đã chấm' : 'Nộp bài'}</button>
      {busy && <p role="status" className="text-xs font-bold text-slate-700">{progress || 'Đang xử lý…'}</p>}
    </>}
    {accepted && <p role="status" className="text-sm font-bold text-emerald-800">{progress || 'Bài đã lưu thành công. Theo dõi kết quả đọc trên bài vừa nộp.'}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {onClose && <button type="button" disabled={busy} onClick={onClose} className="ml-2 min-h-11 rounded-lg border px-3 text-sm font-bold">Đóng</button>}
  </section>;
};
