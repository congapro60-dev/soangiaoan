import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, FileCheck2, Loader2, Upload } from 'lucide-react';
import type { HandMarkedEvidence, SubmissionDoc } from '../../../lib/classroom/types';
import { readHandMarkedFile, saveHandMarkedWork, setHandMarkedVisibility, uploadActorEvidence, type SubmissionActorCredentials } from '../../../services/submissionActorsApi';

interface Props { submission: SubmissionDoc; credentials: SubmissionActorCredentials; onChanged?: () => void; locked?: boolean }
const checkedHandMarkedUrl = (url:string) => {
  if(!['https://storage.googleapis.com','https://firebasestorage.googleapis.com'].includes(new URL(url).origin))throw new Error('Liên kết tệp không hợp lệ.');
  return url;
};
export const openHandMarkedWithGesture = async (tab:{location:{href:string};opener: unknown;close():void}|null, read:()=>Promise<{url:string;expiresAt:number}>) => {
  if(!tab) throw new Error('Trình duyệt chặn cửa sổ mới. Cho phép mở tệp để xem bản chấm tay.');
  try { tab.opener=null;const file=await read();tab.location.href=checkedHandMarkedUrl(file.url); }
  catch(reason){tab.close();throw reason;}
};
const HandMarkedImages = ({submission,credentials}:Props) => {
  const [preview,setPreview]=useState<{url:string;name:string}|null>(null);
  const [loading,setLoading]=useState(''),[error,setError]=useState('');
  const request=useRef(0);
  const parentPin=credentials.role==='parent'?credentials.pin:undefined;
  useEffect(()=>{request.current++;setPreview(null);setLoading('');setError('');return()=>{request.current++;};},[parentPin]);
  const show=async(file:HandMarkedEvidence['files'][number])=>{
    const ticket=++request.current;setPreview(null);setError('');setLoading(file.id);
    try{
      const grant=await readHandMarkedFile(credentials,submission.id,submission.handMarkedEvidence!.id,file.id);
      const url=checkedHandMarkedUrl(grant.url);
      if(request.current===ticket)setPreview({url,name:file.name});
    }catch(reason){if(request.current===ticket)setError(reason instanceof Error?reason.message:'Chưa mở được ảnh chấm tay.');}
    finally{if(request.current===ticket)setLoading('');}
  };
  return <div className="min-w-0 space-y-2">
    <div className="flex min-w-0 flex-wrap gap-2">{submission.handMarkedEvidence!.files.filter(file=>file.kind==='image').map(file=><button key={file.id} type="button" onClick={()=>void show(file)} className="min-h-11 min-w-0 max-w-full break-words rounded-lg border px-3 text-left text-sm font-bold text-sky-800">{loading===file.id?'Đang tải ảnh…':'Xem ảnh · '+file.name}</button>)}</div>
    {preview&&<figure className="min-w-0 space-y-2 rounded-lg border border-sky-100 p-2"><figcaption className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 break-words text-xs font-bold">{preview.name}</span><button type="button" onClick={()=>{request.current++;setPreview(null);}} className="min-h-11 shrink-0 px-3 text-sm font-bold text-sky-800">Đóng ảnh</button></figcaption><img src={preview.url} alt={'Bản chấm tay · '+preview.name} referrerPolicy="no-referrer" className="max-h-[70vh] w-full object-contain" onError={()=>{setPreview(null);setError('Ảnh chưa tải được hoặc liên kết đã hết hạn. Bấm xem ảnh để tải lại.');}}/></figure>}
    {error&&<p role="alert" className="break-words text-sm font-bold text-red-700">{error}</p>}
  </div>;
};
/** Teacher uploads/revokes publication. Student/parent receive no file URLs; opening a file requires a fresh scoped grant. */
export const HandMarkedWork = ({ submission, credentials, onChanged, locked = false }: Props) => {
  const teacher = credentials.role === 'teacher';
  const [files, setFiles] = useState<File[]>([]), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const evidence = submission.handMarkedEvidence;
  const actorIdentity=credentials.role==='parent'?credentials.studentId:credentials.role==='teacher'?credentials.classId+':'+credentials.studentId:submission.studentId;
  const upload = async () => {
    if (busy || locked || !files.length) return;
    setBusy(true); setError('');
    try {
      if (files.length > 12 || files.some(file => file.size <= 0 || file.size >= 20*1024*1024 || !(file.type.startsWith('image/') || file.type === 'application/pdf'))) throw new Error('Chọn từ 1 đến 12 ảnh hoặc PDF, mỗi tệp nhỏ hơn 20 MB.');
      const uploadGrantId = await uploadActorEvidence(credentials, submission.assignmentId || null, files, {purpose:'hand_marked',submissionId:submission.id});
      await saveHandMarkedWork(credentials, submission.id, uploadGrantId, note);
      if (!alive.current) return; setFiles([]);setNote('');onChanged?.();
    } catch(reason) { if(alive.current)setError(reason instanceof Error?reason.message:'Chưa lưu được bản chấm tay.'); }
    finally { if(alive.current)setBusy(false); }
  };
  const toggle = async (published:boolean) => {
    if (!teacher || !evidence || busy) return;
    setBusy(true);setError('');
    try { await setHandMarkedVisibility(credentials,submission.id,evidence.id,published); onChanged?.(); }
    catch(reason){setError(reason instanceof Error?reason.message:'Chưa đổi được trạng thái công bố.');}
    finally {setBusy(false);}
  };
  const open = async (file: HandMarkedEvidence['files'][number]) => {
    setError('');
    try { const tab=window.open('about:blank','_blank'); await openHandMarkedWithGesture(tab,()=>readHandMarkedFile(credentials,submission.id,evidence!.id,file.id)); }
    catch(reason){setError(reason instanceof Error?reason.message:'Chưa mở được tệp chấm tay.');}
  };
  if (!teacher && (!submission.handMarkedPublished || !evidence)) return null;
  return <section className="mt-3 min-w-0 space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3" aria-label="Bản chấm tay của giáo viên">
    <p className="flex items-center gap-2 text-sm font-black text-sky-950"><FileCheck2 className="h-4 w-4"/>Bản chấm tay của giáo viên</p>
    {teacher && <p className={'text-xs font-bold '+(submission.handMarkedPublished?'text-emerald-800':'text-slate-600')}>{submission.handMarkedPublished?'Đã công bố cho HS/PH':'Đang ẩn với HS/PH'}</p>}
    {teacher && <p className="text-xs font-semibold text-sky-900">Bản chấm tay độc lập điểm AI. Công bố ảnh có thể lộ điểm ghi tay trên giấy; cân nhắc trước khi bật.</p>}
    {evidence && <div className="min-w-0 space-y-2 rounded-lg bg-white p-3">
      <p className="text-xs font-bold text-slate-600">Bản {evidence.id.slice(-8)} · {new Date(evidence.createdAt).toLocaleString('vi-VN')} · nộp bởi {evidence.submittedBy.role === 'teacher'?'GV':evidence.submittedBy.role === 'parent'?'PH':'HS'}</p>
      {evidence.note && <p className="whitespace-pre-wrap text-sm">{evidence.note}</p>}
      <HandMarkedImages key={[submission.id,evidence.id,submission.handMarkedPublished,credentials.role,actorIdentity].join(':')} submission={submission} credentials={credentials}/>
      <div className="flex min-w-0 flex-wrap gap-2">{evidence.files.filter(file=>file.kind==='pdf').map(file=><button key={file.id} type="button" disabled={busy} onClick={()=>void open(file)} className="min-h-11 min-w-0 max-w-full break-words rounded-lg border px-3 text-left text-sm font-bold text-sky-800">Mở PDF · {file.name}</button>)}</div>
      {teacher && <button type="button" disabled={busy} onClick={()=>void toggle(!submission.handMarkedPublished)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold"><>{submission.handMarkedPublished?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}{submission.handMarkedPublished?'Ẩn bản chấm tay':'Cho HS/PH xem bản chấm tay'}</></button>}
    </div>}
    {teacher && <div className="flex flex-wrap items-center gap-2">
      <input ref={input} aria-label="Chọn ảnh hoặc PDF bản chấm tay" disabled={busy||locked} type="file" multiple accept="image/*,.pdf,application/pdf" className="hidden" onChange={event=>{setFiles(values=>[...values,...Array.from(event.target.files||[])]);event.target.value='';}}/>
      <button type="button" disabled={busy||locked} onClick={()=>input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-700 px-3 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4"/>Tải bản chấm tay</button>
      {!!files.length && <button type="button" disabled={busy||locked} onClick={()=>void upload()} className="min-h-11 rounded-lg border px-3 text-sm font-bold">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:'Lưu bản chấm tay ('+files.length+')'}</button>}
      {locked&&<p className="w-full text-xs font-semibold text-amber-800">Bài đã khóa chốt. Mở khóa để tải bản chấm tay mới; quyền xem bản hiện tại vẫn đổi được.</p>}
      {!!files.length&&<ul className="w-full space-y-1">{files.map((file,index)=><li key={index} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-words">{file.name}</span><button type="button" disabled={busy} onClick={()=>setFiles(values=>values.filter((_,number)=>number!==index))} className="min-h-11 px-2 font-bold text-red-700">Bỏ tệp {index+1}</button></li>)}</ul>}
      <label className="w-full text-xs font-semibold">Ghi chú bản chấm tay<input disabled={busy||locked} value={note} maxLength={2000} onChange={event=>setNote(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border px-2 text-sm"/></label>
    </div>}
    {error&&<p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
  </section>;
};
