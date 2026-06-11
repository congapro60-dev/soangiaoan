import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  UploadCloud, Search, Plus, FileText, Eye, Trash2, Copy,
  Edit3, Check, X, Filter, Users, ClipboardList, BookMarked,
  Download, Upload, Library, Globe2, FolderOpen, Sparkles,
  Clock, Layers3, ArrowUpRight, ShieldCheck, Loader2, Presentation
} from 'lucide-react';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { cn } from '../../lib/utils';
import { AppData, LessonPlan } from '../../types';
import { SavedExam } from '../../hooks/useSavedExams';
import { ViewPlanModal } from '../modals/ViewPlanModal';
import { downloadBlob } from '../../utils/fileUtils';
import * as worksheetUtils from '../../utils/worksheetUtils';
import * as scormUtils from '../../utils/scormUtils';
import { Package } from 'lucide-react';

interface LibraryTabProps {
  libraryTab: 'personal' | 'community';
  setLibraryTab: (tab: 'personal' | 'community') => void;
  searchQuery: string;
  loadMorePlans: () => void;
  hasMorePlans: boolean;
  loadMoreCommunity: () => void;
  hasMoreCommunity: boolean;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: any) => void;
  data: AppData;
  communityPlans: LessonPlan[];
  setCurrentPlan: (plan: Partial<LessonPlan>) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (plan: LessonPlan) => void;
  updatePlanMetadata: (id: string, updates: Partial<LessonPlan>) => void;
  user: any;
  toggleSharePlan: (e: React.MouseEvent, plan: LessonPlan) => void;
  // Exam library
  savedExams: SavedExam[];
  communityExams: SavedExam[];
  onDeleteExam: (id: string) => void;
  onToggleShareExam: (id: string, isPublic: boolean) => void;
  onOpenExamInEditor: (exam: SavedExam) => void;
  onFetchCommunityExams: () => void;
  showToast: (msg: string, type?: any) => void;
}

type ContentTab = 'plans' | 'exams';

const getPlanSectionCount = (content?: string) => {
  if (!content) return 0;
  const markdownHeadings = content.match(/^#{1,3}\s+/gm)?.length || 0;
  const vietnameseSections = content.match(/(?:mục tiêu|khởi động|hình thành|luyện tập|vận dụng|đánh giá)/gi)?.length || 0;
  return Math.max(markdownHeadings, Math.min(vietnameseSections, 6));
};

const getWordCount = (content?: string) => (content || '').trim().split(/\s+/).filter(Boolean).length;

export const LibraryTab = ({
  libraryTab, setLibraryTab, searchQuery, setSearchQuery,
  setActiveTab, data, communityPlans, setCurrentPlan,
  deletePlan, duplicatePlan, updatePlanMetadata, user,
  toggleSharePlan, loadMorePlans, hasMorePlans, loadMoreCommunity, hasMoreCommunity,
  savedExams, communityExams, onDeleteExam, onToggleShareExam, onOpenExamInEditor, onFetchCommunityExams, showToast,
}: LibraryTabProps) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LessonPlan>>({});
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [isGeneratingSlideFor, setIsGeneratingSlideFor] = useState<string | null>(null);
  const [isGeneratingWorksheetFor, setIsGeneratingWorksheetFor] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>('plans');

  useEffect(() => {
    if (libraryTab === 'community') onFetchCommunityExams();
  }, [libraryTab]);

  const plans = libraryTab === 'personal' ? data.lessonPlans : communityPlans;
  const exams = libraryTab === 'personal' ? savedExams : communityExams;
  const sharedPersonalPlans = data.lessonPlans.filter(p => p.isPublic).length;
  const sharedPersonalExams = savedExams.filter(e => e.isPublic).length;

  const filteredPlans = plans.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesGrade = selectedGrade === 'all' || p.grade === selectedGrade;
    const matchesWeek = selectedWeek === 'all' || p.week === selectedWeek;
    return matchesSearch && matchesGrade && matchesWeek;
  });

  const filteredExams = exams.filter(e =>
    (e.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) &&
    (selectedGrade === 'all' || e.grade === selectedGrade)
  );

  const visibleCount = contentTab === 'plans' ? filteredPlans.length : filteredExams.length;
  const sourceCount = contentTab === 'plans' ? plans.length : exams.length;

  const handleQuickPPTX = async (plan: LessonPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingSlideFor) return;
    setIsGeneratingSlideFor(plan.id);
    
    const exportUtils = await import('../../utils/exportUtils');
    const slides = await exportUtils.generateSlideData(plan, data, () => {}, showToast);
    
    if (slides) {
      showToast('Đang tạo file PPTX (đang render công thức Toán)...', 'info');
      try {
        await exportUtils.downloadPPTX(slides, plan.title || 'baigiang');
        showToast('Đã lưu file trình chiếu!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Lỗi khi tạo file PPTX, vui lòng thử lại.', 'error');
      }
    }
    setIsGeneratingSlideFor(null);
  };

  const handleQuickWorksheet = async (plan: LessonPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingWorksheetFor) return;
    setIsGeneratingWorksheetFor(plan.id);
    
    const worksheetMarkdown = await worksheetUtils.generateWorksheetMarkdown(plan, data, showToast);
    
    if (worksheetMarkdown) {
      try {
        const fakePlan: Partial<LessonPlan> = {
          title: (plan.title || 'GiaoAn') + ' - Phieu hoc tap',
          content: worksheetMarkdown,
          templateId: plan.templateId
        };
        const exportUtils = await import('../../utils/exportUtils');
        await exportUtils.exportLessonViaAPI(fakePlan, 'docx', 'portrait', showToast);
        showToast('Đã tải Phiếu học tập (Word)!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Lỗi tải Phiếu học tập.', 'error');
      }
    }
    setIsGeneratingWorksheetFor(null);
  };

  const handleQuickSCORM = async (plan: LessonPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    await scormUtils.exportToSCORM(plan, showToast);
  };

  const handleExportExamWord = async (exam: SavedExam) => {
    try {
      const { marked } = await import('marked');
      const { WORD_EXPORT_STYLES } = await import('../../utils/examPaperStyles');
      const htmlBody = await marked(exam.content);
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>${WORD_EXPORT_STYLES}</style></head>
<body>${htmlBody}</body></html>`;
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, new TextEncoder().encode(html)], { type: 'application/msword' });
      downloadBlob(blob, `${exam.title.replace(/\s+/g, '_')}.doc`);
    } catch { /* silently fail */ }
  };

  const handleDeleteExam = async (exam: SavedExam) => {
    const res = await Swal.fire({
      title: 'Xóa đề thi?',
      text: `"${exam.title}" sẽ bị xóa vĩnh viễn.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', confirmButtonColor: '#dc2626',
    });
    if (res.isConfirmed) onDeleteExam(exam.id);
  };

  const resetFilters = () => {
    setSelectedGrade('all');
    setSelectedWeek('all');
  };

  return (
    <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">
      <section className="relative overflow-hidden rounded-[36px] border border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 md:p-8 text-white shadow-2xl shadow-blue-100">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-28 w-28 rounded-t-[48px] bg-white/10 md:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-50">
              <Library className="h-3.5 w-3.5" />
              Library workspace
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Thư viện bài dạy & đề kiểm tra</h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base font-medium leading-7 text-blue-50/90">
              Gom toàn bộ giáo án, đề thi và tài nguyên cộng đồng vào một workspace rõ ràng: dễ lọc, dễ xem trước, dễ chia sẻ và quay lại chỉnh sửa khi cần.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab(contentTab === 'plans' ? 'creator' : 'testing')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-xl shadow-blue-950/10 transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                {contentTab === 'plans' ? 'Soạn giáo án mới' : 'Soạn đề mới'}
              </button>
              <button
                onClick={() => setLibraryTab(libraryTab === 'personal' ? 'community' : 'personal')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
              >
                {libraryTab === 'personal' ? <Globe2 className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                {libraryTab === 'personal' ? 'Khám phá kho chung' : 'Về góc của tôi'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LibraryMetric label="Giáo án" value={plans.length} icon={<ClipboardList className="h-4 w-4" />} />
            <LibraryMetric label="Đề thi" value={exams.length} icon={<BookMarked className="h-4 w-4" />} />
            <LibraryMetric label="Đang hiển thị" value={visibleCount} icon={<Search className="h-4 w-4" />} />
            <LibraryMetric label={libraryTab === 'personal' ? 'Đã chia sẻ' : 'Nguồn cộng đồng'} value={libraryTab === 'personal' ? sharedPersonalPlans + sharedPersonalExams : sourceCount} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] border border-slate-100 bg-white p-3 shadow-sm">
            <button
              onClick={() => setLibraryTab('personal')}
              className={cn('mb-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all',
                libraryTab === 'personal' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}
            >
              <span className="flex items-center gap-2 text-sm font-black"><FolderOpen className="h-4 w-4" /> Góc của tôi</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black', libraryTab === 'personal' ? 'bg-white/20' : 'bg-slate-100')}>{data.lessonPlans.length + savedExams.length}</span>
            </button>
            <button
              onClick={() => setLibraryTab('community')}
              className={cn('flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all',
                libraryTab === 'community' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}
            >
              <span className="flex items-center gap-2 text-sm font-black"><Globe2 className="h-4 w-4" /> Kho chung</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black', libraryTab === 'community' ? 'bg-white/20' : 'bg-slate-100')}>{communityPlans.length + communityExams.length}</span>
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              <Filter className="h-3.5 w-3.5" /> Bộ lọc
            </div>
            <div className="space-y-3">
              <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
                title="Lọc theo khối lớp"
                aria-label="Lọc theo khối lớp"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                <option value="all">Tất cả khối lớp</option>
                {[...Array(12)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Khối {i + 1}</option>)}
              </select>
              {contentTab === 'plans' && (
                <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}
                  title="Lọc theo tuần học"
                  aria-label="Lọc theo tuần học"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                  <option value="all">Tất cả tuần học</option>
                  {[...Array(35)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Tuần {i + 1}</option>)}
                </select>
              )}
              {(selectedGrade !== 'all' || selectedWeek !== 'all') && (
                <button onClick={resetFilters} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100">
                  <X className="h-4 w-4" /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black text-emerald-900">Gợi ý UX</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-emerald-700">
              Dùng preview tĩnh để đọc nhanh nội dung. Khi cần sửa cấu trúc bài, mở sang trình soạn thảo để tránh nhầm với luồng cấu hình xuất file A4.
            </p>
          </div>
        </aside>

        <main className="space-y-5">
          <div className="rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <ContentTypeButton
                  active={contentTab === 'plans'}
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Giáo án"
                  count={(libraryTab === 'personal' ? data.lessonPlans : communityPlans).length}
                  accent="blue"
                  onClick={() => setContentTab('plans')}
                />
                <ContentTypeButton
                  active={contentTab === 'exams'}
                  icon={<BookMarked className="h-4 w-4" />}
                  label="Đề thi"
                  count={exams.length}
                  accent="violet"
                  onClick={() => setContentTab('exams')}
                />
              </div>
              <div className="relative min-w-0 flex-1 xl:max-w-md">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={contentTab === 'plans' ? 'Tìm theo tên giáo án...' : 'Tìm theo tên đề thi...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>
          </div>

          {contentTab === 'plans' && (
            <>
              {filteredPlans.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="w-10 h-10 text-slate-300" />}
                  title={libraryTab === 'community' ? 'Kho chung đang trống' : 'Chưa có giáo án nào'}
                  desc={libraryTab === 'community'
                    ? 'Hãy chia sẻ giáo án lên Kho chung để cộng đồng cùng học hỏi.'
                    : 'Nhấn "Soạn giáo án mới" để tạo với sự hỗ trợ của AI.'}
                  action={libraryTab === 'personal' ? (
                    <button onClick={() => setActiveTab('creator')}
                      className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                      <Plus className="w-5 h-5" /> Soạn bài ngay
                    </button>
                  ) : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredPlans.map(plan => {
                    const sectionCount = getPlanSectionCount(plan.content);
                    const wordCount = getWordCount(plan.content);
                    return (
                      <motion.article key={plan.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => setViewingPlan(plan)}
                        className="group cursor-pointer overflow-hidden rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-600">Lớp {plan.grade || '?'}</span>
                                <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-600">Tuần {plan.week || '?'}</span>
                                {plan.isPublic && <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">Đã chia sẻ</span>}
                              </div>
                              {editingId === plan.id ? (
                                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                                    className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tên giáo án" />
                                  <div className="grid grid-cols-2 gap-2">
                                    <select value={editForm.grade || ''} onChange={e => setEditForm(p => ({ ...p, grade: e.target.value }))}
                                      title="Chọn lớp cho giáo án"
                                      aria-label="Chọn lớp cho giáo án"
                                      className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs outline-none">
                                      {[...Array(12)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Lớp {i + 1}</option>)}
                                    </select>
                                    <select value={editForm.week || ''} onChange={e => setEditForm(p => ({ ...p, week: e.target.value }))}
                                      title="Chọn tuần cho giáo án"
                                      aria-label="Chọn tuần cho giáo án"
                                      className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs outline-none">
                                      {[...Array(35)].map((_, i) => <option key={i + 1} value={(i + 1).toString()}>Tuần {i + 1}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => { updatePlanMetadata(plan.id, editForm); setEditingId(null); }}
                                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700">
                                      <Check className="h-3 w-3" /> Lưu
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600">
                                      <X className="h-3 w-3" /> Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <h4 className="line-clamp-2 text-lg font-black leading-snug text-slate-900 transition-colors group-hover:text-blue-700">{plan.title}</h4>
                              )}
                            </div>
                          </div>
                        </div>

                        {editingId !== plan.id && (
                          <>
                            <div className="mb-4 flex flex-wrap gap-1.5 rounded-2xl bg-slate-50/70 p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button title="Tạo Phiếu học tập" onClick={(e) => handleQuickWorksheet(plan, e)}
                                disabled={isGeneratingWorksheetFor === plan.id}
                                className={cn('rounded-xl p-2 transition-all', isGeneratingWorksheetFor === plan.id ? 'bg-teal-100 text-teal-600' : 'bg-white text-slate-400 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50')}>
                                {isGeneratingWorksheetFor === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                              </button>
                              <button title="Xuất SCORM" onClick={(e) => handleQuickSCORM(plan, e)}
                                className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600">
                                <Package className="h-4 w-4" />
                              </button>
                              <button title="Xuất PPTX" onClick={(e) => handleQuickPPTX(plan, e)}
                                className={cn('rounded-xl p-2 transition-all', isGeneratingSlideFor === plan.id ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600')}>
                                <Presentation className="h-4 w-4" />
                              </button>
                              {libraryTab === 'personal' && (
                                <button title={plan.isPublic ? 'Thu hồi' : 'Chia sẻ lên Kho chung'}
                                  onClick={(e) => { e.stopPropagation(); toggleSharePlan(e, plan); }}
                                  className={cn('rounded-xl p-2 transition-all', plan.isPublic ? 'bg-orange-50 text-orange-600' : 'bg-white text-slate-400 hover:bg-orange-50 hover:text-orange-600')}>
                                  <UploadCloud className="h-4 w-4" />
                                </button>
                              )}
                              <button title="Xem preview" onClick={(e) => { e.stopPropagation(); setViewingPlan(plan); }}
                                className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600">
                                <Eye className="h-4 w-4" />
                              </button>
                              {libraryTab === 'personal' && (
                                <>
                                  <button title="Nhân bản" onClick={(e) => { e.stopPropagation(); duplicatePlan(plan); }}
                                    className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600">
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <button title="Sửa metadata" onClick={(e) => { e.stopPropagation(); setEditingId(plan.id); setEditForm({ title: plan.title, grade: plan.grade, week: plan.week, authorName: plan.authorName }); }}
                                    className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600">
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button title="Xóa giáo án" aria-label="Xóa giáo án" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                                    className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="mb-4 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
                              {(plan.content || '').replace(/[#*_`>-]/g, '').slice(0, 170) || 'Chưa có nội dung xem trước cho giáo án này.'}
                            </p>
                            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2">
                              <MiniStat icon={<Layers3 className="h-3.5 w-3.5" />} label="Phần" value={sectionCount || '—'} />
                              <MiniStat icon={<FileText className="h-3.5 w-3.5" />} label="Từ" value={wordCount || '—'} />
                              <MiniStat icon={<Clock className="h-3.5 w-3.5" />} label="Cập nhật" value={dayjs(plan.updatedAt).format('DD/MM')} />
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="truncate text-xs font-bold text-slate-400">{plan.authorName || user?.displayName || 'Ẩn danh'}</span>
                              <span className="flex items-center gap-1 text-xs font-black text-blue-600">Xem preview <ArrowUpRight className="h-3.5 w-3.5" /></span>
                            </div>
                          </>
                        )}
                      </motion.article>
                    );
                  })}
                </div>
              )}
              {(libraryTab === 'personal' ? hasMorePlans : hasMoreCommunity) && (
                <div className="flex justify-center pb-8">
                  <button onClick={libraryTab === 'personal' ? loadMorePlans : loadMoreCommunity}
                    className="rounded-2xl border border-slate-200 bg-white px-8 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                    Tải thêm giáo án...
                  </button>
                </div>
              )}
            </>
          )}

          {contentTab === 'exams' && (
            <>
              {filteredExams.length === 0 ? (
                <EmptyState
                  icon={<BookMarked className="w-10 h-10 text-slate-300" />}
                  title={libraryTab === 'community' ? 'Kho đề thi chung đang trống' : 'Chưa có đề thi nào được lưu'}
                  desc={libraryTab === 'community'
                    ? 'Hãy chia sẻ đề thi lên Kho chung để giáo viên khác cùng sử dụng.'
                    : 'Soạn đề trong tab "Bảng Kiểm tra" rồi nhấn "Lưu vào Thư viện" để lưu tại đây.'}
                  action={libraryTab === 'personal' ? (
                    <button onClick={() => setActiveTab('testing')}
                      className="mt-4 flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700">
                      <Plus className="w-5 h-5" /> Soạn đề ngay
                    </button>
                  ) : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredExams.map(exam => (
                    <motion.article key={exam.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="group overflow-hidden rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                            <BookMarked className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {exam.grade && <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-600">Khối {exam.grade}</span>}
                              {exam.subject && <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-600">{exam.subject}</span>}
                              {exam.questionCount && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{exam.questionCount} câu</span>}
                              {exam.isPublic && <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">Kho chung</span>}
                            </div>
                            <h4 className="line-clamp-2 cursor-pointer text-lg font-black leading-snug text-slate-900 transition-colors group-hover:text-violet-700" onClick={() => onOpenExamInEditor(exam)}>
                              {exam.title}
                            </h4>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 flex flex-wrap gap-1.5 rounded-2xl bg-slate-50/70 p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        {libraryTab === 'personal' && (
                          <>
                            <button title={exam.isPublic ? 'Thu hồi khỏi Kho chung' : 'Chia sẻ lên Kho chung'}
                              onClick={() => onToggleShareExam(exam.id, !exam.isPublic)}
                              className={cn('rounded-xl p-2 transition-all', exam.isPublic ? 'bg-orange-50 text-orange-600' : 'bg-white text-slate-400 hover:bg-orange-50 hover:text-orange-600')}>
                              <UploadCloud className="h-4 w-4" />
                            </button>
                            <button title="Mở để chỉnh sửa" onClick={() => onOpenExamInEditor(exam)}
                              className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-violet-50 hover:text-violet-600">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button title="Xuất Word" onClick={() => handleExportExamWord(exam)}
                              className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600">
                              <Download className="h-4 w-4" />
                            </button>
                            <button title="Xóa đề thi" aria-label="Xóa đề thi" onClick={() => handleDeleteExam(exam)}
                              className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {libraryTab === 'community' && (
                          <>
                            <button title="Xuất Word" onClick={() => handleExportExamWord(exam)}
                              className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600">
                              <Download className="h-4 w-4" />
                            </button>
                            <button title="Tải về & tạo đề thi online" onClick={() => onOpenExamInEditor(exam)}
                              className="rounded-xl bg-white p-2 text-slate-400 transition-all hover:bg-violet-50 hover:text-violet-600">
                              <Upload className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
                        {(exam.content || '').replace(/[#*_`>-]/g, '').slice(0, 170) || 'Chưa có nội dung xem trước cho đề thi này.'}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="truncate text-xs font-bold text-slate-400">{exam.authorName || 'Ẩn danh'}</span>
                        <span className="text-xs font-black uppercase text-slate-300">{dayjs(exam.updatedAt).format('DD/MM/YY')}</span>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <ViewPlanModal
        plan={viewingPlan}
        data={data}
        showToast={showToast}
        onClose={() => setViewingPlan(null)}
        onEdit={(plan) => {
          setCurrentPlan(plan);
          setActiveTab('creator');
          setViewingPlan(null);
        }} />
    </motion.div>
  );
};

const LibraryMetric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-[24px] border border-white/15 bg-white/15 p-4 backdrop-blur-sm">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 text-white">{icon}</div>
    <div className="text-2xl font-black leading-none">{value}</div>
    <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-50/80">{label}</div>
  </div>
);

const ContentTypeButton = ({ active, icon, label, count, accent, onClick }: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: 'blue' | 'violet';
  onClick: () => void;
}) => {
  const activeClass = accent === 'blue'
    ? 'border-blue-600 bg-blue-50 text-blue-700'
    : 'border-violet-600 bg-violet-50 text-violet-700';
  const badgeClass = accent === 'blue' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white';

  return (
    <button
      onClick={onClick}
      className={cn('flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-sm font-black transition-all',
        active ? activeClass : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:text-slate-800')}
    >
      {icon}
      {label}
      <span className={cn('rounded-lg px-2 py-0.5 text-[10px] font-black', active ? badgeClass : 'bg-slate-100 text-slate-500')}>{count}</span>
    </button>
  );
};

const MiniStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="rounded-xl bg-white px-3 py-2">
    <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{icon}{label}</div>
    <div className="text-xs font-black text-slate-700">{value}</div>
  </div>
);

const EmptyState = ({ icon, title, desc, action }: {
  icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[32px] bg-slate-100">{icon}</div>
    <h3 className="mb-2 text-lg font-black text-slate-500">{title}</h3>
    <p className="max-w-sm text-sm font-medium leading-6 text-slate-400">{desc}</p>
    {action}
  </div>
);
