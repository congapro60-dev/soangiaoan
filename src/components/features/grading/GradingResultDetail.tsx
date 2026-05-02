import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Award, AlertTriangle, Download, Printer, X, Sparkles, Rocket, CircleHelp, Loader2, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import { GradingResult, AppData } from '../../../types';
import { downloadBlob } from '../../../utils/fileUtils';
import { callAI } from '../../../lib/aiProviders';

type Settings = AppData['settings'];

// ── API layer ──────────────────────────────────────────────────────────────────
// Tách biệt logic gọi AI khỏi UI để dễ bảo trì và kiểm thử độc lập.

const COMMON_RULES = `
QUY TẮC BẮT BUỘC (không được vi phạm):
- Viết hoàn toàn bằng tiếng Việt. Không dùng bất kỳ từ tiếng Anh nào (ví dụ: dùng "Bảng biến thiên" thay vì "Sign chart", "Đạo hàm" thay vì "Derivative").
- Biểu diễn biểu thức, phương trình Toán học bằng cú pháp Markdown thông thường, không dùng LaTeX (ví dụ: x^2 + 2x - 3 = 0, phân số viết dạng a/b).
- Không dùng biểu tượng cảm xúc (emoji).
- Không dùng các cụm mở đầu mang tính AI như "Chào bạn", "Dưới đây là", "Hy vọng giúp ích", "Tất nhiên", "Rất vui được".
- Chỉ trả về văn bản nội dung thuần túy, không kèm tiêu đề giải thích hay dòng mở đầu thừa.`.trim();

export const feedbackActions = {
  /** Rút gọn & nhân hóa: viết lại ngắn gọn, tự nhiên theo giọng giáo viên Toán. */
  shortenHumanize: (text: string, settings: Settings): Promise<string | null> =>
    callAI(
      `Bạn là giáo viên bộ môn Toán đang viết lại nhận xét bài làm.

${COMMON_RULES}

NHIỆM VỤ:
1. Xác định bước làm đúng cuối cùng và vị trí bắt đầu sai (nếu có lỗi).
2. Viết lại nhận xét theo đúng trình tự: khen ngắn gọn nỗ lực → chỉ rõ lỗi → hướng sửa.
3. Giữ nguyên tất cả điểm số và số liệu cụ thể từ nhận xét gốc.
4. Tổng độ dài: tối đa 3–4 câu.

Nhận xét gốc:
---
${text}
---`,
      settings
    ),

  /** Mở rộng tư duy: gợi ý phương pháp thay thế hoặc biến thể bài toán — dùng cho bài điểm cao. */
  expandThinking: (text: string, score: number, maxScore: number, settings: Settings): Promise<string | null> =>
    callAI(
      `Bạn là giáo viên bộ môn Toán. Học sinh đạt ${score}/${maxScore} điểm — kết quả tốt.

${COMMON_RULES}

NHIỆM VỤ: Thêm vào cuối nhận xét hiện tại MỘT đoạn ngắn (2–3 câu) theo một trong hai hướng:
- Gợi ý một phương pháp giải ngắn hơn hoặc tinh gọn hơn mà học sinh chưa dùng, hoặc
- Mở rộng bài toán bằng cách thay đổi một giả thiết (ví dụ: "Nếu thay đổi tham số m thành...").
Không lặp lại lời khen. Không giải lại bài toán.

Nhận xét hiện tại:
---
${text}
---
Trả về toàn bộ nhận xét đã bổ sung phần mở rộng tư duy.`,
      settings
    ),

  /** Gợi ý từng bước (giàn giáo): nhắc định lý hoặc bước đầu tiên — dùng cho bài điểm thấp. */
  addGuidance: (text: string, weaknesses: string[], settings: Settings): Promise<string | null> =>
    callAI(
      `Bạn là giáo viên bộ môn Toán. Học sinh có các lỗi sau: ${weaknesses.join('; ')}.

${COMMON_RULES}

NHIỆM VỤ: Thêm vào cuối nhận xét hiện tại một phần "Hướng dẫn gỡ rối" với 3–4 gợi ý nhỏ.
QUY TẮC RIÊNG (bắt buộc):
- Tuyệt đối không giải hộ, không cung cấp đáp án cuối cùng.
- Mỗi gợi ý chỉ nhắc lại một định lý trọng tâm hoặc hướng dẫn thao tác đầu tiên cần thực hiện (ví dụ: "Để tìm giao điểm, em lập phương trình hoành độ giao điểm bằng cách cho hai biểu thức y bằng nhau...").
- Mục đích: giúp học sinh tự gỡ lỗi, không làm thay.
- Giọng văn khích lệ, không phê phán.

Nhận xét hiện tại:
---
${text}
---
Trả về toàn bộ nhận xét đã bổ sung phần hướng dẫn.`,
      settings
    ),
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  result: GradingResult | null;
  onClose: () => void;
  settings?: Settings;
  onSaveDetails?: (resultId: string, details: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const GradingResultDetail = ({ result, onClose, settings, onSaveDetails }: Props) => {
  const [editedDetails, setEditedDetails] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);

  // Sync textarea khi mở bài khác
  useEffect(() => {
    setEditedDetails(result?.details ?? result?.improvementPlan ?? '');
  }, [result?.id]);

  const isDirty = result != null && editedDetails !== (result.details ?? result.improvementPlan ?? '');

  // Chạy một action AI, cập nhật textarea với kết quả
  const runAction = async (key: string, fn: () => Promise<string | null>) => {
    if (!settings) return;
    setActionLoading(key);
    try {
      const output = await fn();
      if (output) setEditedDetails(output);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = () => {
    if (!result || !onSaveDetails) return;
    onSaveDetails(result.id, editedDetails);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  // ── Print / Download dùng nội dung đã chỉnh sửa ──
  const handlePrint = () => {
    if (!result) return;
    const r10 = result.maxScore > 0 ? (result.score / result.maxScore) * 10 : result.score;
    const grade = r10 >= 7 ? 'Đạt' : r10 >= 5 ? 'Trung bình' : 'Chưa đạt';
    const detailsHtml = marked.parse(editedDetails || '');
    const html = `<!DOCTYPE html>
<html lang="vi"><head>
  <meta charset="UTF-8"><title>Báo cáo: ${result.studentName}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;max-width:720px;margin:40px auto;color:#1e293b;font-size:13px}
    h1{font-size:20px;font-weight:900;margin:0 0 4px}
    .meta{color:#64748b;font-size:12px;margin-bottom:24px}
    .score-box{display:inline-flex;align-items:baseline;gap:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 20px;margin-bottom:24px}
    .score-num{font-size:36px;font-weight:900;color:#1d4ed8}
    .score-max{font-size:14px;color:#64748b}
    .grade{font-size:14px;font-weight:700;padding:2px 10px;border-radius:20px;background:${r10>=7?'#d1fae5':r10>=5?'#fef9c3':'#fee2e2'};color:${r10>=7?'#065f46':r10>=5?'#713f12':'#991b1b'}}
    .section{margin-bottom:20px}.section h2{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px}
    .strengths h2{color:#047857}.weaknesses h2{color:#b45309}
    ul{margin:0;padding-left:18px;line-height:1.8}
    .details{border-top:1px solid #e2e8f0;padding-top:20px}
    .details table{width:100%;border-collapse:collapse;font-size:12px}
    .details th,.details td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left}
    .details th{background:#f8fafc;font-weight:700}
    @media print{body{margin:20px}}
  </style>
</head><body>
  <h1>${result.studentName}</h1>
  <div class="meta">${result.fileName} — Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
  <div class="score-box"><span class="score-num">${result.score}</span><span class="score-max">/ ${result.maxScore}</span><span class="grade">${grade}</span></div>
  <div class="section strengths"><h2>✓ Điểm mạnh</h2><ul>${(result.strengths||[]).map(s=>`<li>${s}</li>`).join('')}</ul></div>
  <div class="section weaknesses"><h2>⚠ Cần khắc phục</h2><ul>${(result.weaknesses||[]).map(w=>`<li>${w}</li>`).join('')}</ul></div>
  <div class="section details">${detailsHtml}</div>
  <script>window.onload=()=>window.print();</script>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleDownload = () => {
    if (!result) return;
    const content = [
      'BÁO CÁO CHẤM ĐIỂM',
      `Học sinh: ${result.studentName}`,
      `Điểm: ${result.score}/${result.maxScore}`,
      '', '--- ĐIỂM MẠNH ---',
      ...(result.strengths || []).map(s => `• ${s}`),
      '', '--- CẦN CẢI THIỆN ---',
      ...(result.weaknesses || []).map(w => `• ${w}`),
      '', '--- BÁO CÁO CHI TIẾT ---',
      editedDetails,
    ].join('\n');
    downloadBlob(
      new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' }),
      `BaoCao_${result.studentName}.txt`
    );
  };

  const canAI = !!settings;
  const r10 = result ? (result.maxScore > 0 ? (result.score / result.maxScore) * 10 : result.score) : 0;
  const isHighScore = r10 >= 8;   // Mở rộng tư duy — chỉ khi ≥ 8/10
  const isLowScore  = r10 < 5;   // Gợi ý từng bước — chỉ khi < 5/10

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {result && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* ── Header ── */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Chi tiết: {result.studentName}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Điểm: {result.score}/{result.maxScore}
                    </span>
                    <span className="text-[10px] text-slate-400">{result.fileName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Strengths / Weaknesses */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50/80 p-6 rounded-[32px] border border-green-100">
                  <h4 className="font-bold text-green-700 text-sm mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Điểm mạnh
                  </h4>
                  <ul className="text-xs text-green-600 space-y-1 font-medium">
                    {result.strengths?.map((s, i) => <li key={i}>✓ {s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-50/80 p-6 rounded-[32px] border border-red-100">
                  <h4 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Cần khắc phục
                  </h4>
                  <ul className="text-xs text-red-600 space-y-1 font-medium">
                    {result.weaknesses?.map((w, i) => <li key={i}>⚠ {w}</li>)}
                  </ul>
                </div>
              </div>

              {/* ── Feedback editor ── */}
              <div className="rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                {/* Editor header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-slate-700">Lời nhận xét</h4>
                    {isDirty && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                        Đã chỉnh sửa
                      </span>
                    )}
                  </div>
                  {/* AI action buttons */}
                  {canAI && (
                    <div className="flex items-center gap-2">
                      <ActionButton
                        label="Rút gọn & Nhân hóa"
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                        loading={actionLoading === 'shorten'}
                        colorCls="text-slate-600 border-slate-200 hover:bg-slate-100"
                        onClick={() => runAction('shorten', () =>
                          feedbackActions.shortenHumanize(editedDetails, settings!)
                        )}
                      />
                      {isHighScore && (
                        <ActionButton
                          label="Mở rộng tư duy"
                          icon={<Rocket className="w-3.5 h-3.5" />}
                          loading={actionLoading === 'expand'}
                          colorCls="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => runAction('expand', () =>
                            feedbackActions.expandThinking(editedDetails, result.score, result.maxScore, settings!)
                          )}
                        />
                      )}
                      {isLowScore && (
                        <ActionButton
                          label="Gợi ý từng bước"
                          icon={<CircleHelp className="w-3.5 h-3.5" />}
                          loading={actionLoading === 'scaffold'}
                          colorCls="text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => runAction('scaffold', () =>
                            feedbackActions.addGuidance(editedDetails, result.weaknesses ?? [], settings!)
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  value={editedDetails}
                  onChange={e => setEditedDetails(e.target.value)}
                  disabled={actionLoading !== null}
                  rows={10}
                  className="w-full p-6 text-sm text-slate-700 font-mono leading-relaxed resize-y outline-none bg-white disabled:opacity-60 disabled:cursor-wait"
                  placeholder="Nội dung nhận xét..."
                />

                {/* Save row */}
                {onSaveDetails && (
                  <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={!isDirty || actionLoading !== null}
                      className={`px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                        saveFlash
                          ? 'bg-emerald-500 text-white'
                          : isDirty
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saveFlash ? 'Đã lưu' : 'Lưu thay đổi'}
                    </button>
                  </div>
                )}
              </div>

              {/* Read-only markdown preview (collapsed under editor) */}
              <details className="group">
                <summary className="text-xs font-semibold text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors">
                  Xem trước định dạng Markdown ▸
                </summary>
                <div className="mt-4 bg-white p-6 rounded-[24px] border border-slate-100 prose prose-slate max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editedDetails}</ReactMarkdown>
                </div>
              </details>
            </div>

            {/* ── Footer ── */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button onClick={handlePrint} className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" /> In / PDF
              </button>
              <button onClick={handleDownload} className="px-5 py-2.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Tải (.txt)
              </button>
              <button onClick={onClose} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 text-sm">
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ── Sub-component: ActionButton ────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  colorCls: string;
  onClick: () => void;
}

const ActionButton = ({ label, icon, loading, colorCls, onClick }: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-wait ${colorCls}`}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    {label}
  </button>
);
