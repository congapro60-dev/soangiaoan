import { motion } from 'motion/react';
import { 
  FileText, 
  Layers, 
  X, 
  UploadCloud, 
  Sparkles, 
  Save, 
  Download, 
  MessageSquare, 
  FileSpreadsheet 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan, TemplateFile } from '../../types';

interface CreatorTabProps {
  data: AppData;
  generationMode: 'single' | 'bulk';
  setGenerationMode: (mode: 'single' | 'bulk') => void;
  currentPlan: Partial<LessonPlan>;
  setCurrentPlan: React.Dispatch<React.SetStateAction<Partial<LessonPlan>>>;
  lessonDocs: TemplateFile[];
  setLessonDocs: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  singleRequirement: string;
  setSingleRequirement: (val: string) => void;
  distributionFile: TemplateFile | null;
  setDistributionFile: (val: TemplateFile | null) => void;
  bulkCommand: string;
  setBulkCommand: (val: string) => void;
  isLoading: boolean;
  bulkProgress: { current: number; total: number };
  handleCreateLesson: () => void;
  saveLessonPlan: () => void;
  exportToPDF: () => void;
  exportToWord: () => void;
  generatePPTX: () => void;
  exportToLaTeX: () => void;
  handleReviseLesson: () => void;
  revisionPrompt: string;
  setRevisionPrompt: (val: string) => void;
  bulkResults: LessonPlan[];
  saveBulkPlans: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setUploadingFiles: (val: { category: TemplateFile['category']; templateId?: string } | null) => void;
  showToast: (msg: string, type?: any) => void;
  selectedDistributionId: string;
  setSelectedDistributionId: (id: string) => void;
  deleteDistribution: (id: string) => void;
}

export const CreatorTab = ({
  data,
  generationMode,
  setGenerationMode,
  currentPlan,
  setCurrentPlan,
  lessonDocs,
  setLessonDocs,
  singleRequirement,
  setSingleRequirement,
  distributionFile,
  setDistributionFile,
  bulkCommand,
  setBulkCommand,
  isLoading,
  bulkProgress,
  handleCreateLesson,
  saveLessonPlan,
  exportToPDF,
  exportToWord,
  generatePPTX,
  exportToLaTeX,
  handleReviseLesson,
  revisionPrompt,
  setRevisionPrompt,
  bulkResults,
  saveBulkPlans,
  fileInputRef,
  setUploadingFiles,
  showToast,
  selectedDistributionId,
  setSelectedDistributionId,
  deleteDistribution
}: CreatorTabProps) => {
  return (
    <motion.div 
      key="creator"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        {/* Mode Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setGenerationMode('single')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2",
              generationMode === 'single' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText className="w-4 h-4" /> Soạn từng bài
          </button>
          <button 
            onClick={() => setGenerationMode('bulk')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2",
              generationMode === 'bulk' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Layers className="w-4 h-4" /> Soạn hàng loạt
          </button>
        </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Khối/Lớp</label>
            <select 
              value={currentPlan.grade || '10'}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, grade: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={(i+1).toString()}>Lớp {i+1}</option>
              ))}
              <option value="khac">Khác</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tuần học</label>
            <select 
              value={currentPlan.week || '1'}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, week: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
            >
              {[...Array(35)].map((_, i) => (
                <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Người soạn</label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-bold truncate">
              {data.authorName || 'Chưa đặt tên'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Môn học</label>
            <select 
              value={currentPlan.subjectId || ''}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, subjectId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              {data.subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Chọn mẫu giáo án</label>
            <select 
              value={currentPlan.templateId || ''}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, templateId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">-- Không sử dụng mẫu --</option>
              {data.templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Specific Inputs */}
        {generationMode === 'single' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tiêu đề bài học</label>
              <input 
                type="text" 
                value={currentPlan.title || ''}
                onChange={(e) => setCurrentPlan(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ví dụ: Đạo hàm cấp 2..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                Sử dụng Phân phối môn đã lưu (Tùy chọn)
                <button 
                  onClick={() => {
                    setUploadingFiles({ category: 'distribution' });
                    fileInputRef.current?.click();
                  }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <UploadCloud className="w-3 h-3" /> Tải lên bản mới
                </button>
              </label>
              <select 
                value={selectedDistributionId}
                onChange={(e) => setSelectedDistributionId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">-- Không sử dụng phân phối --</option>
                {data.distributions.map(d => (
                  <option key={d.id} value={d.id}>{d.name} (Lớp {d.grade})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tài liệu tham khảo cho bài học (PDF/Word)</label>
              <div className="flex flex-wrap gap-2">
                {lessonDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                    <FileText className="w-4 h-4" />
                    <span className="max-w-[150px] truncate">{doc.name}</span>
                    <button onClick={() => setLessonDocs(prev => prev.filter(d => d.id !== doc.id))} className="hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    setUploadingFiles({ category: 'lesson_doc' });
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:border-blue-500 hover:text-blue-500 transition-all flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" /> Tải tài liệu
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Yêu cầu cụ thể cho bài học này</label>
              <textarea 
                value={singleRequirement}
                onChange={(e) => setSingleRequirement(e.target.value)}
                placeholder="Ví dụ: Tập trung vào các ví dụ thực tế, thêm phần thảo luận nhóm..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phân phối chương trình lưu trữ</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.distributions.map(dist => (
                  <div key={dist.id} className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                    selectedDistributionId === dist.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-300 bg-white"
                  )} onClick={() => setSelectedDistributionId(dist.id)}>
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className={cn("w-5 h-5", selectedDistributionId === dist.id ? "text-blue-600" : "text-slate-400")} />
                      <div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{dist.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Lớp {dist.grade} · {data.subjects.find(s => s.id === dist.subjectId)?.name}</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteDistribution(dist.id); }} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    setUploadingFiles({ category: 'distribution' });
                    fileInputRef.current?.click();
                  }}
                  className="p-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all min-h-[66px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Tải phân phối mới</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Yêu cầu soạn thảo hàng loạt</label>
              <textarea 
                value={bulkCommand}
                onChange={(e) => setBulkCommand(e.target.value)}
                placeholder="Ví dụ: Soạn cho tôi 5 bài từ bài số 10; Soạn tất cả các bài trong tuần thứ 5..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
              />
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={handleCreateLesson}
            disabled={isLoading}
            className="flex-1 py-4 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isLoading 
              ? (bulkProgress.total > 0 ? `Đang soạn (${bulkProgress.current}/${bulkProgress.total}) bài...` : 'Đang phân tích...') 
              : generationMode === 'single' ? 'Khởi tạo giáo án thông minh' : 'Soạn thảo hàng loạt theo phân phối'
            }
          </button>
        </div>
      </div>

      {/* Single Result */}
      {generationMode === 'single' && currentPlan.content && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-800">Kết quả giáo án</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={saveLessonPlan}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <Save className="w-4 h-4" /> Lưu thư viện
              </button>
              <button 
                onClick={exportToPDF}
                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <Download className="w-4 h-4" /> Xuất PDF
              </button>
              <button 
                onClick={exportToWord}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-4 h-4" /> Xuất Word
              </button>
              <button 
                onClick={generatePPTX}
                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-medium flex items-center gap-2 hover:bg-orange-100 transition-colors"
              >
                <Layers className="w-4 h-4" /> Tạo Slide
              </button>
              <button 
                onClick={exportToLaTeX}
                disabled={isLoading}
                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-medium flex items-center gap-2 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất LaTeX
              </button>
            </div>
          </div>
          <div id="lesson-content" className="prose prose-slate max-w-none markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
            >{currentPlan.content || ''}</ReactMarkdown>
          </div>

          {/* Feedback Form */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              Chưa hài lòng? Yêu cầu AI sửa đổi giáo án này
            </label>
            <div className="flex flex-col gap-3">
              <textarea
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="Ví dụ: Rút ngắn phần khởi động lại thành 5 phút, thêm 1 trò chơi tương tác vào phần luyện tập, giải thích kỹ hơn phần công thức..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all min-h-[100px]"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleReviseLesson}
                  disabled={isLoading || !revisionPrompt.trim()}
                  className="px-6 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-100 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Sửa đổi theo yêu cầu
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bulk Results */}
      {generationMode === 'bulk' && bulkResults.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Danh sách giáo án đã soạn ({bulkResults.length})</h3>
            <button 
              onClick={saveBulkPlans}
              className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              <Save className="w-5 h-5" /> Lưu tất cả vào thư viện
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {bulkResults.map((result, idx) => (
              <motion.div 
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="text-lg font-bold text-blue-600">{result.title}</h4>
                  <button 
                    onClick={() => {
                      showToast('Chức năng xuất PDF lẻ đang được cập nhật. Vui lòng lưu vào thư viện để xuất.');
                    }}
                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div className="prose prose-slate max-w-none markdown-body max-h-[300px] overflow-y-auto pr-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >{result.content}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
