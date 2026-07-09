import { useState } from 'react';
import { Layers, FileText, UploadCloud, ChevronRight, X, Trash2, PenLine, BookOpen } from 'lucide-react';
import { AppData, LessonPlan, TemplateFile, BuiltinFormat, ToanKeHoach } from '../../../types';
import { TOAN_KE_HOACH_LABELS } from '../../../prompts/toanFormats';

interface LessonControlsProps {
  generationMode: 'single' | 'bulk';
  setGenerationMode: (mode: 'single' | 'bulk') => void;
  builtinFormat: BuiltinFormat;
  setBuiltinFormat: (f: BuiltinFormat) => void;
  toanKeHoach: ToanKeHoach;
  setToanKeHoach: (k: ToanKeHoach) => void;
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
  builtinFormat,
  setBuiltinFormat,
  toanKeHoach,
  setToanKeHoach,
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
  const [inputMode, setInputMode] = useState<'manual' | 'ppct'>('manual');

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
            disabled={builtinFormat === 'toan'}
            title={builtinFormat === 'toan' ? 'Giáo án ban Toán hiện chỉ hỗ trợ soạn đơn lẻ (từng tiết)' : undefined}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${generationMode === 'bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} ${builtinFormat === 'toan' ? 'opacity-40 cursor-not-allowed' : ''}`}
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
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Định dạng giáo án</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'default', label: 'Bài học phân hoá', sub: 'Pre-test · 3 tuyến · học liệu tương tác' },
                { value: 'claude', label: 'Mẫu giáo án Dewey', sub: 'WALT/WILF · Phân hóa 🌶️🌶️🌶️' },
                { value: 'cv5512', label: 'Công văn 5512', sub: 'Chuẩn Bộ GD&ĐT 2020' },
                { value: 'toan', label: 'Giáo án ban Toán', sub: 'KHDH · Socratic · phân hóa TB/Khá/Giỏi' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBuiltinFormat(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${builtinFormat === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                >
                  <p className={`text-xs font-black ${builtinFormat === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {builtinFormat === 'toan' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kế hoạch bài dạy (1 tiết)</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TOAN_KE_HOACH_LABELS) as [ToanKeHoach, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setToanKeHoach(value)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${toanKeHoach === value ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <p className={`text-[11px] font-black leading-tight ${toanKeHoach === value ? 'text-blue-700' : 'text-slate-700'}`}>{label}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Chọn kế hoạch → AI soạn đúng 1 tiết theo tiến trình của kế hoạch đó.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mẫu tùy chỉnh (tải lên)</label>
            <select
              value={currentPlan.templateId || ''}
              onChange={(e) => setCurrentPlan(prev => ({ ...prev, templateId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Không dùng mẫu tùy chỉnh --</option>
              {data.templates?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {currentPlan.templateId && (
              <p className="text-[10px] text-blue-600 font-medium">✓ Mẫu tùy chỉnh sẽ ghi đè định dạng đã chọn ở trên.</p>
            )}
          </div>
      </div>

      <div className="pt-2">
          {generationMode === 'single' ? (
            <div className="space-y-4">
              {/* Radio chọn chế độ nhập tiêu đề */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" /> Điền trực tiếp
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('ppct')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inputMode === 'ppct' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Lấy từ PPCT
                </button>
              </div>

              {inputMode === 'manual' ? (
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
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    Phân phối môn (PPCT)
                    <button 
                      onClick={() => { setUploadingFiles({ category: 'distribution' }); fileInputRef.current?.click(); }}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      + Tải lên PPCT
                    </button>
                  </label>
                  <select 
                    value={selectedDistributionId}
                    onChange={(e) => setSelectedDistributionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-blue-50 text-blue-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Chọn file PPCT --</option>
                    {data.distributions?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {selectedDistributionId && (
                    <p className="text-[10px] text-blue-600 font-medium">✓ AI sẽ đọc PPCT và tự điền tiêu đề bài theo tuần đã chọn.</p>
                  )}
                </div>
              )}
              
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
