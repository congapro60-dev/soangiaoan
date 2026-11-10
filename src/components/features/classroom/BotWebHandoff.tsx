import { useEffect, useRef, useState } from 'react';

const request = async (payload: Record<string, unknown>) => {
  const response = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Chưa mở được web. Nhắn web trong bot để lấy liên kết mới.');
  return data;
};
export const hasBotWebTicket = () => typeof window !== 'undefined' && /^#bot=[a-f0-9]{64}$/.test(window.location.hash);

/** No request on GET/mount: the user deliberately opens the handoff, then confirms its code in their chat. */
export function BotWebHandoff({ role }: { role: 'student' | 'parent' }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const poll = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; clearTimeout(poll.current); }; }, []);
  const begin = async () => {
    setBusy(true); setError('');
    try {
      const ticket = window.location.hash.slice(5);
      const key = `bot-web:${ticket}`;
      const saved = sessionStorage.getItem(key);
      const state = saved ? JSON.parse(saved) : { verifier: [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join(''), code: '' };
      sessionStorage.setItem(key, JSON.stringify(state));
      const result = await request({ action: 'beginBotWeb', ticket, verifier: state.verifier });
      state.code = result.code || state.code;
      if (!state.code) throw new Error('Trang xác nhận trước không còn mã. Nhắn web trong bot để lấy liên kết mới.');
      sessionStorage.setItem(key, JSON.stringify(state));
      setCode(state.code);
      const check = async () => {
        try {
          if (!active.current) return;
          let idToken: string | undefined;
          if (role === 'student') {
            const [{ auth }, { signInAnonymously }] = await Promise.all([import('../../../lib/firebase'), import('firebase/auth')]);
            await auth.authStateReady();
            if (auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('Hãy mở liên kết trong cửa sổ riêng dành cho học sinh.');
            const user = auth.currentUser || (await signInAnonymously(auth)).user;
            idToken = await user.getIdToken();
          }
          const redeemed = await request({ action: 'redeemBotWeb', ticket, verifier: state.verifier, idToken });
          if (!active.current) return;
          if (redeemed.pending) { poll.current = setTimeout(check, 3000); return; }
          if (redeemed.role !== role) throw new Error('Vai trò không khớp liên kết. Nhắn web trong bot để lấy lại.');
          sessionStorage.removeItem(key);
          const params = new URLSearchParams();
          if (role === 'parent') params.set('bot', '1');
          if (redeemed.assignmentId) params.set('assignment', redeemed.assignmentId);
          const target = params.size ? `?${params}` : '';
          window.location.replace(`/${role === 'parent' ? 'ph' : 'lop'}/${encodeURIComponent(redeemed.joinCode)}${target}`);
        } catch (reason) { if (active.current) { setError(reason instanceof Error ? reason.message : 'Chưa mở được web.'); setBusy(false); } }
      };
      void check();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa mở được web.'); setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-indigo-50 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm">
    <h1 className="text-xl font-bold">Mở cổng {role === 'student' ? 'học sinh' : 'phụ huynh'} từ bot</h1>
    <p className="mt-3 text-slate-700">Xác nhận bằng chính cuộc chat đã liên kết; không cần nhập lại PIN.</p>
    {code ? <><p className="mt-5">Quay lại bot, nhắn đúng dòng này:</p><p className="my-3 select-all rounded-xl bg-indigo-50 p-3 font-mono text-lg font-bold">mở web {code}</p><p role="status">Trang sẽ tự mở sau khi xác nhận. Chỉ xác nhận mã đang hiện trên thiết bị của bạn.</p></> : <button type="button" disabled={busy} onClick={() => void begin()} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Đang mở…' : 'Tiếp tục bằng bot'}</button>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    <button type="button" className="mt-5 min-h-11 text-indigo-700 underline" onClick={() => window.location.replace(window.location.pathname)}>Dùng mã PIN</button>
  </section></main>;
}
