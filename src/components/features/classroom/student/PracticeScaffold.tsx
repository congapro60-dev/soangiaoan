import { useState } from 'react';
import { Footprints } from 'lucide-react';
import { NhanXetMarkdown } from '../NhanXetMarkdown';

/**
 * Gợi ý giàn giáo từng bước: ẩn sẵn, em chưa biết làm thì mở DẦN từng bước — mở hết một lượt
 * là thành đọc lời giải, mất chỗ để em tự nghĩ.
 */
export const PracticeScaffold = ({ steps }: { steps: readonly string[] }) => {
  const [shown, setShown] = useState(0);
  if (steps.length === 0) return null;
  return (
    <div className="mt-2">
      {shown > 0 && (
        <ol className="space-y-2">
          {steps.slice(0, shown).map((step, index) => (
            <li key={index} className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
              <span className="text-[11px] font-black uppercase tracking-wide text-amber-700">Bước {index + 1}</span>
              <NhanXetMarkdown>{step}</NhanXetMarkdown>
            </li>
          ))}
        </ol>
      )}
      {shown < steps.length && (
        <button
          type="button"
          onClick={() => setShown(value => value + 1)}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-50"
        >
          <Footprints className="h-4 w-4" />
          {shown === 0 ? `Chưa biết làm? Xem gợi ý bước 1/${steps.length}` : `Xem bước tiếp (${shown + 1}/${steps.length})`}
        </button>
      )}
    </div>
  );
};
