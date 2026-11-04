import { LockKeyhole, Plus, Trash2 } from 'lucide-react';
import { MAX_OWN_GEMINI_KEYS } from '../../../lib/geminiKeyRing';

interface Props {
  rows: readonly string[];
  onChange: (rows: string[]) => void;
}

/**
 * Ô nhập NHIỀU khoá Gemini: thầy cô có nhiều tài khoản Google thì mỗi tài khoản một khoá để gom hạn mức miễn phí.
 * Khoá chỉ lưu trong trình duyệt này. Khoá hết hạn mức tự nghỉ, web đổi sang khoá kế (xem `geminiKeyRing.ts`).
 */
export const GeminiKeysField = ({ rows, onChange }: Props) => {
  const filled = rows.filter(row => row.trim()).length;
  const setRow = (index: number, value: string) => onChange(rows.map((row, i) => (i === index ? value : row)));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="off"
              value={row}
              onChange={event => setRow(index, event.target.value)}
              placeholder={index === 0 ? 'Nhập Gemini API Key...' : `Khoá Gemini thứ ${index + 1}...`}
              aria-label={`Khoá Gemini ${index + 1}`}
              className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--dewey-blue)] focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label={`Xoá khoá Gemini ${index + 1}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_OWN_GEMINI_KEYS && (
        <button
          type="button"
          onClick={() => onChange([...rows, ''])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--dewey-blue)] hover:text-[var(--dewey-blue)]"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm khoá Gemini (tài khoản khác)
        </button>
      )}
      <p className="text-[11px] font-medium leading-4 text-slate-400">
        {filled > 1 ? `Đang có ${filled} khoá: ` : ''}Có nhiều tài khoản Google thì mỗi tài khoản lấy một khoá ở Google AI Studio rồi dán vào đây. Khoá nào hết hạn mức, web tự đổi sang khoá kế tiếp.
        Muốn dùng hạn mức miễn phí thì khoá phải thuộc dự án Google CHƯA gắn thanh toán. Lưu ý: nội dung gửi qua gói miễn phí có thể được Google dùng để cải thiện sản phẩm — đừng gửi dữ liệu nhạy cảm của học sinh.
        Thầy/cô tự đọc điều khoản của Google về việc dùng nhiều tài khoản trước khi thêm.
      </p>
    </div>
  );
};
