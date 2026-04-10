import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import Swal from 'sweetalert2';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useAppState } from './hooks/useAppState';
import { useLessonCreator } from './hooks/useLessonCreator';
import { useChat } from './hooks/useChat';

// Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardTab } from './components/tabs/DashboardTab';
import { CreatorTab } from './components/tabs/CreatorTab';
import { LibraryTab } from './components/tabs/LibraryTab';
import { TemplatesTab } from './components/tabs/TemplatesTab';
import { ChatTab } from './components/tabs/ChatTab';
import { SettingsModal } from './components/modals/SettingsModal';
import { LatexModal } from './components/modals/LatexModal';

// Utils
import { processUploadedFile } from './utils/fileUtils';
import * as exportUtils from './utils/exportUtils';
import { downloadBlob } from './utils/fileUtils';

// Types
import { LessonPlan, TemplateFile } from './types';

export default function App() {
  const { user, isAuthLoading, handleLogin, handleLogout, showToast } = useAuth();
  const { 
    data, setData, communityPlans, isLoading, setIsLoading, 
    fetchCommunityPlans, updateTemplate, addTemplate, deleteTemplate, deleteFile,
    setAuthorName, addDistribution, deleteDistribution
  } = useAppState(user, showToast);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'creator' | 'library' | 'chat' | 'templates'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'personal' | 'community'>('personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const [latexContent, setLatexContent] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<{ category: TemplateFile['category']; templateId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tự động hỏi tên người soạn sau khi đăng nhập
  useEffect(() => {
    if (user && !data.authorName) {
      Swal.fire({
        title: 'Chào mừng bạn!',
        text: 'Vui lòng nhập tên người soạn giáo án của bạn:',
        input: 'text',
        inputPlaceholder: 'Ví dụ: Thầy Nguyễn Văn A',
        allowOutsideClick: false,
        confirmButtonText: 'Xác nhận',
        preConfirm: (name) => {
          if (!name) {
            Swal.showValidationMessage('Vui lòng nhập tên!');
          }
          return name;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          setAuthorName(result.value);
          showToast(`Chào mừng ${result.value}!`);
        }
      });
    }
  }, [user, data.authorName]);

  const creator = useLessonCreator(data, setData, setIsLoading, showToast, setIsSettingsOpen);
  const chat = useChat(data, setIsLoading, showToast);
  
  // Tự động tải Kho chung khi vào tab tương ứng
  useEffect(() => {
    if (activeTab === 'library' && libraryTab === 'community') {
      fetchCommunityPlans();
    }
  }, [activeTab, libraryTab]);

  // Persistence Handlers
  const saveLessonPlan = async () => {
    if (!creator.currentPlan.title || !creator.currentPlan.content) return;
    if (!user) { showToast('Vui lòng đăng nhập để lưu!', 'warning'); return; }

    const id = creator.currentPlan.id || Math.random().toString(36).substr(2, 9);
    const newPlan: LessonPlan = {
      id,
      subjectId: creator.currentPlan.subjectId || 'math',
      templateId: creator.currentPlan.templateId,
      title: creator.currentPlan.title,
      content: creator.currentPlan.content,
      status: 'completed',
      createdAt: creator.currentPlan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.uid,
      authorName: data.authorName,
      isPublic: creator.currentPlan.isPublic || false
    };

    try {
      await setDoc(doc(db, 'lessonPlans', id), newPlan);
      setData(prev => ({
        ...prev,
        lessonPlans: prev.lessonPlans.some(p => p.id === id) 
          ? prev.lessonPlans.map(p => p.id === id ? newPlan : p) 
          : [newPlan, ...prev.lessonPlans]
      }));
      creator.setCurrentPlan({ title: '', content: '', subjectId: 'math', templateId: '' });
      setActiveTab('library');
      showToast('Đã lưu giáo án lên Thư viện Cloud!');
    } catch (e) {
      showToast('Lỗi khi lưu lên Cloud!', 'error');
    }
  };

  const saveBulkPlans = async () => {
    if (creator.bulkResults.length === 0 || !user) return;
    setIsLoading(true);
    try {
      const plansToSave = creator.bulkResults.map(p => ({
        ...p, status: 'completed', userId: user.uid, authorName: data.authorName, isPublic: false
      }));
      for (const plan of plansToSave) {
        await setDoc(doc(db, 'lessonPlans', plan.id), plan);
      }
      setData(prev => ({ ...prev, lessonPlans: [...plansToSave, ...prev.lessonPlans] }));
      creator.setBulkResults([]);
      setActiveTab('library');
      showToast(`Đã lưu ${plansToSave.length} bài lên Cloud!`);
    } catch (e) {
      showToast('Lỗi lưu hàng loạt', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePlan = (id: string) => {
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: "Giáo án sẽ biến mất vĩnh viễn!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'lessonPlans', id));
          setData(prev => ({ ...prev, lessonPlans: prev.lessonPlans.filter(p => p.id !== id) }));
          showToast('Đã xóa giáo án!');
        } catch (e) {
          showToast('Lỗi khi xóa', 'error');
        }
      }
    });
  };

  const toggleSharePlan = async (e: React.MouseEvent, plan: LessonPlan) => {
    e.stopPropagation();
    try {
      await setDoc(doc(db, 'lessonPlans', plan.id), { isPublic: !plan.isPublic }, { merge: true });
      setData(prev => ({
        ...prev,
        lessonPlans: prev.lessonPlans.map(p => p.id === plan.id ? { ...p, isPublic: !p.isPublic } : p)
      }));
      showToast(!plan.isPublic ? 'Đã chia sẻ cộng đồng!' : 'Đã thu hồi quyền riêng tư.');
    } catch (err) {
      showToast('Lỗi chia sẻ', 'error');
    }
  };

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
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
      
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        setIsSettingsOpen={setIsSettingsOpen} handleLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Header activeTab={activeTab} data={data} setIsSettingsOpen={setIsSettingsOpen} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab data={data} setCurrentPlan={creator.setCurrentPlan} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'creator' && (
              <CreatorTab 
                {...creator} data={data} isLoading={isLoading} fileInputRef={fileInputRef} 
                setUploadingFiles={setUploadingFiles} showToast={showToast}
                saveLessonPlan={saveLessonPlan} saveBulkPlans={saveBulkPlans}
                exportToPDF={() => exportUtils.exportToPDF(creator.currentPlan, showToast)}
                exportToWord={() => exportUtils.exportToWord(creator.currentPlan, showToast)}
                generatePPTX={() => exportUtils.generatePPTX(creator.currentPlan, data, setIsLoading, showToast)}
                exportToLaTeX={() => exportUtils.exportToLaTeX(creator.currentPlan, data, setIsLoading, setIsSettingsOpen, showToast, setLatexContent, setIsLatexModalOpen)}
              />
            )}

            {activeTab === 'library' && (
              <LibraryTab 
                libraryTab={libraryTab} setLibraryTab={setLibraryTab} 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                setActiveTab={setActiveTab} data={data} communityPlans={communityPlans}
                setCurrentPlan={creator.setCurrentPlan} toggleSharePlan={toggleSharePlan} deletePlan={deletePlan}
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
