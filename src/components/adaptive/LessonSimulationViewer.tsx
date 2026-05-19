import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type SimulationState = 'loading' | 'loaded' | 'not_found' | 'error';

interface LessonSimulationViewerProps {
  lessonId: string;
  unitId: string;
  unitTitle: string;
}

interface LessonSimulationDocument {
  html?: unknown;
}

export const LessonSimulationViewer = ({ lessonId, unitId, unitTitle }: LessonSimulationViewerProps) => {
  const [status, setStatus] = useState<SimulationState>('loading');
  const [html, setHtml] = useState('');
  const [expanded, setExpanded] = useState(false);

  const simulationId = useMemo(() => `${lessonId}_${unitId}`, [lessonId, unitId]);
  const simulationHtml = useMemo(() => html, [html]);

  useEffect(() => {
    let isMounted = true;

    const loadSimulation = async () => {
      setStatus('loading');
      setHtml('');
      setExpanded(false);

      try {
        const snapshot = await getDoc(doc(db, 'lessonSimulations', simulationId));

        if (!isMounted) return;

        if (!snapshot.exists()) {
          setStatus('not_found');
          return;
        }

        const data = snapshot.data() as LessonSimulationDocument;
        if (typeof data.html !== 'string' || data.html.trim().length === 0) {
          setStatus('not_found');
          return;
        }

        setHtml(data.html);
        setStatus('loaded');
      } catch (error) {
        console.error('Failed to load lesson simulation:', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    };

    loadSimulation();

    return () => {
      isMounted = false;
    };
  }, [simulationId]);

  if (status === 'loading') {
    return (
      <div className="mt-5 rounded-3xl border border-violet-100 bg-violet-50/60 p-5">
        <div className="flex h-[200px] animate-pulse items-center justify-center rounded-2xl border border-violet-100 bg-white/70 text-sm font-black text-violet-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang kiểm tra mô phỏng...
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <p className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs font-bold text-violet-500">
        Chưa có mô phỏng cho mảnh này
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
        Không tải được mô phỏng lúc này.
      </p>
    );
  }

  return (
    <section className="mt-5 rounded-3xl border border-violet-100 bg-violet-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">🔷 Nhìn thấy bài học trước khi làm</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Mở mô phỏng để quan sát ý tưởng chính của mảnh học này.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
        >
          {expanded ? 'Thu gọn mô phỏng' : 'Mở mô phỏng'}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-violet-100 bg-white">
          <div className="flex items-center gap-2 border-b border-violet-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-violet-500">
            <BookOpen className="h-4 w-4" />
            Mô phỏng HTML an toàn
          </div>
          <iframe
            srcDoc={simulationHtml}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            loading="lazy"
            title={`Mô phỏng — ${unitTitle}`}
            className="block w-full"
            style={{ maxHeight: '600px', width: '100%', height: '600px', border: 'none' }}
          />
        </div>
      )}
    </section>
  );
};
