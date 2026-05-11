import { useState } from 'react';
import { X, CloudUpload, Loader2, CheckCircle, AlertTriangle, ExternalLink, FolderOpen } from 'lucide-react';
import type { LessonPlan, AppData } from '../../types';
import {
  checkLessonExists,
  pushLessonToBot,
  ConflictError,
  type PushOptions,
  type PushResult,
  type PushFileResult,
  type CheckResult,
} from '../../services/pushLessonToBot';

interface Props {
  currentPlan: Partial<LessonPlan>;
  settings: AppData['settings'];
  showToast: (msg: string, type?: string) => void;
  onClose: () => void;
}

type Step = 'config' | 'checking' | 'checked' | 'pushing' | 'conflict' | 'done' | 'error';

const toGrade = (v: string | undefined): number => {
  const n = Number(v);
  return [10, 11, 12].includes(n) ? n : 10;
};

const toWeek = (v: string | undefined): number => {
  const n = Number(v);
  return n >= 1 && n <= 40 ? n : 1;
};

export const PushToDriveModal = ({ currentPlan, settings, showToast, onClose }: Props) => {
  const [lessonType, setLessonType] = useState<'TDS' | 'MOET'>('TDS');
  const [grade, setGrade] = useState<number>(toGrade(currentPlan.grade));
  const [week, setWeek] = useState<number>(toWeek(currentPlan.week));
  const [formats, setFormats] = useState<Set<'docx' | 'pdf'>>(new Set(['docx', 'pdf']));
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [step, setStep] = useState<Step>('config');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [conflictFilename, setConflictFilename] = useState('');

  const notConfigured = !settings.botApiUrl?.trim() || !settings.botApiToken?.trim();

  const toggleFormat = (fmt: 'docx' | 'pdf') => {
    setFormats(prev => {
      const next = new Set(prev);
      if (next.has(fmt)) {
        if (next.size > 1) next.delete(fmt);
      } else {
        next.add(fmt);
      }
      return next;
    });
  };

  const handleCheck = async () => {
    setStep('checking');
    try {
      const result = await checkLessonExists({ lessonType, grade, week }, undefined, settings);
      setCheckResult(result);
      setStep('checked');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi kiểm tra Drive');
      setStep('error');
    }
  };

  const handlePush = async (forceReplace = false) => {
    setStep('pushing');
    try {
      const opts: PushOptions = {
        lessonType, grade, week,
        formats: Array.from(formats),
        replaceExisting: forceReplace || replaceExisting,
      };
      const result = await pushLessonToBot(currentPlan, opts, settings, setProgressMsg);
      setPushResult(result);
      setStep('done');
      showToast('Đã đẩy giáo án lên Drive thành công!', 'success');
    } catch (e: unknown) {
      if (e instanceof ConflictError) {
        setConflictFilename(e.filename);
        setStep('conflict');
        return;
      }
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi đẩy lên Drive');
      setStep('error');
    }
  };

  const isConfigStep = step === 'config' || step === 'checked';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">Đẩy lên Google Drive</h2>
              <p className="text-xs text-slate-400 font-medium">Qua Railway bot</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Not configured warning */}
          {notConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Chưa cấu hình Bot API</p>
                <p className="text-xs text-amber-700 mt-1">
                  Vào <strong>Cài đặt → Bot API</strong> để nhập URL Railway và WEB_API_TOKEN.
                </p>
              </div>
            </div>
          )}

          {/* Config / checked screen */}
          {isConfigStep && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chương trình</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TDS', 'MOET'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLessonType(t)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                        lessonType === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lớp</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {[10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tuần</label>
                  <select
                    value={week}
                    onChange={e => setWeek(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 40 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>Tuần {w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Định dạng upload</label>
                <div className="flex gap-4">
                  {(['docx', 'pdf'] as const).map(fmt => (
                    <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formats.has(fmt)}
                        onChange={() => toggleFormat(fmt)}
                        className="w-4 h-4 rounded accent-emerald-600"
                      />
                      <span className="text-sm font-bold text-slate-700 uppercase">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span className="text-sm text-slate-600">Ghi đè file cũ nếu trùng tên</span>
              </label>

              {/* Check result */}
              {step === 'checked' && checkResult && (
                <div className={`rounded-2xl border p-4 space-y-2 ${
                  checkResult.folderExists ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-4 h-4 ${ checkResult.folderExists ? 'text-blue-500' : 'text-slate-400'}`} />
                    <p className="text-sm font-bold text-slate-700">
                      {checkResult.folderExists
                        ? `Tuần ${String(week).padStart(2, '0')} đã có ${checkResult.files.length} file`
                        : `Tuần ${String(week).padStart(2, '0')} chưa có → sẽ tự tạo thư mục`}
                    </p>
                  </div>
                  {checkResult.folderUrl && (
                    <a href={checkResult.folderUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Mở thư mục Drive
                    </a>
                  )}
                  {checkResult.files.length > 0 && (
                    <ul className="space-y-0.5 mt-1 max-h-28 overflow-y-auto">
                      {checkResult.files.map(f => (
                        <li key={f.id} className="text-xs text-slate-500 truncate">· {f.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {/* Spinners */}
          {step === 'checking' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Đang kiểm tra Drive...</p>
            </div>
          )}
          {step === 'pushing' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700 text-center">{progressMsg || 'Đang xử lý...'}</p>
            </div>
          )}

          {/* Conflict confirmation */}
          {step === 'conflict' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">File đã tồn tại trên Drive</p>
                  <p className="text-xs text-amber-700 mt-1 break-all">
                    <strong>{conflictFilename}</strong> đã có trong thư mục tuần này. Bạn có muốn ghi đè không?
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && pushResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
                <p className="text-base font-black text-slate-800">Đẩy lên Drive thành công!</p>
              </div>
              {[pushResult.docx, pushResult.pdf]
                .filter((r): r is PushFileResult => r !== undefined)
                .map((r, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
                    <p className="text-sm font-bold text-emerald-800 truncate">{r.filename}</p>
                    <a href={r.driveUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Mở file trên Drive
                    </a>
                    {r.folderUrl && (
                      <a href={r.folderUrl} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> Mở thư mục tuần
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Có lỗi xảy ra</p>
                <p className="text-xs text-red-700 mt-1 break-words">{errorMsg}</p>
                <button
                  onClick={() => { setStep('config'); setErrorMsg(''); }}
                  className="text-xs text-red-600 font-bold hover:underline mt-2"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isConfigStep && (
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              onClick={handleCheck}
              disabled={notConfigured}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-40"
            >
              Kiểm tra Drive
            </button>
            <button
              onClick={() => handlePush()}
              disabled={notConfigured || !currentPlan.content}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <CloudUpload className="w-4 h-4" /> Đẩy lên Drive
            </button>
          </div>
        )}
        {step === 'conflict' && (
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => setStep('config')}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Huỷ
            </button>
            <button
              onClick={() => handlePush(true)}
              className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Ghi đè
            </button>
          </div>
        )}
        {step === 'done' && (
          <div className="p-6 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
