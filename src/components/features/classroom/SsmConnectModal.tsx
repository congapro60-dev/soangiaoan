import { useState } from 'react';
import { Bookmark, CheckCircle2, Copy, Key, Loader2, LogOut, ShieldCheck, X } from 'lucide-react';
import {
  getStoredSsmSession,
  saveStoredSsmSession,
  testAndSaveSsmConnection,
  type StoredSsmSession,
} from '../../../lib/ssm/ssmBridge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (session: StoredSsmSession) => void;
  showToast: (message: string, icon?: string) => void;
}

const BOOKMARKLET_CODE =
  "javascript:(function(){var t=localStorage.getItem('access_token'),w=localStorage.getItem('workspace');if(!t){alert('Bạn chưa đăng nhập SSM trên tab này!');return;}var s=JSON.stringify({token:t,workspace:w});navigator.clipboard.writeText(s).then(function(){alert('Đã chép mã kết nối SSM! Hãy quay lại SmartPlan và dán vào ô.');}).catch(function(){prompt('Chép mã này dán vào SmartPlan:',s);});})();";

export const SsmConnectModal = ({ isOpen, onClose, onConnected, showToast }: Props) => {
  const [session, setSession] = useState<StoredSsmSession | null>(() => getStoredSsmSession());
  const [input, setInput] = useState('');
  const [fallbackWorkspace, setFallbackWorkspace] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!input.trim()) {
      setError('Vui lòng dán mã kết nối (token) từ SSM.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await testAndSaveSsmConnection(input.trim(), fallbackWorkspace.trim() || undefined);
      const updated = getStoredSsmSession();
      setSession(updated);
      showToast(`Đã kết nối tài khoản SSM: ${res.name}`, '✅');
      if (updated && onConnected) onConnected(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được SSM. Kiểm tra lại mã.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    saveStoredSsmSession(null);
    setSession(null);
    setInput('');
    showToast('Đã ngắt kết nối tài khoản SSM.', 'ℹ️');
  };

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
      setCopiedBookmarklet(true);
      setTimeout(() => setCopiedBookmarklet(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Kết nối tài khoản SSM (Edufit)</h3>
              <p className="text-xs font-semibold text-slate-500">
                Kết nối trực tiếp qua Server Proxy — Không cần cài đặt Extension trình duyệt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {session ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-black text-emerald-900">
                    Đang kết nối: {session.userName || 'Tài khoản giáo viên'}
                  </div>
                  {session.userEmail && (
                    <div className="font-semibold text-emerald-800">Email: {session.userEmail}</div>
                  )}
                  {session.workspace && (
                    <div className="font-semibold text-emerald-700">Chi nhánh: {session.workspace}</div>
                  )}
                  <div className="text-[11px] text-emerald-600">
                    Lưu lúc: {new Date(session.savedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Ngắt kết nối / Đổi mã
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Dán mã kết nối SSM (Token hoặc chuỗi JSON kết nối):
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Dán chuỗi {"token":"...","workspace":"..."} hoặc mã token vào đây...'
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Chi nhánh (Workspace, ví dụ: <code className="text-indigo-600">branch_23</code> - tuỳ chọn):
                </label>
                <input
                  type="text"
                  value={fallbackWorkspace}
                  onChange={(e) => setFallbackWorkspace(e.target.value)}
                  placeholder="Ví dụ: branch_23"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 font-semibold text-rose-700">
                  {error}
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-slate-600">
                <div className="font-black text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Hướng dẫn lấy mã kết nối từ SSM (Chỉ làm 1 lần):
                </div>

                <div className="space-y-2 pl-1 border-l-2 border-indigo-200">
                  <div>
                    <span className="font-bold text-slate-700">Cách 1 (Nhanh nhất - 1 chạm Dấu trang):</span>
                    <p className="mt-0.5 text-[11px]">
                      Kéo nút này thả vào thanh <b>Dấu trang (Bookmarks)</b> của trình duyệt:
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <a
                        href={BOOKMARKLET_CODE}
                        onClick={(e) => e.preventDefault()}
                        className="inline-flex cursor-grab active:cursor-grabbing items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700 hover:bg-indigo-100"
                        title="Kéo thả nút này lên thanh Dấu trang trình duyệt"
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        Kéo nút này vào Dấu trang
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyBookmarklet}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedBookmarklet ? 'Đã chép mã!' : 'Chép mã Dấu trang'}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Khi đang mở tab SSM (<code>ssm.edufit.vn</code>), chỉ cần bấm Dấu trang này để tự động chép mã kết nối, rồi dán vào ô trên!
                    </p>
                  </div>

                  <div className="pt-1.5">
                    <span className="font-bold text-slate-700">Cách 2 (Qua phím F12 Console):</span>
                    <p className="mt-0.5 text-[11px]">
                      Mở tab SSM đang đăng nhập, nhấn <b>F12</b> → chọn tab <b>Console</b> → gõ lệnh:
                    </p>
                    <code className="block mt-1 select-all rounded bg-slate-200/70 p-1.5 font-mono text-[10px] text-slate-800">
                      copy(JSON.stringify({`{`}token: localStorage.getItem('access_token'), workspace: localStorage.getItem('workspace'){`}`}))
                    </code>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Nhấn Enter để tự động chép vào clipboard, sau đó quay lại dán vào ô trên.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3.5 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Đóng
          </button>
          {!session && (
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void handleConnect()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-200"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang kiểm tra kết nối…
                </>
              ) : (
                'Xác nhận & Kết nối SSM'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
