import { useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Loader2, FileText, CheckCircle2, WandSparkles, Copy, RotateCcw, ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import type { AppData } from '../../types';
import { useLessonUpgrade } from '../../hooks/useLessonUpgrade';
import { UPGRADE_MENU, UPGRADE_GROUPS } from '../../lib/lessonUpgrade/menu';
import { cn } from '../../lib/utils';
import { exportToWordA4 } from '../../utils/wordExportA4';

interface LessonUpgradeTabProps {
  data: AppData;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  showToast: (msg: string, icon?: any) => void;
}

export const LessonUpgradeTab = ({ data, isLoading, setIsLoading, showToast }: LessonUpgradeTabProps) => {
  const {
    state,
    setState,
    analysis,
    standardsAudit,
    hasOriginalDocx,
    isRevising,
    results,
    handleFileUpload,
    reset,
    activeMenuId,
    setActiveMenuId,
    generateProduct,
    downloadRevisedDocx
  } = useLessonUpgrade(data, showToast);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderAnalysisCard = () => {
    if (!analysis) return null;
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Đã phân tích giáo án</h3>
              <p className="text-sm text-slate-500">
                {analysis.monHoc} • {analysis.lop} • {analysis.thoiLuong}
              </p>
            </div>
          </div>
          {state === 'result' && (
            <button 
              onClick={() => setState('menu')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Menu
            </button>
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Tên bài học</h4>
            <p className="text-slate-800 mb-4">{analysis.tenBai}</p>
            
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Mục tiêu</h4>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              {analysis.mucTieu.map((mt, i) => <li key={i}>{mt}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">Điểm mạnh</h4>
            <ul className="list-disc pl-5 text-sm text-emerald-600 space-y-1 mb-4">
              {analysis.diemManh.map((dm, i) => <li key={i}>{dm}</li>)}
            </ul>
            
            <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-2">Cần nâng cấp</h4>
            <ul className="list-disc pl-5 text-sm text-amber-600 space-y-1">
              {analysis.diemCanNangCap.map((nc, i) => <li key={i}>{nc}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderStandardsAudit = () => {
    if (!standardsAudit) return null;
    const { findings, criticalFailures, lessonType } = standardsAudit;
    const passed = findings.filter(f => f.status === 'pass').length;
    const typeLabel: Record<string, string> = {
      practice: 'Tiết luyện tập', knowledge: 'Tiết hình thành kiến thức',
      flipped: 'Lớp học đảo ngược', unknown: 'Chưa xác định loại tiết',
    };
    const icon = (s: string) => s === 'pass' ? '✅' : s === 'warn' ? '🟡' : '❌';

    return (
      <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-indigo-100 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Rà soát theo chuẩn Toán</h3>
              <p className="text-sm text-slate-500">
                {typeLabel[lessonType]} • Đạt {passed}/{findings.length} tiêu chí
                {criticalFailures > 0 && <span className="text-red-600 font-semibold"> • {criticalFailures} tiêu chí quan trọng chưa đạt</span>}
              </p>
            </div>
          </div>
          <button
            onClick={downloadRevisedDocx}
            disabled={isRevising}
            title={hasOriginalDocx ? 'Chèn góp ý vào chính file .docx gốc, giữ nguyên layout' : 'Không có .docx gốc — sẽ xuất Word mới từ báo cáo rà soát'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {isRevising ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {hasOriginalDocx ? 'Tải Word đã bổ sung (giữ layout)' : 'Tải Word báo cáo rà soát'}
          </button>
        </div>

        {!hasOriginalDocx && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Đầu vào không phải .docx (PDF/ảnh) nên chỉ phân tích & tạo Word mới; để giữ nguyên layout gốc, hãy tải lên file <b>.docx</b>.
          </p>
        )}

        <ul className="space-y-2">
          {findings.map(f => (
            <li key={f.id} className="text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{icon(f.status)}</span>
                <div>
                  <span className="font-semibold text-slate-800">{f.title}</span>
                  <span className="text-slate-500"> — {f.evidence}</span>
                  {f.status !== 'pass' && (
                    <p className="text-slate-500 italic mt-0.5">↳ {f.suggestion}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMenu = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Thầy/cô muốn tôi hỗ trợ phần nào?</h3>
          <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Tải giáo án khác
          </button>
        </div>
        
        <div className="grid gap-6">
          {UPGRADE_GROUPS.map(group => {
            const groupItems = UPGRADE_MENU.filter(item => item.group === group.id);
            if (groupItems.length === 0) return null;
            
            return (
              <div key={group.id} className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">{group.label}</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => generateProduct(item.id)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border text-left transition-all relative overflow-hidden",
                          activeMenuId === item.id 
                            ? "border-blue-500 bg-blue-50/50 shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          activeMenuId === item.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-bold",
                            activeMenuId === item.id ? "text-blue-700" : "text-slate-800"
                          )}>
                            {item.id}. {item.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGenerating = () => {
    const menuItem = UPGRADE_MENU.find(m => m.id === activeMenuId);
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center animate-in fade-in zoom-in-95 duration-500">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Đang tạo "{menuItem?.label}"...</h3>
        <p className="text-slate-500 max-w-md">AI đang đọc kỹ giáo án của bạn và thiết kế nội dung phù hợp. Quá trình này có thể mất vài chục giây tùy độ dài văn bản.</p>
      </div>
    );
  };

  const renderResult = () => {
    if (!activeMenuId || !results[activeMenuId]) return null;
    const result = results[activeMenuId];
    const menuItem = UPGRADE_MENU.find(m => m.id === activeMenuId);
    const Icon = menuItem?.icon || FileText;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{menuItem?.label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result.content);
                showToast('Đã copy nội dung', 'success');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button 
              onClick={() => {
                const title = `${analysis?.tenBai || 'Giao-an'}-${menuItem?.id || 'export'}`;
                exportToWordA4({ title, content: result.content }, showToast, 'portrait');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Xuất Word
            </button>
            <button 
              onClick={() => generateProduct(activeMenuId)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="prose prose-slate prose-blue max-w-none bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-slate-300 border border-slate-200 rounded-lg" {...props} /></div>,
                thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-bold text-slate-900 border-b border-slate-200" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-200" {...props} />,
              }}
            >
              {result.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      key="lesson-upgrade"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto h-full flex flex-col pb-12"
    >
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest mb-4">
          <WandSparkles className="w-3.5 h-3.5" />
          Tính năng mới
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-800 mb-2">Trợ lý Nâng cấp Giáo án</h2>
        <p className="text-slate-500">Tải giáo án lên, AI sẽ phân tích và đưa ra các lựa chọn nâng cấp chuyên sâu cho từng phần.</p>
      </div>

      {state === 'idle' && (
        <div 
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl bg-white p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Tải giáo án lên để phân tích</h3>
          <p className="text-slate-500 max-w-md">Hỗ trợ định dạng .docx, .pdf. AI sẽ đọc và hiểu toàn bộ cấu trúc bài học của bạn trước khi đưa ra gợi ý nâng cấp.</p>
          <button className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
            Chọn tệp giáo án
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".docx,.pdf,.doc"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {state === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center animate-in fade-in zoom-in-95 duration-500">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Đang phân tích giáo án...</h3>
          <p className="text-slate-500 max-w-md">AI đang trích xuất mục tiêu, cấu trúc hoạt động và tìm ra các điểm cần nâng cấp. Vui lòng chờ trong giây lát.</p>
        </div>
      )}

      {(state === 'menu' || state === 'generating' || state === 'result') && (
        <>
          {renderAnalysisCard()}
          {renderStandardsAudit()}
          {state === 'menu' && renderMenu()}
          {state === 'generating' && renderGenerating()}
          {state === 'result' && renderResult()}
        </>
      )}
    </motion.div>
  );
};
