import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useAppState } from './hooks/useAppState';
import { useLessonCreator } from './hooks/useLessonCreator';
import { useChat } from './hooks/useChat';
import { useLessonPlanActions } from './hooks/useLessonPlanActions';

// Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardTab } from './components/tabs/DashboardTab';
import { CreatorTab } from './components/tabs/CreatorTab';
import { LibraryTab } from './components/tabs/LibraryTab';
import { TemplatesTab } from './components/tabs/TemplatesTab';
import { ChatTab } from './components/tabs/ChatTab';
import { TestingTab } from './components/tabs/TestingTab';
import { GradingTab } from './components/tabs/GradingTab';
import { ExamsTab } from './components/tabs/ExamsTab';
import { SettingsModal } from './components/modals/SettingsModal';
import { LatexModal } from './components/modals/LatexModal';

// Utils
import { processUploadedFile } from './utils/fileUtils';
import * as exportUtils from './utils/exportUtils';
import { downloadBlob } from './utils/fileUtils';

// Types
import { TemplateFile } from './types';

export default function App() {
  const { user, isAuthLoading, handleLogin, handleLogout, handleDemoLogin, showToast } = useAuth();
  const {
    data, setData, communityPlans, isLoading, setIsLoading,
    fetchCommunityPlans, updateTemplate, addTemplate, deleteTemplate, deleteFile,
    setAuthorName, addDistribution, deleteDistribution,
    loadMorePlans, hasMorePlans, loadMoreCommunity, hasMoreCommunity,
    saveGradingSession, deleteGradingSession, deleteGradingResult,
  } = useAppState(user, showToast);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'creator' | 'library' | 'chat' | 'templates' | 'testing' | 'grading' | 'exams'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'personal' | 'community'>('personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const [latexContent, setLatexContent] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<{ category: TemplateFile['category']; templateId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync EVERYTHING to Cloud periodically or on major change (already handled in useAppState)

  const creator = useLessonCreator(data, setData, setIsLoading, showToast, setIsSettingsOpen);
  const chat = useChat(data, setIsLoading, showToast);

  const { saveLessonPlan, saveBulkPlans, duplicatePlan, deletePlan, updatePlanMetadata, toggleSharePlan } =
    useLessonPlanActions({ user, data, setData, showToast, setIsLoading, setActiveTab, setAuthorName, creator });

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
        const file = await processUploadedFile(files[i], uploadingFiles.category, i);
        processedFiles.push(file);
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
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 text-center space-y-8">
          <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
            <span className="text-4xl text-white font-bold">A</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lesson Plan AI</h1>
            <p className="text-slate-500 mt-2">Hệ thống soạn giáo án thông minh bậc học chuẩn quốc tế</p>
          </div>
          <button onClick={handleLogin} className="w-full py-4 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:opacity-90 transition-opacity flex items-center justify-center gap-3">
            Đăng nhập với Google để bắt đầu
          </button>
          <div className="pt-4 border-t border-slate-100">
             <button onClick={handleDemoLogin} className="text-xs text-slate-400 hover:text-blue-500 transition-colors font-medium">
                Chế độ dùng thử (Demo / Developer Mode)
             </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
      
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
        <Header activeTab={activeTab} data={data} setIsSettingsOpen={setIsSettingsOpen} setActiveTab={setActiveTab} />
        {/* Banner nhắc nhập API Key khi chưa cấu hình */}
        {user && (() => {
          const s = data.settings;
          const allEmpty = !s.geminiApiKey && !s.claudeApiKey && !s.openaiApiKey && !s.grokApiKey && !s.deepseekApiKey;
          const providerKey: Record<string, string> = { gemini: s.geminiApiKey, claude: s.claudeApiKey, openai: s.openaiApiKey, grok: s.grokApiKey, deepseek: s.deepseekApiKey };
          const providerLabel: Record<string, string> = { gemini: 'Google Gemini', claude: 'Claude', openai: 'OpenAI', grok: 'Grok', deepseek: 'DeepSeek' };
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
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab data={data} setCurrentPlan={creator.setCurrentPlan} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'creator' && (
              <CreatorTab 
                {...creator} data={data} isLoading={isLoading} setIsLoading={setIsLoading} fileInputRef={fileInputRef} 
                setUploadingFiles={setUploadingFiles} showToast={showToast}
                saveLessonPlan={saveLessonPlan} saveBulkPlans={saveBulkPlans}
                deleteDistribution={deleteDistribution}
                exportToPDF={() => exportUtils.exportToPDF(creator.currentPlan, showToast)}
                exportToWord={() => exportUtils.exportToWord(creator.currentPlan, showToast)}
                exportToLaTeX={() => exportUtils.exportToLaTeX(creator.currentPlan, data, setIsLoading, setIsSettingsOpen, showToast, setLatexContent, setIsLatexModalOpen)}
              />
            )}

            {activeTab === 'testing' && (
              <TestingTab 
                data={data} isLoading={isLoading} setIsLoading={setIsLoading} showToast={showToast}
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
                deleteTemplate={id => Swal.fire({title: 'Xóa mẫu?', showCancelButton: true}).then(res => res.isConfirmed && deleteTemplate(id) )}
                deleteFile={(tId, fId) => deleteFile(tId, fId)}
              />
            )}

            {activeTab === 'chat' && <ChatTab {...chat} isLoading={isLoading} />}
          </AnimatePresence>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} data={data} setData={setData} showToast={showToast} />
      
      <LatexModal 
        isOpen={isLatexModalOpen} onClose={() => setIsLatexModalOpen(false)} 
        latexContent={latexContent} currentPlan={creator.currentPlan}
        downloadLaTeXFile={() => downloadBlob(new Blob([latexContent], {type: 'text/plain;charset=utf-8'}), `${creator.currentPlan.title}.tex`)}
        openInOverleaf={() => exportUtils.openInOverleaf(latexContent, creator.currentPlan, showToast)}
        showToast={showToast}
      />
    </div>
  );
}
