import { useMemo, useState } from 'react';
import { Download, Eye, Palette } from 'lucide-react';
import { SONG_ANH_SAMPLE } from '../../lib/dewey/sampleContent';
import { renderDeweyLesson } from '../../lib/dewey/template';
import { DEWEY_THEMES } from '../../lib/dewey/themes';
import type { DeweyTheme } from '../../lib/dewey/types';

export default function DeweyDemoPage() {
  const [theme, setTheme] = useState<DeweyTheme>('classic');
  const html = useMemo(() => renderDeweyLesson(SONG_ANH_SAMPLE, theme), [theme]);

  const handleDownloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dewey-song-anh-demo.html';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-blue-50">
              <Eye className="h-4 w-4" />
              Dewey Lesson Preview
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Demo Bài Dewey — Đếm Bằng Song Ánh</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-blue-50/90">
              Xem trước HTML render từ template engine Phase 1 với dữ liệu mẫu offline.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white shadow-inner shadow-white/10">
            Theme: {theme}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex flex-col gap-2 text-sm font-bold text-slate-600 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-600" />
            Chọn theme
          </span>
          <select
            value={theme}
            onChange={event => setTheme(event.target.value as DeweyTheme)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          >
            {DEWEY_THEMES.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-700">
            Theme: {theme}
          </span>
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Tải HTML xuống
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-100">
        <iframe
          sandbox="allow-scripts"
          srcDoc={html}
          className="w-full rounded-2xl bg-white"
          style={{ height: 'calc(100vh - 200px)' }}
          title="Demo bài Dewey"
        />
      </section>

      <footer className="rounded-3xl border border-slate-100 bg-white p-4 text-sm font-semibold text-slate-500 shadow-sm">
        Bài học mẫu để kiểm tra template Phase 1. Sẽ thay bằng pipeline AI ở Phase 3.
      </footer>
    </div>
  );
}
