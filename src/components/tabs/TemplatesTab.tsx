import { motion } from 'motion/react';
import {
  Plus,
  Layout,
  Trash2,
  FileText,
  Upload,
  FileUp,
  X,
  FileCheck,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Layers3,
  FolderUp,
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
  const templates = data.templates || [];
  const totalFiles = templates.reduce((sum, tpl) => sum + (tpl.files?.length || 0), 0);
  const sampleCount = templates.reduce((sum, tpl) => sum + (tpl.files?.filter(f => f.category === 'sample').length || 0), 0);
  const criteriaCount = templates.reduce((sum, tpl) => sum + (tpl.files?.filter(f => f.category === 'criteria').length || 0), 0);
  const skeletonCount = templates.reduce((sum, tpl) => sum + (tpl.files?.filter(f => !!f.skeleton).length || 0), 0);

  const uploadFile = (category: TemplateFile['category'], templateId: string) => {
    setUploadingFiles({ category, templateId });
    fileInputRef.current?.click();
  };

  const stats = [
    { label: 'Bộ mẫu', value: templates.length, icon: Layers3, tone: 'bg-[#d2e4ff] text-[#005ea1]' },
    { label: 'Giáo án mẫu', value: sampleCount, icon: BookOpen, tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Tệp tiêu chí', value: criteriaCount, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Skeleton', value: skeletonCount, icon: FolderUp, tone: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <motion.div
      key="templates"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-6"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c0c7d3]/60 bg-[#f8f9ff] p-6 shadow-[0_18px_60px_rgba(0,94,161,0.08)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#d2e4ff] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-20 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9fcaff]/70 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#005ea1] shadow-sm">
              <Sparkles size={14} /> Thư viện chuẩn soạn thảo
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#0d1c2e] sm:text-4xl">
                Mẫu giáo án & tiêu chí cho AI
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#414751] sm:text-base">
                Tải lên giáo án mẫu, rubric, quy định trình bày hoặc tài liệu chuyên môn để AI học đúng phong cách của tổ bộ môn. Mỗi bộ mẫu có thể gắn theo môn học và dùng lại khi soạn giáo án mới.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={addTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#005ea1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#2178c3]"
              >
                <Plus size={18} /> Thêm mẫu mới
              </button>
              <div className="inline-flex items-center justify-center rounded-2xl border border-[#c0c7d3]/70 bg-white px-5 py-3 text-sm font-bold text-[#414751]">
                Hỗ trợ PDF, Word và văn bản dài
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-white/80 bg-white p-4 shadow-[0_6px_18px_rgba(0,94,161,0.06)]">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-black text-[#0d1c2e]">{item.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#717782]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {templates.map(tpl => {
          const sampleFiles = tpl.files?.filter(f => f.category === 'sample') || [];
          const criteriaFiles = tpl.files?.filter(f => f.category === 'criteria') || [];
          const subjectName = data.subjects?.find(s => s.id === tpl.subjectId)?.name || 'Chung';

          return (
            <motion.article
              key={tpl.id}
              layout
              className="group overflow-hidden rounded-[2rem] border border-[#c0c7d3]/60 bg-white shadow-[0_10px_30px_rgba(0,94,161,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(0,94,161,0.12)]"
            >
              <div className="border-b border-[#e6edf7] bg-gradient-to-br from-white to-[#f0f3ff] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#d2e4ff] text-[#005ea1] shadow-inner">
                      <Layout size={26} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-[#0d1c2e] sm:text-xl">{tpl.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#005ea1] ring-1 ring-[#d4e4fc]">
                          {subjectName}
                        </span>
                        <span className="rounded-full bg-[#f8f9ff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#717782] ring-1 ring-[#e6edf7]">
                          {dayjs(tpl.createdAt).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    className="rounded-2xl p-2.5 text-[#9aa3af] transition hover:bg-red-50 hover:text-red-600"
                    title="Xóa mẫu"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
                <TemplateFileColumn
                  title="Giáo án mẫu"
                  description="Ví dụ để AI học cấu trúc và văn phong."
                  icon={FileText}
                  uploadTone="bg-[#d2e4ff] text-[#005ea1] hover:bg-[#bdd8ff]"
                  fileTone="text-[#005ea1]"
                  emptyText="Chưa có giáo án mẫu"
                  files={sampleFiles}
                  onUpload={() => uploadFile('sample', tpl.id)}
                  onDelete={(fileId) => deleteFile(tpl.id, fileId)}
                />

                <TemplateFileColumn
                  title="Tiêu chí & quy định"
                  description="Rubric, yêu cầu trình bày, chuẩn tổ bộ môn."
                  icon={FileCheck}
                  uploadTone="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  fileTone="text-emerald-600"
                  emptyText="Chưa có tệp tiêu chí (tối đa 10 tệp)"
                  files={criteriaFiles}
                  onUpload={() => uploadFile('criteria', tpl.id)}
                  onDelete={(fileId) => deleteFile(tpl.id, fileId)}
                />
              </div>
            </motion.article>
          );
        })}

        {templates.length === 0 && (
          <div className="xl:col-span-2 rounded-[2rem] border-2 border-dashed border-[#c0c7d3] bg-white p-12 text-center shadow-[0_10px_30px_rgba(0,94,161,0.05)] sm:p-16">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#d2e4ff] text-[#005ea1]">
              <Layout size={36} />
            </div>
            <h3 className="text-2xl font-black text-[#0d1c2e]">Chưa có mẫu giáo án nào</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#717782]">
              Hãy thêm bộ mẫu đầu tiên và tải lên tài liệu hướng dẫn để AI tạo giáo án sát chuẩn chuyên môn của bạn hơn.
            </p>
            <button
              onClick={addTemplate}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#005ea1] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#2178c3]"
            >
              <Plus size={18} /> Tạo bộ mẫu đầu tiên
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
};

interface TemplateFileColumnProps {
  title: string;
  description: string;
  icon: typeof FileText;
  uploadTone: string;
  fileTone: string;
  emptyText: string;
  files: TemplateFile[];
  onUpload: () => void;
  onDelete: (fileId: string) => void;
}

const TemplateFileColumn = ({
  title,
  description,
  icon: Icon,
  uploadTone,
  fileTone,
  emptyText,
  files,
  onUpload,
  onDelete,
}: TemplateFileColumnProps) => (
  <div className="rounded-3xl border border-[#e6edf7] bg-[#f8f9ff] p-4">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#414751]">
          <Icon size={15} className={fileTone} /> {title}
        </h4>
        <p className="mt-1 text-xs leading-5 text-[#717782]">{description}</p>
      </div>
      <button
        onClick={onUpload}
        className={`shrink-0 rounded-2xl p-2.5 transition ${uploadTone}`}
        title={`Tải lên ${title.toLowerCase()}`}
      >
        <Upload size={15} />
      </button>
    </div>

    <div className="space-y-2">
      {files.map(file => (
        <div key={file.id} className="group/file rounded-2xl border border-white bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0f3ff]">
                <FileUp size={14} className={fileTone} />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-[#414751]">{file.name}</span>
                {file.skeleton && (
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.08em] text-[#005ea1]">
                    Skeleton: {file.skeleton.stats.headingCount} heading · {file.skeleton.stats.tableCount} bảng · {file.skeleton.stats.placeholderCount} placeholder
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onDelete(file.id)}
              className="rounded-lg p-1.5 text-[#9aa3af] opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover/file:opacity-100"
              title="Xóa tệp"
            >
              <X size={13} />
            </button>
          </div>
          {file.skeleton && (
            <details className="mt-2 rounded-xl border border-[#e6edf7] bg-[#f8f9ff] px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.08em] text-[#717782]">
                Xem Markdown Skeleton
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-5 text-[#414751]">
                {file.skeleton.markdown}
              </pre>
            </details>
          )}
        </div>
      ))}
      {files.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[#dbe5f2] bg-white/70 px-3 py-6 text-center text-xs font-bold text-[#9aa3af]">
          {emptyText}
        </div>
      )}
    </div>
  </div>
);
