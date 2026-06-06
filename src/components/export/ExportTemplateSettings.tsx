import { useMemo, useState } from 'react';
import { Download, FileDown, FileText, LayoutTemplate, Maximize2, Settings2, X } from 'lucide-react';
import type { PaperOrientation } from '../features/creator/CreatorToolbar';

interface ExportTemplateSettingsProps {
  open: boolean;
  orientation: PaperOrientation;
  onOrientationChange: (orientation: PaperOrientation) => void;
  onClose: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
}

type TemplateMode = 'standard' | 'compact' | 'formal';

const templates: { id: TemplateMode; name: string; desc: string }[] = [
  { id: 'standard', name: 'Chuẩn A4 giáo án', desc: 'Cân bằng giữa đọc trên web và in nộp hồ sơ.' },
  { id: 'compact', name: 'Gọn tiết kiệm giấy', desc: 'Giảm nhiễu thị giác, phù hợp giáo án dài.' },
  { id: 'formal', name: 'Hành chính trang trọng', desc: 'Nhấn mạnh tiêu đề, mục lớn và khoảng thở.' },
];

export const ExportTemplateSettings = ({
  open,
  orientation,
  onOrientationChange,
  onClose,
  onExportPDF,
  onExportWord,
}: ExportTemplateSettingsProps) => {
  const [template, setTemplate] = useState<TemplateMode>('standard');
  const [headerEnabled, setHeaderEnabled] = useState(true);
  const [pageNumberEnabled, setPageNumberEnabled] = useState(true);

  const pageClass = useMemo(() => (
    orientation === 'portrait' ? 'h-[360px] w-[255px]' : 'h-[255px] w-[360px]'
  ), [orientation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Export Template Settings</p>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Cài đặt xuất file chuẩn A4</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Tách riêng bước tổng duyệt hình thức trước khi tải Word/PDF.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[380px_1fr]">
          <aside className="space-y-5 border-b border-slate-100 bg-white p-6 lg:border-b-0 lg:border-r">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800"><Maximize2 className="h-4 w-4 text-blue-600" /> Khổ giấy</div>
              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as PaperOrientation[]).map(item => (
                  <button
                    key={item}
                    onClick={() => onOrientationChange(item)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${orientation === item ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'}`}
                  >
                    {item === 'portrait' ? 'Dọc' : 'Ngang'}
                    <span className="mt-1 block text-[11px] font-semibold text-slate-400">A4 · {item === 'portrait' ? '210×297mm' : '297×210mm'}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-800"><LayoutTemplate className="h-4 w-4 text-blue-600" /> Template</div>
              <div className="space-y-2">
                {templates.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTemplate(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${template === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <span className="block text-sm font-black text-slate-900">{item.name}</span>
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-800">Tuỳ chọn hiển thị</div>
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
                Header giáo án
                <input type="checkbox" checked={headerEnabled} onChange={e => setHeaderEnabled(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
                Số trang
                <input type="checkbox" checked={pageNumberEnabled} onChange={e => setPageNumberEnabled(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              </label>
              <p className="text-xs font-semibold leading-relaxed text-slate-400">Các tuỳ chọn này là lớp tổng duyệt UI; logic xuất Word/PDF hiện tại vẫn giữ chuẩn A4 và lề Nghị định 30.</p>
            </section>
          </aside>

          <main className="flex flex-col bg-[#eff4ff] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Preview</p>
                <h3 className="text-lg font-black text-slate-900">Bản xem trước hình thức</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={onExportPDF} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50"><FileDown className="h-4 w-4" /> Tải PDF</button>
                <button onClick={onExportWord} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"><Download className="h-4 w-4" /> Xuất Word</button>
              </div>
            </div>

            <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto rounded-[28px] border border-blue-100 bg-white/70 p-8">
              <div className={`${pageClass} relative rounded-[10px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-all`}>
                {headerEnabled && <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400"><span>Giao An Dewey</span><span>A4 Export</span></div>}
                <div className="mx-auto mb-5 h-3 w-2/3 rounded bg-slate-900" />
                <div className="space-y-3">
                  <div className="h-2.5 w-1/2 rounded bg-blue-200" />
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 w-5/6 rounded bg-slate-200" />
                  <div className="my-4 grid grid-cols-3 gap-2">
                    <div className="h-12 rounded bg-blue-50 ring-1 ring-blue-100" />
                    <div className="h-12 rounded bg-blue-50 ring-1 ring-blue-100" />
                    <div className="h-12 rounded bg-blue-50 ring-1 ring-blue-100" />
                  </div>
                  <div className="h-2.5 w-2/5 rounded bg-blue-200" />
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 w-4/6 rounded bg-slate-200" />
                </div>
                {pageNumberEnabled && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">1</div>}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
