import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import * as XLSXLib from 'xlsx';
import { AppData, TemplateFile, GradingResult, GradingSession, GradingWarning } from '../../types';
import { gradingUtils } from '../../utils/gradingUtils';
import { getActiveApiKey } from '../../lib/aiProviders';
import { User as FirebaseUser } from 'firebase/auth';
import { GradingSessionList } from '../features/grading/GradingSessionList';
import { GradingNewSession } from '../features/grading/GradingNewSession';
import { GradingViewSession } from '../features/grading/GradingViewSession';
import { GradingResultDetail } from '../features/grading/GradingResultDetail';
import { FilterScore } from '../features/grading/GradingResultsList';
import { SmartGradingMode } from '../features/grading/SmartGradingMode';
import { WarningPanel } from '../features/grading/WarningPanel';
import { ClassAnalysisModal } from '../features/grading/ClassAnalysisModal';
import { AISolveExamModal } from '../features/grading/AISolveExamModal';

interface GradingTabProps {
  data: AppData;
  setData: (val: any) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  showToast: (msg: string, type?: any) => void;
  user?: FirebaseUser | null;
  saveGradingSession?: (s: GradingSession) => Promise<void>;
  deleteGradingSession?: (id: string) => Promise<void>;
  deleteGradingResult?: (sessionId: string, resultId: string) => Promise<void>;
}

export const GradingTab = ({
  data, setData, isLoading, setIsLoading, showToast, user,
  saveGradingSession, deleteGradingSession, deleteGradingResult,
}: GradingTabProps) => {
  // Panel state
  const [panelMode, setPanelMode] = useState<'new' | 'view'>('new');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [gradingMode, setGradingMode] = useState<'normal' | 'smart'>('normal');
  const [smartWarnings, setSmartWarnings] = useState<GradingWarning[]>([]);

  // New-session state
  const [masterFiles, setMasterFiles] = useState<TemplateFile[]>([]);
  const [studentFiles, setStudentFiles] = useState<TemplateFile[]>([]);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Grading config
  const [maxScore, setMaxScore] = useState(10);
  const [eta, setEta] = useState('');
  const [gradingRubric, setGradingRubric] = useState('');

  // Shared UI state
  const [filterScore, setFilterScore] = useState<FilterScore>('all');
  const [viewingResult, setViewingResult] = useState<GradingResult | null>(null);

  // Class analysis state
  const [classAnalysisOpen, setClassAnalysisOpen] = useState(false);
  const [classAnalysisLoading, setClassAnalysisLoading] = useState(false);
  const [classAnalysisContent, setClassAnalysisContent] = useState('');

  // AI solve exam state
  const [noAnswerKey, setNoAnswerKey] = useState(false);
  const [aiSolveModalOpen, setAiSolveModalOpen] = useState(false);
  const [aiSolveLoading, setAiSolveLoading] = useState(false);
  const [aiSolveContent, setAiSolveContent] = useState('');

  const sessions = data.gradingSessions || [];
  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const exportToExcel = (res: GradingResult[], title: string) => {
    const rows = res.map((r, i) => ({
      STT: i + 1,
      'Học sinh': r.studentName,
      Điểm: r.score,
      'Thang điểm': r.maxScore,
      'Xếp loại': r.score >= 8 ? 'Giỏi' : r.score >= 6.5 ? 'Khá' : r.score >= 5 ? 'TB' : 'Yếu',
      'Điểm mạnh': (r.strengths || []).join('; '),
      'Cần cải thiện': (r.weaknesses || []).join('; '),
    }));
    const ws = XLSXLib.utils.json_to_sheet(rows);
    const wb = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(wb, ws, 'Kết quả');
    XLSXLib.writeFile(wb, `${title || 'KetQua'}_${Date.now()}.xlsx`);
  };

  const persistSession = async (s: GradingSession) => {
    try {
      if (saveGradingSession) {
        await saveGradingSession(s);
      } else {
        setData((prev: AppData) => ({
          ...prev,
          gradingSessions: [s, ...(prev.gradingSessions || []).filter(x => x.id !== s.id)],
        }));
      }
    } catch {
      showToast('Lỗi lưu phiên chấm — vui lòng thử lại', 'error');
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const startNewSession = () => {
    setPanelMode('new');
    setSelectedSessionId(null);
    setMasterFiles([]);
    setStudentFiles([]);
    setResults([]);
    setSessionTitle('');
    setGradingRubric('');
    setSessionSaved(false);
    setFilterScore('all');
    setSmartWarnings([]);
    setNoAnswerKey(false);
  };

  const loadSession = (session: GradingSession) => {
    setPanelMode('view');
    setSelectedSessionId(session.id);
    setFilterScore('all');
  };

  const gradeAllStudents = async (allMasterFiles: TemplateFile[]) => {
    setIsProcessing(true);
    setSessionSaved(false);
    setEta('');

    const combined: TemplateFile = {
      id: 'combined',
      name: allMasterFiles.map(f => f.name).join(' + '),
      type: 'text',
      content: allMasterFiles.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n'),
      category: 'test',
    };

    const updated = [...results];
    const startTime = Date.now();
    let processed = 0;
    for (let i = 0; i < studentFiles.length; i++) {
      const idx = updated.findIndex(r => r.fileName === studentFiles[i].name);
      if (idx === -1 || updated[idx].status === 'completed') continue;
      updated[idx] = { ...updated[idx], status: 'processing' };
      setResults([...updated]);
      try {
        const graded = await gradingUtils.gradeSubmission(combined, studentFiles[i], data.settings, maxScore, gradingRubric);
        updated[idx] = { ...updated[idx], ...graded, status: graded.status || 'completed' } as GradingResult;
      } catch {
        updated[idx] = { ...updated[idx], status: 'error' };
      }
      processed++;
      setResults([...updated]);
      const elapsed = Date.now() - startTime;
      const avgMs = elapsed / processed;
      const remaining = studentFiles.filter((_, j) => {
        const r = updated.find(r => r.fileName === studentFiles[j].name);
        return r && r.status !== 'completed' && r.status !== 'error' && j > i;
      }).length;
      if (remaining > 0) {
        const etaMs = avgMs * remaining;
        const etaMins = Math.floor(etaMs / 60000);
        const etaSecs = Math.ceil((etaMs % 60000) / 1000);
        setEta(etaMins > 0 ? `${etaMins}p${etaSecs}s` : `${etaSecs}s`);
      }
    }

    setEta('');
    setIsProcessing(false);
    showToast('Đã hoàn thành chấm điểm!');
    await handleSaveSession(updated);
  };

  const handleStartGrading = async () => {
    if (masterFiles.length === 0 || studentFiles.length === 0) return;
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt trước khi chấm bài', 'error');
      return;
    }

    if (noAnswerKey) {
      setAiSolveModalOpen(true);
      setAiSolveLoading(true);
      setAiSolveContent('');
      try {
        const solution = await gradingUtils.solveExam(masterFiles, data.settings);
        setAiSolveContent(solution);
      } catch (err: any) {
        showToast(`Lỗi khi AI giải đề: ${err?.message || 'Không rõ nguyên nhân'}`, 'error');
        setAiSolveModalOpen(false);
      } finally {
        setAiSolveLoading(false);
      }
      return;
    }

    await gradeAllStudents(masterFiles);
  };

  const handleConfirmAISolve = async () => {
    setAiSolveModalOpen(false);
    const answerKeyFile: TemplateFile = {
      id: `ai-answer-key-${Date.now()}`,
      name: 'Đáp án AI',
      type: 'text',
      content: aiSolveContent,
      category: 'test',
    };
    await gradeAllStudents([...masterFiles, answerKeyFile]);
  };

  const handleSmartGradingComplete = async (
    res: GradingResult[],
    warnings: GradingWarning[],
    title: string
  ) => {
    setSmartWarnings(warnings);
    setResults(res);
    setSessionTitle(title);
    setSessionSaved(false);
    const errorCount = warnings.filter(w => w.level === 'error').length;
    const warnCount = warnings.filter(w => w.level === 'warning').length;
    if (errorCount > 0) {
      showToast(`Đã chấm ${res.length} bài — ${errorCount} lỗi cần xử lý`, 'warning');
    } else {
      showToast(`Đã chấm xong ${res.length} bài${warnCount > 0 ? ` — ${warnCount} lưu ý` : ''}`, 'success');
    }
    if (res.length > 0) await handleSaveSession(res);
  };

  const handleSaveSession = async (res: GradingResult[]) => {
    const session: GradingSession = {
      id: `session-${Date.now()}`,
      title: sessionTitle || masterFiles[0]?.name.replace(/\.[^.]+$/, '') || `Phiên ${new Date().toLocaleDateString('vi-VN')}`,
      masterFiles: masterFiles.map(f => ({ ...f, content: '' })),
      gradingRubric: gradingRubric || undefined,
      results: res,
      createdAt: new Date().toISOString(),
      userId: user?.uid,
    };
    await persistSession(session);
    setSessionSaved(true);
    showToast('Đã lưu phiên chấm vào lịch sử!');
  };

  const handleDeleteSession = async (id: string) => {
    if (deleteGradingSession) {
      await deleteGradingSession(id);
    } else {
      setData((prev: AppData) => ({
        ...prev,
        gradingSessions: prev.gradingSessions.filter(s => s.id !== id),
      }));
    }
    if (selectedSessionId === id) startNewSession();
    showToast('Đã xóa phiên chấm');
  };

  const handleRegrade = async (result: GradingResult) => {
    if (masterFiles.length === 0) {
      showToast('Cần có file đề/đáp án trong phiên hiện tại để chấm lại', 'error');
      return;
    }
    const studentFile = studentFiles.find(f => f.name === result.fileName);
    if (!studentFile) {
      showToast('Không tìm thấy file bài làm — vui lòng tải lên lại', 'error');
      return;
    }
    setResults(prev => prev.map(r => r.id === result.id ? { ...r, status: 'processing' } : r));
    try {
      const combined: TemplateFile = {
        id: 'combined', name: masterFiles.map(f => f.name).join(' + '),
        type: 'text',
        content: masterFiles.map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n'),
        category: 'test',
      };
      const graded = await gradingUtils.gradeSubmission(combined, studentFile, data.settings, maxScore, gradingRubric);
      setResults(prev => prev.map(r =>
        r.id === result.id ? { ...r, ...graded, status: 'completed' } as GradingResult : r
      ));
      showToast(`Đã chấm lại: ${result.studentName}`);
    } catch {
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, status: 'error' } : r));
      showToast('Lỗi khi chấm lại', 'error');
    }
  };

  const handleRename = (result: GradingResult, newName: string) => {
    if (panelMode === 'new') {
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, studentName: newName } : r));
    } else if (selectedSessionId) {
      const session = data.gradingSessions?.find(s => s.id === selectedSessionId);
      if (!session) return;
      const updatedSession: GradingSession = {
        ...session,
        results: session.results.map(r => r.id === result.id ? { ...r, studentName: newName } : r),
      };
      setData((prev: AppData) => ({
        ...prev,
        gradingSessions: prev.gradingSessions.map(s => s.id === selectedSessionId ? updatedSession : s),
      }));
      persistSession(updatedSession);
    }
  };

  const handleSaveDetails = (resultId: string, details: string) => {
    if (panelMode === 'new') {
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, details } : r));
      setViewingResult(prev => prev?.id === resultId ? { ...prev, details } : prev);
    } else if (selectedSessionId) {
      const session = data.gradingSessions?.find(s => s.id === selectedSessionId);
      if (!session) return;
      const updatedSession: GradingSession = {
        ...session,
        results: session.results.map(r => r.id === resultId ? { ...r, details } : r),
      };
      setData((prev: AppData) => ({
        ...prev,
        gradingSessions: prev.gradingSessions.map(s => s.id === selectedSessionId ? updatedSession : s),
      }));
      setViewingResult(prev => prev?.id === resultId ? { ...prev, details } : prev);
      persistSession(updatedSession);
    }
  };

  const handleDeleteResult = async (result: GradingResult) => {
    if (panelMode === 'view' && selectedSessionId) {
      if (deleteGradingResult) {
        await deleteGradingResult(selectedSessionId, result.id);
      } else {
        setData((prev: AppData) => ({
          ...prev,
          gradingSessions: prev.gradingSessions.map(s =>
            s.id === selectedSessionId
              ? { ...s, results: s.results.filter(r => r.id !== result.id) }
              : s
          ),
        }));
      }
    } else {
      setResults(prev => prev.filter(r => r.id !== result.id));
      setStudentFiles(prev => prev.filter(f => f.name !== result.fileName));
    }
  };

  const handleAnalyzeClass = async (res: GradingResult[], title: string) => {
    if (!getActiveApiKey(data.settings)) {
      showToast('Cần nhập API Key trong Cài đặt', 'error');
      return;
    }
    setClassAnalysisOpen(true);
    setClassAnalysisLoading(true);
    setClassAnalysisContent('');
    try {
      const analysis = await gradingUtils.analyzeClass(res, data.settings, title);
      setClassAnalysisContent(analysis);
    } catch (err: any) {
      setClassAnalysisContent(`*Lỗi phân tích: ${err?.message || 'Không rõ nguyên nhân'}*`);
    } finally {
      setClassAnalysisLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-10rem)] flex gap-4 overflow-hidden"
    >
      {/* LEFT: session history */}
      <GradingSessionList
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        isNewMode={panelMode === 'new'}
        masterFileCount={masterFiles.length}
        studentFileCount={studentFiles.length}
        onSelectSession={loadSession}
        onDeleteSession={handleDeleteSession}
        onNewSession={startNewSession}
      />

      {/* RIGHT: main panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {panelMode === 'new' ? (
          <div className="flex flex-col gap-3 h-full overflow-hidden">
            {/* Mode toggle */}
            <div className="flex gap-2 flex-shrink-0">
              {(['normal', 'smart'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setGradingMode(mode); setSmartWarnings([]); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                    gradingMode === mode
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'normal' ? '📝 Chấm thường' : '⚡ Chấm thông minh'}
                </button>
              ))}
            </div>

            {gradingMode === 'normal' ? (
              <GradingNewSession
                masterFiles={masterFiles} setMasterFiles={setMasterFiles}
                studentFiles={studentFiles} setStudentFiles={setStudentFiles}
                results={results} setResults={setResults}
                sessionTitle={sessionTitle} setSessionTitle={setSessionTitle}
                maxScore={maxScore} setMaxScore={setMaxScore} eta={eta}
                isProcessing={isProcessing} sessionSaved={sessionSaved}
                filterScore={filterScore} setFilterScore={setFilterScore}
                data={data} setIsLoading={setIsLoading} showToast={showToast}
                gradingRubric={gradingRubric} setGradingRubric={setGradingRubric}
                noAnswerKey={noAnswerKey} setNoAnswerKey={setNoAnswerKey}
                onStartGrading={handleStartGrading}
                onSaveSession={() => handleSaveSession(results)}
                onExportExcel={() => exportToExcel(results, sessionTitle)}
                onAnalyzeClass={() => handleAnalyzeClass(results, sessionTitle)}
                onViewResult={setViewingResult}
                onDeleteResult={handleDeleteResult}
                onRegradeResult={handleRegrade}
                onRenameResult={handleRename}
              />
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto">
                <SmartGradingMode
                  data={data}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  showToast={showToast}
                  onGradingComplete={handleSmartGradingComplete}
                />
                <WarningPanel warnings={smartWarnings} />
              </div>
            )}
          </div>
        ) : selectedSession ? (
          <GradingViewSession
            session={selectedSession}
            filterScore={filterScore} setFilterScore={setFilterScore}
            onBack={startNewSession}
            onDelete={() => handleDeleteSession(selectedSession.id)}
            onExportExcel={() => exportToExcel(selectedSession.results, selectedSession.title)}
            onAnalyzeClass={() => handleAnalyzeClass(selectedSession.results, selectedSession.title)}
            onViewResult={setViewingResult}
            onDeleteResult={handleDeleteResult}
            onRenameResult={handleRename}
          />
        ) : null}
      </div>

      {/* Detail modal */}
      <GradingResultDetail
        result={viewingResult}
        onClose={() => setViewingResult(null)}
        settings={data.settings}
        onSaveDetails={handleSaveDetails}
      />

      {/* Class analysis modal */}
      <ClassAnalysisModal
        isOpen={classAnalysisOpen}
        isLoading={classAnalysisLoading}
        content={classAnalysisContent}
        sessionTitle={sessionTitle || selectedSession?.title || ''}
        onClose={() => setClassAnalysisOpen(false)}
      />

      {/* AI solve exam modal */}
      <AISolveExamModal
        isOpen={aiSolveModalOpen}
        isLoading={aiSolveLoading}
        content={aiSolveContent}
        onChange={setAiSolveContent}
        onCancel={() => setAiSolveModalOpen(false)}
        onConfirm={handleConfirmAISolve}
      />
    </motion.div>
  );
};
