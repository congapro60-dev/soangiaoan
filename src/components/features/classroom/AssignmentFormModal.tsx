import { useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { readSourceFile } from '../../../lib/classroom/readSourceFile';
import { solveAnswerKey, suggestRubric } from '../../../services/gradingApi';

export interface AssignmentFormValue {
  title: string;
  dueAt: string;
  maxScore: number;
  answerKey: string;
  rubric: string;
  /** File đề gửi cho học sinh xem. */
  deFiles: File[];
  /** Chữ rút từ file đề để AI dùng làm nguồn tham chiếu khi chấm. */
  sourceText: string;
  /** Ảnh đề/PDF scan chuẩn hoá để AI có thể đối chiếu khi chấm. */
  sourceImages: string[];
  /** Lệnh nội bộ của giáo viên cho AI khi chấm. */
  gradingInstructions: string;
  /** Ảnh đáp án khi không rút được chữ — gửi kèm mỗi lượt chấm. */
  answerKeyImages: string[];
  /** Đáp án do AI giải ra, ghi lại để sau này còn truy được nguồn. */
  answerKeyByAi: boolean;
}

interface Props {
  classId: string;
  className: string;
  dangGui: boolean;
  onClose: () => void;
  onSubmit: (value: AssignmentFormValue) => void;
}

const O = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white';

export const AssignmentFormModal = ({ classId, className, dangGui, onClose, onSubmit }: Props) => {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [answerKey, setAnswerKey] = useState('');
  const [rubric, setRubric] = useState('');
  const [deFiles, setDeFiles] = useState<File[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [gradingInstructions, setGradingInstructions] = useState('');
  const [answerKeyImages, setAnswerKeyImages] = useState<string[]>([]);
  const [ghiChu, setGhiChu] = useState<Record<string, string>>({});
  const [dangDoc, setDangDoc] = useState('');
  const [dangGiai, setDangGiai] = useState(false);
  const [choChuaChac, setChoChuaChac] = useState<string[]>([]);
  const [dapAnDoAi, setDapAnDoAi] = useState(false);
  const [dangSoanRubric, setDangSoanRubric] = useState(false);

  const deRef = useRef<HTMLInputElement>(null);
  const dapAnRef = useRef<HTMLInputElement>(null);
  const rubricRef = useRef<HTMLInputElement>(null);

  const docDeVaoBoNho = async (files: File[]) => {
    setDangDoc('de');
    try {
      const docs = await Promise.all(files.map(readSourceFile));
      const text = docs.map(d => d.text).filter(Boolean).join('\n\n').trim();
      setSourceText(text.slice(0, 60000));
      // Ảnh gốc đã nằm trong attachments; chỉ upload bản ảnh chuẩn hoá bổ sung cho PDF scan,
      // tránh gửi cùng một ảnh hai lần khi AI đọc ngữ cảnh.
      const scanImages = docs.flatMap((d, index) => {
        const isImage = /\.(png|jpe?g|webp)$/i.test(files[index]?.name || '');
        return isImage ? [] : d.images;
      });
      setSourceImages(scanImages.slice(0, 6));
      const notes = docs.map(d => d.note).filter(Boolean).join(' ');
      setGhiChu(truoc => ({ ...truoc, de: notes }));
    } catch (error) {
      setSourceText('');
      setSourceImages([]);
      setGhiChu(truoc => ({ ...truoc, de: error instanceof Error ? error.message : 'Không đọc được file đề.' }));
    } finally {
      setDangDoc('');
    }
  };

  const docFileVaoO = async (file: File, o: 'dapAn' | 'rubric') => {
    setDangDoc(o);
    try {
      const ket = await readSourceFile(file);
      if (ket.text) {
        if (o === 'dapAn') setAnswerKey(truoc => (truoc ? `${truoc}\n\n${ket.text}` : ket.text));
        else setRubric(truoc => (truoc ? `${truoc}\n\n${ket.text}` : ket.text));
      }
      if (ket.images.length > 0 && o === 'dapAn') {
        setAnswerKeyImages(truoc => [...truoc, ...ket.images]);
      }
      setGhiChu(truoc => ({ ...truoc, [o]: ket.note }));
    } catch (error) {
      setGhiChu(truoc => ({ ...truoc, [o]: error instanceof Error ? error.message : 'Không đọc được file.' }));
    } finally {
      setDangDoc('');
    }
  };

  /**
   * Nhờ AI giải đề khi giáo viên không có sẵn đáp án.
   *
   * Kết quả đổ vào ô để giáo viên SOÁT, không dùng thẳng. Một đáp án sai ở câu 5 làm cả lớp bị
   * chấm sai câu 5, rồi sai đó còn nhân tiếp vào hồ sơ học tập từng em.
   */
  const nhoAiGiaiDe = async () => {
    setDangGiai(true);
    setChoChuaChac([]);
    try {
      const doc = await Promise.all(deFiles.map(readSourceFile));
      const examText = doc.map(d => d.text).filter(Boolean).join('\n\n');
      const examImages = doc.flatMap(d => d.images);

      if (!examText.trim() && examImages.length === 0) {
        setGhiChu(truoc => ({ ...truoc, dapAn: 'Không đọc được nội dung đề. Nếu đề là PDF scan, chụp lại thành ảnh rồi tải lên.' }));
        return;
      }

      const ket = await solveAnswerKey(classId, examText, examImages, maxScore);
      setAnswerKey(ket.answerKey);
      setChoChuaChac(ket.uncertainties);
      setDapAnDoAi(true);
      setGhiChu(truoc => ({ ...truoc, dapAn: '' }));
    } catch (error) {
      setGhiChu(truoc => ({ ...truoc, dapAn: error instanceof Error ? error.message : 'Không giải được đề.' }));
    } finally {
      setDangGiai(false);
    }
  };

  /**
   * Hướng dẫn chấm KHÁC đáp án: đáp án nói kết quả đúng, hướng dẫn chấm nói cho bao nhiêu điểm
   * khi học sinh làm đúng một phần. Phải có đáp án trước thì mới chia điểm cho nó được.
   */
  const nhoAiSoanHuongDan = async () => {
    setDangSoanRubric(true);
    try {
      const ket = await suggestRubric(classId, answerKey, maxScore);
      setRubric(ket);
      setGhiChu(truoc => ({ ...truoc, rubric: 'AI soạn từ đáp án ở trên. Soát lại cách chia điểm cho khớp cách thầy cô vẫn chấm.' }));
    } catch (error) {
      setGhiChu(truoc => ({ ...truoc, rubric: error instanceof Error ? error.message : 'Không soạn được hướng dẫn chấm.' }));
    } finally {
      setDangSoanRubric(false);
    }
  };

  const NutTaiFile = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
      <Upload className="h-3.5 w-3.5" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Bài tập nộp ảnh</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Giao bài cho {className}</h3>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-black text-slate-700">Tên bài</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Phiếu bài tập §2 — Phương trình đường thẳng" className={O} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-black text-slate-700">Hạn nộp</label>
              <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className={O} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-black text-slate-700">Điểm tối đa</label>
              <input type="number" min={1} value={maxScore} onChange={e => setMaxScore(Number(e.target.value) || 10)} className={O} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-black text-slate-800">1. Đề gửi học sinh</p>
            <p className="mb-3 mt-1 text-xs font-semibold text-slate-500">
              PDF, ảnh hoặc Word. Học sinh mở được ngay trên điện thoại; phần chữ đọc được cũng trở thành nguồn tham chiếu cho AI.
              Bỏ trống nếu đề đã phát bản giấy.
            </p>
            <input ref={deRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                setDeFiles(files);
                setSourceText('');
                setSourceImages([]);
                if (files.length > 0) void docDeVaoBoNho(files);
              }} />
            <NutTaiFile onClick={() => deRef.current?.click()} label={dangDoc === 'de' ? 'Đang đọc file đề...' : 'Chọn file đề'} />
            {deFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {deFiles.map(f => (
                  <li key={f.name} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <FileText className="h-3.5 w-3.5" /> {f.name}
                  </li>
                ))}
                </ul>
            )}
            {ghiChu.de && <p className="mt-2 text-xs font-bold text-amber-700">{ghiChu.de}</p>}
            {sourceText && <p className="mt-2 text-xs font-bold text-emerald-700">Đã rút được phần chữ của đề để AI đối chiếu khi chấm.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-800">2. Đáp án chuẩn</p>
              <input ref={dapAnRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void docFileVaoO(f, 'dapAn'); }} />
              <div className="flex flex-wrap gap-2">
                <NutTaiFile onClick={() => dapAnRef.current?.click()} label={dangDoc === 'dapAn' ? 'Đang đọc file...' : 'Tải file đáp án'} />
                <button
                  type="button"
                  onClick={nhoAiGiaiDe}
                  disabled={deFiles.length === 0 || dangGiai}
                  title={deFiles.length === 0 ? 'Tải file đề ở mục 1 trước đã' : 'AI đọc đề rồi tự giải ra đáp án nháp'}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                >
                  {dangGiai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {dangGiai ? 'AI đang giải đề...' : 'Để AI giải đề'}
                </button>
              </div>
            </div>
            <p className="mb-2 mt-1 text-xs font-semibold text-slate-500">
              Đây là thứ AI dùng làm mốc chấm, KHÔNG gửi cho học sinh. Tải file lên thì app đọc chữ ra ô dưới để thầy cô soát lại.
            </p>
            <textarea value={answerKey} onChange={e => setAnswerKey(e.target.value)} rows={5}
              placeholder="Để trống thì AI phải tự đọc đề trong ảnh từng em rồi tự giải — kém chắc chắn và tốn hơn."
              className={`${O} font-normal`} />
            {ghiChu.dapAn && <p className="mt-1 text-xs font-bold text-amber-700">{ghiChu.dapAn}</p>}
            {dapAnDoAi && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-xs font-black text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Đáp án này do AI giải, chưa ai kiểm. Soát lại trước khi giao — sai một câu ở đây là cả lớp bị chấm sai câu đó.
                </p>
                {choChuaChac.length > 0 && (
                  <>
                    <p className="mt-2 text-xs font-black text-amber-900">AI tự báo chưa chắc ở:</p>
                    <ul className="mt-1 list-inside list-disc text-xs font-semibold text-amber-800">
                      {choChuaChac.map(x => <li key={x}>{x}</li>)}
                    </ul>
                  </>
                )}
              </div>
            )}
            {answerKeyImages.length > 0 && (
              <p className="mt-1 text-xs font-bold text-slate-500">Đã đính {answerKeyImages.length} ảnh đáp án.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-800">3. Hướng dẫn chấm</p>
              <input ref={rubricRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void docFileVaoO(f, 'rubric'); }} />
              <div className="flex flex-wrap gap-2">
                <NutTaiFile onClick={() => rubricRef.current?.click()} label={dangDoc === 'rubric' ? 'Đang đọc file...' : 'Tải file hướng dẫn'} />
                <button
                  type="button"
                  onClick={nhoAiSoanHuongDan}
                  disabled={!answerKey.trim() || dangSoanRubric}
                  title={!answerKey.trim() ? 'Cần có đáp án ở mục 2 trước đã' : 'AI chia điểm thành phần dựa trên đáp án ở mục 2'}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                >
                  {dangSoanRubric ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {dangSoanRubric ? 'AI đang soạn...' : 'Để AI đề xuất'}
                </button>
              </div>
            </div>
            <p className="mb-2 mt-1 text-xs font-semibold text-slate-500">
              Không bắt buộc — thiếu thì AI vẫn chấm, nhưng cách chia điểm thành phần là do nó tự quyết.
              Có mục này thì mọi em được chia điểm theo cùng một cách. VD: sai dấu trừ 0,25.
            </p>
            <textarea value={rubric} onChange={e => setRubric(e.target.value)} rows={3} className={`${O} font-normal`} />
            {ghiChu.rubric && <p className="mt-1 text-xs font-bold text-amber-700">{ghiChu.rubric}</p>}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm font-black text-slate-800">4. Lệnh riêng cho AI khi chấm (không bắt buộc)</p>
            <p className="mb-2 mt-1 text-xs font-semibold text-slate-600">
              Viết thật rõ phạm vi: “Chỉ chấm Câu 1, 3”, “Bỏ qua Bài 2”, “Không trừ điểm phần bị bỏ qua”.
              Lệnh này chỉ dùng nội bộ khi chấm, không hiện cho học sinh.
            </p>
            <textarea
              value={gradingInstructions}
              onChange={e => setGradingInstructions(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Chỉ dùng Câu 1 và Câu 3; bỏ qua phần trắc nghiệm; không tự suy ra câu ngoài đề."
              className={`${O} bg-white font-normal`}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="rounded-2xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50">Hủy</button>
          <button
            onClick={() => onSubmit({ title: title.trim(), dueAt, maxScore, answerKey: answerKey.trim(), rubric: rubric.trim(), deFiles, sourceText, sourceImages, gradingInstructions: gradingInstructions.trim(), answerKeyImages, answerKeyByAi: dapAnDoAi })}
            disabled={!title.trim() || dangGui || dangDoc !== ''}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {dangGui && <Loader2 className="h-4 w-4 animate-spin" />}
            {dangGui ? 'Đang giao bài...' : 'Giao bài'}
          </button>
        </div>
      </div>
    </div>
  );
};
