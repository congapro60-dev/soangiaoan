import { useRef } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { X, BookOpen, Download, Printer } from 'lucide-react';
import { ExamQuestion, QuestionType } from '../../../types';
import { ensureMathWrapped, getOptionCols, parseTFSub } from '../../../utils/examScoring';

interface Props {
  questions: ExamQuestion[];
  title: string;
  onClose: () => void;
  schoolName?: string;
  subjectName?: string;
  gradeName?: string;
  durationMinutes?: number;
  examCode?: string;
}

const SECTION_LABELS: Record<string, string> = {
  multiple_choice: 'PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
  true_false:      'PHẦN II. TRẮC NGHIỆM ĐÚNG SAI',
  short_answer:    'PHẦN III. TRẢ LỜI NGẮN',
  essay:           'PHẦN IV. TỰ LUẬN',
};

const SECTION_SUBTITLES: Record<string, string> = {
  multiple_choice: 'Mỗi câu hỏi chỉ chọn một phương án trả lời đúng.',
  true_false:      'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
  short_answer:    'Thí sinh điền đáp án vào ô tương ứng.',
  essay:           'Thí sinh trình bày bài làm chi tiết.',
};

const TYPE_ORDER: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer', 'essay'];

const TF_LABELS = ['a', 'b', 'c', 'd'];

export const StudentPreviewModal = ({
  questions,
  title,
  onClose,
  schoolName    = 'TRƯỜNG THPT CHUYÊN MẪU',
  subjectName   = 'TOÁN',
  gradeName     = '12',
  durationMinutes = 90,
  examCode      = '102',
}: Props) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // ── Số câu toàn cục ───────────────────────────────────────────────────────
  const globalNum: Record<string, number> = {};
  let counter = 1;
  for (const type of TYPE_ORDER) {
    for (const q of questions.filter(q => q.type === type)) {
      globalNum[q.id] = counter++;
    }
  }

  // ── Xuất PDF qua window.print() ───────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Xuất PDF qua html2pdf.js (tải về file) ────────────────────────────────
  const handleExportPdf = async () => {
    const el = printAreaRef.current;
    if (!el) return;

    // Lazy-load html2pdf để không ảnh hưởng bundle size khi không cần
    try {
      const html2pdf = (await import('html2pdf.js' as any)).default;
      const opt = {
        margin:      [15, 15, 15, 15],            // mm
        filename:    `de_thi_${examCode}.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          // Quan trọng: dùng toàn bộ chiều dài thực để tránh mất nội dung
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(el).save();
    } catch {
      // html2pdf chưa được cài – fallback về window.print()
      window.print();
    }
  };

  // ── Render đáp án MCQ ─────────────────────────────────────────────────────
  const renderMCQOptions = (q: ExamQuestion) => {
    if (!q.options) return null;
    const cols = getOptionCols(q.options);
    const maxLen = Math.max(...q.options.map(o => o.replace(/\$[^$]*\$/g, 'M').length));
    const colClass =
      maxLen > 60 ? 'longest' :
      maxLen > 30 || cols <= 2 ? 'long-option' : '';

    return (
      <div className={`options-grid ${colClass}`}
           style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded border border-gray-200">
            <span className="font-bold shrink-0 text-[12pt]">{'ABCD'[i]})</span>
            <div className="prose prose-sm max-w-none text-[12pt]">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {ensureMathWrapped(opt)}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Render ý đúng/sai ─────────────────────────────────────────────────────
  const renderTFOptions = (q: ExamQuestion) => {
    if (!q.options) return null;
    return (
      <div className="space-y-2 mt-2 pl-2">
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 text-[12pt]">
            <span className="font-bold shrink-0">{TF_LABELS[i]})</span>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {ensureMathWrapped(opt)}
              </ReactMarkdown>
            </div>
            <span className="ml-auto text-gray-400 text-xs no-print">[Đ / S]</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Đáp án ───────────────────────────────────────────────────────────────
  const renderAnswerKey = () => {
    const mc = questions.filter(q => q.type === 'multiple_choice');
    const tf = questions.filter(q => q.type === 'true_false');
    const sa = questions.filter(q => q.type === 'short_answer');

    return (
      <div className="answer-section">
        <h2 className="text-base font-bold uppercase text-center border-b-2 border-black pb-2 mb-4">
          ĐÁP ÁN – MÃ ĐỀ {examCode}
        </h2>

        {mc.length > 0 && (
          <div className="mb-4">
            <p className="font-bold mb-2 text-[11pt]">Phần I – Trắc nghiệm:</p>
            <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-[11pt]">
              {mc.map(q => (
                <div key={q.id} className="flex gap-2">
                  <span className="font-bold">Câu {globalNum[q.id]}:</span>
                  <span className="font-bold text-blue-700">{q.correctAnswer || '?'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tf.length > 0 && (
          <div className="mb-4">
            <p className="font-bold mb-2 text-[11pt]">Phần II – Đúng/Sai:</p>
            {tf.map(q => {
              const ans = parseTFSub(q.correctAnswer || '');
              return (
                <div key={q.id} className="flex gap-4 text-[11pt] mb-1">
                  <span className="font-bold">Câu {globalNum[q.id]}:</span>
                  {TF_LABELS.map(l => (
                    <span key={l}>{l}) <strong>{ans[l] || '?'}</strong></span>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {sa.length > 0 && (
          <div className="mb-4">
            <p className="font-bold mb-2 text-[11pt]">Phần III – Trả lời ngắn:</p>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[11pt]">
              {sa.map(q => (
                <div key={q.id} className="flex gap-2">
                  <span className="font-bold">Câu {globalNum[q.id]}:</span>
                  <span className="font-bold text-blue-700">{q.correctAnswer || '?'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col bg-white"
      style={{ overflow: 'hidden' }}
    >
      {/* ── Header Bar (web only) ── */}
      <div className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase leading-tight">Góc nhìn Thí sinh</h2>
            <p className="text-[10px] text-slate-400">Nhấn "In / PDF" để xuất đề chuẩn MOET</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* window.print() – vector, tốt nhất cho công thức LaTeX */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all"
          >
            <Printer className="w-4 h-4" /> In / PDF
          </button>

          {/* html2pdf – tải về file PDF */}
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
          >
            <Download className="w-4 h-4" /> Tải PDF
          </button>

          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Nội dung đề thi (scrollable trên web) ── */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6 print:p-0 print:overflow-visible print:bg-white">

        {/* Vùng nội dung sẽ được html2pdf render */}
        <div ref={printAreaRef} className="exam-paper pdf-export-root max-w-[210mm] mx-auto print:max-w-full">

          {/* MOET Standard Header */}
          <div className="grid grid-cols-2 gap-4 mb-6 border-b-2 border-black pb-4">
            <div className="text-center text-[11pt]">
              <p className="font-bold uppercase">SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HÀ NỘI</p>
              <p className="font-bold uppercase border-b border-black w-fit mx-auto pb-0.5">{schoolName}</p>
              <p className="italic text-[10pt] mt-1">(Đề thi có ... trang)</p>
            </div>
            <div className="text-center text-[11pt]">
              <p className="font-bold uppercase">KIỂM TRA HỌC KỲ II – NĂM HỌC 2024 – 2025</p>
              <p className="font-bold">Môn: {subjectName} — Lớp: {gradeName}</p>
              <p className="italic text-[10pt]">Thời gian làm bài: {durationMinutes} phút (Không kể thời gian phát đề)</p>
              <p className="font-bold mt-1">Mã đề thi: {examCode}</p>
            </div>
          </div>

          <h1 className="text-center font-bold uppercase text-[14pt] mb-6">
            {title || 'ĐỀ THI TỔNG HỢP'}
          </h1>

          {/* Các phần câu hỏi */}
          {TYPE_ORDER.map(type => {
            const qs = questions.filter(q => q.type === type);
            if (!qs.length) return null;
            return (
              <div key={type} className="mb-6">
                {/* Tiêu đề phần */}
                <div className="font-bold border-l-4 border-black pl-3 mb-4 text-[12pt]">
                  <div className="uppercase">{SECTION_LABELS[type]}</div>
                  <div className="font-normal italic text-[11pt] mt-0.5">{SECTION_SUBTITLES[type]}</div>
                </div>

                {/* Câu hỏi */}
                {qs.map(q => (
                  <div key={q.id} className="question-block question-item">
                    {/* Số câu + nội dung */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="font-bold text-[12pt] shrink-0">Câu {globalNum[q.id]}.</span>
                      <div className="prose prose-sm max-w-none text-[12pt] flex-1">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                          {ensureMathWrapped(q.content)}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Ảnh nếu có */}
                    {q.imageUrl && (
                      <div className="my-3">
                        <img src={q.imageUrl} alt="minh họa" className="max-h-56 object-contain" />
                      </div>
                    )}

                    {/* Phương án */}
                    {q.type === 'multiple_choice' && renderMCQOptions(q)}
                    {q.type === 'true_false'      && renderTFOptions(q)}
                    {q.type === 'short_answer'    && (
                      <div className="mt-2 border-b border-dashed border-gray-400 h-8 w-1/2" />
                    )}
                    {q.type === 'essay' && (
                      <div className="mt-2 space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="border-b border-dashed border-gray-300 h-6" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Trang đáp án (page-break-before: always) */}
          {renderAnswerKey()}
        </div>
      </div>
    </motion.div>
  );
};
