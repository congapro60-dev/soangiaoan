import { motion } from 'motion/react';
import { 
  Plus, 
  Layout, 
  Trash2, 
  FileText, 
  Upload, 
  FileUp, 
  X, 
  FileCheck 
} from 'lucide-react';
import dayjs from 'dayjs';
import { AppData, TemplateFile } from '../../types';

interface TemplatesTabProps {
  data: AppData;
  addTemplate: () => void;
  deleteTemplate: (id: string) => void;
  deleteFile: (templateId: string, fileId: string) => void;
  setUploadingFiles: (val: { category: TemplateFile['category']; templateId?: string } | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const TemplatesTab = ({
  data,
  addTemplate,
  deleteTemplate,
  deleteFile,
  setUploadingFiles,
  fileInputRef
}: TemplatesTabProps) => {
  return (
    <motion.div 
      key="templates"
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mẫu giáo án & Tiêu chí</h2>
          <p className="text-sm text-slate-500">Tải lên giáo án mẫu và các tệp tiêu chí (PDF/Word) để AI soạn thảo đúng chuẩn</p>
        </div>
        <button 
          onClick={addTemplate}
          className="w-full sm:w-auto gradient-bg text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:opacity-90"
        >
          <Plus size={20} /> Thêm mẫu mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {data.templates?.map(tpl => (
          <div key={tpl.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Layout size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{tpl.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
                      {data.subjects?.find(s => s.id === tpl.subjectId)?.name || 'Chung'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      {dayjs(tpl.createdAt).format('DD/MM/YYYY')}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteTemplate(tpl.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                title="Xóa mẫu"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sample Lesson Plans */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-blue-500" /> Giáo án mẫu
                  </h4>
                  <button 
                    onClick={() => {
                      setUploadingFiles({ category: 'sample', templateId: tpl.id });
                      fileInputRef.current?.click();
                    }}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Tải lên giáo án mẫu"
                  >
                    <Upload size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {tpl.files?.filter(f => f.category === 'sample').map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/file">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileUp size={14} className="text-blue-400 shrink-0" />
                        <span className="text-xs text-slate-600 truncate font-medium">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteFile(tpl.id, file.id)}
                        className="opacity-0 group-hover/file:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {tpl.files?.filter(f => f.category === 'sample').length === 0 && (
                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-xl text-[10px] text-slate-400">
                      Chưa có giáo án mẫu
                    </div>
                  )}
                </div>
              </div>

              {/* Criteria Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileCheck size={14} className="text-green-500" /> Tiêu chí & Quy định
                  </h4>
                  <button 
                    onClick={() => {
                      setUploadingFiles({ category: 'criteria', templateId: tpl.id });
                      fileInputRef.current?.click();
                    }}
                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    title="Tải lên tiêu chí"
                  >
                    <Upload size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {tpl.files?.filter(f => f.category === 'criteria').map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/file">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck size={14} className="text-green-400 shrink-0" />
                        <span className="text-xs text-slate-600 truncate font-medium">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteFile(tpl.id, file.id)}
                        className="opacity-0 group-hover/file:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {tpl.files?.filter(f => f.category === 'criteria').length === 0 && (
                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-xl text-[10px] text-slate-400">
                      Chưa có tệp tiêu chí (Tối đa 10 tệp)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {data.templates?.length === 0 && (
          <div className="lg:col-span-2 p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-slate-400">
            <Layout className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">Chưa có mẫu giáo án nào</p>
            <p className="text-sm">Hãy thêm mẫu đầu tiên và tải lên các tệp hướng dẫn để AI học tập</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
