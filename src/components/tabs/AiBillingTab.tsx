import { useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getAiStatement } from '../../lib/ai/aiBillingApi';
import { AiWalletPanel } from '../features/aiBilling/AiWalletPanel';
import { AiStatementView } from '../features/aiBilling/AiStatementView';

/** Trang "Chi phí AI" của giáo viên: ví, mã giảm giá, trần, khoá riêng, sao kê minh bạch từng lượt. */
export const AiBillingTab = ({ user }: { user: User | null }) => {
  const load = useCallback((month?: string) => getAiStatement(month), []);
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Chi phí AI</p>
        <h2 className="mt-1 text-2xl font-black text-slate-900">Ví AI của thầy/cô</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Chấm bài, tạo bài luyện… bằng AI của web được trừ dần từ ví trả trước theo đúng giá Google tính. Mọi lượt đều có trong sao kê bên dưới.</p>
        <div className="mt-5"><AiWalletPanel /></div>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Sao kê</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">Nạp, trừ từng lượt, số dư theo tháng</h2>
        <div className="mt-4"><AiStatementView load={load} teacherLabel={user?.displayName || user?.email || 'Giáo viên'} /></div>
      </section>
    </div>
  );
};
