import { Layers, FileText, UploadCloud, ChevronRight, X, Trash2 } from 'lucide-react';
import { AppData, LessonPlan, TemplateFile } from '../../../types';

interface LessonControlsProps {
  generationMode: 'single' | 'bulk';
  setGenerationMode: (mode: 'single' | 'bulk') => void;
  currentPlan: Partial<LessonPlan>;
  setCurrentPlan: React.Dispatch<React.SetStateAction<Partial<LessonPlan>>>;
  data: AppData;
  lessonDocs: TemplateFile[];
  setLessonDocs: React.Dispatch<React.SetStateAction<TemplateFile[]>>;
  selectedDistributionId: string;
  setSelectedDistributionId: (id: string) => void;
  setUploadingFiles: (val: { category: TemplateFile['category']; templateId?: string } | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  deleteDistribution: (id: string) => void;
}

export const LessonControls = ({
  generationMode,
  setGenerationMode,
  currentPlan,
  setCurrentPlan,
  data,
  lessonDocs,
  setLessonDocs,
  selectedDistributionId,
  setSelectedDistributionId,
  setUploadingFiles,
  fileInputRef,
  deleteDistribution
}: LessonControlsProps) => {
  return (
    <>
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => setGenerationMode('single')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${generationMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4" /> Soạn Đơn lẻ
          </button>
          <button 
            onClick={() => setGenerationMode('bulk')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${generationMode === 'bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Layers className="w-4 h-4" /> Soạn Hàng loạt
          </button>
      </div>

      <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Khối Lớp</label>
                <select 
                  value={currentPlan.grade || '10'}
                  onChange={(e) => setCurrentPlan(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tuần học</label>
                <select 
                  value={currentPlan.week || '1'}
                  onChange={(e) => setCurrentPlan(prev => ({ ...prev, week: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {[...Array(35)].map((_, i) => (
                    <option key={i+1} value={(i+1).toString()}>Tuần {i+1}</option>
                  ))}
                </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Môn học</label>
            <select 
              value={currentPlan.subjectId || ''}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, subjectId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {data.subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mẫu giáo án</label>
            <select 
              value={currentPlan.templateId || ''}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, templateId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Mẫu mặc định (AI) --</option>
              {data.templates?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
      </div>

      <div className="pt-2">
          {generationMode === 'single' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiêu đề bài học</label>
                <input 
                  type="text" 
                  value={currentPlan.title || ''}
                  onChange={(e) => setCurrentPlan(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ví dụ: Đạo hàm cấp 2..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  Phân phối môn
                  <button 
                    onClick={() => { setUploadingFiles({ category: 'distribution' }); fileInputRef.current?.click(); }}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    + Mới
                  </button>
                </label>
                <select 
                  value={selectedDistributionId}
                  onChange={(e) => setSelectedDistributionId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Tự chọn --</option>
                  {data.distributions?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  Tài liệu tham khảo
                  <button 
                      onClick={() => { setUploadingFiles({ category: 'lesson_doc' }); fileInputRef.current?.click(); }}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    + Thêm
                  </button>
                </label>
                <div className="space-y-2">
                    {lessonDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-100">
                      <span className="truncate flex-1 font-medium">{doc.name}</span>
                      <button onClick={() => setLessonDocs(prev => prev.filter(d => d.id !== doc.id))} className="text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {lessonDocs.length === 0 && <p className="text-[10px] text-slate-400 italic">Chưa có tài liệu đính kèm</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  Phân phối môn (Bắt buộc)
                  <button 
                    onClick={() => { setUploadingFiles({ category: 'distribution' }); fileInputRef.current?.click(); }}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    + Tải lên PPCN
                  </button>
                </label>
                <div className="space-y-2">
                  <select 
                    value={selectedDistributionId}
                    onChange={(e) => setSelectedDistributionId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-blue-50 text-blue-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Chọn File PPCN Word/Excel --</option>
                    {data.distributions?.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.grade} - {d.subjectId})</option>
                    ))}
                  </select>
                  {selectedDistributionId && (
                     <button 
                       onClick={() => deleteDistribution(selectedDistributionId)}
                       className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1"
                     >
                        <Trash2 className="w-3 h-3"/> Xóa PPCN này khỏi hệ thống
                     </button>
                  )}
                </div>
              </div>

              {selectedDistributionId && (
                <div className="flex max-w-sm rounded-[16px] text-[11px] bg-blue-50/50 p-3 items-start gap-2 border border-blue-100">
                   <UploadCloud className="w-4 h-4 text-blue-500 shrink-0" />
                   <p className="text-blue-700 font-medium">Hệ thống đã nhận diện được file PPCN. AI sẽ tự động đọc, trích xuất mục tiêu và soạn từng bài theo đúng tuần.</p>
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
};
