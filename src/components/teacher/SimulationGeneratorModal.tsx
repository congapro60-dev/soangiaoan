import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { auth } from '../../lib/firebase';
import type { LessonSimulation } from '../../lib/adaptive/types';

interface SimulationGeneratorModalProps {
  isOpen: boolean;
  lessonId: string;
  unitId: string;
  unitTitle: string;
  exampleId: string;
  problemText: string;
  existingSimulation?: LessonSimulation;
  onClose: () => void;
  onSaved: (simulation: LessonSimulation) => void;
}

type SimulationStyle = LessonSimulation['style'];

interface GenerateSimulationSuccessResponse {
  ok: true;
  simulationId: string;
  html: string;
  cached?: boolean;
}

interface GenerateSimulationErrorResponse {
  ok: false;
  error?: string;
  message?: string;
}

type GenerateSimulationResponse = GenerateSimulationSuccessResponse | GenerateSimulationErrorResponse;

const MAX_PROBLEM_TEXT_LENGTH = 2000;
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  Swal.fire({
    title,
    icon,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
};

const formatHtmlSize = (bytes: number) => `${Math.max(bytes / 1024, 0.01).toFixed(1)} KB`;

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const countBytes = (value: string) => new Blob([value]).size;

export const SimulationGeneratorModal = ({
  isOpen,
  lessonId,
  unitId,
  unitTitle,
  exampleId,
  problemText,
  existingSimulation,
  onClose,
  onSaved,
}: SimulationGeneratorModalProps) => {
  const [draftProblemText, setDraftProblemText] = useState(problemText.slice(0, MAX_PROBLEM_TEXT_LENGTH));
  const [style, setStyle] = useState<SimulationStyle>('textbook');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSimulation, setPreviewSimulation] = useState<LessonSimulation | undefined>(existingSimulation);
  const [lastGenerateMode, setLastGenerateMode] = useState<'generate' | 'regenerate'>('generate');

  useEffect(() => {
    if (!isOpen) return;

    setDraftProblemText((existingSimulation?.problemText || problemText).slice(0, MAX_PROBLEM_TEXT_LENGTH));
    setStyle(existingSimulation?.style || 'textbook');
    setPreviewSimulation(existingSimulation);
    setLastGenerateMode('generate');
  }, [existingSimulation, isOpen, problemText]);

  const trimmedProblemText = draftProblemText.trim();
  const htmlSizeBytes = useMemo(() => countBytes(previewSimulation?.html || ''), [previewSimulation?.html]);
  const canGenerate = trimmedProblemText.length > 0 && trimmedProblemText.length <= MAX_PROBLEM_TEXT_LENGTH && !isGenerating;
  const canSave = Boolean(previewSimulation) && !isGenerating;

  const handleGenerate = async (regenerate: boolean) => {
    if (!canGenerate) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('Bạn cần đăng nhập để tạo mô phỏng.', 'error');
      return;
    }

    setIsGenerating(true);
    setLastGenerateMode(regenerate ? 'regenerate' : 'generate');

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/generate-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          lessonId,
          unitId,
          exampleId,
          problemText: trimmedProblemText,
          style,
          regenerate,
        }),
      });

      const data = await response.json().catch(() => null) as GenerateSimulationResponse | null;

      if (!response.ok || !data?.ok) {
        const message = data && 'message' in data && data.message ? data.message : 'Không tạo được mô phỏng. Vui lòng thử lại.';
        throw new Error(message);
      }

      const createdAt = new Date().toISOString();
      const simulation: LessonSimulation = {
        id: data.simulationId,
        lessonId,
        unitId,
        exampleId,
        problemText: trimmedProblemText,
        html: data.html,
        style,
        createdAt: data.cached && existingSimulation?.createdAt ? existingSimulation.createdAt : createdAt,
        createdBy: currentUser.uid,
        htmlSizeBytes: countBytes(data.html),
        geminiModel: existingSimulation?.geminiModel || DEFAULT_GEMINI_MODEL,
      };

      setPreviewSimulation(simulation);
      showToast(data.cached ? 'Đã tải mô phỏng đã có.' : 'Đã tạo mô phỏng mới.', 'success');
    } catch (error) {
      console.error('Failed to generate lesson simulation:', error);
      showToast(error instanceof Error ? error.message : 'Không tạo được mô phỏng. Vui lòng thử lại.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!previewSimulation) return;

    onSaved(previewSimulation);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-700">
                  <Sparkles className="h-4 w-4" /> Simulation Builder
                </div>
                <h2 className="text-xl font-black text-slate-900">Tạo mô phỏng cho mảnh học</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{unitTitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Đóng modal tạo mô phỏng"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
              <section className="space-y-5 border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
                <div>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">Đề bài hoặc concept cần mô phỏng</span>
                    <textarea
                      value={draftProblemText}
                      onChange={event => setDraftProblemText(event.target.value.slice(0, MAX_PROBLEM_TEXT_LENGTH))}
                      maxLength={MAX_PROBLEM_TEXT_LENGTH}
                      rows={8}
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      placeholder="Nhập đề bài hoặc ý tưởng cần mô phỏng..."
                    />
                  </label>
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>{trimmedProblemText.length === 0 ? 'Cần nhập nội dung trước khi tạo.' : 'Nội dung này sẽ được gửi đến API tạo simulation.'}</span>
                    <span>{draftProblemText.length}/{MAX_PROBLEM_TEXT_LENGTH}</span>
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Phong cách mô phỏng</span>
                  <select
                    value={style}
                    onChange={event => setStyle(event.target.value as SimulationStyle)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                  >
                    <option value="textbook">textbook · Sách giáo khoa</option>
                    <option value="realistic">realistic · Tình huống thực tế</option>
                  </select>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleGenerate(false)}
                    disabled={!canGenerate}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {isGenerating && lastGenerateMode === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Tạo mô phỏng
                  </button>

                  {existingSimulation && (
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={!canGenerate}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {isGenerating && lastGenerateMode === 'regenerate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Tạo lại
                    </button>
                  )}
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tạo mô phỏng... (5-15 giây)
                  </div>
                )}
              </section>

              <section className="space-y-4 bg-slate-50/70 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Preview</p>
                    <h3 className="text-lg font-black text-slate-900">Mô phỏng HTML an toàn</h3>
                  </div>
                  {previewSimulation && (
                    <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500">
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">{formatHtmlSize(previewSimulation.htmlSizeBytes || htmlSizeBytes)}</span>
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">{previewSimulation.geminiModel}</span>
                    </div>
                  )}
                </div>

                {previewSimulation ? (
                  <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-violet-100 bg-white px-4 py-3 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>HTML size: <b className="text-violet-700">{formatHtmlSize(previewSimulation.htmlSizeBytes || htmlSizeBytes)}</b></span>
                      <span>Tạo lúc: <b className="text-slate-700">{formatCreatedAt(previewSimulation.createdAt)}</b></span>
                    </div>
                    <iframe
                      srcDoc={previewSimulation.html}
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      title={`Preview mô phỏng — ${unitTitle}`}
                      className="block w-full bg-white"
                      style={{ height: '520px', border: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <div className="rounded-3xl bg-violet-50 p-4 text-violet-600">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <p className="mt-4 text-base font-black text-slate-800">Chưa có preview</p>
                    <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">Nhập đề bài, chọn phong cách rồi bấm “Tạo mô phỏng” để xem HTML trong iframe sandbox.</p>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold leading-5 text-slate-400">Iframe dùng sandbox chỉ cho phép script, không cấp same-origin.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Lưu
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
