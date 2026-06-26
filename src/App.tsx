import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useAppState } from './hooks/useAppState';
import { useLessonCreator } from './hooks/useLessonCreator';
import { useChat } from './hooks/useChat';
import { useLessonPlanActions } from './hooks/useLessonPlanActions';
import { useSavedExams, estimateQuestionCount } from './hooks/useSavedExams';

// Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FloatingChatWidget } from './components/layout/FloatingChatWidget';
import { DashboardTab } from './components/tabs/DashboardTab';
import { SettingsModal } from './components/modals/SettingsModal';
import { LatexModal } from './components/modals/LatexModal';

// Lazy-loaded tabs (splits heavy chunks, loaded on first visit)
const CreatorTab = lazy(() => import('./components/tabs/CreatorTab').then(m => ({ default: m.CreatorTab })));
const LibraryTab = lazy(() => import('./components/tabs/LibraryTab').then(m => ({ default: m.LibraryTab })));
const TemplatesTab = lazy(() => import('./components/tabs/TemplatesTab').then(m => ({ default: m.TemplatesTab })));
const ChatTab = lazy(() => import('./components/tabs/ChatTab').then(m => ({ default: m.ChatTab })));
const TestingTab = lazy(() => import('./components/tabs/TestingTab').then(m => ({ default: m.TestingTab })));
const GradingTab = lazy(() => import('./components/tabs/GradingTab').then(m => ({ default: m.GradingTab })));
const ExamsTab = lazy(() => import('./components/tabs/ExamsTab').then(m => ({ default: m.ExamsTab })));
const AdaptiveLearningTab = lazy(() => import('./components/tabs/AdaptiveLearningTab').then(m => ({ default: m.AdaptiveLearningTab })));
const AdaptiveLessonListPage = lazy(() => import('./pages/AdaptiveLessonListPage').then(m => ({ default: m.AdaptiveLessonListPage })));
const AdaptiveLessonBuilderPage = lazy(() => import('./pages/AdaptiveLessonBuilderPage').then(m => ({ default: m.AdaptiveLessonBuilderPage })));
const AIToolsTab = lazy(() => import('./components/tabs/AIToolsTab').then(m => ({ default: m.AIToolsTab })));
const ClassesTab = lazy(() => import('./components/tabs/ClassesTab').then(m => ({ default: m.ClassesTab })));
const LessonUpgradeTab = lazy(() => import('./components/tabs/LessonUpgradeTab').then(m => ({ default: m.LessonUpgradeTab })));

// Utils
import { processUploadedFile } from './utils/fileUtils';
import * as exportUtils from './utils/exportUtils';
import { downloadBlob, safeFilename } from './utils/fileUtils';

// Types
import { TemplateFile } from './types';

export default function App() {
  const { user, isAuthLoading, handleLogin, handleLogout, handleDemoLogin, showToast } = useAuth();
  const {
    data, setData, communityPlans, isLoading, setIsLoading,
    fetchCommunityPlans, updateTemplate, updateTemplateFileSkeleton, addTemplate, deleteTemplate, deleteFile,
    setAuthorName, addDistribution, deleteDistribution,
    loadMorePlans, hasMorePlans, loadMoreCommunity, hasMoreCommunity,
    saveGradingSession, deleteGradingSession, deleteGradingResult,
  } = useAppState(user, showToast);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'creator' | 'library' | 'chat' | 'templates' | 'testing' | 'grading' | 'exams' | 'adaptiveLessons' | 'aiTools' | 'lessonUpgrade'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'personal' | 'community'>('personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const [latexContent, setLatexContent] = useState('');
  const [testingInitialContent, setTestingInitialContent] = useState<string | undefined>();
  const [adaptiveWorkspaceLessonId, setAdaptiveWorkspaceLessonId] = useState<string | null>(null);
  const [isAdaptiveStatsOpen, setIsAdaptiveStatsOpen] = useState(false);

  const navigateToTesting = (lessonContent: string, lessonTitle: string) => {
    setTestingInitialContent(`Soạn đề kiểm tra từ giáo án: "${lessonTitle}"\n\nNội dung bài học:\n${lessonContent}`);
    setActiveTab('testing');
  };
  const [uploadingFiles, setUploadingFiles] = useState<{ category: TemplateFile['category']; templateId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null!);

  // Sync EVERYTHING to Cloud periodically or on major change (already handled in useAppState)

  const creator = useLessonCreator(data, setData, setIsLoading, showToast, setIsSettingsOpen);
  const chat = useChat(
    data, 
    setIsLoading, 
    showToast,
    () => activeTab === 'creator' ? creator.currentPlan.content || null : null,
    (newContent) => creator.setCurrentPlan(prev => ({ ...prev, content: newContent }))
  );

  const { saveLessonPlan, saveBulkPlans, duplicatePlan, deletePlan, updatePlanMetadata, toggleSharePlan } =
    useLessonPlanActions({ user, data, setData, showToast, setIsLoading, setActiveTab, setAuthorName, creator });

  const { savedExams, communityExams, fetchCommunityExams, saveExam: saveExamToLib, deleteExam: deleteExamFromLib, toggleShareExam } =
    useSavedExams(user);

  const handleSaveExam = async (content: string, _hint: string) => {
    if (!user) { showToast('Vui lòng đăng nhập để lưu đề thi.', 'error'); return; }
    const { value: formValues } = await Swal.fire({
      title: 'Lưu đề thi vào Thư viện',
      html: `
        <input id="ex-title" class="swal2-input" placeholder="Tên đề thi (VD: Đề kiểm tra HK2 Toán 12)">
        <select id="ex-subject" class="swal2-input">${data.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}</select>
        <select id="ex-grade" class="swal2-input">${[...Array(12)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Lưu',
      cancelButtonText: 'Hủy',
      preConfirm: () => ({
        title: (document.getElementById('ex-title') as HTMLInputElement).value.trim(),
        subject: (document.getElementById('ex-subject') as HTMLSelectElement).value,
        grade: (document.getElementById('ex-grade') as HTMLSelectElement).value,
      }),
    });
    if (!formValues || !formValues.title) return;
    const now = new Date().toISOString();
    try {
      await saveExamToLib({
        id: `savedExam-${Date.now()}`,
        title: formValues.title,
        content,
        subject: formValues.subject,
        grade: formValues.grade,
        authorName: data.authorName || user.displayName || 'Giáo viên',
        userId: user.uid,
        isPublic: false,
        questionCount: estimateQuestionCount(content),
        createdAt: now,
        updatedAt: now,
      });
      showToast(`Đã lưu "${formValues.title}" vào Thư viện!`, 'success');
    } catch (e: any) {
      showToast(`Lỗi lưu: ${e.message}`, 'error');
    }
  };

  // Tự động tải Kho chung khi vào tab tương ứng
  useEffect(() => {
    if (activeTab === 'library' && libraryTab === 'community') {
      fetchCommunityPlans();
    }
  }, [activeTab, libraryTab, fetchCommunityPlans]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !uploadingFiles) return;

    setIsLoading(true);
    try {
      const processedFiles: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const resultFiles = await processUploadedFile(files[i], uploadingFiles.category, i);
        processedFiles.push(...resultFiles);
      }

      if (uploadingFiles.category === 'lesson_doc') {
        creator.setLessonDocs(prev => [...prev, ...processedFiles]);
      } else if (uploadingFiles.category === 'distribution') {
        const newDist = {
          id: `dist-${Date.now()}`,
          name: files[0].name,
          subjectId: creator.currentPlan.subjectId || 'math',
          grade: creator.currentPlan.grade || '10',
          content: processedFiles[0].content,
          createdAt: new Date().toISOString(),
          userId: user.uid
        };
        addDistribution(newDist);
      } else if (uploadingFiles.templateId) {
        const tId = uploadingFiles.templateId;
        setData(prev => ({
          ...prev,
          templates: prev.templates.map(t => 
            t.id === tId ? { ...t, files: [...t.files, ...processedFiles] } : t
          )
        }));
      }
      showToast('Tải tệp lên thành công!');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
      setUploadingFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Auth Guard
  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const highlights = [
      { label: 'Soạn giáo án', value: 'AI Co-pilot', tone: 'bg-[#d2e4ff] text-[#005ea1]' },
      { label: 'Đề kiểm tra', value: 'Ma trận Smart Grid', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Xuất file', value: 'Word/PDF A4', tone: 'bg-amber-50 text-amber-700' },
    ];

    return (
      <div className="min-h-screen bg-[#f8f9ff] text-[#0d1c2e]">
        <header className="sticky top-0 z-30 border-b border-[#c0c7d3]/50 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#005ea1] text-lg font-black text-white shadow-sm shadow-blue-100">D</div>
              <div>
                <p className="text-base font-black tracking-tight text-[#005ea1]">Giao An Dewey</p>
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#717782] sm:block">AI lesson workspace</p>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-[#414751] md:flex">
              <a href="#features" className="hover:text-[#005ea1]">Tính năng</a>
              <a href="#workflow" className="hover:text-[#005ea1]">Quy trình</a>
              <a href="#community" className="hover:text-[#005ea1]">Cộng đồng</a>
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={handleDemoLogin} className="hidden rounded-full border border-[#c0c7d3] px-4 py-2 text-sm font-bold text-[#414751] transition hover:border-[#005ea1]/40 hover:bg-[#eff4ff] hover:text-[#005ea1] sm:inline-flex">Dùng thử</button>
              <button onClick={handleLogin} className="rounded-full bg-[#005ea1] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-100 transition hover:bg-[#2178c3]">Đăng nhập</button>
            </div>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-[#d4e4fc] px-4 py-16 sm:px-6 lg:py-24">
            <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#dce9ff] blur-3xl" />
            <div className="pointer-events-none absolute -left-24 top-56 h-80 w-80 rounded-full bg-[#d2e4ff] blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#9fcaff]/60 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#005ea1] shadow-sm">
                  ✨ Trợ lý AI cho giáo viên Việt Nam
                </div>
                <div className="space-y-5">
                  <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] text-[#0d1c2e] sm:text-5xl lg:text-6xl">
                    Soạn giáo án, tạo đề và quản lý lớp học trong một workspace rõ ràng.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-[#414751] sm:text-lg">
                    Giao An Dewey giúp giáo viên tạo giáo án theo mục tiêu, biên soạn đề kiểm tra, xuất Word/PDF chuẩn A4, chấm tự luận bằng AI và theo dõi học tập thích ứng — giảm thao tác lặp lại, giữ chất lượng sư phạm.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={handleLogin} className="inline-flex items-center justify-center rounded-2xl bg-[#005ea1] px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#2178c3]">
                    Đăng nhập với Google để bắt đầu
                  </button>
                  <button onClick={handleDemoLogin} className="inline-flex items-center justify-center rounded-2xl border border-[#c0c7d3] bg-white px-6 py-4 text-sm font-black text-[#005ea1] transition hover:-translate-y-0.5 hover:border-[#005ea1]/40 hover:bg-[#eff4ff]">
                    Xem chế độ demo
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map(item => (
                    <div key={item.label} className="rounded-2xl border border-[#c0c7d3]/50 bg-white p-4 shadow-[0_4px_12px_rgba(0,94,161,0.06)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#717782]">{item.label}</p>
                      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="relative">
                <div className="rounded-[2rem] border border-[#c0c7d3]/60 bg-white p-4 shadow-[0_24px_80px_rgba(0,94,161,0.14)]">
                  <div className="rounded-[1.5rem] bg-[#f0f3ff] p-5">
                    <div className="flex items-center justify-between border-b border-[#c0c7d3]/40 pb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#005ea1]">Bảng điều khiển</p>
                        <h2 className="mt-1 text-xl font-black text-[#0d1c2e]">Tuần học hôm nay</h2>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">Sẵn sàng</div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {['Giáo án Vật lí 12', 'Đề kiểm tra Toán 10', 'Chấm tự luận Văn', 'Lộ trình cá nhân hoá'].map((title, idx) => (
                        <div key={title} className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#d2e4ff] text-lg">{['📘', '🧩', '✍️', '🎯'][idx]}</div>
                          <p className="text-sm font-black text-[#0d1c2e]">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#717782]">Tự động gợi ý bước tiếp theo, có thể chỉnh sửa trước khi xuất bản.</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl bg-[#005ea1] p-5 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">AI Co-pilot</p>
                      <p className="mt-2 text-sm leading-6 text-white/90">“Tạo hoạt động khởi động 5 phút, phân hoá cho 3 nhóm năng lực và kèm rubric đánh giá.”</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#005ea1]">Tính năng nổi bật</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0d1c2e]">Tập trung vào năng suất thật của giáo viên</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Soạn nhanh nhưng vẫn kiểm soát', 'Tạo giáo án, tài liệu và hoạt động theo lớp, môn, tuần học.'],
                ['Thi online & chấm AI', 'Biên soạn câu hỏi, phát hành mã thi, chấm tự luận và xuất kết quả.'],
                ['Thư viện & cộng đồng', 'Lưu giáo án cá nhân, khám phá tài nguyên và tái sử dụng template.'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-3xl border border-[#c0c7d3]/50 bg-white p-6 shadow-[0_4px_12px_rgba(0,94,161,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,94,161,0.12)]">
                  <div className="mb-5 h-12 w-12 rounded-2xl bg-[#d2e4ff]" />
                  <h3 className="text-lg font-black text-[#0d1c2e]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#414751]">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
      
      {/* Mobile backdrop — closes sidebar when tapping outside */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        onCreatorTabClick={() => {
          creator.setCurrentPlan({ title: '', content: '', subjectId: creator.currentPlan.subjectId || 'math', templateId: '', grade: creator.currentPlan.grade || '10', week: creator.currentPlan.week || '1' });
          setActiveTab('creator');
        }}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        setIsSettingsOpen={setIsSettingsOpen} handleLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Header activeTab={activeTab} data={data} setIsSettingsOpen={setIsSettingsOpen} setActiveTab={setActiveTab} onMenuClick={() => setIsSidebarOpen(true)} />
        {/* Banner nhắc nhập API Key khi chưa cấu hình */}
        {user && (() => {
          const s = data.settings;
          const allEmpty = !s.geminiApiKey && !s.claudeApiKey && !s.openaiApiKey && !s.grokApiKey && !s.deepseekApiKey && !s.openaiCompatibleApiKey;
          const providerKey: Record<string, string | undefined> = { gemini: s.geminiApiKey, claude: s.claudeApiKey, openai: s.openaiApiKey, grok: s.grokApiKey, deepseek: s.deepseekApiKey, 'openai-compatible': s.openaiCompatibleApiKey };
          const providerLabel: Record<string, string> = { gemini: 'Google Gemini', claude: 'Claude', openai: 'OpenAI', grok: 'Grok', deepseek: 'DeepSeek', 'openai-compatible': 'Custom API' };
          const activeProvider = s.selectedProvider || 'gemini';
          const activeKeyMissing = !allEmpty && !providerKey[activeProvider];
          if (!allEmpty && !activeKeyMissing) return null;
          return (
            <div className="mx-4 mt-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-sm">
              <span className="text-amber-800 font-medium">
                {allEmpty
                  ? '⚠️ Bạn chưa nhập API Key — AI sẽ dùng key dự phòng (có thể chậm). Vui lòng thêm key của bạn để có trải nghiệm tốt nhất.'
                  : `⚠️ Chưa nhập API Key cho ${providerLabel[activeProvider] || activeProvider} (đang chọn) — vui lòng thêm key hoặc đổi provider.`}
              </span>
              <button onClick={() => setIsSettingsOpen(true)} className="shrink-0 px-3 py-1 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors">Cài đặt</button>
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab data={data} setCurrentPlan={creator.setCurrentPlan} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'classes' && (
              <ClassesTab data={data} setData={setData} />
            )}

            {activeTab === 'creator' && (
              <CreatorTab
                {...creator} data={data} isLoading={isLoading} setIsLoading={setIsLoading} fileInputRef={fileInputRef}
                setUploadingFiles={setUploadingFiles} showToast={showToast}
                saveLessonPlan={saveLessonPlan} saveBulkPlans={saveBulkPlans}
                deleteDistribution={deleteDistribution}
                exportToPDF={(orientation) => exportUtils.exportToPDF(creator.currentPlan, showToast, orientation)}
                exportToLaTeX={() => exportUtils.exportToLaTeX(creator.currentPlan, data, setIsLoading, setIsSettingsOpen, showToast, setLatexContent, setIsLatexModalOpen)}
                onCreateExam={() => navigateToTesting(creator.currentPlan.content || '', creator.currentPlan.title || '')}
              />
            )}

            {activeTab === 'testing' && (
              <TestingTab
                data={data} user={user} isLoading={isLoading} setIsLoading={setIsLoading} showToast={showToast}
                initialContent={testingInitialContent}
                onConsumeInitialContent={() => setTestingInitialContent(undefined)}
                onSaveExam={handleSaveExam}
              />
            )}

            {activeTab === 'grading' && (
              <GradingTab
                data={data} setData={setData} isLoading={isLoading} setIsLoading={setIsLoading} showToast={showToast}
                user={user} saveGradingSession={saveGradingSession}
                deleteGradingSession={deleteGradingSession} deleteGradingResult={deleteGradingResult}
              />
            )}

            {activeTab === 'exams' && (
              <ExamsTab user={user} data={data} showToast={showToast} />
            )}

            {activeTab === 'adaptiveLessons' && (
              isAdaptiveStatsOpen ? (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={() => setIsAdaptiveStatsOpen(false)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    ← Quay lại quản lý bài học
                  </button>
                  <AdaptiveLearningTab user={user} />
                </div>
              ) : adaptiveWorkspaceLessonId ? (
                <AdaptiveLessonBuilderPage
                  embedded
                  lessonId={adaptiveWorkspaceLessonId}
                  settings={data.settings}
                  lessonPlans={data.lessonPlans}
                  onBackToList={() => setAdaptiveWorkspaceLessonId(null)}
                  onPreviewLesson={(lessonId) => window.open(`/adaptive-portal/${encodeURIComponent(lessonId)}`, '_blank', 'noopener,noreferrer')}
                  onNeedSettings={() => setIsSettingsOpen(true)}
                  showToast={showToast}
                />
              ) : (
                <AdaptiveLessonListPage
                  embedded
                  onCreateLesson={() => setAdaptiveWorkspaceLessonId('new')}
                  onOpenLesson={setAdaptiveWorkspaceLessonId}
                  onPreviewLesson={(lessonId) => window.open(`/adaptive-portal/${encodeURIComponent(lessonId)}`, '_blank', 'noopener,noreferrer')}
                  onOpenLearnerStats={() => setIsAdaptiveStatsOpen(true)}
                />
              )
            )}

            {activeTab === 'aiTools' && (
              <AIToolsTab data={data} isLoading={isLoading} setIsLoading={setIsLoading} showToast={showToast} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'lessonUpgrade' && (
              <LessonUpgradeTab data={data} isLoading={isLoading} setIsLoading={setIsLoading} showToast={showToast} />
            )}

            {activeTab === 'library' && (
              <LibraryTab
                libraryTab={libraryTab} setLibraryTab={setLibraryTab}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                setActiveTab={setActiveTab} data={data} communityPlans={communityPlans}
                setCurrentPlan={creator.setCurrentPlan} toggleSharePlan={toggleSharePlan}
                deletePlan={deletePlan} duplicatePlan={duplicatePlan}
                updatePlanMetadata={updatePlanMetadata} user={user}
                loadMorePlans={loadMorePlans} hasMorePlans={hasMorePlans}
                loadMoreCommunity={loadMoreCommunity} hasMoreCommunity={hasMoreCommunity}
                savedExams={savedExams}
                communityExams={communityExams}
                onDeleteExam={deleteExamFromLib}
                onToggleShareExam={toggleShareExam}
                onFetchCommunityExams={fetchCommunityExams}
                onOpenExamInEditor={(exam) => {
                  setTestingInitialContent(exam.content);
                  setActiveTab('testing');
                }}
                showToast={showToast}
              />
            )}

            {activeTab === 'templates' && (
              <TemplatesTab 
                data={data} fileInputRef={fileInputRef} setUploadingFiles={setUploadingFiles}
                addTemplate={() => {
                  Swal.fire({
                    title: 'Thêm mẫu mới',
                    html: `<input id="tpl-name" class="swal2-input" placeholder="Tên mẫu"><select id="tpl-subject" class="swal2-input">${data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>`,
                    preConfirm: () => ({ name: (document.getElementById('tpl-name') as HTMLInputElement).value, subjectId: (document.getElementById('tpl-subject') as HTMLSelectElement).value })
                  }).then(res => {
                    if (res.isConfirmed && res.value.name) {
                      const newId = `tpl-${Date.now()}`;
                      addTemplate({
                        id: newId,
                        name: res.value.name,
                        subjectId: res.value.subjectId,
                        files: [],
                        createdAt: new Date().toISOString()
                      });
                      creator.setCurrentPlan(prev => ({...prev, templateId: newId}));
                    }
                  });
                }}
                deleteTemplate={id => Swal.fire({title: 'Xóa mẫu?', showCancelButton: true}).then(res => { if (res.isConfirmed) deleteTemplate(id); })}
                deleteFile={(tId, fId) => deleteFile(tId, fId)}
                updateFileSkeleton={updateTemplateFileSkeleton}
              />
            )}

            {activeTab === 'chat' && <ChatTab {...chat} isLoading={isLoading} />}
          </AnimatePresence>
          </Suspense>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} data={data} setData={setData} showToast={showToast} />
      
      <LatexModal 
        isOpen={isLatexModalOpen} onClose={() => setIsLatexModalOpen(false)} 
        latexContent={latexContent} currentPlan={creator.currentPlan}
        downloadLaTeXFile={() => downloadBlob(new Blob([latexContent], {type: 'text/plain;charset=utf-8'}), `${safeFilename(creator.currentPlan.title)}.tex`)}
        openInOverleaf={() => exportUtils.openInOverleaf(latexContent, creator.currentPlan, showToast)}
        showToast={showToast}
      />
      <FloatingChatWidget {...chat} isLoading={isLoading} />
    </div>
  );
}
